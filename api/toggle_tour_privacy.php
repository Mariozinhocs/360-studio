<?php
require_once 'config.php';
loginRequired();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$tourId = trim($data['tourId'] ?? '');
$privacy = trim($data['privacySettings'] ?? ''); // 'public', 'disabled', ou string de senha

if (empty($tourId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID do tour não informado.']);
    exit;
}

try {
    // Buscar o tour e garantir pertencimento
    $stmt = $pdo->prepare("SELECT id FROM " . TABLE_PREFIX . "tours WHERE id = ? AND user_id = ?");
    $stmt->execute([$tourId, $_SESSION['user_id']]);
    if (!$stmt->fetch()) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Tour não encontrado ou sem permissão de edição.']);
        exit;
    }

    $dbVal = ($privacy === 'public' || $privacy === '') ? null : $privacy;

    $update = $pdo->prepare("UPDATE " . TABLE_PREFIX . "tours SET privacy_settings = ? WHERE id = ? AND user_id = ?");
    $update->execute([$dbVal, $tourId, $_SESSION['user_id']]);

    $msg = 'Link público ativado!';
    if ($dbVal === 'disabled') {
        $msg = 'Link de visualização pública desativado com sucesso!';
    } elseif (!empty($dbVal) && $dbVal !== 'public') {
        $msg = 'Proteção por senha ativada!';
    }

    echo json_encode([
        'success' => true,
        'message' => $msg,
        'privacySettings' => $dbVal
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro ao atualizar privacidade: ' . $e->getMessage()]);
}
