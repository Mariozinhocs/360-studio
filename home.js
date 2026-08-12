/* ----------------------------------------------------------------------
 * 360° Studio - Scripts do Site de Apresentação Corporativo (home.js)
 * ---------------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Verificar Autenticação para ajustar os botões do Header
    await checkUserSession();

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
    window.open(`index.html?id=${tourId}`, "_blank");
}
