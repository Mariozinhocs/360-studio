/* ----------------------------------------------------------------------
 * 360° Studio - Scripts da Tela de Vendas e Planos
 * ---------------------------------------------------------------------- */

let currentPlan = null;
let billingCycle = "monthly"; // "monthly" ou "yearly"
let currentUser = null;
let currentPaymentMethod = "pix";

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Verificar Autenticação
    await checkAuth();

    // 2. Ouvir mudanças no Billing Toggle Switch
    const checkbox = document.getElementById("billing-checkbox");
    const labelMonthly = document.getElementById("billing-monthly");
    const labelYearly = document.getElementById("billing-yearly");

    if (checkbox) {
        checkbox.addEventListener("change", (e) => {
            if (e.target.checked) {
                billingCycle = "yearly";
                if (labelYearly) labelYearly.classList.add("active");
                if (labelMonthly) labelMonthly.classList.remove("active");
            } else {
                billingCycle = "monthly";
                if (labelMonthly) labelMonthly.classList.add("active");
                if (labelYearly) labelYearly.classList.remove("active");
            }
            updatePricingUI();
        });
    }
});

// Verificar se o usuário está logado
async function checkAuth() {
    try {
        const res = await fetch("api/check_auth.php");
        const data = await res.json();
        if (res.ok && data.success) {
            currentUser = data.user;
            // Se já tiver um plano ativo, podemos desabilitar ou mudar o texto do botão desse plano
            highlightActivePlan(currentUser.subscription_status);
        } else {
            currentUser = null;
        }
    } catch (err) {
        console.error("Erro ao validar sessão:", err);
        currentUser = null;
    }
}

// Destacar o plano ativo atual do usuário
function highlightActivePlan(activePlan) {
    document.querySelectorAll(".plan-card").forEach(card => {
        const plan = card.dataset.plan;
        const btn = card.querySelector(".btn-select-plan");
        if (plan === activePlan) {
            card.style.borderColor = "var(--color-accent-blue)";
            if (btn) {
                btn.textContent = "Plano Atual";
                btn.disabled = true;
                btn.style.opacity = "0.7";
                btn.style.cursor = "default";
                btn.style.background = "rgba(0, 242, 254, 0.1)";
                btn.style.color = "var(--color-accent-blue)";
                btn.style.borderColor = "var(--color-accent-blue)";
            }
        }
    });
}

// Atualizar preços na UI com base no billingCycle (Mensal/Anual)
function updatePricingUI() {
    document.querySelectorAll(".plan-price").forEach(priceEl => {
        const monthlyVal = priceEl.dataset.monthly;
        const yearlyVal = priceEl.dataset.yearly;

        if (monthlyVal && yearlyVal) {
            if (billingCycle === "yearly") {
                priceEl.innerHTML = `R$ ${yearlyVal}<span>/mês</span>`;
            } else {
                priceEl.innerHTML = `R$ ${monthlyVal}<span>/mês</span>`;
            }
        }
    });

    document.querySelectorAll(".plan-price-period").forEach(periodEl => {
        if (billingCycle === "yearly") {
            periodEl.textContent = "Faturado anualmente";
        } else {
            periodEl.textContent = "Faturado mensalmente";
        }
    });
}

// Abrir checkout
function openCheckout(plan) {
    if (!currentUser) {
        // Usuário não está logado, redireciona para login/cadastro com parâmetros
        showToast("Você precisa fazer login ou cadastrar-se para assinar um plano.", "warning");
        setTimeout(() => {
            window.location.href = `login.html?redirect=plans.html&plan=${plan}`;
        }, 1500);
        return;
    }

    currentPlan = plan;
    
    // Obter dados do plano
    const card = document.querySelector(`.plan-card[data-plan="${plan}"]`);
    if (!card) return;

    const planName = card.querySelector("h2").textContent;
    const priceText = card.querySelector(".plan-price").innerHTML;
    
    // Atualizar resumo no modal
    document.getElementById("summary-plan-name").textContent = `Plano ${planName}`;
    document.getElementById("summary-plan-period").textContent = billingCycle === "yearly" ? "Faturamento Anual (-20%)" : "Faturamento Mensal";
    document.getElementById("summary-plan-price").innerHTML = priceText;

    // Se for o plano Grátis, efetuar upgrade imediato sem modal de checkout
    if (plan === "gratis") {
        confirmGratisUpgrade();
        return;
    }

    // Exibir modal
    document.getElementById("checkout-modal").classList.add("active");
}

// Fechar checkout
function closeCheckout() {
    document.getElementById("checkout-modal").classList.remove("active");
}

// Selecionar método de pagamento (Pix vs Cartão)
function selectPaymentMethod(method) {
    currentPaymentMethod = method;

    document.getElementById("tab-pix").classList.toggle("active", method === "pix");
    document.getElementById("tab-card").classList.toggle("active", method === "card");

    document.getElementById("pane-pix").classList.toggle("active", method === "pix");
    document.getElementById("pane-card").classList.toggle("active", method === "card");
}

// Copiar código Pix
function copyPixCode() {
    const pixCode = document.getElementById("pix-code").textContent;
    navigator.clipboard.writeText(pixCode).then(() => {
        showToast("Código Pix copiado para a área de transferência!", "success");
    }).catch(err => {
        showToast("Falha ao copiar código.", "error");
    });
}

// Efetuar upgrade grátis direto
async function confirmGratisUpgrade() {
    showToast("Alterando para o plano Grátis...", "info");
    await requestSubscriptionUpgrade("gratis");
}

// Confirmar pagamento simulado
async function confirmPayment() {
    if (currentPaymentMethod === "card") {
        // Validação básica de cartão
        const num = document.getElementById("card-number").value.trim();
        const name = document.getElementById("card-name").value.trim();
        const exp = document.getElementById("card-expiry").value.trim();
        const cvv = document.getElementById("card-cvv").value.trim();

        if (!num || !name || !exp || !cvv) {
            showToast("Por favor, preencha todos os dados do cartão.", "warning");
            return;
        }
    }

    showToast("Processando pagamento simulado...", "info");
    setTimeout(async () => {
        await requestSubscriptionUpgrade(currentPlan);
    }, 1500);
}

// Fazer requisição AJAX de assinatura
async function requestSubscriptionUpgrade(plan) {
    try {
        const res = await fetch("api/mock_subscribe.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan: plan })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            showToast(data.message, "success");
            closeCheckout();
            
            // Redirecionar ao painel após 2 segundos
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 2000);
        } else {
            showToast(data.message || "Erro ao processar assinatura.", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Erro de rede ao processar assinatura.", "error");
    }
}

// --- HELPER: TOAST NOTIFICATIONS ---
function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    // Icon mapping
    let iconClass = "fa-info-circle";
    if (type === "success") iconClass = "fa-check-circle";
    if (type === "error") iconClass = "fa-times-circle";
    if (type === "warning") iconClass = "fa-exclamation-triangle";

    toast.style.cssText = `
        background: rgba(22, 24, 30, 0.95);
        color: #fff;
        border-left: 4px solid #00f2fe;
        border-radius: 6px;
        padding: 12px 20px;
        font-size: 13px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideUp 0.3s ease-out;
        min-width: 250px;
    `;

    if (type === "success") toast.style.borderLeftColor = "#00f2fe";
    if (type === "error") toast.style.borderLeftColor = "#ff4a5a";
    if (type === "warning") toast.style.borderLeftColor = "#ffb700";

    toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = "slideOut 0.3s ease-in forwards";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
