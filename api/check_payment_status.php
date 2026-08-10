<?php
require_once 'config.php';

loginRequired();

$paymentId = isset($_GET['payment_id']) ? trim($_GET['payment_id']) : '';

if (empty($paymentId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID do pagamento ausente.']);
    exit;
}

$accessToken = getenv('MERCADOPAGO_ACCESS_TOKEN') ?: $_ENV['MERCADOPAGO_ACCESS_TOKEN'] ?? '';
if (empty($accessToken)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Token de acesso do gateway ausente.']);
    exit;
}

// Consultar pagamento no Mercado Pago
$url = 'https://api.mercadopago.com/v1/payments/' . $paymentId;
$headers = [
    'Authorization: Bearer ' . $accessToken,
    'Content-Type: application/json'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false || $httpCode >= 400) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Erro ao consultar status no Mercado Pago.']);
    exit;
}

$data = json_decode($response, true);
$status = isset($data['status']) ? $data['status'] : '';
$extRef = isset($data['external_reference']) ? $data['external_reference'] : '';

// Extrair dados do external_reference (user_id e plan)
$userId = null;
$plan = null;
if (!empty($extRef)) {
    $parts = explode('|', $extRef);
    foreach ($parts as $part) {
        if (strpos($part, ':') !== false) {
            list($key, $val) = explode(':', $part, 2);
            if ($key === 'user_id') $userId = (int)$val;
            if ($key === 'plan') $plan = trim($val);
        }
    }
}

// Validar e aplicar upgrade se aprovado
$upgraded = false;
if ($status === 'approved' && $userId === $_SESSION['user_id'] && !empty($plan)) {
    try {
        $stmt = $pdo->prepare("UPDATE " . TABLE_PREFIX . "users SET subscription_status = ?, subscription_expires_at = NULL WHERE id = ?");
        $stmt->execute([$plan, $userId]);
        $upgraded = true;
    } catch (Exception $e) {
        // Erro silencioso no banco
    }
}

echo json_encode([
    'success' => true,
    'status' => $status,
    'upgraded' => $upgraded,
    'plan' => $plan
]);
