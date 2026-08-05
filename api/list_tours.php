<?php
require_once 'config.php';

loginRequired();

try {
    // Buscar todos os tours do usuário logado
    $stmt = $pdo->prepare("SELECT id, title, created_at, updated_at, scenes_json FROM " . TABLE_PREFIX . "tours WHERE user_id = ? ORDER BY updated_at DESC");
    $stmt->execute([$_SESSION['user_id']]);
    $tours = $stmt->fetchAll();

    // Processar para retornar dados limpos com quantidade de cenas
    $result = [];
    foreach ($tours as $tour) {
        $scenes = json_decode($tour['scenes_json'], true);
        $scenes_count = is_array($scenes) ? count($scenes) : 0;
        
        // Pega a imagem de miniatura da primeira cena se existir
        $thumb = null;
        if (is_array($scenes) && count($scenes) > 0) {
            $firstScene = $scenes[0];
            if ($firstScene['type'] === 'image') {
                $thumb = $firstScene['sourceUrl'];
            }
        }

        $result[] = [
            'id' => $tour['id'],
            'title' => $tour['title'],
            'scenes_count' => $scenes_count,
            'thumbnail' => $thumb,
            'created_at' => $tour['created_at'],
            'updated_at' => $tour['updated_at']
        ];
    }

    echo json_encode([
        'success' => true,
        'tours' => $result
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno ao listar tours: ' . $e->getMessage()]);
}
