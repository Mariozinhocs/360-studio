<?php
require_once 'config.php';

loginRequired();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

// Obter dados do POST
$data = json_decode(file_get_contents('php://input'), true);
$tourId = trim($data['id'] ?? '');

if (empty($tourId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'O ID do tour é obrigatório.']);
    exit;
}

try {
    // Verificar se o tour existe e pertence ao usuário e obter as cenas
    $stmt = $pdo->prepare("SELECT scenes_json FROM " . TABLE_PREFIX . "tours WHERE id = ? AND user_id = ?");
    $stmt->execute([$tourId, $_SESSION['user_id']]);
    $tour = $stmt->fetch();

    if (!$tour) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Tour não encontrado ou você não tem permissão para excluí-lo.']);
        exit;
    }

    // Deletar fisicamente todas as mídias associadas ao tour
    $scenes = json_decode($tour['scenes_json'], true);
    if (is_array($scenes)) {
        foreach ($scenes as $scene) {
            if (isset($scene['sourceUrl']) && !empty($scene['sourceUrl'])) {
                $url = $scene['sourceUrl'];
                if (strpos($url, 'uploads/') === 0) {
                    $file_path = dirname(__DIR__) . '/' . $url;
                    $real_path = realpath($file_path);
                    $uploads_dir = realpath(dirname(__DIR__) . '/uploads');
                    
                    if ($real_path && strpos($real_path, $uploads_dir) === 0 && file_exists($real_path)) {
                        unlink($real_path);
                    }
                }
            }
        }
    }

    // Deletar o tour
    $delete = $pdo->prepare("DELETE FROM " . TABLE_PREFIX . "tours WHERE id = ? AND user_id = ?");
    $delete->execute([$tourId, $_SESSION['user_id']]);

    echo json_encode([
        'success' => true,
        'message' => 'Tour excluído com sucesso!'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno ao excluir o tour: ' . $e->getMessage()]);
}
