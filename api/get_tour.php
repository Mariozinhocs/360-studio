<?php
require_once 'config.php';

$tourId = trim($_GET['id'] ?? '');

if (empty($tourId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'O ID do tour é obrigatório.']);
    exit;
}

try {
    // Buscar o tour e juntar com os dados do usuário criador para validar status da assinatura
    $stmt = $pdo->prepare("
        SELECT t.id, t.title, t.scenes_json, t.floor_plan_json, t.user_id, u.subscription_status, u.subscription_expires_at 
        FROM " . TABLE_PREFIX . "tours t 
        JOIN " . TABLE_PREFIX . "users u ON t.user_id = u.id 
        WHERE t.id = ?
    ");
    $stmt->execute([$tourId]);
    $tour = $stmt->fetch();

    if (!$tour) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Tour não encontrado.']);
        exit;
    }

    // Verificar se o criador tem assinatura válida (apenas para exibição pública, editores já são bloqueados nos outros endpoints)
    $owner = [
        'subscription_status' => $tour['subscription_status'],
        'subscription_expires_at' => $tour['subscription_expires_at']
    ];
    
    $is_active = checkSubscription($owner);
    $is_owner = isset($_SESSION['user_id']) && $_SESSION['user_id'] == $tour['user_id'];

    if (!$is_active && !$is_owner) {
        // Se a assinatura do dono expirou e não é o dono visualizando, bloqueia exibição
        http_response_code(402); // Payment Required
        echo json_encode([
            'success' => false,
            'message' => 'Este tour virtual está temporariamente suspenso devido a pendências de assinatura.',
            'suspended' => true
        ]);
        exit;
    }

    // Decodifica as cenas salvas
    $scenes = json_decode($tour['scenes_json'], true);
    if (!is_array($scenes)) {
        $scenes = [];
    }

    // Decodifica a planta baixa se houver
    $floorPlan = null;
    if (!empty($tour['floor_plan_json'])) {
        $floorPlan = json_decode($tour['floor_plan_json'], true);
    }

    echo json_encode([
        'success' => true,
        'tour' => [
            'tourId' => $tour['id'],
            'title' => $tour['title'],
            'scenes' => $scenes,
            'floorPlan' => $floorPlan
        ],
        'is_owner' => $is_owner
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno ao carregar o tour: ' . $e->getMessage()]);
}
