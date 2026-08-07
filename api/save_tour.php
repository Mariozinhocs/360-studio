<?php
require_once 'config.php';

loginRequired();

// Verificar assinatura
$stmt = $pdo->prepare("SELECT subscription_status, subscription_expires_at FROM " . TABLE_PREFIX . "users WHERE id = ?");
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch();

if (!$user || !checkSubscription($user)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Assinatura inválida ou expirada. Assine o Premium para salvar suas alterações.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

// Obter JSON do payload
$data = json_decode(file_get_contents('php://input'), true);

$tourId = trim($data['tourId'] ?? '');
$title = trim($data['title'] ?? '');
$scenes = $data['scenes'] ?? null;
$floorPlan = $data['floorPlan'] ?? null;

if (empty($tourId) || empty($title) || $scenes === null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Dados incompletos para salvamento.']);
    exit;
}

try {
    // Verificar se o tour existe e pertence ao usuário, e obter as cenas atuais
    $stmt = $pdo->prepare("SELECT scenes_json, floor_plan_json FROM " . TABLE_PREFIX . "tours WHERE id = ? AND user_id = ?");
    $stmt->execute([$tourId, $_SESSION['user_id']]);
    $existingTour = $stmt->fetch();

    if (!$existingTour) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Tour não encontrado ou você não tem permissão para editá-lo.']);
        exit;
    }

    // Identificar e apagar fisicamente arquivos de mídias deletadas
    $old_scenes = json_decode($existingTour['scenes_json'], true);
    if (is_array($old_scenes)) {
        $new_files = [];
        if (is_array($scenes)) {
            foreach ($scenes as $scene) {
                if (isset($scene['sourceUrl']) && !empty($scene['sourceUrl'])) {
                    $new_files[] = $scene['sourceUrl'];
                }
            }
        }

        foreach ($old_scenes as $old_scene) {
            if (isset($old_scene['sourceUrl']) && !empty($old_scene['sourceUrl'])) {
                $old_url = $old_scene['sourceUrl'];
                
                // Se a mídia antiga não está na nova lista, remove do disco
                if (!in_array($old_url, $new_files)) {
                    if (strpos($old_url, 'uploads/') === 0) {
                        $file_path = dirname(__DIR__) . '/' . $old_url;
                        $real_path = realpath($file_path);
                        $uploads_dir = realpath(dirname(__DIR__) . '/uploads');
                        
                        // Garante que o arquivo está na pasta de uploads e previne path traversal
                        if ($real_path && strpos($real_path, $uploads_dir) === 0 && file_exists($real_path)) {
                            unlink($real_path);
                        }
                    }
                }
            }
        }
    }

    // Limpeza física de imagem de planta baixa antiga
    $old_floor_plan = json_decode($existingTour['floor_plan_json'] ?? '', true);
    $old_floor_plan_image = $old_floor_plan['image'] ?? '';
    $new_floor_plan_image = $floorPlan['image'] ?? '';

    if (!empty($old_floor_plan_image) && $old_floor_plan_image !== $new_floor_plan_image) {
        if (strpos($old_floor_plan_image, 'uploads/') === 0) {
            $file_path = dirname(__DIR__) . '/' . $old_floor_plan_image;
            $real_path = realpath($file_path);
            $uploads_dir = realpath(dirname(__DIR__) . '/uploads');
            
            if ($real_path && strpos($real_path, $uploads_dir) === 0 && file_exists($real_path)) {
                unlink($real_path);
            }
        }
    }

    $scenes_json = json_encode($scenes);
    $floor_plan_json = $floorPlan !== null ? json_encode($floorPlan) : null;

    // Atualizar no banco
    $update = $pdo->prepare("UPDATE " . TABLE_PREFIX . "tours SET title = ?, scenes_json = ?, floor_plan_json = ? WHERE id = ? AND user_id = ?");
    $update->execute([$title, $scenes_json, $floor_plan_json, $tourId, $_SESSION['user_id']]);

    echo json_encode([
        'success' => true,
        'message' => 'Configurações salvas no servidor com sucesso!'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno ao salvar o tour: ' . $e->getMessage()]);
}
