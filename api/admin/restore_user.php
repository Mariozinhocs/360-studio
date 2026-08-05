<?php
require_once 'admin_helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

// Apenas Super Admin (is_admin = 2) pode restaurar usuários
if (!isSuperAdmin()) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Acesso negado. Apenas o Super Admin pode restaurar contas de usuário.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$user_id = isset($data['user_id']) ? (int)$data['user_id'] : 0;
$user_ids = isset($data['user_ids']) && is_array($data['user_ids']) ? $data['user_ids'] : [];

if ($user_id > 0) {
    $user_ids[] = $user_id;
}

// Filtrar IDs
$user_ids = array_map('intval', $user_ids);
$user_ids = array_filter($user_ids, function($id) {
    return $id > 0;
});
$user_ids = array_values($user_ids);

if (empty($user_ids)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nenhum ID de usuário válido fornecido.']);
    exit;
}

try {
    $placeholders = implode(',', array_fill(0, count($user_ids), '?'));
    
    // Restaurar usuário (definir deleted_at como null)
    $stmt = $pdo->prepare("UPDATE " . TABLE_PREFIX . "users SET deleted_at = NULL WHERE id IN ($placeholders)");
    $stmt->execute($user_ids);
    
    $count = $stmt->rowCount();

    echo json_encode([
        'success' => true,
        'message' => "{$count} usuário(s) restaurado(s) com sucesso!"
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao restaurar usuário: ' . $e->getMessage()
    ]);
}
