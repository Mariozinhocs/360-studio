<?php
require_once 'admin_helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$user_ids = isset($data['user_ids']) && is_array($data['user_ids']) ? $data['user_ids'] : [];

$user_ids = array_map('intval', $user_ids);
$user_ids = array_filter($user_ids, function($id) {
    return $id > 0;
});

if (empty($user_ids)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nenhum usuário selecionado.']);
    exit;
}

// Configurar dados para atualização
$status = isset($data['subscription_status']) ? trim($data['subscription_status']) : '';
$expires_option = isset($data['expiry_option']) ? trim($data['expiry_option']) : 'keep'; // 'keep', 'permanent', 'set'
$expires_at = !empty($data['subscription_expires_at']) ? trim($data['subscription_expires_at']) : null;
$is_admin = isset($data['is_admin']) && $data['is_admin'] !== '' ? (int)$data['is_admin'] : null;

// Validar status
if (!empty($status) && !in_array($status, ['gratis', 'iniciante', 'basico', 'pessoal', 'profissional', 'trial', 'active', 'expired'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Status de assinatura inválido.']);
    exit;
}

// Validar permissão (is_admin)
if ($is_admin !== null && !in_array($is_admin, [0, 1, 2])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nível de permissão inválido.']);
    exit;
}

// Apenas Super Admins podem promover usuários
if ($is_admin !== null && $is_admin > 0 && !isSuperAdmin()) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Acesso negado. Apenas Super Admins podem promover usuários.']);
    exit;
}

try {
    $pdo->beginTransaction();

    $updated_count = 0;
    
    // Preparar a query dinamicamente por usuário
    foreach ($user_ids as $target_id) {
        // Buscar dados do usuário alvo
        $stmt = $pdo->prepare("SELECT id, is_admin FROM " . TABLE_PREFIX . "users WHERE id = ?");
        $stmt->execute([$target_id]);
        $target_user = $stmt->fetch();
        
        if (!$target_user) continue;

        // Regras para Admin comum (nível 1):
        // 1. Não pode editar outros admins
        // 2. Não pode alterar privilégios (is_admin) para outro nível
        if (!isSuperAdmin()) {
            if ((int)$target_user['is_admin'] > 0) continue; // Pula admins
        }

        // Impedir que o administrador altere o próprio privilégio is_admin
        $final_is_admin = $is_admin;
        if ($target_id === (int)$_SESSION['user_id'] && $is_admin !== null) {
            $final_is_admin = null; // Ignora alteração de cargo para si mesmo
        }

        // Construir query de atualização parcial
        $fields = [];
        $params = [];

        if (!empty($status)) {
            $fields[] = "subscription_status = ?";
            $params[] = $status;
        }

        if ($expires_option === 'permanent') {
            $fields[] = "subscription_expires_at = NULL";
        } elseif ($expires_option === 'set' && !empty($expires_at)) {
            $fields[] = "subscription_expires_at = ?";
            $params[] = $expires_at;
        }

        if ($final_is_admin !== null) {
            $fields[] = "is_admin = ?";
            $params[] = $final_is_admin;
        }

        if (empty($fields)) {
            continue; // Nada a atualizar para este usuário
        }

        $params[] = $target_id;
        $sql = "UPDATE " . TABLE_PREFIX . "users SET " . implode(', ', $fields) . " WHERE id = ?";
        
        $stmtUpdate = $pdo->prepare($sql);
        $stmtUpdate->execute($params);
        $updated_count++;
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => "{$updated_count} usuário(s) atualizado(s) com sucesso!"
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao processar atualização em lote: ' . $e->getMessage()
    ]);
}
