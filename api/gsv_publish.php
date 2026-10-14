<?php
require_once 'config.php';

loginRequired();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$tourId = trim($input['tourId'] ?? '');
$latitude = floatval($input['latitude'] ?? 0);
$longitude = floatval($input['longitude'] ?? 0);
$placeId = trim($input['placeId'] ?? '');

if (empty($tourId)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID do tour não informado.']);
    exit;
}

$accessToken = $_SESSION['gsv_access_token'] ?? null;
if (empty($accessToken)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Sua conta Google não está conectada ao 360° Studio. Por favor, conecte antes de publicar.']);
    exit;
}

// Validar plano e cota do usuário
$user = getCurrentUser($pdo);
$plan = resolvePlanName($user);
$gsvLimit = PLANS_MATRIX[$plan]['gsv_projects_per_month'] ?? 0;

if ($gsvLimit === 0) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'O recurso de publicação no Google Street View necessita do plano Básico, Pessoal ou Profissional.']);
    exit;
}

try {
    // Buscar o tour
    $stmt = $pdo->prepare("SELECT id, title, scenes_json FROM " . TABLE_PREFIX . "tours WHERE id = ? AND user_id = ?");
    $stmt->execute([$tourId, $_SESSION['user_id']]);
    $tour = $stmt->fetch();

    if (!$tour) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Tour não encontrado.']);
        exit;
    }

    $scenes = json_decode($tour['scenes_json'], true);
    if (!is_array($scenes) || count($scenes) === 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'O tour precisa ter pelo menos 1 cena 360° carregada para publicação.']);
        exit;
    }

    $publishedPhotos = [];
    $scenePhotoMap = []; // Mapeia id da cena local para photoId retornado pelo Google

    // Passo 1 a 3: Upload de cada foto 360°
    foreach ($scenes as $index => $scene) {
        $sourceUrl = $scene['sourceUrl'] ?? '';
        if (empty($sourceUrl)) continue;

        // 1. Iniciar Upload no Google Street View API
        $ch = curl_init('https://streetviewpublish.googleapis.com/v1/photo:startUpload');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $accessToken,
                'Content-Length: 0'
            ],
            CURLOPT_RETURNTRANSFER => true
        ]);
        $uploadResp = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao iniciar upload no Google API (Código HTTP ' . $httpCode . ').']);
            exit;
        }

        $uploadData = json_decode($uploadResp, true);
        $uploadUrl = $uploadData['uploadUrl'] ?? '';
        if (empty($uploadUrl)) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Não foi possível obter URL de upload do Google Street View.']);
            exit;
        }

        // 2. Carregar o arquivo local ou via URL e enviar os bytes
        $imagePath = dirname(__DIR__) . '/' . ltrim($sourceUrl, '/');
        $imgData = null;
        if (file_exists($imagePath)) {
            $imgData = file_get_contents($imagePath);
        } else {
            $imgData = @file_get_contents($sourceUrl);
        }

        if (empty($imgData)) {
            continue; // Pula se arquivo não for localizado
        }

        // Enviar os bytes brutos para o Google Upload URL
        $chUpload = curl_init($uploadUrl);
        curl_setopt_array($chUpload, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $accessToken,
                'Content-Type: image/jpeg'
            ],
            CURLOPT_POSTFIELDS => $imgData,
            CURLOPT_RETURNTRANSFER => true
        ]);
        $upResult = curl_exec($chUpload);
        curl_close($chUpload);

        // 3. Criar a foto com metadados (Pose, Coordenadas e Heading)
        $heading = floatval($scene['initialYaw'] ?? 0);
        $photoPayload = [
            'uploadReference' => [
                'uploadUrl' => $uploadUrl
            ],
            'pose' => [
                'heading' => $heading,
                'pitch' => 0.0,
                'roll' => 0.0,
                'latLngPair' => [
                    'latitude' => $latitude !== 0.0 ? $latitude : -23.550520,
                    'longitude' => $longitude !== 0.0 ? $longitude : -46.633308
                ]
            ]
        ];

        if (!empty($placeId)) {
            $photoPayload['places'] = [
                ['placeId' => $placeId]
            ];
        }

        $chCreate = curl_init('https://streetviewpublish.googleapis.com/v1/photo');
        curl_setopt_array($chCreate, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $accessToken,
                'Content-Type: application/json'
            ],
            CURLOPT_POSTFIELDS => json_encode($photoPayload),
            CURLOPT_RETURNTRANSFER => true
        ]);
        $createResp = curl_exec($chCreate);
        $createCode = curl_getinfo($chCreate, CURLINFO_HTTP_CODE);
        curl_close($chCreate);

        $createdPhoto = json_decode($createResp, true);
        $photoId = $createdPhoto['photoId']['id'] ?? '';

        if (!empty($photoId)) {
            $scenePhotoMap[$scene['id']] = $photoId;
            $publishedPhotos[] = [
                'sceneId' => $scene['id'],
                'sceneTitle' => $scene['title'] ?? 'Cena 360',
                'photoId' => $photoId,
                'mapsUrl' => "https://www.google.com/maps/@?api=1&map_action=pano&pano=" . $photoId
            ];
        }
    }

    // Passo 4: Criar conexões de portais entre as fotos no GSV (se houver mais de 1 cena com portais)
    if (count($publishedPhotos) > 1) {
        $updateRequests = [];
        foreach ($scenes as $scene) {
            $sourcePhotoId = $scenePhotoMap[$scene['id']] ?? null;
            if (!$sourcePhotoId || empty($scene['hotspots'])) continue;

            $connections = [];
            foreach ($scene['hotspots'] as $hotspot) {
                if (($hotspot['type'] ?? '') === 'portal' && !empty($hotspot['targetSceneId'])) {
                    $targetPhotoId = $scenePhotoMap[$hotspot['targetSceneId']] ?? null;
                    if ($targetPhotoId) {
                        $connections[] = [
                            'target' => [
                                'id' => $targetPhotoId
                            ]
                        ];
                    }
                }
            }

            if (count($connections) > 0) {
                $updateRequests[] = [
                    'updatePhotoRequest' => [
                        'photo' => [
                            'photoId' => ['id' => $sourcePhotoId],
                            'connections' => $connections
                        ],
                        'updateMask' => 'connections'
                    ]
                ];
            }
        }

        if (count($updateRequests) > 0) {
            $chBatch = curl_init('https://streetviewpublish.googleapis.com/v1/photos:batchUpdate');
            curl_setopt_array($chBatch, [
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => [
                    'Authorization: Bearer ' . $accessToken,
                    'Content-Type: application/json'
                ],
                CURLOPT_POSTFIELDS => json_encode(['updatePhotoRequests' => $updateRequests]),
                CURLOPT_RETURNTRANSFER => true
            ]);
            curl_exec($chBatch);
            curl_close($chBatch);
        }
    }

    echo json_encode([
        'success' => true,
        'message' => 'Tour publicado com sucesso no Google Street View!',
        'count' => count($publishedPhotos),
        'publishedPhotos' => $publishedPhotos
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno ao publicar no Google Street View: ' . $e->getMessage()]);
}
