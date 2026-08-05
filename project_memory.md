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

---

## 📂 Estrutura de Arquivos Criados/Modificados

*   **Configurações e Infraestrutura:**
    *   [.gitignore](file:///g:/Meu%20Drive/Dev's/360/360/.gitignore) ([NEW] Configuração de exclusão de arquivos sensíveis no Git [CONCLUÍDO])
*   **APIs do Painel:**
    *   [admin_helper.php](file:///g:/Meu%20Drive/Dev's/360/360/api/admin/admin_helper.php) (Validação de privilégios e purga automatizada de 30 dias [CONCLUÍDO])
    *   [list_users.php](file:///g:/Meu%20Drive/Dev's/360/360/api/admin/list_users.php) (Suporte a filtro 'deleted' [CONCLUÍDO])
    *   [delete_user.php](file:///g:/Meu%20Drive/Dev's/360/360/api/admin/delete_user.php) (Lógica dupla Soft Delete/Hard Delete [CONCLUÍDO])
    *   [bulk_delete.php](file:///g:/Meu%20Drive/Dev's/360/360/api/admin/bulk_delete.php) (Lote duplo Soft/Hard Delete e correção do bloco try/catch [CONCLUÍDO])
    *   [restore_user.php](file:///g:/Meu%20Drive/Dev's/360/360/api/admin/restore_user.php) ([NEW] Endpoint para reverter exclusão lógica [CONCLUÍDO])
*   **Banco de Dados:**
    *   [schema.sql](file:///g:/Meu%20Drive/Dev's/360/360/api/schema.sql) (Ajuste para TINYINT e coluna deleted_at [CONCLUÍDO])
    *   [db_installer.php](file:///g:/Meu%20Drive/Dev's/360/360/db_installer.php) (Conversão de tipo e inclusão de deleted_at [CONCLUÍDO])
*   **Interface:**
    *   [admin.html](file:///g:/Meu%20Drive/Dev's/360/360/admin.html) (Filtro lixeira e botão restaurar em lote [CONCLUÍDO])
    *   [admin.js](file:///g:/Meu%20Drive/Dev's/360/360/admin.js) (Eventos dinâmicos para restauração, exclusão física e lote da lixeira [CONCLUÍDO])
    *   [dashboard.html](file:///g:/Meu%20Drive/Dev's/360/360/dashboard.html) (Adicionados cache-busters para scripts/estilos [CONCLUÍDO])

---

## 🎯 Próximos Passos (Ações para Continuar de Casa)

1.  **Ajustes de Interface e Funcionalidades do Usuário (Nova Etapa):**
    *   **Integração de Sincronização do Editor (`app.js`):**
        *   Sincronizar a criação/edição de hotspots e cenas diretamente com as APIs `api/save_tour.php` e `api/get_tour.php?id=ID_DO_TOUR` (atualmente com fluxo parcial/local).
        *   Garantir o upload real e otimização das mídias 360° via `api/upload.php` em substituição ao blob local temporário.
    *   **Otimização de Mídias e Limites:**
        *   Inserir validações de limites de uploads de imagens/vídeos equiretangulares de altíssima resolução no backend para gerenciar os custos de hospedagem.
    *   **Melhorias Visuais e UX do Editor:** Refinar a interface visual do criador de tours (exibição de progresso no upload de fotos, transições mais elegantes e navegação responsiva).

2.  **Limpeza Opcional (CONCLUÍDO):**
    *   Removidos scripts de depuração de suporte (`check_session.php`, `check_mario_db.php`, `print_mario.php`, `print_users.php`, `promote_mario.php`) da base de código local e Git.

3.  **Deploy em Produção (`prod`):**
    *   Executar o script `.\deploy-prod.ps1` localmente para enviar as atualizações testadas para o ambiente de produção.
    *   Acessar `https://tour360.hubdigital360.com/db_installer.php` (URL de produção) para atualizar a estrutura de tabelas do banco produtivo com a coluna `deleted_at` e tipo `TINYINT`.

---

## 🚀 Roadmap / Ideias de Monetização (Planos Superiores)

*   **Exportação para Google Street View e Embed Externo (Plano Premium/Enterprise):**
    *   **Embed em Outros Sites:** Permitir a geração de um código `<iframe>` ou script de embed leve para que imobiliárias e empresas incorporem os passeios 360° diretamente em suas landing pages ou sites institucionais.
    *   **Integração Google Street View:** Possibilitar a exportação do tour (fotos esféricas com metadados de geolocalização e orientação) para publicação direta no Google Street View via API do Google.
