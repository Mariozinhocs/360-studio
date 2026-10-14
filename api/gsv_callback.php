<?php
require_once 'config.php';

loginRequired();

$code = $_GET['code'] ?? '';
$error = $_GET['error'] ?? '';

if (!empty($error)) {
    echo "<h2 style='font-family: sans-serif; color: #ff4a5a; text-align: center; margin-top: 50px;'>Erro na autenticação do Google: " . htmlspecialchars($error) . "</h2>";
    exit;
}

if (empty($code)) {
    echo "<h2 style='font-family: sans-serif; color: #ff4a5a; text-align: center; margin-top: 50px;'>Código de autorização não recebido.</h2>";
    exit;
}

$clientId = defined('GOOGLE_CLIENT_ID') && !empty(GOOGLE_CLIENT_ID) ? GOOGLE_CLIENT_ID : (getenv('GOOGLE_CLIENT_ID') ?: '');
$clientSecret = defined('GOOGLE_CLIENT_SECRET') && !empty(GOOGLE_CLIENT_SECRET) ? GOOGLE_CLIENT_SECRET : (getenv('GOOGLE_CLIENT_SECRET') ?: '');
$redirectUri = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . '/gsv_callback.php';

// Trocar código por tokens
$ch = curl_init('https://oauth2.googleapis.com/token');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query([
        'code' => $code,
        'client_id' => $clientId,
        'client_secret' => $clientSecret,
        'redirect_uri' => $redirectUri,
        'grant_type' => 'authorization_code'
    ]),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_SSL_VERIFYPEER => true
]);

$response = curl_exec($ch);
curl_close($ch);

$tokenData = json_decode($response, true);

if (isset($tokenData['access_token'])) {
    $_SESSION['gsv_access_token'] = $tokenData['access_token'];
    if (!empty($tokenData['refresh_token'])) {
        $_SESSION['gsv_refresh_token'] = $tokenData['refresh_token'];
    }
    $_SESSION['gsv_token_expires'] = time() + ($tokenData['expires_in'] ?? 3600);

    echo "<!DOCTYPE html>
    <html lang='pt-BR'>
    <head>
        <meta charset='UTF-8'>
        <title>Google Street View Conectado</title>
        <style>
            body { background: #0a0b0e; color: #fff; font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
            .card { background: rgba(16,18,26,0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 40px; max-width: 400px; backdrop-filter: blur(20px); }
            i { font-size: 48px; color: #00f2fe; margin-bottom: 16px; }
            h2 { font-size: 20px; margin-bottom: 8px; }
            p { font-size: 13px; color: #8f9cae; margin-bottom: 24px; }
            .btn { background: #00f2fe; color: #000; padding: 10px 20px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block; cursor: pointer; }
        </style>
        <link rel='stylesheet' href='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'>
    </head>
    <body>
        <div class='card'>
            <i class='fa-solid fa-circle-check'></i>
            <h2>Conta Google Conectada!</h2>
            <p>Sua conta Google foi autenticada com sucesso para publicar no Google Street View.</p>
            <button class='btn' onclick='window.opener && window.opener.gsvConnectedCallback ? window.opener.gsvConnectedCallback() : window.close(); window.close();'>Voltar ao 360° Studio</button>
        </div>
        <script>
            if (window.opener && window.opener.gsvConnectedCallback) {
                window.opener.gsvConnectedCallback();
                setTimeout(() => window.close(), 1500);
            }
        </script>
    </body>
    </html>";
} else {
    $msg = $tokenData['error_description'] ?? 'Falha ao autenticar com o Google.';
    echo "<h2 style='font-family: sans-serif; color: #ff4a5a; text-align: center; margin-top: 50px;'>Erro na autenticação: " . htmlspecialchars($msg) . "</h2>";
}
