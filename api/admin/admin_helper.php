<?php
require_once dirname(__DIR__) . '/config.php';

// Validar se o usuário está logado
loginRequired();

try {
    // Buscar se o usuário logado é administrador
    $stmt = $pdo->prepare("SELECT is_admin FROM " . TABLE_PREFIX . "users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();

    if (!$user || (int)$user['is_admin'] < 1) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Acesso negado. Esta área é restrita a administradores.'
        ]);
        exit;
    }
    
    // Armazena no escopo global para reuso
    $GLOBALS['admin_user'] = $user;
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro interno ao validar privilégios: ' . $e->getMessage()
    ]);
    exit;
}

// Helper para verificar se é Super Admin
function isSuperAdmin() {
    return (int)($GLOBALS['admin_user']['is_admin'] ?? 0) === 2;
}

// Purga automática de registros excluídos há mais de 30 dias
try {
    $purge_stmt = $pdo->prepare("DELETE FROM " . TABLE_PREFIX . "users WHERE deleted_at IS NOT NULL AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)");
    $purge_stmt->execute();
} catch (Exception $e) {
    error_log("Erro ao purgar usuários na lixeira: " . $e->getMessage());
}

