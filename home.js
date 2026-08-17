/* ----------------------------------------------------------------------
 * 360° Studio - Scripts do Site de Apresentação Corporativo (home.js)
 * ---------------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Inicializar Slider de Planos imediatamente para renderização instantânea
    initPlansSlider();

    // Adicionar listener de rolagem para o encolhimento da barra de menu (sticky shrink)
    window.addEventListener("scroll", () => {
        const navbar = document.querySelector(".navbar");
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.classList.add("shrunk");
            } else {
                navbar.classList.remove("shrunk");
            }
        }
    });

    // 2. Scroll Suave para Âncoras do Menu
    const navLinks = document.querySelectorAll(".nav-links a, a[href^='#']");
    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            const targetId = link.getAttribute("href");
            if (targetId.startsWith("#")) {
                e.preventDefault();
                const targetEl = document.querySelector(targetId);
                if (targetEl) {
                    const headerOffset = 80;
                    const elementPosition = targetEl.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: "smooth"
                    });
                }
            }
        });
    });

    // 3. Verificar Autenticação em background
    try {
        await checkUserSession();
    } catch (e) {
        console.error("Erro ao verificar sessão do usuário:", e);
    }

    // 4. Carregar configurações dinâmicas da Landing Page em background
    try {
        await loadHomeCMSContent();
        // Re-init slider after CMS loads to adjust sizing if elements changed
        initPlansSlider();
    } catch (e) {
        console.error("Erro ao carregar CMS da home:", e);
    }
});

// Verificar se o usuário já está logado
async function checkUserSession() {
    const isPC = !/Mobi|Android|iPhone|iPad|Windows Phone/i.test(navigator.userAgent);
    if (isPC && !sessionStorage.getItem('session_active')) {
        try {
            const res = await fetch("api/check_auth.php");
            const data = await res.json();
            if (res.ok && data.success) {
                await fetch("api/logout.php");
            }
        } catch (e) {}
        return;
    }

    try {
        const res = await fetch("api/check_auth.php");
        const data = await res.json();
        
        const btnLogin = document.getElementById("nav-btn-login");
        const btnRegister = document.getElementById("nav-btn-register");

        if (res.ok && data.success && data.user) {
            // Se estiver logado, redireciona o fluxo de botões para o Painel de Controle
            if (btnLogin) {
                btnLogin.textContent = "Acessar Painel";
                btnLogin.href = "dashboard.html";
                btnLogin.style.color = "var(--color-accent-blue)";
                btnLogin.style.fontWeight = "700";
            }
            if (btnRegister) {
                btnRegister.style.display = "none"; // Oculta botão de cadastro se já estiver logado
            }
        }
    } catch (err) {
        console.error("Falha ao checar sessão ativa:", err);
    }
}

// Abrir passeios virtuais de demonstração
function openShowcaseTour(tourId) {
    // Abre a visualização em nova aba
    window.open(`index.html?id=${tourId}&v=1.3.8`, "_blank");
}

// Carregar conteúdo CMS dinâmico
async function loadHomeCMSContent() {
    try {
        const res = await fetch("api/get_home_settings.php");
        const data = await res.json();
        if (res.ok && data.success && data.settings) {
            const s = data.settings;
            
            // Hero
            if (s.hero_title) {
                const h1 = document.querySelector(".hero h1");
                if (h1) h1.textContent = s.hero_title;
            }
            if (s.hero_subtitle) {
                const p = document.querySelector(".hero p");
                if (p) p.textContent = s.hero_subtitle;
            }
            if (s.hero_cta_text) {
                const ctaBtn = document.querySelector(".hero-ctas .btn-primary-hero");
                if (ctaBtn) ctaBtn.textContent = s.hero_cta_text;
            }
            if (s.hero_image_url) {
                const img = document.querySelector(".hero-mockup-inner img");
                if (img) img.src = s.hero_image_url;
            }
            
            // Features
            if (s.features_title) {
                const fh2 = document.querySelector("#features .section-header h2");
                if (fh2) fh2.textContent = s.features_title;
            }
            if (s.features_subtitle) {
                const fp = document.querySelector("#features .section-header p");
                if (fp) fp.textContent = s.features_subtitle;
            }
        }
    } catch (e) {
        console.error("Erro ao carregar conteúdo dinâmico da Home:", e);
    }
}

// --- PLANS SLIDER LOGIC ---
let plansCurrentIndex = 0;

window.movePlansSlider = function(direction) {
    const cards = document.querySelectorAll(".plans-slider-track .plan-card");
    if (cards.length === 0) return;
    
    let visibleCards = getVisibleCardsCount();
    let maxIndex = cards.length - visibleCards;
    if (maxIndex < 0) maxIndex = 0;
    
    plansCurrentIndex += direction;
    if (plansCurrentIndex < 0) plansCurrentIndex = 0;
    if (plansCurrentIndex > maxIndex) plansCurrentIndex = maxIndex;
    
    updateSliderState();
};

window.jumpToPlan = function(index) {
    plansCurrentIndex = index;
    updateSliderState();
};

function initPlansSlider() {
    const track = document.querySelector(".plans-slider-track");
    const cards = document.querySelectorAll(".plans-slider-track .plan-card");
    const dotsContainer = document.getElementById("plans-slider-dots");
    
    if (!track || cards.length === 0) return;
    
    // Create dots
    if (dotsContainer) {
        dotsContainer.innerHTML = "";
        let visibleCards = getVisibleCardsCount();
        let dotsCount = cards.length - visibleCards + 1;
        if (dotsCount < 1) dotsCount = 1;
        
        for (let i = 0; i < dotsCount; i++) {
            const dot = document.createElement("div");
            dot.className = `dot ${i === plansCurrentIndex ? 'active' : ''}`;
            dot.setAttribute("onclick", `jumpToPlan(${i})`);
            dotsContainer.appendChild(dot);
        }
    }
    
    updateSliderState();
}

function getVisibleCardsCount() {
    if (window.innerWidth <= 768) return 1;
    if (window.innerWidth <= 1024) return 2;
    return 3;
}

function updateSliderState() {
    const track = document.querySelector(".plans-slider-track");
    const cards = document.querySelectorAll(".plans-slider-track .plan-card");
    if (!track || cards.length === 0) return;
    
    let visibleCards = getVisibleCardsCount();
    let maxIndex = cards.length - visibleCards;
    if (maxIndex < 0) maxIndex = 0;
    
    // Safety check on index bounds
    if (plansCurrentIndex > maxIndex) plansCurrentIndex = maxIndex;
    
    const cardWidth = cards[0].offsetWidth;
    const gap = 24; // matches gap: 24px in CSS
    const offset = plansCurrentIndex * (cardWidth + gap);
    
    track.style.transform = `translateX(-${offset}px)`;
    
    // Update dots
    const dots = document.querySelectorAll(".plans-slider-dots .dot");
    dots.forEach((dot, i) => {
        if (i === plansCurrentIndex) dot.classList.add("active");
        else dot.classList.remove("active");
    });
    
    // Disable arrows if boundary reached
    const prevBtn = document.getElementById("btn-plans-prev");
    const nextBtn = document.getElementById("btn-plans-next");
    
    if (prevBtn) {
        if (plansCurrentIndex === 0) {
            prevBtn.style.opacity = "0.3";
            prevBtn.style.pointerEvents = "none";
        } else {
            prevBtn.style.opacity = "1";
            prevBtn.style.pointerEvents = "auto";
        }
    }
    
    if (nextBtn) {
        if (plansCurrentIndex === maxIndex) {
            nextBtn.style.opacity = "0.3";
            nextBtn.style.pointerEvents = "none";
        } else {
            nextBtn.style.opacity = "1";
            nextBtn.style.pointerEvents = "auto";
        }
    }
}

// Re-init slider on window resize to adjust layout bounds
window.addEventListener("resize", () => {
    initPlansSlider();
});
