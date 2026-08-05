<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

// Obter dados do POST
$data = json_decode(file_get_contents('php://input'), true);

$name = trim($data['name'] ?? '');
$username = trim($data['username'] ?? '');
$email = trim($data['email'] ?? '');
$password = trim($data['password'] ?? '');

// Validações
if (empty($name) || empty($username) || empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Todos os campos são obrigatórios.']);
    exit;
}

if (!preg_match('/^[a-zA-Z0-9_]{3,30}$/', $username)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nome de usuário inválido. Use de 3 a 30 caracteres alfanuméricos e underscores.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Email inválido.']);
    exit;
}

if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'A senha deve ter pelo menos 6 caracteres.']);
    exit;
}

try {
    // Verificar se o nome de usuário já está cadastrado
    $stmt = $pdo->prepare("SELECT id FROM " . TABLE_PREFIX . "users WHERE username = ?");
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Este nome de usuário já está sendo utilizado.']);
        exit;
    }

    // Verificar se o email já está cadastrado
    $stmt = $pdo->prepare("SELECT id FROM " . TABLE_PREFIX . "users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Este email já está sendo utilizado.']);
        exit;
    }

    // Criar hash da senha
    $password_hash = password_hash($password, PASSWORD_BCRYPT);
    
    // Configurar Trial de 7 dias
    $expiry = new DateTime();
    $expiry->modify('+7 days');
    $subscription_expires_at = $expiry->format('Y-m-d H:i:s');

    // Inserir usuário
    $stmt = $pdo->prepare("INSERT INTO " . TABLE_PREFIX . "users (name, username, email, password_hash, subscription_status, subscription_expires_at) VALUES (?, ?, ?, ?, 'trial', ?)");
    $stmt->execute([$name, $username, $email, $password_hash, $subscription_expires_at]);
    
    $user_id = $pdo->lastInsertId();

    // Iniciar sessão automaticamente
    $_SESSION['user_id'] = $user_id;
    $_SESSION['user_name'] = $name;
    $_SESSION['user_email'] = $email;

    echo json_encode([
        'success' => true,
        'message' => 'Cadastro realizado com sucesso!',
        'user' => [
            'id' => $user_id,
            'name' => $name,
            'username' => $username,
            'email' => $email,
            'subscription_status' => 'trial',
            'subscription_expires_at' => $subscription_expires_at
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno ao processar o cadastro: ' . $e->getMessage()]);
}
