// --- ESTADO GLOBAL DA APLICAÇÃO ---
const state = {
    tour: {
        tourId: "tour-local-default",
        title: "Meu Tour Virtual 360",
        scenes: []
    },
    activeSceneId: null,
    isEditMode: true,
    isAddingHotspot: false,
    pendingHotspotPos: null,
    videoUpdateInterval: null
};

// --- CONFIGURAÇÃO E CONSTANTES ---
const HOTSPOT_ICON_URL = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='42' fill='rgba(10, 12, 20, 0.7)' stroke='%2300f2fe' stroke-width='5' filter='drop-shadow(0px 0px 4px rgba(0, 242, 254, 0.8))'/><path d='M50 20 L72 52 L58 52 L58 75 L42 75 L42 52 L28 52 Z' fill='%2300f2fe'/></svg>";

const DEMO_SCENES = [
    {
        id: "scene-demo-1",
        title: "Puy de Sancy (França)",
        type: "image",
        sourceUrl: "https://raw.githubusercontent.com/aframevr/aframe/master/examples/boilerplate/panorama/puydesancy.jpg",
        isDemo: true,
        hotspots: [
            {
                id: "hotspot-demo-to-2",
                type: "portal",
                targetSceneId: "scene-demo-2",
                position: { x: 4.8, y: -0.5, z: -1.3 }, // Posição 3D
                label: "Visitar o Lago de Montanha"
            }
        ]
    },
    {
        id: "scene-demo-2",
        title: "Lago de Montanha (Demo)",
        type: "image",
        sourceUrl: "https://pannellum.org/images/jura.jpg",
        isDemo: true,
        hotspots: [
            {
                id: "hotspot-demo-to-1",
                type: "portal",
                targetSceneId: "scene-demo-1",
                position: { x: -4.5, y: -0.8, z: 2.1 },
                label: "Voltar para o Pico do Puy de Sancy"
            }
        ]
    }
];

// --- REGISTRO DE COMPONENTES A-FRAME ---
// Componente para escutar cliques nas fotos/vídeos e capturar a coordenada 3D
AFRAME.registerComponent('click-listener', {
    init: function () {
        this.el.addEventListener('click', function (evt) {
            // Apenas reage se estivermos no modo criador E no estado de adicionar hotspot
            if (!state.isEditMode || !state.isAddingHotspot) return;

            const intersection = evt.detail.intersection;
            if (intersection) {
                const point = intersection.point;
                // Calculamos a distância ideal (5 metros) para fixar o hotspot em uma esfera perfeita ao redor da câmera
                const targetDistance = 5;
                const distance = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z);
                
                state.pendingHotspotPos = {
                    x: (point.x / distance) * targetDistance,
                    y: (point.y / distance) * targetDistance,
                    z: (point.z / distance) * targetDistance
                };

                // Abrir o modal de configuração
                openHotspotModal();
            }
        });
    }
});

// --- INICIALIZAÇÃO DA APLICAÇÃO ---
document.addEventListener("DOMContentLoaded", async () => {
    initDOMEvents();
    
    // 1. Verificar ID do tour na URL
    const urlParams = new URLSearchParams(window.location.search);
    const tourId = urlParams.get('id');
    
    if (tourId) {
        // Carrega do servidor
        await loadTourFromServer(tourId);
    } else {
        // Fallback local/desenvolvimento
        loadTourFromStorage();
        
        // Se não houver cenas cadastradas no storage, carrega as demos
        if (state.tour.scenes.length === 0) {
            state.tour.scenes = [...DEMO_SCENES];
            saveTourToStorage();
            showToast("Carregado cenas de demonstração da Insta360!", "info");
        }
        
        // Definir cena inicial
        if (state.tour.scenes.length > 0) {
            const startScene = state.tour.scenes[0];
            setActiveScene(startScene.id);
        }
        
        renderScenesList();
        updateUI();
    }
});

// --- OPERAÇÕES DO BANCO DE DADOS (SERVIDOR E LOCAL) ---
async function loadTourFromServer(tourId) {
    try {
        const res = await fetch(`api/get_tour.php?id=${tourId}`);
        const data = await res.json();
        
        if (res.ok && data.success) {
            state.tour = data.tour;
            state.isOwner = data.is_owner;
            
            // Configurar títulos na tela
            document.getElementById("tour-title-input").value = state.tour.title;
            document.getElementById("tour-display-title").textContent = state.tour.title;
            
            // Configurar modo público se não for proprietário
            if (!state.isOwner) {
                // Esconder elementos de edição
                const sidebar = document.querySelector(".sidebar");
                if (sidebar) sidebar.style.display = "none";
                
                const modeSelector = document.querySelector(".mode-selector");
                if (modeSelector) modeSelector.style.display = "none";
                
                // Forçar modo visualização
                setMode(false);
            } else {
                // Proprietário: default para modo edição
                setMode(true);
            }
            
            // Definir cena inicial
            if (state.tour.scenes && state.tour.scenes.length > 0) {
                setActiveScene(state.tour.scenes[0].id);
            } else {
                document.getElementById("scene-display-title").textContent = "Nenhuma cena carregada";
            }
            
            renderScenesList();
            updateUI();
            showToast("Tour carregado com sucesso do servidor!", "success");
        } else {
            showToast(data.message || "Erro ao carregar o tour.", "error");
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 1500);
        }
    } catch (err) {
        console.error("Erro ao carregar tour do servidor:", err);
        showToast("Erro ao comunicar com o servidor.", "error");
    }
}

async function saveTourToStorage() {
    try {
        localStorage.setItem("a-team-360-tour-project", JSON.stringify(state.tour));
    } catch (e) {
        console.error("Erro ao salvar no LocalStorage:", e);
    }
    
    // Sincronizar com o banco se for um tour do servidor e for o proprietário
    if (state.tour.tourId && state.tour.tourId !== "tour-local-default" && state.isOwner) {
        try {
            const res = await fetch('api/save_tour.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tourId: state.tour.tourId,
                    title: state.tour.title,
                    scenes: state.tour.scenes
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                if (res.status === 403) {
                    showToast("Erro ao salvar: " + (data.message || "Assinatura expirada."), "error");
                } else {
                    console.error("Erro ao salvar no banco:", data.message);
                }
            }
        } catch (err) {
            console.error("Erro ao salvar alterações no servidor:", err);
        }
    }
}

function loadTourFromStorage() {
    try {
        const saved = localStorage.getItem("a-team-360-tour-project");
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && Array.isArray(parsed.scenes)) {
                state.tour = parsed;
                state.isOwner = true; // Local é sempre dono
                // Filtrar mídias locais expiradas (Object URLs expiram ao recarregar a página)
                state.tour.scenes = state.tour.scenes.map(scene => {
                    if (scene.sourceUrl.startsWith("blob:") && !scene.isDemo) {
                        // Substitui por vazio ou mantém placeholder de arquivo expirado
                    }
                    return scene;
                });
            }
        }
    } catch (e) {
        console.error("Erro ao carregar do LocalStorage:", e);
    }
}

// --- CONTROLE DE CENAS DO TOUR ---
function setActiveScene(sceneId) {
    const scene = state.tour.scenes.find(s => s.id === sceneId);
    if (!scene) return;

    state.activeSceneId = sceneId;
    
    // Exibir feedback de carregamento
    const sceneDisplayTitle = document.getElementById("scene-display-title");
    sceneDisplayTitle.textContent = `${scene.title} (${scene.type === 'video' ? 'Vídeo 360°' : 'Foto 360°'})`;

    // Atualizar no A-Frame
    const skyViewer = document.getElementById("sky-viewer");
    const videoViewer = document.getElementById("video-viewer");
    const assetsManager = document.getElementById("assets-manager");
    const videoControls = document.getElementById("video-controls");

    // Parar intervalos de vídeo ativos
    clearInterval(state.videoUpdateInterval);
    
    // Esconder ambos visualizadores inicialmente
    skyViewer.setAttribute("visible", "false");
    videoViewer.setAttribute("visible", "false");
    videoControls.style.display = "none";

    // Resetar imagem se já existia
    const activeImageEl = document.getElementById("active-image-element");
    if (activeImageEl) {
        activeImageEl.remove();
    }

    // Resetar vídeo se já existia
    const activeVideoEl = document.getElementById("active-video-element");
    if (activeVideoEl) {
        activeVideoEl.pause();
        activeVideoEl.remove();
    }

    if (scene.type === "image") {
        // Criar elemento de imagem dinamicamente nos assets para correta detecção de textura pelo A-Frame
        const img = document.createElement("img");
        img.id = "active-image-element";
        img.crossOrigin = "anonymous";
        assetsManager.appendChild(img);

        img.onload = () => {
            skyViewer.setAttribute("src", ""); // Limpa cache
            skyViewer.setAttribute("src", `#${img.id}`);
            skyViewer.setAttribute("visible", "true");
            skyViewer.setAttribute("click-listener", "");
        };
        img.src = scene.sourceUrl;
    } else if (scene.type === "video") {
        // Criar elemento de vídeo dinamicamente no Assets Manager
        const video = document.createElement("video");
        video.id = "active-video-element";
        video.src = scene.sourceUrl;
        video.crossOrigin = "anonymous";
        video.loop = true;
        video.playsInline = true;
        video.webkitPlaysinline = true;
        video.autoplay = false; // Controlado pelo player customizado
        assetsManager.appendChild(video);

        // Renderizar videosphere
        videoViewer.setAttribute("src", `#${video.id}`);
        videoViewer.setAttribute("visible", "true");
        videoViewer.setAttribute("click-listener", "");

        // Exibir controles de vídeo
        videoControls.style.display = "flex";
        initVideoControls(video);
    }

    // Renderizar os hotspots desta cena
    renderHotspots(scene.hotspots);

    // Destacar item selecionado na barra lateral
    document.querySelectorAll(".scene-card").forEach(card => {
        if (card.dataset.id === sceneId) {
            card.classList.add("active");
        } else {
            card.classList.remove("active");
        }
    });

    // Resetar estado de adição de hotspot
    cancelAddingHotspot();
}

// --- RENDERIZAÇÃO DE HOTSPOTS NO ESPAÇO 3D ---
function renderHotspots(hotspotsList) {
    const container = document.getElementById("hotspots-container");
    container.innerHTML = ""; // Limpa hotspots anteriores

    if (!hotspotsList) return;

    hotspotsList.forEach(hotspot => {
        // Criamos uma entidade A-Frame para o hotspot
        const entity = document.createElement("a-entity");
        
        // Atributos de posicionamento no espaço 3D
        entity.setAttribute("position", `${hotspot.position.x} ${hotspot.position.y} ${hotspot.position.z}`);
        entity.setAttribute("look-at", "#camera");
        
        // Elemento visual do hotspot (Plane com a imagem de seta)
        const icon = document.createElement("a-plane");
        icon.setAttribute("class", "hotspot-element");
        icon.setAttribute("src", HOTSPOT_ICON_URL);
        icon.setAttribute("width", "0.6");
        icon.setAttribute("height", "0.6");
        icon.setAttribute("transparent", "true");
        icon.setAttribute("material", "shader: flat; depthTest: false; transparent: true");
        
        // Animação Hover no A-Frame
        icon.setAttribute("animation__mouseenter", "property: scale; to: 1.2 1.2 1.2; dur: 200; startEvents: mouseenter");
        icon.setAttribute("animation__mouseleave", "property: scale; to: 1 1 1; dur: 200; startEvents: mouseleave");

        // Elemento de texto flutuante (Tooltip)
        const text = document.createElement("a-text");
        text.setAttribute("value", hotspot.label);
        text.setAttribute("align", "center");
        text.setAttribute("position", "0 0.6 0");
        text.setAttribute("width", "4");
        text.setAttribute("color", "#ffffff");
        text.setAttribute("font", "koku");
        
        // Fundo do texto para melhor leitura
        const textBg = document.createElement("a-plane");
        textBg.setAttribute("color", "#0a0b0e");
        textBg.setAttribute("width", (hotspot.label.length * 0.12) + 0.4);
        textBg.setAttribute("height", "0.35");
        textBg.setAttribute("position", "0 0.6 -0.01");
        textBg.setAttribute("opacity", "0.85");
        textBg.setAttribute("transparent", "true");
        textBg.setAttribute("material", "shader: flat; depthTest: false");

        // Evento de clique para transição
        icon.addEventListener("click", (evt) => {
            evt.stopPropagation();
            
            // Efeito visual de fade no visualizador
            triggerSceneTransition(() => {
                setActiveScene(hotspot.targetSceneId);
                showToast(`Transicionado para: ${getSceneTitle(hotspot.targetSceneId)}`, "info");
            });
        });

        // Monta a estrutura da entidade
        entity.appendChild(icon);
        entity.appendChild(text);
        entity.appendChild(textBg);
        
        container.appendChild(entity);
    });
}

function getSceneTitle(id) {
    const scene = state.tour.scenes.find(s => s.id === id);
    return scene ? scene.title : "Cena Desconhecida";
}

// --- EFEITO DE TRANSIÇÃO SUAVE (FADE) ---
function triggerSceneTransition(callback) {
    // Adiciona uma esfera escura ao redor da câmera para simular fade-out/in
    const camera = document.getElementById("camera");
    
    const fade = document.createElement("a-entity");
    fade.setAttribute("geometry", "primitive: sphere; radius: 0.5");
    fade.setAttribute("material", "color: #0a0b0e; shader: flat; side: double; opacity: 0; transparent: true");
    fade.setAttribute("position", "0 0 0");
    
    // Animação de fade out (escurecer)
    fade.setAttribute("animation__fadeout", "property: material.opacity; from: 0; to: 1; dur: 250; easing: easeInQuad");
    
    camera.appendChild(fade);

    setTimeout(() => {
        // Executa a mudança de cena
        callback();
        
        // Animação de fade in (clarear)
        fade.removeAttribute("animation__fadeout");
        fade.setAttribute("animation__fadein", "property: material.opacity; from: 1; to: 0; dur: 350; easing: easeOutQuad");
        
        setTimeout(() => {
            fade.remove();
        }, 360);
    }, 260);
}

// --- EVENTOS DO DOM & INTERFACE ---
function initDOMEvents() {
    const fileInput = document.getElementById("file-input");
    const dropZone = document.getElementById("drop-zone");
    const btnExport = document.getElementById("btn-export");
    const tourTitleInput = document.getElementById("tour-title-input");
    const btnModeEdit = document.getElementById("btn-mode-edit");
    const btnModeView = document.getElementById("btn-mode-view");
    const btnAddHotspot = document.getElementById("btn-add-hotspot");
    
    // Upload de Arquivos
    dropZone.addEventListener("click", () => fileInput.click());
    
    fileInput.addEventListener("change", (e) => {
        handleFiles(e.target.files);
    });

    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
        handleFiles(e.dataTransfer.files);
    });

    // Nome do Tour
    tourTitleInput.addEventListener("input", (e) => {
        state.tour.title = e.target.value;
        document.getElementById("tour-display-title").textContent = e.target.value;
        saveTourToStorage();
    });

    // Alternar Modos Editor/Visualizador
    btnModeEdit.addEventListener("click", () => setMode(true));
    btnModeView.addEventListener("click", () => setMode(false));

    // Botão Adicionar Hotspot
    btnAddHotspot.addEventListener("click", () => {
        if (state.isAddingHotspot) {
            cancelAddingHotspot();
        } else {
            startAddingHotspot();
        }
    });

    // Controles de Visualização 360° (Zoom, Reset, Fullscreen)
    document.getElementById("btn-zoom-in").addEventListener("click", () => adjustZoom(-8));
    document.getElementById("btn-zoom-out").addEventListener("click", () => adjustZoom(8));
    document.getElementById("btn-reset-cam").addEventListener("click", resetCamera);
    document.getElementById("btn-fullscreen").addEventListener("click", toggleFullscreen);

    // Modals & Hotspot Form
    document.getElementById("btn-close-modal").addEventListener("click", closeHotspotModal);
    document.getElementById("btn-cancel-hotspot").addEventListener("click", closeHotspotModal);
    document.getElementById("btn-save-hotspot").addEventListener("click", saveHotspot);

    // Exportação
    btnExport.addEventListener("click", exportTourJSON);
}

// --- AUXILIAR: PROCESSAMENTO E OTIMIZAÇÃO DE MÍDIA 360 ---
function processAndOptimizeFile(file) {
    return new Promise((resolve) => {
        const type = file.type.startsWith("video/") ? "video" : "image";
        
        if (type === "video") {
            // Para vídeos geramos a URL local do objeto direto
            const objectUrl = URL.createObjectURL(file);
            resolve({
                title: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
                type: "video",
                sourceUrl: objectUrl,
                file: file
            });
            return;
        }

        // Se for imagem, tentamos carregar e redimensionar se passar do limite WebGL
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const MAX_WIDTH = 4096; // Limite universal seguro para texturas WebGL
                
                if (img.width > MAX_WIDTH) {
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    
                    canvas.width = MAX_WIDTH;
                    // Mantém a proporção esférica (geralmente 2:1)
                    canvas.height = Math.round((img.height / img.width) * MAX_WIDTH);
                    
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    canvas.toBlob(function(blob) {
                        const optimizedUrl = URL.createObjectURL(blob);
                        resolve({
                            title: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
                            type: "image",
                            sourceUrl: optimizedUrl,
                            blob: blob
                        });
                    }, "image/jpeg", 0.92); // Excelente qualidade com compressão de tamanho
                } else {
                    // Se for menor, gera URL do objeto direto sem alteração
                    const objectUrl = URL.createObjectURL(file);
                    resolve({
                        title: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
                        type: "image",
                        sourceUrl: objectUrl,
                        file: file
                    });
                }
            };
            img.onerror = function() {
                // Erro ao decodificar (provavelmente arquivo .INSP nativo sem exportar)
                resolve({
                    title: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
                    type: "image",
                    sourceUrl: "",
                    error: "Formato inválido. Exporte como JPG Equiretangular no Insta360 Studio primeiro!"
                });
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function uploadFileToServer(fileOrBlob, filename) {
    const formData = new FormData();
    formData.append('file', fileOrBlob, filename);
    
    try {
        const res = await fetch('api/upload.php', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            return data.url; // Retorna "uploads/media_360_xxxx.jpg"
        } else {
            showToast("Falha no upload para o servidor: " + (data.message || ""), "error");
            return null;
        }
    } catch (err) {
        console.error("Erro na API de upload:", err);
        showToast("Erro ao conectar com a API de upload.", "error");
        return null;
    }
}

// --- TRATAMENTO DOS ARQUIVOS DE UPLOAD ---
async function handleFiles(files) {
    if (files.length === 0) return;

    showToast("Processando e otimizando mídias 360°... Aguarde.", "info");
    
    const promises = Array.from(files).map(file => processAndOptimizeFile(file));
    const results = await Promise.all(promises);

    let loadedCount = 0;
    let errorCount = 0;
    let lastLoadedId = null;

    for (const res of results) {
        if (res.error) {
            errorCount++;
            showToast(`${res.title}: ${res.error}`, "error");
            continue;
        }

        let finalSourceUrl = res.sourceUrl;
        
        // Se for um tour do servidor e for o proprietário, realiza o upload físico
        if (state.tour.tourId && state.tour.tourId !== "tour-local-default" && state.isOwner) {
            showToast(`Enviando "${res.title}" para o servidor...`, "info");
            const fileToUpload = res.blob || res.file;
            const extension = res.type === 'video' ? 'mp4' : 'jpg';
            const serverUrl = await uploadFileToServer(fileToUpload, `${res.title}.${extension}`);
            if (serverUrl) {
                finalSourceUrl = serverUrl;
            } else {
                errorCount++;
                continue; // Pula a inserção se o upload falhar
            }
        }

        const id = "scene-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
        const newScene = {
            id: id,
            title: res.title,
            type: res.type,
            sourceUrl: finalSourceUrl,
            hotspots: []
        };

        state.tour.scenes.push(newScene);
        loadedCount++;
        lastLoadedId = id;
    }

    if (loadedCount > 0) {
        saveTourToStorage();
        renderScenesList();
        updateUI();
        
        // Ativa a última cena carregada
        setActiveScene(lastLoadedId);
        
        showToast(`${loadedCount} mídia(s) 360° carregada(s) com sucesso!`, "success");
    }
}

// --- RENDERIZAÇÃO DA BARRA LATERAL ---
function renderScenesList() {
    const list = document.getElementById("scenes-list");
    list.innerHTML = "";

    document.getElementById("scenes-count").textContent = state.tour.scenes.length;

    state.tour.scenes.forEach((scene, index) => {
        const card = document.createElement("div");
        card.className = `scene-card ${scene.id === state.activeSceneId ? 'active' : ''}`;
        card.dataset.id = scene.id;

        // Marcador de cena inicial
        const isStart = index === 0;

        // Cria a miniatura
        let thumbContent = "";
        if (scene.type === "image") {
            // Se for imagem demo ou se tivermos acesso direto à imagem
            thumbContent = `<img src="${scene.sourceUrl}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">`;
        }
        
        card.innerHTML = `
            <div class="scene-thumb">
                ${thumbContent}
                <i class="fa-solid ${scene.type === 'video' ? 'fa-video' : 'fa-image'}" style="${scene.type === 'image' && scene.sourceUrl.startsWith('blob') ? 'display: none;' : ''}"></i>
            </div>
            <div class="scene-info">
                <h4 class="scene-title">${scene.title}</h4>
                <div class="scene-meta">
                    <i class="fa-solid ${scene.type === 'video' ? 'fa-film' : 'fa-camera'}"></i>
                    <span>${scene.type === 'video' ? 'Vídeo 360°' : 'Foto 360°'}</span>
                </div>
            </div>
            ${isStart ? '<span class="badge-start-scene">Início</span>' : ''}
            <div class="scene-actions">
                ${!isStart ? `<button class="action-icon-btn btn-star" title="Definir como Cena Inicial"><i class="fa-solid fa-star"></i></button>` : ''}
                <button class="action-icon-btn btn-delete" title="Excluir Cena"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;

        // Evento de clique para ativar a cena
        card.addEventListener("click", (e) => {
            // Ignora se clicou em botões de ação
            if (e.target.closest(".scene-actions")) return;
            setActiveScene(scene.id);
        });

        // Ações do Card
        const btnDelete = card.querySelector(".btn-delete");
        btnDelete.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteScene(scene.id);
        });

        const btnStar = card.querySelector(".btn-star");
        if (btnStar) {
            btnStar.addEventListener("click", (e) => {
                e.stopPropagation();
                setStartScene(scene.id);
            });
        }

        list.appendChild(card);
    });
}

function setStartScene(sceneId) {
    const index = state.tour.scenes.findIndex(s => s.id === sceneId);
    if (index > 0) {
        // Move a cena escolhida para a primeira posição
        const [scene] = state.tour.scenes.splice(index, 1);
        state.tour.scenes.unshift(scene);
        saveTourToStorage();
        renderScenesList();
        showToast("Cena inicial alterada com sucesso!", "success");
    }
}

function deleteScene(sceneId) {
    if (confirm("Deseja realmente excluir esta cena do tour?")) {
        const index = state.tour.scenes.findIndex(s => s.id === sceneId);
        if (index > -1) {
            state.tour.scenes.splice(index, 1);
            
            // Remove as conexões/hotspots de outras cenas que apontavam para esta cena excluída
            state.tour.scenes.forEach(scene => {
                scene.hotspots = scene.hotspots.filter(h => h.targetSceneId !== sceneId);
            });

            saveTourToStorage();
            renderScenesList();
            
            if (state.activeSceneId === sceneId) {
                if (state.tour.scenes.length > 0) {
                    setActiveScene(state.tour.scenes[0].id);
                } else {
                    document.getElementById("sky-viewer").setAttribute("visible", "false");
                    document.getElementById("video-viewer").setAttribute("visible", "false");
                    document.getElementById("hotspots-container").innerHTML = "";
                    state.activeSceneId = null;
                }
            } else if (state.activeSceneId) {
                // Atualiza hotspots da cena ativa atual caso algum tenha sido deletado
                const currentScene = state.tour.scenes.find(s => s.id === state.activeSceneId);
                renderHotspots(currentScene.hotspots);
            }
            
            updateUI();
            showToast("Cena removida com sucesso.", "info");
        }
    }
}

// --- MODOS EDITOR VS. VISUALIZADOR ---
function setMode(isEdit) {
    state.isEditMode = isEdit;
    
    const btnModeEdit = document.getElementById("btn-mode-edit");
    const btnModeView = document.getElementById("btn-mode-view");
    const cursor = document.getElementById("scene-cursor");
    const btnAddHotspot = document.getElementById("btn-add-hotspot");
    const editorHint = document.getElementById("editor-hint");

    cancelAddingHotspot();

    if (isEdit) {
        btnModeEdit.classList.add("active");
        btnModeView.classList.remove("active");
        cursor.setAttribute("visible", "true"); // Mostra cursor de mira
        btnAddHotspot.style.display = "flex";
        editorHint.style.display = "flex";
        document.body.classList.remove("preview-mode");
    } else {
        btnModeEdit.classList.remove("active");
        btnModeView.classList.add("active");
        cursor.setAttribute("visible", "false"); // Esconde cursor de mira
        btnAddHotspot.style.display = "none";
        editorHint.style.display = "none";
        document.body.classList.add("preview-mode");
    }
}

// --- FLUXO DE ADICIONAR HOTSPOT (PORTAL) ---
function startAddingHotspot() {
    if (state.tour.scenes.length < 2) {
        showToast("Você precisa ter pelo menos 2 cenas carregadas para criar portais de passeio!", "error");
        return;
    }

    state.isAddingHotspot = true;
    const btn = document.getElementById("btn-add-hotspot");
    btn.classList.add("active");
    btn.innerHTML = `<i class="fa-solid fa-times-circle"></i> <span>Cancelar</span>`;
    
    showToast("Clique em qualquer lugar na cena 360° para fixar o portal.", "info");
}

function cancelAddingHotspot() {
    state.isAddingHotspot = false;
    state.pendingHotspotPos = null;
    const btn = document.getElementById("btn-add-hotspot");
    btn.classList.remove("active");
    btn.innerHTML = `<i class="fa-solid fa-plus-circle animate-pulse"></i> <span>Adicionar Hotspot</span>`;
}

function openHotspotModal() {
    const modal = document.getElementById("hotspot-modal");
    const select = document.getElementById("hotspot-target");
    
    // Limpa e popula o select com as outras cenas
    select.innerHTML = "";
    state.tour.scenes.forEach(scene => {
        if (scene.id !== state.activeSceneId) {
            const option = document.createElement("option");
            option.value = scene.id;
            option.textContent = scene.title;
            select.appendChild(option);
        }
    });

    document.getElementById("hotspot-label").value = "";
    modal.classList.add("active");
}

function closeHotspotModal() {
    document.getElementById("hotspot-modal").classList.remove("active");
    cancelAddingHotspot();
}

function saveHotspot() {
    const label = document.getElementById("hotspot-label").value.trim();
    const targetSceneId = document.getElementById("hotspot-target").value;

    if (!label) {
        alert("Por favor, digite uma descrição para o portal.");
        return;
    }

    if (!targetSceneId) {
        alert("Nenhuma cena selecionada para o destino.");
        return;
    }

    // Cria o hotspot no estado global
    const currentScene = state.tour.scenes.find(s => s.id === state.activeSceneId);
    if (currentScene) {
        const newHotspot = {
            id: "hotspot-" + Date.now(),
            type: "portal",
            targetSceneId: targetSceneId,
            position: state.pendingHotspotPos,
            label: label
        };

        if (!currentScene.hotspots) currentScene.hotspots = [];
        currentScene.hotspots.push(newHotspot);
        
        saveTourToStorage();
        renderHotspots(currentScene.hotspots);
        closeHotspotModal();
        showToast("Hotspot criado com sucesso!", "success");
    }
}

// --- CUSTOM CONTROLES DE VÍDEO 360° ---
function initVideoControls(videoElement) {
    const btnPlay = document.getElementById("btn-video-play");
    const btnMute = document.getElementById("btn-video-mute");
    const progressBar = document.getElementById("video-progress");
    const progressContainer = document.getElementById("video-progress-container");
    const volumeSlider = document.getElementById("video-volume");
    const timeDisplay = document.getElementById("video-time");

    // Sincroniza Play/Pause
    btnPlay.onclick = () => {
        if (videoElement.paused) {
            videoElement.play();
            btnPlay.innerHTML = `<i class="fa-solid fa-pause"></i>`;
        } else {
            videoElement.pause();
            btnPlay.innerHTML = `<i class="fa-solid fa-play"></i>`;
        }
    };

    // Sincroniza Mute
    btnMute.onclick = () => {
        videoElement.muted = !videoElement.muted;
        if (videoElement.muted) {
            btnMute.innerHTML = `<i class="fa-solid fa-volume-xmark"></i>`;
            volumeSlider.value = 0;
        } else {
            btnMute.innerHTML = `<i class="fa-solid fa-volume-high"></i>`;
            volumeSlider.value = videoElement.volume;
        }
    };

    // Slider de volume
    volumeSlider.oninput = (e) => {
        const val = parseFloat(e.target.value);
        videoElement.volume = val;
        videoElement.muted = val === 0;
        
        if (val === 0) {
            btnMute.innerHTML = `<i class="fa-solid fa-volume-xmark"></i>`;
        } else if (val < 0.5) {
            btnMute.innerHTML = `<i class="fa-solid fa-volume-low"></i>`;
        } else {
            btnMute.innerHTML = `<i class="fa-solid fa-volume-high"></i>`;
        }
    };

    // Atualização da Timeline barra de progresso
    state.videoUpdateInterval = setInterval(() => {
        if (!isNaN(videoElement.duration)) {
            const pct = (videoElement.currentTime / videoElement.duration) * 100;
            progressBar.style.width = `${pct}%`;
            
            // Texto de tempo
            timeDisplay.textContent = `${formatTime(videoElement.currentTime)} / ${formatTime(videoElement.duration)}`;
        }
    }, 250);

    // Clique na Timeline para pular tempo
    progressContainer.onclick = (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const pct = clickX / rect.width;
        if (!isNaN(videoElement.duration)) {
            videoElement.currentTime = pct * videoElement.duration;
            progressBar.style.width = `${pct * 100}%`;
        }
    };
}

function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// --- CONTROLES DE ZOOM E TELA ---
function adjustZoom(amount) {
    const camera = document.getElementById("camera");
    if (!camera) return;
    
    let fov = parseFloat(camera.getAttribute("fov") || 80);
    fov += amount;
    
    // Limita os valores do FOV (Field Of View)
    if (fov < 30) fov = 30;
    if (fov > 105) fov = 105;
    
    camera.setAttribute("fov", fov);
}

function resetCamera() {
    const camera = document.getElementById("camera");
    const rig = document.getElementById("rig");
    if (camera && rig) {
        camera.setAttribute("fov", 80);
        camera.setAttribute("rotation", "0 0 0");
        rig.setAttribute("position", "0 0 0");
        
        // Força a câmera do A-Frame a olhar para a frente
        const lookControls = camera.components['look-controls'];
        if (lookControls) {
            lookControls.pitchObject.rotation.x = 0;
            lookControls.yawObject.rotation.y = 0;
        }
    }
    showToast("Câmera resetada.", "info");
}

function toggleFullscreen() {
    const el = document.getElementById("canvas-wrapper");
    if (!document.fullscreenElement) {
        el.requestFullscreen().catch(err => {
            alert(`Erro ao tentar ativar tela cheia: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
}

// --- EXPORTAR TOUR (JSON COMPATÍVEL COM SAAS) ---
function exportTourJSON() {
    if (state.tour.scenes.length === 0) {
        showToast("Nenhuma cena para exportar.", "error");
        return;
    }

    // Criamos um clone do objeto do tour para não alterar o original
    const tourData = JSON.parse(JSON.stringify(state.tour));
    
    // Limpar URLs de Blob que não servem após fechar a aba
    tourData.scenes = tourData.scenes.map(scene => {
        if (scene.sourceUrl.startsWith("blob:")) {
            // Em um sistema real, o arquivo seria subido e esta URL seria a URL pública do Storage.
            // Para portabilidade do JSON, marcamos que precisa de re-vinculação física.
            scene.sourceFilename = scene.title;
        }
        return scene;
    });

    const jsonString = JSON.stringify(tourData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.tour.title.toLowerCase().replace(/\s+/g, '-')}-tour.json`;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);

    showToast("Configuração do Tour exportada com sucesso!", "success");
}

// --- TOAST NOTIFICATIONS ---
function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let iconClass = "fa-info-circle";
    if (type === "success") iconClass = "fa-check-circle";
    if (type === "error") iconClass = "fa-exclamation-circle";

    toast.innerHTML = `
        <i class="fa-solid ${iconClass}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);
    
    // Anima a entrada
    setTimeout(() => toast.classList.add("show"), 10);
    
    // Auto-destrói após 4 segundos
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

function updateUI() {
    const scenesCount = state.tour.scenes.length;
    const editorHint = document.getElementById("editor-hint");
    
    if (scenesCount === 0) {
        document.getElementById("scene-display-title").textContent = "Nenhuma cena carregada";
    }
}
