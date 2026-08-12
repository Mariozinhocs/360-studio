<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$email = trim($data['email'] ?? '');

if (empty($email)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'O e-mail é obrigatório.']);
    exit;
}

try {
    // Buscar usuário por email
    $stmt = $pdo->prepare("SELECT id, name, email FROM " . TABLE_PREFIX . "users WHERE email = ? AND deleted_at IS NULL");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    // Por questões de segurança, sempre responder "sucesso" para evitar enumeração de e-mails, 
    // mas só gerar token e enviar de fato se o usuário existir.
    if ($user) {
        // Gerar token de redefinição
        $token = bin2hex(random_bytes(16));
        $expires = date('Y-m-d H:i:s', time() + 3600); // 1 hora de validade

        // Salvar token e expiração
        $stmtUpdate = $pdo->prepare("UPDATE " . TABLE_PREFIX . "users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?");
        $stmtUpdate->execute([$token, $expires, $user['id']]);

        // Determinar protocolo e host dinamicamente para o link
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https" : "http";
        $host = $_SERVER['HTTP_HOST'];
        
        // Caminho relativo para a página de login
        $script_dir = dirname($_SERVER['SCRIPT_NAME']); // ex: /api ou /hml/api
        $base_dir = dirname($script_dir); // ex: / ou /hml
        if ($base_dir === DIRECTORY_SEPARATOR || $base_dir === '\\') {
            $base_dir = '';
        }
        $reset_url = "{$protocol}://{$host}{$base_dir}/login.html?token={$token}";

        // Simular envio de e-mail usando a função mail do PHP
        $to = $user['email'];
        $subject = "Recuperação de Senha - 360° Studio";
        $headers = "From: no-reply@360studio.com\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";

        $message = "
        <html>
        <head>
          <title>Recuperação de Senha - 360° Studio</title>
        </head>
        <body style='font-family: Arial, sans-serif; background-color: #0e0f14; color: #ffffff; padding: 20px;'>
          <div style='max-width: 600px; margin: 0 auto; background: #16171f; padding: 30px; border-radius: 8px; border: 1px solid #272936;'>
            <h2 style='color: #00f2fe;'>Olá, {$user['name']}!</h2>
            <p>Recebemos uma solicitação de redefinição de senha para sua conta no 360° Studio.</p>
            <p>Para prosseguir, clique no botão abaixo para definir uma nova senha:</p>
            <p style='text-align: center; margin: 30px 0;'>
              <a href='{$reset_url}' style='background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%); color: #0a0b0e; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;'>Redefinir Minha Senha</a>
            </p>
            <p style='font-size: 12px; color: #8a8d9a;'>Este link é válido por 1 hora. Se você não solicitou a recuperação, pode ignorar este e-mail.</p>
            <hr style='border: 0; border-top: 1px solid #272936; margin: 20px 0;'>
            <p style='font-size: 11px; color: #626470;'>Criado com 360° Studio</p>
          </div>
        </body>
        </html>
        ";

        @mail($to, $subject, $message, $headers);

        // Resposta contendo o link de debug no MVP/HML para testes rápidos do PO
        echo json_encode([
            'success' => true,
            'message' => 'Se o e-mail informado estiver cadastrado, você receberá um link de recuperação.',
            'debug_link' => "login.html?token={$token}"
        ]);
    } else {
        // Retorna a mesma mensagem genérica por segurança
        echo json_encode([
            'success' => true,
            'message' => 'Se o e-mail informado estiver cadastrado, você receberá um link de recuperação.'
        ]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro interno ao processar recuperação de senha: ' . $e->getMessage()
    ]);
}
