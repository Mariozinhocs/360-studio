<?php
require_once 'admin_helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

if (!isSuperAdmin()) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Acesso negado. Apenas o Super Admin pode excluir contas de usuário.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$user_ids = isset($data['user_ids']) && is_array($data['user_ids']) ? $data['user_ids'] : [];

// Filtrar IDs para garantir inteiros positivos e remover a si mesmo
$user_ids = array_map('intval', $user_ids);
$user_ids = array_filter($user_ids, function($id) {
    return $id > 0 && $id !== (int)$_SESSION['user_id'];
});
$user_ids = array_values($user_ids); // Reindexar para garantir array sequencial de base 0 no PDO


if (empty($user_ids)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nenhum ID de usuário válido fornecido.']);
    exit;
}

try {
    // Buscar quais usuários já estão na lixeira e quais não estão
    $placeholders = implode(',', array_fill(0, count($user_ids), '?'));
    $stmtCheck = $pdo->prepare("SELECT id, deleted_at FROM " . TABLE_PREFIX . "users WHERE id IN ($placeholders)");
    $stmtCheck->execute($user_ids);
    $users = $stmtCheck->fetchAll();

    $to_soft_delete = [];
    $to_hard_delete = [];

    foreach ($users as $u) {
        if ($u['deleted_at'] === null) {
            $to_soft_delete[] = (int)$u['id'];
        } else {
            $to_hard_delete[] = (int)$u['id'];
        }
    }

    $soft_count = 0;
    $hard_count = 0;

    if (!empty($to_soft_delete)) {
        $soft_placeholders = implode(',', array_fill(0, count($to_soft_delete), '?'));
        $stmtSoft = $pdo->prepare("UPDATE " . TABLE_PREFIX . "users SET deleted_at = NOW() WHERE id IN ($soft_placeholders)");
        $stmtSoft->execute($to_soft_delete);
        $soft_count = $stmtSoft->rowCount();
    }

    if (!empty($to_hard_delete)) {
        $hard_placeholders = implode(',', array_fill(0, count($to_hard_delete), '?'));
        $stmtHard = $pdo->prepare("DELETE FROM " . TABLE_PREFIX . "users WHERE id IN ($hard_placeholders)");
        $stmtHard->execute($to_hard_delete);
        $hard_count = $stmtHard->rowCount();
    }

    $messages = [];
    if ($soft_count > 0) {
        $messages[] = "{$soft_count} enviado(s) para a lixeira";
    }
    if ($hard_count > 0) {
        $messages[] = "{$hard_count} excluído(s) definitivamente";
    }

    echo json_encode([
        'success' => true,
        'message' => implode(' e ', $messages) . ' com sucesso!'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao realizar exclusão em lote: ' . $e->getMessage()
    ]);
}
