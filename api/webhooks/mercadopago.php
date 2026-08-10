<?php
// Configurações e conexão sem exigir login (webhook público)
require_once '../config.php';

// Logar requisição recebida para debug em homologação
$rawPayload = file_get_contents('php://input');
$logMsg = "[" . date('Y-m-d H:i:s') . "] Webhook recebido: GET=" . json_encode($_GET) . " BODY=" . $rawPayload . "\n";
file_put_contents('webhook_mp.log', $logMsg, FILE_APPEND);

$paymentId = isset($_GET['id']) ? trim($_GET['id']) : '';
$type = isset($_GET['type']) ? trim($_GET['type']) : '';

// Tratar carga POST (Mercado Pago envia em JSON no POST)
if (empty($paymentId) && !empty($rawPayload)) {
    $data = json_decode($rawPayload, true);
    if (isset($data['data']['id'])) {
        $paymentId = $data['data']['id'];
        $type = isset($data['type']) ? $data['type'] : '';
    }
}

// Só processamos notificações do tipo 'payment'
if (empty($paymentId) || ($type !== 'payment' && $type !== 'payment.updated' && $type !== 'payment.created')) {
    // Retorna 200 OK para o Mercado Pago não repetir
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'Ignorado ou tipo não suportado.']);
    exit;
}

$accessToken = getenv('MERCADOPAGO_ACCESS_TOKEN') ?: $_ENV['MERCADOPAGO_ACCESS_TOKEN'] ?? '';
if (empty($accessToken)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Token do gateway ausente.']);
    exit;
}

// Consultar o pagamento completo no Mercado Pago para garantir autenticidade e status real
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
    http_response_code(200); // Retornamos 200 para evitar que o gateway continue tentando reenviar indefinidamente se for ID de teste expirado
    echo json_encode(['success' => false, 'message' => 'Erro ao consultar pagamento no Mercado Pago.']);
    exit;
}

$paymentData = json_decode($response, true);
$status = isset($paymentData['status']) ? $paymentData['status'] : '';
$extRef = isset($paymentData['external_reference']) ? $paymentData['external_reference'] : '';

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

// Se o pagamento foi aprovado, atualiza o banco de dados
if ($status === 'approved' && !empty($userId) && !empty($plan)) {
    try {
        $stmt = $pdo->prepare("UPDATE " . TABLE_PREFIX . "users SET subscription_status = ?, subscription_expires_at = NULL WHERE id = ?");
        $stmt->execute([$plan, $userId]);
        
        $logOk = "[" . date('Y-m-d H:i:s') . "] Plano '{$plan}' ativado com sucesso para o usuário ID {$userId} via Webhook.\n";
        file_put_contents('webhook_mp.log', $logOk, FILE_APPEND);
        
        echo json_encode(['success' => true, 'message' => 'Plano atualizado com sucesso.']);
        exit;
    } catch (Exception $e) {
        file_put_contents('webhook_mp.log', "Erro BD: " . $e->getMessage() . "\n", FILE_APPEND);
    }
}

http_response_code(200);
echo json_encode(['success' => true, 'message' => 'Processado sem ativações. Status: ' . $status]);
