-- Exclusão de tabelas anteriores para recriação do schema
DROP TABLE IF EXISTS {PREFIX}tours;
DROP TABLE IF EXISTS {PREFIX}users;
DROP TABLE IF EXISTS {PREFIX}plans;
DROP TABLE IF EXISTS {PREFIX}home_settings;

-- Criação da tabela de usuários
CREATE TABLE IF NOT EXISTS {PREFIX}users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_admin TINYINT DEFAULT 0,
    subscription_status VARCHAR(50) DEFAULT 'trial', -- 'trial', 'active', 'expired'
    subscription_expires_at DATETIME NULL,
    timezone VARCHAR(100) DEFAULT 'America/Sao_Paulo',
    deleted_at DATETIME NULL DEFAULT NULL,
    password_reset_token VARCHAR(255) DEFAULT NULL,
    password_reset_expires DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criação da tabela de tours virtuais
CREATE TABLE IF NOT EXISTS {PREFIX}tours (
    id VARCHAR(50) PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    scenes_json LONGTEXT NOT NULL,
    floor_plan_json LONGTEXT NULL DEFAULT NULL,
    logo_url VARCHAR(255) NULL DEFAULT NULL,
    privacy_settings VARCHAR(255) NULL DEFAULT NULL,
    nadir_json LONGTEXT NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES {PREFIX}users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criação da tabela de planos e recursos comerciais
CREATE TABLE IF NOT EXISTS {PREFIX}plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_key VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    max_tours INT NOT NULL DEFAULT 0,
    max_scenes INT NOT NULL DEFAULT 0,
    gsv_projects_per_month INT NOT NULL DEFAULT 0,
    max_logos INT NOT NULL DEFAULT 0,
    navigation_arrows TINYINT(1) NOT NULL DEFAULT 0,
    no_ads TINYINT(1) NOT NULL DEFAULT 0,
    privacy_control TINYINT(1) NOT NULL DEFAULT 0,
    offline_access TINYINT(1) NOT NULL DEFAULT 0,
    ambient_sound TINYINT(1) NOT NULL DEFAULT 0,
    image_gallery TINYINT(1) NOT NULL DEFAULT 0,
    floor_plans TINYINT(1) NOT NULL DEFAULT 0,
    text_markers TINYINT(1) NOT NULL DEFAULT 0,
    nadir_patch TINYINT(1) NOT NULL DEFAULT 0,
    rich_hotspots TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criação da tabela de configurações da Landing Page (Home)
CREATE TABLE IF NOT EXISTS {PREFIX}home_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value LONGTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
