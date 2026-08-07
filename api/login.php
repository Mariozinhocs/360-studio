<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

// Obter dados do POST
$data = json_decode(file_get_contents('php://input'), true);

$username_or_email = trim($data['username_or_email'] ?? $data['email'] ?? '');
$password = trim($data['password'] ?? '');

if (empty($username_or_email) || empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Usuário/e-mail e senha são obrigatórios.']);
    exit;
}

try {
    // Buscar usuário por e-mail ou nome de usuário
    $stmt = $pdo->prepare("SELECT * FROM " . TABLE_PREFIX . "users WHERE email = ? OR username = ?");
    $stmt->execute([$username_or_email, $username_or_email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Credenciais inválidas.']);
        exit;
    }

    if ($user['deleted_at'] !== null) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Sua conta foi desativada ou excluída.']);
        exit;
    }

    // Iniciar sessão
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_name'] = $user['name'];
    $_SESSION['user_email'] = $user['email'];

    echo json_encode([
        'success' => true,
        'message' => 'Login realizado com sucesso!',
        'user' => [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'is_admin' => (int)$user['is_admin'],
            'subscription_status' => $user['subscription_status'],
            'subscription_expires_at' => $user['subscription_expires_at'],
            'timezone' => $user['timezone']
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno ao processar o login: ' . $e->getMessage()]);
}
