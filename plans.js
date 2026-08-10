/* ----------------------------------------------------------------------
 * 360° Studio - Scripts da Tela de Vendas e Planos (Mercado Pago Sandbox)
 * ---------------------------------------------------------------------- */

let currentPlan = null;
let billingCycle = "monthly"; // "monthly" ou "yearly"
let currentUser = null;
let currentPaymentMethod = "pix";
let mp = null;
let userEmail = "";
let pollingInterval = null;

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Verificar Autenticação
    await checkAuth();

    // 2. Carregar configuração de pagamento do Mercado Pago (Public Key)
    if (currentUser) {
        await loadPaymentConfig();
    }

    // 3. Ouvir mudanças no Billing Toggle Switch
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
            // Destacar o plano ativo atual
            highlightActivePlan(currentUser.subscription_status);
        } else {
            currentUser = null;
        }
    } catch (err) {
        console.error("Erro ao validar sessão:", err);
        currentUser = null;
    }
}

// Carregar configuração do Mercado Pago do servidor
async function loadPaymentConfig() {
    try {
        const res = await fetch("api/get_payment_config.php");
        const data = await res.json();
        if (res.ok && data.success) {
            userEmail = data.email;
            if (typeof MercadoPago !== "undefined") {
                mp = new MercadoPago(data.publicKey);
            } else {
                console.error("SDK do Mercado Pago não encontrado na página.");
            }
        }
    } catch (err) {
        console.error("Erro de configuração:", err);
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

// Atualizar preços na UI com base no billingCycle
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

    // Se for o plano Grátis, efetuar upgrade direto
    if (plan === "gratis") {
        confirmGratisUpgrade();
        return;
    }

    // Exibir modal
    document.getElementById("checkout-modal").classList.add("active");
}

// Fechar checkout e limpar polling
function closeCheckout() {
    document.getElementById("checkout-modal").classList.remove("active");
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
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
    try {
        const res = await fetch("api/mock_subscribe.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan: "gratis" })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast(data.message, "success");
            setTimeout(() => window.location.href = "dashboard.html", 1500);
        } else {
            showToast(data.message || "Erro ao processar plano.", "error");
        }
    } catch (err) {
        showToast("Erro na requisição.", "error");
    }
}

// Tokenizar o cartão usando SDK JS do Mercado Pago
async function tokenizeCard() {
    if (!mp) {
        showToast("Gateway de pagamento não inicializado. Recarregue a página.", "error");
        return null;
    }

    const cardNo = document.getElementById("card-number").value.replace(/\s/g, '');
    const cardName = document.getElementById("card-name").value.trim();
    const expiry = document.getElementById("card-expiry").value.trim();
    const cvv = document.getElementById("card-cvv").value.trim();

    if (!cardNo || !cardName || !expiry || !cvv) {
        showToast("Por favor, preencha todos os campos do cartão.", "warning");
        return null;
    }

    const expiryParts = expiry.split("/");
    if (expiryParts.length !== 2) {
        showToast("Formato de validade incorreto. Use MM/AA.", "warning");
        return null;
    }

    const month = expiryParts[0].trim();
    const year = "20" + expiryParts[1].trim();

    try {
        const tokenResult = await mp.cardToken.create({
            cardNumber: cardNo,
            cardholderName: cardName,
            cardExpirationMonth: month,
            cardExpirationYear: year,
            securityCode: cvv,
            identificationType: "CPF",
            identificationNumber: "00000000000" // Identificação genérica para testes
        });

        if (tokenResult && tokenResult.id) {
            return {
                token: tokenResult.id,
                payment_method_id: tokenResult.payment_method_id || detectCardBrand(cardNo)
            };
        } else {
            showToast("Verifique os números e dados do seu cartão de teste.", "error");
            return null;
        }
    } catch (err) {
        console.error("Tokenization error:", err);
        showToast("Erro na validação de segurança do cartão.", "error");
        return null;
    }
}

function detectCardBrand(number) {
    if (number.startsWith("4")) return "visa";
    if (/^5[1-5]/.test(number)) return "mastercard";
    if (/^3[47]/.test(number)) return "amex";
    return "visa";
}

// Confirmar pagamento
async function confirmPayment() {
    if (currentPaymentMethod === "card") {
        showToast("Validando cartão com segurança...", "info");
        const cardData = await tokenizeCard();
        if (!cardData) return;

        showToast("Processando pagamento via Cartão...", "info");
        try {
            const res = await fetch("api/process_payment.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    plan: currentPlan,
                    billing_cycle: billingCycle,
                    payment_method_id: cardData.payment_method_id,
                    token: cardData.token
                })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                if (data.status === "approved") {
                    showToast("Pagamento aprovado! Assinatura ativada.", "success");
                    closeCheckout();
                    setTimeout(() => {
                        window.location.href = "dashboard.html";
                    }, 2000);
                } else {
                    showToast(`O pagamento foi: ${data.status} (${data.status_detail})`, "warning");
                }
            } else {
                showToast(data.message || "Erro no processamento.", "error");
            }
        } catch (err) {
            console.error(err);
            showToast("Erro de rede ao liquidar pagamento.", "error");
        }

    } else if (currentPaymentMethod === "pix") {
        showToast("Gerando Pix de assinatura no Mercado Pago...", "info");
        try {
            const res = await fetch("api/process_payment.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    plan: currentPlan,
                    billing_cycle: billingCycle,
                    payment_method_id: "pix"
                })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                const pixCodeText = document.getElementById("pix-code");
                const qrPlaceholder = document.querySelector(".pix-qr-box");

                if (pixCodeText) pixCodeText.textContent = data.qr_code;
                if (qrPlaceholder) {
                    qrPlaceholder.innerHTML = `<img src="data:image/png;base64,${data.qr_code_base64}" style="width:100%; height:100%; object-fit:contain;" alt="QR Code Pix">`;
                }

                showToast("Pix gerado! Aguardando pagamento...", "success");

                // Iniciar Polling do status a cada 5 segundos
                if (pollingInterval) clearInterval(pollingInterval);
                pollingInterval = setInterval(() => {
                    checkPixStatus(data.payment_id);
                }, 5000);

            } else {
                showToast(data.message || "Erro ao gerar Pix de cobrança.", "error");
            }
        } catch (err) {
            console.error(err);
            showToast("Erro de conexão ao gerar o Pix.", "error");
        }
    }
}

// Polling de pagamento Pix
async function checkPixStatus(paymentId) {
    try {
        const res = await fetch(`api/check_payment_status.php?payment_id=${paymentId}`);
        const data = await res.json();

        if (res.ok && data.success && data.status === "approved") {
            clearInterval(pollingInterval);
            showToast("Pagamento Pix confirmado! Assinatura ativada.", "success");
            closeCheckout();
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 2000);
        }
    } catch (err) {
        console.error("Erro no status Pix:", err);
    }
}

// --- HELPER: TOAST NOTIFICATIONS ---
function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
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
