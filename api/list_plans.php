<?php
require_once 'config.php';

// Endpoint público para listagem dos planos ativos na Home e na página de Planos
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

try {
    $stmt = $pdo->query("SELECT * FROM `" . TABLE_PREFIX . "plans` ORDER BY id ASC");
    $plans = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'plans' => $plans
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao carregar lista de planos: ' . $e->getMessage()
    ]);
}
