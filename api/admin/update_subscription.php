<?php
require_once 'admin_helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

// Obter dados do POST
$data = json_decode(file_get_contents('php://input'), true);

$user_id = isset($data['user_id']) ? (int)$data['user_id'] : 0;
$name = isset($data['name']) ? trim($data['name']) : '';
$username = isset($data['username']) ? trim($data['username']) : '';
$email = isset($data['email']) ? trim($data['email']) : '';
$status = isset($data['subscription_status']) ? trim($data['subscription_status']) : '';
$expires_at = !empty($data['subscription_expires_at']) ? trim($data['subscription_expires_at']) : null;
$is_admin = isset($data['is_admin']) ? (int)$data['is_admin'] : 0;
if (!in_array($is_admin, [0, 1, 2])) {
    $is_admin = 0;
}

if ($user_id <= 0 || !in_array($status, ['gratis', 'iniciante', 'basico', 'pessoal', 'profissional', 'trial', 'active', 'expired'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Parâmetros inválidos ou incompletos.']);
    exit;
}

if (empty($name) || empty($username) || empty($email)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nome, Usuário e E-mail não podem ficar vazios.']);
    exit;
}

if (!preg_match('/^[a-zA-Z0-9_]{3,30}$/', $username)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nome de usuário inválido. Use de 3 a 30 caracteres alfanuméricos e underscores.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'E-mail inválido.']);
    exit;
}

try {
    // Buscar se o usuário existe e seu cargo atual
    $stmt = $pdo->prepare("SELECT id, is_admin FROM " . TABLE_PREFIX . "users WHERE id = ?");
    $stmt->execute([$user_id]);
    $target_user = $stmt->fetch();
    if (!$target_user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Usuário não encontrado.']);
        exit;
    }

    // Verificar se o username já está sendo usado por outro usuário
    $stmtCheck = $pdo->prepare("SELECT id FROM " . TABLE_PREFIX . "users WHERE username = ? AND id != ?");
    $stmtCheck->execute([$username, $user_id]);
    if ($stmtCheck->fetch()) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Este nome de usuário já está sendo utilizado por outra conta.']);
        exit;
    }

    // Verificar se o email já está sendo usado por outro usuário
    $stmtCheckEmail = $pdo->prepare("SELECT id FROM " . TABLE_PREFIX . "users WHERE email = ? AND id != ?");
    $stmtCheckEmail->execute([$email, $user_id]);
    if ($stmtCheckEmail->fetch()) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Este e-mail já está sendo utilizado por outra conta.']);
        exit;
    }

    // Regras de hierarquia:
    // Se o usuário logado for Admin comum (nível 1):
    // 1. Ele só pode atualizar clientes comuns (is_admin = 0).
    // 2. Ele não pode promover ninguém para admin.
    if (!isSuperAdmin()) {
        if ((int)$target_user['is_admin'] > 0) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Você não tem permissão para editar outros administradores.']);
            exit;
        }
        if ($is_admin > 0) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Apenas Super Admins podem promover usuários a Administradores.']);
            exit;
        }
    }

    // Impedir que o administrador atual remova/altere seus próprios privilégios de admin por acidente
    if ($user_id === (int)$_SESSION['user_id'] && $is_admin !== (int)$GLOBALS['admin_user']['is_admin']) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Você não pode alterar seus próprios privilégios de administrador.']);
        exit;
    }

    // Atualizar no banco
    $stmtUpdate = $pdo->prepare("UPDATE " . TABLE_PREFIX . "users 
        SET name = ?, username = ?, email = ?, subscription_status = ?, subscription_expires_at = ?, is_admin = ? 
        WHERE id = ?");
    $stmtUpdate->execute([$name, $username, $email, $status, $expires_at, $is_admin, $user_id]);

    echo json_encode([
        'success' => true,
        'message' => 'Perfil e plano do usuário atualizados com sucesso!'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao atualizar dados do usuário: ' . $e->getMessage()
    ]);
}
