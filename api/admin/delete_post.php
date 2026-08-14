<?php
require_once __DIR__ . '/admin_helper.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$id = trim($input['id'] ?? '');

if (empty($id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID do post é obrigatório.']);
    exit;
}

$json_file = dirname(dirname(__DIR__)) . '/api/blog_posts.json';

if (!file_exists($json_file)) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Arquivo de posts não encontrado.']);
    exit;
}

$posts = json_decode(file_get_contents($json_file), true) ?: [];
$initial_count = count($posts);

// Filtrar fora o deletado
$posts = array_values(array_filter($posts, function($p) use ($id) {
    return $p['id'] !== $id;
}));

if (count($posts) === $initial_count) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Artigo não encontrado.']);
    exit;
}

// Salvar
if (file_put_contents($json_file, json_encode($posts, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
    echo json_encode(['success' => true, 'message' => 'Artigo excluído com sucesso!']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Falha ao salvar arquivo após exclusão.']);
}
