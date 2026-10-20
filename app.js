// --- ESTADO GLOBAL DA APLICAÇÃO ---
const state = {
    tour: {
        tourId: "tour-local-default",
        title: "Meu Tour Virtual 360",
        scenes: [],
        floorPlan: null,
        logoUrl: null,
        privacySettings: null,
        nadirSettings: {
            enabled: false,
            useLogo: true,
            image: null,
            radius: 0.8
        }
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
    plansMatrix: [],
    
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
                applyHotspotReposition(newPos);
                return;
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
            // rotation.y é o Yaw (rotação horizontal), rotation.x é o Pitch (inclinação vertical)
            state.activeYawAngle = rotation.y;
            state.activePitchAngle = rotation.x;
            updateActiveRadarAngle(rotation.y);
        }
    }
});

// --- INICIALIZAÇÃO DA APLICAÇÃO ---
document.addEventListener("DOMContentLoaded", async () => {
    initDOMEvents();
    initFloorplan();
    initSceneRendererEnhancements();
    updateMobileControlsVisibility();
    initTouchZoom();
    
    // Restaurar a aba e estado do painel lateral instantaneamente (antes da rede)
    restoreEditorDrawerState();
    
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

    // Garantir que a aba ativa permaneça após carregar os dados do tour
    restoreEditorDrawerState();
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
            if (data.plans_matrix && Array.isArray(data.plans_matrix)) {
                state.plansMatrix = data.plans_matrix;
            }
            
            if (data.is_locked) {
                const lockScreen = document.getElementById("password-lock-screen");
                if (lockScreen) {
                    lockScreen.style.display = "flex";
                    
                    if (data.is_disabled) {
                        // Tour desativado pelo proprietário
                        const lockIcon = lockScreen.querySelector(".lock-icon");
                        if (lockIcon) lockIcon.className = "fa-solid fa-eye-slash lock-icon";
                        
                        const lockTitle = lockScreen.querySelector("h2");
                        if (lockTitle) lockTitle.textContent = "Link Desativado";
                        
                        const lockDesc = lockScreen.querySelector("p");
                        if (lockDesc) lockDesc.textContent = "O proprietário deste tour virtual desativou o link de visualização para o público externo.";
                        
                        const lockInputGroup = lockScreen.querySelector(".lock-input-group");
                        if (lockInputGroup) lockInputGroup.style.display = "none";
                        
                        const unlockError = document.getElementById("unlock-error-msg");
                        if (unlockError) unlockError.style.display = "none";
                        
                        let homeBtn = document.getElementById("btn-disabled-home");
                        if (!homeBtn) {
                            homeBtn = document.createElement("a");
                            homeBtn.id = "btn-disabled-home";
                            homeBtn.href = "home.html";
                            homeBtn.className = "btn btn-primary";
                            homeBtn.style.marginTop = "15px";
                            homeBtn.style.textDecoration = "none";
                            homeBtn.style.display = "inline-flex";
                            homeBtn.style.alignItems = "center";
                            homeBtn.style.gap = "8px";
                            homeBtn.innerHTML = '<i class="fa-solid fa-house"></i> Ir para a Página Inicial';
                            const lockCard = lockScreen.querySelector(".lock-card");
                            if (lockCard) lockCard.appendChild(homeBtn);
                        } else {
                            homeBtn.style.display = "inline-flex";
                        }
                    } else {
                        // Bloqueado por Senha
                        const lockIcon = lockScreen.querySelector(".lock-icon");
                        if (lockIcon) lockIcon.className = "fa-solid fa-lock lock-icon";
                        
                        const lockTitle = lockScreen.querySelector("h2");
                        if (lockTitle) lockTitle.textContent = "Tour Protegido";
                        
                        const lockDesc = lockScreen.querySelector("p");
                        if (lockDesc) lockDesc.textContent = "Este tour virtual é privado. Digite a senha de acesso para visualizá-lo.";
                        
                        const lockInputGroup = lockScreen.querySelector(".lock-input-group");
                        if (lockInputGroup) lockInputGroup.style.display = "flex";
                        
                        let homeBtn = document.getElementById("btn-disabled-home");
                        if (homeBtn) homeBtn.style.display = "none";
                    }
                }
                
                // Configurar títulos básicos
                document.getElementById("tour-display-title").textContent = state.tour ? state.tour.title : "Tour 360°";
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

                // Ocultar botão painel e mudar para "Ir para o Início"
                const btnDashboard = document.getElementById("btn-dashboard");
                if (btnDashboard) {
                    btnDashboard.innerHTML = '<i class="fa-solid fa-house"></i> Ir para o Início';
                    btnDashboard.href = 'home.html';
                }

                const logoLink = document.getElementById("viewer-logo-link");
                if (logoLink) {
                    logoLink.href = 'home.html';
                }
                
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
            
            // Inicializar nadirSettings se não vier do servidor
            if (!state.tour.nadirSettings) {
                state.tour.nadirSettings = { enabled: false, useLogo: true, image: null, radius: 0.8 };
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
            renderNadirPatch();
            updateUI();
            restoreEditorDrawerState();
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
                    privacySettings: state.tour.privacySettings,
                    nadirSettings: state.tour.nadirSettings
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
                if (!state.tour.nadirSettings) {
                    state.tour.nadirSettings = { enabled: false, useLogo: true, image: null, radius: 0.8 };
                }
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
    
    // Configurar orientação esférica padrão e aplicar ângulo inicial da câmera
    const skyViewer = document.getElementById("sky-viewer");
    const videoViewer = document.getElementById("video-viewer");
    if (skyViewer) skyViewer.setAttribute("rotation", "0 -90 0");
    if (videoViewer) videoViewer.setAttribute("rotation", "0 -90 0");

    applySceneInitialView(scene);
    
    // Exibir feedback de carregamento com numeração precisa
    const sceneIndex = state.tour.scenes ? state.tour.scenes.findIndex(s => s.id === sceneId) : -1;
    const maxAllowed = state.features && typeof state.features.max_scenes !== 'undefined' ? state.features.max_scenes : 10;
    const maxScenesText = maxAllowed > 0 ? maxAllowed : '∞';
    const sceneNumberPrefix = sceneIndex !== -1 ? `Cena ${sceneIndex + 1}/${maxScenesText}: ` : '';

    const sceneDisplayTitle = document.getElementById("scene-display-title");
    if (sceneDisplayTitle) {
        sceneDisplayTitle.textContent = `${sceneNumberPrefix}${scene.title} (${scene.type === 'video' ? 'Vídeo 360°' : 'Foto 360°'})`;
    }

    const btnEditHeader = document.getElementById("btn-edit-active-scene-title");
    if (btnEditHeader) {
        btnEditHeader.style.display = state.isEditMode ? "inline-flex" : "none";
    }

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
            optimizeSkyViewerTexture();
        };
        img.onerror = () => {
            console.error("Falha ao carregar textura da foto 360°:", scene.sourceUrl);
            showToast(`Aviso: A imagem da cena "${scene.title}" não pôde ser carregada.`, "warning");
            skyViewer.setAttribute("visible", "true");
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
    document.querySelectorAll("#scenes-list .scene-card").forEach(card => {
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

    // Renderizar Tampa de Tripé (Nadir) se ativo
    renderNadirPatch();
}

// --- OTIMIZAÇÃO DE ALTA DEFINIÇÃO WEBGL / THREE.JS ---
function initSceneRendererEnhancements() {
    const sceneEl = document.querySelector("a-scene");
    if (!sceneEl) return;

    const setupRenderer = () => {
        if (sceneEl.renderer) {
            // Garante densidade total de pixels nativa para monitores Retina, 2K, 4K e telas com DPI escalado
            sceneEl.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            if (THREE.SRGBColorSpace) {
                sceneEl.renderer.outputColorSpace = THREE.SRGBColorSpace;
            }
        }
    };

    if (sceneEl.hasLoaded) {
        setupRenderer();
    } else {
        sceneEl.addEventListener("loaded", setupRenderer);
    }

    window.addEventListener("resize", () => {
        if (sceneEl && sceneEl.renderer) {
            sceneEl.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        }
    });
}

function optimizeSkyViewerTexture() {
    const skyViewer = document.getElementById("sky-viewer");
    if (!skyViewer) return;

    const applyOptimization = () => {
        const sceneEl = document.querySelector("a-scene");
        const renderer = sceneEl ? sceneEl.renderer : null;

        if (renderer) {
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            if (THREE.SRGBColorSpace) {
                renderer.outputColorSpace = THREE.SRGBColorSpace;
            }
        }

        const mesh = skyViewer.getObject3D("mesh");
        if (mesh && mesh.material) {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach(mat => {
                if (mat && mat.map) {
                    const texture = mat.map;
                    const maxAniso = renderer ? renderer.capabilities.getMaxAnisotropy() : 16;
                    
                    // Filtragem anisotrópica máxima (até 16x) para manter extrema nitidez em todos os ângulos
                    texture.anisotropy = maxAniso;
                    
                    // Amostragem linear direta no domo 360° para evitar borrões causados por mipmaps distantes
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.generateMipmaps = false;
                    texture.needsUpdate = true;
                }
            });
        }
    };

    applyOptimization();
    skyViewer.removeEventListener("materialtextureloaded", applyOptimization);
    skyViewer.addEventListener("materialtextureloaded", applyOptimization, { once: true });
}

// --- ORIENTAÇÃO INICIAL DA CENA (YAW / PITCH) ---
function applySceneInitialView(scene) {
    if (!scene) return;
    const camera = document.getElementById("camera");
    if (!camera) return;

    const initialYaw = parseFloat(scene.initialYaw || 0);
    const initialPitch = parseFloat(scene.initialPitch || 0);

    const lookControls = camera.components['look-controls'];
    if (lookControls) {
        if (lookControls.yawObject) {
            lookControls.yawObject.rotation.y = THREE.MathUtils.degToRad(initialYaw);
        }
        if (lookControls.pitchObject) {
            lookControls.pitchObject.rotation.x = THREE.MathUtils.degToRad(initialPitch);
        }
    }
    camera.setAttribute("rotation", `${initialPitch} ${initialYaw} 0`);
    state.activeYawAngle = initialYaw;
    state.activePitchAngle = initialPitch;
    updateActiveRadarAngle(initialYaw);

    const quickDisplay = document.getElementById("quick-initial-yaw-display");
    if (quickDisplay) quickDisplay.textContent = `${Math.round(initialYaw)}°`;
}

// --- CONTROLE DE GIROSCÓPIO & NAVEGAÇÃO MOBILE ---
function isMobileOrTouch() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 1024);
}

function updateMobileControlsVisibility() {
    const isMobile = isMobileOrTouch();
    const btnToggleGyro = document.getElementById("btn-toggle-gyro");
    if (btnToggleGyro) {
        btnToggleGyro.style.display = isMobile ? "flex" : "none";
    }
}

function toggleGyroscope() {
    const camera = document.getElementById("camera");
    const btn = document.getElementById("btn-toggle-gyro");
    if (!camera || !btn) return;

    state.gyroEnabled = !state.gyroEnabled;

    const activateGyro = () => {
        camera.setAttribute('look-controls', 'magicWindowTracking: true; touchEnabled: true');
        btn.classList.add('active');
        btn.title = "Giroscópio Ativo (Clique para desativar e usar apenas toque)";
        showToast('Giroscópio ativado! Mova o celular para olhar em 360°.', 'info');
    };

    const deactivateGyro = () => {
        camera.setAttribute('look-controls', 'magicWindowTracking: false; touchEnabled: true');
        btn.classList.remove('active');
        btn.title = "Giroscópio Desativado (Clique para ativar movimento do celular)";
        showToast('Giroscópio desativado. Arraste com o dedo para navegar.', 'info');
    };

    if (state.gyroEnabled) {
        // No iOS Safari, requisitar permissão caso necessário
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        activateGyro();
                    } else {
                        state.gyroEnabled = false;
                        deactivateGyro();
                        showToast('Permissão de movimento negada no dispositivo.', 'error');
                    }
                })
                .catch(err => {
                    console.warn("Erro ao solicitar permissão de orientação:", err);
                    state.gyroEnabled = false;
                    deactivateGyro();
                });
        } else {
            activateGyro();
        }
    } else {
        deactivateGyro();
    }
}

// Suporte a Pinch-to-zoom em telas de toque (Mobile)
function initTouchZoom() {
    const canvasWrapper = document.getElementById("canvas-wrapper");
    if (!canvasWrapper) return;

    let initialDist = 0;
    let initialFov = 80;

    canvasWrapper.addEventListener("touchstart", (e) => {
        if (e.touches && e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            initialDist = Math.hypot(dx, dy);
            const camera = document.getElementById("camera");
            if (camera) {
                initialFov = parseFloat(camera.getAttribute("fov") || 80);
            }
        }
    }, { passive: true });

    canvasWrapper.addEventListener("touchmove", (e) => {
        if (e.touches && e.touches.length === 2 && initialDist > 0) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const currentDist = Math.hypot(dx, dy);
            const diff = initialDist - currentDist;

            const camera = document.getElementById("camera");
            if (camera) {
                let newFov = initialFov + (diff * 0.15);
                if (newFov < 35) newFov = 35;
                if (newFov > 105) newFov = 105;
                camera.setAttribute("fov", newFov);
                state.userChangedFov = true;
            }
        }
    }, { passive: true });

    canvasWrapper.addEventListener("touchend", () => {
        initialDist = 0;
    }, { passive: true });
}

// --- MAPEAMENTO E RESOLUÇÃO DINÂMICA DOS PLANOS COMERCIAIS ---
function getMinimumPlanForFeature(featureKey, fallbackPlan = "Básico") {
    const matrix = (state.plansMatrix && state.plansMatrix.length > 0) ? state.plansMatrix : [];
    for (const plan of matrix) {
        if (featureKey === "max_logos") {
            if (parseInt(plan.max_logos) > 0) return plan.name;
        } else if (featureKey === "gsv_projects_per_month") {
            if (parseInt(plan.gsv_projects_per_month) > 0) return plan.name;
        } else {
            if (plan[featureKey] === true || parseInt(plan[featureKey]) === 1) {
                return plan.name;
            }
        }
    }
    // Fallback conforme tabela oficial dos planos comerciais
    const defaults = {
        'max_logos': 'Básico',
        'nadir_patch': 'Básico',
        'gsv_projects_per_month': 'Básico',
        'floor_plans': 'Profissional',
        'ambient_sound': 'Pessoal',
        'image_gallery': 'Profissional',
        'privacy_control': 'Profissional',
        'offline_access': 'Profissional',
        'rich_hotspots': 'Básico',
        'text_markers': 'Básico'
    };
    return defaults[featureKey] || fallbackPlan;
}

function getUpgradePlanForScenes(currentAllowed) {
    const matrix = (state.plansMatrix && state.plansMatrix.length > 0) ? state.plansMatrix : [];
    for (const plan of matrix) {
        const pScenes = parseInt(plan.max_scenes);
        if (pScenes > currentAllowed || pScenes === -1 || pScenes >= 90000) {
            return {
                name: plan.name,
                scenes: (pScenes === -1 || pScenes >= 90000) ? "ilimitadas" : `${pScenes} cenas`
            };
        }
    }
    // Fallback comercial
    if (currentAllowed <= 10) return { name: "Iniciante", scenes: "20 cenas" };
    if (currentAllowed <= 20) return { name: "Pessoal", scenes: "50 cenas" };
    return { name: "Profissional", scenes: "cenas ilimitadas" };
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

    const titleEl = document.getElementById("locked-modal-title");
    if (titleEl && title) {
        titleEl.innerHTML = title;
    }

    const descEl = document.getElementById("locked-modal-desc");
    if (descEl && desc) {
        descEl.innerHTML = desc;
    }

    modal.classList.add("active");
}

function openSceneLockedModal(scene, index) {
    const maxAllowed = state.features && typeof state.features.max_scenes !== 'undefined' ? state.features.max_scenes : 10;
    const planName = (state.features && state.features.name) || "Iniciante";
    const nextPlan = getUpgradePlanForScenes(maxAllowed);
    const sceneName = scene && scene.title ? scene.title : `Cena ${index + 1}`;
    const title = `<i class="fa-solid fa-lock" style="color:#ff4444;"></i> ${sceneName} (Bloqueada)`;
    const desc = `Seu plano atual (<span style="font-weight: bold; color: #00f2fe;">${planName}</span>) permite a navegação nas primeiras <span style="font-weight: bold; color: #fff;">${maxAllowed} cenas</span> deste tour.<br><br>Esta foto 360° foi enviada e salva com sucesso (posição <strong>${index + 1}/${maxAllowed}</strong>). Para torná-la navegável e expandir seu tour para até <strong>${nextPlan.scenes}</strong>, faça o upgrade para o <strong>Plano ${nextPlan.name}</strong>!`;
    openUpgradeModal(title, desc);
}

function closeSceneLockedModal() {
    const modal = document.getElementById("scene-locked-modal");
    if (modal) modal.classList.remove("active");
}

// --- OVERLAY DE RECURSOS BLOQUEADOS (PLANO) ---
function applyFeatureLockOverlay(containerEl, featureName, requiredPlanName, customDesc = null) {
    if (!containerEl) return;
    containerEl.style.position = "relative";
    
    const prev = containerEl.querySelector(".plan-feature-lock-overlay");
    if (prev) prev.remove();

    // Normalização rigorosa do nome do plano
    const cleanPlan = (requiredPlanName || "Básico").toString().replace(/^Plano\s+/i, "").replace(/\+$/, "").trim();
    const formattedPlan = `Plano ${cleanPlan}`;

    const overlay = document.createElement("div");
    overlay.className = "plan-feature-lock-overlay";
    overlay.title = `Clique para desbloquear ${featureName}`;
    overlay.innerHTML = `
        <div class="lock-overlay-content">
            <i class="fa-solid fa-lock"></i>
            <span>${featureName}</span>
            <small>Disponível no ${formattedPlan}</small>
        </div>
    `;
    overlay.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        const desc = customDesc || `O recurso <strong>${featureName}</strong> está disponível a partir do <strong>${formattedPlan}</strong>.<br><br>Faça o upgrade da sua assinatura para desbloquear esta funcionalidade!`;
        openUpgradeModal(
            `<i class="fa-solid fa-lock" style="color:#ff4444;"></i> Recurso Bloqueado: ${featureName}`,
            desc
        );
    };
    containerEl.appendChild(overlay);
}

function removeFeatureLockOverlay(containerEl) {
    if (!containerEl) return;
    const prev = containerEl.querySelector(".plan-feature-lock-overlay");
    if (prev) prev.remove();
}

// --- RENDERIZAÇÃO DE HOTSPOTS NO ESPAÇO 3D ---
function renderHotspots(hotspotsList) {
    const container = document.getElementById("hotspots-container");
    if (!container) return;
    container.innerHTML = ""; // Limpa hotspots anteriores

    if (!hotspotsList || !Array.isArray(hotspotsList)) return;

    // Planos Pagos têm acesso a personalização de ícones/cores
    const isPaid = state.features && state.features.name && state.features.name !== "Grátis";

    hotspotsList.forEach(hotspot => {
        if (!hotspot || !hotspot.position) return;

        const isSelected = state.isEditMode && (state.selectedHotspotId === hotspot.id);
        const isPortal = (hotspot.type || "portal") === "portal";
        const targetIndex = isPortal ? (state.tour.scenes ? state.tour.scenes.findIndex(s => s.id === hotspot.targetSceneId) : -1) : -1;
        const isTargetLocked = isPortal && targetIndex !== -1 && isSceneLocked(targetIndex);

        // Entidade A-Frame para o hotspot
        const entity = document.createElement("a-entity");
        entity.setAttribute("position", `${hotspot.position.x} ${hotspot.position.y} ${hotspot.position.z}`);
        entity.setAttribute("look-at", "#camera");
        entity.setAttribute("data-hotspot-id", hotspot.id);
        
        // Pulsação suave contínua
        const pulseScale = isSelected ? "1.18 1.18 1.18" : "1.08 1.08 1.08";
        const pulseDur = isSelected ? "700" : "1100";
        entity.setAttribute("animation__pulse", `property: scale; from: 1 1 1; to: ${pulseScale}; dir: alternate; loop: true; dur: ${pulseDur}; easing: easeInOutQuad`);

        // Cor do anel grosso e elementos visuais:
        // PRESERVA SEMPRE a cor escolhida pelo usuário!
        let ringColor = "#ffffff";
        if (hotspot.customColor) {
            ringColor = hotspot.customColor;
        } else if (isTargetLocked) {
            ringColor = "#ff4444";
        } else if (!isPortal) {
            ringColor = "#9b51e0"; // Violeta para hotspot de informação
        }

        // Círculo vazado com contorno grosso (linha grossa e sem preenchimento interno)
        const ring = document.createElement("a-ring");
        ring.setAttribute("class", "hotspot-element");
        ring.setAttribute("radius-inner", "0.34");
        ring.setAttribute("radius-outer", "0.48");
        ring.setAttribute("material", `shader: flat; color: ${ringColor}; opacity: 0.95; transparent: true; depthTest: false`);

        // Área transparente interna para permitir clique em todo o diâmetro do círculo
        const hitArea = document.createElement("a-circle");
        hitArea.setAttribute("class", "hotspot-element");
        hitArea.setAttribute("radius", "0.48");
        hitArea.setAttribute("material", "shader: flat; opacity: 0.001; transparent: true; depthTest: false");

        // Animação Hover no A-Frame
        ring.setAttribute("animation__mouseenter", "property: scale; to: 1.15 1.15 1.15; dur: 150; startEvents: mouseenter");
        ring.setAttribute("animation__mouseleave", "property: scale; to: 1 1 1; dur: 150; startEvents: mouseleave");

        entity.appendChild(ring);
        entity.appendChild(hitArea);

        // Se estiver selecionado, adicionamos um anel externo extra pulsante ciano neon para indicar seleção
        if (isSelected) {
            const selectRing = document.createElement("a-ring");
            selectRing.setAttribute("class", "hotspot-element");
            selectRing.setAttribute("radius-inner", "0.52");
            selectRing.setAttribute("radius-outer", "0.58");
            selectRing.setAttribute("material", "shader: flat; color: #00f2fe; opacity: 0.9; transparent: true; depthTest: false");
            entity.appendChild(selectRing);
        }

        // Ícone / Formato interno de acordo com o estilo selecionado
        const iconStyle = hotspot.iconStyle || "ring";
        if (iconStyle === "dot") {
            const innerDot = document.createElement("a-circle");
            innerDot.setAttribute("class", "hotspot-element");
            innerDot.setAttribute("radius", "0.20");
            innerDot.setAttribute("material", `shader: flat; color: ${ringColor}; opacity: 0.95; transparent: true; depthTest: false`);
            entity.appendChild(innerDot);
        } else if (iconStyle === "target") {
            const innerRing = document.createElement("a-ring");
            innerRing.setAttribute("class", "hotspot-element");
            innerRing.setAttribute("radius-inner", "0.10");
            innerRing.setAttribute("radius-outer", "0.18");
            innerRing.setAttribute("material", `shader: flat; color: ${ringColor}; opacity: 0.95; transparent: true; depthTest: false`);
            entity.appendChild(innerRing);
        } else if (iconStyle === "arrow") {
            const arrow = document.createElement("a-triangle");
            arrow.setAttribute("class", "hotspot-element");
            arrow.setAttribute("vertex-a", "0 0.22 0.01");
            arrow.setAttribute("vertex-b", "-0.16 -0.14 0.01");
            arrow.setAttribute("vertex-c", "0.16 -0.14 0.01");
            arrow.setAttribute("material", `shader: flat; color: ${ringColor}; opacity: 0.95; transparent: true; depthTest: false`);
            entity.appendChild(arrow);
        }

        const baseTitle = hotspot.label || (isPortal ? getSceneTitle(hotspot.targetSceneId) : hotspot.infoTitle);
        const targetTitle = (isTargetLocked ? "🔒 " : (isSelected ? "🎯 " : "")) + baseTitle + (isTargetLocked ? " (Bloqueada)" : "");

        // Elemento de texto flutuante (Tooltip)
        const text = document.createElement("a-text");
        text.setAttribute("value", targetTitle);
        text.setAttribute("align", "center");
        text.setAttribute("position", "0 0.65 0.02");
        text.setAttribute("width", "3.4");
        text.setAttribute("color", isSelected ? "#00f2fe" : (isTargetLocked ? "#ff6b6b" : (!isPortal ? "#d1a3ff" : "#ffffff")));
        text.setAttribute("font", "roboto");
        text.setAttribute("material", "depthTest: false; shader: flat");
        
        // Fundo translúcido sutil do texto (HUD)
        const textLength = targetTitle.length;
        const textWidth = Math.max(1.4, (textLength * 0.10) + 0.35);
        const textBg = document.createElement("a-plane");
        textBg.setAttribute("class", "hotspot-element");
        textBg.setAttribute("color", isSelected ? "#061320" : "#000000");
        textBg.setAttribute("width", textWidth);
        textBg.setAttribute("height", "0.30");
        textBg.setAttribute("position", "0 0.65 0.01");
        textBg.setAttribute("opacity", isSelected ? "0.85" : "0.55");
        textBg.setAttribute("transparent", "true");
        textBg.setAttribute("material", "shader: flat; depthTest: false");

        // Evento de clique para navegação / seleção inteligente
        let lastPortalClickTime = 0;
        const handlePortalClick = (evt) => {
            if (evt) evt.stopPropagation();

            const now = Date.now();
            const isDoubleClick = (now - lastPortalClickTime) < 380;
            lastPortalClickTime = now;

            // Se for modo editor:
            if (state.isEditMode) {
                // Se o modo mover/reposicionar estiver ativo, NUNCA navegue entre cenas!
                if (state.isRepositioningHotspot) {
                    const point = evt && evt.detail && evt.detail.intersection ? evt.detail.intersection.point : null;
                    if (point) {
                        const targetDistance = 5;
                        const dist = Math.hypot(point.x, point.y, point.z) || 1;
                        const newPos = {
                            x: parseFloat(((point.x / dist) * targetDistance).toFixed(3)),
                            y: parseFloat(((point.y / dist) * targetDistance).toFixed(3)),
                            z: parseFloat(((point.z / dist) * targetDistance).toFixed(3))
                        };
                        applyHotspotReposition(newPos);
                    }
                    return;
                }

                // Se o portal já estava selecionado OU se for clique duplo: navega para a cena de destino!
                if (state.selectedHotspotId === hotspot.id || isDoubleClick) {
                    if (isPortal) {
                        if (isTargetLocked) {
                            const targetScene = state.tour.scenes[targetIndex];
                            openSceneLockedModal(targetScene, targetIndex);
                            return;
                        }
                        triggerSceneTransition(() => {
                            setActiveScene(hotspot.targetSceneId);
                            showToast(`Navegando para: ${getSceneTitle(hotspot.targetSceneId)}`, "info");
                        });
                        return;
                    } else {
                        openInfoHotspotModal(hotspot);
                        return;
                    }
                }

                // Primeiro clique: seleciona e foca para edição
                selectHotspot(hotspot.id);
                lookAtHotspot(hotspot.id);
                openToolTab('hotspots');
                showToast(`Portal "${hotspot.label}" selecionado. Dê outro clique para viajar até ele!`, "info");
                return;
            }

            // Modo visualizador (visitante)
            if (isPortal) {
                if (isTargetLocked) {
                    const targetScene = state.tour.scenes[targetIndex];
                    openSceneLockedModal(targetScene, targetIndex);
                    return;
                }
                
                ring.setAttribute("scale", "0.8 0.8 0.8");
                setTimeout(() => {
                    ring.setAttribute("scale", "1 1 1");
                    triggerSceneTransition(() => {
                        setActiveScene(hotspot.targetSceneId);
                        showToast(`Navegando para: ${getSceneTitle(hotspot.targetSceneId)}`, "info");
                    });
                }, 120);
            } else {
                openInfoHotspotModal(hotspot);
            }
        };

        ring.addEventListener("click", handlePortalClick);
        hitArea.addEventListener("click", handlePortalClick);
        textBg.addEventListener("click", handlePortalClick);
        text.addEventListener("click", handlePortalClick);

        entity.appendChild(hitArea);
        entity.appendChild(ring);

        // Se for um hotspot de informação, adiciona a letra "i" no meio
        if (!isPortal && !isSelected) {
            const iText = document.createElement("a-text");
            iText.setAttribute("value", "i");
            iText.setAttribute("align", "center");
            iText.setAttribute("position", "0 0 0.01");
            iText.setAttribute("width", "4.0");
            iText.setAttribute("color", "#ffffff");
            iText.setAttribute("font", "roboto");
            iText.setAttribute("material", "depthTest: false; shader: flat");
            iText.addEventListener("click", handlePortalClick);
            entity.appendChild(iText);
        }

        // Se for um plano pago com personalização ativa e ícone customizado cadastrado:
        if (isPaid && hotspot.customIcon && isPortal) {
            const customIconPlane = document.createElement("a-plane");
            customIconPlane.setAttribute("class", "hotspot-element");
            customIconPlane.setAttribute("src", hotspot.customIcon);
            customIconPlane.setAttribute("width", "0.5");
            customIconPlane.setAttribute("height", "0.5");
            customIconPlane.setAttribute("transparent", "true");
            customIconPlane.setAttribute("material", "shader: flat; depthTest: false; transparent: true");
            customIconPlane.addEventListener("click", handlePortalClick);
            entity.appendChild(customIconPlane);
        }

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
function updateRepositionUI(active) {
    const canvasWrapper = document.getElementById("canvas-wrapper");
    const repositionHud = document.getElementById("reposition-mode-hud");
    const hudText = document.getElementById("reposition-hud-text");
    
    if (canvasWrapper) {
        canvasWrapper.classList.toggle("repositioning-mode", !!active);
    }
    
    if (repositionHud) {
        if (active) {
            const currentScene = state.tour && state.tour.scenes ? state.tour.scenes.find(s => s.id === state.activeSceneId) : null;
            const hotspot = currentScene && currentScene.hotspots ? currentScene.hotspots.find(h => h.id === state.selectedHotspotId) : null;
            const label = hotspot ? (hotspot.label || "Portal") : "Portal";
            if (hudText) {
                hudText.innerHTML = `<strong>Modo Mover:</strong> Clique na foto 360° para fixar <em>"${label}"</em>`;
            }
            repositionHud.style.display = "block";
        } else {
            repositionHud.style.display = "none";
        }
    }
}

function cancelRepositionHotspot() {
    if (!state.isRepositioningHotspot) return;
    state.isRepositioningHotspot = false;
    updateRepositionUI(false);
    renderHotspotsList();
    showToast("Modo de reposicionamento cancelado.", "info");
}

function applyHotspotReposition(newPos) {
    if (!state.isRepositioningHotspot || !state.selectedHotspotId) return;
    const currentScene = state.tour && state.tour.scenes ? state.tour.scenes.find(s => s.id === state.activeSceneId) : null;
    if (!currentScene || !currentScene.hotspots) return;

    const hotspot = currentScene.hotspots.find(h => h.id === state.selectedHotspotId);
    if (!hotspot) return;

    hotspot.position = newPos;
    state.isRepositioningHotspot = false;
    updateRepositionUI(false);

    saveTourToStorage();
    renderHotspots(currentScene.hotspots);
    renderHotspotsList();
    showToast(`Portal "${hotspot.label}" reposicionado com sucesso no ponto clicado!`, "success");
}

function selectHotspot(hotspotId) {
    state.selectedHotspotId = hotspotId;
    if (state.isRepositioningHotspot) {
        state.isRepositioningHotspot = false;
        updateRepositionUI(false);
    }
    
    const currentScene = state.tour.scenes.find(s => s.id === state.activeSceneId);
    if (currentScene) {
        renderHotspots(currentScene.hotspots);
        renderHotspotsList();
    }
}

function toggleRepositionHotspot(hotspotId) {
    if (state.selectedHotspotId !== hotspotId) {
        state.selectedHotspotId = hotspotId;
    }
    
    state.isRepositioningHotspot = !state.isRepositioningHotspot;
    updateRepositionUI(state.isRepositioningHotspot);
    
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

// --- EFEITO DE TRANSIÇÃO SUAVE (FADE COM PROTEÇÃO BLINDADA) ---
function triggerSceneTransition(callback) {
    const camera = document.getElementById("camera");
    if (!camera) {
        if (typeof callback === "function") callback();
        return;
    }
    
    // Adiciona uma esfera escura ao redor da câmera para simular fade-out/in
    const fade = document.createElement("a-entity");
    fade.setAttribute("geometry", "primitive: sphere; radius: 0.5");
    fade.setAttribute("material", "color: #0a0b0e; shader: flat; side: double; opacity: 0; transparent: true");
    fade.setAttribute("position", "0 0 0");
    
    // Animação de fade out (escurecer)
    fade.setAttribute("animation__fadeout", "property: material.opacity; from: 0; to: 1; dur: 250; easing: easeInQuad");
    camera.appendChild(fade);

    setTimeout(() => {
        try {
            if (typeof callback === "function") {
                callback();
            }
        } catch (err) {
            console.error("Erro durante execução da transição de cena:", err);
        } finally {
            // Animação de fade in (clarear) - SEMPRE executada mesmo se callback falhar
            fade.removeAttribute("animation__fadeout");
            fade.setAttribute("animation__fadein", "property: material.opacity; from: 1; to: 0; dur: 350; easing: easeOutQuad");
            
            setTimeout(() => {
                if (fade.parentNode) {
                    fade.parentNode.removeChild(fade);
                }
            }, 360);
        }
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

        const maxAllowed = state.features && typeof state.features.max_scenes !== 'undefined' ? state.features.max_scenes : 10;
        const maxScenesText = maxAllowed > 0 ? maxAllowed : '∞';
        const orderText = `${index + 1}/${maxScenesText}`;

        const lockOverlay = locked ? `<div class="thumb-locked-overlay"><i class="fa-solid fa-lock"></i></div>` : '';

        thumb.innerHTML = `
            ${imgHtml}
            ${lockOverlay}
            <span class="thumb-pos-badge ${locked ? 'locked' : ''}">${orderText}</span>
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
    dropZone.addEventListener("click", (e) => {
        const maxAllowed = state.features && typeof state.features.max_scenes !== 'undefined' ? state.features.max_scenes : 10;
        if (maxAllowed !== -1 && state.tour && state.tour.scenes && state.tour.scenes.length >= maxAllowed + 1) {
            e.preventDefault();
            const planName = (state.features && state.features.name) || "Iniciante";
            const nextPlan = getUpgradePlanForScenes(maxAllowed);
            showToast(`Limite excedido! O plano ${planName} permite ${maxAllowed} cenas ativas (+1 de tolerância).`, "warning");
            openUpgradeModal(
                `<i class="fa-solid fa-lock" style="color:#ff4444;"></i> Limite Máximo de Cenas Atingido!`,
                `Você já atingiu o limite de cenas do plano <strong>${planName}</strong> (${maxAllowed} cenas ativas + 1 cena extra de tolerância já salva).<br><br>Para continuar adicionando novas fotos 360° a este tour, faça o upgrade para o <strong>Plano ${nextPlan.name}</strong> (até ${nextPlan.scenes}) ou <strong>Plano Profissional</strong>!`
            );
            return;
        }
        fileInput.click();
    });
    
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

    // Botão de Renomear Cena Ativa no Cabeçalho
    const btnEditHeader = document.getElementById("btn-edit-active-scene-title");
    if (btnEditHeader) {
        btnEditHeader.addEventListener("click", () => {
            if (!state.activeSceneId) return;
            openToolTab("scenes", true);
            const activeCard = document.querySelector(`.scene-card[data-id="${state.activeSceneId}"]`);
            if (activeCard) {
                startInlineSceneRename(state.activeSceneId, activeCard);
                activeCard.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        });
    }

    // Botão Modo VR
    const btnEnterVr = document.getElementById("btn-enter-vr");
    if (btnEnterVr) {
        btnEnterVr.addEventListener("click", () => {
            const scene = document.querySelector("a-scene");
            if (scene) {
                scene.enterVR();
            }
        });
    }

    // Botão Adicionar Hotspot (Visualizador e Barra Lateral de Portais)
    if (btnAddHotspot) {
        btnAddHotspot.addEventListener("click", () => {
            triggerHotspotCreationModal();
        });
    }

    const btnSidebarAddPortal = document.getElementById("btn-sidebar-add-portal");
    if (btnSidebarAddPortal) {
        btnSidebarAddPortal.addEventListener("click", () => {
            triggerHotspotCreationModal();
        });
    }

    // Listeners para paleta de cores do Hotspot Modal
    const swatchBtns = document.querySelectorAll(".color-swatch-btn");
    const colorInput = document.getElementById("hotspot-custom-color-input");
    const colorHexSpan = document.getElementById("hotspot-color-hex");

    swatchBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            swatchBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const color = btn.dataset.color;
            if (colorInput) colorInput.value = color;
            if (colorHexSpan) colorHexSpan.textContent = color.toUpperCase();
        });
    });

    if (colorInput) {
        colorInput.addEventListener("input", (e) => {
            const color = e.target.value;
            if (colorHexSpan) colorHexSpan.textContent = color.toUpperCase();
            swatchBtns.forEach(b => {
                b.classList.toggle("active", b.dataset.color.toLowerCase() === color.toLowerCase());
            });
        });
    }

    // Captura ultra-precisa e filtrada de clique no Canvas para reposicionamento de Hotspot
    const canvasWrapper = document.getElementById("canvas-wrapper");
    let canvasPointerDownPos = { x: 0, y: 0, time: 0 };

    if (canvasWrapper) {
        canvasWrapper.addEventListener("pointerdown", (e) => {
            canvasPointerDownPos = { x: e.clientX, y: e.clientY, time: Date.now() };
        });

        canvasWrapper.addEventListener("click", (e) => {
            if (!state.isEditMode || !state.isRepositioningHotspot || !state.selectedHotspotId) return;
            if (e.target.closest(".viewer-overlay-controls") || e.target.closest(".modal-overlay") || e.target.closest(".scenes-navigation-bar") || e.target.closest("#reposition-mode-hud")) return;

            // Filtro essencial contra arrasto de câmera: se deslocou mais de 6 pixels, o usuário estava apenas girando a visão!
            const dragDist = Math.hypot(e.clientX - canvasPointerDownPos.x, e.clientY - canvasPointerDownPos.y);
            if (dragDist > 6) {
                return;
            }

            const sceneEl = document.querySelector("a-scene");
            if (sceneEl && sceneEl.camera) {
                sceneEl.camera.updateMatrixWorld(true);
                const rect = canvasWrapper.getBoundingClientRect();
                const mouse = new THREE.Vector2(
                    ((e.clientX - rect.left) / rect.width) * 2 - 1,
                    -((e.clientY - rect.top) / rect.height) * 2 + 1
                );
                const raycaster = new THREE.Raycaster();
                raycaster.setFromCamera(mouse, sceneEl.camera);

                // Interseção matemática exata com o domo 360° (esfera de raio 100)
                const skySphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 100);
                const hitPoint = new THREE.Vector3();
                const targetDistance = 5;
                let newPos = null;

                if (raycaster.ray.intersectSphere(skySphere, hitPoint)) {
                    const dist = Math.hypot(hitPoint.x, hitPoint.y, hitPoint.z) || 1;
                    newPos = {
                        x: parseFloat(((hitPoint.x / dist) * targetDistance).toFixed(3)),
                        y: parseFloat(((hitPoint.y / dist) * targetDistance).toFixed(3)),
                        z: parseFloat(((hitPoint.z / dist) * targetDistance).toFixed(3))
                    };
                } else {
                    const dir = raycaster.ray.direction.clone().normalize();
                    newPos = {
                        x: parseFloat((dir.x * targetDistance).toFixed(3)),
                        y: parseFloat((dir.y * targetDistance).toFixed(3)),
                        z: parseFloat((dir.z * targetDistance).toFixed(3))
                    };
                }

                applyHotspotReposition(newPos);
            }
        });
    }

    // Botão de Cancelar no HUD Flutuante de Reposicionamento
    const btnCancelReposition = document.getElementById("btn-cancel-reposition");
    if (btnCancelReposition) {
        btnCancelReposition.addEventListener("click", (e) => {
            e.stopPropagation();
            cancelRepositionHotspot();
        });
    }

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

    // Teclas de atalho para navegar entre cenas e cancelar reposicionamento
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && state.isRepositioningHotspot) {
            cancelRepositionHotspot();
            return;
        }
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

    const sceneLockedOverlay = document.getElementById("scene-locked-modal");
    if (sceneLockedOverlay) {
        sceneLockedOverlay.addEventListener("click", (e) => {
            if (e.target === sceneLockedOverlay) closeSceneLockedModal();
        });
    }

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
                const file = e.target.files[0];
                const allowedLogoTypes = ["image/png", "image/webp", "image/avif", "image/jpeg"];
                if (!allowedLogoTypes.includes(file.type)) {
                    showToast("Por favor, selecione imagens em formato PNG, WEBP, AVIF ou JPG.", "error");
                    return;
                }
                
                showToast("Fazendo upload da logo...", "info");
                const url = await uploadFileToServer(file, file.name);
                if (url) {
                    state.tour.logoUrl = url;
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
                const hasPrivacy = state.features ? (state.features.privacy_control ?? false) : false;
                if (!hasPrivacy) {
                    const minPrivacyPlan = getMinimumPlanForFeature("privacy_control", "Profissional");
                    selectPrivacy.value = state.tour.privacySettings === "disabled" ? "disabled" : "public";
                    if (passwordInputWrapper) passwordInputWrapper.style.display = "none";
                    openUpgradeModal(
                        `<i class="fa-solid fa-lock" style="color:#ff4444;"></i> Recurso Bloqueado: Privacidade por Senha`,
                        `A proteção de tours virtuais com senha de acesso personalizada é exclusiva a partir do <strong>Plano ${minPrivacyPlan}</strong>.<br><br>Faça o upgrade da sua assinatura para ter total controle de privacidade externa!`
                    );
                    return;
                }
                if (passwordInputWrapper) passwordInputWrapper.style.display = "block";
                if (inputPrivacyPassword) {
                    inputPrivacyPassword.focus();
                    state.tour.privacySettings = inputPrivacyPassword.value || "123456";
                }
            } else if (val === "disabled") {
                if (passwordInputWrapper) passwordInputWrapper.style.display = "none";
                state.tour.privacySettings = "disabled";
                saveTourToStorage();
                showToast("Link de visualização externa desativado!", "info");
            } else {
                if (passwordInputWrapper) passwordInputWrapper.style.display = "none";
                state.tour.privacySettings = null;
                saveTourToStorage();
                showToast("Link público ativado para o mundo!", "success");
            }
        });
    }

    if (inputPrivacyPassword) {
        inputPrivacyPassword.addEventListener("change", (e) => {
            state.tour.privacySettings = e.target.value.trim() || null;
            saveTourToStorage();
            showToast("Senha de acesso atualizada!", "success");
        });
    }

    const btnCopyPublicLink = document.getElementById("btn-copy-public-link");
    const btnTopbarCopyLink = document.getElementById("btn-topbar-copy-link");
    
    const copyLinkHandler = () => {
        const publicUrl = `${window.location.origin}${window.location.pathname}?id=${state.tour.tourId}&mode=view&v=1.3.8`;
        navigator.clipboard.writeText(publicUrl).then(() => {
            showToast("Link de visualização copiado para a área de transferência!", "success");
        }).catch(() => {
            showToast("Erro ao copiar link.", "error");
        });
    };

    if (btnCopyPublicLink) btnCopyPublicLink.addEventListener("click", copyLinkHandler);
    if (btnTopbarCopyLink) btnTopbarCopyLink.addEventListener("click", copyLinkHandler);

    // --- Google Street View Integration ---
    const btnGsvConnect = document.getElementById("btn-gsv-connect");
    const btnGsvPublishOpen = document.getElementById("btn-gsv-publish-open");
    const gsvPublishModal = document.getElementById("gsv-publish-modal");
    const btnCloseGsvModal = document.getElementById("btn-close-gsv-modal");
    const btnCancelGsv = document.getElementById("btn-cancel-gsv");
    const btnConfirmGsvPublish = document.getElementById("btn-confirm-gsv-publish");

    window.gsvConnectedCallback = () => {
        checkGSVConnectionStatus();
        showToast("Conta Google conectada com sucesso para o Street View!", "success");
    };

    if (btnGsvConnect) {
        btnGsvConnect.addEventListener("click", () => {
            const gsvQuota = state.features ? (state.features.gsv_projects_per_month ?? 0) : 0;
            if (gsvQuota === 0) {
                const minGsvPlan = getMinimumPlanForFeature("gsv_projects_per_month", "Básico");
                openUpgradeModal(
                    `<i class="fa-solid fa-lock" style="color:#ff4444;"></i> Recurso Bloqueado: Google Street View`,
                    `A integração com o Google Street View está disponível a partir do <strong>Plano ${minGsvPlan}</strong>.<br><br>Faça o upgrade da sua assinatura para conectar sua conta e publicar no Google Maps!`
                );
                return;
            }
            const width = 600;
            const height = 700;
            const left = (window.screen.width / 2) - (width / 2);
            const top = (window.screen.height / 2) - (height / 2);
            window.open("api/gsv_auth.php", "GoogleStreetViewAuth", `width=${width},height=${height},top=${top},left=${left}`);
        });
    }

    if (btnGsvPublishOpen) {
        btnGsvPublishOpen.addEventListener("click", async () => {
            const gsvQuota = state.features ? (state.features.gsv_projects_per_month ?? 0) : 0;
            if (gsvQuota === 0) {
                const minGsvPlan = getMinimumPlanForFeature("gsv_projects_per_month", "Básico");
                openUpgradeModal(
                    `<i class="fa-solid fa-lock" style="color:#ff4444;"></i> Recurso Bloqueado: Google Street View`,
                    `A publicação direta no Google Maps / Street View requer cotas ativas (disponíveis a partir do <strong>Plano ${minGsvPlan}</strong>).<br><br>Faça o upgrade da sua assinatura para desbloquear cotas mensais de publicação!`
                );
                return;
            }
            if (!state.tour || !state.tour.scenes || state.tour.scenes.length === 0) {
                showToast("Adicione pelo menos 1 cena 360° antes de publicar no Street View.", "warning");
                return;
            }
            if (gsvPublishModal) gsvPublishModal.classList.add("active");
        });
    }

    if (btnCloseGsvModal) btnCloseGsvModal.addEventListener("click", () => gsvPublishModal.classList.remove("active"));
    if (btnCancelGsv) btnCancelGsv.addEventListener("click", () => gsvPublishModal.classList.remove("active"));

    if (btnConfirmGsvPublish) {
        btnConfirmGsvPublish.addEventListener("click", async () => {
            const placeId = document.getElementById("gsv-input-place-id").value.trim();
            const lat = parseFloat(document.getElementById("gsv-input-lat").value) || 0;
            const lng = parseFloat(document.getElementById("gsv-input-lng").value) || 0;

            const progressContainer = document.getElementById("gsv-progress-container");
            const progressBar = document.getElementById("gsv-progress-bar");
            const progressStatus = document.getElementById("gsv-progress-status");

            if (progressContainer) progressContainer.style.display = "block";
            if (progressBar) progressBar.style.width = "30%";
            if (progressStatus) progressStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Conectando ao Google Street View API...';

            btnConfirmGsvPublish.disabled = true;

            try {
                const res = await fetch("api/gsv_publish.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        tourId: state.tour.tourId,
                        latitude: lat,
                        longitude: lng,
                        placeId: placeId
                    })
                });

                const data = await res.json();
                if (res.ok && data.success) {
                    if (progressBar) progressBar.style.width = "100%";
                    if (progressStatus) progressStatus.innerHTML = '<i class="fa-solid fa-circle-check" style="color:#00f2fe;"></i> Tour Publicado no Google Maps!';
                    showToast(`Sucesso! ${data.count} cena(s) 360° publicadas no Google Street View!`, "success");
                    setTimeout(() => {
                        if (gsvPublishModal) gsvPublishModal.classList.remove("active");
                        if (progressContainer) progressContainer.style.display = "none";
                        btnConfirmGsvPublish.disabled = false;
                    }, 2000);
                } else {
                    showToast(data.message || "Erro ao publicar no Google Street View.", "error");
                    if (progressContainer) progressContainer.style.display = "none";
                    btnConfirmGsvPublish.disabled = false;
                }
            } catch (err) {
                showToast("Erro de conexão ao publicar no GSV.", "error");
                if (progressContainer) progressContainer.style.display = "none";
                btnConfirmGsvPublish.disabled = false;
            }
        });
    }

    // --- Tampa de Tripé (Nadir Settings) ---
    const checkboxNadirEnabled = document.getElementById("checkbox-nadir-enabled");
    const nadirSubSettings = document.getElementById("nadir-sub-settings");
    const checkboxNadirUseLogo = document.getElementById("checkbox-nadir-use-logo");
    const nadirCustomUpload = document.getElementById("nadir-custom-upload");
    const nadirFileInput = document.getElementById("nadir-file-input");
    const nadirUploadZone = document.getElementById("nadir-upload-zone");
    const btnDeleteNadirImg = document.getElementById("btn-delete-nadir-img");
    const sliderNadirRadius = document.getElementById("slider-nadir-radius");
    const nadirRadiusValue = document.getElementById("nadir-radius-value");

    if (checkboxNadirEnabled) {
        checkboxNadirEnabled.addEventListener("change", (e) => {
            const hasNadir = state.features ? (state.features.nadir_patch ?? false) : false;
            if (!hasNadir) {
                checkboxNadirEnabled.checked = false;
                const minNadirPlan = getMinimumPlanForFeature("nadir_patch", "Básico");
                openUpgradeModal(
                    `<i class="fa-solid fa-lock" style="color:#ff4444;"></i> Recurso Bloqueado: Tampa de Tripé (Nadir)`,
                    `A <strong>Tampa de Tripé (Nadir)</strong> está disponível a partir do <strong>Plano ${minNadirPlan}</strong>.<br><br>Faça o upgrade agora para cobrir tripés e personalizar os rodapés de seus passeios virtuais!`
                );
                return;
            }
            state.tour.nadirSettings.enabled = e.target.checked;
            if (nadirSubSettings) nadirSubSettings.style.display = e.target.checked ? "flex" : "none";
            saveTourToStorage();
            renderNadirPatch();
        });
    }

    if (checkboxNadirUseLogo) {
        checkboxNadirUseLogo.addEventListener("change", (e) => {
            state.tour.nadirSettings.useLogo = e.target.checked;
            if (nadirCustomUpload) nadirCustomUpload.style.display = e.target.checked ? "none" : "flex";
            saveTourToStorage();
            renderNadirPatch();
        });
    }

    if (nadirUploadZone && nadirFileInput) {
        nadirUploadZone.addEventListener("click", () => nadirFileInput.click());
        nadirFileInput.addEventListener("change", async (e) => {
            if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                showToast("Fazendo upload da imagem do Nadir...", "info");
                const url = await uploadFileToServer(file, `nadir_${Date.now()}_${file.name}`);
                if (url) {
                    state.tour.nadirSettings.image = url;
                    updateSettingsSidebarUI();
                    saveTourToStorage();
                    renderNadirPatch();
                    showToast("Imagem do Nadir salva!", "success");
                } else {
                    showToast("Erro ao fazer upload da imagem.", "error");
                }
            }
        });
    }

    if (btnDeleteNadirImg) {
        btnDeleteNadirImg.addEventListener("click", () => {
            state.tour.nadirSettings.image = null;
            updateSettingsSidebarUI();
            saveTourToStorage();
            renderNadirPatch();
            showToast("Imagem do Nadir removida.", "info");
        });
    }

    if (sliderNadirRadius) {
        sliderNadirRadius.addEventListener("input", (e) => {
            const val = parseFloat(e.target.value);
            state.tour.nadirSettings.radius = val;
            if (nadirRadiusValue) nadirRadiusValue.textContent = `${val}m`;
            renderNadirPatch();
        });
        sliderNadirRadius.addEventListener("change", () => {
            saveTourToStorage();
        });
    }

    // --- Hotspots de Informações (Rich Media Editor Bindings) ---
    const typeSelect = document.getElementById("hotspot-type-select");
    const targetGroup = document.getElementById("hotspot-target-group");
    const infoGroup = document.getElementById("hotspot-info-group");
    if (typeSelect && targetGroup && infoGroup) {
        typeSelect.addEventListener("change", (e) => {
            const val = e.target.value;
            if (val === "portal") {
                targetGroup.style.display = "block";
                infoGroup.style.display = "none";
            } else {
                const hasInfo = state.features ? (state.features.rich_hotspots || state.features.text_markers) : false;
                if (!hasInfo) {
                    typeSelect.value = "portal";
                    targetGroup.style.display = "block";
                    infoGroup.style.display = "none";
                    const minInfoPlan = getMinimumPlanForFeature("rich_hotspots", "Básico");
                    openUpgradeModal(
                        `<i class="fa-solid fa-lock" style="color:#ff4444;"></i> Recurso Bloqueado: Hotspots de Informação`,
                        `A inserção de pontos informativos e tags com textos ricos está disponível a partir do <strong>Plano ${minInfoPlan}</strong>.<br><br>Faça upgrade para enriquecer seus passeios virtuais!`
                    );
                    return;
                }
                targetGroup.style.display = "none";
                infoGroup.style.display = "flex";
                
                // Exibir badge PRO dependendo do plano de galeria
                const hasMedia = state.features ? (state.features.image_gallery ?? false) : false;
                const badgeHotspotMedia = document.getElementById("badge-hotspot-media-pro");
                const uploadZone = document.getElementById("hotspot-media-upload-zone");
                if (badgeHotspotMedia && uploadZone) {
                    if (!hasMedia) {
                        badgeHotspotMedia.style.display = "inline-block";
                        uploadZone.style.opacity = "0.7";
                        uploadZone.title = "Disponível no Plano Profissional";
                    } else {
                        badgeHotspotMedia.style.display = "none";
                        uploadZone.style.opacity = "1";
                        uploadZone.title = "";
                    }
                }
            }
        });
    }

    // Upload de Imagem do Hotspot Info
    const mediaUploadZone = document.getElementById("hotspot-media-upload-zone");
    const mediaFileInput = document.getElementById("hotspot-media-file-input");
    const btnDeleteMedia = document.getElementById("btn-delete-hotspot-media");
    const mediaPreviewContainer = document.getElementById("hotspot-media-preview-container");
    const mediaPreviewImg = document.getElementById("hotspot-media-preview-img");

    if (mediaUploadZone && mediaFileInput) {
        mediaUploadZone.addEventListener("click", () => mediaFileInput.click());
        mediaFileInput.addEventListener("change", async (e) => {
            if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                showToast("Carregando imagem...", "info");
                const url = await uploadFileToServer(file, `hotspot_${Date.now()}_${file.name}`);
                if (url) {
                    window.pendingHotspotMediaUrl = url;
                    if (mediaPreviewImg) mediaPreviewImg.src = url;
                    if (mediaPreviewContainer) mediaPreviewContainer.style.display = "flex";
                    if (mediaUploadZone) mediaUploadZone.style.display = "none";
                    showToast("Imagem carregada com sucesso!", "success");
                } else {
                    showToast("Erro ao carregar imagem.", "error");
                }
            }
        });
    }

    if (btnDeleteMedia) {
        btnDeleteMedia.addEventListener("click", () => {
            window.pendingHotspotMediaUrl = null;
            if (mediaPreviewImg) mediaPreviewImg.src = "";
            if (mediaPreviewContainer) mediaPreviewContainer.style.display = "none";
            if (mediaUploadZone) mediaUploadZone.style.display = "block";
            showToast("Imagem removida.", "info");
        });
    }

    // Fechar Modal de Informações
    const btnCloseInfo = document.getElementById("btn-close-info-hotspot");
    const btnCloseInfoOk = document.getElementById("btn-close-info-hotspot-ok");
    if (btnCloseInfo) btnCloseInfo.addEventListener("click", closeInfoHotspotModal);
    if (btnCloseInfoOk) btnCloseInfoOk.addEventListener("click", closeInfoHotspotModal);

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
        inputSceneTitle.addEventListener("change", (e) => {
            if (!state.activeSceneId) return;
            saveSceneRename(state.activeSceneId, e.target.value);
        });
    }

    const inputInitialYaw = document.getElementById("input-initial-yaw");
    const quickDisplay = document.getElementById("quick-initial-yaw-display");

    // --- GESTÃO DE ÂNGULO INICIAL DA CENA (YAW / PITCH) ---
    function saveCurrentViewAsInitial() {
        if (!state.activeSceneId) return;
        const scene = state.tour.scenes.find(s => s.id === state.activeSceneId);
        if (!scene) return;

        const currentYaw = Math.round(state.activeYawAngle || 0);
        const currentPitch = Math.round(state.activePitchAngle || 0);

        scene.initialYaw = currentYaw;
        scene.initialPitch = currentPitch;

        if (inputInitialYaw) inputInitialYaw.value = currentYaw;
        if (quickDisplay) quickDisplay.textContent = `${currentYaw}°`;

        saveTourToStorage();
        showToast(`Ângulo inicial da cena salvo com sucesso! (${currentYaw}°)`, "success");
    }

    function previewInitialView() {
        if (!state.activeSceneId) return;
        const scene = state.tour.scenes.find(s => s.id === state.activeSceneId);
        if (!scene) return;

        applySceneInitialView(scene);
        showToast(`Câmera posicionada na visão inicial (${Math.round(scene.initialYaw || 0)}°).`, "info");
    }

    const btnSetInitialYawFloating = document.getElementById("btn-set-initial-view-floating");
    if (btnSetInitialYawFloating) {
        btnSetInitialYawFloating.addEventListener("click", saveCurrentViewAsInitial);
    }

    const btnQuickSetInitialYaw = document.getElementById("btn-quick-set-initial-yaw");
    if (btnQuickSetInitialYaw) {
        btnQuickSetInitialYaw.addEventListener("click", saveCurrentViewAsInitial);
    }

    const btnQuickPreviewInitialYaw = document.getElementById("btn-quick-preview-initial-yaw");
    if (btnQuickPreviewInitialYaw) {
        btnQuickPreviewInitialYaw.addEventListener("click", previewInitialView);
    }

    const btnSetInitialYaw = document.getElementById("btn-set-initial-yaw");
    if (btnSetInitialYaw) {
        btnSetInitialYaw.addEventListener("click", saveCurrentViewAsInitial);
    }

    if (inputInitialYaw) {
        inputInitialYaw.addEventListener("input", (e) => {
            if (!state.activeSceneId) return;
            const scene = state.tour.scenes.find(s => s.id === state.activeSceneId);
            if (scene) {
                const val = parseFloat(e.target.value || 0);
                scene.initialYaw = val;
                const quickDisplay = document.getElementById("quick-initial-yaw-display");
                if (quickDisplay) quickDisplay.textContent = `${Math.round(val)}°`;
                saveTourToStorage();
            }
        });
    }

    // --- CONTROLE DE GIROSCÓPIO MOBILE ---
    const btnToggleGyro = document.getElementById("btn-toggle-gyro");
    if (btnToggleGyro) {
        btnToggleGyro.addEventListener("click", toggleGyroscope);
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
function openToolTab(tabName, forceOpen = false) {
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

    // Se o drawer já está aberto nesta mesma aba e não for abertura forçada (ex: restore no F5), recolhe!
    if (!forceOpen && drawer.classList.contains("open") && drawer.dataset.activeTab === tabName) {
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

    // Sincroniza renderização ao abrir a aba
    if (tabName === 'hotspots') {
        renderHotspotsList();
    } else if (tabName === 'scenes') {
        renderScenesList();
    }

    // Redimensionamento suave do A-Frame Three.js
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 320);
}

function closeToolDrawer(silent = false) {
    const drawer = document.getElementById("editor-drawer");
    if (!drawer) return;

    drawer.classList.remove("open");
    drawer.dataset.activeTab = "";

    document.querySelectorAll(".tool-rail-btn[data-tab]").forEach(btn => {
        btn.classList.remove("active");
    });

    localStorage.setItem("editor_drawer_open", "false");

    if (!silent && typeof showToast === "function") {
        showToast("Painel recolhido.", "info");
    }

    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 320);
}

function restoreEditorDrawerState() {
    const savedActiveTab = localStorage.getItem("editor_active_tab") || "scenes";
    const savedDrawerOpen = localStorage.getItem("editor_drawer_open");

    if (savedDrawerOpen === "false") {
        closeToolDrawer(true);
    } else {
        openToolTab(savedActiveTab, true);
    }
}

function toggleSidebar() {
    const drawer = document.getElementById("editor-drawer");
    if (!drawer) return;

    if (drawer.classList.contains("open")) {
        closeToolDrawer();
    } else {
        const lastTab = localStorage.getItem("editor_active_tab") || "scenes";
        openToolTab(lastTab, true);
    }
}

// Vinculação Global
window.openToolTab = openToolTab;
window.closeToolDrawer = closeToolDrawer;
window.restoreEditorDrawerState = restoreEditorDrawerState;
window.toggleSidebar = toggleSidebar;

// --- AUXILIAR: PROCESSAMENTO E OTIMIZAÇÃO DE MÍDIA 360 ---
function getMaxTextureSize() {
    try {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        if (gl) {
            return gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
        }
    } catch (e) {}
    return 4096;
}

function processAndOptimizeFile(file) {
    return new Promise(async (resolve) => {
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

        const maxTexture = getMaxTextureSize();
        // Permitir ultra-definição de até 8K (8192px) de acordo com o limite da GPU do usuário
        const MAX_WIDTH = Math.min(maxTexture, 8192);

        // 1. Verificar se é um arquivo nativo .INSP / .DNG (Insta360) ou imagem de lente dupla
        if (window.Stitcher360 && window.Stitcher360.isDualFisheyeFile(file)) {
            try {
                if (typeof showToast === "function") {
                    showToast(`Costurando mídia 360° Insta360 (${file.name}) em alta definição via WebGL...`, "info");
                }
                const result = await window.Stitcher360.convertToEquirectangular(file, { width: MAX_WIDTH, quality: 0.96 });
                const optimizedUrl = URL.createObjectURL(result.blob);
                const cleanTitle = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                
                if (typeof showToast === "function") {
                    showToast(`Foto 360° costurada com sucesso em alta definição!`, "success");
                }

                resolve({
                    title: cleanTitle,
                    type: "image",
                    sourceUrl: optimizedUrl,
                    blob: result.blob,
                    isStitched: true
                });
                return;
            } catch (err) {
                console.warn("Tentando fallback padrão para imagem:", err);
            }
        }

        // 2. Se for imagem padrão, carregamos e só redimensionamos se ultrapassar o limite real da GPU (até 8K)
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = async function() {
                if (img.width > MAX_WIDTH) {
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    
                    canvas.width = MAX_WIDTH;
                    // Mantém a proporção esférica (geralmente 2:1)
                    canvas.height = Math.round((img.height / img.width) * MAX_WIDTH);
                    
                    // Suavização bilinear de alta fidelidade ao redimensionar
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = "high";
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    canvas.toBlob(function(blob) {
                        const optimizedUrl = URL.createObjectURL(blob);
                        resolve({
                            title: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
                            type: "image",
                            sourceUrl: optimizedUrl,
                            blob: blob
                        });
                    }, "image/jpeg", 0.96); // Altíssima fidelidade e nitidez visual
                } else {
                    // Se for menor ou igual ao limite (ex: fotos nativas 5.7K, 6K ou 8K),
                    // NÃO recompila nem degrada: preserva 100% dos pixels e nitidez original!
                    const objectUrl = URL.createObjectURL(file);
                    resolve({
                        title: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
                        type: "image",
                        sourceUrl: objectUrl,
                        file: file
                    });
                }
            };
            img.onerror = async function() {
                // Fallback para conversão WebGL caso o carregamento nativo falhe
                if (window.Stitcher360) {
                    try {
                        const result = await window.Stitcher360.convertToEquirectangular(file, { width: MAX_WIDTH, quality: 0.96 });
                        const optimizedUrl = URL.createObjectURL(result.blob);
                        const cleanTitle = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                        resolve({
                            title: cleanTitle,
                            type: "image",
                            sourceUrl: optimizedUrl,
                            blob: result.blob,
                            isStitched: true
                        });
                        return;
                    } catch (e) {
                        console.error("Erro no fallback Stitcher360:", e);
                    }
                }
                resolve({
                    title: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
                    type: "image",
                    sourceUrl: "",
                    error: "Formato de imagem inválido ou não suportado pelo navegador."
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

    const maxAllowed = state.features && typeof state.features.max_scenes !== 'undefined' ? state.features.max_scenes : 10;
    const currentCount = (state.tour && state.tour.scenes) ? state.tour.scenes.length : 0;
    const planName = (state.features && state.features.name) || "Iniciante";

    if (maxAllowed !== -1 && currentCount >= maxAllowed + 1) {
        const fileInput = document.getElementById("file-input");
        if (fileInput) fileInput.value = "";
        const nextPlan = getUpgradePlanForScenes(maxAllowed);
        showToast(`Limite excedido! O plano ${planName} permite ${maxAllowed} cenas (+1 de tolerância). Faça upgrade para adicionar mais!`, "warning");
        openUpgradeModal(
            `<i class="fa-solid fa-lock" style="color:#ff4444;"></i> Limite Máximo de Cenas Atingido!`,
            `Você já atingiu o limite de cenas do plano <strong>${planName}</strong> (${maxAllowed} cenas ativas + 1 cena extra de tolerância já salva).<br><br>Para continuar adicionando novas fotos 360° a este tour, faça o upgrade para o <strong>Plano ${nextPlan.name}</strong> (até ${nextPlan.scenes}) ou <strong>Plano Profissional</strong>!`
        );
        return;
    }

    let filesList = Array.from(files);
    if (maxAllowed !== -1 && (currentCount + filesList.length) > maxAllowed + 1) {
        const slotsLeft = Math.max(0, (maxAllowed + 1) - currentCount);
        filesList = filesList.slice(0, slotsLeft);
        const nextPlan = getUpgradePlanForScenes(maxAllowed);
        showToast(`Limite atingido! Apenas ${slotsLeft} foto(s) aceita(s) dentro da tolerância do plano ${planName}.`, "warning");
        setTimeout(() => {
            openUpgradeModal(
                `<i class="fa-solid fa-lock" style="color:#ff4444;"></i> Limite Máximo de Cenas Atingido!`,
                `Você atingiu o limite de fotos 360° do plano <strong>${planName}</strong> (${maxAllowed} ativas + 1 cena extra de tolerância).<br><br>Faça upgrade para o <strong>Plano ${nextPlan.name}</strong> (${nextPlan.scenes}) ou <strong>Plano Profissional</strong> para desbloquear fotos ilimitadas!`
            );
        }, 1500);
    }

    if (filesList.length === 0) return;

    showToast("Processando e otimizando mídias 360°... Aguarde.", "info");
    
    const promises = filesList.map(file => processAndOptimizeFile(file));
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
        const maxAllowed = state.features && typeof state.features.max_scenes !== 'undefined' ? state.features.max_scenes : 10;
        const maxScenesText = maxAllowed > 0 ? maxAllowed : '∞';
        const orderText = `${index + 1}/${maxScenesText}`;

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
                <span class="scene-thumb-index">${index + 1}</span>
                <i class="fa-solid ${scene.type === 'video' ? 'fa-video' : 'fa-image'}" style="${scene.type === 'image' && scene.sourceUrl.startsWith('blob') ? 'display: none;' : ''}"></i>
            </div>
            <div class="scene-info">
                <div class="scene-title-wrapper" id="scene-title-wrapper-${scene.id}">
                    <h4 class="scene-title" id="scene-title-heading-${scene.id}" title="Duplo clique para renomear">${locked ? '🔒 ' : ''}${scene.title}</h4>
                </div>
                <div class="scene-meta">
                    <span class="scene-order-badge ${locked ? 'locked' : ''}" title="Cena ${index + 1} de ${maxScenesText}">${orderText}</span>
                    <i class="fa-solid ${scene.type === 'video' ? 'fa-film' : 'fa-camera'}"></i>
                    <span>${scene.type === 'video' ? 'Vídeo 360°' : 'Foto 360°'}</span>
                </div>
                ${lockedBadge}
            </div>
            ${isStart && !locked ? '<span class="badge-start-scene">Início</span>' : ''}
            <div class="scene-actions">
                ${!locked ? `<button class="action-icon-btn btn-rename" title="Renomear Cena"><i class="fa-solid fa-pen-to-square"></i></button>` : ''}
                ${!isStart && !locked ? `<button class="action-icon-btn btn-star" title="Definir como Cena Inicial"><i class="fa-solid fa-star"></i></button>` : ''}
                <button class="action-icon-btn btn-delete" title="Excluir Cena"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;

        // Evento de clique para ativar a cena ou abrir modal de upgrade
        card.addEventListener("click", (e) => {
            if (e.target.closest(".scene-actions") || e.target.closest(".scene-rename-wrapper")) return;
            if (locked) {
                openSceneLockedModal(scene, index);
                return;
            }
            setActiveScene(scene.id);
        });

        // Ações do Card
        const btnRename = card.querySelector(".btn-rename");
        if (btnRename) {
            btnRename.addEventListener("click", (e) => {
                e.stopPropagation();
                startInlineSceneRename(scene.id, card);
            });
        }

        const headingEl = card.querySelector(`#scene-title-heading-${scene.id}`);
        if (headingEl && !locked) {
            headingEl.addEventListener("dblclick", (e) => {
                e.stopPropagation();
                startInlineSceneRename(scene.id, card);
            });
        }

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

// --- FUNÇÕES DE RENOMEAÇÃO DE CENA (INLINE E CABEÇALHO) ---
function startInlineSceneRename(sceneId, cardEl) {
    const scene = state.tour.scenes.find(s => s.id === sceneId);
    if (!scene) return;

    const wrapper = cardEl ? cardEl.querySelector(`#scene-title-wrapper-${sceneId}`) : document.getElementById(`scene-title-wrapper-${sceneId}`);
    if (!wrapper) return;

    // Se já estiver editando, não recria
    if (wrapper.querySelector(".scene-rename-wrapper")) return;

    const currentTitle = scene.title || "";
    wrapper.innerHTML = `
        <div class="scene-rename-wrapper">
            <input type="text" class="scene-rename-input" id="input-rename-${sceneId}" value="${currentTitle.replace(/"/g, '&quot;')}" maxlength="80">
            <button class="btn-inline-action btn-inline-save" id="btn-save-rename-${sceneId}" title="Salvar (Enter)">
                <i class="fa-solid fa-check"></i>
            </button>
            <button class="btn-inline-action btn-inline-cancel" id="btn-cancel-rename-${sceneId}" title="Cancelar (Esc)">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
    `;

    const input = wrapper.querySelector(`#input-rename-${sceneId}`);
    const btnSave = wrapper.querySelector(`#btn-save-rename-${sceneId}`);
    const btnCancel = wrapper.querySelector(`#btn-cancel-rename-${sceneId}`);

    if (input) {
        input.focus();
        input.select();

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                saveSceneRename(sceneId, input.value);
            } else if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                renderScenesList();
            }
        });
    }

    if (btnSave) {
        btnSave.addEventListener("click", (e) => {
            e.stopPropagation();
            if (input) saveSceneRename(sceneId, input.value);
        });
    }

    if (btnCancel) {
        btnCancel.addEventListener("click", (e) => {
            e.stopPropagation();
            renderScenesList();
        });
    }
}

async function saveSceneRename(sceneId, newTitle) {
    const cleanTitle = (newTitle || "").trim();
    if (!cleanTitle) {
        showToast("O nome da cena não pode ficar vazio.", "warning");
        return;
    }

    const scene = state.tour.scenes.find(s => s.id === sceneId);
    if (!scene) return;

    const oldTitle = scene.title;
    scene.title = cleanTitle;

    // Se a cena ativa for a renomeada, atualiza imediatamente os cabeçalhos
    if (state.activeSceneId === sceneId) {
        const sceneIndex = state.tour.scenes.findIndex(s => s.id === sceneId);
        const maxAllowed = state.features && typeof state.features.max_scenes !== 'undefined' ? state.features.max_scenes : 10;
        const maxScenesText = maxAllowed > 0 ? maxAllowed : '∞';
        const sceneNumberPrefix = sceneIndex !== -1 ? `Cena ${sceneIndex + 1}/${maxScenesText}: ` : '';

        const sceneDisplayTitle = document.getElementById("scene-display-title");
        if (sceneDisplayTitle) {
            sceneDisplayTitle.textContent = `${sceneNumberPrefix}${cleanTitle} (${scene.type === 'video' ? 'Vídeo 360°' : 'Foto 360°'})`;
        }

        const inputSceneTitle = document.getElementById("input-scene-title");
        if (inputSceneTitle) inputSceneTitle.value = cleanTitle;

        const activeSceneNameInput = document.getElementById("hotspots-active-scene-name");
        if (activeSceneNameInput) {
            activeSceneNameInput.value = `${cleanTitle} (${scene.type === 'video' ? 'Vídeo 360°' : 'Foto 360°'})`;
        }
    }

    // Salvar estado atualizado
    await saveTourToStorage();

    // Re-renderizar lista e carrossel
    renderScenesList();
    renderScenesCarousel();

    // Se tiver portais em outras cenas com o rótulo padrão "Ir para [oldTitle]", atualiza também
    state.tour.scenes.forEach(s => {
        if (s.hotspots) {
            s.hotspots.forEach(h => {
                if (h.type === "portal" && h.targetSceneId === sceneId) {
                    if (!h.label || h.label === `Ir para ${oldTitle}`) {
                        h.label = `Ir para ${cleanTitle}`;
                    }
                }
            });
        }
    });

    showToast(`Cena renomeada para "${cleanTitle}" com sucesso!`, "success");
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

    const btnSetInitialYawFloating = document.getElementById("btn-set-initial-view-floating");
    const quickCard = document.getElementById("quick-scene-view-card");

    if (isEdit) {
        btnModeEdit.classList.add("active");
        btnModeView.classList.remove("active");
        cursor.setAttribute("visible", "true"); // Mostra cursor de mira
        btnAddHotspot.style.display = "flex";
        if (btnSetInitialYawFloating) btnSetInitialYawFloating.style.display = "flex";
        if (quickCard) quickCard.style.display = "block";
        editorHint.style.display = "flex";
        document.body.classList.remove("preview-mode");
    } else {
        btnModeEdit.classList.remove("active");
        btnModeView.classList.add("active");
        cursor.setAttribute("visible", "false"); // Esconde cursor de mira
        btnAddHotspot.style.display = "none";
        if (btnSetInitialYawFloating) btnSetInitialYawFloating.style.display = "none";
        if (quickCard) quickCard.style.display = "none";
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
function triggerHotspotCreationModal() {
    if (!state.tour || !state.tour.scenes || state.tour.scenes.length === 0) {
        showToast("Você precisa ter pelo menos 1 cena carregada para criar hotspots!", "error");
        return;
    }

    // Calcula posição 3D na frente da câmera (direção que o usuário está olhando)
    const camera = document.getElementById("camera");
    let targetDistance = 5;
    let pos = { x: 0, y: 0, z: -targetDistance };
    if (camera && camera.object3D) {
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyQuaternion(camera.object3D.quaternion);
        pos = {
            x: parseFloat((dir.x * targetDistance).toFixed(3)),
            y: parseFloat((dir.y * targetDistance).toFixed(3)),
            z: parseFloat((dir.z * targetDistance).toFixed(3))
        };
    }
    state.pendingHotspotPos = pos;
    state.isAddingHotspot = false;
    state.isRepositioningHotspot = false;
    updateRepositionUI(false);

    openHotspotModal(null);
}

function startAddingHotspot() {
    triggerHotspotCreationModal();
}

function cancelAddingHotspot() {
    state.isAddingHotspot = false;
    state.isRepositioningHotspot = false;
    updateRepositionUI(false);
    state.pendingHotspotPos = null;
    const btn = document.getElementById("btn-add-hotspot");
    if (btn) {
        btn.classList.remove("active");
        btn.innerHTML = `<i class="fa-solid fa-plus-circle"></i> <span>Adicionar Hotspot</span>`;
    }
}

function openHotspotModal(editingHotspotId = null) {
    const modal = document.getElementById("hotspot-modal");
    const select = document.getElementById("hotspot-target");
    const labelInput = document.getElementById("hotspot-label");
    const editingInput = document.getElementById("editing-hotspot-id");
    const titleEl = document.getElementById("hotspot-modal-title");
    const saveBtn = document.getElementById("btn-save-hotspot");
    
    const typeSelect = document.getElementById("hotspot-type-select");
    const targetGroup = document.getElementById("hotspot-target-group");
    const infoGroup = document.getElementById("hotspot-info-group");
    const infoTitle = document.getElementById("hotspot-info-title");
    const infoDesc = document.getElementById("hotspot-info-desc");
    const mediaUploadZone = document.getElementById("hotspot-media-upload-zone");
    const mediaPreviewContainer = document.getElementById("hotspot-media-preview-container");
    const mediaPreviewImg = document.getElementById("hotspot-media-preview-img");

    const iconStyleSelect = document.getElementById("hotspot-icon-style");
    const colorInput = document.getElementById("hotspot-custom-color-input");
    const colorHexSpan = document.getElementById("hotspot-color-hex");
    const swatchBtns = document.querySelectorAll(".color-swatch-btn");

    if (!modal || !select || !labelInput) return;

    // Resetar campos de informações
    window.pendingHotspotMediaUrl = null;
    if (infoTitle) infoTitle.value = "";
    if (infoDesc) infoDesc.value = "";
    if (mediaPreviewImg) mediaPreviewImg.src = "";
    if (mediaPreviewContainer) mediaPreviewContainer.style.display = "none";
    if (mediaUploadZone) mediaUploadZone.style.display = "block";

    // Limpa e popula o select e a grade de miniaturas com as outras cenas
    select.innerHTML = "";
    const thumbsGrid = document.getElementById("hotspot-target-thumbs-grid");
    const selectedNameSpan = document.getElementById("hotspot-target-selected-name");
    if (thumbsGrid) thumbsGrid.innerHTML = "";

    const maxAllowed = state.features && typeof state.features.max_scenes !== 'undefined' ? state.features.max_scenes : 10;
    const maxScenesText = maxAllowed > 0 ? maxAllowed : '∞';

    const otherScenes = [];
    if (state.tour && state.tour.scenes) {
        state.tour.scenes.forEach((scene, sceneIdx) => {
            if (scene.id !== state.activeSceneId) {
                const option = document.createElement("option");
                option.value = scene.id;
                option.textContent = scene.title;
                select.appendChild(option);
                otherScenes.push({ scene, originalIndex: sceneIdx });
            }
        });
    }

    if (otherScenes.length === 0) {
        const emptyOption = document.createElement("option");
        emptyOption.value = "";
        emptyOption.textContent = "Nenhuma outra cena cadastrada (adicione mais cenas)";
        emptyOption.disabled = true;
        emptyOption.selected = true;
        select.appendChild(emptyOption);

        if (thumbsGrid) {
            thumbsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); font-size: 12px; padding: 20px;">Nenhuma outra foto 360° disponível no tour.<br><small style="opacity: 0.7;">Faça upload de mais fotos para criar portais de navegação.</small></div>`;
        }
        if (selectedNameSpan) selectedNameSpan.textContent = "Nenhuma";
    }

    // Função interna para selecionar destino na grade de miniaturas
    const applyTargetSelection = (targetSceneId, autoUpdateLabel = false) => {
        select.value = targetSceneId;
        const targetObj = otherScenes.find(o => o.scene.id === targetSceneId);
        const targetScene = targetObj ? targetObj.scene : null;

        if (thumbsGrid) {
            thumbsGrid.querySelectorAll(".hotspot-target-thumb-card").forEach(c => {
                const isThis = c.dataset.id === targetSceneId;
                c.classList.toggle("active", isThis);
                const checkEl = c.querySelector(".hotspot-target-badge-check");
                if (checkEl) checkEl.style.display = isThis ? "flex" : "none";
            });
        }

        if (selectedNameSpan) {
            selectedNameSpan.textContent = targetScene ? targetScene.title : "Selecione";
        }

        const returnTargetNameSpan = document.getElementById("hotspot-return-target-name");
        if (returnTargetNameSpan) {
            returnTargetNameSpan.textContent = targetScene ? `"${targetScene.title}"` : "Cena de Destino";
        }

        if (autoUpdateLabel && targetScene) {
            labelInput.value = "Ir para " + targetScene.title;
        }
    };

    // Renderizar os cards de miniatura fotográfica na grade
    if (thumbsGrid && otherScenes.length > 0) {
        otherScenes.forEach(({ scene, originalIndex }) => {
            const isLocked = isSceneLocked(originalIndex);
            const posBadgeText = `${originalIndex + 1}/${maxScenesText}`;

            const card = document.createElement("div");
            card.className = `hotspot-target-thumb-card ${isLocked ? 'locked' : ''}`;
            card.dataset.id = scene.id;

            let imgHtml = "";
            if (scene.type === "image" && scene.sourceUrl) {
                imgHtml = `<img src="${scene.sourceUrl}" alt="${scene.title}" onerror="this.style.display='none'">`;
            } else {
                imgHtml = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#00f2fe;font-size:20px;"><i class="fa-solid fa-video"></i></div>`;
            }

            const lockedOverlay = isLocked ? `<div class="hotspot-target-locked-overlay"><i class="fa-solid fa-lock"></i></div>` : '';

            card.innerHTML = `
                <div class="hotspot-target-thumb-img-wrap">
                    ${imgHtml}
                    ${lockedOverlay}
                    <span class="hotspot-target-badge-pos">${posBadgeText}</span>
                    <span class="hotspot-target-badge-check" style="display: none;"><i class="fa-solid fa-check"></i></span>
                </div>
                <div class="hotspot-target-thumb-meta">
                    <span class="hotspot-target-thumb-title" title="${scene.title}">${isLocked ? '🔒 ' : ''}${scene.title}</span>
                </div>
            `;

            card.addEventListener("click", () => {
                if (isLocked) {
                    showToast(`A cena ${posBadgeText} está bloqueada pelo limite do seu plano atual.`, "warning");
                }
                const isCreation = !document.getElementById("editing-hotspot-id").value;
                applyTargetSelection(scene.id, isCreation);
            });

            thumbsGrid.appendChild(card);
        });
    }

    const bidirectionalGroup = document.getElementById("hotspot-bidirectional-group");
    const returnCheckbox = document.getElementById("hotspot-create-return");

    if (editingHotspotId) {
        // Modo Edição
        const currentScene = state.tour.scenes.find(s => s.id === state.activeSceneId);
        const hotspot = currentScene ? currentScene.hotspots.find(h => h.id === editingHotspotId) : null;
        
        if (editingInput) editingInput.value = editingHotspotId;
        if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Configurar Hotspot / Portal`;
        if (saveBtn) saveBtn.textContent = "Salvar Alterações";
        if (bidirectionalGroup) bidirectionalGroup.style.display = "none";
        
        if (hotspot) {
            labelInput.value = hotspot.label || "";
            const hType = hotspot.type || "portal";
            if (typeSelect) typeSelect.value = hType;
            
            if (hType === "portal") {
                if (targetGroup) targetGroup.style.display = "block";
                if (infoGroup) infoGroup.style.display = "none";
                applyTargetSelection(hotspot.targetSceneId || (otherScenes[0] ? otherScenes[0].scene.id : ""), false);
            } else {
                if (targetGroup) targetGroup.style.display = "none";
                if (infoGroup) infoGroup.style.display = "flex";
                if (infoTitle) infoTitle.value = hotspot.infoTitle || "";
                if (infoDesc) infoDesc.value = hotspot.infoDesc || "";
                
                if (hotspot.infoMediaUrl) {
                    window.pendingHotspotMediaUrl = hotspot.infoMediaUrl;
                    if (mediaPreviewImg) mediaPreviewImg.src = hotspot.infoMediaUrl;
                    if (mediaPreviewContainer) mediaPreviewContainer.style.display = "flex";
                    if (mediaUploadZone) mediaUploadZone.style.display = "none";
                }
                
                // Exibir badge PRO dependendo do plano
                const hasMedia = state.features ? (state.features.image_gallery ?? false) : false;
                const badgeHotspotMedia = document.getElementById("badge-hotspot-media-pro");
                const uploadZone = document.getElementById("hotspot-media-upload-zone");
                if (badgeHotspotMedia && uploadZone) {
                    if (!hasMedia) {
                        badgeHotspotMedia.style.display = "inline-block";
                        uploadZone.style.opacity = "0.5";
                        uploadZone.style.pointerEvents = "none";
                    } else {
                        badgeHotspotMedia.style.display = "none";
                        uploadZone.style.opacity = "1";
                        uploadZone.style.pointerEvents = "auto";
                    }
                }
            }

            // Design / Estilo e Cor
            const activeColor = hotspot.customColor || "#ffffff";
            if (iconStyleSelect) iconStyleSelect.value = hotspot.iconStyle || "ring";
            if (colorInput) colorInput.value = activeColor;
            if (colorHexSpan) colorHexSpan.textContent = activeColor.toUpperCase();
            swatchBtns.forEach(btn => {
                btn.classList.toggle("active", btn.dataset.color.toLowerCase() === activeColor.toLowerCase());
            });
        }
    } else {
        // Modo Criação
        if (editingInput) editingInput.value = "";
        if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-location-dot"></i> Configurar Hotspot / Portal`;
        if (saveBtn) saveBtn.textContent = "Criar Hotspot";
        if (typeSelect) typeSelect.value = "portal";
        if (targetGroup) targetGroup.style.display = "block";
        if (infoGroup) infoGroup.style.display = "none";
        
        if (bidirectionalGroup) {
            bidirectionalGroup.style.display = otherScenes.length > 0 ? "block" : "none";
        }
        if (returnCheckbox) returnCheckbox.checked = true;

        // Sugestão automática de cena e título
        if (otherScenes.length > 0) {
            applyTargetSelection(otherScenes[0].scene.id, true);
        } else {
            labelInput.value = "";
            if (selectedNameSpan) selectedNameSpan.textContent = "Nenhuma";
        }

        // Design padrão
        if (iconStyleSelect) iconStyleSelect.value = "ring";
        if (colorInput) colorInput.value = "#ffffff";
        if (colorHexSpan) colorHexSpan.textContent = "#FFFFFF";
        swatchBtns.forEach(btn => {
            btn.classList.toggle("active", btn.dataset.color.toLowerCase() === "#ffffff");
        });
    }

    // Listener para atualizar título automaticamente caso o select oculto seja alterado
    select.onchange = () => {
        applyTargetSelection(select.value, !document.getElementById("editing-hotspot-id").value);
    };

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
    const type = document.getElementById("hotspot-type-select") ? document.getElementById("hotspot-type-select").value : "portal";
    const targetSceneId = document.getElementById("hotspot-target").value;
    const infoTitle = document.getElementById("hotspot-info-title") ? document.getElementById("hotspot-info-title").value.trim() : "";
    const infoDesc = document.getElementById("hotspot-info-desc") ? document.getElementById("hotspot-info-desc").value.trim() : "";
    const mediaUrl = window.pendingHotspotMediaUrl || null;
    const editingHotspotId = document.getElementById("editing-hotspot-id") ? document.getElementById("editing-hotspot-id").value : "";

    const iconStyle = document.getElementById("hotspot-icon-style") ? document.getElementById("hotspot-icon-style").value : "ring";
    const customColor = document.getElementById("hotspot-custom-color-input") ? document.getElementById("hotspot-custom-color-input").value : "#ffffff";

    if (!label) {
        showToast("Por favor, digite uma descrição do Tooltip.", "warning");
        return;
    }

    if (type === "portal" && !targetSceneId) {
        showToast("Nenhuma cena selecionada para o destino. Carregue mais cenas para vincular.", "warning");
        return;
    }
    
    if (type === "info" && !infoTitle) {
        showToast("Por favor, digite um título para a informação.", "warning");
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
            hotspot.type = type;
            hotspot.customColor = customColor;
            hotspot.iconStyle = iconStyle;
            if (type === "portal") {
                hotspot.targetSceneId = targetSceneId;
                delete hotspot.infoTitle;
                delete hotspot.infoDesc;
                delete hotspot.infoMediaUrl;
            } else {
                hotspot.infoTitle = infoTitle;
                hotspot.infoDesc = infoDesc;
                hotspot.infoMediaUrl = mediaUrl;
                delete hotspot.targetSceneId;
            }
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
        id: "hotspot-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
        type: type,
        position: state.pendingHotspotPos || { x: 0, y: 0, z: -5 },
        label: label,
        customColor: customColor,
        iconStyle: iconStyle
    };
    
    if (type === "portal") {
        newHotspot.targetSceneId = targetSceneId;
    } else {
        newHotspot.infoTitle = infoTitle;
        newHotspot.infoDesc = infoDesc;
        newHotspot.infoMediaUrl = mediaUrl;
    }

    currentScene.hotspots.push(newHotspot);
    state.selectedHotspotId = newHotspot.id;

    // Criar portal de retorno automático na cena de destino (Bidirecional)
    let returnCreated = false;
    let targetSceneTitle = "";
    const createReturnCheckbox = document.getElementById("hotspot-create-return");
    const shouldCreateReturn = createReturnCheckbox ? createReturnCheckbox.checked : true;

    if (type === "portal" && targetSceneId && shouldCreateReturn) {
        const targetScene = state.tour.scenes.find(s => s.id === targetSceneId);
        if (targetScene && targetScene.id !== currentScene.id) {
            if (!targetScene.hotspots) targetScene.hotspots = [];
            targetSceneTitle = targetScene.title || "Cena";

            // Vetor diametralmente oposto no plano horizontal (180°): (-x, y, -z)
            const forwardPos = newHotspot.position;
            const returnPos = {
                x: parseFloat((-forwardPos.x).toFixed(3)),
                y: parseFloat((forwardPos.y).toFixed(3)),
                z: parseFloat((-forwardPos.z).toFixed(3))
            };

            const returnHotspot = {
                id: "hotspot-" + Date.now() + "-ret-" + Math.random().toString(36).substr(2, 4),
                type: "portal",
                targetSceneId: currentScene.id,
                position: returnPos,
                label: `Voltar para ${currentScene.title}`,
                customColor: customColor,
                iconStyle: iconStyle
            };

            targetScene.hotspots.push(returnHotspot);
            returnCreated = true;
        }
    }
    
    saveTourToStorage();
    renderHotspots(currentScene.hotspots);
    renderHotspotsList();
    closeHotspotModal();

    if (returnCreated) {
        showToast(`Portal criado! Portal de retorno adicionado em "${targetSceneTitle}".`, "success");
    } else {
        showToast(`Portal "${label}" criado com sucesso!`, "success");
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
    const list = document.getElementById("hotspots-list");
    const countBadge = document.getElementById("hotspots-count");
    const activeSceneNameInput = document.getElementById("hotspots-active-scene-name");

    if (!list || !countBadge) return;

    if (!state.activeSceneId) {
        if (activeSceneNameInput) activeSceneNameInput.value = "Nenhuma cena selecionada";
        list.innerHTML = `<div style="text-align: center; color: var(--text-secondary); font-size: 12px; padding: 24px 10px;">Nenhuma cena selecionada.</div>`;
        countBadge.textContent = "0";
        return;
    }

    const currentScene = state.tour.scenes.find(s => s.id === state.activeSceneId);
    if (!currentScene) {
        if (activeSceneNameInput) activeSceneNameInput.value = "Cena não encontrada";
        list.innerHTML = `<div style="text-align: center; color: var(--text-secondary); font-size: 12px; padding: 24px 10px;">Cena não encontrada.</div>`;
        countBadge.textContent = "0";
        return;
    }

    if (activeSceneNameInput) {
        activeSceneNameInput.value = `${currentScene.title} (${currentScene.type === 'video' ? 'Vídeo 360°' : 'Foto 360°'})`;
    }

    const hotspots = currentScene.hotspots || [];
    countBadge.textContent = hotspots.length;

    if (hotspots.length === 0) {
        list.innerHTML = `<div style="text-align: center; color: var(--text-secondary); font-size: 12px; padding: 24px 10px;">Nenhum hotspot criado nesta cena.</div>`;
        return;
    }

    list.innerHTML = "";
    hotspots.forEach(hotspot => {
        const isSelected = state.selectedHotspotId === hotspot.id;
        const isRepositioning = isSelected && state.isRepositioningHotspot;
        const isPortal = (hotspot.type || "portal") === "portal";
        const targetScene = isPortal ? state.tour.scenes.find(s => s.id === hotspot.targetSceneId) : null;
        const targetTitle = isPortal ? (targetScene ? targetScene.title : "Cena Desconhecida") : "Ponto de Informação";

        const card = document.createElement("div");
        card.className = `scene-card hotspot-card ${isSelected ? 'active' : ''}`;
        card.dataset.id = hotspot.id;

        // Miniatura da cena de destino (ou imagem do hotspot, ou ícone padrão)
        let thumbContent = "";
        if (isPortal && targetScene && targetScene.type === "image" && targetScene.sourceUrl) {
            thumbContent = `<img src="${targetScene.sourceUrl}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">`;
        } else if (!isPortal && hotspot.infoMediaUrl) {
            thumbContent = `<img src="${hotspot.infoMediaUrl}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">`;
        }

        const activeBadge = isSelected ? `<span class="badge-start-scene" style="background: var(--color-accent); color: #000;">${isRepositioning ? 'Movendo' : 'Ativo'}</span>` : '';

        const displayLabel = hotspot.label || (isPortal ? targetTitle : hotspot.infoTitle);
        const metaIcon = isPortal ? "fa-arrow-right" : "fa-info";
        const metaText = isPortal ? `Destino: ${targetTitle}` : `Informação: ${hotspot.infoTitle}`;
        const typeIcon = isPortal ? "fa-location-dot" : "fa-circle-info";

        card.innerHTML = `
            <div class="scene-thumb hotspot-thumb">
                ${thumbContent}
                <i class="fa-solid ${typeIcon}" style="${(isPortal && targetScene && targetScene.type === 'image' && targetScene.sourceUrl) || (!isPortal && hotspot.infoMediaUrl) ? 'display: none;' : ''}"></i>
            </div>
            <div class="scene-info">
                <h4 class="scene-title" title="${displayLabel}">${displayLabel}</h4>
                <div class="scene-meta">
                    <i class="fa-solid ${metaIcon}" style="color: var(--color-accent); font-size: 10px;"></i>
                    <span title="${metaText}">${metaText}</span>
                </div>
            </div>
            ${activeBadge}
            ${state.isEditMode ? `
                <div class="scene-actions hotspot-card-actions-row">
                    ${isPortal && hotspot.targetSceneId ? `
                        <button class="action-icon-btn btn-goto-hotspot" title="Ir para esta Cena (${targetTitle})">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i>
                        </button>
                    ` : ''}
                    <button class="action-icon-btn btn-reposition ${isRepositioning ? 'repositioning-active' : ''}" title="Reposicionar / Mover no Espaço 360°" style="${isRepositioning ? 'color: var(--color-accent); background: rgba(0,242,254,0.25);' : ''}">
                        <i class="fa-solid fa-crosshairs ${isRepositioning ? 'fa-spin' : ''}"></i>
                    </button>
                    <button class="action-icon-btn btn-edit" title="Editar Propriedades">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="action-icon-btn btn-delete" title="Excluir Hotspot">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            ` : ''}
        `;

        // Evento de clique no Card: Seleciona e gira a câmera para o hotspot
        card.addEventListener("click", (e) => {
            if (e.target.closest(".scene-actions")) return;
            
            selectHotspot(hotspot.id);
            lookAtHotspot(hotspot.id);

            if (!state.isEditMode) {
                if (isPortal) {
                    showToast(`Portal apontado para: ${targetTitle}`, "info");
                } else {
                    showToast(`Informação: ${hotspot.infoTitle}`, "info");
                }
            }
        });

        // Ações do Card no Modo Edição
        if (state.isEditMode) {
            const btnGoto = card.querySelector(".btn-goto-hotspot");
            if (btnGoto) {
                btnGoto.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const targetIdx = state.tour.scenes ? state.tour.scenes.findIndex(s => s.id === hotspot.targetSceneId) : -1;
                    if (targetIdx !== -1 && isSceneLocked(targetIdx)) {
                        openSceneLockedModal(state.tour.scenes[targetIdx], targetIdx);
                        return;
                    }
                    triggerSceneTransition(() => {
                        setActiveScene(hotspot.targetSceneId);
                        showToast(`Navegando para: ${targetTitle}`, "info");
                    });
                });
            }

            const btnReposition = card.querySelector(".btn-reposition");
            if (btnReposition) {
                btnReposition.addEventListener("click", (e) => {
                    e.stopPropagation();
                    toggleRepositionHotspot(hotspot.id);
                });
            }

            const btnEdit = card.querySelector(".btn-edit");
            if (btnEdit) {
                btnEdit.addEventListener("click", (e) => {
                    e.stopPropagation();
                    selectHotspot(hotspot.id);
                    lookAtHotspot(hotspot.id);
                    openHotspotModal(hotspot.id);
                });
            }

            const btnDelete = card.querySelector(".btn-delete");
            if (btnDelete) {
                btnDelete.addEventListener("click", (e) => {
                    e.stopPropagation();
                    deleteHotspot(hotspot.id);
                });
            }
        }

        list.appendChild(card);
    });
}

function deleteHotspot(hotspotId) {
    if (confirm("Deseja realmente excluir este hotspot?")) {
        const currentScene = state.tour.scenes.find(s => s.id === state.activeSceneId);
        if (currentScene && currentScene.hotspots) {
            currentScene.hotspots = currentScene.hotspots.filter(h => h.id !== hotspotId);

            if (state.selectedHotspotId === hotspotId) {
                state.selectedHotspotId = null;
                state.isRepositioningHotspot = false;
                updateRepositionUI(false);
            }

            // Salvar no storage/banco
            saveTourToStorage();

            // Re-renderizar hotspots 3D e sidebar
            renderHotspots(currentScene.hotspots);
            renderHotspotsList();

            showToast("Hotspot removido com sucesso.", "success");
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
        const minFpPlan = getMinimumPlanForFeature("floor_plans", "Profissional");
        applyFeatureLockOverlay(
            fpSection,
            "Planta Baixa Interativa",
            minFpPlan,
            `A criação de plantas baixas interativas com radares direcionais em tempo real é exclusiva a partir do <strong>Plano ${minFpPlan}</strong>.<br><br>Faça upgrade para transformar seus tours em projetos imersivos completos!`
        );
        return;
    } else {
        removeFeatureLockOverlay(fpSection);
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
    const logoSettingsItem = document.getElementById("logo-settings-item");
    const logoUploadZone = document.getElementById("logo-upload-zone");
    const logoPreviewContainer = document.getElementById("logo-preview-container");
    const logoPreviewImg = document.getElementById("logo-preview-img");
    const clientLogoImg = document.getElementById("client-logo-img");
    const customClientLogo = document.getElementById("custom-client-logo");

    const maxLogos = state.features ? (state.features.max_logos ?? 0) : 0;
    const minLogoPlan = getMinimumPlanForFeature("max_logos", "Básico");

    if (maxLogos === 0) {
        applyFeatureLockOverlay(
            logoSettingsItem,
            "Logomarca Customizada",
            minLogoPlan,
            `Insira o logotipo próprio da sua empresa ou do seu cliente nos tours virtuais a partir do <strong>Plano ${minLogoPlan}</strong>!`
        );
        if (logoUploadZone) logoUploadZone.style.display = "block";
        if (logoPreviewContainer) logoPreviewContainer.style.display = "none";
        if (customClientLogo) customClientLogo.style.display = "none";
    } else {
        removeFeatureLockOverlay(logoSettingsItem);
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
                logoUploadZone.style.pointerEvents = "auto";
                logoUploadZone.style.opacity = "1";
                const textEl = logoUploadZone.querySelector("span");
                if (textEl) textEl.textContent = "Carregar Logo (PNG transparente)";
            }
            if (logoPreviewContainer) logoPreviewContainer.style.display = "none";
            if (logoPreviewImg) logoPreviewImg.src = "";
            
            // Ocultar logo do viewer
            if (clientLogoImg) clientLogoImg.src = "";
            if (customClientLogo) customClientLogo.style.display = "none";
        }
    }

    // 2. Atualizar UI de Privacidade
    const selectPrivacy = document.getElementById("select-privacy");
    const passwordInputWrapper = document.getElementById("password-input-wrapper");
    const inputPrivacyPassword = document.getElementById("input-privacy-password");

    if (selectPrivacy) {
        selectPrivacy.disabled = false;
        selectPrivacy.style.opacity = "1";
        selectPrivacy.style.cursor = "pointer";
        selectPrivacy.title = "";
        
        if (state.tour && state.tour.privacySettings) {
            if (state.tour.privacySettings === "disabled" || state.tour.privacySettings === "private") {
                selectPrivacy.value = "disabled";
                if (passwordInputWrapper) passwordInputWrapper.style.display = "none";
            } else {
                selectPrivacy.value = "password";
                if (passwordInputWrapper) passwordInputWrapper.style.display = "block";
                if (inputPrivacyPassword) inputPrivacyPassword.value = state.tour.privacySettings;
            }
        } else {
            selectPrivacy.value = "public";
            if (passwordInputWrapper) passwordInputWrapper.style.display = "none";
            if (inputPrivacyPassword) inputPrivacyPassword.value = "";
        }
    }

    // 3. Atualizar UI da Tampa de Tripé (Nadir)
    const nadirSettingsItem = document.getElementById("nadir-settings-item");
    const checkboxNadirEnabled = document.getElementById("checkbox-nadir-enabled");
    const nadirSubSettings = document.getElementById("nadir-sub-settings");
    const checkboxNadirUseLogo = document.getElementById("checkbox-nadir-use-logo");
    const nadirCustomUpload = document.getElementById("nadir-custom-upload");
    const nadirPreviewContainer = document.getElementById("nadir-preview-container");
    const nadirPreviewImg = document.getElementById("nadir-preview-img");
    const sliderNadirRadius = document.getElementById("slider-nadir-radius");
    const nadirRadiusValue = document.getElementById("nadir-radius-value");
    const badgeNadirPro = document.getElementById("badge-nadir-pro");

    const hasNadir = state.features ? (state.features.nadir_patch ?? false) : false;
    const minNadirPlan = getMinimumPlanForFeature("nadir_patch", "Básico");

    if (nadirSettingsItem) {
        if (!state.isOwner) {
            nadirSettingsItem.style.display = "none";
        } else {
            nadirSettingsItem.style.display = "block";
            if (!hasNadir) {
                applyFeatureLockOverlay(
                    nadirSettingsItem,
                    "Tampa de Tripé (Nadir)",
                    minNadirPlan,
                    `Esconda o tripé e a base da câmera no chão da foto 360° com uma logomarca personalizada a partir do <strong>Plano ${minNadirPlan}</strong>!`
                );
                if (badgeNadirPro) badgeNadirPro.style.display = "none";
                if (checkboxNadirEnabled) {
                    checkboxNadirEnabled.disabled = true;
                    checkboxNadirEnabled.checked = false;
                }
                if (nadirSubSettings) nadirSubSettings.style.display = "none";
            } else {
                removeFeatureLockOverlay(nadirSettingsItem);
                if (badgeNadirPro) badgeNadirPro.style.display = "none";
                if (checkboxNadirEnabled) {
                    checkboxNadirEnabled.disabled = false;
                }
                
                const nConf = state.tour.nadirSettings || { enabled: false, useLogo: true, image: null, radius: 0.8 };
                state.tour.nadirSettings = nConf; // Garante inicialização
                
                if (checkboxNadirEnabled) checkboxNadirEnabled.checked = nConf.enabled;
                if (nadirSubSettings) nadirSubSettings.style.display = nConf.enabled ? "flex" : "none";
                if (checkboxNadirUseLogo) checkboxNadirUseLogo.checked = nConf.useLogo;
                if (nadirCustomUpload) nadirCustomUpload.style.display = nConf.useLogo ? "none" : "flex";
                
                if (nConf.image) {
                    if (nadirPreviewContainer) nadirPreviewContainer.style.display = "flex";
                    if (nadirPreviewImg) nadirPreviewImg.src = nConf.image;
                    const nadirUploadZone = document.getElementById("nadir-upload-zone");
                    if (nadirUploadZone) nadirUploadZone.style.display = "none";
                } else {
                    if (nadirPreviewContainer) nadirPreviewContainer.style.display = "none";
                    if (nadirPreviewImg) nadirPreviewImg.src = "";
                    const nadirUploadZone = document.getElementById("nadir-upload-zone");
                    if (nadirUploadZone) nadirUploadZone.style.display = "block";
                }
                
                if (sliderNadirRadius) sliderNadirRadius.value = nConf.radius || 0.8;
                if (nadirRadiusValue) nadirRadiusValue.textContent = `${nConf.radius || 0.8}m`;
            }
        }
    }

    // 4. Atualizar UI e status da conexão Google Street View
    const gsvSettingsItem = document.getElementById("gsv-settings-item");
    const gsvQuota = state.features ? (state.features.gsv_projects_per_month ?? 0) : 0;
    const minGsvPlan = getMinimumPlanForFeature("gsv_projects_per_month", "Básico");

    if (gsvQuota === 0) {
        applyFeatureLockOverlay(
            gsvSettingsItem,
            "Google Street View",
            minGsvPlan,
            `A conexão e publicação direta de fotos 360° com o perfil do Google Maps / Street View requer cotas ativas (disponíveis a partir do <strong>Plano ${minGsvPlan}</strong>)!`
        );
    } else {
        removeFeatureLockOverlay(gsvSettingsItem);
        checkGSVConnectionStatus();
    }
}

async function checkGSVConnectionStatus() {
    try {
        const res = await fetch("api/gsv_status.php");
        const data = await res.json();
        const badge = document.getElementById("gsv-connection-badge");
        const btnConnect = document.getElementById("btn-gsv-connect");
        if (badge) {
            if (data.isConnected) {
                badge.textContent = "Conectado";
                badge.style.background = "rgba(16, 185, 129, 0.2)";
                badge.style.color = "#34d399";
                if (btnConnect) {
                    btnConnect.innerHTML = '<i class="fa-brands fa-google"></i> Conta Conectada';
                    btnConnect.style.borderColor = "rgba(16, 185, 129, 0.4)";
                    btnConnect.style.color = "#34d399";
                }
            } else {
                badge.textContent = "Desconectado";
                badge.style.background = "rgba(255, 255, 255, 0.1)";
                badge.style.color = "var(--text-secondary)";
                if (btnConnect) {
                    btnConnect.innerHTML = '<i class="fa-brands fa-google"></i> Conectar Conta Google';
                    btnConnect.style.borderColor = "rgba(66, 133, 244, 0.3)";
                    btnConnect.style.color = "#4285f4";
                }
            }
        }
    } catch(e) {}
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
    const inputInitialYaw = document.getElementById("input-initial-yaw");
    const btnSetInitialYaw = document.getElementById("btn-set-initial-yaw");
    const badgeInitialYawPro = document.getElementById("badge-initial-yaw-pro");
    const quickDisplay = document.getElementById("quick-initial-yaw-display");

    const yawVal = Math.round(scene.initialYaw || 0);
    if (inputInitialYaw) {
        inputInitialYaw.value = yawVal;
        inputInitialYaw.disabled = false;
        inputInitialYaw.style.opacity = "1";
    }
    if (quickDisplay) {
        quickDisplay.textContent = `${yawVal}°`;
    }
    if (badgeInitialYawPro) badgeInitialYawPro.style.display = "none";
    if (btnSetInitialYaw) {
        btnSetInitialYaw.style.opacity = "1";
        btnSetInitialYaw.style.background = "rgba(0, 242, 254, 0.08)";
        btnSetInitialYaw.style.color = "#00f2fe";
        btnSetInitialYaw.style.borderColor = "rgba(0, 242, 254, 0.3)";
    }

    // 2. Som Ambiente (MP3)
    const soundItem = document.getElementById("sound-settings-item");
    const hasSound = state.features ? (state.features.ambient_sound ?? false) : false;
    const minSoundPlan = getMinimumPlanForFeature("ambient_sound", "Pessoal");
    const audioUploadZone = document.getElementById("audio-upload-zone");
    const audioPreviewContainer = document.getElementById("audio-preview-container");
    const audioPreviewFilename = document.getElementById("audio-preview-filename");

    if (soundItem) {
        if (!hasSound) {
            applyFeatureLockOverlay(
                soundItem,
                "Som Ambiente (MP3)",
                minSoundPlan,
                `Adicione trilhas sonoras e narrações imersivas em MP3 nos seus tours a partir do <strong>Plano ${minSoundPlan}</strong>!`
            );
            if (audioUploadZone) audioUploadZone.style.display = "block";
            if (audioPreviewContainer) audioPreviewContainer.style.display = "none";
        } else {
            removeFeatureLockOverlay(soundItem);
            if (audioUploadZone && audioPreviewContainer) {
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
    }

    // 3. Galeria de Imagens 2D
    const galleryItem = document.getElementById("gallery-settings-item");
    const hasGallery = state.features ? (state.features.image_gallery ?? false) : false;
    const minGalleryPlan = getMinimumPlanForFeature("image_gallery", "Profissional");
    const galleryUploadZone = document.getElementById("gallery-upload-zone");
    const thumbsList = document.getElementById("gallery-thumbs-list");

    if (galleryItem) {
        if (!hasGallery) {
            applyFeatureLockOverlay(
                galleryItem,
                "Galeria de Imagens 2D",
                minGalleryPlan,
                `Exiba fotos tradicionais em alta definição complementares a cada ambiente no <strong>Plano ${minGalleryPlan}</strong>!`
            );
            if (galleryUploadZone) galleryUploadZone.style.display = "block";
            if (thumbsList) thumbsList.innerHTML = "";
        } else {
            removeFeatureLockOverlay(galleryItem);
            if (galleryUploadZone && thumbsList) {
                thumbsList.innerHTML = "";
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
}

// --- FUNCIONALIDADES EXCLUSIVAS: TAMPA DE TRIPÉ (NADIR) & INFO HOTSPOT ---

function renderNadirPatch() {
    const existingNadir = document.getElementById("nadir-patch-element");
    if (existingNadir) existingNadir.remove();
    
    if (!state.tour || !state.tour.nadirSettings || !state.tour.nadirSettings.enabled) return;
    
    const nadirConf = state.tour.nadirSettings;
    const radius = nadirConf.radius || 0.8;
    let src = "";
    
    if (nadirConf.useLogo) {
        src = state.tour.logoUrl || "";
    } else {
        src = nadirConf.image || "";
    }
    
    const sceneEl = document.querySelector("a-scene");
    if (!sceneEl) return;
    
    const circlePatch = document.createElement("a-circle");
    circlePatch.id = "nadir-patch-element";
    circlePatch.setAttribute("position", "0 -4.95 0");
    circlePatch.setAttribute("rotation", "-90 0 0");
    circlePatch.setAttribute("radius", radius);
    
    if (src) {
        circlePatch.setAttribute("src", src);
        circlePatch.setAttribute("material", "shader: flat; transparent: true; opacity: 0.95; depthTest: false; side: double");
    } else {
        circlePatch.setAttribute("color", "#161822");
        circlePatch.setAttribute("material", "shader: flat; opacity: 0.85; depthTest: false; side: double");
    }
    
    sceneEl.appendChild(circlePatch);
}

function openInfoHotspotModal(hotspot) {
    const modal = document.getElementById("info-hotspot-modal");
    const titleEl = document.getElementById("info-hotspot-title");
    const descEl = document.getElementById("info-hotspot-desc");
    const mediaContainer = document.getElementById("info-hotspot-media-container");
    const imgEl = document.getElementById("info-hotspot-img");
    
    if (!modal) return;
    
    if (titleEl) {
        titleEl.innerHTML = `<i class="fa-solid fa-circle-info" style="color: var(--color-accent);"></i> <span>${hotspot.infoTitle || 'Informação'}</span>`;
    }
    if (descEl) {
        descEl.textContent = hotspot.infoDesc || "";
    }
    
    if (hotspot.infoMediaUrl && mediaContainer && imgEl) {
        imgEl.src = hotspot.infoMediaUrl;
        mediaContainer.style.display = "block";
    } else if (mediaContainer) {
        mediaContainer.style.display = "none";
    }
    
    modal.classList.add("active");
}

function closeInfoHotspotModal() {
    const modal = document.getElementById("info-hotspot-modal");
    if (modal) modal.classList.remove("active");
}
