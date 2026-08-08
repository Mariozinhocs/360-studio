<?php
require_once 'config.php';

loginRequired();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

try {
    // Atualizar o status de assinatura do usuário logado para 'active' (Premium) sem expiração
    $stmt = $pdo->prepare("UPDATE " . TABLE_PREFIX . "users SET subscription_status = 'profissional', subscription_expires_at = NULL WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);

    echo json_encode([
        'success' => true,
        'message' => 'Simulação de Pagamento Concluída! Plano Premium Ativo.'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno ao processar assinatura: ' . $e->getMessage()]);
}
