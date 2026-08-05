<?php
require_once 'config.php';

loginRequired();

// Verificar assinatura
$stmt = $pdo->prepare("SELECT subscription_status, subscription_expires_at FROM " . TABLE_PREFIX . "users WHERE id = ?");
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch();

if (!$user || !checkSubscription($user)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Assinatura inválida ou expirada. Assine o Premium para salvar suas alterações.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

// Obter JSON do payload
$data = json_decode(file_get_contents('php://input'), true);

$tourId = trim($data['tourId'] ?? '');
$title = trim($data['title'] ?? '');
$scenes = $data['scenes'] ?? null;

if (empty($tourId) || empty($title) || $scenes === null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Dados incompletos para salvamento.']);
    exit;
}

try {
    // Verificar se o tour existe e pertence ao usuário
    $stmt = $pdo->prepare("SELECT id FROM " . TABLE_PREFIX . "tours WHERE id = ? AND user_id = ?");
    $stmt->execute([$tourId, $_SESSION['user_id']]);
    $tourExists = $stmt->fetch();

    if (!$tourExists) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Tour não encontrado ou você não tem permissão para editá-lo.']);
        exit;
    }

    $scenes_json = json_encode($scenes);

    // Atualizar no banco
    $update = $pdo->prepare("UPDATE " . TABLE_PREFIX . "tours SET title = ?, scenes_json = ? WHERE id = ? AND user_id = ?");
    $update->execute([$title, $scenes_json, $tourId, $_SESSION['user_id']]);

    echo json_encode([
        'success' => true,
        'message' => 'Configurações salvas no servidor com sucesso!'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno ao salvar o tour: ' . $e->getMessage()]);
}
