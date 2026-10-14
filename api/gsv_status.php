<?php
require_once 'config.php';

loginRequired();

$isConnected = !empty($_SESSION['gsv_access_token']) && ($_SESSION['gsv_token_expires'] ?? 0) > time();

// Se o token expirou mas temos refresh token, tenta renovar
if (!$isConnected && !empty($_SESSION['gsv_refresh_token'])) {
    $clientId = defined('GOOGLE_CLIENT_ID') && !empty(GOOGLE_CLIENT_ID) ? GOOGLE_CLIENT_ID : (getenv('GOOGLE_CLIENT_ID') ?: '');
    $clientSecret = defined('GOOGLE_CLIENT_SECRET') && !empty(GOOGLE_CLIENT_SECRET) ? GOOGLE_CLIENT_SECRET : (getenv('GOOGLE_CLIENT_SECRET') ?: '');

    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query([
            'refresh_token' => $_SESSION['gsv_refresh_token'],
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'grant_type' => 'refresh_token'
        ]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => true
    ]);

    $response = curl_exec($ch);
    curl_close($ch);

    $tokenData = json_decode($response, true);
    if (isset($tokenData['access_token'])) {
        $_SESSION['gsv_access_token'] = $tokenData['access_token'];
        $_SESSION['gsv_token_expires'] = time() + ($tokenData['expires_in'] ?? 3600);
        $isConnected = true;
    }
}

// Obter limite do plano do usuário
$user = getCurrentUser($pdo);
$plan = resolvePlanName($user);
$gsvLimit = PLANS_MATRIX[$plan]['gsv_projects_per_month'] ?? 0;

echo json_encode([
    'success' => true,
    'isConnected' => $isConnected,
    'gsvLimit' => $gsvLimit,
    'plan' => $plan
]);
