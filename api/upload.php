<?php
require_once 'config.php';

loginRequired();

// Verificar assinatura e privilégios do usuário
$stmt = $pdo->prepare("SELECT subscription_status, subscription_expires_at, is_admin FROM " . TABLE_PREFIX . "users WHERE id = ?");
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

// Recursos avançados de conversão (.insp e .dng) liberados para Administradores
$isAdmin = (int)($user['is_admin'] ?? 0) >= 1;
if ($isAdmin) {
    $allowed_extensions[] = 'insp';
    $allowed_extensions[] = 'dng';
}

$file_info = pathinfo($file['name']);
$extension = strtolower($file_info['extension'] ?? '');

if (!in_array($extension, $allowed_extensions)) {
    http_response_code(400);
    $extra_msg = $isAdmin ? '' : ' (Nota: Upload de .insp/.dng é exclusivo para administradores).';
    echo json_encode(['success' => false, 'message' => 'Formato não permitido. Envie apenas JPG, JPEG, PNG, WEBP, AVIF ou MP4.' . $extra_msg]);
    exit;
}

// Tipos MIME e Assinaturas Binárias
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime_type = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

$fp = @fopen($file['tmp_name'], 'rb');
$header = $fp ? fread($fp, 32) : '';
if ($fp) fclose($fp);

$isValidMime = false;
$target_extension = $extension; // Extensão final do arquivo no servidor

// 1. JPEG: \xFF\xD8\xFF
if (in_array($extension, ['jpg', 'jpeg']) && (
    $mime_type === 'image/jpeg' || 
    (strlen($header) >= 3 && substr($header, 0, 3) === "\xFF\xD8\xFF")
)) {
    $isValidMime = true;
    $mime_type = 'image/jpeg';
}
// 1b. Insta360 Photo (.insp) - Tratado e convertido como JPEG
elseif ($extension === 'insp' && (
    $mime_type === 'image/jpeg' || 
    in_array($mime_type, ['application/octet-stream', 'image/x-insp']) ||
    (strlen($header) >= 3 && substr($header, 0, 3) === "\xFF\xD8\xFF")
)) {
    $isValidMime = true;
    $mime_type = 'image/jpeg';
    $target_extension = 'jpg'; // Salva como .jpg para compatibilidade total no navegador
}
// 1c. Adobe Digital Negative (.dng) - Convertido para JPEG
elseif ($extension === 'dng' && (
    in_array($mime_type, ['image/x-adobe-dng', 'image/tiff', 'application/octet-stream', 'image/dng']) ||
    (strlen($header) >= 4 && (substr($header, 0, 4) === "II*\x00" || substr($header, 0, 4) === "MM\x00*"))
)) {
    $isValidMime = true;
    $mime_type = 'image/x-adobe-dng';
    $target_extension = 'jpg'; // Salva como .jpg
}
// 2. PNG: \x89PNG\r\n\x1a\n
elseif ($extension === 'png' && (
    $mime_type === 'image/png' || 
    (strlen($header) >= 8 && substr($header, 0, 8) === "\x89PNG\r\n\x1a\n")
)) {
    $isValidMime = true;
    $mime_type = 'image/png';
}
// 3. WEBP: RIFF....WEBP
elseif ($extension === 'webp' && (
    in_array($mime_type, ['image/webp', 'image/x-webp', 'application/octet-stream']) ||
    (strlen($header) >= 12 && substr($header, 0, 4) === 'RIFF' && substr($header, 8, 4) === 'WEBP')
)) {
    $isValidMime = true;
    $mime_type = 'image/webp';
}
// 4. AVIF: ftypavif, ftypavis, ftypmif1, ftypmsf1, etc.
elseif ($extension === 'avif' && (
    in_array($mime_type, ['image/avif', 'image/x-avif', 'image/heif', 'image/heic', 'video/mp4', 'video/quicktime', 'application/octet-stream']) ||
    (strlen($header) >= 12 && substr($header, 4, 4) === 'ftyp' && (
        substr($header, 8, 4) === 'avif' || 
        substr($header, 8, 4) === 'avis' || 
        substr($header, 8, 4) === 'mif1' || 
        substr($header, 8, 4) === 'msf1' ||
        substr($header, 8, 4) === 'MA1B' ||
        substr($header, 8, 4) === 'MA1A'
    ))
)) {
    $isValidMime = true;
    $mime_type = 'image/avif';
}
// 5. MP4: ftyp in first 16 bytes
elseif ($extension === 'mp4' && (
    in_array($mime_type, ['video/mp4', 'video/quicktime', 'application/octet-stream']) ||
    (strlen($header) >= 8 && substr($header, 4, 4) === 'ftyp')
)) {
    $isValidMime = true;
    $mime_type = 'video/mp4';
}
// Fallback whitelist
elseif (in_array($mime_type, ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/x-webp', 'image/x-avif', 'video/mp4'])) {
    $isValidMime = true;
}

if (!$isValidMime) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Tipo MIME inválido. Formato detectado: ' . $mime_type . ' (extensão: ' . $extension . ')']);
    exit;
}

// Limitar tamanho dos arquivos (Fotos: 15MB, Vídeos: 60MB)
$max_image_size = 15 * 1024 * 1024; // 15MB
$max_video_size = 60 * 1024 * 1024; // 60MB

$is_video = ($extension === 'mp4' || $mime_type === 'video/mp4');
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

// Nome único do arquivo (utiliza $target_extension para converter e salvar .insp/.dng como .jpg)
$new_filename = 'media_360_' . uniqid() . '_' . bin2hex(random_bytes(4)) . '.' . $target_extension;
$destination = $upload_dir . '/' . $new_filename;

$uploadSuccess = false;

if ($extension === 'dng') {
    // 1. Tentar conversão via Imagick (se disponível no PHP da Hospedagem)
    if (class_exists('Imagick')) {
        try {
            $imagick = new Imagick();
            $imagick->readImage($file['tmp_name']);
            $imagick->setImageFormat('jpeg');
            $imagick->setImageCompressionQuality(92);
            $imagick->writeImage($destination);
            $imagick->clear();
            $imagick->destroy();
            $uploadSuccess = true;
        } catch (Exception $e) {
            $uploadSuccess = false;
        }
    }
    
    // 2. Fallback: Tentar extrair preview/thumbnail JPEG nativo embutido no DNG
    if (!$uploadSuccess) {
        $jpegPreview = @exif_thumbnail($file['tmp_name']);
        if ($jpegPreview !== false) {
            file_put_contents($destination, $jpegPreview);
            $uploadSuccess = true;
        } else {
            // 3. Fallback: Tentar carregar string no GD
            $gdImg = @imagecreatefromstring(file_get_contents($file['tmp_name']));
            if ($gdImg !== false) {
                imagejpeg($gdImg, $destination, 92);
                imagedestroy($gdImg);
                $uploadSuccess = true;
            }
        }
    }
    
    if (!$uploadSuccess) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Não foi possível converter o arquivo RAW (.dng) no servidor. Recomendamos exportá-lo como JPG no Insta360 Studio ou Lightroom antes do upload.'
        ]);
        exit;
    }
} else {
    // Para .insp (que já é JPEG interno), .jpg, .png, .webp, .avif, .mp4
    $uploadSuccess = move_uploaded_file($file['tmp_name'], $destination);
}

if ($uploadSuccess) {
    echo json_encode([
        'success' => true,
        'message' => 'Upload ' . ($extension !== $target_extension ? "e conversão de .{$extension} " : '') . 'concluídos com sucesso!',
        'url' => 'uploads/' . $new_filename
    ]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Falha ao salvar o arquivo no servidor.']);
}
