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

// Helper para verificar status da assinatura e se ela está ativa/trial válido
function checkSubscription($user) {
    if ($user['subscription_status'] === 'expired') {
        return false;
    }
    
    if ($user['subscription_status'] === 'trial') {
        if (!empty($user['subscription_expires_at'])) {
            $expiry = new DateTime($user['subscription_expires_at']);
            $now = new DateTime();
            if ($now > $expiry) {
                return false; // Trial expirou
            }
        }
    }
    
    return true; // Premium ativo ou Trial dentro da validade
}
