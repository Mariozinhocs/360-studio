document.addEventListener("DOMContentLoaded", () => {
    // Autenticação básica do painel admin
    checkAdminAccess();

    // Referências do DOM
    const postsContainer = document.getElementById("posts-list-container");
    const btnNewPost = document.getElementById("btn-new-post");
    const editorModal = document.getElementById("post-editor-modal");
    const modalTitle = document.getElementById("modal-title");
    const btnCloseModal = document.getElementById("btn-close-modal");
    const btnCancelPost = document.getElementById("btn-cancel-post");
    const formPost = document.getElementById("form-blog-post");
    const btnLogout = document.getElementById("btn-logout");

    // Inputs do formulário
    const inputId = document.getElementById("post-id");
    const inputTitle = document.getElementById("post-title");
    const inputAuthor = document.getElementById("post-author");
    const inputReadtime = document.getElementById("post-readtime");
    const inputCover = document.getElementById("post-cover");
    const inputExcerpt = document.getElementById("post-excerpt");
    const inputContent = document.getElementById("post-content");

    let allPosts = [];

    // Carregar posts
    async function loadPosts() {
        postsContainer.innerHTML = `
            <div class="table-loading" style="text-align: center; padding: 60px 0; color: var(--text-secondary);">
                <i class="fa-solid fa-circle-notch fa-spin"></i> Carregando feed de notícias...
            </div>
        `;

        try {
            // Buscando direto do arquivo público do Blog
            const res = await fetch("api/blog_posts.json?nocache=" + Date.now());
            if (!res.ok) throw new Error("Erro ao carregar banco de dados do blog.");
            
            allPosts = await res.json();
            renderPostsList();
        } catch (err) {
            console.error(err);
            postsContainer.innerHTML = `
                <div class="table-loading" style="text-align: center; padding: 40px 0; color: #ff3366;">
                    <i class="fa-solid fa-circle-exclamation"></i> Erro ao conectar ao feed de posts.
                </div>
            `;
        }
    }

    // Renderizar posts na lista
    function renderPostsList() {
        if (!allPosts || allPosts.length === 0) {
            postsContainer.innerHTML = `
                <div class="table-loading" style="text-align: center; padding: 60px 0; color: var(--text-secondary);">
                    <i class="fa-regular fa-folder-open" style="font-size: 24px; margin-bottom: 8px;"></i>
                    <p>Nenhum artigo publicado no blog ainda.</p>
                </div>
            `;
            return;
        }

        postsContainer.innerHTML = "";

        allPosts.forEach(post => {
            const item = document.createElement("div");
            item.className = "post-list-item";
            item.innerHTML = `
                <div class="post-item-info">
                    <div class="post-item-thumb">
                        <img src="${post.cover}" alt="Capa" onerror="this.src='https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'">
                    </div>
                    <div class="post-item-details">
                        <div class="post-item-title">${escapeHTML(post.title)}</div>
                        <div class="post-item-meta">
                            <span><i class="fa-regular fa-calendar"></i> ${post.date}</span>
                            <span><i class="fa-regular fa-user"></i> ${escapeHTML(post.author)}</span>
                            <span><i class="fa-solid fa-link"></i> /${post.id}</span>
                        </div>
                    </div>
                </div>
                <div class="post-item-actions">
                    <button class="btn btn-secondary btn-sm btn-edit-post" data-id="${post.id}" style="width: auto; padding: 8px 12px; font-size: 11px;">
                        <i class="fa-solid fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-danger btn-sm btn-delete-post" data-id="${post.id}" style="width: auto; padding: 8px 12px; font-size: 11px;">
                        <i class="fa-solid fa-trash"></i> Excluir
                    </button>
                </div>
            `;
            postsContainer.appendChild(item);
        });

        // Eventos dos botões
        document.querySelectorAll(".btn-edit-post").forEach(btn => {
            btn.addEventListener("click", () => openEditor(btn.getAttribute("data-id")));
        });

        document.querySelectorAll(".btn-delete-post").forEach(btn => {
            btn.addEventListener("click", () => deletePost(btn.getAttribute("data-id")));
        });
    }

    // Abrir editor para Criar
    btnNewPost.addEventListener("click", () => {
        formPost.reset();
        inputId.value = "";
        inputAuthor.value = "Mario Henrique";
        inputReadtime.value = "5 min de leitura";
        inputCover.value = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80";
        modalTitle.innerHTML = `<i class="fa-solid fa-circle-plus"></i> Criar Novo Artigo`;
        editorModal.classList.add("open");
    });

    // Abrir editor para Editar
    function openEditor(id) {
        const post = allPosts.find(p => p.id === id);
        if (!post) return;

        inputId.value = post.id;
        inputTitle.value = post.title;
        inputAuthor.value = post.author || "Mario Henrique";
        inputReadtime.value = post.readTime || "5 min de leitura";
        inputCover.value = post.cover || "";
        inputExcerpt.value = post.excerpt || "";
        inputContent.value = post.content || "";

        modalTitle.innerHTML = `<i class="fa-regular fa-pen-to-square"></i> Editar Artigo`;
        editorModal.classList.add("open");
    }

    // Salvar artigo
    formPost.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Data formatada se for post novo
        let formattedDate = "";
        if (!inputId.value) {
            const dateObj = new Date();
            const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
            formattedDate = `${dateObj.getDate()} de ${months[dateObj.getMonth()]} de ${dateObj.getFullYear()}`;
        } else {
            // Mantém a data original se for edição
            const oldPost = allPosts.find(p => p.id === inputId.value);
            formattedDate = oldPost ? oldPost.date : "";
        }

        const payload = {
            id: inputId.value,
            title: inputTitle.value,
            author: inputAuthor.value,
            readTime: inputReadtime.value,
            cover: inputCover.value,
            excerpt: inputExcerpt.value,
            content: inputContent.value,
            date: formattedDate
        };

        try {
            const res = await fetch("api/admin/save_post.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                showToast(data.message, "success");
                editorModal.classList.remove("open");
                loadPosts();
            } else {
                showToast(data.message || "Erro ao salvar o post.", "error");
            }
        } catch (err) {
            console.error(err);
            showToast("Falha na conexão com o servidor.", "error");
        }
    });

    // Excluir post
    async function deletePost(id) {
        if (!confirm("Deseja realmente excluir permanentemente este artigo? Esta ação não pode ser desfeita!")) {
            return;
        }

        try {
            const res = await fetch("api/admin/delete_post.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id })
            });

            const data = await res.json();
            if (data.success) {
                showToast(data.message, "success");
                loadPosts();
            } else {
                showToast(data.message || "Erro ao excluir o post.", "error");
            }
        } catch (err) {
            console.error(err);
            showToast("Erro na conexão ao excluir post.", "error");
        }
    }

    // Fechar modais
    btnCloseModal.addEventListener("click", () => editorModal.classList.remove("open"));
    btnCancelPost.addEventListener("click", () => editorModal.classList.remove("open"));

    // Autenticação Admin
    async function checkAdminAccess() {
        try {
            const res = await fetch("api/check_auth.php");
            const data = await res.json();
            if (!data.logged_in || parseInt(data.user.is_admin || 0) < 1) {
                // Não é admin, redirecionar
                window.location.href = "login.html";
            } else {
                loadPosts();
            }
        } catch (e) {
            window.location.href = "login.html";
        }
    }

    // Logout
    if (btnLogout) {
        btnLogout.addEventListener("click", async () => {
            try {
                await fetch("api/logout.php");
                window.location.href = "login.html";
            } catch (err) {
                window.location.href = "login.html";
            }
        });
    }

    // Toast
    function showToast(message, type = "info") {
        const container = document.getElementById("toast-container");
        if (!container) return;
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        
        let icon = '<i class="fa-solid fa-circle-info"></i>';
        if (type === "success") icon = '<i class="fa-solid fa-circle-check"></i>';
        if (type === "error") icon = '<i class="fa-solid fa-circle-exclamation"></i>';

        toast.innerHTML = `${icon} <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => toast.classList.add("show"), 10);
        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // Escape HTML
    function escapeHTML(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});
