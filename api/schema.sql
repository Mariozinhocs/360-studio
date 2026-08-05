-- Exclusão de tabelas anteriores para recriação do schema
DROP TABLE IF EXISTS {PREFIX}tours;
DROP TABLE IF EXISTS {PREFIX}users;

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
    deleted_at DATETIME NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criação da tabela de tours virtuais
CREATE TABLE IF NOT EXISTS {PREFIX}tours (
    id VARCHAR(50) PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    scenes_json LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES {PREFIX}users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
