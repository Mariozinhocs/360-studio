<?php
require_once 'api/config.php';
header('Content-Type: application/json; charset=utf-8');

$session_user_id = $_SESSION['user_id'] ?? null;
$user_db = null;

if ($session_user_id) {
    try {
        $stmt = $pdo->prepare("SELECT id, name, username, email, is_admin FROM " . TABLE_PREFIX . "users WHERE id = ?");
        $stmt->execute([$session_user_id]);
        $user_db = $stmt->fetch();
    } catch (Exception $e) {
        $user_db = 'Error: ' . $e->getMessage();
    }
}

echo json_encode([
    'session' => $_SESSION,
    'user_db' => $user_db,
    'table_prefix' => TABLE_PREFIX
]);
