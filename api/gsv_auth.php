<?php
require_once 'config.php';

loginRequired();

// Garantir que a saída da página seja interpretada como HTML
header('Content-Type: text/html; charset=utf-8');

$currentUser = getCurrentUser();
$gsvQuota = hasFeature($currentUser, 'gsv_projects_per_month');

if (!$gsvQuota || (int)$gsvQuota <= 0) {
    echo "<!DOCTYPE html>
    <html lang='pt-BR'>
    <head>
        <meta charset='UTF-8'>
        <title>Recurso Bloqueado - Google Street View</title>
        <style>
            body { background: #0a0b0e; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
            .card { background: rgba(16,18,26,0.95); border: 1px solid rgba(255,68,68,0.3); border-radius: 16px; padding: 40px; max-width: 480px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
            i { font-size: 48px; color: #ff4444; margin-bottom: 16px; }
            h2 { font-size: 20px; margin-bottom: 12px; }
            p { font-size: 13px; color: #8f9cae; line-height: 1.6; margin-bottom: 24px; }
            .btn { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #00f2fe, #4facfe); color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 13px; transition: transform 0.2s; }
            .btn:hover { transform: scale(1.04); }
        </style>
        <link rel='stylesheet' href='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'>
    </head>
    <body>
        <div class='card'>
            <i class='fa-solid fa-lock'></i>
            <h2>Google Street View Indisponível</h2>
            <p>A publicação direta de tours no Google Street View está disponível a partir do <strong>Plano Pessoal</strong> ou <strong>Profissional</strong>.<br><br>Faça o upgrade da sua assinatura para desbloquear cotas de publicação no Google Maps!</p>
            <a href='../plans.html' class='btn'><i class='fa-solid fa-crown'></i> Conhecer Planos e Fazer Upgrade</a>
        </div>
    </body>
    </html>";
    exit;
}

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
            <p>O <code>GOOGLE_CLIENT_ID</code> e <code>GOOGLE_CLIENT_SECRET</code> precisam ser configurados no arquivo de ambiente (<code>.env</code>) no servidor para habilitar a autenticação com o Google Street View.</p>
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
