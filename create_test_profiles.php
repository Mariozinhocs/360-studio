<?php
require_once 'api/config.php';

header('Content-Type: text/plain; charset=utf-8');

$testUsers = [
    [
        'name' => 'Teste Grátis',
        'username' => 'gratis_tester',
        'email' => 'gratis_tester@example.com',
        'plan' => 'gratis',
        'is_admin' => 0
    ],
    [
        'name' => 'Teste Iniciante',
        'username' => 'iniciante_tester',
        'email' => 'iniciante_tester@example.com',
        'plan' => 'iniciante',
        'is_admin' => 0
    ],
    [
        'name' => 'Teste Básico',
        'username' => 'basico_tester',
        'email' => 'basico_tester@example.com',
        'plan' => 'basico',
        'is_admin' => 0
    ],
    [
        'name' => 'Teste Pessoal',
        'username' => 'pessoal_tester',
        'email' => 'pessoal_tester@example.com',
        'plan' => 'pessoal',
        'is_admin' => 0
    ],
    [
        'name' => 'Teste Profissional',
        'username' => 'profissional_tester',
        'email' => 'profissional_tester@example.com',
        'plan' => 'profissional',
        'is_admin' => 0
    ],
    [
        'name' => 'Teste Admin',
        'username' => 'admin_tester',
        'email' => 'admin_tester@example.com',
        'plan' => 'profissional',
        'is_admin' => 2 // Super Admin
    ]
];

$password = 'senha360';
$passwordHash = password_hash($password, PASSWORD_BCRYPT);

echo "Iniciando criação/atualização de contas de teste no prefixo '" . TABLE_PREFIX . "'...\n\n";

foreach ($testUsers as $u) {
    try {
        // Verificar se usuário existe
        $stmt = $pdo->prepare("SELECT id FROM " . TABLE_PREFIX . "users WHERE username = ?");
        $stmt->execute([$u['username']]);
        $user = $stmt->fetch();

        if ($user) {
            $stmtUpdate = $pdo->prepare("UPDATE " . TABLE_PREFIX . "users SET password_hash = ?, subscription_status = ?, is_admin = ?, deleted_at = NULL, timezone = 'America/Sao_Paulo' WHERE id = ?");
            $stmtUpdate->execute([$passwordHash, $u['plan'], $u['is_admin'], $user['id']]);
            echo "✔ Usuário '{$u['username']}' já existia. Senha resetada e plano definido como '{$u['plan']}' (Admin: {$u['is_admin']}).\n";
        } else {
            $stmtInsert = $pdo->prepare("INSERT INTO " . TABLE_PREFIX . "users (name, username, email, password_hash, subscription_status, is_admin, timezone) VALUES (?, ?, ?, ?, ?, ?, 'America/Sao_Paulo')");
            $stmtInsert->execute([$u['name'], $u['username'], $u['email'], $passwordHash, $u['plan'], $u['is_admin']]);
            echo "✚ Usuário '{$u['username']}' criado com sucesso no plano '{$u['plan']}' (Admin: {$u['is_admin']}).\n";
        }
    } catch (Exception $e) {
        echo "❌ Erro ao processar '{$u['username']}': " . $e->getMessage() . "\n";
    }
}

echo "\nProcesso concluído!\n";
