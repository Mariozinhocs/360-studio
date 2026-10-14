<?php
require_once 'config.php';

loginRequired();

// Configurações do Google OAuth
$clientId = defined('GOOGLE_CLIENT_ID') && !empty(GOOGLE_CLIENT_ID) ? GOOGLE_CLIENT_ID : (getenv('GOOGLE_CLIENT_ID') ?: '');
$redirectUri = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . '/gsv_callback.php';

if (empty($clientId) || $clientId === 'YOUR_GOOGLE_CLIENT_ID') {
    echo "<!DOCTYPE html>
    <html lang='pt-BR'>
    <head>
        <meta charset='UTF-8'>
        <title>Configuração do Google OAuth Pendente</title>
        <style>
            body { background: #0a0b0e; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
            .card { background: rgba(16,18,26,0.9); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 40px; max-width: 460px; }
            i { font-size: 48px; color: #ea4335; margin-bottom: 16px; }
            h2 { font-size: 20px; margin-bottom: 12px; }
            p { font-size: 13px; color: #8f9cae; line-height: 1.5; margin-bottom: 20px; }
            code { background: rgba(255,255,255,0.08); padding: 4px 8px; border-radius: 4px; color: #00f2fe; font-size: 12px; }
        </style>
        <link rel='stylesheet' href='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'>
    </head>
    <body>
        <div class='card'>
            <i class='fa-solid fa-key'></i>
            <h2>Credenciais do Google Pendentes</h2>
            <p>O <code>GOOGLE_CLIENT_ID</code> e <code>GOOGLE_CLIENT_SECRET</code> precisam ser configurados no arquivo <code>.env.prod</code> no servidor para habilitar a autenticação com o Google Street View.</p>
            <p style='font-size: 12px; opacity: 0.7;'>Consulte as instruções enviadas para cadastrar o app no Google Cloud Console.</p>
        </div>
    </body>
    </html>";
    exit;
}

$scope = urlencode('https://www.googleapis.com/auth/streetviewpublish email profile');
$authUrl = "https://accounts.google.com/o/oauth2/v2/auth?" .
    "client_id=" . urlencode($clientId) .
    "&redirect_uri=" . urlencode($redirectUri) .
    "&response_type=code" .
    "&scope={$scope}" .
    "&access_type=offline" .
    "&prompt=consent";

if (isset($_GET['ajax']) && $_GET['ajax'] == '1') {
    echo json_encode([
        'success' => true,
        'authUrl' => $authUrl,
        'isConnected' => !empty($_SESSION['gsv_access_token'])
    ]);
    exit;
}

header("Location: {$authUrl}");
exit;
