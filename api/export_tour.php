<?php
require_once 'config.php';

// Disable error display to avoid corrupting zip download
ini_set('display_errors', 0);
error_reporting(0);

if (!isset($_GET['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID do tour não fornecido.']);
    exit;
}

$tourId = $_GET['id'];

try {
    // 1. Buscar dados do tour no banco
    $stmt = $pdo->prepare("SELECT * FROM `" . TABLE_PREFIX . "tours` WHERE id = ?");
    $stmt->execute([$tourId]);
    $tourRow = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$tourRow) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Tour não encontrado.']);
        exit;
    }

    $scenes = json_decode($tourRow['scenes_json'], true) ?: [];
    $floorPlan = json_decode($tourRow['floor_plan_json'], true) ?: null;
    $logoUrl = $tourRow['logo_url'];
    $privacy = json_decode($tourRow['privacy_settings'], true) ?: null;
    $nadir = json_decode($tourRow['nadir_json'], true) ?: null;

    // 2. Criar arquivo ZIP temporário
    $zip = new ZipArchive();
    $zipName = tempnam(sys_get_temp_dir(), 'tour_') . '.zip';

    if ($zip->open($zipName, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        throw new Exception("Não foi possível criar o arquivo ZIP.");
    }

    $projectRoot = __DIR__ . '/../';

    // List of files to download/copy
    $styleCss = @file_get_contents($projectRoot . 'style.css') ?: '';
    
    // Cache aframe.min.js locally to avoid remote calls
    $localAframe = $projectRoot . 'assets/aframe.min.js';
    if (file_exists($localAframe)) {
        $aframeJs = file_get_contents($localAframe);
    } else {
        $aframeJs = @file_get_contents('https://aframe.io/releases/1.4.2/aframe.min.js');
        if ($aframeJs) {
            @file_put_contents($localAframe, $aframeJs);
        }
    }

    // Add CSS & JS to zip
    $zip->addFromString('style.css', $styleCss);
    $zip->addFromString('aframe.min.js', $aframeJs);

    // Array to map old paths to new local paths inside the ZIP
    $assetsToZip = [];

    // Helper to register an asset to be copied and rewrite its path
    $registerAsset = function($url) use (&$assetsToZip, $projectRoot) {
        if (empty($url)) return '';
        // If it is absolute URL or relative path
        $cleanUrl = str_replace('https://tour360.hubdigital360.com/hml/', '', $url);
        $cleanUrl = str_replace('https://360studio.hubdigital360.com/', '', $cleanUrl);
        $filename = basename($cleanUrl);
        
        $localPath = $projectRoot . $cleanUrl;
        if (file_exists($localPath)) {
            $zipPath = 'assets/' . $filename;
            $assetsToZip[$localPath] = $zipPath;
            return $zipPath;
        }
        return $url; // Fallback
    };

    // Rewrite scene URLs and assets
    foreach ($scenes as &$scene) {
        if (isset($scene['url'])) {
            $scene['url'] = $registerAsset($scene['url']);
        }
        // Check if there are hotspots with media/images (info hotspots)
        if (isset($scene['hotspots'])) {
            foreach ($scene['hotspots'] as &$hotspot) {
                if (isset($hotspot['mediaUrl']) && !empty($hotspot['mediaUrl'])) {
                    $hotspot['mediaUrl'] = $registerAsset($hotspot['mediaUrl']);
                }
            }
        }
    }

    // Rewrite floor plan image
    if ($floorPlan && isset($floorPlan['imageUrl'])) {
        $floorPlan['imageUrl'] = $registerAsset($floorPlan['imageUrl']);
    }

    // Rewrite Logo
    if (!empty($logoUrl)) {
        $logoUrl = $registerAsset($logoUrl);
    }

    // Rewrite Nadir image
    if ($nadir && isset($nadir['image'])) {
        $nadir['image'] = $registerAsset($nadir['image']);
    }

    // Add assets to ZIP
    foreach ($assetsToZip as $localPath => $zipPath) {
        $zip->addFile($localPath, $zipPath);
    }

    // Generate tour_data.js
    $tourData = [
        'tourId' => $tourRow['id'],
        'title' => $tourRow['title'],
        'scenes' => $scenes,
        'floorPlan' => $floorPlan,
        'logoUrl' => $logoUrl,
        'privacySettings' => $privacy,
        'nadirSettings' => $nadir
    ];
    $tourDataJs = "window.OFFLINE_TOUR_DATA = " . json_encode($tourData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . ";";
    $zip->addFromString('tour_data.js', $tourDataJs);

    // Create index.html (offline viewer)
    $indexHtml = getOfflineIndexHtml();
    $zip->addFromString('index.html', $indexHtml);

    // Create app_offline.js (offline viewer logic)
    $appOfflineJs = getOfflineAppJs();
    $zip->addFromString('app_offline.js', $appOfflineJs);

    $zip->close();

    // Send ZIP file to client
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="tour_offline_' . $tourId . '.zip"');
    header('Content-Length: ' . filesize($zipName));
    readfile($zipName);
    unlink($zipName);
    exit;

} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

function getOfflineIndexHtml() {
    return <<<'HTML'
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>360° Studio - Visualizador Offline</title>
    <!-- FontAwesome Icons (requires internet for icons, fallback if offline) -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- A-Frame VR Library loaded locally -->
    <script src="aframe.min.js"></script>
    <link rel="stylesheet" href="style.css">
    <style>
        /* Customize public/offline layouts to hide editor controls */
        .sidebar-modular, .mode-selector, #btn-toggle-sidebar, #btn-dashboard {
            display: none !important;
        }
        .top-bar {
            left: 0 !important;
        }
        .carousel-thumb.active {
            border-color: #00f2fe !important;
            box-shadow: 0 0 10px rgba(0, 242, 254, 0.5);
        }
    </style>
</head>
<body>
    <div class="app-container">
        <main class="viewer-container" style="width: 100%; height: 100vh; position: relative;">
            <!-- Barra Superior -->
            <header class="top-bar" style="position: absolute; top: 0; left: 0; right: 0; z-index: 1000; background: rgba(13, 14, 18, 0.7); backdrop-filter: blur(10px); display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; border-bottom: 1px solid rgba(255,255,255,0.08); box-sizing: border-box; height: 70px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div class="logo" style="text-decoration: none; display: flex; align-items: center; gap: 8px; margin-right: 8px;">
                        <i class="fa-solid fa-wand-magic-sparkles logo-icon" style="color: #00f2fe;"></i>
                        <span class="logo-text" style="color:#fff; font-weight:700;">360°<span class="highlight" style="color:#00f2fe;">Studio</span></span>
                    </div>
                    <div class="tour-info" style="border-left: 1px solid rgba(255,255,255,0.1); padding-left: 15px;">
                        <h1 id="tour-display-title" style="font-size: 16px; margin: 0; color:#fff;">Meu Tour Virtual 360</h1>
                        <p id="scene-display-title" style="font-size: 11px; margin: 2px 0 0 0; color: #a0aec0;">Nenhuma cena selecionada</p>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <button id="btn-enter-vr" class="mode-btn" style="border: 1px solid var(--color-purple); color: #b16ef2; background: rgba(155, 81, 224, 0.08); border-radius: 20px; padding: 8px 16px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;" title="Ativar Modo Óculos VR / Estereoscópico">
                        <i class="fa-solid fa-vr-cardboard"></i> Modo VR
                    </button>
                </div>
            </header>

            <!-- A-Frame VR Canvas -->
            <div class="canvas-wrapper" id="canvas-wrapper" style="width: 100%; height: 100%; position: relative; background: #000;">
                <a-scene embedded loading-screen="dotsColor: #00f2fe; backgroundColor: #0d0e12" cursor="rayOrigin: mouse" raycaster="objects: .hotspot-element, a-sky">
                    <a-sky id="sky-viewer" radius="100" rotation="0 -90 0"></a-sky>
                    <a-entity id="hotspots-container"></a-entity>
                    <a-entity id="camera-rig">
                        <a-camera id="main-camera" look-controls="reverseMouseDrag: true">
                            <a-cursor id="scene-cursor" visible="false"></a-cursor>
                        </a-camera>
                    </a-entity>
                </a-scene>

                <!-- Planta Baixa Widget (Visitor View) -->
                <div class="floorplan-visitor-widget" id="floorplan-visitor-widget" style="display: none; position: absolute; top: 90px; right: 20px; z-index: 1000; background: rgba(13, 14, 18, 0.85); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; width: 180px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.5);">
                    <div class="floorplan-widget-header" style="padding: 8px 12px; background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 11px; font-weight: 600; color: #fff;"><i class="fa-solid fa-map-location-dot"></i> Planta Baixa</span>
                    </div>
                    <div class="floorplan-widget-body" style="padding: 10px; display: flex; align-items: center; justify-content: center; position: relative;">
                        <img id="visitor-floorplan-img" src="" alt="Planta Baixa" style="max-width: 100%; max-height: 140px; display: block; border-radius: 4px;">
                        <div id="visitor-pins-container" style="position: absolute; top: 10px; left: 10px; width: calc(100% - 20px); height: calc(100% - 20px); pointer-events: none;"></div>
                    </div>
                </div>

                <!-- Carrossel de Miniaturas -->
                <div class="scenes-carousel-wrapper" id="scenes-carousel-wrapper" style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 1000; display: flex; gap: 10px; background: rgba(13, 14, 18, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); padding: 10px; border-radius: 12px; overflow-x: auto; max-width: 90%; box-sizing: border-box;">
                    <!-- Renderizado dinamicamente -->
                </div>
            </div>
        </main>
    </div>

    <!-- MODAL DE VISUALIZAÇÃO DE INFORMAÇÕES DE HOTSPOT -->
    <div class="modal-overlay" id="info-hotspot-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); z-index: 2000; align-items: center; justify-content: center;">
        <div class="modal-card" style="background: rgba(20, 22, 28, 0.95); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; max-width: 500px; width: 90%; color:#fff;">
            <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h2 id="info-hotspot-title" style="font-size: 16px; margin:0;"><i class="fa-solid fa-circle-info" style="color:#00f2fe; margin-right:8px;"></i> Detalhes</h2>
                <button id="btn-close-info-hotspot" style="background:none; border:none; color:#fff; font-size:20px; cursor:pointer;">&times;</button>
            </div>
            <div class="modal-body">
                <div id="info-hotspot-media-container" style="display: none; margin-bottom: 12px; border-radius: 8px; overflow: hidden;">
                    <img id="info-hotspot-img" src="" alt="Imagem" style="width: 100%; max-height: 250px; object-fit: contain;">
                </div>
                <div id="info-hotspot-desc" style="font-size: 13px; color:#a0aec0; line-height:1.5; white-space:pre-wrap;"></div>
            </div>
        </div>
    </div>

    <!-- Carrega a constante global tourData -->
    <script src="tour_data.js"></script>
    <script src="app_offline.js"></script>
</body>
</html>
HTML;
}

function getOfflineAppJs() {
    return <<<'JS'
document.addEventListener("DOMContentLoaded", () => {
    if (!window.OFFLINE_TOUR_DATA) {
        alert("Erro: Dados do tour não carregados.");
        return;
    }
    
    const data = window.OFFLINE_TOUR_DATA;
    let activeSceneId = null;

    // Configurar Título do Tour
    document.title = data.title + " - Offline Viewer";
    document.getElementById("tour-display-title").textContent = data.title;

    // Seletor VR
    const btnEnterVr = document.getElementById("btn-enter-vr");
    if (btnEnterVr) {
        btnEnterVr.addEventListener("click", () => {
            const scene = document.querySelector("a-scene");
            if (scene) scene.enterVR();
        });
    }

    // Inicializar Cenas
    if (data.scenes && data.scenes.length > 0) {
        const startScene = data.scenes[0];
        setActiveScene(startScene.id);
        renderCarousel(data.scenes);
        initFloorPlan(data.floorPlan);
    }

    function setActiveScene(sceneId) {
        activeSceneId = sceneId;
        const scene = data.scenes.find(s => s.id === sceneId);
        if (!scene) return;

        // Atualizar Título da Cena
        document.getElementById("scene-display-title").textContent = scene.name;

        // Atualizar A-Sky
        const sky = document.getElementById("sky-viewer");
        if (sky) {
            sky.setAttribute("src", scene.url);
            // Aplicar Yaw padrão da cena se houver
            const defaultYaw = scene.defaultYaw !== undefined ? parseFloat(scene.defaultYaw) : 0;
            sky.setAttribute("rotation", `0 ${-90 - defaultYaw} 0`);
        }

        // Atualizar Hotspots
        renderHotspots(scene);

        // Atualizar Pinos da Planta Baixa
        updateFloorPlanPins(sceneId);

        // Atualizar Ativo no Carrossel
        document.querySelectorAll(".carousel-thumb").forEach(thumb => {
            if (thumb.dataset.id === sceneId) {
                thumb.classList.add("active");
            } else {
                thumb.classList.remove("active");
            }
        });
    }

    function renderCarousel(scenes) {
        const wrapper = document.getElementById("scenes-carousel-wrapper");
        if (!wrapper) return;
        wrapper.innerHTML = "";

        scenes.forEach(s => {
            const thumb = document.createElement("div");
            thumb.className = "carousel-thumb";
            thumb.dataset.id = s.id;
            thumb.style.width = "70px";
            thumb.style.height = "50px";
            thumb.style.borderRadius = "6px";
            thumb.style.overflow = "hidden";
            thumb.style.cursor = "pointer";
            thumb.style.border = "2px solid transparent";
            thumb.style.background = `url('${s.url}') center/cover no-repeat`;

            thumb.addEventListener("click", () => setActiveScene(s.id));
            wrapper.appendChild(thumb);
        });
    }

    function renderHotspots(scene) {
        const container = document.getElementById("hotspots-container");
        if (!container) return;
        container.innerHTML = "";

        const hotspots = scene.hotspots || [];
        hotspots.forEach(h => {
            const entity = document.createElement("a-entity");
            
            // Usar coordenadas esféricas
            const phi = (90 - h.pitch) * (Math.PI / 180);
            const theta = (h.yaw + 180) * (Math.PI / 180);
            const radius = 10; // Distância fixa da câmera

            const x = -(radius * Math.sin(phi) * Math.sin(theta));
            const y = radius * Math.cos(phi);
            const z = radius * Math.sin(phi) * Math.cos(theta);

            entity.setAttribute("position", `${x} ${y} ${z}`);
            
            // Icon
            const circle = document.createElement("a-circle");
            circle.setAttribute("radius", "0.6");
            circle.setAttribute("color", h.type === "info" ? "#8b5cf6" : "#00f2fe");
            circle.setAttribute("material", "shader: flat; side: double; opacity: 0.95");
            circle.classList.add("hotspot-element");

            // Text Label
            const text = document.createElement("a-text");
            text.setAttribute("value", h.text);
            text.setAttribute("align", "center");
            text.setAttribute("color", "#ffffff");
            text.setAttribute("scale", "1.5 1.5 1.5");
            text.setAttribute("position", "0 0.9 0");
            text.setAttribute("look-at", "[camera]");
            entity.appendChild(text);

            // Click listener
            circle.addEventListener("click", () => {
                if (h.type === "portal") {
                    setActiveScene(h.targetSceneId);
                } else if (h.type === "info") {
                    showInfoModal(h);
                }
            });

            entity.appendChild(circle);
            container.appendChild(entity);
        });
    }

    // Modal de Informações
    const modal = document.getElementById("info-hotspot-modal");
    const closeBtn = document.getElementById("btn-close-info-hotspot");
    
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            modal.style.display = "none";
        });
    }

    function showInfoModal(h) {
        document.getElementById("info-hotspot-title").textContent = h.text;
        document.getElementById("info-hotspot-desc").textContent = h.description || "";
        
        const mediaContainer = document.getElementById("info-hotspot-media-container");
        const mediaImg = document.getElementById("info-hotspot-img");

        if (h.mediaUrl) {
            mediaImg.src = h.mediaUrl;
            mediaContainer.style.display = "block";
        } else {
            mediaContainer.style.display = "none";
        }

        modal.style.display = "flex";
    }

    // Planta Baixa
    let fpData = null;
    function initFloorPlan(fp) {
        if (!fp || !fp.imageUrl) return;
        fpData = fp;

        const widget = document.getElementById("floorplan-visitor-widget");
        const img = document.getElementById("visitor-floorplan-img");
        if (widget && img) {
            img.src = fp.imageUrl;
            widget.style.display = "block";
        }
    }

    function updateFloorPlanPins(sceneId) {
        const container = document.getElementById("visitor-pins-container");
        if (!container || !fpData || !fpData.pins) return;
        container.innerHTML = "";

        const pins = fpData.pins || {};
        const activePin = pins[sceneId];

        Object.keys(pins).forEach(id => {
            const pin = pins[id];
            const el = document.createElement("div");
            el.style.position = "absolute";
            el.style.left = `${pin.x}%`;
            el.style.top = `${pin.y}%`;
            el.style.width = "10px";
            el.style.height = "10px";
            el.style.borderRadius = "50%";
            el.style.transform = "translate(-50%, -50%)";
            el.style.pointerEvents = "auto";
            el.style.cursor = "pointer";

            if (id === sceneId) {
                el.style.background = "#ffb703";
                el.style.boxShadow = "0 0 10px #ffb703";
                el.style.zIndex = "10";
            } else {
                el.style.background = "#00f2fe";
                el.style.boxShadow = "0 0 6px #00f2fe";
            }

            el.addEventListener("click", () => setActiveScene(id));
            container.appendChild(el);
        });
    }
});
JS;
}
