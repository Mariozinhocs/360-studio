<?php
require_once 'config.php';

$tourId = trim($_GET['id'] ?? '');

if (empty($tourId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'O ID do tour é obrigatório.']);
    exit;
}

// RETORNAR DEMONSTRAÇÕES MOCKADAS
if ($tourId === 'demo-casa') {
    $scenes = [
        [
            'id' => 'scene-sala',
            'title' => 'Vista Externa & Jardim',
            'type' => 'image',
            'sourceUrl' => 'assets/demo/garden.jpg',
            'ambientSound' => 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
            'galleryImages' => [],
            'hotspots' => [
                [
                    'id' => 'hotspot-sala-to-suite',
                    'type' => 'portal',
                    'targetSceneId' => 'scene-suite',
                    'position' => ['x' => 4.2, 'y' => -0.8, 'z' => -2.5],
                    'label' => 'Entrar na Galeria Principal'
                ]
            ]
        ],
        [
            'id' => 'scene-suite',
            'title' => 'Galeria Principal',
            'type' => 'image',
            'sourceUrl' => 'assets/demo/livingroom.jpg',
            'ambientSound' => 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
            'galleryImages' => [],
            'hotspots' => [
                [
                    'id' => 'hotspot-suite-to-sala',
                    'type' => 'portal',
                    'targetSceneId' => 'scene-sala',
                    'position' => ['x' => -3.5, 'y' => -0.5, 'z' => 3.2],
                    'label' => 'Voltar para o Jardim'
                ]
            ]
        ]
    ];
    $floorPlan = [
        'image' => 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80',
        'radars' => [
            [
                'sceneId' => 'scene-sala',
                'x' => 40.0,
                'y' => 55.0,
                'yawOffset' => 0
            ],
            [
                'sceneId' => 'scene-suite',
                'x' => 70.0,
                'y' => 40.0,
                'yawOffset' => 90
            ]
        ]
    ];
    echo json_encode([
        'success' => true,
        'tour' => [
            'tourId' => 'demo-casa',
            'title' => 'Residência Alto Padrão (Demonstração)',
            'scenes' => $scenes,
            'floorPlan' => $floorPlan,
            'logoUrl' => ''
        ],
        'is_owner' => false,
        'show_ads' => false,
        'is_locked' => false,
        'features' => [
            'floor_plans' => true,
            'ambient_sound' => true,
            'image_gallery' => true,
            'privacy_control' => true,
            'max_logos' => 1
        ]
    ]);
    exit;
}

if ($tourId === 'demo-showroom') {
    $scenes = [
        [
            'id' => 'scene-main',
            'title' => 'Showroom Principal',
            'type' => 'image',
            'sourceUrl' => 'assets/demo/showroom.jpg',
            'ambientSound' => 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
            'galleryImages' => [
                'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80',
                'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80'
            ],
            'hotspots' => [
                [
                    'id' => 'hotspot-main-to-office',
                    'type' => 'portal',
                    'targetSceneId' => 'scene-office',
                    'position' => ['x' => 3.8, 'y' => -0.5, 'z' => -2.8],
                    'label' => 'Entrar no Escritório'
                ]
            ]
        ],
        [
            'id' => 'scene-office',
            'title' => 'Escritório de Atendimento',
            'type' => 'image',
            'sourceUrl' => 'assets/demo/office.jpg',
            'ambientSound' => 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
            'galleryImages' => [
                'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80'
            ],
            'hotspots' => [
                [
                    'id' => 'hotspot-office-to-main',
                    'type' => 'portal',
                    'targetSceneId' => 'scene-main',
                    'position' => ['x' => -3.8, 'y' => -0.5, 'z' => 2.8],
                    'label' => 'Voltar ao Showroom'
                ]
            ]
        ]
    ];
    echo json_encode([
        'success' => true,
        'tour' => [
            'tourId' => 'demo-showroom',
            'title' => 'Showroom Corporativo (Demonstração)',
            'scenes' => $scenes,
            'floorPlan' => null,
            'logoUrl' => ''
        ],
        'is_owner' => false,
        'show_ads' => false,
        'is_locked' => false,
        'features' => [
            'floor_plans' => false,
            'ambient_sound' => true,
            'image_gallery' => true,
            'privacy_control' => true,
            'max_logos' => 1
        ]
    ]);
    exit;
}

try {
    // Buscar o tour e juntar com os dados do usuário criador para validar status da assinatura e obter recursos adicionais
    $stmt = $pdo->prepare("
        SELECT t.id, t.title, t.scenes_json, t.floor_plan_json, t.logo_url, t.privacy_settings, t.user_id, u.subscription_status, u.subscription_expires_at 
        FROM " . TABLE_PREFIX . "tours t 
        JOIN " . TABLE_PREFIX . "users u ON t.user_id = u.id 
        WHERE t.id = ?
    ");
    $stmt->execute([$tourId]);
    $tour = $stmt->fetch();

    if (!$tour) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Tour não encontrado.']);
        exit;
    }

    // Verificar se o criador tem assinatura válida (apenas para exibição pública, editores já são bloqueados nos outros endpoints)
    $owner = [
        'subscription_status' => $tour['subscription_status'],
        'subscription_expires_at' => $tour['subscription_expires_at']
    ];
    
    $is_active = checkSubscription($owner);
    $is_owner = isset($_SESSION['user_id']) && $_SESSION['user_id'] == $tour['user_id'];

    if (!$is_active && !$is_owner) {
        // Se a assinatura do dono expirou e não é o dono visualizando, bloqueia exibição
        http_response_code(402); // Payment Required
        echo json_encode([
            'success' => false,
            'message' => 'Este tour virtual está temporariamente suspenso devido a pendências de assinatura.',
            'suspended' => true
        ]);
        exit;
    }

    // Obter logo_url se o criador tiver o recurso ativo
    $logoUrl = null;
    if (!empty($tour['logo_url']) && (PLANS_MATRIX[resolvePlanName($owner)]['max_logos'] ?? 0) > 0) {
        $logoUrl = $tour['logo_url'];
    }

    // Obter privacy_settings se o criador tiver o recurso ativo
    $privacySettings = null;
    if (!empty($tour['privacy_settings']) && hasFeature($owner, 'privacy_control')) {
        $privacySettings = $tour['privacy_settings'];
    }

    // Validar se o tour está bloqueado por senha
    $password_required = !empty($privacySettings);
    $has_correct_password = false;
    if ($password_required) {
        $submitted_password = isset($_GET['password']) ? trim($_GET['password']) : '';
        if ($submitted_password === $privacySettings || $is_owner) {
            $has_correct_password = true;
        }
    }

    $is_locked = $password_required && !$has_correct_password;

    // Decodifica as cenas salvas (apenas se não estiver bloqueado por senha)
    $scenes = [];
    if (!$is_locked) {
        $scenes = json_decode($tour['scenes_json'], true);
        if (!is_array($scenes)) {
            $scenes = [];
        }
    }

    // Decodifica a planta baixa se houver (apenas se não estiver bloqueado por senha e o fuso permitir)
    $floorPlan = null;
    if (!$is_locked && !empty($tour['floor_plan_json']) && hasFeature($owner, 'floor_plans')) {
        $floorPlan = json_decode($tour['floor_plan_json'], true);
    }

    $show_ads = !hasFeature($owner, 'no_ads');

    $features = [];
    if ($is_owner) {
        $plan = resolvePlanName($owner);
        $features = PLANS_MATRIX[$plan] ?? [];
    }

    echo json_encode([
        'success' => true,
        'tour' => [
            'tourId' => $tour['id'],
            'title' => $tour['title'],
            'scenes' => $scenes,
            'floorPlan' => $floorPlan,
            'logoUrl' => $logoUrl
        ],
        'is_owner' => $is_owner,
        'show_ads' => $show_ads,
        'is_locked' => $is_locked,
        'features' => $features
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno ao carregar o tour: ' . $e->getMessage()]);
}
