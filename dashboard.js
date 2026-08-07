// --- ESTADO DO DASHBOARD ---
const dashboardState = {
    user: null,
    tours: []
};

// --- INICIALIZAÇÃO ---
document.addEventListener("DOMContentLoaded", () => {
    initDashboard();
});

// --- CARREGAMENTO DE DADOS ---
async function initDashboard() {
    // 1. Verificar Autenticação
    const authValid = await checkAuth();
    if (!authValid) return;

    // 2. Carregar Projetos
    await loadTours();

    // 3. Inicializar Eventos do DOM
    initDOMEvents();
}

// --- VERIFICAÇÃO DE AUTH ---
async function checkAuth() {
    try {
        const res = await fetch('api/check_auth.php');
        const data = await res.json();

        if (res.ok && data.success) {
            dashboardState.user = data.user;
            document.getElementById('user-display-name').textContent = data.user.name;
            
            // Exibir link do painel de admin se for administrador
            if (parseInt(data.user.is_admin) >= 1) {
                const btnAdmin = document.getElementById('btn-admin-panel');
                if (btnAdmin) btnAdmin.style.display = 'flex';
            }
            
            renderSubscriptionInfo();
            return true;
        } else {
            // Se não logado, redireciona para login.html
            window.location.href = 'login.html';
            return false;
        }
    } catch (err) {
        console.error("Erro de conexão ao validar auth:", err);
        showToast("Erro ao validar sessão com o servidor.", "error");
        return false;
    }
}

// --- CARREGAR TOURS DO BANCO ---
async function loadTours() {
    const grid = document.getElementById("projects-grid");
    
    try {
        const res = await fetch('api/list_tours.php');
        const data = await res.json();

        if (res.ok && data.success) {
            dashboardState.tours = data.tours;
            renderTours();
            calculateStats();
        } else {
            grid.innerHTML = `<p class="error-text">Falha ao carregar tours: ${data.message}</p>`;
        }
    } catch (err) {
        grid.innerHTML = `<p class="error-text">Erro ao comunicar com o servidor.</p>`;
    }
}

// --- RENDERIZAR INFO DA ASSINATURA ---
function renderSubscriptionInfo() {
    const user = dashboardState.user;
    const badge = document.getElementById("sub-badge");
    const detail = document.getElementById("sub-detail");
    const actionsContainer = document.getElementById("sub-actions-container");

    badge.className = "sub-badge"; // Reset classes
    actionsContainer.innerHTML = ""; // Limpa ações

    if (user.subscription_status === 'active') {
        badge.classList.add("badge-active");
        badge.innerHTML = `<i class="fa-solid fa-crown animate-pulse"></i> Premium`;
        detail.textContent = "Acesso ilimitado liberado em todos os recursos.";
    } else if (user.subscription_status === 'trial') {
        badge.classList.add("badge-trial");
        
        // Calcular dias restantes
        const expiryDate = new Date(user.subscription_expires_at);
        const today = new Date();
        const diffTime = expiryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0) {
            badge.textContent = `Trial Grátis`;
            detail.textContent = `${diffDays} dia(s) restante(s) de teste.`;
        } else {
            // Caso seja trial mas já expirou
            badge.classList.remove("badge-trial");
            badge.classList.add("badge-expired");
            badge.textContent = "Expirado";
            detail.textContent = "Período de teste encerrado.";
        }

        // Botão para simular assinatura premium
        const btnSub = document.createElement("button");
        btnSub.className = "btn btn-accent btn-block btn-sm";
        btnSub.innerHTML = `<i class="fa-solid fa-credit-card"></i> Assinar Premium (Simulado)`;
        btnSub.onclick = simulateSubscription;
        actionsContainer.appendChild(btnSub);
    } else {
        // Expired
        badge.classList.add("badge-expired");
        badge.textContent = "Expirado";
        detail.textContent = "Assinatura expirada. Regularize para reativar.";

        const btnSub = document.createElement("button");
        btnSub.className = "btn btn-primary btn-block btn-sm";
        btnSub.innerHTML = `<i class="fa-solid fa-credit-card animate-pulse"></i> Assinar Premium (Simulado)`;
        btnSub.onclick = simulateSubscription;
        actionsContainer.appendChild(btnSub);
    }
}

// --- SIMULAR PAGAMENTO / ASSINATURA ---
async function simulateSubscription() {
    showToast("Processando pagamento fictício (Stripe/Pix)...", "info");
    
    try {
        const res = await fetch('api/mock_subscribe.php', { method: 'POST' });
        const data = await res.json();

        if (res.ok && data.success) {
            showToast("Sucesso! Plano Premium ativado com sucesso.", "success");
            
            // Recarregar status de autenticação para atualizar visual do painel
            await checkAuth();
        } else {
            showToast(data.message || "Falha ao assinar.", "error");
        }
    } catch (err) {
        showToast("Erro de conexão.", "error");
    }
}

// --- ESTATÍSTICAS ---
function calculateStats() {
    const totalTours = dashboardState.tours.length;
    let totalScenes = 0;

    dashboardState.tours.forEach(tour => {
        totalScenes += tour.scenes_count;
    });

    document.getElementById("stat-total-tours").textContent = totalTours;
    document.getElementById("stat-total-scenes").textContent = totalScenes;
}

// --- RENDERIZAR GRADE DE PROJETOS ---
function renderTours() {
    const grid = document.getElementById("projects-grid");
    grid.innerHTML = "";

    if (dashboardState.tours.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-wand-magic-sparkles empty-icon animate-pulse"></i>
                <h3>Nenhum Tour Virtual Criado</h3>
                <p>Crie seu primeiro projeto 360° interativo agora mesmo!</p>
                <button class="btn btn-primary btn-sm" id="btn-empty-create">
                    <i class="fa-solid fa-plus-circle"></i> Começar Agora
                </button>
            </div>
        `;
        document.getElementById("btn-empty-create").addEventListener("click", openCreateModal);
        return;
    }

    dashboardState.tours.forEach(tour => {
        const card = document.createElement("div");
        card.className = "project-card glassmorphism";

        // Imagem de miniatura (se houver, senão placeholder tecnológico)
        let thumbUrl = tour.thumbnail;
        let imgTag = "";
        
        if (thumbUrl) {
            imgTag = `<img src="${thumbUrl}" class="project-img" onerror="this.remove()">`;
        }
        
        // Link de visualização pública
        const publicUrl = `${window.location.origin}${window.location.pathname.replace("dashboard.html", "index.html")}?id=${tour.id}`;

        card.innerHTML = `
            <a href="index.html?id=${tour.id}&mode=view" class="project-preview-link" style="text-decoration: none; color: inherit; display: block;">
                <div class="project-preview">
                    ${imgTag}
                    <div class="project-overlay">
                        <span class="btn btn-secondary btn-circle btn-view-public" title="Ver Link Público" data-url="${publicUrl}">
                            <i class="fa-solid fa-share-nodes"></i>
                        </span>
                    </div>
                    <div class="project-scenes-badge">
                        <i class="fa-solid fa-cubes"></i> <span>${tour.scenes_count} cenas</span>
                    </div>
                </div>
            </a>
            <div class="project-details">
                <h3 class="project-title" title="${tour.title}">${tour.title}</h3>
                <span class="project-date">Atualizado em: ${formatDate(tour.updated_at)}</span>
                
                <div class="project-actions">
                    <a href="index.html?id=${tour.id}" class="btn btn-primary btn-sm btn-flex">
                        <i class="fa-solid fa-edit"></i> Editar
                    </a>
                    <button class="btn btn-secondary btn-sm btn-delete-project" data-id="${tour.id}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;

        // Evento de deletar
        card.querySelector(".btn-delete-project").addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation(); // Evita qualquer propagação ou clique concorrente no card
            console.log("Botão de deletar clicado para o projeto ID:", tour.id);
            deleteTour(tour.id);
        });

        // Evento de compartilhar / copiar link público
        card.querySelector(".btn-view-public").addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation(); // Evita navegar para o link da miniatura
            const url = e.currentTarget.dataset.url;
            navigator.clipboard.writeText(url).then(() => {
                showToast("Link público copiado para a área de transferência!", "success");
            }).catch(() => {
                // Fallback abrindo a aba
                window.open(url, "_blank");
            });
        });

        grid.appendChild(card);
    });
}

// --- APAGAR TOUR ---
async function deleteTour(id) {
    console.log("Chamando deleteTour para o ID:", id);
    if (!confirm("Tem certeza absoluta de que deseja excluir este tour virtual? Isso apagará todas as cenas e hotspots criados permanentemente.")) {
        console.log("Exclusão cancelada pelo usuário no confirm.");
        return;
    }

    try {
        const res = await fetch('api/delete_tour.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            showToast("Tour virtual excluído com sucesso.", "success");
            await loadTours();
        } else {
            showToast(data.message || "Erro ao excluir tour.", "error");
        }
    } catch (err) {
        showToast("Erro de conexão ao excluir.", "error");
    }
}

// --- CRIAR TOUR ---
async function createTour() {
    const titleInput = document.getElementById("new-tour-title");
    const title = titleInput.value.trim();

    if (!title) {
        alert("Por favor, informe o título do projeto.");
        return;
    }

    try {
        const res = await fetch('api/create_tour.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            showToast("Projeto criado! Abrindo o editor...", "success");
            closeCreateModal();
            // Redireciona diretamente para o editor
            setTimeout(() => {
                window.location.href = `index.html?id=${data.tourId}`;
            }, 800);
        } else {
            showToast(data.message || "Falha ao criar o projeto.", "error");
        }
    } catch (err) {
        showToast("Erro de conexão ao criar projeto.", "error");
    }
}

// --- MODAL DE CRIAÇÃO ---
function openCreateModal() {
    // Se o plano do usuário expirou, impede criação
    if (dashboardState.user.subscription_status === 'expired') {
        showToast("Seu plano expirou! Assine o Premium para criar novos projetos.", "error");
        return;
    }
    
    document.getElementById("new-tour-title").value = "";
    document.getElementById("create-tour-modal").classList.add("active");
}

function closeCreateModal() {
    document.getElementById("create-tour-modal").classList.remove("active");
}

// --- AUXILIARES E EVENTOS ---
function initDOMEvents() {
    // Logout
    document.getElementById("btn-logout").onclick = async () => {
        try {
            await fetch('api/logout.php');
            window.location.href = 'login.html';
        } catch (err) {
            showToast("Erro de conexão ao deslogar.", "error");
        }
    };

    // Modal
    document.getElementById("btn-open-create-modal").onclick = openCreateModal;
    document.getElementById("btn-close-create-modal").onclick = closeCreateModal;
    document.getElementById("btn-cancel-create").onclick = closeCreateModal;
    document.getElementById("btn-submit-create").onclick = createTour;

    // Validador de tecla Enter dentro de caixas de texto de modais (simula o clique do botão Ok/Salvar)
    document.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const activeInput = document.activeElement;
            if (activeInput && (activeInput.tagName === "INPUT" || activeInput.tagName === "SELECT")) {
                const modal = activeInput.closest(".modal-overlay.active");
                if (modal) {
                    e.preventDefault();
                    let btn = null;
                    if (modal.id === "create-tour-modal") {
                        btn = document.getElementById("btn-submit-create");
                    }
                    if (btn) btn.click();
                }
            }
        }
    });
}

function formatDate(dateStr) {
    if (!dateStr) return "";
    
    // Normaliza datas no formato MySQL "YYYY-MM-DD HH:MM:SS" para ISO 8601 UTC ("YYYY-MM-DDTHH:MM:SSZ")
    let normalizedStr = dateStr;
    if (dateStr.includes(" ") && !dateStr.includes("Z") && !dateStr.includes("T") && !dateStr.includes("+") && !dateStr.includes("-")) {
        normalizedStr = dateStr.replace(" ", "T") + "Z";
    }
    
    const d = new Date(normalizedStr);
    if (isNaN(d.getTime())) {
        return dateStr;
    }
    
    return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

// --- NOTIFICAÇÃO TOAST ---
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
    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}
