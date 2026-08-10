<?php
require_once 'config.php';

loginRequired();

$publicKey = getenv('MERCADOPAGO_PUBLIC_KEY') ?: $_ENV['MERCADOPAGO_PUBLIC_KEY'] ?? '';

if (empty($publicKey)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Configuração do gateway de pagamento ausente.'
    ]);
    exit;
}

echo json_encode([
    'success' => true,
    'publicKey' => $publicKey,
    'email' => $_SESSION['user_email'] ?? ''
]);
