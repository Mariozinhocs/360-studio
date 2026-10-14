/**
 * 360° Studio - WebGL Dual-Fisheye (.INSP e .DNG) to Equirectangular Auto-Stitcher
 * Converte imagens brutas de duas lentes fisheye (Insta360 X2/X3/X4 / RAW DNG) em panoramas Equirretangulares 2:1 perfeitamente costurados.
 * 
 * @author A-Team Squad
 */

class Stitcher360 {
    /**
     * Verifica se o arquivo enviado é de formato nativo .insp / .dng ou fisheye duplo
     * @param {File|Blob|string} file 
     * @returns {boolean}
     */
    static isDualFisheyeFile(file) {
        if (!file) return false;
        const fileName = (typeof file === 'string') ? file : (file.name || '');
        const ext = fileName.split('.').pop().toLowerCase();
        return ext === 'insp' || ext === 'dng';
    }

    /**
     * Obtém o limite máximo de textura suportado pela GPU via WebGL (ex: 8192 ou 16384)
     * @returns {number}
     */
    static getMaxTextureSize() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                return gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
            }
        } catch (e) {}
        return 4096;
    }

    /**
     * Extrai a imagem JPEG embutida em alta resolução contida dentro de um arquivo RAW (.DNG)
     * @param {File|Blob} dngFile 
     * @returns {Promise<Blob>}
     */
    static async extractJpegFromDng(dngFile) {
        const arrayBuffer = await dngFile.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const len = bytes.length;

        let bestStart = -1;
        let bestLength = -1;

        // Escanear os marcadores de início JPEG SOI (0xFF 0xD8 0xFF)
        for (let i = 0; i < len - 4; i++) {
            if (bytes[i] === 0xFF && bytes[i + 1] === 0xD8 && bytes[i + 2] === 0xFF) {
                const jpegStart = i;
                let jpegEnd = -1;

                // Procurar marcador EOI (0xFF 0xD9)
                for (let j = jpegStart + 100; j < len - 1; j++) {
                    if (bytes[j] === 0xFF && bytes[j + 1] === 0xD9) {
                        jpegEnd = j + 2;
                    }
                }

                if (jpegEnd > jpegStart) {
                    const currentLen = jpegEnd - jpegStart;
                    // Selecionar a maior imagem JPEG encontrada (evitando miniaturas pequenas)
                    if (currentLen > bestLength) {
                        bestLength = currentLen;
                        bestStart = jpegStart;
                    }
                }
            }
        }

        if (bestStart !== -1 && bestLength > 50000) {
            const jpegBuffer = bytes.subarray(bestStart, bestStart + bestLength);
            return new Blob([jpegBuffer], { type: 'image/jpeg' });
        }

        throw new Error("Não foi possível encontrar a imagem JPEG embutida no arquivo DNG.");
    }

    /**
     * Tenta carregar um arquivo, Blob ou DNG em um elemento HTMLImageElement
     * @param {File|Blob|string} fileOrBlob 
     * @returns {Promise<HTMLImageElement>}
     */
    static async loadImage(fileOrBlob) {
        let sourceBlob = fileOrBlob;

        // Se for um arquivo RAW .DNG (maiúsculas ou minúsculas), extrai a foto JPEG embutida
        if (fileOrBlob instanceof File || fileOrBlob instanceof Blob) {
            const fileName = (fileOrBlob.name || '').toLowerCase();
            const type = (fileOrBlob.type || '').toLowerCase();
            if (fileName.endsWith('.dng') || type.includes('dng') || type.includes('tiff')) {
                try {
                    sourceBlob = await this.extractJpegFromDng(fileOrBlob);
                } catch (e) {
                    console.warn("Tentando carregar DNG diretamente:", e);
                }
            }
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            const objectUrl = (typeof sourceBlob === 'string') ? sourceBlob : URL.createObjectURL(sourceBlob);
            
            img.onload = () => {
                if (typeof sourceBlob !== 'string') {
                    URL.revokeObjectURL(objectUrl);
                }
                resolve(img);
            };
            img.onerror = (err) => {
                if (typeof sourceBlob !== 'string') {
                    URL.revokeObjectURL(objectUrl);
                }
                reject(new Error("Não foi possível decodificar os bytes da imagem 360°."));
            };
            img.src = objectUrl;
        });
    }

    /**
     * Converte uma imagem Dual-Fisheye, .INSP ou .DNG em um Blob JPEG 360° Equirretangular (2:1) via WebGL Shader
     * @param {File|Blob|HTMLImageElement} inputSource 
     * @param {Object} options 
     * @returns {Promise<{blob: Blob, width: number, height: number}>}
     */
    static async convertToEquirectangular(inputSource, options = {}) {
        let imgElement;
        if (inputSource instanceof HTMLImageElement) {
            imgElement = inputSource;
        } else {
            imgElement = await this.loadImage(inputSource);
        }

        const maxTextureSize = this.getMaxTextureSize();
        const naturalW = (imgElement && imgElement.naturalWidth) ? imgElement.naturalWidth : 5760;
        
        // Se a largura não foi especificada, calcula resolução de ultra-definição (até 8K ou limite da GPU)
        let targetWidth = options.width || (naturalW >= 5760 ? Math.min(naturalW, maxTextureSize, 8192) : 5760);
        targetWidth = Math.min(targetWidth, maxTextureSize, 8192);
        const targetHeight = options.height || Math.round(targetWidth / 2); // Proporção 2:1
        const fovDegrees = options.fov || 202.0; // Ângulo óptico Insta360 (~200-205°)
        const quality = options.quality || 0.96;

        // Criar Canvas WebGL temporário offscreen
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, alpha: false }) ||
                   canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true, alpha: false });

        if (!gl) {
            throw new Error("Seu navegador não possui suporte a WebGL para aceleração de imagem 360.");
        }

        // --- SHADERS WEBGL COM MATRIZ DE ROTAÇÃO DA LENTE TRASEIRA INSTA360 ---
        const vsSource = `
            attribute vec2 aPosition;
            varying vec2 vTexCoord;
            void main() {
                vTexCoord = (aPosition + 1.0) * 0.5;
                vTexCoord.y = 1.0 - vTexCoord.y; // Inverter eixo Y para coordenadas de textura WebGL
                gl_Position = vec4(aPosition, 0.0, 1.0);
            }
        `;

        const fsSource = `
            precision highp float;
            varying vec2 vTexCoord;
            uniform sampler2D uTexture;
            uniform float uFovDegrees;
            
            const float PI = 3.1415926535897932384626433832795;

            void main() {
                // vTexCoord.x em [0, 1] -> Longitude lon em [-PI, +PI]
                // vTexCoord.y em [0, 1] -> Latitude lat em [+PI/2, -PI/2]
                float lon = (vTexCoord.x - 0.5) * 2.0 * PI;
                float lat = (0.5 - vTexCoord.y) * PI;

                // Coordenadas cartesianas unitárias no espaço 3D (Projeção Equirretangular)
                float x = cos(lat) * sin(lon);
                float y = sin(lat);
                float z = cos(lat) * cos(lon);

                float fovRad = uFovDegrees * (PI / 180.0);
                float halfFov = fovRad * 0.5;

                // Raios ópticos exatos das lentes Insta360 (Proporção do sensor no frame 2:1)
                float radiusY = 0.465;
                float radiusX = radiusY * 0.50;

                // 1. Lente Frontal (Círculo Esquerdo, X0 = 0.25, Y0 = 0.50) -> Foco em +Z (z > 0)
                float thetaFront = acos(clamp(z, -1.0, 1.0));
                float phiFront = atan(y, x);
                float rFront = thetaFront / halfFov;
                
                vec2 uvFront = vec2(
                    0.25 + (rFront * radiusX * cos(phiFront)),
                    0.50 + (rFront * radiusY * sin(phiFront))
                );

                // 2. Lente Traseira (Círculo Direito, X0 = 0.75, Y0 = 0.50) -> Foco em -Z (z < 0)
                // Sensor traseiro da Insta360 possui rotação de 180° em relação ao frontal
                float thetaBack = acos(clamp(-z, -1.0, 1.0));
                float phiBack = atan(y, x);
                float rBack = thetaBack / halfFov;

                vec2 uvBack = vec2(
                    0.75 - (rBack * radiusX * cos(phiBack)),
                    0.50 - (rBack * radiusY * sin(phiBack))
                );

                // Zonas de amostragem seguras dentro de cada círculo de fisheye
                vec4 colFront = texture2D(uTexture, clamp(uvFront, vec2(0.005, 0.005), vec2(0.495, 0.995)));
                vec4 colBack  = texture2D(uTexture, clamp(uvBack,  vec2(0.505, 0.005), vec2(0.995, 0.995)));

                // Suavização de Emenda (Seam Blending nas bordas z ≈ 0 / 90° e 270°)
                float transitionWidth = 0.10;
                float blend = smoothstep(-transitionWidth, transitionWidth, z);

                gl_FragColor = mix(colBack, colFront, blend);
            }
        `;

        // Compilar Shaders
        const compileShader = (type, source) => {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                const info = gl.getShaderInfoLog(shader);
                gl.deleteShader(shader);
                throw new Error("Erro na compilação do Shader WebGL: " + info);
            }
            return shader;
        };

        const vertShader = compileShader(gl.VERTEX_SHADER, vsSource);
        const fragShader = compileShader(gl.FRAGMENT_SHADER, fsSource);

        const program = gl.createProgram();
        gl.attachShader(program, vertShader);
        gl.attachShader(program, fragShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error("Erro ao linkar programa WebGL: " + gl.getProgramInfoLog(program));
        }

        gl.useProgram(program);

        // Vértices do Quad (Retângulo tela cheia [-1, 1])
        const vertices = new Float32Array([
            -1.0, -1.0,
             1.0, -1.0,
            -1.0,  1.0,
            -1.0,  1.0,
             1.0, -1.0,
             1.0,  1.0
        ]);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const aPosition = gl.getAttribLocation(program, 'aPosition');
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

        // Upload da Imagem para a Textura WebGL
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgElement);

        // Uniforms
        const uFovLoc = gl.getUniformLocation(program, 'uFovDegrees');
        gl.uniform1f(uFovLoc, fovDegrees);

        // Renderizar no Viewport de Resolução 4K (4096x2048)
        gl.viewport(0, 0, targetWidth, targetHeight);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // Exportar resultado do Canvas em JPEG Blob
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                // Limpeza de memória GPU
                gl.deleteTexture(texture);
                gl.deleteBuffer(positionBuffer);
                gl.deleteProgram(program);
                gl.deleteShader(vertShader);
                gl.deleteShader(fragShader);

                resolve({
                    blob: blob,
                    width: targetWidth,
                    height: targetHeight
                });
            }, 'image/jpeg', quality);
        });
    }
}

// Exportar no escopo global do navegador
window.Stitcher360 = Stitcher360;
