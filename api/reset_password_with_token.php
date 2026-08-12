<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$token = trim($data['token'] ?? '');
$password = trim($data['password'] ?? '');

if (empty($token) || empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Token e senha são obrigatórios.']);
    exit;
}

if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'A senha deve ter no mínimo 6 caracteres.']);
    exit;
}

try {
    // Buscar usuário pelo token e verificar se não expirou
    $stmt = $pdo->prepare("SELECT id, password_reset_expires FROM " . TABLE_PREFIX . "users WHERE password_reset_token = ? AND deleted_at IS NULL");
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Token de redefinição inválido.']);
        exit;
    }

    // Verificar expiração
    $expiry = new DateTime($user['password_reset_expires']);
    $now = new DateTime();
    if ($now > $expiry) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Este link de recuperação expirou.']);
        exit;
    }

    // Hash da nova senha
    $password_hash = password_hash($password, PASSWORD_BCRYPT);

    // Salvar nova senha e limpar token de recuperação
    $stmtUpdate = $pdo->prepare("UPDATE " . TABLE_PREFIX . "users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?");
    $stmtUpdate->execute([$password_hash, $user['id']]);

    echo json_encode([
        'success' => true,
        'message' => 'Sua senha foi redefinida com sucesso! Você já pode fazer login.'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro interno ao redefinir senha: ' . $e->getMessage()
    ]);
}
