<?php
require_once 'admin_helper.php';

try {
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $status = isset($_GET['status']) ? trim($_GET['status']) : '';

    $where_clauses = [];
    $params = [];

    // Se não for Super Admin, só pode ver clientes comuns (is_admin = 0)
    if (!isSuperAdmin()) {
        $where_clauses[] = "u.is_admin = 0";
    }

    if ($search !== '') {
        $where_clauses[] = "(u.name LIKE :search OR u.username LIKE :search OR u.email LIKE :search)";
        $params[':search'] = '%' . $search . '%';
    }

    if ($status === 'deleted') {
        $where_clauses[] = "u.deleted_at IS NOT NULL";
    } else {
        $where_clauses[] = "u.deleted_at IS NULL";
        if ($status !== '') {
            if ($status === 'admin') {
                if (isSuperAdmin()) {
                    $where_clauses[] = "u.is_admin = 1";
                } else {
                    $where_clauses[] = "1 = 0";
                }
            } else {
                $where_clauses[] = "u.subscription_status = :status";
                $params[':status'] = $status;
            }
        }
    }

    $where_sql = '';
    if (count($where_clauses) > 0) {
        $where_sql = 'WHERE ' . implode(' AND ', $where_clauses);
    }

    // Primeiro buscamos todos os usuários filtrados e contagem de tours
    $sql = "SELECT 
                u.id, u.name, u.username, u.email, u.is_admin, u.subscription_status, u.subscription_expires_at, u.deleted_at, u.created_at,
                COUNT(t.id) as tours_count
            FROM " . TABLE_PREFIX . "users u
            LEFT JOIN " . TABLE_PREFIX . "tours t ON u.id = t.user_id
            $where_sql
            GROUP BY u.id
            ORDER BY u.created_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $users = $stmt->fetchAll();

    // Depois, mapeamos a contagem total de cenas para cada usuário em memória
    $stmtTours = $pdo->query("SELECT user_id, scenes_json FROM " . TABLE_PREFIX . "tours");
    $scenes_by_user = [];
    while ($t = $stmtTours->fetch()) {
        $scenes = json_decode($t['scenes_json'], true);
        $count = is_array($scenes) ? count($scenes) : 0;
        $uid = $t['user_id'];
        if (!isset($scenes_by_user[$uid])) {
            $scenes_by_user[$uid] = 0;
        }
        $scenes_by_user[$uid] += $count;
    }

    // Adiciona a contagem de cenas no array de usuários
    foreach ($users as &$user) {
        $user['is_admin'] = (int)$user['is_admin'];
        $user['scenes_count'] = $scenes_by_user[$user['id']] ?? 0;
        $user['tours_count'] = (int)$user['tours_count'];
    }

    echo json_encode([
        'success' => true,
        'users' => $users
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao listar usuários: ' . $e->getMessage()
    ]);
}
