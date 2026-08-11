<?php
require_once 'config.php';

loginRequired();

// Verificar assinatura
$stmt = $pdo->prepare("SELECT subscription_status, subscription_expires_at FROM " . TABLE_PREFIX . "users WHERE id = ?");
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch();

if (!$user || !checkSubscription($user)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Assinatura inválida ou expirada. Regularize para poder fazer upload de arquivos.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

if (!isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nenhum arquivo enviado.']);
    exit;
}

$file = $_FILES['file'];

// Verificar erros de upload
if ($file['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Erro no upload: Código ' . $file['error']]);
    exit;
}

// Extensões permitidas
$allowed_extensions = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'mp4'];
$file_info = pathinfo($file['name']);
$extension = strtolower($file_info['extension'] ?? '');

if (!in_array($extension, $allowed_extensions)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Formato não permitido. Envie apenas JPG, JPEG, PNG, WEBP, AVIF ou MP4.']);
    exit;
}

// Tipos MIME permitidos
$allowed_mimes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/x-webp', 'video/mp4'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime_type = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mime_type, $allowed_mimes)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Tipo MIME inválido. Formato detectado: ' . $mime_type]);
    exit;
}

// Limitar tamanho dos arquivos (Fotos: 15MB, Vídeos: 60MB)
$max_image_size = 15 * 1024 * 1024; // 15MB
$max_video_size = 60 * 1024 * 1024; // 60MB

$is_video = strpos($mime_type, 'video/') === 0;
$max_allowed_size = $is_video ? $max_video_size : $max_image_size;

if ($file['size'] > $max_allowed_size) {
    http_response_code(400);
    $limit_mb = $is_video ? '60MB' : '15MB';
    echo json_encode(['success' => false, 'message' => 'O arquivo excede o limite máximo permitido de ' . $limit_mb . ' para ' . ($is_video ? 'vídeos' : 'imagens') . '.']);
    exit;
}

// Validar dimensões da imagem (Máximo 8K = 8192px largura ou altura)
if (!$is_video) {
    $width = 0;
    $height = 0;
    $dimensions = @getimagesize($file['tmp_name']);
    
    if ($dimensions !== false && isset($dimensions[0], $dimensions[1])) {
        $width = (int)$dimensions[0];
        $height = (int)$dimensions[1];
    } elseif ($extension === 'webp' && function_exists('imagecreatefromwebp')) {
        $img = @imagecreatefromwebp($file['tmp_name']);
        if ($img) {
            $width = imagesx($img);
            $height = imagesy($img);
            imagedestroy($img);
        }
    } elseif ($extension === 'avif' && function_exists('imagecreatefromavif')) {
        $img = @imagecreatefromavif($file['tmp_name']);
        if ($img) {
            $width = imagesx($img);
            $height = imagesy($img);
            imagedestroy($img);
        }
    }

    $max_dimension = 8192;
    if ($width > 0 && $height > 0) {
        if ($width > $max_dimension || $height > $max_dimension) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => "As dimensões da imagem ({$width}x{$height}) excedem o limite máximo de {$max_dimension}x{$max_dimension} pixels."
            ]);
            exit;
        }
    }
}

// Criar pasta de uploads se não existir
$upload_dir = dirname(__DIR__) . '/uploads';
if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0755, true);
}

// Nome único do arquivo
$new_filename = 'media_360_' . uniqid() . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
$destination = $upload_dir . '/' . $new_filename;

if (move_uploaded_file($file['tmp_name'], $destination)) {
    echo json_encode([
        'success' => true,
        'message' => 'Upload concluído com sucesso!',
        'url' => 'uploads/' . $new_filename
    ]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Falha ao salvar o arquivo no servidor.']);
}
