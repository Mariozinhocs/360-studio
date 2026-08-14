<?php
require_once __DIR__ . '/admin_helper.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['title']) || empty($input['content'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Título e conteúdo são obrigatórios.']);
    exit;
}

$json_file = dirname(dirname(__DIR__)) . '/api/blog_posts.json';

// Ler posts existentes
$posts = [];
if (file_exists($json_file)) {
    $posts = json_decode(file_get_contents($json_file), true) ?: [];
}

// Preparar post
$id = trim($input['id'] ?? '');
if (empty($id)) {
    // Gerar slug a partir do título
    $id = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $input['title'])));
    $id = trim($id, '-');
}

$post_data = [
    'id' => $id,
    'title' => trim($input['title']),
    'excerpt' => trim($input['excerpt'] ?? ''),
    'content' => $input['content'], // pode conter HTML
    'date' => trim($input['date'] ?? date('d de F de Y')),
    'author' => trim($input['author'] ?? 'Administrador'),
    'cover' => trim($input['cover'] ?? 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'),
    'readTime' => trim($input['readTime'] ?? '5 min de leitura')
];

// Atualizar ou Inserir
$existing_index = -1;
foreach ($posts as $idx => $p) {
    if ($p['id'] === $id) {
        $existing_index = $idx;
        break;
    }
}

if ($existing_index >= 0) {
    $posts[$existing_index] = $post_data;
} else {
    // Inserir no topo (mais recente)
    array_unshift($posts, $post_data);
}

// Salvar no JSON
if (file_put_contents($json_file, json_encode($posts, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
    echo json_encode(['success' => true, 'message' => 'Artigo salvo com sucesso!', 'id' => $id]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Falha ao salvar no arquivo de posts.']);
}
