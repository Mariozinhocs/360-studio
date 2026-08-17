<?php
require_once 'admin_helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

// Apenas Super Admin (is_admin = 2) pode editar a configuração dos planos
if (!isSuperAdmin()) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Acesso negado. Apenas Super Administradores podem atualizar planos e limites.']);
    exit;
}

// Obter dados do POST
$data = json_decode(file_get_contents('php://input'), true);

$id = isset($data['id']) ? (int)$data['id'] : 0;
$plan_key = isset($data['plan_key']) ? trim($data['plan_key']) : '';
$name = isset($data['name']) ? trim($data['name']) : '';
$price_monthly = isset($data['price_monthly']) ? (float)$data['price_monthly'] : 0.00;
$price_yearly = isset($data['price_yearly']) ? (float)$data['price_yearly'] : 0.00;
$max_tours = isset($data['max_tours']) ? (int)$data['max_tours'] : 0;
$max_scenes = isset($data['max_scenes']) ? (int)$data['max_scenes'] : 0;
$gsv_projects_per_month = isset($data['gsv_projects_per_month']) ? (int)$data['gsv_projects_per_month'] : 0;
$max_logos = isset($data['max_logos']) ? (int)$data['max_logos'] : 0;

$navigation_arrows = !empty($data['navigation_arrows']) ? 1 : 0;
$no_ads = !empty($data['no_ads']) ? 1 : 0;
$privacy_control = !empty($data['privacy_control']) ? 1 : 0;
$offline_access = !empty($data['offline_access']) ? 1 : 0;
$ambient_sound = !empty($data['ambient_sound']) ? 1 : 0;
$image_gallery = !empty($data['image_gallery']) ? 1 : 0;
$floor_plans = !empty($data['floor_plans']) ? 1 : 0;
$text_markers = !empty($data['text_markers']) ? 1 : 0;
$nadir_patch = !empty($data['nadir_patch']) ? 1 : 0;
$rich_hotspots = !empty($data['rich_hotspots']) ? 1 : 0;

if (empty($name)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Parâmetros inválidos. O nome do plano é obrigatório.']);
    exit;
}

if ($id === 0 && empty($plan_key)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Parâmetros inválidos. O identificador (chave) do plano é obrigatório para novos planos.']);
    exit;
}

try {
    if ($id === 0) {
        // Verificar se a chave do plano já existe
        $stmtCheckKey = $pdo->prepare("SELECT id FROM `" . TABLE_PREFIX . "plans` WHERE plan_key = ?");
        $stmtCheckKey->execute([$plan_key]);
        if ($stmtCheckKey->fetch()) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'O Identificador (Chave) do plano já existe.']);
            exit;
        }

        // Inserir novo plano no banco
        $stmtInsert = $pdo->prepare("INSERT INTO `" . TABLE_PREFIX . "plans` 
            (plan_key, name, price_monthly, price_yearly, max_tours, max_scenes, 
             gsv_projects_per_month, max_logos, navigation_arrows, no_ads, 
             privacy_control, offline_access, ambient_sound, image_gallery, 
             floor_plans, text_markers, nadir_patch, rich_hotspots)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        $stmtInsert->execute([
            $plan_key, $name, $price_monthly, $price_yearly, $max_tours, $max_scenes,
            $gsv_projects_per_month, $max_logos, $navigation_arrows, $no_ads,
            $privacy_control, $offline_access, $ambient_sound, $image_gallery,
            $floor_plans, $text_markers, $nadir_patch, $rich_hotspots
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Plano comercial criado com sucesso!'
        ]);
        exit;
    } else {
        // Verificar se o plano existe
        $stmtCheck = $pdo->prepare("SELECT id FROM `" . TABLE_PREFIX . "plans` WHERE id = ?");
        $stmtCheck->execute([$id]);
        if (!$stmtCheck->fetch()) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Plano não encontrado.']);
            exit;
        }

        // Atualizar no banco
        $stmtUpdate = $pdo->prepare("UPDATE `" . TABLE_PREFIX . "plans` 
            SET name = ?, price_monthly = ?, price_yearly = ?, max_tours = ?, max_scenes = ?, 
                gsv_projects_per_month = ?, max_logos = ?, navigation_arrows = ?, no_ads = ?, 
                privacy_control = ?, offline_access = ?, ambient_sound = ?, image_gallery = ?, 
                floor_plans = ?, text_markers = ?, nadir_patch = ?, rich_hotspots = ?
            WHERE id = ?");
        
        $stmtUpdate->execute([
            $name, $price_monthly, $price_yearly, $max_tours, $max_scenes,
            $gsv_projects_per_month, $max_logos, $navigation_arrows, $no_ads,
            $privacy_control, $offline_access, $ambient_sound, $image_gallery,
            $floor_plans, $text_markers, $nadir_patch, $rich_hotspots,
            $id
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Plano e recursos comerciais atualizados com sucesso!'
        ]);
        exit;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao processar plano: ' . $e->getMessage()
    ]);
}
