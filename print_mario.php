<?php
require_once 'api/config.php';
header('Content-Type: text/plain; charset=utf-8');
$stmt = $pdo->prepare("SELECT is_admin FROM " . TABLE_PREFIX . "users WHERE username = ?");
$stmt->execute(['mariozinhocs']);
$res = $stmt->fetch();
echo "is_admin_value=" . ($res ? $res['is_admin'] : 'not_found');
