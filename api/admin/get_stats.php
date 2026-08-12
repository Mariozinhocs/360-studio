<?php
require_once 'admin_helper.php';

try {
    // 1. Contagem de usuários por status
    $stmt = $pdo->query("SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN subscription_status IN ('iniciante', 'basico', 'pessoal', 'profissional', 'active') THEN 1 ELSE 0 END) as active_premium,
        SUM(CASE WHEN subscription_status IN ('gratis', 'trial') OR subscription_status IS NULL OR subscription_status = '' THEN 1 ELSE 0 END) as active_trial,
        SUM(CASE WHEN subscription_status = 'expired' THEN 1 ELSE 0 END) as expired_users
    FROM " . TABLE_PREFIX . "users");
    $stats = $stmt->fetch();

    // 2. Contagem de tours totais
    $stmtTours = $pdo->query("SELECT COUNT(*) as total_tours FROM " . TABLE_PREFIX . "tours");
    $toursStats = $stmtTours->fetch();
    $total_tours = (int)$toursStats['total_tours'];

    // 3. Contagem de cenas totais (lendo JSON das cenas)
    $stmtScenes = $pdo->query("SELECT scenes_json FROM " . TABLE_PREFIX . "tours");
    $total_scenes = 0;
    while ($row = $stmtScenes->fetch()) {
        $scenes = json_decode($row['scenes_json'], true);
        if (is_array($scenes)) {
            $total_scenes += count($scenes);
        }
    }

    // 4. Receita Recorrente Mensal (MRR) - assumindo R$ 49,90 por plano premium ativo
    $ticket_price = 49.90;
    $active_premium_count = (int)($stats['active_premium'] ?? 0);
    $mrr = $active_premium_count * $ticket_price;

    echo json_encode([
        'success' => true,
        'stats' => [
            'total_users' => (int)$stats['total_users'],
            'active_premium' => $active_premium_count,
            'active_trial' => (int)$stats['active_trial'],
            'expired_users' => (int)$stats['expired_users'],
            'total_tours' => $total_tours,
            'total_scenes' => $total_scenes,
            'mrr' => $mrr,
            'ticket_price' => $ticket_price
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao compilar estatísticas: ' . $e->getMessage()
    ]);
}
