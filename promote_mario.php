<?php
require_once 'api/config.php';
header('Content-Type: text/plain; charset=utf-8');

try {
    // Garantir que mariozinhocs seja super admin (is_admin = 2)
    $stmt = $pdo->prepare("UPDATE " . TABLE_PREFIX . "users SET is_admin = 2 WHERE username = 'mariozinhocs'");
    $stmt->execute();
    echo "Usuário 'mariozinhocs' promovido. Linhas afetadas: " . $stmt->rowCount() . "\n\n";

    // Listar todos os usuários cadastrados no banco para depuração
    $stmt2 = $pdo->query("SELECT id, name, username, email, is_admin FROM " . TABLE_PREFIX . "users");
    $users = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    echo "Lista de Usuários no Banco:\n";
    print_r($users);

} catch (Exception $e) {
    echo "Erro ao processar promoção: " . $e->getMessage();
}
