<?php
require_once 'config.php';

loginRequired();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

// Obter dados do POST
$data = json_decode(file_get_contents('php://input'), true);

$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$timezone = trim($data['timezone'] ?? 'America/Sao_Paulo');
$subscription_status = trim($data['subscription_status'] ?? '');
$subscription_expires_at = !empty($data['subscription_expires_at']) ? trim($data['subscription_expires_at']) : null;

if (empty($name) || empty($email)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nome e e-mail são obrigatórios.']);
    exit;
}

// Validar formato de e-mail
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Formato de e-mail inválido.']);
    exit;
}

// Validar se o fuso horário é válido no PHP
if (!in_array($timezone, timezone_identifiers_list())) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Fuso horário inválido.']);
    exit;
}

try {
    // Buscar dados atuais do usuário para verificar permissões
    $stmtUser = $pdo->prepare("SELECT is_admin, subscription_status, subscription_expires_at FROM " . TABLE_PREFIX . "users WHERE id = ?");
    $stmtUser->execute([$_SESSION['user_id']]);
    $currentUser = $stmtUser->fetch();
    
    if (!$currentUser) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Usuário não encontrado.']);
        exit;
    }

    // Se não for admin, ignora as alterações de plano vindas do payload e mantém as originais
    if ((int)$currentUser['is_admin'] < 1) {
        $subscription_status = $currentUser['subscription_status'];
        $subscription_expires_at = $currentUser['subscription_expires_at'];
    }

    // Verificar se o e-mail já está em uso por outro usuário
    $stmt = $pdo->prepare("SELECT id FROM " . TABLE_PREFIX . "users WHERE email = ? AND id != ?");
    $stmt->execute([$email, $_SESSION['user_id']]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Este e-mail já está sendo utilizado por outro usuário.']);
        exit;
    }

    // Atualizar no banco
    $stmtUpdate = $pdo->prepare("
        UPDATE " . TABLE_PREFIX . "users 
        SET name = ?, email = ?, timezone = ?, subscription_status = ?, subscription_expires_at = ? 
        WHERE id = ?
    ");
    $stmtUpdate->execute([
        $name,
        $email,
        $timezone,
        $subscription_status ?: 'trial',
        $subscription_expires_at,
        $_SESSION['user_id']
    ]);

    // Atualizar sessão PHP
    $_SESSION['user_name'] = $name;
    $_SESSION['user_email'] = $email;

    // Buscar dados atualizados
    $stmtSelect = $pdo->prepare("SELECT id, name, email, is_admin, subscription_status, subscription_expires_at, timezone FROM " . TABLE_PREFIX . "users WHERE id = ?");
    $stmtSelect->execute([$_SESSION['user_id']]);
    $updatedUser = $stmtSelect->fetch();

    $is_active = checkSubscription($updatedUser);

    echo json_encode([
        'success' => true,
        'message' => 'Perfil atualizado com sucesso!',
        'user' => [
            'id' => $updatedUser['id'],
            'name' => $updatedUser['name'],
            'email' => $updatedUser['email'],
            'is_admin' => (int)$updatedUser['is_admin'],
            'subscription_status' => $updatedUser['subscription_status'],
            'subscription_expires_at' => $updatedUser['subscription_expires_at'],
            'timezone' => $updatedUser['timezone'],
            'is_subscription_valid' => $is_active
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno ao atualizar perfil: ' . $e->getMessage()]);
}
