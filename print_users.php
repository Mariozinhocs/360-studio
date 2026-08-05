<?php
require_once 'api/config.php';
header('Content-Type: application/json');
$stmt = $pdo->query("SELECT id, name, username, email, is_admin FROM " . TABLE_PREFIX . "users");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
