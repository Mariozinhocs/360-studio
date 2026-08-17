<?php
require_once 'admin_helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

if (!isSuperAdmin()) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Acesso negado. Apenas Super Administradores podem atualizar as configurações da Landing Page.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$settings = isset($data['settings']) ? $data['settings'] : [];

if (empty($settings)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nenhuma configuração enviada.']);
    exit;
}

try {
    $stmt = $pdo->prepare("INSERT INTO `" . TABLE_PREFIX . "home_settings` (setting_key, setting_value) 
        VALUES (?, ?) 
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");

    foreach ($settings as $key => $value) {
        $stmt->execute([trim($key), trim($value)]);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Configurações da Landing Page salvas com sucesso!'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao salvar configurações da Home: ' . $e->getMessage()
    ]);
}
