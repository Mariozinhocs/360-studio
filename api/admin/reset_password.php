<?php
require_once 'admin_helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$user_id = isset($data['user_id']) ? (int)$data['user_id'] : 0;
$password = isset($data['password']) ? trim($data['password']) : '';

if ($user_id <= 0 || strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Parâmetros inválidos. A senha deve ter ao menos 6 caracteres.']);
    exit;
}

try {
    // Buscar se o usuário existe e carregar seu cargo
    $stmt = $pdo->prepare("SELECT id, is_admin FROM " . TABLE_PREFIX . "users WHERE id = ?");
    $stmt->execute([$user_id]);
    $target_user = $stmt->fetch();
    if (!$target_user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Usuário não encontrado.']);
        exit;
    }

    // Regras de hierarquia:
    // Se o usuário logado for Admin comum (1):
    // 1. Ele só pode redefinir senhas de clientes comuns (is_admin = 0).
    if (!isSuperAdmin()) {
        if ((int)$target_user['is_admin'] > 0) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Você não tem permissão para alterar a senha de outros administradores.']);
            exit;
        }
    }

    // Gerar hash da senha
    $password_hash = password_hash($password, PASSWORD_BCRYPT);

    // Salvar nova senha
    $stmtUpdate = $pdo->prepare("UPDATE " . TABLE_PREFIX . "users SET password_hash = ? WHERE id = ?");
    $stmtUpdate->execute([$password_hash, $user_id]);

    echo json_encode([
        'success' => true,
        'message' => 'Senha do usuário redefinida com sucesso!'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao redefinir senha do usuário: ' . $e->getMessage()
    ]);
}
