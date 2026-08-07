<?php
require_once 'config.php';

// Se não houver sessão ativa, retorna success = false
if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Usuário não autenticado.'
    ]);
    exit;
}

try {
    // Buscar status atualizado do usuário no banco (caso a assinatura tenha expirado)
    $stmt = $pdo->prepare("SELECT id, name, email, is_admin, subscription_status, subscription_expires_at, deleted_at, timezone FROM " . TABLE_PREFIX . "users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();

    if (!$user || $user['deleted_at'] !== null) {
        // Sessão inválida (usuário deletado)
        session_destroy();
        echo json_encode([
            'success' => false,
            'message' => 'Usuário não encontrado ou desativado.'
        ]);
        exit;
    }

    // Verificar se a assinatura expirou
    $is_active = checkSubscription($user);
    
    // Se estiver expirada, atualiza o status no banco se necessário
    if (!$is_active && $user['subscription_status'] !== 'expired') {
        $update = $pdo->prepare("UPDATE " . TABLE_PREFIX . "users SET subscription_status = 'expired' WHERE id = ?");
        $update->execute([$user['id']]);
        $user['subscription_status'] = 'expired';
    }

    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'is_admin' => (int)$user['is_admin'],
            'subscription_status' => $user['subscription_status'],
            'subscription_expires_at' => $user['subscription_expires_at'],
            'timezone' => $user['timezone'],
            'is_subscription_valid' => $is_active
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno ao validar autenticação: ' . $e->getMessage()]);
}
