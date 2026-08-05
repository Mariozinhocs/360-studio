<?php
require_once 'config.php';

loginRequired();

// Verificar assinatura
$stmt = $pdo->prepare("SELECT subscription_status, subscription_expires_at FROM " . TABLE_PREFIX . "users WHERE id = ?");
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch();

if (!$user || !checkSubscription($user)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Assinatura inválida ou expirada. Regularize seu pagamento para criar novos tours.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

// Obter dados do POST
$data = json_decode(file_get_contents('php://input'), true);
$title = trim($data['title'] ?? 'Novo Tour 360');

if (empty($title)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'O título do tour é obrigatório.']);
    exit;
}

try {
    // Gerar um ID de tour único
    $tourId = 'tour-' . uniqid() . '-' . substr(md5(mt_rand()), 0, 5);

    // Estrutura inicial do JSON do tour
    $initial_tour_structure = [
        'tourId' => $tourId,
        'title' => $title,
        'scenes' => []
    ];

    $scenes_json = json_encode($initial_tour_structure['scenes']);

    // Inserir no banco
    $stmt = $pdo->prepare("INSERT INTO " . TABLE_PREFIX . "tours (id, user_id, title, scenes_json) VALUES (?, ?, ?, ?)");
    $stmt->execute([$tourId, $_SESSION['user_id'], $title, $scenes_json]);

    echo json_encode([
        'success' => true,
        'message' => 'Tour criado com sucesso!',
        'tourId' => $tourId
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno ao criar o tour: ' . $e->getMessage()]);
}
