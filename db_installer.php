<?php
header('Content-Type: text/plain; charset=utf-8');

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Carregar variáveis de ambiente simples a partir do arquivo .env
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

// Carrega o .env localizado na raiz do projeto
$env_path = __DIR__ . '/.env';
loadEnv($env_path);

// Credenciais de conexão
$db_host = getenv('DATABASE_HOST') ?: 'localhost';
$db_user = getenv('DATABASE_USER') ?: 'root';
$db_pass = getenv('DATABASE_PASSWORD') ?: '';
$db_name = getenv('DATABASE_NAME') ?: 'tour360_db';
$db_port = getenv('DATABASE_PORT') ?: '3306';

echo "Iniciando criação das tabelas no banco: $db_name...\n";
echo "Host: $db_host\n";
echo "Usuário: $db_user\n";

try {
    $pdo = new PDO("mysql:host=$db_host;port=$db_port;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    $sql_file = __DIR__ . '/api/schema.sql';
    if (!file_exists($sql_file)) {
        die("Erro: Arquivo schema.sql não encontrado em $sql_file\n");
    }

    $sql = file_get_contents($sql_file);
    
    // Substitui prefixo das tabelas
    $prefix = getenv('DB_TABLE_PREFIX') ?: '';
    $users_table = $prefix . 'users';
    echo "Prefixo de tabelas utilizado: '" . $prefix . "'\n";

    // Verifica se a tabela de usuários já existe
    $table_exists = false;
    try {
        $result = $pdo->query("SHOW TABLES LIKE '{$users_table}'");
        $table_exists = $result->rowCount() > 0;
    } catch (Exception $e) {
        $table_exists = false;
    }

    if ($table_exists) {
        echo "Tabela '{$users_table}' já existe. Atualizando estrutura de forma segura...\n";
        
        // Altera o tipo de is_admin para evitar conversão para boolean (tinyint(1) -> tinyint)
        try {
            $pdo->exec("ALTER TABLE `{$users_table}` MODIFY COLUMN is_admin TINYINT DEFAULT 0");
            echo "Tipo da coluna 'is_admin' modificado para TINYINT com sucesso!\n";
        } catch (Exception $e) {
            echo "Erro ao modificar tipo de 'is_admin': " . $e->getMessage() . "\n";
        }

        // Verifica se a coluna deleted_at existe
        $col_deleted = $pdo->query("SHOW COLUMNS FROM `{$users_table}` LIKE 'deleted_at'");
        if ($col_deleted->rowCount() === 0) {
            $pdo->exec("ALTER TABLE `{$users_table}` ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL AFTER subscription_expires_at");
            echo "Coluna 'deleted_at' adicionada com sucesso!\n";
        } else {
            echo "Coluna 'deleted_at' já existe.\n";
        }

        // Verifica se a coluna timezone existe
        $col_timezone = $pdo->query("SHOW COLUMNS FROM `{$users_table}` LIKE 'timezone'");
        if ($col_timezone->rowCount() === 0) {
            $pdo->exec("ALTER TABLE `{$users_table}` ADD COLUMN timezone VARCHAR(100) DEFAULT 'America/Sao_Paulo' AFTER subscription_expires_at");
            echo "Coluna 'timezone' adicionada com sucesso!\n";
        } else {
            echo "Coluna 'timezone' já existe.\n";
        }

        // Verifica se a coluna floor_plan_json existe na tabela de tours
        $tours_table = $prefix . 'tours';
        $col_floorplan = $pdo->query("SHOW COLUMNS FROM `{$tours_table}` LIKE 'floor_plan_json'");
        if ($col_floorplan->rowCount() === 0) {
            $pdo->exec("ALTER TABLE `{$tours_table}` ADD COLUMN floor_plan_json LONGTEXT NULL DEFAULT NULL AFTER scenes_json");
            echo "Coluna 'floor_plan_json' adicionada com sucesso na tabela de tours!\n";
        } else {
            echo "Coluna 'floor_plan_json' já existe na tabela de tours.\n";
        }

        // Verifica se a coluna logo_url existe na tabela de tours
        $col_logo = $pdo->query("SHOW COLUMNS FROM `{$tours_table}` LIKE 'logo_url'");
        if ($col_logo->rowCount() === 0) {
            $pdo->exec("ALTER TABLE `{$tours_table}` ADD COLUMN logo_url VARCHAR(255) NULL DEFAULT NULL AFTER floor_plan_json");
            echo "Coluna 'logo_url' adicionada com sucesso na tabela de tours!\n";
        } else {
            echo "Coluna 'logo_url' já existe na tabela de tours.\n";
        }

        // Verifica se a coluna privacy_settings existe na tabela de tours
        $col_privacy = $pdo->query("SHOW COLUMNS FROM `{$tours_table}` LIKE 'privacy_settings'");
        if ($col_privacy->rowCount() === 0) {
            $pdo->exec("ALTER TABLE `{$tours_table}` ADD COLUMN privacy_settings VARCHAR(255) NULL DEFAULT NULL AFTER logo_url");
            echo "Coluna 'privacy_settings' adicionada com sucesso na tabela de tours!\n";
        } else {
            echo "Coluna 'privacy_settings' já existe na tabela de tours.\n";
        }
    } else {
        echo "Tabela '{$users_table}' não encontrada. Criando novas tabelas...\n";
        $sql = file_get_contents($sql_file);
        $sql = str_replace('{PREFIX}', $prefix, $sql);
        // Executa o SQL
        $pdo->exec($sql);
        echo "Tabelas criadas com sucesso!\n";
    }

    // Promover administradores padrão para facilidade de teste como Super Admin (nível 2)
    $stmt = $pdo->prepare("UPDATE `{$users_table}` SET is_admin = 2 WHERE username = 'mariozinhocs' OR email LIKE :mario OR id = 1");
    $stmt->execute([':mario' => '%mario%']);
    echo "Administradores padrão configurados com sucesso (Super Admin para 'mariozinhocs').\n";
} catch (Exception $e) {
    echo "Erro de Conexão/Execução: " . $e->getMessage() . "\n";
}
