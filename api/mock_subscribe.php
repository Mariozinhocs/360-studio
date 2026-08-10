<?php
require_once 'config.php';

loginRequired();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

try {
    // Obter JSON body
    $data = json_decode(file_get_contents('php://input'), true);
    $plan = isset($data['plan']) ? trim($data['plan']) : 'profissional';

    if (!defined('PLANS_MATRIX') || !isset(PLANS_MATRIX[$plan])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Plano inválido.']);
        exit;
    }

    $stmt = $pdo->prepare("UPDATE " . TABLE_PREFIX . "users SET subscription_status = ?, subscription_expires_at = NULL WHERE id = ?");
    $stmt->execute([$plan, $_SESSION['user_id']]);

    echo json_encode([
        'success' => true,
        'message' => 'Simulação de Pagamento Concluída! Plano ' . PLANS_MATRIX[$plan]['name'] . ' Ativo.'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno ao processar assinatura: ' . $e->getMessage()]);
}
