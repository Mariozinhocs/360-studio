<?php
require_once 'admin_helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

// Apenas Super Admin (is_admin = 2) pode excluir usuários
if (!isSuperAdmin()) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Acesso negado. Apenas o Super Admin pode excluir contas de usuário.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$user_id = isset($data['user_id']) ? (int)$data['user_id'] : 0;

if ($user_id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID do usuário inválido.']);
    exit;
}

try {
    // Buscar se o usuário existe
    $stmt = $pdo->prepare("SELECT id, deleted_at FROM " . TABLE_PREFIX . "users WHERE id = ?");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch();
    
    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Usuário não encontrado.']);
        exit;
    }

    // Impedir que o Super Admin exclua a si mesmo
    if ($user_id === (int)$_SESSION['user_id']) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Você não pode excluir a sua própria conta administrativa.']);
        exit;
    }

    if ($user['deleted_at'] === null) {
        // Soft delete: envia para lixeira
        $stmtSoft = $pdo->prepare("UPDATE " . TABLE_PREFIX . "users SET deleted_at = NOW() WHERE id = ?");
        $stmtSoft->execute([$user_id]);
        echo json_encode([
            'success' => true,
            'message' => 'Usuário enviado para a Lixeira com sucesso.'
        ]);
    } else {
        // Hard delete: remove fisicamente
        $stmtHard = $pdo->prepare("DELETE FROM " . TABLE_PREFIX . "users WHERE id = ?");
        $stmtHard->execute([$user_id]);
        echo json_encode([
            'success' => true,
            'message' => 'Usuário e todos os seus projetos associados foram excluídos definitivamente!'
        ]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao excluir usuário: ' . $e->getMessage()
    ]);
}
