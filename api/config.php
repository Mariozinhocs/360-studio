<?php
// Exibição de erros para desenvolvimento/homologação
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Definir fuso horário padrão do PHP como UTC
date_default_timezone_set('UTC');

// Header padrão JSON
header('Content-Type: application/json; charset=utf-8');

// Configurações de cookies de sessão seguros
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Carregar variáveis de ambiente a partir do arquivo .env
function loadEnv($path) {
    if (!file_exists($path)) {
        return;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
            putenv(sprintf('%s=%s', $name, $value));
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

// Carrega o .env localizado na raiz do projeto (duas pastas acima da pasta api/)
$env_path = dirname(__DIR__) . '/.env';
loadEnv($env_path);

// Prefixo de tabelas para isolamento
define('TABLE_PREFIX', getenv('DB_TABLE_PREFIX') ?: '');

// Conexão MySQL via PDO
$db_host = getenv('DATABASE_HOST') ?: 'localhost';
$db_user = getenv('DATABASE_USER') ?: 'root';
$db_pass = getenv('DATABASE_PASSWORD') ?: '';
$db_name = getenv('DATABASE_NAME') ?: 'tour360_db';
$db_port = getenv('DATABASE_PORT') ?: '3306';

try {
    $pdo = new PDO("mysql:host=$db_host;port=$db_port;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    // Forçar fuso horário da conexão MySQL para UTC para garantir consistência
    $pdo->exec("SET time_zone = '+00:00'");
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro ao conectar ao banco de dados: ' . $e->getMessage()]);
    exit;
}

// Helper para verificar se usuário está logado
function loginRequired() {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Autenticação necessária. Faça login novamente.']);
        exit;
    }
}

// Helper para verificar status da assinatura e se ela está ativa/válida
function checkSubscription($user) {
    if ($user['subscription_status'] === 'expired') {
        return false;
    }
    
    // Se o plano tiver data de expiração definida, valida contra a data atual
    if (!empty($user['subscription_expires_at'])) {
        $expiry = new DateTime($user['subscription_expires_at']);
        $now = new DateTime();
        if ($now > $expiry) {
            return false; // Assinatura expirou
        }
    }
    
    return true; // Plano ativo dentro da validade (ou sem expiração definida)
}

// Definição da matriz de recursos e limites de planos comerciais
define('PLANS_MATRIX', [
    'gratis' => [
        'name' => 'Grátis',
        'max_tours' => 5,
        'max_scenes' => 10,
        'gsv_projects_per_month' => 0,
        'max_logos' => 0,
        'navigation_arrows' => true,
        'no_ads' => false,
        'privacy_control' => false,
        'offline_access' => false,
        'ambient_sound' => false,
        'image_gallery' => false,
        'floor_plans' => false,
        'text_markers' => false
    ],
    'iniciante' => [
        'name' => 'Iniciante',
        'max_tours' => 10,
        'max_scenes' => 20,
        'gsv_projects_per_month' => 0,
        'max_logos' => 0,
        'navigation_arrows' => true,
        'no_ads' => true,
        'privacy_control' => false,
        'offline_access' => false,
        'ambient_sound' => false,
        'image_gallery' => false,
        'floor_plans' => false,
        'text_markers' => false
    ],
    'basico' => [
        'name' => 'Básico',
        'max_tours' => 50,
        'max_scenes' => 20,
        'gsv_projects_per_month' => 1,
        'max_logos' => 1,
        'navigation_arrows' => true,
        'no_ads' => true,
        'privacy_control' => false,
        'offline_access' => false,
        'ambient_sound' => false,
        'image_gallery' => false,
        'floor_plans' => false,
        'text_markers' => true
    ],
    'pessoal' => [
        'name' => 'Pessoal',
        'max_tours' => 100,
        'max_scenes' => 50,
        'gsv_projects_per_month' => 3,
        'max_logos' => 2,
        'navigation_arrows' => true,
        'no_ads' => true,
        'privacy_control' => false,
        'offline_access' => true,
        'ambient_sound' => true,
        'image_gallery' => false,
        'floor_plans' => false,
        'text_markers' => true
    ],
    'profissional' => [
        'name' => 'Profissional',
        'max_tours' => -1, // ilimitado
        'max_scenes' => -1, // ilimitado
        'gsv_projects_per_month' => 25,
        'max_logos' => -1, // ilimitado
        'navigation_arrows' => true,
        'no_ads' => true,
        'privacy_control' => true,
        'offline_access' => true,
        'ambient_sound' => true,
        'image_gallery' => true,
        'floor_plans' => true,
        'text_markers' => true
    ]
]);

// Helper para validar se o usuário possui acesso a um recurso específico
function hasFeature($user, $featureName) {
    $plan = $user['subscription_status'] ?? 'gratis';
    if (!defined('PLANS_MATRIX') || !isset(PLANS_MATRIX[$plan])) {
        $plan = 'gratis';
    }
    
    // Se o plano expirou, o usuário perde os privilégios pagos e rebaixa para "gratis"
    if (!checkSubscription($user)) {
        $plan = 'gratis';
    }
    
    return PLANS_MATRIX[$plan][$featureName] ?? false;
}

// Helper para verificar se o usuário pode criar um novo tour
function canCreateTour($userId) {
    global $pdo;
    
    $stmt = $pdo->prepare("SELECT subscription_status, subscription_expires_at FROM " . TABLE_PREFIX . "users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    if (!$user) {
        return false;
    }
    
    $plan = $user['subscription_status'] ?? 'gratis';
    if (!checkSubscription($user)) {
        $plan = 'gratis';
    }
    
    $maxTours = PLANS_MATRIX[$plan]['max_tours'] ?? 5;
    if ($maxTours === -1) {
        return true; // Ilimitado
    }
    
    $stmtCount = $pdo->prepare("SELECT COUNT(*) as total FROM " . TABLE_PREFIX . "tours WHERE user_id = ?");
    $stmtCount->execute([$userId]);
    $count = $stmtCount->fetch();
    
    return ((int)$count['total'] < $maxTours);
}

// Helper para verificar se o usuário pode adicionar mais uma cena a um tour
function canAddScene($tourId) {
    global $pdo;
    
    $stmtTour = $pdo->prepare("SELECT user_id, scenes_json FROM " . TABLE_PREFIX . "tours WHERE id = ?");
    $stmtTour->execute([$tourId]);
    $tour = $stmtTour->fetch();
    if (!$tour) {
        return false;
    }
    
    $stmtUser = $pdo->prepare("SELECT subscription_status, subscription_expires_at FROM " . TABLE_PREFIX . "users WHERE id = ?");
    $stmtUser->execute([$tour['user_id']]);
    $user = $stmtUser->fetch();
    if (!$user) {
        return false;
    }
    
    $plan = $user['subscription_status'] ?? 'gratis';
    if (!checkSubscription($user)) {
        $plan = 'gratis';
    }
    
    $maxScenes = PLANS_MATRIX[$plan]['max_scenes'] ?? 10;
    if ($maxScenes === -1) {
        return true; // Ilimitado
    }
    
    $scenes = json_decode($tour['scenes_json'], true);
    $currentCount = is_array($scenes) ? count($scenes) : 0;
    
    return ($currentCount < $maxScenes);
}
