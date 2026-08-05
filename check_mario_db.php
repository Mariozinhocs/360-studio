<?php
require_once 'api/config.php';
header('Content-Type: text/plain; charset=utf-8');

try {
    $stmt = $pdo->prepare("SELECT id, name, username, email, is_admin FROM " . TABLE_PREFIX . "users WHERE username = 'mariozinhocs' OR email LIKE '%mario%'");
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($users);
} catch (Exception $e) {
    echo "Erro: " . $e->getMessage();
}
