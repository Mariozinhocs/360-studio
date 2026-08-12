<?php
require_once __DIR__ . '/config.php';

function purgeOrphanUploads($pdo) {
    try {
        $uploadsDir = dirname(__DIR__) . '/uploads';
        if (!is_dir($uploadsDir)) {
            return ['purged' => 0, 'message' => 'Pasta uploads não encontrada.'];
        }

        // 1. Coletar todas as URLs de mídias ativas no banco de dados
        $activeFiles = [];
        
        $stmt = $pdo->query("SELECT scenes_json, floor_plan_json, logo_url FROM " . TABLE_PREFIX . "tours");
        $tours = $stmt->fetchAll();

        foreach ($tours as $t) {
            // Cenas
            $scenes = json_decode($t['scenes_json'] ?? '', true);
            if (is_array($scenes)) {
                foreach ($scenes as $s) {
                    if (!empty($s['sourceUrl'])) $activeFiles[basename($s['sourceUrl'])] = true;
                    if (!empty($s['ambientSound'])) $activeFiles[basename($s['ambientSound'])] = true;
                    if (!empty($s['galleryImages']) && is_array($s['galleryImages'])) {
                        foreach ($s['galleryImages'] as $g) {
                            $activeFiles[basename($g)] = true;
                        }
                    }
                }
            }
            // Planta Baixa
            $floorPlan = json_decode($t['floor_plan_json'] ?? '', true);
            if (is_array($floorPlan) && !empty($floorPlan['image'])) {
                $activeFiles[basename($floorPlan['image'])] = true;
            }
            // Logo
            if (!empty($t['logo_url'])) {
                $activeFiles[basename($t['logo_url'])] = true;
            }
        }

        // 2. Varrer a pasta uploads/ e apagar arquivos não referenciados com mais de 2 horas
        $purgedCount = 0;
        $files = scandir($uploadsDir);
        $now = time();
        $gracePeriod = 7200; // 2 horas de tolerância para uploads que acabaram de ser enviados

        foreach ($files as $file) {
            if ($file === '.' || $file === '..' || $file === '.htaccess' || $file === 'index.html') continue;
            
            $filePath = $uploadsDir . '/' . $file;
            if (is_file($filePath)) {
                $mtime = filemtime($filePath);
                if (($now - $mtime) > $gracePeriod) {
                    if (!isset($activeFiles[$file])) {
                        if (@unlink($filePath)) {
                            $purgedCount++;
                        }
                    }
                }
            }
        }

        return ['purged' => $purgedCount, 'message' => "Limpeza concluída. {$purgedCount} arquivo(s) órfão(s) removido(s)."];
    } catch (Exception $e) {
        return ['purged' => 0, 'message' => 'Erro na purga: ' . $e->getMessage()];
    }
}

// Se chamado diretamente por administrador
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'clean_orphans.php') {
    loginRequired();
    $stmt = $pdo->prepare("SELECT is_admin FROM " . TABLE_PREFIX . "users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $u = $stmt->fetch();
    if (!$u || (int)$u['is_admin'] < 1) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Acesso negado.']);
        exit;
    }
    
    $res = purgeOrphanUploads($pdo);
    echo json_encode(['success' => true, 'result' => $res]);
}
