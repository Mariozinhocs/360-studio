<?php
require_once 'config.php';

loginRequired();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

// Obter dados do POST
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    $input = $_POST;
}

$plan = isset($input['plan']) ? trim($input['plan']) : '';
$billingCycle = isset($input['billing_cycle']) ? trim($input['billing_cycle']) : 'monthly';
$paymentMethodId = isset($input['payment_method_id']) ? trim($input['payment_method_id']) : '';

// Validar plano
if (!defined('PLANS_MATRIX') || !isset(PLANS_MATRIX[$plan]) || $plan === 'gratis') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Plano selecionado inválido.']);
    exit;
}

// Calcular preço
$prices_monthly = [
    'iniciante' => 89.99,
    'basico'    => 129.99,
    'pessoal'   => 199.99,
    'profissional' => 349.99
];
$prices_yearly = [
    'iniciante' => 71.99,
    'basico'    => 103.99,
    'pessoal'   => 159.99,
    'profissional' => 279.99
];

$amount = ($billingCycle === 'yearly') ? $prices_yearly[$plan] : $prices_monthly[$plan];

$accessToken = getenv('MERCADOPAGO_ACCESS_TOKEN') ?: $_ENV['MERCADOPAGO_ACCESS_TOKEN'] ?? '';
if (empty($accessToken)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Token de acesso do gateway ausente.']);
    exit;
}

// Preparar payload para Mercado Pago
$payload = [
    'transaction_amount' => (float)$amount,
    'description' => 'Assinatura Plano ' . PLANS_MATRIX[$plan]['name'] . ' - 360 Studio',
    'payment_method_id' => $paymentMethodId,
    'payer' => [
        'email' => $_SESSION['user_email']
    ],
    'external_reference' => 'user_id:' . $_SESSION['user_id'] . '|plan:' . $plan
];

// Se for cartão, incluir token e parcelas
if ($paymentMethodId !== 'pix') {
    $token = isset($input['token']) ? trim($input['token']) : '';
    $installments = isset($input['installments']) ? (int)$input['installments'] : 1;
    
    if (empty($token)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Token do cartão ausente.']);
        exit;
    }
    
    $payload['token'] = $token;
    $payload['installments'] = $installments;
}

// Executar requisição para Mercado Pago via cURL
$url = 'https://api.mercadopago.com/v1/payments';
$idempotencyKey = uniqid('mp_', true);

$headers = [
    'Authorization: Bearer ' . $accessToken,
    'Content-Type: application/json',
    'X-Idempotency-Key: ' . $idempotencyKey
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Falha na comunicação com o Mercado Pago.']);
    exit;
}

$data = json_decode($response, true);

if ($httpCode >= 400) {
    $errorMsg = isset($data['message']) ? $data['message'] : 'Erro na requisição.';
    if (isset($data['cause'][0]['description'])) {
        $errorMsg .= ' Detalhe: ' . $data['cause'][0]['description'];
    }
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Erro Mercado Pago: ' . $errorMsg]);
    exit;
}

$status = isset($data['status']) ? $data['status'] : '';
$paymentId = isset($data['id']) ? $data['id'] : '';

// Se for cartão e estiver aprovado, ativa na hora
if ($paymentMethodId !== 'pix' && $status === 'approved') {
    try {
        $stmt = $pdo->prepare("UPDATE " . TABLE_PREFIX . "users SET subscription_status = ?, subscription_expires_at = NULL WHERE id = ?");
        $stmt->execute([$plan, $_SESSION['user_id']]);
    } catch (Exception $e) {
        // Logar erro interno
    }
}

// Retornar dados necessários para o frontend
$result = [
    'success' => true,
    'payment_id' => $paymentId,
    'status' => $status,
    'status_detail' => isset($data['status_detail']) ? $data['status_detail'] : ''
];

if ($paymentMethodId === 'pix') {
    $result['qr_code'] = isset($data['point_of_interaction']['transaction_data']['qr_code']) 
        ? $data['point_of_interaction']['transaction_data']['qr_code'] : '';
    $result['qr_code_base64'] = isset($data['point_of_interaction']['transaction_data']['qr_code_base64']) 
        ? $data['point_of_interaction']['transaction_data']['qr_code_base64'] : '';
}

echo json_encode($result);
