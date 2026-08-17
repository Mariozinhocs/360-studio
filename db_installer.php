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

        // Verifica se a coluna password_reset_token existe
        $col_reset_token = $pdo->query("SHOW COLUMNS FROM `{$users_table}` LIKE 'password_reset_token'");
        if ($col_reset_token->rowCount() === 0) {
            $pdo->exec("ALTER TABLE `{$users_table}` ADD COLUMN password_reset_token VARCHAR(255) DEFAULT NULL AFTER deleted_at");
            echo "Coluna 'password_reset_token' adicionada com sucesso!\n";
        } else {
            echo "Coluna 'password_reset_token' já existe.\n";
        }

        // Verifica se a coluna password_reset_expires existe
        $col_reset_expires = $pdo->query("SHOW COLUMNS FROM `{$users_table}` LIKE 'password_reset_expires'");
        if ($col_reset_expires->rowCount() === 0) {
            $pdo->exec("ALTER TABLE `{$users_table}` ADD COLUMN password_reset_expires DATETIME DEFAULT NULL AFTER password_reset_token");
            echo "Coluna 'password_reset_expires' adicionada com sucesso!\n";
        } else {
            echo "Coluna 'password_reset_expires' já existe.\n";
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

        // Verifica se a coluna nadir_json existe na tabela de tours
        $col_nadir = $pdo->query("SHOW COLUMNS FROM `{$tours_table}` LIKE 'nadir_json'");
        if ($col_nadir->rowCount() === 0) {
            $pdo->exec("ALTER TABLE `{$tours_table}` ADD COLUMN nadir_json LONGTEXT NULL DEFAULT NULL AFTER privacy_settings");
            echo "Coluna 'nadir_json' adicionada com sucesso na tabela de tours!\n";
        } else {
            echo "Coluna 'nadir_json' já existe na tabela de tours.\n";
        }
    } else {
        echo "Tabela '{$users_table}' não encontrada. Criando novas tabelas...\n";
        $sql = file_get_contents($sql_file);
        $sql = str_replace('{PREFIX}', $prefix, $sql);
        // Executa o SQL
        $pdo->exec($sql);
        echo "Tabelas criadas com sucesso!\n";
    }

    // Criar tabela de planos se ela não existir
    $plans_table = $prefix . 'plans';
    $pdo->exec("CREATE TABLE IF NOT EXISTS `{$plans_table}` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `plan_key` VARCHAR(30) UNIQUE NOT NULL,
        `name` VARCHAR(50) NOT NULL,
        `price_monthly` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        `price_yearly` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        `max_tours` INT NOT NULL DEFAULT 0,
        `max_scenes` INT NOT NULL DEFAULT 0,
        `gsv_projects_per_month` INT NOT NULL DEFAULT 0,
        `max_logos` INT NOT NULL DEFAULT 0,
        `navigation_arrows` TINYINT(1) NOT NULL DEFAULT 0,
        `no_ads` TINYINT(1) NOT NULL DEFAULT 0,
        `privacy_control` TINYINT(1) NOT NULL DEFAULT 0,
        `offline_access` TINYINT(1) NOT NULL DEFAULT 0,
        `ambient_sound` TINYINT(1) NOT NULL DEFAULT 0,
        `image_gallery` TINYINT(1) NOT NULL DEFAULT 0,
        `floor_plans` TINYINT(1) NOT NULL DEFAULT 0,
        `text_markers` TINYINT(1) NOT NULL DEFAULT 0,
        `nadir_patch` TINYINT(1) NOT NULL DEFAULT 0,
        `rich_hotspots` TINYINT(1) NOT NULL DEFAULT 0,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Tabela '{$plans_table}' garantida/criada com sucesso!\n";

    // Semear/popular tabela de planos se estiver vazia
    $countPlans = $pdo->query("SELECT COUNT(*) FROM `{$plans_table}`")->fetchColumn();
    if ($countPlans == 0) {
        $defaultPlans = [
            [
                'plan_key' => 'gratis',
                'name' => 'Grátis',
                'price_monthly' => 0.00,
                'price_yearly' => 0.00,
                'max_tours' => 5,
                'max_scenes' => 10,
                'gsv_projects_per_month' => 0,
                'max_logos' => 0,
                'navigation_arrows' => 1,
                'no_ads' => 0,
                'privacy_control' => 0,
                'offline_access' => 0,
                'ambient_sound' => 0,
                'image_gallery' => 0,
                'floor_plans' => 0,
                'text_markers' => 0,
                'nadir_patch' => 0,
                'rich_hotspots' => 0
            ],
            [
                'plan_key' => 'iniciante',
                'name' => 'Iniciante',
                'price_monthly' => 89.99,
                'price_yearly' => 863.90,
                'max_tours' => 10,
                'max_scenes' => 20,
                'gsv_projects_per_month' => 0,
                'max_logos' => 0,
                'navigation_arrows' => 1,
                'no_ads' => 1,
                'privacy_control' => 0,
                'offline_access' => 0,
                'ambient_sound' => 0,
                'image_gallery' => 0,
                'floor_plans' => 0,
                'text_markers' => 0,
                'nadir_patch' => 0,
                'rich_hotspots' => 0
            ],
            [
                'plan_key' => 'basico',
                'name' => 'Básico',
                'price_monthly' => 129.99,
                'price_yearly' => 1247.90,
                'max_tours' => 50,
                'max_scenes' => 20,
                'gsv_projects_per_month' => 1,
                'max_logos' => 1,
                'navigation_arrows' => 1,
                'no_ads' => 1,
                'privacy_control' => 0,
                'offline_access' => 0,
                'ambient_sound' => 0,
                'image_gallery' => 0,
                'floor_plans' => 0,
                'text_markers' => 1,
                'nadir_patch' => 1,
                'rich_hotspots' => 1
            ],
            [
                'plan_key' => 'pessoal',
                'name' => 'Pessoal',
                'price_monthly' => 199.99,
                'price_yearly' => 1919.90,
                'max_tours' => 100,
                'max_scenes' => 50,
                'gsv_projects_per_month' => 3,
                'max_logos' => 2,
                'navigation_arrows' => 1,
                'no_ads' => 1,
                'privacy_control' => 0,
                'offline_access' => 1,
                'ambient_sound' => 1,
                'image_gallery' => 0,
                'floor_plans' => 0,
                'text_markers' => 1,
                'nadir_patch' => 1,
                'rich_hotspots' => 1
            ],
            [
                'plan_key' => 'profissional',
                'name' => 'Profissional',
                'price_monthly' => 349.99,
                'price_yearly' => 3359.90,
                'max_tours' => 99999,
                'max_scenes' => 99999,
                'gsv_projects_per_month' => 9999,
                'max_logos' => 9999,
                'navigation_arrows' => 1,
                'no_ads' => 1,
                'privacy_control' => 1,
                'offline_access' => 1,
                'ambient_sound' => 1,
                'image_gallery' => 1,
                'floor_plans' => 1,
                'text_markers' => 1,
                'nadir_patch' => 1,
                'rich_hotspots' => 1
            ]
        ];

        $stmtInsert = $pdo->prepare("INSERT INTO `{$plans_table}` (
            plan_key, name, price_monthly, price_yearly, max_tours, max_scenes, 
            gsv_projects_per_month, max_logos, navigation_arrows, no_ads, 
            privacy_control, offline_access, ambient_sound, image_gallery, 
            floor_plans, text_markers, nadir_patch, rich_hotspots
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )");

        foreach ($defaultPlans as $p) {
            $stmtInsert->execute([
                $p['plan_key'], $p['name'], $p['price_monthly'], $p['price_yearly'],
                $p['max_tours'], $p['max_scenes'], $p['gsv_projects_per_month'],
                $p['max_logos'], $p['navigation_arrows'], $p['no_ads'],
                $p['privacy_control'], $p['offline_access'], $p['ambient_sound'],
                $p['image_gallery'], $p['floor_plans'], $p['text_markers'],
                $p['nadir_patch'], $p['rich_hotspots']
            ]);
        }
        echo "Planos padrão semeados/inseridos com sucesso!\n";
    } else {
        echo "Tabela de planos já possui registros semeados.\n";
    }

    // Criar tabela de home_settings se ela não existir
    $home_settings_table = $prefix . 'home_settings';
    $pdo->exec("CREATE TABLE IF NOT EXISTS `{$home_settings_table}` (
        `setting_key` VARCHAR(50) PRIMARY KEY,
        `setting_value` LONGTEXT NOT NULL,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "Tabela '{$home_settings_table}' garantida/criada com sucesso!\n";

    // Promover administradores padrão para facilidade de teste como Super Admin (nível 2)
    $stmt = $pdo->prepare("UPDATE `{$users_table}` SET is_admin = 2 WHERE username = 'mariozinhocs' OR email LIKE :mario OR id = 1");
    $stmt->execute([':mario' => '%mario%']);
    echo "Administradores padrão configurados com sucesso (Super Admin para 'mariozinhocs').\n";
} catch (Exception $e) {
    echo "Erro de Conexão/Execução: " . $e->getMessage() . "\n";
}
