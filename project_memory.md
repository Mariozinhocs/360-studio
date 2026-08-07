# Memória do Projeto: Painel Administrativo 360° Studio (Ações em Lote e Lixeira)

## 📌 Status Atual do Desenvolvimento

1.  **Exclusão Lógica e Lixeira (Funcional e Implantada em HML):**
    *   O campo `deleted_at DATETIME NULL DEFAULT NULL` foi criado e integrado na tabela de usuários.
    *   A coluna `is_admin` foi alterada de `TINYINT(1)` para `TINYINT` puro no MySQL (através do `db_installer.php`), corrigindo em definitivo o bug do Super Admin que tinha privilégios corrompidos devido à conversão booleana do PHP/driver.
    *   **Backend de Segurança:** APIs de login (`login.php` e `check_auth.php`) invalidam e bloqueiam logins/sessões de usuários ativos cuja conta esteja na lixeira (`deleted_at IS NOT NULL`).
    *   **Purga Automática:** Limpeza silenciosa integrada ao carregar o painel (`admin_helper.php`) que apaga fisicamente usuários inativos na lixeira há mais de 30 dias.
    *   **API Dupla de Deletion/Restoration:**
        *   `delete_user.php` e `bulk_delete.php` executam Soft Delete na primeira tentativa e Hard Delete (definitivo) se o usuário já estiver na lixeira.
        *   Corrigido bug na API `bulk_delete.php` (ausência de um bloco `try {` causava erro de sintaxe 500 ao tentar excluir usuários em lote).
        *   `restore_user.php` permite restaurar usuários selecionados individualmente ou em lote (redefinindo `deleted_at = NULL`).

2.  **Interface Administrativa e Painel do Usuário (Dinâmica e Atualizada):**
    *   Adicionado o filtro de visualização "Excluídos (Lixeira)" no menu suspenso de status.
    *   Quando a lixeira é selecionada:
        *   Os botões mudam dinamicamente para **Restaurar** (roxo) e **Excluir Definitivamente** (rosa).
        *   A barra de lote oculta "Editar em Lote", exibe "Restaurar em Lote" (roxo) e muda o rótulo de exclusão para "Excluir Definitivamente" com confirmações graves de perda de dados.
    *   Corrigida a tipagem estrita no `admin.js` (`parseInt()` nos IDs) que causava mau funcionamento de exclusão para contas comuns.
    *   Aplicado cache-buster `v=1.0.2` no `admin.html` para `admin.js` e `admin.css`.
    *   Aplicado cache-buster `v=1.0.3` no `dashboard.html` para `dashboard.js`, `style.css` e `dashboard.css` para resolver problemas de carregamento/exibição do botão "Painel Admin" decorrentes de cache antigo do navegador.
3.  **Controle de Versão e Backup (Git/GitHub Ativado):**
    *   Repositório Git inicializado localmente e sincronizado com o GitHub em [Mariozinhocs/360-studio](https://github.com/Mariozinhocs/360-studio.git).
    *   Arquivo `.gitignore` configurado para proteger arquivos de credenciais (`.env*`, `ftp_config*.json`) e banco local (`users.json`).

4.  **Sincronização do Editor, Progresso de Upload e Melhorias de UX (Implantado em HML):**
    *   **XMLHttpRequest com Progresso:** A função `uploadFileToServer` no [app.js](file:///G:/Meu%20Drive/Dev's/360/360/app.js) foi refatorada para usar `XMLHttpRequest`, permitindo monitorar o progresso do upload (porcentagem e barra visual) em tempo real.
    *   **Validação de Limites de Upload:** Implementadas validações no backend ([api/upload.php](file:///G:/Meu%20Drive/Dev's/360/360/api/upload.php)) de tamanho máximo (15MB para imagens, 60MB para vídeos).
    *   **Gerenciador de Hotspots na Barra Lateral:** Nova seção no menu lateral que lista todos os portais da cena ativa no modo edição e permite a exclusão direta (com propagação imediata no espaço 3D A-Frame e no banco via `api/save_tour.php`).
    *   **Melhoria de Navegação (Modo Visualização):** O clique na miniatura do tour no dashboard redireciona o usuário diretamente em modo de visualização (`mode=view`), enquanto o botão "Editar" abre o editor.
    *   **Validador com tecla Enter:** Event delegation global implementado nos scripts para capturar a tecla Enter nos modais ativos (criação de tours, redefinição de senha, edição de perfil, hotspot modal) e simular o clique no botão de ação principal.
    *   **Debounce de Input:** Debounce de 500ms inserido na alteração do título do tour para evitar sobrecarga no servidor.
    *   **Cache-Busters:** Cache-buster do dashboard atualizado para `v=1.0.5` e do editor para `v=1.0.4` para contornar cache persistente do navegador.
    *   **Controle de Redirecionamento de Auth:** Removido o redirecionamento automático baseado em sessão ativa (`check_auth.php`) ao carregar o formulário em [login.html](file:///g:/Meu%20Drive/Dev's/360/360/login.html). Além disso, os campos de login/senha foram definidos como `readonly` por padrão no carregamento, sendo habilitados dinamicamente via `onfocus` quando o usuário clica ou foca neles. Isso impede que o navegador preencha os campos automaticamente sem autorização no load da página, garantindo que o usuário veja apenas o placeholder original até que decida clicar no campo e escolher a conta salva que deseja utilizar.

---

## 📂 Estrutura de Arquivos Criados/Modificados

*   **Configurações e Infraestrutura:**
    *   [.gitignore](file:///g:/Meu%20Drive/Dev's/360/360/.gitignore) (Configuração de exclusão de arquivos sensíveis no Git [CONCLUÍDO])
    *   [project_memory.md](file:///g:/Meu%20Drive/Dev's/360/360/project_memory.md) (Memória do projeto atualizada com status e roadmap [CONCLUÍDO])
*   **APIs do Painel:**
    *   [admin_helper.php](file:///g:/Meu%20Drive/Dev's/360/360/api/admin/admin_helper.php) (Validação de privilégios e purga [CONCLUÍDO])
    *   [list_users.php](file:///g:/Meu%20Drive/Dev's/360/360/api/admin/list_users.php) (Suporte a filtro 'deleted' [CONCLUÍDO])
    *   [delete_user.php](file:///g:/Meu%20Drive/Dev's/360/360/api/admin/delete_user.php) (Lógica dupla Soft Delete/Hard Delete [CONCLUÍDO])
    *   [bulk_delete.php](file:///g:/Meu%20Drive/Dev's/360/360/api/admin/bulk_delete.php) (Lote duplo Soft/Hard Delete e correção do bloco try/catch [CONCLUÍDO])
    *   [restore_user.php](file:///g:/Meu%20Drive/Dev's/360/360/api/admin/restore_user.php) (Endpoint para reverter exclusão lógica [CONCLUÍDO])
    *   [upload.php](file:///g:/Meu%20Drive/Dev's/360/360/api/upload.php) (Implementadas validações de limite de tamanho de mídia [CONCLUÍDO])
*   **Banco de Dados:**
    *   [schema.sql](file:///g:/Meu%20Drive/Dev's/360/360/api/schema.sql) (Ajuste para TINYINT e coluna deleted_at [CONCLUÍDO])
    *   [db_installer.php](file:///g:/Meu%20Drive/Dev's/360/360/db_installer.php) (Conversão de tipo e inclusão de deleted_at [CONCLUÍDO])
*   **Interface:**
    *   [admin.html](file:///g:/Meu%20Drive/Dev's/360/360/admin.html) (Filtro lixeira e botão restaurar em lote [CONCLUÍDO])
    *   [admin.js](file:///g:/Meu%20Drive/Dev's/360/360/admin.js) (Eventos dinâmicos para lixeira e Enter key validation [CONCLUÍDO])
    *   [dashboard.html](file:///g:/Meu%20Drive/Dev's/360/360/dashboard.html) (Bumps de cache-buster para v=1.0.5 [CONCLUÍDO])
    *   [dashboard.js](file:///g:/Meu%20Drive/Dev's/360/360/dashboard.js) (Links de miniatura, addEventListener nos cliques e logs de exclusão [CONCLUÍDO])
    *   [dashboard.css](file:///g:/Meu%20Drive/Dev's/360/360/dashboard.css) (Pointer-events desabilitado nos ícones dos botões de ação e cache-buster v=1.0.5 [CONCLUÍDO])
    *   [index.html](file:///g:/Meu%20Drive/Dev's/360/360/index.html) (Barra de progresso de upload, seção lateral de hotspots e cache-buster [CONCLUÍDO])
    *   [style.css](file:///g:/Meu%20Drive/Dev's/360/360/style.css) (Estilização premium da barra de progresso e cartões de hotspots [CONCLUÍDO])
    *   [app.js](file:///g:/Meu%20Drive/Dev's/360/360/app.js) (XMLHttpRequest com progresso, listagem/deleção de hotspots, debounce e Enter key validation [CONCLUÍDO])
    *   [login.html](file:///g:/Meu%20Drive/Dev's/360/360/login.html) (Removido auto-redirect de sessão ativa e adicionado controle de autofill de credenciais via readonly/onfocus [CONCLUÍDO])

---

## 🎯 Próximos Passos (Ações para Continuar de Casa)

1.  **Investigação e Correção (Nova Etapa):**
    *   **Debug da Exclusão de Tours [CONCLUÍDO]:** Identificado que o botão de compartilhar (.btn-view-public) estava estruturado como `<button>` dentro do link `<a>` do card (violação da especificação HTML5 de tags interativas aninhadas). Isso forçava os navegadores a auto-corrigirem o DOM fechando e reabrindo links indesejados, fazendo o clique em excluir (`.btn-delete-project`) herdar o redirecionamento da página e cancelar o fetch do delete. Corrigido substituindo a tag `<button>` interna por `<span>` e adicionando `e.stopPropagation()` no botão de exclusão para evitar propagação indesejada.
2.  **Deploy em Produção (`prod`):**
    *   Executar o script `.\deploy-prod.ps1` localmente para enviar as atualizações testadas para o ambiente de produção.
    *   Acessar `https://tour360.hubdigital360.com/db_installer.php` (URL de produção) para atualizar a estrutura de tabelas do banco produtivo com a coluna `deleted_at` e tipo `TINYINT`.

---

## 🚀 Roadmap / Ideias de Monetização (Planos Superiores)

*   **Exportação para Google Street View e Embed Externo (Plano Premium/Enterprise):**
    *   **Embed em Outros Sites:** Permitir a geração de um código `<iframe>` ou script de embed leve para incorporação dos passeios 360° diretamente.
    *   **Integração Google Street View:** Exportação direta das fotos esféricas via API do Google.
