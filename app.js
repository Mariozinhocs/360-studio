// --- ESTADO GLOBAL DA APLICAÇÃO ---
const state = {
    tour: {
        tourId: "tour-local-default",
        title: "Meu Tour Virtual 360",
        scenes: [],
        floorPlan: null,
        logoUrl: null,
        privacySettings: null
    },
    activeSceneId: null,
    isEditMode: true,
    isAddingHotspot: false,
    pendingHotspotPos: null,
    videoUpdateInterval: null,
    
    // Gerenciamento e Interação de Hotspots
    selectedHotspotId: null,
    isRepositioningHotspot: false,
    
    // Planta Baixa
    floorplanSelectedSceneId: null,
    activeYawAngle: 0,
    
    // Recursos Ativos do Plano
    features: {},
    
    // Áudio / Som Ambiente
    ambientAudio: null,
    isAudioMuted: true
};

// --- FUNÇÃO AUXILIAR DE DEBOUNCE ---
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// --- CONFIGURAÇÃO E CONSTANTES (ÍCONES SVG DE ALTA RESOLUÇÃO BASE64) ---
const HOTSPOT_ICON_FREE = "data:image/svg+xml;base64," + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <radialGradient id="freeGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00f2fe" stop-opacity="0.95"/>
      <stop offset="65%" stop-color="#0284c7" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#0b111e" stop-opacity="0.9"/>
    </radialGradient>
    <filter id="fGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <circle cx="64" cy="64" r="56" fill="url(#freeGlow)" stroke="#ffffff" stroke-width="4" filter="url(#fGlow)"/>
  <circle cx="64" cy="64" r="42" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="5,4" opacity="0.85"/>
  <path d="M64 34 L88 64 L74 64 L74 94 L54 94 L54 64 L40 64 Z" fill="#ffffff" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"/>
</svg>`);

const HOTSPOT_ICON_PREMIUM = "data:image/svg+xml;base64," + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <radialGradient id="premGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffb703" stop-opacity="0.95"/>
      <stop offset="65%" stop-color="#fb8500" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#190e03" stop-opacity="0.9"/>
    </radialGradient>
    <filter id="pGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <circle cx="64" cy="64" r="56" fill="url(#premGlow)" stroke="#ffffff" stroke-width="4" filter="url(#pGlow)"/>
  <circle cx="64" cy="64" r="42" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="5,4" opacity="0.85"/>
  <path d="M64 32 L88 62 L74 62 L74 94 L54 94 L54 62 L40 62 Z" fill="#ffffff" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"/>
</svg>`);

const HOTSPOT_ICON_SELECTED = "data:image/svg+xml;base64," + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <radialGradient id="selGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00f2fe" stop-opacity="1"/>
      <stop offset="70%" stop-color="#8b5cf6" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#0b0f19" stop-opacity="0.98"/>
    </radialGradient>
  </defs>
  <circle cx="64" cy="64" r="58" fill="url(#selGlow)" stroke="#00f2fe" stroke-width="6"/>
  <circle cx="64" cy="64" r="44" fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="4,4"/>
  <circle cx="64" cy="64" r="14" fill="#ffffff"/>
  <path d="M64 22 L64 42 M64 86 L64 106 M22 64 L42 64 M86 64 L106 64" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
</svg>`);

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
            // Apenas reage se estivermos no modo editor
            if (!state.isEditMode) return;

            let point = evt.detail && evt.detail.intersection ? evt.detail.intersection.point : null;
            
            if (!point) {
                const camera = document.getElementById("camera");
                if (camera) {
                    const dir = new THREE.Vector3(0, 0, -1);
                    dir.applyQuaternion(camera.object3D.quaternion);
                    point = dir.clone().multiplyScalar(5);
                }
            }

            if (!point) return;

            const targetDistance = 5;
            const distance = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z) || 1;
            const newPos = {
                x: parseFloat(((point.x / distance) * targetDistance).toFixed(3)),
                y: parseFloat(((point.y / distance) * targetDistance).toFixed(3)),
                z: parseFloat(((point.z / distance) * targetDistance).toFixed(3))
            };

            // 1. Modo de Reposicionamento de Hotspot Ativo
            if (state.isRepositioningHotspot && state.selectedHotspotId) {
                const currentScene = state.tour.scenes.find(s => s.id === state.activeSceneId);
                if (currentScene && currentScene.hotspots) {
                    const hotspot = currentScene.hotspots.find(h => h.id === state.selectedHotspotId);
                    if (hotspot) {
                        hotspot.position = newPos;
                        state.isRepositioningHotspot = false;
                        saveTourToStorage();
                        renderHotspots(currentScene.hotspots);
                        renderHotspotsList();
                        showToast(`Portal "${hotspot.label}" reposicionado com sucesso!`, "success");
                        return;
                    }
                }
            }

            // 2. Modo de Adição de Novo Hotspot
            if (state.isAddingHotspot) {
                state.pendingHotspotPos = newPos;
                openHotspotModal();
            }
        });
    }
});

// Componente para escutar rotação da câmera e atualizar o radar da planta baixa
AFRAME.registerComponent('rotation-listener', {
    tick: function () {
        const rotation = this.el.getAttribute('rotation');
        if (rotation) {
            // rotation.y é o Yaw (rotação horizontal)
            state.activeYawAngle = rotation.y;
            updateActiveRadarAngle(rotation.y);
        }
    }
});

// --- INICIALIZAÇÃO DA APLICAÇÃO ---
document.addEventListener("DOMContentLoaded", async () => {
    initDOMEvents();
    initFloorplan();
    
    // 1. Verificar ID do tour na URL
    const urlParams = new URLSearchParams(window.location.search);
    const tourId = urlParams.get('id');
    const startMode = urlParams.get('mode');
    
    if (tourId) {
        state.tour.tourId = tourId;
        // Carrega do servidor
        await loadTourFromServer(tourId, startMode);
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
        renderFloorplanSidebar();
        renderVisitorFloorplanWidget();
        renderScenesCarousel();
        updateUI();
    }
});

// --- OPERAÇÕES DO BANCO DE DADOS (SERVIDOR E LOCAL) ---
async function loadTourFromServer(tourId, startMode = null) {
    try {
        const res = await fetch(`api/get_tour.php?id=${tourId}`);
        const data = await res.json();
        
        if (res.ok && data.success) {
            state.tour = data.tour;
            state.isOwner = data.is_owner;
            state.showAds = !!data.show_ads;
            state.features = data.features || {};
            
            if (data.is_locked) {
                // Tour bloqueado por senha
                document.getElementById("password-lock-screen").style.display = "flex";
                
                // Configurar títulos básicos
                document.getElementById("tour-display-title").textContent = state.tour.title;
                document.getElementById("scene-display-title").textContent = "Acesso Restrito";
                
                // Esconder elementos de edição por segurança
                const sidebar = document.getElementById("sidebar");
                if (sidebar) sidebar.style.display = "none";
                
                const modeSelector = document.querySelector(".mode-selector");
                if (modeSelector) modeSelector.style.display = "none";
                
                setMode(false);
                updateUI();
                return;
            } else {
                const lockScreen = document.getElementById("password-lock-screen");
                if (lockScreen) lockScreen.style.display = "none";
            }
            
            // Configurar títulos na tela
            document.getElementById("tour-title-input").value = state.tour.title;
            document.getElementById("tour-display-title").textContent = state.tour.title;
            
            // Configurar modo público se não for proprietário ou se solicitado explicitamente
            if (!state.isOwner) {
                // Esconder elementos de edição
                const sidebar = document.getElementById("sidebar");
                if (sidebar) sidebar.style.display = "none";
                
                const modeSelector = document.querySelector(".mode-selector");
                if (modeSelector) modeSelector.style.display = "none";
                
                // Forçar modo visualização
                setMode(false);
            } else {
                // Proprietário: verifica se iniciou em modo visualização
                if (startMode === 'view') {
                    setMode(false);
                } else {
                    setMode(true);
                }
            }

            // Exibir/ocultar anúncios e marca d'água promocional do plano Grátis
            const watermark = document.getElementById("promotional-watermark");
            const adsOverlay = document.getElementById("google-ads-overlay");
            if (state.showAds) {
                if (watermark) watermark.style.display = "block";
                if (adsOverlay) adsOverlay.style.display = "flex";
                startAdsTimer();
            } else {
                if (watermark) watermark.style.display = "none";
                if (adsOverlay) adsOverlay.style.display = "none";
            }
            
            // Definir cena inicial
            if (state.tour.scenes && state.tour.scenes.length > 0) {
                setActiveScene(state.tour.scenes[0].id);
            } else {
                document.getElementById("scene-display-title").textContent = "Nenhuma cena carregada";
            }
            
            renderScenesList();
            renderFloorplanSidebar();
            renderVisitorFloorplanWidget();
            updateSettingsSidebarUI();
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
                    scenes: state.tour.scenes,
                    floorPlan: state.tour.floorPlan,
                    logoUrl: state.tour.logoUrl,
                    privacySettings: state.tour.privacySettings
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
                if (!state.tour.logoUrl) state.tour.logoUrl = null;
                if (!state.tour.privacySettings) state.tour.privacySettings = null;
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
    
    // Configurar rotação inicial da cena (Yaw) e resetar orientação da câmera para 0 0 0
    const skyViewer = document.getElementById("sky-viewer");
    const videoViewer = document.getElementById("video-viewer");
    const initialYaw = parseFloat(scene.initialYaw || 0);
    if (skyViewer) skyViewer.setAttribute("rotation", `0 ${initialYaw} 0`);
    if (videoViewer) videoViewer.setAttribute("rotation", `0 ${initialYaw} 0`);

    const camera = document.getElementById("camera");
    if (camera) {
        camera.setAttribute("rotation", "0 0 0");
        const lookControls = camera.components['look-controls'];
        if (lookControls) {
            lookControls.pitchObject.rotation.x = 0;
            lookControls.yawObject.rotation.y = 0;
        }
    }
    
    // Exibir feedback de carregamento
    const sceneDisplayTitle = document.getElementById("scene-display-title");
    sceneDisplayTitle.textContent = `${scene.title} (${scene.type === 'video' ? 'Vídeo 360°' : 'Foto 360°'})`;

    // Atualizar no A-Frame
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

    // Renderizar os hotspots desta cena no espaço 3D e na barra lateral
    renderHotspots(scene.hotspots);
    renderHotspotsList();

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

    // Atualizar planta baixa do visitante
    renderVisitorFloorplanWidget();

    // --- Controle de Som Ambiente (Visão do Visitante/Editor) ---
    const btnToggleAudio = document.getElementById("btn-toggle-audio");
    if (btnToggleAudio) {
        if (scene.ambientSound) {
            btnToggleAudio.style.display = "block";
            
            // Pausar áudio anterior
            if (state.ambientAudio) {
                state.ambientAudio.pause();
                state.ambientAudio = null;
            }
            
            state.ambientAudio = new Audio(scene.ambientSound);
            state.ambientAudio.loop = true;
            state.ambientAudio.muted = state.isAudioMuted;
            
            if (!state.isAudioMuted) {
                state.ambientAudio.play().then(() => {
                    btnToggleAudio.querySelector("i").className = "fa-solid fa-volume-high";
                }).catch(err => {
                    console.log("Autoplay blocked by browser policy.", err);
                    btnToggleAudio.querySelector("i").className = "fa-solid fa-volume-xmark";
                    state.isAudioMuted = true;
                    state.ambientAudio.muted = true;
                });
            } else {
                btnToggleAudio.querySelector("i").className = "fa-solid fa-volume-xmark";
            }
        } else {
            btnToggleAudio.style.display = "none";
            if (state.ambientAudio) {
                state.ambientAudio.pause();
                state.ambientAudio = null;
            }
        }
    }

    // --- Controle de Galeria 2D (Visão do Visitante/Editor) ---
    const btnViewGallery = document.getElementById("btn-view-gallery");
    const galleryLightbox = document.getElementById("gallery-lightbox");
    if (btnViewGallery) {
        if (scene.galleryImages && scene.galleryImages.length > 0) {
            btnViewGallery.style.display = "block";
        } else {
            btnViewGallery.style.display = "none";
            if (galleryLightbox) galleryLightbox.style.display = "none";
        }
    }

    // Atualizar UI de configurações da cena ativa
    renderActiveSceneSettingsUI(scene);
    
    // Atualizar carrossel de navegação inferior
    renderScenesCarousel();
}

// --- FUNÇÕES DE CONTROLE DE BLOQUEIO DE CENA (SOFT LIMIT) ---
function isSceneLocked(index) {
    const maxAllowed = state.features && typeof state.features.max_scenes !== 'undefined' ? state.features.max_scenes : 10;
    if (maxAllowed === -1) return false;
    return index >= maxAllowed;
}

function openUpgradeModal(title, desc) {
    const modal = document.getElementById("scene-locked-modal");
    if (!modal) return;

    const maxAllowed = state.features && typeof state.features.max_scenes !== 'undefined' ? state.features.max_scenes : 10;
    const planName = (state.features && state.features.name) || "Grátis";
    
    const planNameEl = document.getElementById("locked-plan-name");
    const planLimitEl = document.getElementById("locked-plan-limit");
    if (planNameEl) planNameEl.textContent = planName;
    if (planLimitEl) planLimitEl.textContent = `${maxAllowed} cenas`;
    
    const titleEl = document.getElementById("locked-modal-title");
    if (titleEl) {
        titleEl.innerHTML = title;
    }

    const descEl = document.getElementById("locked-modal-desc");
    if (descEl) {
        descEl.innerHTML = desc;
    }

    modal.classList.add("active");
}

function openSceneLockedModal(scene, index) {
    const maxAllowed = state.features && typeof state.features.max_scenes !== 'undefined' ? state.features.max_scenes : 10;
    const title = `<i class="fa-solid fa-lock" style="color:#ff4444;"></i> ${scene ? scene.title : 'Cena'} (Bloqueada)`;
    const desc = `Seu plano atual (<span id="locked-plan-name" style="font-weight: bold; color: #00f2fe;">Grátis</span>) permite a navegação nas primeiras <span id="locked-plan-limit" style="font-weight: bold; color: #fff;">${maxAllowed} cenas</span> deste tour.<br><br>Esta foto 360° foi enviada e salva com sucesso, mas para torná-la navegável para você e seus visitantes, faça o upgrade da sua assinatura!`;
    openUpgradeModal(title, desc);
}

function closeSceneLockedModal() {
    const modal = document.getElementById("scene-locked-modal");
    if (modal) modal.classList.remove("active");
}

// --- RENDERIZAÇÃO DE HOTSPOTS NO ESPAÇO 3D ---
function renderHotspots(hotspotsList) {
    const container = document.getElementById("hotspots-container");
    if (!container) return;
    container.innerHTML = ""; // Limpa hotspots anteriores

    if (!hotspotsList || !Array.isArray(hotspotsList)) return;

    const isGratis = !!state.showAds;
    const defaultIconUrl = isGratis ? HOTSPOT_ICON_FREE : HOTSPOT_ICON_PREMIUM;

    hotspotsList.forEach(hotspot => {
        if (!hotspot || !hotspot.position) return;

        const isSelected = state.isEditMode && (state.selectedHotspotId === hotspot.id);
        const activeIconUrl = isSelected ? HOTSPOT_ICON_SELECTED : defaultIconUrl;

        const targetIndex = state.tour.scenes ? state.tour.scenes.findIndex(s => s.id === hotspot.targetSceneId) : -1;
        const isTargetLocked = targetIndex !== -1 && isSceneLocked(targetIndex);

        // Entidade A-Frame para o hotspot
        const entity = document.createElement("a-entity");
        entity.setAttribute("position", `${hotspot.position.x} ${hotspot.position.y} ${hotspot.position.z}`);
        entity.setAttribute("look-at", "#camera");
        entity.setAttribute("data-hotspot-id", hotspot.id);
        
        // Pulsação suave contínua
        const pulseScale = isSelected ? "1.15 1.15 1.15" : "1.06 1.06 1.06";
        const pulseDur = isSelected ? "700" : "1000";
        entity.setAttribute("animation__pulse", `property: scale; from: 1 1 1; to: ${pulseScale}; dir: alternate; loop: true; dur: ${pulseDur}; easing: easeInOutQuad`);
        
        // Anel externo pulsante (A-Ring) para visual moderno neon 3D
        const ring = document.createElement("a-ring");
        ring.setAttribute("class", "hotspot-element");
        ring.setAttribute("radius-inner", "0.46");
        ring.setAttribute("radius-outer", "0.52");
        ring.setAttribute("material", isSelected
            ? "color: #00f2fe; shader: flat; opacity: 0.95; transparent: true; depthTest: false"
            : (isTargetLocked
                ? "color: #ff4444; shader: flat; opacity: 0.75; transparent: true; depthTest: false"
                : (isGratis 
                    ? "color: #00f2fe; shader: flat; opacity: 0.7; transparent: true; depthTest: false"
                    : "color: #ffb703; shader: flat; opacity: 0.75; transparent: true; depthTest: false")));
        
        // Elemento visual do ícone principal (Plano circular)
        const icon = document.createElement("a-plane");
        icon.setAttribute("class", "hotspot-element");
        icon.setAttribute("src", activeIconUrl);
        icon.setAttribute("width", "0.92");
        icon.setAttribute("height", "0.92");
        icon.setAttribute("transparent", "true");
        icon.setAttribute("material", isTargetLocked 
            ? "shader: flat; depthTest: false; transparent: true; color: #ff6b6b" 
            : "shader: flat; depthTest: false; transparent: true");
        
        // Animação Hover no A-Frame
        icon.setAttribute("animation__mouseenter", "property: scale; to: 1.2 1.2 1.2; dur: 180; startEvents: mouseenter");
        icon.setAttribute("animation__mouseleave", "property: scale; to: 1 1 1; dur: 180; startEvents: mouseleave");

        const baseTitle = hotspot.label || getSceneTitle(hotspot.targetSceneId);
        const targetTitle = (isTargetLocked ? "🔒 " : (isSelected ? "🎯 " : "")) + baseTitle + (isTargetLocked ? " (Bloqueada)" : "");

        // Elemento de texto flutuante (Tooltip com fonte padrão legível)
        const text = document.createElement("a-text");
        text.setAttribute("value", targetTitle);
        text.setAttribute("align", "center");
        text.setAttribute("position", "0 0.72 0.02");
        text.setAttribute("width", "3.8");
        text.setAttribute("color", isSelected ? "#00f2fe" : (isTargetLocked ? "#ff6b6b" : "#ffffff"));
        text.setAttribute("font", "roboto");
        text.setAttribute("material", "depthTest: false; shader: flat");
        
        // Fundo translúcido arredondado do texto (Pill)
        const textLength = targetTitle.length;
        const textWidth = Math.max(1.8, (textLength * 0.11) + 0.5);
        const textBg = document.createElement("a-plane");
        textBg.setAttribute("class", "hotspot-element");
        textBg.setAttribute("color", isSelected ? "#091a2e" : (isTargetLocked ? "#20080d" : "#0d111a"));
        textBg.setAttribute("width", textWidth);
        textBg.setAttribute("height", "0.36");
        textBg.setAttribute("position", "0 0.72 0.01");
        textBg.setAttribute("opacity", isSelected ? "0.95" : "0.85");
        textBg.setAttribute("transparent", "true");
        textBg.setAttribute("material", "shader: flat; depthTest: false");

        // Evento de clique
        const handlePortalClick = (evt) => {
            if (evt) evt.stopPropagation();

            // Se estiver no modo de edição: seleciona, enquadra e foca no menu lateral
            if (state.isEditMode) {
                selectHotspot(hotspot.id);
                lookAtHotspot(hotspot.id);
                openToolTab('hotspots');
                showToast(`Portal "${hotspot.label}" selecionado para edição.`, "info");
                return;
            }

            // Modo visualização / navegação
            if (isTargetLocked) {
                const targetScene = state.tour.scenes[targetIndex];
                openSceneLockedModal(targetScene, targetIndex);
                return;
            }
            
            // Feedback de clique: encolhe temporariamente
            icon.setAttribute("scale", "0.75 0.75 0.75");
            
            setTimeout(() => {
                icon.setAttribute("scale", "1 1 1");
                triggerSceneTransition(() => {
                    setActiveScene(hotspot.targetSceneId);
                    showToast(`Navegando para: ${getSceneTitle(hotspot.targetSceneId)}`, "info");
                });
            }, 120);
        };

        icon.addEventListener("click", handlePortalClick);
        textBg.addEventListener("click", handlePortalClick);
        text.addEventListener("click", handlePortalClick);
        ring.addEventListener("click", handlePortalClick);

        // Monta a estrutura da entidade
        entity.appendChild(ring);
        entity.appendChild(icon);
        entity.appendChild(textBg);
        entity.appendChild(text);
        
        container.appendChild(entity);
    });
}

// --- FUNÇÃO DE ENQUADRAMENTO / ROTAÇÃO SUAVE DA CÂMERA (LOOK-AT HOTSPOT) ---
function smoothRotateCamera(targetYaw, targetPitch, duration = 400) {
    const camera = document.getElementById("camera");
    if (!camera || !camera.components['look-controls']) return;
    
    const lc = camera.components['look-controls'];
    if (!lc.yawObject || !lc.pitchObject) return;

    const startYaw = lc.yawObject.rotation.y;
    const startPitch = lc.pitchObject.rotation.x;
    
    // Normalizar a menor diferença angular para Yaw
    let diffYaw = (targetYaw - startYaw) % (Math.PI * 2);
    if (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
    if (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
    
    const diffPitch = targetPitch - startPitch;
    const startTime = performance.now();
    
    function animate(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        // Easing suave (easeInOutCubic)
        const ease = progress < 0.5 
            ? 4 * progress * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            
        lc.yawObject.rotation.y = startYaw + diffYaw * ease;
        lc.pitchObject.rotation.x = startPitch + diffPitch * ease;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    requestAnimationFrame(animate);
}

function lookAtHotspot(hotspotId) {
    const currentScene = state.tour.scenes.find(s => s.id === state.activeSceneId);
    if (!currentScene || !currentScene.hotspots) return;

    const hotspot = currentScene.hotspots.find(h => h.id === hotspotId);
    if (!hotspot || !hotspot.position) return;

    const { x, y, z } = hotspot.position;
    const distXZ = Math.sqrt(x * x + z * z);
    
    // Cálculo dos ângulos esféricos para a orientação da câmera A-Frame
    const targetYaw = Math.atan2(-x, -z);
    const targetPitch = Math.atan2(y, distXZ);

    smoothRotateCamera(targetYaw, targetPitch, 450);
}

// --- FUNÇÃO DE SELEÇÃO E CONTROLE DE HOTSPOTS ---
function selectHotspot(hotspotId) {
    state.selectedHotspotId = hotspotId;
    state.isRepositioningHotspot = false;
    
    const currentScene = state.tour.scenes.find(s => s.id === state.activeSceneId);
    if (currentScene) {
        renderHotspots(currentScene.hotspots);
        renderHotspotsList();
    }
}

function toggleRepositionHotspot(hotspotId) {
    if (state.selectedHotspotId !== hotspotId) {
        selectHotspot(hotspotId);
    }
    
    state.isRepositioningHotspot = !state.isRepositioningHotspot;
    
    renderHotspotsList();
    
    if (state.isRepositioningHotspot) {
        lookAtHotspot(hotspotId);
        showToast("Modo Mover Ativo: Clique no novo ponto na foto 360° para reposicionar o portal.", "info");
    } else {
        showToast("Modo de reposicionamento cancelado.", "info");
    }
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

// --- NAVEGAÇÃO ENTRE CENAS (CARROSSEL E BOTÕES) ---
function goToNextScene() {
    if (!state.tour || !state.tour.scenes || state.tour.scenes.length <= 1) return;
    const currentIdx = state.tour.scenes.findIndex(s => s.id === state.activeSceneId);
    const nextIdx = (currentIdx + 1) % state.tour.scenes.length;
    if (isSceneLocked(nextIdx)) {
        openSceneLockedModal(state.tour.scenes[nextIdx], nextIdx);
        return;
    }
    triggerSceneTransition(() => {
        setActiveScene(state.tour.scenes[nextIdx].id);
    });
}

function goToPrevScene() {
    if (!state.tour || !state.tour.scenes || state.tour.scenes.length <= 1) return;
    const currentIdx = state.tour.scenes.findIndex(s => s.id === state.activeSceneId);
    const prevIdx = (currentIdx - 1 + state.tour.scenes.length) % state.tour.scenes.length;
    if (isSceneLocked(prevIdx)) {
        openSceneLockedModal(state.tour.scenes[prevIdx], prevIdx);
        return;
    }
    triggerSceneTransition(() => {
        setActiveScene(state.tour.scenes[prevIdx].id);
    });
}

// --- ROLAGEM DO CARROSSEL DE CENAS ---
function scrollCarousel(direction) {
    const track = document.getElementById("scenes-carousel-track");
    if (!track) return;
    const scrollAmount = 200;
    if (direction === "next") {
        track.scrollBy({ left: scrollAmount, behavior: "smooth" });
    } else {
        track.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    }
}

function renderScenesCarousel() {
    const track = document.getElementById("scenes-carousel-track");
    const bar = document.getElementById("scenes-navigation-bar");
    if (!track || !bar) return;

    if (!state.tour || !state.tour.scenes || state.tour.scenes.length === 0) {
        bar.style.display = "none";
        return;
    }

    bar.style.display = "flex";
    track.innerHTML = "";

    let activeThumbEl = null;

    state.tour.scenes.forEach((scene, index) => {
        const locked = isSceneLocked(index);
        const thumb = document.createElement("div");
        thumb.className = `scene-nav-thumb ${scene.id === state.activeSceneId ? 'active' : ''} ${locked ? 'locked' : ''}`;
        thumb.title = `${index + 1}. ${scene.title}${locked ? ' (Bloqueada pelo plano)' : ''}`;
        
        let imgHtml = "";
        if (scene.type === "image") {
            imgHtml = `<img src="${scene.sourceUrl}" alt="${scene.title}" onerror="this.style.display='none'">`;
        } else {
            imgHtml = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#00f2fe;"><i class="fa-solid fa-video"></i></div>`;
        }

        const lockOverlay = locked ? `<div class="thumb-locked-overlay"><i class="fa-solid fa-lock"></i></div>` : '';

        thumb.innerHTML = `
            ${imgHtml}
            ${lockOverlay}
            <div class="thumb-title-tooltip">${locked ? '🔒 ' : ''}${scene.title}</div>
        `;

        thumb.onclick = () => {
            if (locked) {
                openSceneLockedModal(scene, index);
                return;
            }
            if (scene.id !== state.activeSceneId) {
                triggerSceneTransition(() => {
                    setActiveScene(scene.id);
                });
            }
        };

        if (scene.id === state.activeSceneId) {
            activeThumbEl = thumb;
        }

        track.appendChild(thumb);
    });

    // Centraliza o thumbnail ativo no carrossel
    if (activeThumbEl) {
        setTimeout(() => {
            activeThumbEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 100);
    }
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

    // Nome do Tour com debounce para evitar spam de requisições no servidor
    tourTitleInput.addEventListener("input", debounce((e) => {
        state.tour.title = e.target.value;
        document.getElementById("tour-display-title").textContent = e.target.value;
        saveTourToStorage();
    }, 500));

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

    // Controles de Navegação Inferior de Cenas
    const btnPrevScene = document.getElementById("btn-prev-scene");
    const btnNextScene = document.getElementById("btn-next-scene");
    const btnToggleSceneStrip = document.getElementById("btn-toggle-scene-strip");

    if (btnPrevScene) btnPrevScene.addEventListener("click", () => scrollCarousel("prev"));
    if (btnNextScene) btnNextScene.addEventListener("click", () => scrollCarousel("next"));
    if (btnToggleSceneStrip) {
        btnToggleSceneStrip.addEventListener("click", () => {
            const bar = document.getElementById("scenes-navigation-bar");
            if (bar) bar.classList.toggle("collapsed");
        });
    }

    // Teclas de atalho para navegar entre cenas (Setas Direita e Esquerda)
    window.addEventListener("keydown", (e) => {
        if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
        if (e.key === "ArrowLeft") {
            goToPrevScene();
        } else if (e.key === "ArrowRight") {
            goToNextScene();
        }
    });

    // Modals & Hotspot Form
    document.getElementById("btn-close-modal").addEventListener("click", closeHotspotModal);
    document.getElementById("btn-cancel-hotspot").addEventListener("click", closeHotspotModal);
    document.getElementById("btn-save-hotspot").addEventListener("click", saveHotspot);
    
    // Modal de Bloqueio por Limite do Plano
    const btnCloseLocked = document.getElementById("btn-close-locked-modal");
    if (btnCloseLocked) btnCloseLocked.addEventListener("click", closeSceneLockedModal);

    // Exportação
    btnExport.addEventListener("click", exportTourJSON);

    // Validador de tecla Enter dentro de caixas de texto de modais (simula o clique do botão Ok/Salvar)
    document.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const activeInput = document.activeElement;
            if (activeInput && (activeInput.tagName === "INPUT" || activeInput.tagName === "SELECT")) {
                const modal = activeInput.closest(".modal-overlay.active");
                if (modal) {
                    e.preventDefault();
                    let btn = null;
                    if (modal.id === "hotspot-modal") {
                        btn = document.getElementById("btn-save-hotspot");
                    }
                    if (btn) btn.click();
                }
            }
        }
    });

    // --- Configurações do Tour (Logo & Privacidade) ---
    const logoUploadZone = document.getElementById("logo-upload-zone");
    const logoFileInput = document.getElementById("logo-file-input");
    const btnDeleteLogo = document.getElementById("btn-delete-logo");
    const selectPrivacy = document.getElementById("select-privacy");
    const inputPrivacyPassword = document.getElementById("input-privacy-password");
    const passwordInputWrapper = document.getElementById("password-input-wrapper");

    if (logoUploadZone && logoFileInput) {
        logoUploadZone.addEventListener("click", () => logoFileInput.click());
        logoFileInput.addEventListener("change", async (e) => {
            if (e.target.files && e.target.files.length > 0) {
                const allowedLogoTypes = ["image/png", "image/webp", "image/avif", "image/jpeg"];
                if (!allowedLogoTypes.includes(file.type)) {
                    showToast("Por favor, selecione imagens em formato PNG, WEBP, AVIF ou JPG.", "error");
                    return;
                }
                
                showToast("Fazendo upload da logo...", "info");
                const uploadResult = await uploadFileToServer(file, file.name);
                if (uploadResult && uploadResult.url) {
                    state.tour.logoUrl = uploadResult.url;
                    updateSettingsSidebarUI();
                    saveTourToStorage();
                    showToast("Logo carregada com sucesso!", "success");
                } else {
                    showToast("Erro ao fazer upload da logo.", "error");
                }
            }
        });
    }

    if (btnDeleteLogo) {
        btnDeleteLogo.addEventListener("click", () => {
            state.tour.logoUrl = null;
            updateSettingsSidebarUI();
            saveTourToStorage();
            showToast("Logo removida.", "info");
        });
    }

    if (selectPrivacy) {
        selectPrivacy.addEventListener("change", (e) => {
            const val = e.target.value;
            if (val === "password") {
                if (passwordInputWrapper) passwordInputWrapper.style.display = "block";
                if (inputPrivacyPassword) {
                    inputPrivacyPassword.focus();
                    state.tour.privacySettings = inputPrivacyPassword.value;
                }
            } else {
                if (passwordInputWrapper) passwordInputWrapper.style.display = "none";
                state.tour.privacySettings = null;
                saveTourToStorage();
            }
        });
    }

    if (inputPrivacyPassword) {
        inputPrivacyPassword.addEventListener("change", (e) => {
            state.tour.privacySettings = e.target.value.trim() || null;
            saveTourToStorage();
            showToast("Privacidade atualizada!", "success");
        });
    }

    // --- Ações da Tela de Bloqueio ---
    const btnUnlockTour = document.getElementById("btn-unlock-tour");
    const visitorPasswordInput = document.getElementById("visitor-password-input");
    
    const unlockFunction = async () => {
        const pass = visitorPasswordInput.value.trim();
        if (!pass) {
            showToast("Por favor, digite a senha.", "warning");
            return;
        }
        
        showToast("Validando senha...", "info");
        try {
            const res = await fetch(`api/get_tour.php?id=${state.tour.tourId}&password=${encodeURIComponent(pass)}`);
            const data = await res.json();
            
            if (res.ok && data.success) {
                if (data.is_locked) {
                    document.getElementById("unlock-error-msg").style.display = "block";
                    showToast("Senha incorreta.", "error");
                } else {
                    // Senha correta: carregar dados do tour e destravar
                    document.getElementById("unlock-error-msg").style.display = "none";
                    document.getElementById("password-lock-screen").style.display = "none";
                    
                    state.tour = data.tour;
                    state.isOwner = data.is_owner;
                    state.showAds = !!data.show_ads;
                    state.features = data.features || {};
                    
                    // Configurar títulos na tela
                    document.getElementById("tour-title-input").value = state.tour.title;
                    document.getElementById("tour-display-title").textContent = state.tour.title;
                    
                    // Exibir/ocultar anúncios e watermark
                    const watermark = document.getElementById("promotional-watermark");
                    const adsOverlay = document.getElementById("google-ads-overlay");
                    if (state.showAds) {
                        if (watermark) watermark.style.display = "block";
                        if (adsOverlay) adsOverlay.style.display = "flex";
                        startAdsTimer();
                    } else {
                        if (watermark) watermark.style.display = "none";
                        if (adsOverlay) adsOverlay.style.display = "none";
                    }
                    
                    // Definir cena inicial
                    if (state.tour.scenes && state.tour.scenes.length > 0) {
                        setActiveScene(state.tour.scenes[0].id);
                    } else {
                        document.getElementById("scene-display-title").textContent = "Nenhuma cena carregada";
                    }
                    
                    renderScenesList();
                    renderFloorplanSidebar();
                    renderVisitorFloorplanWidget();
                    updateSettingsSidebarUI();
                    updateUI();
                    showToast("Acesso concedido!", "success");
                }
            } else {
                showToast(data.message || "Erro ao validar senha.", "error");
            }
        } catch (err) {
            console.error(err);
            showToast("Erro de rede ao validar senha.", "error");
        }
    };

    if (btnUnlockTour) {
        btnUnlockTour.addEventListener("click", unlockFunction);
    }
    if (visitorPasswordInput) {
        visitorPasswordInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                unlockFunction();
            }
        });
    }

    // --- Controle de Áudio Flutuante ---
    const btnToggleAudio = document.getElementById("btn-toggle-audio");
    if (btnToggleAudio) {
        btnToggleAudio.addEventListener("click", () => {
            if (!state.ambientAudio) return;
            
            if (state.isAudioMuted) {
                state.isAudioMuted = false;
                state.ambientAudio.muted = false;
                state.ambientAudio.play().then(() => {
                    btnToggleAudio.querySelector("i").className = "fa-solid fa-volume-high";
                    btnToggleAudio.title = "Mudar/Desativar Som";
                }).catch(err => {
                    console.error("Autoplay blocked:", err);
                    showToast("Por favor, interaja com o site antes de tocar áudios.", "warning");
                });
            } else {
                state.isAudioMuted = true;
                state.ambientAudio.muted = true;
                state.ambientAudio.pause();
                btnToggleAudio.querySelector("i").className = "fa-solid fa-volume-xmark";
                btnToggleAudio.title = "Ativar Som";
            }
        });
    }

    // --- Configurações da Cena Ativa ---
    const inputSceneTitle = document.getElementById("input-scene-title");
    const audioUploadZone = document.getElementById("audio-upload-zone");
    const audioFileInput = document.getElementById("audio-file-input");
    const btnDeleteAudio = document.getElementById("btn-delete-audio");
    const galleryUploadZone = document.getElementById("gallery-upload-zone");
    const galleryFileInput = document.getElementById("gallery-file-input");

    if (inputSceneTitle) {
        inputSceneTitle.addEventListener("input", debounce((e) => {
            if (!state.activeSceneId) return;
            const scene = state.tour.scenes.find(s => s.id === state.activeSceneId);
            if (scene) {
                scene.title = e.target.value;
                document.getElementById("scene-display-title").textContent = `${scene.title} (${scene.type === 'video' ? 'Vídeo 360°' : 'Foto 360°'})`;
                renderScenesList();
                saveTourToStorage();
            }
        }, 500));
    }

    const inputInitialYaw = document.getElementById("input-initial-yaw");
    const btnSetInitialYaw = document.getElementById("btn-set-initial-yaw");

    if (inputInitialYaw) {
        inputInitialYaw.addEventListener("input", (e) => {
            if (!state.activeSceneId) return;
            const isPaid = state.features && state.features.name && state.features.name !== "Grátis";
            const scene = state.tour.scenes.find(s => s.id === state.activeSceneId);
            if (!isPaid) {
                inputInitialYaw.value = Math.round(scene ? (scene.initialYaw || 0) : 0);
                openUpgradeModal("<i class='fa-solid fa-crown' style='color:#ffaa00;'></i> Recurso Exclusivo PRO", "A definição da <strong>Posição Inicial da Imagem (Ângulo de Início)</strong> é um recurso premium disponível nos planos pagos. Faça o upgrade agora para personalizar a orientação inicial de suas cenas!");
                return;
            }
            if (scene) {
                const val = parseFloat(e.target.value || 0);
                scene.initialYaw = val;
                
                const skyViewer = document.getElementById("sky-viewer");
                const videoViewer = document.getElementById("video-viewer");
                if (skyViewer) skyViewer.setAttribute("rotation", `0 ${val} 0`);
                if (videoViewer) videoViewer.setAttribute("rotation", `0 ${val} 0`);

                saveTourToStorage();
            }
        });
    }

    if (btnSetInitialYaw) {
        btnSetInitialYaw.addEventListener("click", () => {
            if (!state.activeSceneId) return;
            const isPaid = state.features && state.features.name && state.features.name !== "Grátis";
            if (!isPaid) {
                openUpgradeModal("<i class='fa-solid fa-crown' style='color:#ffaa00;'></i> Recurso Exclusivo PRO", "A definição da <strong>Posição Inicial da Imagem (Ângulo de Início)</strong> é um recurso premium disponível nos planos pagos. Faça o upgrade agora para personalizar a orientação inicial de suas cenas!");
                return;
            }
            const scene = state.tour.scenes.find(s => s.id === state.activeSceneId);
            if (scene) {
                const currentYaw = state.activeYawAngle || 0;
                scene.initialYaw = currentYaw;
                
                if (inputInitialYaw) {
                    inputInitialYaw.value = Math.round(currentYaw);
                }

                const skyViewer = document.getElementById("sky-viewer");
                const videoViewer = document.getElementById("video-viewer");
                if (skyViewer) skyViewer.setAttribute("rotation", `0 ${currentYaw} 0`);
                if (videoViewer) videoViewer.setAttribute("rotation", `0 ${currentYaw} 0`);

                saveTourToStorage();
                showToast(`Ângulo inicial definido para ${Math.round(currentYaw)}° com sucesso!`, "success");
            }
        });
    }

    if (audioUploadZone && audioFileInput) {
        audioUploadZone.addEventListener("click", () => audioFileInput.click());
        audioFileInput.addEventListener("change", async (e) => {
            if (!state.activeSceneId) return;
            const scene = state.tour.scenes.find(s => s.id === state.activeSceneId);
            if (!scene) return;

            if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                if (file.type !== "audio/mpeg" && file.type !== "audio/mp3") {
                    showToast("Por favor, selecione apenas arquivos de áudio em formato MP3.", "error");
                    return;
                }
                
                showToast("Enviando áudio MP3...", "info");
                const uploadResult = await uploadFileToServer(file, file.name);
                if (uploadResult && uploadResult.url) {
                    scene.ambientSound = uploadResult.url;
                    
                    // Resetar e aplicar novo som se for a cena ativa atual
                    if (state.ambientAudio) {
                        state.ambientAudio.pause();
                        state.ambientAudio = null;
                    }
                    state.ambientAudio = new Audio(scene.ambientSound);
                    state.ambientAudio.loop = true;
                    state.ambientAudio.muted = state.isAudioMuted;
                    
                    renderActiveSceneSettingsUI(scene);
                    saveTourToStorage();
                    showToast("Áudio ambiente salvo na cena!", "success");
                } else {
                    showToast("Erro ao fazer upload do áudio.", "error");
                }
            }
        });
    }

    if (btnDeleteAudio) {
        btnDeleteAudio.addEventListener("click", () => {
            if (!state.activeSceneId) return;
            const scene = state.tour.scenes.find(s => s.id === state.activeSceneId);
            if (scene) {
                scene.ambientSound = null;
                if (state.ambientAudio) {
                    state.ambientAudio.pause();
                    state.ambientAudio = null;
                }
                renderActiveSceneSettingsUI(scene);
                saveTourToStorage();
                showToast("Áudio ambiente removido.", "info");
            }
        });
    }

    if (galleryUploadZone && galleryFileInput) {
        galleryUploadZone.addEventListener("click", () => galleryFileInput.click());
        galleryFileInput.addEventListener("change", async (e) => {
            if (!state.activeSceneId) return;
            const scene = state.tour.scenes.find(s => s.id === state.activeSceneId);
            if (!scene) return;

            if (e.target.files && e.target.files.length > 0) {
                showToast("Fazendo upload das imagens da galeria...", "info");
                if (!scene.galleryImages) scene.galleryImages = [];

                for (let i = 0; i < e.target.files.length; i++) {
                    const file = e.target.files[i];
                    const uploadResult = await uploadFileToServer(file, file.name);
                    if (uploadResult && uploadResult.url) {
                        scene.galleryImages.push(uploadResult.url);
                    }
                }
                renderActiveSceneSettingsUI(scene);
                saveTourToStorage();
                showToast("Imagens adicionadas à galeria da cena!", "success");
            }
        });
    }

    // --- Controle de Galeria Lightbox (Modo Visitante) ---
    const btnViewGallery = document.getElementById("btn-view-gallery");
    const galleryLightbox = document.getElementById("gallery-lightbox");
    const galleryLightboxImg = document.getElementById("gallery-lightbox-img");
    const galleryLightboxCaption = document.getElementById("gallery-lightbox-caption");
    const btnPrevGalleryImg = document.getElementById("btn-prev-gallery-img");
    const btnNextGalleryImg = document.getElementById("btn-next-gallery-img");

    let currentGalleryIdx = 0;

    const renderLightboxImage = () => {
        if (!state.activeSceneId) return;
        const scene = state.tour.scenes.find(s => s.id === state.activeSceneId);
        if (scene && scene.galleryImages && scene.galleryImages.length > 0) {
            const url = scene.galleryImages[currentGalleryIdx];
            if (galleryLightboxImg) galleryLightboxImg.src = url;
            if (galleryLightboxCaption) {
                galleryLightboxCaption.textContent = `Foto ${currentGalleryIdx + 1} de ${scene.galleryImages.length}`;
            }
        }
    };

    if (btnViewGallery) {
        btnViewGallery.addEventListener("click", () => {
            if (!state.activeSceneId) return;
            const scene = state.tour.scenes.find(s => s.id === state.activeSceneId);
            if (scene && scene.galleryImages && scene.galleryImages.length > 0) {
                currentGalleryIdx = 0;
                renderLightboxImage();
                if (galleryLightbox) galleryLightbox.style.display = "flex";
            }
        });
    }

    if (btnPrevGalleryImg) {
        btnPrevGalleryImg.addEventListener("click", () => {
            if (!state.activeSceneId) return;
            const scene = state.tour.scenes.find(s => s.id === state.activeSceneId);
            if (scene && scene.galleryImages && scene.galleryImages.length > 0) {
                currentGalleryIdx = (currentGalleryIdx - 1 + scene.galleryImages.length) % scene.galleryImages.length;
                renderLightboxImage();
            }
        });
    }

    if (btnNextGalleryImg) {
        btnNextGalleryImg.addEventListener("click", () => {
            if (!state.activeSceneId) return;
            const scene = state.tour.scenes.find(s => s.id === state.activeSceneId);
            if (scene && scene.galleryImages && scene.galleryImages.length > 0) {
                currentGalleryIdx = (currentGalleryIdx + 1) % scene.galleryImages.length;
                renderLightboxImage();
            }
        });
    }

    // --- Controle de Colapso / Expansão da Barra Lateral ---
    const btnCollapseSidebar = document.getElementById("btn-collapse-sidebar");
    const btnToggleSidebar = document.getElementById("btn-toggle-sidebar");
    
    if (btnCollapseSidebar) {
        btnCollapseSidebar.addEventListener("click", () => {
            toggleSidebar(false);
        });
    }

    if (btnToggleSidebar) {
        btnToggleSidebar.addEventListener("click", () => {
            toggleSidebar();
        });
    }

    // Atalho de Teclado (Shift + S para alternar painel)
    window.addEventListener("keydown", (e) => {
        if (e.shiftKey && (e.key === "S" || e.key === "s")) {
            if (!["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
                e.preventDefault();
                toggleSidebar();
            }
        }
    });

    // Restaurar estado anterior salvo no navegador
    const savedCollapsed = localStorage.getItem("sidebar_collapsed");
    if (savedCollapsed === "true") {
        const sidebar = document.getElementById("sidebar");
        if (sidebar) sidebar.classList.add("collapsed");
    }
}

// --- SISTEMA MODULAR DE FERRAMENTAS (RAIL + DRAWER) ---
function openToolTab(tabName) {
    const drawer = document.getElementById("editor-drawer");
    if (!drawer) return;

    const railBtns = document.querySelectorAll(".tool-rail-btn[data-tab]");
    const panes = document.querySelectorAll(".drawer-pane");
    const drawerTitle = document.getElementById("drawer-active-title");

    const titles = {
        'scenes': '<i class="fa-solid fa-layer-group"></i> Cenas do Tour',
        'upload': '<i class="fa-solid fa-cloud-arrow-up"></i> Carregar Mídia 360°',
        'hotspots': '<i class="fa-solid fa-location-dot"></i> Portais de Navegação',
        'floorplan': '<i class="fa-solid fa-map"></i> Planta Baixa',
        'media': '<i class="fa-solid fa-photo-film"></i> Som & Galeria 2D',
        'settings': '<i class="fa-solid fa-sliders"></i> Ajustes do Tour'
    };

    // Se o drawer já está aberto nesta mesma aba, recolhe/colapsa!
    if (drawer.classList.contains("open") && drawer.dataset.activeTab === tabName) {
        closeToolDrawer();
        return;
    }

    // Abre o painel drawer
    drawer.classList.add("open");
    drawer.dataset.activeTab = tabName;
    if (drawerTitle) drawerTitle.innerHTML = titles[tabName] || 'Ferramentas';

    // Atualiza botões da barra vertical
    railBtns.forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    // Exibe apenas o painel selecionado
    panes.forEach(pane => {
        if (pane.id === `pane-${tabName}`) {
            pane.style.display = "block";
        } else {
            pane.style.display = "none";
        }
    });

    localStorage.setItem("editor_active_tab", tabName);
    localStorage.setItem("editor_drawer_open", "true");

    // Redimensionamento suave do A-Frame Three.js
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 320);
}

function closeToolDrawer() {
    const drawer = document.getElementById("editor-drawer");
    if (!drawer) return;

    drawer.classList.remove("open");
    drawer.dataset.activeTab = "";

    document.querySelectorAll(".tool-rail-btn[data-tab]").forEach(btn => {
        btn.classList.remove("active");
    });

    localStorage.setItem("editor_drawer_open", "false");

    showToast("Painel recolhido.", "info");

    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 320);
}

function toggleSidebar() {
    const drawer = document.getElementById("editor-drawer");
    if (!drawer) return;

    if (drawer.classList.contains("open")) {
        closeToolDrawer();
    } else {
        const lastTab = localStorage.getItem("editor_active_tab") || "scenes";
        openToolTab(lastTab);
    }
}

// Vinculação Global
window.openToolTab = openToolTab;
window.closeToolDrawer = closeToolDrawer;
window.toggleSidebar = toggleSidebar;

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

function uploadFileToServer(fileOrBlob, filename) {
    return new Promise((resolve) => {
        const formData = new FormData();
        formData.append('file', fileOrBlob, filename);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'api/upload.php', true);

        const progressContainer = document.getElementById('upload-progress-container');
        const filenameEl = document.getElementById('upload-filename');
        const percentageEl = document.getElementById('upload-percentage');
        const progressBar = document.getElementById('upload-progress-bar');

        // Exibir barra de progresso
        if (progressContainer) {
            progressContainer.style.display = 'block';
            filenameEl.textContent = `Enviando "${filename}"...`;
            percentageEl.textContent = '0%';
            progressBar.style.width = '0%';
        }

        xhr.upload.onprogress = function (e) {
            if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                if (percentageEl) percentageEl.textContent = `${percentComplete}%`;
                if (progressBar) progressBar.style.width = `${percentComplete}%`;
            }
        };

        xhr.onload = function () {
            // Ocultar barra de progresso após um pequeno delay para suavidade
            setTimeout(() => {
                if (progressContainer) progressContainer.style.display = 'none';
            }, 800);

            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    if (data.success) {
                        resolve(data.url);
                    } else {
                        showToast("Falha no upload: " + (data.message || ""), "error");
                        resolve(null);
                    }
                } catch (err) {
                    console.error("Erro ao decodificar resposta JSON:", err);
                    showToast("Resposta inválida do servidor.", "error");
                    resolve(null);
                }
            } else {
                try {
                    const data = JSON.parse(xhr.responseText);
                    showToast("Falha no upload: " + (data.message || xhr.statusText), "error");
                } catch (e) {
                    showToast("Erro no servidor: " + xhr.statusText, "error");
                }
                resolve(null);
            }
        };

        xhr.onerror = function () {
            if (progressContainer) progressContainer.style.display = 'none';
            showToast("Erro de rede ao enviar arquivo.", "error");
            resolve(null);
        };

        xhr.send(formData);
    });
}

// --- TRATAMENTO DOS ARQUIVOS DE UPLOAD ---
async function handleFiles(files) {
    if (!files || files.length === 0) return;

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
            const origExt = (res.file && res.file.name ? res.file.name.split('.').pop() : '') || 'jpg';
            const extension = res.type === 'video' ? 'mp4' : (res.blob ? 'jpg' : origExt.toLowerCase());
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

    // Limpar o input de arquivo
    const fileInput = document.getElementById("file-input");
    if (fileInput) fileInput.value = "";

    if (loadedCount > 0) {
        await saveTourToStorage();
        renderScenesList();
        updateUI();
        
        const maxAllowed = state.features && typeof state.features.max_scenes !== 'undefined' ? state.features.max_scenes : 10;
        const totalCount = state.tour.scenes.length;

        if (maxAllowed !== -1 && totalCount > maxAllowed) {
            showToast(`${loadedCount} mídia(s) adicionada(s)! As ${maxAllowed} primeiras estão ativas. As restantes estão salvas e bloqueadas pelo plano.`, "info");
            // Se a cena ativa atual estiver bloqueada ou não existir, ativa a primeira liberada
            const currentIdx = state.tour.scenes.findIndex(s => s.id === state.activeSceneId);
            if (currentIdx === -1 || isSceneLocked(currentIdx)) {
                setActiveScene(state.tour.scenes[0].id);
            }
        } else {
            // Ativa a última cena carregada se estiver dentro do limite
            if (lastLoadedId) {
                setActiveScene(lastLoadedId);
            }
            showToast(`${loadedCount} mídia(s) 360° carregada(s) e salvas com sucesso!`, "success");
        }
    }
}

// --- RENDERIZAÇÃO DA BARRA LATERAL ---
function renderScenesList() {
    const list = document.getElementById("scenes-list");
    if (!list) return;
    list.innerHTML = "";

    const countEl = document.getElementById("scenes-count");
    if (countEl) countEl.textContent = state.tour.scenes.length;

    state.tour.scenes.forEach((scene, index) => {
        const locked = isSceneLocked(index);
        const card = document.createElement("div");
        card.className = `scene-card ${scene.id === state.activeSceneId ? 'active' : ''} ${locked ? 'locked' : ''}`;
        card.dataset.id = scene.id;

        // Marcador de cena inicial
        const isStart = index === 0;

        // Miniatura
        let thumbContent = "";
        if (scene.type === "image") {
            thumbContent = `<img src="${scene.sourceUrl}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">`;
        }
        
        const lockedThumbOverlay = locked ? `<div class="locked-overlay"><i class="fa-solid fa-lock"></i></div>` : '';
        const lockedBadge = locked ? `<span class="badge-locked"><i class="fa-solid fa-lock"></i> Bloqueada</span>` : '';

        card.innerHTML = `
            <div class="scene-thumb">
                ${thumbContent}
                ${lockedThumbOverlay}
                <i class="fa-solid ${scene.type === 'video' ? 'fa-video' : 'fa-image'}" style="${scene.type === 'image' && scene.sourceUrl.startsWith('blob') ? 'display: none;' : ''}"></i>
            </div>
            <div class="scene-info">
                <h4 class="scene-title">${locked ? '🔒 ' : ''}${scene.title}</h4>
                <div class="scene-meta">
                    <i class="fa-solid ${scene.type === 'video' ? 'fa-film' : 'fa-camera'}"></i>
                    <span>${scene.type === 'video' ? 'Vídeo 360°' : 'Foto 360°'}</span>
                </div>
                ${lockedBadge}
            </div>
            ${isStart && !locked ? '<span class="badge-start-scene">Início</span>' : ''}
            <div class="scene-actions">
                ${!isStart && !locked ? `<button class="action-icon-btn btn-star" title="Definir como Cena Inicial"><i class="fa-solid fa-star"></i></button>` : ''}
                <button class="action-icon-btn btn-delete" title="Excluir Cena"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;

        // Evento de clique para ativar a cena ou abrir modal de upgrade
        card.addEventListener("click", (e) => {
            if (e.target.closest(".scene-actions")) return;
            if (locked) {
                openSceneLockedModal(scene, index);
                return;
            }
            setActiveScene(scene.id);
        });

        // Ações do Card
        const btnDelete = card.querySelector(".btn-delete");
        if (btnDelete) {
            btnDelete.addEventListener("click", (e) => {
                e.stopPropagation();
                deleteScene(scene.id);
            });
        }

        const btnStar = card.querySelector(".btn-star");
        if (btnStar) {
            btnStar.addEventListener("click", (e) => {
                e.stopPropagation();
                setStartScene(scene.id);
            });
        }

        list.appendChild(card);
    });

    // Manter carrossel inferior sincronizado
    renderScenesCarousel();
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
                    renderHotspotsList();
                }
            } else if (state.activeSceneId) {
                // Atualiza hotspots da cena ativa atual caso algum tenha sido deletado
                const currentScene = state.tour.scenes.find(s => s.id === state.activeSceneId);
                renderHotspots(currentScene.hotspots);
                renderHotspotsList();
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

    // Atualiza a barra lateral com a lista de hotspots
    renderHotspotsList();
    
    // Atualiza visibilidade das configurações da cena ativa
    const activeScene = state.tour && state.tour.scenes ? state.tour.scenes.find(s => s.id === state.activeSceneId) : null;
    renderActiveSceneSettingsUI(activeScene);
}

// --- FLUXO DE ADICIONAR E EDITAR HOTSPOT (PORTAL) ---
function startAddingHotspot() {
    if (state.tour.scenes.length < 2) {
        showToast("Você precisa ter pelo menos 2 cenas carregadas para criar portais de passeio!", "error");
        return;
    }

    state.isAddingHotspot = true;
    state.isRepositioningHotspot = false;
    const btn = document.getElementById("btn-add-hotspot");
    if (btn) {
        btn.classList.add("active");
        btn.innerHTML = `<i class="fa-solid fa-times-circle"></i> <span>Cancelar</span>`;
    }
    
    showToast("Clique em qualquer lugar na cena 360° para fixar o portal.", "info");
}

function cancelAddingHotspot() {
    state.isAddingHotspot = false;
    state.isRepositioningHotspot = false;
    state.pendingHotspotPos = null;
    const btn = document.getElementById("btn-add-hotspot");
    if (btn) {
        btn.classList.remove("active");
        btn.innerHTML = `<i class="fa-solid fa-plus-circle animate-pulse"></i> <span>Adicionar Hotspot</span>`;
    }
}

function openHotspotModal(editingHotspotId = null) {
    const modal = document.getElementById("hotspot-modal");
    const select = document.getElementById("hotspot-target");
    const labelInput = document.getElementById("hotspot-label");
    const editingInput = document.getElementById("editing-hotspot-id");
    const titleEl = document.getElementById("hotspot-modal-title");
    const saveBtn = document.getElementById("btn-save-hotspot");
    
    if (!modal || !select || !labelInput) return;

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

    if (editingHotspotId) {
        // Modo Edição
        const currentScene = state.tour.scenes.find(s => s.id === state.activeSceneId);
        const hotspot = currentScene ? currentScene.hotspots.find(h => h.id === editingHotspotId) : null;
        
        if (editingInput) editingInput.value = editingHotspotId;
        if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Editar Portal de Navegação`;
        if (saveBtn) saveBtn.textContent = "Salvar Alterações";
        
        if (hotspot) {
            labelInput.value = hotspot.label || "";
            select.value = hotspot.targetSceneId || "";
        }
    } else {
        // Modo Criação
        if (editingInput) editingInput.value = "";
        if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-location-dot"></i> Configurar Hotspot / Portal`;
        if (saveBtn) saveBtn.textContent = "Criar Portal";
        labelInput.value = "";
    }

    modal.classList.add("active");
}

function closeHotspotModal() {
    const modal = document.getElementById("hotspot-modal");
    if (modal) modal.classList.remove("active");
    const editingInput = document.getElementById("editing-hotspot-id");
    if (editingInput) editingInput.value = "";
    cancelAddingHotspot();
}

function saveHotspot() {
    const label = document.getElementById("hotspot-label").value.trim();
    const targetSceneId = document.getElementById("hotspot-target").value;
    const editingHotspotId = document.getElementById("editing-hotspot-id") ? document.getElementById("editing-hotspot-id").value : "";

    if (!label) {
        showToast("Por favor, digite uma descrição para o portal.", "warning");
        return;
    }

    if (!targetSceneId) {
        showToast("Nenhuma cena selecionada para o destino.", "warning");
        return;
    }

    const currentScene = state.tour.scenes.find(s => s.id === state.activeSceneId);
    if (!currentScene) return;
    if (!currentScene.hotspots) currentScene.hotspots = [];

    if (editingHotspotId) {
        // Atualizar Hotspot Existente
        const hotspot = currentScene.hotspots.find(h => h.id === editingHotspotId);
        if (hotspot) {
            hotspot.label = label;
            hotspot.targetSceneId = targetSceneId;
            saveTourToStorage();
            renderHotspots(currentScene.hotspots);
            renderHotspotsList();
            closeHotspotModal();
            showToast("Portal atualizado com sucesso!", "success");
            return;
        }
    }

    // Criar Novo Hotspot
    const newHotspot = {
        id: "hotspot-" + Date.now(),
        type: "portal",
        targetSceneId: targetSceneId,
        position: state.pendingHotspotPos || { x: 0, y: 0, z: -5 },
        label: label
    };

    currentScene.hotspots.push(newHotspot);
    state.selectedHotspotId = newHotspot.id;
    
    saveTourToStorage();
    renderHotspots(currentScene.hotspots);
    renderHotspotsList();
    closeHotspotModal();
    showToast("Portal criado com sucesso!", "success");
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

// --- TIMER DE ANÚNCIOS OBRIGATÓRIO (PLANO GRÁTIS) ---
function startAdsTimer() {
    const adsOverlay = document.getElementById("google-ads-overlay");
    const countdownEl = document.getElementById("ads-countdown");
    const closeBtn = document.getElementById("close-ads-btn");
    const progressBar = document.getElementById("ads-progress-bar");
    
    if (!adsOverlay || adsOverlay.style.display === "none") return;
    
    // Configuração inicial: exibe o contador e esconde o botão de fechar
    if (countdownEl) {
        countdownEl.style.display = "inline-block";
        countdownEl.textContent = "10s";
    }
    if (closeBtn) {
        closeBtn.style.display = "none";
    }
    
    // Configura a barra de progresso para diminuir suavemente de 100% a 0%
    if (progressBar) {
        progressBar.style.transition = "none";
        progressBar.style.width = "100%";
        // Forçar reflow do navegador
        progressBar.offsetHeight;
        progressBar.style.transition = "width 10s linear";
        progressBar.style.width = "0%";
    }
    
    let secondsLeft = 10;
    
    // Limpar qualquer intervalo anterior ativo para evitar múltiplos contadores simultâneos
    if (window.adsIntervalId) {
        clearInterval(window.adsIntervalId);
    }
    
    window.adsIntervalId = setInterval(() => {
        secondsLeft--;
        if (countdownEl) {
            countdownEl.textContent = `${secondsLeft}s`;
        }
        
        if (secondsLeft <= 0) {
            clearInterval(window.adsIntervalId);
            window.adsIntervalId = null;
            if (countdownEl) {
                countdownEl.style.display = "none";
            }
            if (closeBtn) {
                closeBtn.style.display = "flex";
            }
        }
    }, 1000);
}

function updateUI() {
    const scenesCount = state.tour.scenes.length;
    const editorHint = document.getElementById("editor-hint");
    
    if (scenesCount === 0) {
        document.getElementById("scene-display-title").textContent = "Nenhuma cena carregada";
    }
}

// --- GERENCIADOR DE HOTSPOTS NA BARRA LATERAL ---
function renderHotspotsList() {
    const hotspotsSection = document.getElementById("hotspots-sidebar-section");
    const list = document.getElementById("hotspots-list");
    const countBadge = document.getElementById("hotspots-count");

    if (!hotspotsSection || !list || !countBadge) return;

    // Apenas exibe no modo edição e se houver cena ativa
    if (!state.isEditMode || !state.activeSceneId) {
        hotspotsSection.style.display = "none";
        return;
    }

    const currentScene = state.tour.scenes.find(s => s.id === state.activeSceneId);
    if (!currentScene) {
        hotspotsSection.style.display = "none";
        return;
    }

    const hotspots = currentScene.hotspots || [];
    countBadge.textContent = hotspots.length;

    if (hotspots.length === 0) {
        list.innerHTML = `<div style="text-align: center; color: var(--text-secondary); font-size: 11px; padding: 12px 0;">Nenhum portal criado nesta cena.</div>`;
        hotspotsSection.style.display = "flex";
        return;
    }

    list.innerHTML = "";
    hotspots.forEach(hotspot => {
        const isSelected = state.selectedHotspotId === hotspot.id;
        const isRepositioning = isSelected && state.isRepositioningHotspot;
        const card = document.createElement("div");
        card.className = `hotspot-card ${isSelected ? 'active' : ''}`;
        card.dataset.id = hotspot.id;

        const targetTitle = getSceneTitle(hotspot.targetSceneId);

        card.innerHTML = `
            <div class="hotspot-card-main">
                <div class="hotspot-card-info">
                    <div class="hotspot-card-header-row">
                        <i class="fa-solid fa-location-dot hotspot-card-icon"></i>
                        <span class="hotspot-card-label" title="${hotspot.label}">${hotspot.label}</span>
                        ${isSelected ? '<span class="hotspot-card-badge-active">Ativo</span>' : ''}
                    </div>
                    <span class="hotspot-card-target" title="Destino: ${targetTitle}">
                        <i class="fa-solid fa-arrow-right"></i> ${targetTitle}
                    </span>
                </div>
            </div>
            <div class="hotspot-card-actions">
                <button class="btn-hotspot-action btn-reposition ${isRepositioning ? 'repositioning-active' : ''}" title="Reposicionar / Mover no Espaço 360°">
                    <i class="fa-solid fa-crosshairs ${isRepositioning ? 'fa-spin' : ''}"></i>
                    <span>${isRepositioning ? 'Clique na Tela' : 'Reposicionar'}</span>
                </button>
                <button class="btn-hotspot-action btn-edit" title="Editar Nome ou Destino">
                    <i class="fa-solid fa-pen-to-square"></i>
                    <span>Editar</span>
                </button>
                <button class="btn-hotspot-action btn-delete" title="Excluir Portal">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;

        // Clique no card: Enquadra a câmera no hotspot e seleciona
        card.onclick = () => {
            selectHotspot(hotspot.id);
            lookAtHotspot(hotspot.id);
        };

        // Botão Reposicionar
        const btnReposition = card.querySelector(".btn-reposition");
        if (btnReposition) {
            btnReposition.onclick = (e) => {
                e.stopPropagation();
                toggleRepositionHotspot(hotspot.id);
            };
        }

        // Botão Editar
        const btnEdit = card.querySelector(".btn-edit");
        if (btnEdit) {
            btnEdit.onclick = (e) => {
                e.stopPropagation();
                selectHotspot(hotspot.id);
                lookAtHotspot(hotspot.id);
                openHotspotModal(hotspot.id);
            };
        }

        // Botão Excluir
        const btnDelete = card.querySelector(".btn-delete");
        if (btnDelete) {
            btnDelete.onclick = (e) => {
                e.stopPropagation();
                deleteHotspot(hotspot.id);
            };
        }

        list.appendChild(card);
    });

    hotspotsSection.style.display = "flex";
}

function deleteHotspot(hotspotId) {
    if (confirm("Deseja realmente excluir este portal?")) {
        const currentScene = state.tour.scenes.find(s => s.id === state.activeSceneId);
        if (currentScene && currentScene.hotspots) {
            currentScene.hotspots = currentScene.hotspots.filter(h => h.id !== hotspotId);

            if (state.selectedHotspotId === hotspotId) {
                state.selectedHotspotId = null;
                state.isRepositioningHotspot = false;
            }

            // Salvar no storage/banco
            saveTourToStorage();

            // Re-renderizar hotspots 3D e sidebar
            renderHotspots(currentScene.hotspots);
            renderHotspotsList();

            showToast("Portal removido com sucesso.", "success");
        }
    }
}

// --- PLANTA BAIXA LÓGICA ---
function initFloorplan() {
    const uploadZone = document.getElementById("floorplan-upload-zone");
    const fileInput = document.getElementById("floorplan-file-input");
    const btnOpenEditor = document.getElementById("btn-open-floorplan-editor");
    const btnDelete = document.getElementById("btn-delete-floorplan");
    
    // Editor modal close
    document.getElementById("btn-close-floorplan-editor").onclick = () => {
        document.getElementById("floorplan-editor-modal").classList.remove("active");
    };
    
    // Editor modal save
    document.getElementById("btn-save-floorplan-editor").onclick = () => {
        document.getElementById("floorplan-editor-modal").classList.remove("active");
        saveTourToStorage();
        renderFloorplanSidebar();
        renderVisitorFloorplanWidget();
    };
    
    // Trigger upload
    if (uploadZone && fileInput) {
        uploadZone.onclick = () => fileInput.click();
        fileInput.onchange = async (e) => {
            if (e.target.files.length > 0) {
                await uploadFloorplan(e.target.files[0]);
            }
        };
    }
    
    // Open editor
    if (btnOpenEditor) {
        btnOpenEditor.onclick = () => {
            openFloorplanEditor();
        };
    }
    
    // Delete floorplan
    if (btnDelete) {
        btnDelete.onclick = () => {
            if (confirm("Tem certeza de que deseja remover a planta baixa deste tour? Todos os radares vinculados serão perdidos.")) {
                state.tour.floorPlan = null;
                saveTourToStorage();
                renderFloorplanSidebar();
                renderVisitorFloorplanWidget();
                showToast("Planta baixa removida.", "info");
            }
        };
    }
    
    // Workspace click to position pin
    const workspaceMap = document.getElementById("floorplan-map-container");
    if (workspaceMap) {
        workspaceMap.onclick = (e) => {
            handleWorkspaceMapClick(e);
        };
    }
    
    // Yaw offset slider
    const yawSlider = document.getElementById("floorplan-yaw-slider");
    if (yawSlider) {
        yawSlider.oninput = (e) => {
            handleYawSliderInput(parseFloat(e.target.value));
        };
    }
    
    // Remove radar button inside editor
    const btnRemoveRadar = document.getElementById("btn-remove-radar");
    if (btnRemoveRadar) {
        btnRemoveRadar.onclick = () => {
            removeSelectedRadar();
        };
    }
    
    // Visitor widget toggle/close
    const btnToggleWidget = document.getElementById("btn-toggle-widget");
    const btnCloseWidget = document.getElementById("btn-close-widget");
    const widgetCard = document.getElementById("floorplan-widget-card");
    
    if (btnToggleWidget && widgetCard) {
        btnToggleWidget.onclick = () => {
            const isVisible = widgetCard.style.display !== "none";
            widgetCard.style.display = isVisible ? "none" : "flex";
            btnToggleWidget.style.display = isVisible ? "flex" : "none";
        };
    }
    
    if (btnCloseWidget && widgetCard && btnToggleWidget) {
        btnCloseWidget.onclick = () => {
            widgetCard.style.display = "none";
            btnToggleWidget.style.display = "flex";
        };
    }
}

async function uploadFloorplan(file) {
    showToast("Enviando planta baixa...", "info");
    
    let finalUrl = "";
    
    // Se for um tour do servidor e for o proprietário, realiza o upload físico
    if (state.tour.tourId && state.tour.tourId !== "tour-local-default" && state.isOwner) {
        const serverUrl = await uploadFileToServer(file, `floorplan_${Date.now()}_${file.name}`);
        if (serverUrl) {
            finalUrl = serverUrl;
        } else {
            showToast("Falha ao enviar a planta baixa.", "error");
            return;
        }
    } else {
        // Local fallback (Blob URL)
        finalUrl = URL.createObjectURL(file);
    }
    
    state.tour.floorPlan = {
        image: finalUrl,
        radars: []
    };
    
    saveTourToStorage();
    renderFloorplanSidebar();
    renderVisitorFloorplanWidget();
    showToast("Planta baixa carregada com sucesso!", "success");
}

function renderFloorplanSidebar() {
    const uploadZone = document.getElementById("floorplan-upload-zone");
    const previewContainer = document.getElementById("floorplan-preview-container");
    const previewImg = document.getElementById("floorplan-preview-img");
    const badgeStatus = document.getElementById("floorplan-status-badge");
    const fpSection = document.getElementById("floorplan-sidebar-section");
    
    if (!uploadZone || !previewContainer || !previewImg || !badgeStatus || !fpSection) return;

    // Remover lock overlay anterior se existir
    const existingOverlay = fpSection.querySelector(".plan-feature-lock-overlay");
    if (existingOverlay) existingOverlay.remove();
    
    // Se não for dono do tour (modo visitante), não exibe a área de edição na sidebar
    if (!state.isOwner) {
        fpSection.style.display = "none";
        return;
    }

    // Validar se o plano possui recurso de Planta Baixa
    const hasFloorPlans = state.features ? (state.features.floor_plans ?? false) : false;
    if (!hasFloorPlans) {
        fpSection.style.position = "relative";
        const overlay = document.createElement("div");
        overlay.className = "plan-feature-lock-overlay";
        overlay.innerHTML = `
            <div class="lock-overlay-content">
                <i class="fa-solid fa-lock"></i>
                <span>Planta Baixa</span>
                <small>Disponível no Profissional</small>
            </div>
        `;
        fpSection.appendChild(overlay);
        return;
    }
    
    const fp = state.tour.floorPlan;
    if (fp && fp.image) {
        uploadZone.style.display = "none";
        previewContainer.style.display = "flex";
        previewImg.src = fp.image;
        badgeStatus.textContent = "Mapeado";
        badgeStatus.style.background = "rgba(0,242,254,0.1)";
        badgeStatus.style.color = "var(--color-accent)";
    } else {
        uploadZone.style.display = "flex";
        previewContainer.style.display = "none";
        badgeStatus.textContent = "Sem Mapa";
        badgeStatus.style.background = "rgba(255,255,255,0.1)";
        badgeStatus.style.color = "var(--text-secondary)";
    }
}

function openFloorplanEditor() {
    const fp = state.tour.floorPlan;
    if (!fp || !fp.image) {
        showToast("Nenhuma planta baixa cadastrada.", "error");
        return;
    }
    
    // Define a cena atualmente selecionada para iniciar no editor
    state.floorplanSelectedSceneId = state.activeSceneId || (state.tour.scenes.length > 0 ? state.tour.scenes[0].id : null);
    
    // Preenche imagem do editor
    document.getElementById("floorplan-editor-img").src = fp.image;
    
    // Abre modal
    document.getElementById("floorplan-editor-modal").classList.add("active");
    
    // Renderiza
    renderEditorScenesList();
    renderEditorPins();
    updateYawControlsVisibility();
}

function renderEditorScenesList() {
    const list = document.getElementById("floorplan-editor-scenes-list");
    if (!list) return;
    
    list.innerHTML = "";
    
    state.tour.scenes.forEach(scene => {
        const item = document.createElement("div");
        const hasRadar = state.tour.floorPlan && state.tour.floorPlan.radars && state.tour.floorPlan.radars.some(r => r.sceneId === scene.id);
        
        item.className = `floorplan-editor-scenes-list-item ${scene.id === state.floorplanSelectedSceneId ? 'active' : ''} ${hasRadar ? 'has-radar' : ''}`;
        item.dataset.id = scene.id;
        
        item.innerHTML = `
            <i class="fa-solid ${scene.type === 'video' ? 'fa-video' : 'fa-image'}" style="font-size: 12px; opacity: 0.8; color: ${scene.id === state.floorplanSelectedSceneId ? 'var(--color-accent)' : 'inherit'}"></i>
            <span class="floorplan-scene-item-title">${scene.title}</span>
            <i class="fa-solid fa-circle-check floorplan-scene-item-status-icon"></i>
        `;
        
        item.onclick = () => {
            selectEditorScene(scene.id);
        };
        
        list.appendChild(item);
    });
}

function selectEditorScene(sceneId) {
    state.floorplanSelectedSceneId = sceneId;
    renderEditorScenesList();
    renderEditorPins();
    updateYawControlsVisibility();
}

function updateYawControlsVisibility() {
    const container = document.getElementById("floorplan-yaw-controls");
    const slider = document.getElementById("floorplan-yaw-slider");
    const valueEl = document.getElementById("floorplan-yaw-value");
    
    if (!container || !slider || !valueEl) return;
    
    const fp = state.tour.floorPlan;
    if (fp && fp.radars && state.floorplanSelectedSceneId) {
        const radar = fp.radars.find(r => r.sceneId === state.floorplanSelectedSceneId);
        if (radar) {
            container.style.display = "flex";
            slider.value = radar.yawOffset || 0;
            valueEl.textContent = `${radar.yawOffset || 0}°`;
            return;
        }
    }
    
    container.style.display = "none";
}

function renderEditorPins() {
    const container = document.getElementById("floorplan-editor-pins-container");
    if (!container) return;
    
    container.innerHTML = "";
    
    const fp = state.tour.floorPlan;
    if (!fp || !fp.radars) return;
    
    fp.radars.forEach(radar => {
        const scene = state.tour.scenes.find(s => s.id === radar.sceneId);
        if (!scene) return; 
        
        const pin = document.createElement("div");
        pin.className = `editor-pin ${radar.sceneId === state.floorplanSelectedSceneId ? 'active' : ''}`;
        pin.style.left = `${radar.x}%`;
        pin.style.top = `${radar.y}%`;
        pin.title = scene.title;
        pin.dataset.sceneId = radar.sceneId;
        
        if (radar.sceneId === state.floorplanSelectedSceneId) {
            const beam = document.createElement("div");
            beam.className = "editor-radar-beam";
            beam.style.transform = `rotate(${radar.yawOffset || 0}deg)`;
            pin.appendChild(beam);
        }
        
        pin.style.pointerEvents = "auto";
        pin.onclick = (e) => {
            e.stopPropagation();
            selectEditorScene(radar.sceneId);
        };
        
        container.appendChild(pin);
    });
}

function handleWorkspaceMapClick(e) {
    if (!state.floorplanSelectedSceneId) {
        showToast("Por favor, selecione uma cena na lista lateral primeiro.", "info");
        return;
    }
    
    const container = document.getElementById("floorplan-map-container");
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const px = Math.max(0, Math.min(100, x));
    const py = Math.max(0, Math.min(100, y));
    
    if (!state.tour.floorPlan.radars) {
        state.tour.floorPlan.radars = [];
    }
    
    let radar = state.tour.floorPlan.radars.find(r => r.sceneId === state.floorplanSelectedSceneId);
    if (radar) {
        radar.x = parseFloat(px.toFixed(2));
        radar.y = parseFloat(py.toFixed(2));
    } else {
        radar = {
            sceneId: state.floorplanSelectedSceneId,
            x: parseFloat(px.toFixed(2)),
            y: parseFloat(py.toFixed(2)),
            yawOffset: 0
        };
        state.tour.floorPlan.radars.push(radar);
    }
    
    renderEditorPins();
    renderEditorScenesList();
    updateYawControlsVisibility();
}

function handleYawSliderInput(value) {
    if (!state.floorplanSelectedSceneId) return;
    
    const fp = state.tour.floorPlan;
    if (fp && fp.radars) {
        const radar = fp.radars.find(r => r.sceneId === state.floorplanSelectedSceneId);
        if (radar) {
            radar.yawOffset = value;
            document.getElementById("floorplan-yaw-value").textContent = `${value}°`;
            
            const beam = document.querySelector(".editor-radar-beam");
            if (beam) {
                beam.style.transform = `rotate(${value}deg)`;
            }
        }
    }
}

function removeSelectedRadar() {
    if (!state.floorplanSelectedSceneId) return;
    
    const fp = state.tour.floorPlan;
    if (fp && fp.radars) {
        fp.radars = fp.radars.filter(r => r.sceneId !== state.floorplanSelectedSceneId);
        renderEditorPins();
        renderEditorScenesList();
        updateYawControlsVisibility();
    }
}

function renderVisitorFloorplanWidget() {
    const widget = document.getElementById("floorplan-widget");
    const widgetImg = document.getElementById("floorplan-widget-img");
    const container = document.getElementById("floorplan-widget-radars-container");
    
    if (!widget || !widgetImg || !container) return;
    
    const fp = state.tour.floorPlan;
    if (!fp || !fp.image || !fp.radars || fp.radars.length === 0) {
        widget.style.display = "none";
        return;
    }
    
    widget.style.display = "flex";
    widgetImg.src = fp.image;
    
    container.innerHTML = "";
    
    fp.radars.forEach(radar => {
        const scene = state.tour.scenes.find(s => s.id === radar.sceneId);
        if (!scene) return;
        
        const isActive = radar.sceneId === state.activeSceneId;
        
        const pin = document.createElement("div");
        pin.className = `radar-pin ${isActive ? 'active' : ''}`;
        pin.style.left = `${radar.x}%`;
        pin.style.top = `${radar.y}%`;
        pin.title = scene.title;
        
        if (isActive) {
            const beam = document.createElement("div");
            beam.className = "radar-beam";
            beam.id = "radar-beam-active";
            const offset = parseFloat(radar.yawOffset || 0);
            const angle = -state.activeYawAngle + offset;
            beam.style.transform = `rotate(${angle}deg)`;
            pin.appendChild(beam);
        }
        
        pin.onclick = (e) => {
            e.stopPropagation();
            if (!isActive) {
                triggerSceneTransition(() => {
                    setActiveScene(radar.sceneId);
                });
            }
        };
        
        container.appendChild(pin);
    });
}

function updateActiveRadarAngle(yaw) {
    const beam = document.getElementById("radar-beam-active");
    if (!beam) return;
    
    if (state.tour.floorPlan && state.tour.floorPlan.radars) {
        const radar = state.tour.floorPlan.radars.find(r => r.sceneId === state.activeSceneId);
        if (radar) {
            const offset = parseFloat(radar.yawOffset || 0);
            const angle = -yaw + offset;
            beam.style.transform = `rotate(${angle}deg)`;
        }
    }
}

// --- CONFIGURAÇÕES DE LOGO & PRIVACIDADE ---
function updateSettingsSidebarUI() {
    // 1. Atualizar UI da Logo Customizada
    const logoUploadZone = document.getElementById("logo-upload-zone");
    const logoPreviewContainer = document.getElementById("logo-preview-container");
    const logoPreviewImg = document.getElementById("logo-preview-img");
    const clientLogoImg = document.getElementById("client-logo-img");
    const customClientLogo = document.getElementById("custom-client-logo");

    const maxLogos = state.features ? (state.features.max_logos ?? 0) : 0;

    if (state.tour && state.tour.logoUrl) {
        if (logoUploadZone) logoUploadZone.style.display = "none";
        if (logoPreviewContainer) logoPreviewContainer.style.display = "flex";
        if (logoPreviewImg) logoPreviewImg.src = state.tour.logoUrl;
        
        // Exibir logo no viewer
        if (clientLogoImg) clientLogoImg.src = state.tour.logoUrl;
        if (customClientLogo) customClientLogo.style.display = "block";
    } else {
        if (logoUploadZone) {
            logoUploadZone.style.display = "block";
            const textEl = logoUploadZone.querySelector("span");
            if (maxLogos === 0) {
                logoUploadZone.style.pointerEvents = "none";
                logoUploadZone.style.opacity = "0.5";
                if (textEl) textEl.textContent = "Logo Customizada (Plano Básico+)";
            } else {
                logoUploadZone.style.pointerEvents = "auto";
                logoUploadZone.style.opacity = "1";
                if (textEl) textEl.textContent = "Carregar Logo (PNG transparente)";
            }
        }
        if (logoPreviewContainer) logoPreviewContainer.style.display = "none";
        if (logoPreviewImg) logoPreviewImg.src = "";
        
        // Ocultar logo do viewer
        if (clientLogoImg) clientLogoImg.src = "";
        if (customClientLogo) customClientLogo.style.display = "none";
    }

    // 2. Atualizar UI de Privacidade
    const selectPrivacy = document.getElementById("select-privacy");
    const passwordInputWrapper = document.getElementById("password-input-wrapper");
    const inputPrivacyPassword = document.getElementById("input-privacy-password");

    const hasPrivacyControl = state.features ? (state.features.privacy_control ?? false) : false;

    if (selectPrivacy) {
        if (!hasPrivacyControl) {
            selectPrivacy.disabled = true;
            selectPrivacy.style.opacity = "0.5";
            selectPrivacy.style.cursor = "not-allowed";
            selectPrivacy.title = "Disponível a partir do plano Profissional";
            selectPrivacy.value = "public";
            if (passwordInputWrapper) passwordInputWrapper.style.display = "none";
            if (inputPrivacyPassword) inputPrivacyPassword.value = "";
        } else {
            selectPrivacy.disabled = false;
            selectPrivacy.style.opacity = "1";
            selectPrivacy.style.cursor = "pointer";
            selectPrivacy.title = "";
            
            if (state.tour && state.tour.privacySettings) {
                selectPrivacy.value = "password";
                if (passwordInputWrapper) passwordInputWrapper.style.display = "block";
                if (inputPrivacyPassword) inputPrivacyPassword.value = state.tour.privacySettings;
            } else {
                selectPrivacy.value = "public";
                if (passwordInputWrapper) passwordInputWrapper.style.display = "none";
                if (inputPrivacyPassword) inputPrivacyPassword.value = "";
            }
        }
    }
}

// --- CONFIGURAÇÕES DE CENA ATIVA (SOM & GALERIA) ---
function renderActiveSceneSettingsUI(scene) {
    const section = document.getElementById("active-scene-settings-section");
    if (!section) return;

    if (!state.isEditMode || !scene) {
        section.style.display = "none";
        return;
    }

    section.style.display = "block";

    // 1. Nome da Cena
    const inputTitle = document.getElementById("input-scene-title");
    if (inputTitle) inputTitle.value = scene.title || "";

    // 1b. Posição Inicial da Imagem (Yaw)
    const isPaid = state.features && state.features.name && state.features.name !== "Grátis";
    const inputInitialYaw = document.getElementById("input-initial-yaw");
    const btnSetInitialYaw = document.getElementById("btn-set-initial-yaw");
    const badgeInitialYawPro = document.getElementById("badge-initial-yaw-pro");

    if (inputInitialYaw) {
        inputInitialYaw.value = Math.round(scene.initialYaw || 0);
    }

    if (!isPaid) {
        if (badgeInitialYawPro) badgeInitialYawPro.style.display = "inline-block";
        if (inputInitialYaw) {
            inputInitialYaw.disabled = true;
            inputInitialYaw.style.opacity = "0.5";
        }
        if (btnSetInitialYaw) {
            btnSetInitialYaw.style.opacity = "0.6";
            btnSetInitialYaw.style.background = "rgba(255,255,255,0.05)";
            btnSetInitialYaw.style.color = "rgba(255,255,255,0.4)";
            btnSetInitialYaw.style.borderColor = "rgba(255,255,255,0.1)";
        }
    } else {
        if (badgeInitialYawPro) badgeInitialYawPro.style.display = "none";
        if (inputInitialYaw) {
            inputInitialYaw.disabled = false;
            inputInitialYaw.style.opacity = "1";
        }
        if (btnSetInitialYaw) {
            btnSetInitialYaw.style.opacity = "1";
            btnSetInitialYaw.style.background = "rgba(0, 242, 254, 0.08)";
            btnSetInitialYaw.style.color = "#00f2fe";
            btnSetInitialYaw.style.borderColor = "rgba(0, 242, 254, 0.3)";
        }
    }

    // 2. Som Ambiente (MP3)
    const hasSound = state.features ? (state.features.ambient_sound ?? false) : false;
    const audioUploadZone = document.getElementById("audio-upload-zone");
    const audioPreviewContainer = document.getElementById("audio-preview-container");
    const audioPreviewFilename = document.getElementById("audio-preview-filename");

    if (audioUploadZone && audioPreviewContainer) {
        if (!hasSound) {
            audioUploadZone.style.display = "block";
            audioUploadZone.style.pointerEvents = "none";
            audioUploadZone.style.opacity = "0.5";
            const textEl = audioUploadZone.querySelector("span");
            if (textEl) textEl.textContent = "Som Ambiente (Plano Pessoal+)";
            audioPreviewContainer.style.display = "none";
        } else {
            audioUploadZone.style.pointerEvents = "auto";
            audioUploadZone.style.opacity = "1";
            const textEl = audioUploadZone.querySelector("span");
            if (textEl) textEl.textContent = "Carregar Áudio (MP3)";

            if (scene.ambientSound) {
                audioUploadZone.style.display = "none";
                audioPreviewContainer.style.display = "flex";
                if (audioPreviewFilename) {
                    const filename = scene.ambientSound.substring(scene.ambientSound.lastIndexOf('/') + 1);
                    audioPreviewFilename.textContent = filename;
                }
            } else {
                audioUploadZone.style.display = "block";
                audioPreviewContainer.style.display = "none";
            }
        }
    }

    // 3. Galeria de Imagens 2D
    const hasGallery = state.features ? (state.features.image_gallery ?? false) : false;
    const galleryUploadZone = document.getElementById("gallery-upload-zone");
    const thumbsList = document.getElementById("gallery-thumbs-list");

    if (galleryUploadZone && thumbsList) {
        thumbsList.innerHTML = "";
        
        if (!hasGallery) {
            galleryUploadZone.style.display = "block";
            galleryUploadZone.style.pointerEvents = "none";
            galleryUploadZone.style.opacity = "0.5";
            const textEl = galleryUploadZone.querySelector("span");
            if (textEl) textEl.textContent = "Galeria de Fotos (Plano Profissional)";
        } else {
            galleryUploadZone.style.pointerEvents = "auto";
            galleryUploadZone.style.opacity = "1";
            const textEl = galleryUploadZone.querySelector("span");
            if (textEl) textEl.textContent = "Adicionar Fotos (2D)";

            if (scene.galleryImages && Array.isArray(scene.galleryImages)) {
                scene.galleryImages.forEach((imgUrl, idx) => {
                    const item = document.createElement("div");
                    item.className = "gallery-thumb-item";
                    item.innerHTML = `
                        <img src="${imgUrl}" alt="Thumb">
                        <button class="btn-remove-thumb" title="Remover Foto">&times;</button>
                    `;
                    item.querySelector(".btn-remove-thumb").onclick = (e) => {
                        e.stopPropagation();
                        scene.galleryImages.splice(idx, 1);
                        renderActiveSceneSettingsUI(scene);
                        saveTourToStorage();
                        showToast("Foto removida da galeria.", "info");
                    };
                    thumbsList.appendChild(item);
                });
            }
        }
    }
}
