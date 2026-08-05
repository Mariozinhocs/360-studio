<?php
require_once 'admin_helper.php';
header('Content-Type: application/json');

echo json_encode([
    'session_user_id' => $_SESSION['user_id'] ?? null,
    'admin_user_glob' => $GLOBALS['admin_user'] ?? null,
    'is_super_admin' => isSuperAdmin()
]);
