// --- ESTADO DO PAINEL ADMIN ---
const adminState = {
    user: null,
    users: [],
    stats: null,
    selectedUsers: [] // Controla IDs dos usuários selecionados em lote
};

// --- INICIALIZAÇÃO ---
document.addEventListener("DOMContentLoaded", () => {
    initAdmin();
});

async function initAdmin() {
    // 1. Verificar autenticação e permissões de administrador
    const isAuthorized = await checkAdminAuth();
    if (!isAuthorized) return;

    // 2. Carregar estatísticas gerais
    await loadStats();

    // 3. Carregar lista de usuários
    await loadUsers();

    // 4. Inicializar eventos da UI
    initUIEvents();
}

// --- CHECK AUTH ---
async function checkAdminAuth() {
    const isPC = !/Mobi|Android|iPhone|iPad|Windows Phone/i.test(navigator.userAgent);
    if (isPC && !sessionStorage.getItem('session_active')) {
        await fetch('api/logout.php');
        window.location.href = 'login.html';
        return false;
    }

    try {
        const res = await fetch('api/check_auth.php');
        const data = await res.json();

        if (res.ok && data.success) {
            const role = parseInt(data.user.is_admin);
            if (role >= 1) {
                adminState.user = data.user;
                return true;
            } else {
                // É um usuário comum tentando acessar o painel de admin
                alert("Acesso negado. Esta página é restrita a administradores.");
                window.location.href = 'dashboard.html';
                return false;
            }
        } else {
            // Não está autenticado
            window.location.href = 'login.html';
            return false;
        }
    } catch (err) {
        console.error("Erro ao validar permissões de administrador:", err);
        showToast("Erro ao validar sessão.", "error");
        return false;
    }
}

// --- CARREGAR METRICAS (KPIS) ---
async function loadStats() {
    try {
        const res = await fetch('api/admin/get_stats.php');
        const data = await res.json();

        if (res.ok && data.success) {
            adminState.stats = data.stats;
            
            // Renderizar na tela
            document.getElementById("stat-mrr").textContent = formatCurrency(data.stats.mrr);
            document.getElementById("stat-premium").textContent = data.stats.active_premium;
            document.getElementById("stat-trial").textContent = data.stats.active_trial;
            document.getElementById("stat-system-assets").textContent = `${data.stats.total_tours} / ${data.stats.total_scenes}`;
        } else {
            console.error("Erro ao buscar estatísticas:", data.message);
        }
    } catch (err) {
        console.error("Erro na API de estatísticas:", err);
    }
}

// --- CARREGAR LISTA DE USUÁRIOS ---
async function loadUsers() {
    const tableBody = document.getElementById("users-table-body");
    
    // Resetar seleção
    resetSelection();
    
    // Mostra loading
    tableBody.innerHTML = `
        <tr>
            <td colspan="9" class="table-loading">
                <i class="fa-solid fa-circle-notch fa-spin"></i> Carregando usuários...
            </td>
        </tr>
    `;

    const searchQuery = document.getElementById("search-users").value.trim();
    const statusFilter = document.getElementById("filter-status").value;

    try {
        const url = `api/admin/list_users.php?search=${encodeURIComponent(searchQuery)}&status=${encodeURIComponent(statusFilter)}`;
        const res = await fetch(url);
        const data = await res.json();

        if (res.ok && data.success) {
            adminState.users = data.users;
            renderUsersTable();
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="table-empty">
                        <i class="fa-solid fa-circle-exclamation" style="color: var(--color-pink);"></i> Erro ao carregar usuários: ${data.message}
                    </td>
                </tr>
            `;
        }
    } catch (err) {
        console.error("Erro ao listar usuários:", err);
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="table-empty">
                    <i class="fa-solid fa-triangle-exclamation" style="color: var(--color-pink);"></i> Erro de comunicação com o servidor.
                </td>
            </tr>
        `;
    }
}

// --- RENDERIZAR TABELA DE USUÁRIOS ---
function resetSelection() {
    adminState.selectedUsers = [];
    const masterCheckbox = document.getElementById("select-all-users");
    if (masterCheckbox) {
        masterCheckbox.checked = false;
    }
    updateBatchActionsBar();
}

function updateBatchActionsBar() {
    const bar = document.getElementById("batch-actions-bar");
    const countSpan = document.getElementById("selected-count");
    const count = adminState.selectedUsers.length;
    
    if (countSpan) countSpan.textContent = count;
    
    if (count > 0) {
        bar.classList.add("active");
        
        // Mostrar/ocultar botões de lote dinamicamente com base no filtro
        const statusFilter = document.getElementById("filter-status").value;
        const btnRestore = document.getElementById("btn-batch-restore");
        const btnEdit = document.getElementById("btn-batch-edit");
        const btnDelete = document.getElementById("btn-batch-delete");
        
        if (statusFilter === "deleted") {
            if (btnRestore) btnRestore.style.display = "inline-flex";
            if (btnEdit) btnEdit.style.display = "none";
            if (btnDelete) {
                btnDelete.innerHTML = `<i class="fa-solid fa-trash-can"></i> Excluir Definitivamente`;
            }
        } else {
            if (btnRestore) btnRestore.style.display = "none";
            if (btnEdit) btnEdit.style.display = "inline-flex";
            if (btnDelete) {
                btnDelete.innerHTML = `<i class="fa-solid fa-trash"></i> Excluir em Lote`;
            }
        }
    } else {
        bar.classList.remove("active");
    }
}

function renderUsersTable() {
    const tableBody = document.getElementById("users-table-body");
    tableBody.innerHTML = "";

    if (adminState.users.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="table-empty">
                    Nenhum usuário correspondente aos filtros foi encontrado.
                </td>
            </tr>
        `;
        return;
    }

    adminState.users.forEach(user => {
        const row = document.createElement("tr");
        row.dataset.userId = user.id;

        // Role badge
        let roleBadge = `<span class="badge-status badge-role-user"><i class="fa-solid fa-user"></i> Cliente</span>`;
        if (user.is_admin === 2) {
            roleBadge = `<span class="badge-status badge-role-superadmin"><i class="fa-solid fa-user-shield"></i> Super Admin</span>`;
        } else if (user.is_admin === 1) {
            roleBadge = `<span class="badge-status badge-role-admin"><i class="fa-solid fa-user-gear"></i> Admin</span>`;
        }

        // Subscription badge
        const plansMap = {
            'gratis': { name: 'Grátis', class: 'badge-status-trial' },
            'iniciante': { name: 'Iniciante', class: 'badge-status-active' },
            'basico': { name: 'Básico', class: 'badge-status-active' },
            'pessoal': { name: 'Pessoal', class: 'badge-status-active' },
            'profissional': { name: 'Profissional', class: 'badge-status-active' },
            'trial': { name: 'Trial', class: 'badge-status-trial' },
            'active': { name: 'Premium', class: 'badge-status-active' },
            'expired': { name: 'Expirado', class: 'badge-status-expired' }
        };

        const statusKey = user.subscription_status || 'gratis';
        const planInfo = plansMap[statusKey] || plansMap['gratis'];

        let subBadgeClass = planInfo.class;
        let subStatusName = planInfo.name;
        
        const subBadge = `<span class="badge-status ${subBadgeClass}">${subStatusName}</span>`;

        // Expires at formatting
        let expiresAtStr = "Nenhum (Permanente)";
        if (user.subscription_expires_at) {
            expiresAtStr = formatDate(user.subscription_expires_at);
        }

        // Botões de ação dinâmicos com base em privilégios
        const statusFilter = document.getElementById("filter-status").value;
        let actionsHtml = "";

        if (statusFilter === "deleted") {
            if (parseInt(adminState.user.is_admin) === 2) {
                actionsHtml = `
                    <button class="btn-action-restore" title="Restaurar Conta" data-id="${user.id}" style="background-color: var(--color-purple); color: white;">
                        <i class="fa-solid fa-rotate-left"></i> Restaurar
                    </button>
                    <button class="btn-action-delete-perm" title="Excluir Definitivamente" data-id="${user.id}" style="background-color: var(--color-pink); color: white;">
                        <i class="fa-solid fa-trash-can"></i> Excluir Definitivamente
                    </button>
                `;
            } else {
                actionsHtml = `<span class="badge-status">Sem ações na Lixeira</span>`;
            }
        } else {
            actionsHtml = `
                <button class="btn-action-edit" title="Ajustar Plano" data-id="${user.id}">
                    <i class="fa-solid fa-user-pen"></i> Ajustar
                </button>
                <button class="btn-action-key" title="Redefinir Senha" data-id="${user.id}">
                    <i class="fa-solid fa-key"></i> Senha
                </button>
            `;
            
            if (parseInt(adminState.user.is_admin) === 2 && parseInt(user.id) !== parseInt(adminState.user.id)) {
                actionsHtml += `
                    <button class="btn-action-delete" title="Excluir Conta" data-id="${user.id}">
                        <i class="fa-solid fa-trash"></i> Excluir
                    </button>
                `;
            }
        }

        const isSelected = adminState.selectedUsers.includes(parseInt(user.id));
        if (isSelected) {
            row.classList.add("row-selected");
        }
        const isChecked = isSelected ? "checked" : "";

        row.innerHTML = `
            <td style="text-align: center;">
                <input type="checkbox" class="select-user-checkbox" data-id="${user.id}" ${isChecked}>
            </td>
            <td>
                <div class="user-info">
                    <span class="user-name">${escapeHTML(user.name)}</span>
                    <span class="user-username">@${escapeHTML(user.username)}</span>
                </div>
            </td>
            <td>
                <span class="user-email">${escapeHTML(user.email)}</span>
            </td>
            <td>${roleBadge}</td>
            <td>${subBadge}</td>
            <td>${expiresAtStr}</td>
            <td>
                <div class="project-stats">
                    <div class="project-stat-row">
                        <i class="fa-solid fa-map"></i> Tours: <span class="stat-number">${user.tours_count}</span>
                    </div>
                    <div class="project-stat-row">
                        <i class="fa-solid fa-image"></i> Cenas: <span class="stat-number">${user.scenes_count}</span>
                    </div>
                </div>
            </td>
            <td>${formatDate(user.created_at)}</td>
            <td>
                <div class="actions-cell">
                    ${actionsHtml}
                </div>
            </td>
        `;

        // Bind events
        if (statusFilter === "deleted") {
            const restoreBtn = row.querySelector(".btn-action-restore");
            if (restoreBtn) {
                restoreBtn.onclick = () => restoreUser(user.id, user.name);
            }
            const deletePermBtn = row.querySelector(".btn-action-delete-perm");
            if (deletePermBtn) {
                deletePermBtn.onclick = () => deleteUserPermanent(user.id, user.name);
            }
        } else {
            const editBtn = row.querySelector(".btn-action-edit");
            if (editBtn) editBtn.onclick = () => openEditModal(user);
            
            const keyBtn = row.querySelector(".btn-action-key");
            if (keyBtn) keyBtn.onclick = () => openPwdResetModal(user);
            
            const deleteBtn = row.querySelector(".btn-action-delete");
            if (deleteBtn) {
                deleteBtn.onclick = () => deleteUserSoft(user.id, user.name);
            }
        }

        // Checkbox event listener
        const checkbox = row.querySelector(".select-user-checkbox");
        checkbox.onchange = (e) => {
            const id = parseInt(user.id);
            if (e.target.checked) {
                if (!adminState.selectedUsers.includes(id)) {
                    adminState.selectedUsers.push(id);
                }
                row.classList.add("row-selected");
            } else {
                adminState.selectedUsers = adminState.selectedUsers.filter(item => item !== id);
                row.classList.remove("row-selected");
            }
            
            // Atualizar o estado do checkbox mestre
            const allCheckboxes = document.querySelectorAll(".select-user-checkbox");
            const checkedCheckboxes = document.querySelectorAll(".select-user-checkbox:checked");
            const masterCheckbox = document.getElementById("select-all-users");
            if (masterCheckbox) {
                masterCheckbox.checked = allCheckboxes.length > 0 && allCheckboxes.length === checkedCheckboxes.length;
            }

            updateBatchActionsBar();
        };

        tableBody.appendChild(row);
    });
}

// --- MODAL EDITAR USUÁRIO ---
function openEditModal(user) {
    if (!user) return;
    document.getElementById("edit-user-id").value = user.id || "";
    document.getElementById("edit-user-name").value = user.name || "";
    document.getElementById("edit-user-username").value = user.username || "";
    document.getElementById("edit-user-email").value = user.email || "";
    let statusVal = user.subscription_status || "gratis";
    if (statusVal === "trial") statusVal = "gratis";
    if (statusVal === "active") statusVal = "profissional";
    document.getElementById("edit-sub-status").value = statusVal;

    // Configurar dropdown do nível de permissão
    const roleSelect = document.getElementById("edit-is-admin-select");
    roleSelect.value = user.is_admin !== undefined ? user.is_admin : 0;

    // Apenas Super Admin (2) pode mudar cargos
    // Se for o próprio usuário Super Admin, ele não pode tirar o seu próprio cargo
    const isSuper = parseInt(adminState.user.is_admin) === 2;
    const isNotSelf = parseInt(user.id) !== parseInt(adminState.user.id);
    
    if (isSuper && isNotSelf) {
        roleSelect.disabled = false;
    } else {
        roleSelect.disabled = true;
    }

    // Configurar botão de exclusão no modal (Apenas Super Admin e não para o próprio usuário)
    const btnDeleteModal = document.getElementById("btn-delete-user-modal");
    if (btnDeleteModal) {
        if (isSuper && isNotSelf) {
            btnDeleteModal.style.display = "inline-flex";
            btnDeleteModal.onclick = () => {
                closeEditModal();
                deleteUserSoft(user.id, user.name);
            };
        } else {
            btnDeleteModal.style.display = "none";
        }
    }

    // Formatar datetime para o input local
    const expiresInput = document.getElementById("edit-sub-expires");
    if (user.subscription_expires_at) {
        const rawDate = String(user.subscription_expires_at).replace(" ", "T");
        expiresInput.value = rawDate.substring(0, 16);
    } else {
        expiresInput.value = "";
    }

    document.getElementById("edit-user-modal").classList.add("active");
}

function closeEditModal() {
    document.getElementById("edit-user-modal").classList.remove("active");
}

// --- SALVAR CONFIGURAÇÕES ---
async function saveUserSettings() {
    const userId = parseInt(document.getElementById("edit-user-id").value);
    const name = document.getElementById("edit-user-name").value.trim();
    const username = document.getElementById("edit-user-username").value.trim();
    const email = document.getElementById("edit-user-email").value.trim();
    const status = document.getElementById("edit-sub-status").value;
    const role = parseInt(document.getElementById("edit-is-admin-select").value);
    
    if (!name || !username || !email) {
        showToast("Nome, Usuário e E-mail não podem ficar vazios.", "error");
        return;
    }

    let expiresAt = document.getElementById("edit-sub-expires").value;
    if (expiresAt) {
        expiresAt = expiresAt.replace("T", " ") + ":00";
    } else {
        expiresAt = null;
    }

    showToast("Salvando alterações do usuário...", "info");

    try {
        const res = await fetch('api/admin/update_subscription.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                name: name,
                username: username,
                email: email,
                subscription_status: status,
                subscription_expires_at: expiresAt,
                is_admin: role
            })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            showToast("Perfil e plano do usuário atualizados com sucesso!", "success");
            closeEditModal();
            
            await loadStats();
            await loadUsers();
        } else {
            showToast(data.message || "Erro ao salvar alterações.", "error");
        }
    } catch (err) {
        console.error("Erro ao salvar dados do usuário:", err);
        showToast("Erro de comunicação com o servidor.", "error");
    }
}

// --- EXCLUIR USUÁRIO LOGICAMENTE (SOFT DELETE) ---
async function deleteUserSoft(userId, userName) {
    if (!confirm(`Deseja realmente enviar o usuário "${userName}" para a lixeira? A conta dele ficará inativa.`)) {
        return;
    }

    showToast("Enviando usuário para a lixeira...", "info");

    try {
        const res = await fetch('api/admin/delete_user.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            showToast(data.message || "Usuário enviado para a lixeira!", "success");
            await loadStats();
            await loadUsers();
        } else {
            showToast(data.message || "Erro ao enviar usuário para a lixeira.", "error");
        }
    } catch (err) {
        console.error("Erro ao deletar usuário:", err);
        showToast("Erro de comunicação com o servidor.", "error");
    }
}

// --- RESTAURAR USUÁRIO ---
async function restoreUser(userId, userName) {
    if (!confirm(`Deseja realmente restaurar a conta do usuário "${userName}"?`)) {
        return;
    }

    showToast("Restaurando usuário...", "info");

    try {
        const res = await fetch('api/admin/restore_user.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            showToast(data.message || "Usuário restaurado com sucesso!", "success");
            await loadStats();
            await loadUsers();
        } else {
            showToast(data.message || "Erro ao restaurar usuário.", "error");
        }
    } catch (err) {
        console.error("Erro ao restaurar usuário:", err);
        showToast("Erro de comunicação com o servidor.", "error");
    }
}

// --- EXCLUIR USUÁRIO DEFINITIVAMENTE (HARD DELETE) ---
async function deleteUserPermanent(userId, userName) {
    if (!confirm(`ATENÇÃO: Você deseja realmente EXCLUIR DEFINITIVAMENTE o usuário "${userName}" e todos os seus projetos associados? Esta ação é irreversível.`)) {
        return;
    }

    showToast("Excluindo conta permanentemente...", "info");

    try {
        const res = await fetch('api/admin/delete_user.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            showToast(data.message || "Usuário excluído definitivamente!", "success");
            await loadStats();
            await loadUsers();
        } else {
            showToast(data.message || "Erro ao excluir usuário definitivamente.", "error");
        }
    } catch (err) {
        console.error("Erro ao excluir usuário permanentemente:", err);
        showToast("Erro de comunicação com o servidor.", "error");
    }
}

// --- MODAL RESETAR SENHA ---
function openPwdResetModal(user) {
    document.getElementById("pwd-user-id").value = user.id;
    document.getElementById("pwd-user-name").textContent = user.name;
    document.getElementById("pwd-user-email").textContent = user.email;
    document.getElementById("new-password").value = "";
    document.getElementById("reset-password-modal").classList.add("active");
}

function closePwdResetModal() {
    document.getElementById("reset-password-modal").classList.remove("active");
}

function generateRandomPassword() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
    let password = "";
    for (let i = 0; i < 10; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    document.getElementById("new-password").value = password;
    showToast("Senha gerada automaticamente!", "success");
}

async function submitPasswordReset() {
    const userId = parseInt(document.getElementById("pwd-user-id").value);
    const password = document.getElementById("new-password").value.trim();

    if (password.length < 6) {
        alert("A senha provisória deve ter no mínimo 6 caracteres.");
        return;
    }

    showToast("Atualizando senha do usuário...", "info");

    try {
        const res = await fetch('api/admin/reset_password.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, password: password })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            // Tenta copiar para o clipboard se for possível
            try {
                await navigator.clipboard.writeText(password);
                showToast("Senha redefinida e copiada para sua área de transferência!", "success");
            } catch (clipboardErr) {
                showToast(`Senha alterada com sucesso! Senha: ${password}`, "success");
            }
            closePwdResetModal();
        } else {
            showToast(data.message || "Erro ao redefinir senha.", "error");
        }
    } catch (err) {
        console.error("Erro ao resetar senha:", err);
        showToast("Erro ao comunicar com o servidor.", "error");
    }
}

// --- EVENTOS DO DOM ---
function initUIEvents() {
    // Logout
    document.getElementById("btn-logout").onclick = async () => {
        try {
            sessionStorage.removeItem('session_active');
            await fetch('api/logout.php');
            window.location.href = 'login.html';
        } catch (err) {
            showToast("Erro ao fazer logout.", "error");
        }
    };

    // Modal Ajustar Plano
    document.getElementById("btn-close-modal").onclick = closeEditModal;
    document.getElementById("btn-cancel-edit").onclick = closeEditModal;
    document.getElementById("btn-save-user-settings").onclick = saveUserSettings;

    // Modal Reset Senha
    document.getElementById("btn-close-pwd-modal").onclick = closePwdResetModal;
    document.getElementById("btn-cancel-pwd-reset").onclick = closePwdResetModal;
    document.getElementById("btn-submit-pwd-reset").onclick = submitPasswordReset;
    document.getElementById("btn-generate-password").onclick = generateRandomPassword;

    // Modal Planos
    document.getElementById("btn-close-plan-modal").onclick = closeEditPlanModal;
    document.getElementById("btn-cancel-plan-edit").onclick = closeEditPlanModal;
    document.getElementById("btn-save-plan-settings").onclick = savePlanSettings;
    
    const btnCreatePlan = document.getElementById("btn-create-plan");
    if (btnCreatePlan) {
        btnCreatePlan.onclick = () => openCreatePlanModal();
    }

    // --- EVENTOS DE LOTE (NOVO) ---
    // Checkbox Mestre
    const masterCheckbox = document.getElementById("select-all-users");
    if (masterCheckbox) {
        masterCheckbox.onchange = (e) => {
            const checked = e.target.checked;
            const checkboxes = document.querySelectorAll(".select-user-checkbox");
            adminState.selectedUsers = [];
            
            checkboxes.forEach(cb => {
                cb.checked = checked;
                const r = cb.closest("tr");
                if (checked) {
                    adminState.selectedUsers.push(parseInt(cb.dataset.id));
                    if (r) r.classList.add("row-selected");
                } else {
                    if (r) r.classList.remove("row-selected");
                }
            });
            updateBatchActionsBar();
        };
    }

    // Toggle input de expiração no modal de lote
    const batchExpiryOpt = document.getElementById("batch-expiry-option");
    if (batchExpiryOpt) {
        batchExpiryOpt.onchange = (e) => {
            const val = e.target.value;
            const input = document.getElementById("batch-sub-expires");
            if (val === 'set') {
                input.style.display = 'block';
            } else {
                input.style.display = 'none';
            }
        };
    }

    // Modal de Lote Fechar/Cancelar
    document.getElementById("btn-close-batch-modal").onclick = closeBatchEditModal;
    document.getElementById("btn-cancel-batch-edit").onclick = closeBatchEditModal;
    document.getElementById("btn-save-batch-settings").onclick = saveBatchSettings;

    // Abrir Modal de Lote
    document.getElementById("btn-batch-edit").onclick = () => {
        document.getElementById("batch-edit-count").textContent = adminState.selectedUsers.length;
        document.getElementById("batch-sub-status").value = "";
        document.getElementById("batch-expiry-option").value = "keep";
        document.getElementById("batch-sub-expires").value = "";
        document.getElementById("batch-sub-expires").style.display = "none";
        document.getElementById("batch-is-admin-select").value = "";
        
        // Apenas Super Admin (2) pode mudar cargos dos selecionados
        const roleSelect = document.getElementById("batch-is-admin-select");
        if (parseInt(adminState.user.is_admin) === 2) {
            roleSelect.disabled = false;
        } else {
            roleSelect.disabled = true;
        }
        
        document.getElementById("batch-edit-modal").classList.add("active");
    };

    // Botão Excluir Lote
    document.getElementById("btn-batch-delete").onclick = deleteBatchUsers;

    // Botão Restaurar Lote
    const btnBatchRestore = document.getElementById("btn-batch-restore");
    if (btnBatchRestore) {
        btnBatchRestore.onclick = restoreBatchUsers;
    }

    // Busca e Filtros
    let searchTimeout;
    document.getElementById("search-users").addEventListener("input", () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadUsers();
        }, 300);
    });

    document.getElementById("search-users").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            clearTimeout(searchTimeout);
            loadUsers();
        }
    });

    document.getElementById("filter-status").addEventListener("change", () => {
        loadUsers();
    });

    // Validador de tecla Enter dentro de caixas de texto de modais (simula o clique do botão Ok/Salvar)
    document.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const activeInput = document.activeElement;
            if (activeInput && (activeInput.tagName === "INPUT" || activeInput.tagName === "SELECT")) {
                const modal = activeInput.closest(".modal-overlay.active");
                if (modal) {
                    e.preventDefault();
                    let btn = null;
                    if (modal.id === "edit-user-modal") {
                        btn = document.getElementById("btn-save-user-settings");
                    } else if (modal.id === "reset-password-modal") {
                        btn = document.getElementById("btn-submit-pwd-reset");
                    } else if (modal.id === "batch-edit-modal") {
                        btn = document.getElementById("btn-save-batch-settings");
                    } else if (modal.id === "edit-plan-modal") {
                        btn = document.getElementById("btn-save-plan-settings");
                    }
                    if (btn) btn.click();
                }
            }
        }
    });
}

// --- MODAL EDITAR EM LOTE ---
function closeBatchEditModal() {
    document.getElementById("batch-edit-modal").classList.remove("active");
}

async function saveBatchSettings() {
    const status = document.getElementById("batch-sub-status").value;
    const expiryOption = document.getElementById("batch-expiry-option").value;
    let expiresAt = document.getElementById("batch-sub-expires").value;
    const roleVal = document.getElementById("batch-is-admin-select").value;
    const role = roleVal !== "" ? parseInt(roleVal) : null;

    if (status === "" && expiryOption === "keep" && role === null) {
        showToast("Nenhuma alteração selecionada para aplicação em lote.", "error");
        return;
    }

    if (expiryOption === "set" && !expiresAt) {
        showToast("Por favor, selecione uma data de expiração ou mude a opção de expiração.", "error");
        return;
    }

    if (expiresAt) {
        expiresAt = expiresAt.replace("T", " ") + ":00";
    } else {
        expiresAt = null;
    }

    showToast("Aplicando alterações em lote...", "info");

    try {
        const res = await fetch('api/admin/bulk_update.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_ids: adminState.selectedUsers,
                subscription_status: status,
                expiry_option: expiryOption,
                subscription_expires_at: expiresAt,
                is_admin: role
            })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            showToast(data.message || "Usuários atualizados com sucesso!", "success");
            closeBatchEditModal();
            resetSelection();
            await loadStats();
            await loadUsers();
        } else {
            showToast(data.message || "Erro ao salvar alterações coletivas.", "error");
        }
    } catch (err) {
        console.error("Erro ao atualizar em lote:", err);
        showToast("Erro de comunicação com o servidor.", "error");
    }
}

// --- EXCLUIR EM LOTE ---
async function deleteBatchUsers() {
    const count = adminState.selectedUsers.length;
    const statusFilter = document.getElementById("filter-status").value;
    
    // Validar se o Super Admin logado está na lista
    if (adminState.selectedUsers.includes(parseInt(adminState.user.id))) {
        showToast("Você não pode excluir a sua própria conta em lote. Desmarque o seu usuário.", "error");
        return;
    }

    let confirmMsg = `Deseja realmente enviar os ${count} usuários selecionados para a lixeira? A conta deles ficará inativa.`;
    if (statusFilter === "deleted") {
        confirmMsg = `ATENÇÃO: Deseja realmente EXCLUIR DEFINITIVAMENTE os ${count} usuários selecionados e todos os seus projetos? Esta ação é irreversível e apagará tudo permanentemente.`;
    }

    if (!confirm(confirmMsg)) {
        return;
    }

    showToast(statusFilter === "deleted" ? "Excluindo permanentemente..." : "Enviando para a lixeira...", "info");

    try {
        const res = await fetch('api/admin/bulk_delete.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_ids: adminState.selectedUsers
            })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            showToast(data.message || "Operação em lote realizada com sucesso!", "success");
            resetSelection();
            await loadStats();
            await loadUsers();
        } else {
            showToast(data.message || "Erro ao executar exclusão coletiva.", "error");
        }
    } catch (err) {
        console.error("Erro ao deletar em lote:", err);
        showToast("Erro de comunicação com o servidor.", "error");
    }
}

// --- RESTAURAR EM LOTE ---
async function restoreBatchUsers() {
    const count = adminState.selectedUsers.length;
    if (!confirm(`Deseja realmente restaurar os ${count} usuários selecionados?`)) {
        return;
    }

    showToast("Restaurando usuários em lote...", "info");

    try {
        const res = await fetch('api/admin/restore_user.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_ids: adminState.selectedUsers
            })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            showToast(data.message || "Usuários restaurados com sucesso!", "success");
            resetSelection();
            await loadStats();
            await loadUsers();
        } else {
            showToast(data.message || "Erro ao restaurar usuários.", "error");
        }
    } catch (err) {
        console.error("Erro ao restaurar em lote:", err);
        showToast("Erro de comunicação com o servidor.", "error");
    }
}

// --- HELPERS ---
function formatCurrency(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

function formatDate(dateStr) {
    if (!dateStr) return "";
    
    // Normaliza datas no formato MySQL "YYYY-MM-DD HH:MM:SS" para ISO 8601 UTC ("YYYY-MM-DDTHH:MM:SSZ")
    let normalizedStr = dateStr;
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(dateStr)) {
        normalizedStr = dateStr.replace(" ", "T") + "Z";
    } else if (dateStr.includes("T") && !dateStr.includes("Z") && !dateStr.includes("+") && !dateStr.includes("-")) {
        normalizedStr = dateStr + "Z";
    }
    
    const d = new Date(normalizedStr);
    if (isNaN(d.getTime())) {
        return dateStr;
    }
    
    // Obter o timezone do administrador logado
    const userTimezone = (adminState.user && adminState.user.timezone) || 'America/Sao_Paulo';
    
    try {
        return d.toLocaleDateString("pt-BR", {
            timeZone: userTimezone,
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    } catch (e) {
        return d.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
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
    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// --- GERENCIAMENTO DE ABAS ADMIN ---
function switchAdminTab(tab) {
    const usersSection = document.getElementById("admin-users-section");
    const plansSection = document.getElementById("admin-plans-section");
    const landingSection = document.getElementById("admin-landing-section");
    const tabUsersBtn = document.getElementById("tab-users-nav");
    const tabPlansBtn = document.getElementById("tab-plans-nav");
    const tabLandingBtn = document.getElementById("tab-landing-nav");

    // Ocultar tudo
    usersSection.style.display = 'none';
    plansSection.style.display = 'none';
    landingSection.style.display = 'none';
    tabUsersBtn.classList.remove('active');
    tabPlansBtn.classList.remove('active');
    if (tabLandingBtn) tabLandingBtn.classList.remove('active');

    if (tab === 'users') {
        usersSection.style.display = 'block';
        tabUsersBtn.classList.add('active');
    } else if (tab === 'plans') {
        plansSection.style.display = 'block';
        tabPlansBtn.classList.add('active');
        loadPlans();
    } else if (tab === 'landing') {
        if (landingSection) landingSection.style.display = 'block';
        if (tabLandingBtn) tabLandingBtn.classList.add('active');
        loadHomeCMS();
    }
}

// --- CARREGAR PLANOS DA MATRIZ ---
let systemPlans = [];
async function loadPlans() {
    const tableBody = document.getElementById("plans-table-body");
    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="table-loading">
                <i class="fa-solid fa-circle-notch fa-spin"></i> Carregando planos...
            </td>
        </tr>
    `;

    try {
        const res = await fetch("api/admin/list_plans.php");
        const data = await res.json();
        if (res.ok && data.success) {
            systemPlans = data.plans;
            renderPlansTable(systemPlans);
        } else {
            showToast(data.message || "Erro ao carregar planos.", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Erro ao carregar lista de planos.", "error");
    }
}

// --- RENDERIZAR TABELA DE PLANOS ---
function renderPlansTable(plans) {
    const tableBody = document.getElementById("plans-table-body");
    tableBody.innerHTML = "";

    if (plans.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 20px; color: var(--text-secondary);">
                    Nenhum plano cadastrado.
                </td>
            </tr>
        `;
        return;
    }

    plans.forEach(plan => {
        const row = document.createElement("tr");

        // Formatar limites numéricos
        const toursLimit = parseInt(plan.max_tours) > 90000 ? "Ilimitados" : plan.max_tours;
        const scenesLimit = parseInt(plan.max_scenes) > 90000 ? "Ilimitadas" : plan.max_scenes;
        const logosLimit = parseInt(plan.max_logos) > 90000 ? "Ilimitados" : plan.max_logos;
        const limitsStr = `Tours: ${toursLimit} / Cenas: ${scenesLimit} / Logos: ${logosLimit}`;

        // Recursos ativos
        const features = [];
        if (parseInt(plan.navigation_arrows)) features.push("Setas");
        if (parseInt(plan.no_ads)) features.push("Sem Ads");
        if (parseInt(plan.privacy_control)) features.push("Senha");
        if (parseInt(plan.offline_access)) features.push("Offline");
        if (parseInt(plan.ambient_sound)) features.push("Som MP3");
        if (parseInt(plan.image_gallery)) features.push("Galeria");
        if (parseInt(plan.floor_plans)) features.push("Planta Baixa");
        if (parseInt(plan.text_markers)) features.push("Text Markers");
        if (parseInt(plan.nadir_patch)) features.push("Nadir");
        if (parseInt(plan.rich_hotspots)) features.push("Rich Media");

        const featuresStr = features.length > 0 
            ? features.map(f => `<span class="badge-status badge-role-admin" style="margin: 2px; font-size: 11px;">${f}</span>`).join(" ")
            : `<span style="color: var(--text-secondary); font-size: 12px;">Nenhum</span>`;

        const pMonthly = parseFloat(plan.price_monthly) == 0 ? "Grátis" : formatCurrency(plan.price_monthly);
        const pYearly = parseFloat(plan.price_yearly) == 0 ? "Grátis" : formatCurrency(plan.price_yearly);

        const isSuper = parseInt(adminState.user.is_admin) === 2;
        const actionBtn = isSuper 
            ? `<button class="btn-action-edit btn-edit-plan-btn" data-id="${plan.id}"><i class="fa-solid fa-gem"></i> Configurar</button>`
            : `<span class="badge-status">Apenas Leitura</span>`;

        row.innerHTML = `
            <td><strong>${escapeHTML(plan.name)}</strong> <span style="font-size: 11px; color: var(--text-secondary);">(${escapeHTML(plan.plan_key)})</span></td>
            <td>${pMonthly}</td>
            <td>${pYearly}</td>
            <td>${limitsStr}</td>
            <td><div style="max-width: 350px; display: flex; flex-wrap: wrap; gap: 4px;">${featuresStr}</div></td>
            <td>${actionBtn}</td>
        `;

        const btn = row.querySelector(".btn-edit-plan-btn");
        if (btn) {
            btn.onclick = () => openEditPlanModal(plan);
        }

        tableBody.appendChild(row);
    });
}

// --- MODAL EDITAR PLANO ---
function openEditPlanModal(plan) {
    document.getElementById("edit-plan-id").value = plan.id;
    document.getElementById("edit-plan-name").value = plan.name;
    
    // Configurar o campo de chave como desabilitado para planos existentes
    const keyInput = document.getElementById("edit-plan-key");
    keyInput.value = plan.plan_key;
    keyInput.disabled = true;
    keyInput.style.opacity = "0.6";
    keyInput.style.cursor = "not-allowed";

    document.getElementById("edit-plan-price-monthly").value = plan.price_monthly;
    document.getElementById("edit-plan-price-yearly").value = plan.price_yearly;

    document.getElementById("edit-plan-max-tours").value = plan.max_tours;
    document.getElementById("edit-plan-max-scenes").value = plan.max_scenes;
    document.getElementById("edit-plan-max-logos").value = plan.max_logos;
    document.getElementById("edit-plan-gsv-projects").value = plan.gsv_projects_per_month;

    // Checkboxes
    document.getElementById("edit-plan-navigation-arrows").checked = parseInt(plan.navigation_arrows) === 1;
    document.getElementById("edit-plan-no-ads").checked = parseInt(plan.no_ads) === 1;
    document.getElementById("edit-plan-privacy-control").checked = parseInt(plan.privacy_control) === 1;
    document.getElementById("edit-plan-offline-access").checked = parseInt(plan.offline_access) === 1;
    document.getElementById("edit-plan-ambient-sound").checked = parseInt(plan.ambient_sound) === 1;
    document.getElementById("edit-plan-image-gallery").checked = parseInt(plan.image_gallery) === 1;
    document.getElementById("edit-plan-floor-plans").checked = parseInt(plan.floor_plans) === 1;
    document.getElementById("edit-plan-text-markers").checked = parseInt(plan.text_markers) === 1;
    document.getElementById("edit-plan-nadir-patch").checked = parseInt(plan.nadir_patch) === 1;
    document.getElementById("edit-plan-rich-hotspots").checked = parseInt(plan.rich_hotspots) === 1;

    document.getElementById("edit-plan-modal").classList.add("active");
}

function openCreatePlanModal() {
    document.getElementById("edit-plan-id").value = "0";
    document.getElementById("edit-plan-name").value = "";
    
    // Configurar o campo de chave como habilitado para novo plano
    const keyInput = document.getElementById("edit-plan-key");
    keyInput.value = "";
    keyInput.disabled = false;
    keyInput.style.opacity = "1";
    keyInput.style.cursor = "text";

    document.getElementById("edit-plan-price-monthly").value = "0.00";
    document.getElementById("edit-plan-price-yearly").value = "0.00";

    document.getElementById("edit-plan-max-tours").value = "5";
    document.getElementById("edit-plan-max-scenes").value = "10";
    document.getElementById("edit-plan-max-logos").value = "0";
    document.getElementById("edit-plan-gsv-projects").value = "0";

    // Checkboxes
    document.getElementById("edit-plan-navigation-arrows").checked = false;
    document.getElementById("edit-plan-no-ads").checked = false;
    document.getElementById("edit-plan-privacy-control").checked = false;
    document.getElementById("edit-plan-offline-access").checked = false;
    document.getElementById("edit-plan-ambient-sound").checked = false;
    document.getElementById("edit-plan-image-gallery").checked = false;
    document.getElementById("edit-plan-floor-plans").checked = false;
    document.getElementById("edit-plan-text-markers").checked = false;
    document.getElementById("edit-plan-nadir-patch").checked = false;
    document.getElementById("edit-plan-rich-hotspots").checked = false;

    document.getElementById("edit-plan-modal").classList.add("active");
}

function closeEditPlanModal() {
    document.getElementById("edit-plan-modal").classList.remove("active");
}

// --- SALVAR CONFIGURAÇÕES DO PLANO ---
async function savePlanSettings() {
    const id = parseInt(document.getElementById("edit-plan-id").value);
    const name = document.getElementById("edit-plan-name").value.trim();
    const plan_key = document.getElementById("edit-plan-key").value.trim();
    const price_monthly = parseFloat(document.getElementById("edit-plan-price-monthly").value) || 0;
    const price_yearly = parseFloat(document.getElementById("edit-plan-price-yearly").value) || 0;

    const max_tours = parseInt(document.getElementById("edit-plan-max-tours").value) || 0;
    const max_scenes = parseInt(document.getElementById("edit-plan-max-scenes").value) || 0;
    const max_logos = parseInt(document.getElementById("edit-plan-max-logos").value) || 0;
    const gsv_projects_per_month = parseInt(document.getElementById("edit-plan-gsv-projects").value) || 0;

    const navigation_arrows = document.getElementById("edit-plan-navigation-arrows").checked ? 1 : 0;
    const no_ads = document.getElementById("edit-plan-no-ads").checked ? 1 : 0;
    const privacy_control = document.getElementById("edit-plan-privacy-control").checked ? 1 : 0;
    const offline_access = document.getElementById("edit-plan-offline-access").checked ? 1 : 0;
    const ambient_sound = document.getElementById("edit-plan-ambient-sound").checked ? 1 : 0;
    const image_gallery = document.getElementById("edit-plan-image-gallery").checked ? 1 : 0;
    const floor_plans = document.getElementById("edit-plan-floor-plans").checked ? 1 : 0;
    const text_markers = document.getElementById("edit-plan-text-markers").checked ? 1 : 0;
    const nadir_patch = document.getElementById("edit-plan-nadir-patch").checked ? 1 : 0;
    const rich_hotspots = document.getElementById("edit-plan-rich-hotspots").checked ? 1 : 0;

    if (!name) {
        showToast("O nome do plano é obrigatório.", "error");
        return;
    }

    if (id === 0 && !plan_key) {
        showToast("O identificador (chave) do plano é obrigatório para novos planos.", "error");
        return;
    }

    showToast(id === 0 ? "Criando plano..." : "Atualizando dados do plano...", "info");

    try {
        const res = await fetch("api/admin/update_plan.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id, name, plan_key, price_monthly, price_yearly, max_tours, max_scenes,
                max_logos, gsv_projects_per_month, navigation_arrows, no_ads,
                privacy_control, offline_access, ambient_sound, image_gallery,
                floor_plans, text_markers, nadir_patch, rich_hotspots
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast(id === 0 ? "Plano criado com sucesso!" : "Plano atualizado com sucesso!", "success");
            closeEditPlanModal();
            loadPlans();
        } else {
            showToast(data.message || "Erro ao salvar plano.", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Erro ao conectar com o servidor.", "error");
    }
}

// --- CMS DE EDIÇÃO DA LANDING PAGE ---
async function loadHomeCMS() {
    try {
        const res = await fetch("api/get_home_settings.php");
        const data = await res.json();
        if (res.ok && data.success) {
            const s = data.settings || {};
            document.getElementById("cms-hero-title").value = s.hero_title || "";
            document.getElementById("cms-hero-subtitle").value = s.hero_subtitle || "";
            document.getElementById("cms-hero-cta").value = s.hero_cta_text || "";
            document.getElementById("cms-hero-image").value = s.hero_image_url || "";
            document.getElementById("cms-features-title").value = s.features_title || "";
            document.getElementById("cms-features-subtitle").value = s.features_subtitle || "";
        } else {
            showToast("Erro ao carregar configurações da Landing Page.", "error");
        }
    } catch (e) {
        console.error(e);
        showToast("Erro de rede ao carregar CMS.", "error");
    }
}

async function saveHomeCMS() {
    const btn = document.getElementById("btn-save-home-cms");
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

    const settings = {
        hero_title: document.getElementById("cms-hero-title").value,
        hero_subtitle: document.getElementById("cms-hero-subtitle").value,
        hero_cta_text: document.getElementById("cms-hero-cta").value,
        hero_image_url: document.getElementById("cms-hero-image").value,
        features_title: document.getElementById("cms-features-title").value,
        features_subtitle: document.getElementById("cms-features-subtitle").value
    };

    try {
        const res = await fetch("api/admin/update_home_settings.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ settings })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast("Landing Page salva e atualizada com sucesso!");
        } else {
            showToast(data.message || "Erro ao salvar configurações da Landing Page.", "error");
        }
    } catch (e) {
        console.error(e);
        showToast("Erro de rede ao salvar CMS.", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Landing Page';
    }
}
