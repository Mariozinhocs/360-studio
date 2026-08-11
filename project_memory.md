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
    *   **Cache-Busters:** Cache-buster do dashboard atualizado para `v=1.0.5`, do editor para `v=1.0.4` e adicionado cache-buster `v=1.0.6` nos redirecionamentos para `login.html` no [index.html](file:///g:/Meu%20Drive/Dev's/360/360/index.html) e no [dashboard.js](file:///g:/Meu%20Drive/Dev's/360/360/dashboard.js) para forçar o recarregamento instantâneo do login nos navegadores de todos os usuários.
    *   **Controle de Redirecionamento e Bloqueio de Autofill:** Removido o redirecionamento automático baseado em sessão ativa (`check_auth.php`) ao carregar o formulário em [login.html](file:///g:/Meu%20Drive/Dev's/360/360/login.html). Além disso, as tags de formulário `<form>` foram convertidas em contêineres `<div>` e foi implementada uma limpeza contínua e interativa (`setInterval` de 50ms por 8s) que força o esvaziamento dos campos de entrada (`login-username` e `login-password`) até que seja detectada qualquer interação do usuário (como clique, foco, toque ou digitação). Isso impede a exposição de credenciais por autofill passivo de navegadores ou extensões, mantendo sempre a exibição limpa dos placeholders.
5.  **Limpeza de Mídias Órfãs e Validação de Resolução (Implantado em HML):**
    *   **Exclusão Física Automática:** A remoção de cenas ([save_tour.php](file:///g:/Meu%20Drive/Dev's/360/360/api/save_tour.php)) ou exclusão de projetos inteiros ([delete_tour.php](file:///g:/Meu%20Drive/Dev's/360/360/api/delete_tour.php)) agora apaga fisicamente os respectivos arquivos da pasta `uploads/` no servidor, protegendo o espaço em disco contra arquivos órfãos.
    *   **Validação 8K no Backend:** Inserida verificação de largura/altura com `getimagesize()` no backend ([api/upload.php](file:///g:/Meu%20Drive/Dev's/360/360/api/upload.php)) para rejeitar imagens que excedam 8192px (8K), garantindo segurança e integridade de renderização.
6.  **Redirecionamento Obrigatório da Raiz (Implantado em HML):**
    *   Acesso à raiz `https://tour360.hubdigital360.com/hml/` (ou do domínio em produção) redireciona de forma obrigatória para `/login.html` caso não seja fornecido um ID de tour válido.
    *   Implementado em duas camadas de segurança:
        *   **Servidor (.htaccess):** Regra de rewrite no Apache que intercepta a requisição da raiz ou `index.html` sem parâmetros e redireciona (301) para `login.html`.
        *   **Cliente (JavaScript em index.html):** Script leve executado no início do `<head>` que valida a ausência do parâmetro `id` na URL e redireciona o usuário imediatamente, funcionando em qualquer tipo de servidor.
7.  **Sincronização de Fuso Horário e Exibição Local (Implantado em HML):**
    *   **Backend (PHP/MySQL):** Configurado o fuso horário padrão do PHP como `UTC` (`date_default_timezone_set('UTC')`) e forçado o fuso da conexão do MySQL para `UTC` (`SET time_zone = '+00:00'`) no [config.php](file:///g:/Meu%20Drive/Dev's/360/360/api/config.php). Isso garante consistência de datas no banco de dados independentemente de configurações do host.
    *   **Frontend (JS):** As funções de formatação `formatDate` no [dashboard.js](file:///g:/Meu%20Drive/Dev's/360/360/dashboard.js) e [admin.js](file:///g:/Meu%20Drive/Dev's/360/360/admin.js) foram refatoradas para normalizar os formatos de data do MySQL em strings ISO 8601 UTC (ex: `YYYY-MM-DDTHH:MM:SSZ`).
    *   O navegador interpreta e realiza automaticamente a conversão das datas para o fuso horário local de cada usuário (ex: exibindo `15:44` em vez de `19:44` para usuários no fuso UTC-4).
8.  **Painel de Edição de Perfil e Timezone Personalizado (Implantado em HML):**
    *   **Coluna no Banco:** Adicionado campo `timezone` (com default `America/Sao_Paulo`) na tabela de usuários via script [db_installer.php](file:///g:/Meu%20Drive/Dev's/360/360/db_installer.php) de forma segura (ALTER TABLE).
    *   **Modal e Controle de Perfil:** Criado o modal de configurações de perfil em [dashboard.html](file:///g:/Meu%20Drive/Dev's/360/360/dashboard.html) com campos para Nome, E-mail, Fuso Horário (dropdown populado com fusos de capitais brasileiras e globais), status do plano e data de expiração.
    *   **Lógica de Renderização e Atualização:** Implementada a API [update_profile.php](file:///g:/Meu%20Drive/Dev's/360/360/api/update_profile.php) que atualiza as informações do usuário logado e atualiza a sessão. No frontend, as datas são formatadas de acordo com o fuso salvo no perfil (`Intl.DateTimeFormat(..., { timeZone })`), ajustando instantaneamente todos os horários exibidos ao salvar o perfil.
    *   Bumps de cache-buster inseridos em `dashboard.html` (v=1.0.8) e `admin.html` (v=1.0.5) para forçar o recarregamento.

9.  **Planta Baixa Interativa com Radar (Desenvolvido e em Fase de Homologação):**
    *   **Banco de Dados:** Adicionado o campo `floor_plan_json LONGTEXT NULL` na tabela de tours (atualizado no `schema.sql` e no `db_installer.php` de forma segura via migração `ALTER TABLE`).
    *   **APIs Backend:** `save_tour.php` e `get_tour.php` adaptados para processar, validar e retornar o objeto `floorPlan` (imagem + radars). O script de gravação detecta a substituição/remoção da planta e apaga o arquivo órfão correspondente da pasta `uploads/`.
    *   **Componente A-Frame:** Adicionado o componente `rotation-listener` que escuta a rotação Y da câmera A-Frame e atualiza dinamicamente a rotação do cone do radar.
    *   **Interface do Usuário (HTML/CSS/JS):**
        *   Card da Planta Baixa na sidebar esquerda com upload de arquivo e acionadores.
        *   Modal de Editor de Planta Baixa para posicionar radares com clique e ajustar o fuso direcional (`yawOffset`) em tempo real.
        *   Widget flutuante para visitante que plota os pontos do mapa, permite a navegação cruzada entre cenas com clique direto na planta e exibe o cone do radar com efeito blur e gradiente cônico em tempo real.
        *   Bumps de cache-buster inseridos no `index.html` para `app.js` e `style.css` (v=1.1.0) para forçar recarregamento imediato.

10. **Homologação e Validação de Planos (CONCLUÍDO):**
    *   Deploy para o ambiente de homologação (HML) realizado com sucesso (`deploy-hml.ps1`).
    *   Estrutura de banco de dados (`hml_users`, `hml_tours`) atualizada via `db_installer.php`.
    *   Fluxos de login, cadastro, bloqueio de autofill e redirecionamento de raiz validados no HML.
    *   Matriz de recursos e regras de limite de planos validadas com sucesso via upgrades simulados com Mercado Pago Pix/Cartão:
        *   **Grátis:** Limitação de 5 tours ativos e 10 cenas confirmada (bloqueio de criação do 6º tour). Exibição de anúncios e bloqueios na Planta Baixa e Logotipo Customizado verificados.
        *   **Iniciante:** Limite aumentado para 10 tours (liberando a criação do 6º tour).
        *   **Básico:** Logotipo customizado (1 logo) ativado e anúncios removidos.
        *   **Profissional:** Planta Baixa Interativa com radar direcional desbloqueada (lock overlay removido) e limite ilimitado.
    *   **Contas de Teste no HML:** Criadas 6 contas de teste (`gratis_tester`, `iniciante_tester`, `basico_tester`, `pessoal_tester`, `profissional_tester`, `admin_tester`) com a senha padrão `senha360` via script `create_test_profiles.php` para simplificar homologação e auditorias de recursos.

---

## 📂 Estrutura de Arquivos Criados/Modificados

*   **Configurações e Infraestrutura:**
    *   [.gitignore](file:///g:/Meu%20Drive/Dev's/360/360/.gitignore) (Configuração de exclusão de arquivos sensíveis no Git [CONCLUÍDO])
    *   [.htaccess](file:///g:/Meu%20Drive/Dev's/360/360/.htaccess) (Redirecionamento automático de acessos à raiz sem parâmetros para login.html [CONCLUÍDO])
    *   [project_memory.md](file:///g:/Meu%20Drive/Dev's/360/360/project_memory.md) (Memória do projeto atualizada com status e roadmap [CONCLUÍDO])
    *   [create_test_profiles.php](file:///g:/Meu%20Drive/Dev's/360/360/create_test_profiles.php) (Script de carga e reset de contas de teste por nível de plano no HML [CONCLUÍDO])
    *   [api/config.php](file:///g:/Meu%20Drive/Dev's/360/360/api/config.php) (Configurações de banco, sessão, helpers e fuso horário UTC forçado [CONCLUÍDO])
*   **APIs do Painel:**
    *   [admin_helper.php](file:///g:/Meu%20Drive/Dev's/360/360/api/admin/admin_helper.php) (Validação de privilégios e purga [CONCLUÍDO])
    *   [list_users.php](file:///g:/Meu%20Drive/Dev's/360/360/api/admin/list_users.php) (Suporte a filtro 'deleted' [CONCLUÍDO])
    *   [delete_user.php](file:///g:/Meu%20Drive/Dev's/360/360/api/admin/delete_user.php) (Lógica dupla Soft Delete/Hard Delete [CONCLUÍDO])
    *   [bulk_delete.php](file:///g:/Meu%20Drive/Dev's/360/360/api/admin/bulk_delete.php) (Lote duplo Soft/Hard Delete e correção do bloco try/catch [CONCLUÍDO])
    *   [restore_user.php](file:///g:/Meu%20Drive/Dev's/360/360/api/admin/restore_user.php) (Endpoint para reverter exclusão lógica [CONCLUÍDO])
    *   [upload.php](file:///g:/Meu%20Drive/Dev's/360/360/api/upload.php) (Implementadas validações de limite de tamanho de mídia [CONCLUÍDO])
    *   [update_profile.php](file:///g:/Meu%20Drive/Dev's/360/360/api/update_profile.php) (Endpoint para atualizar informações pessoais, fuso horário e plano do usuário logado [CONCLUÍDO])
    *   [save_tour.php](file:///g:/Meu%20Drive/Dev's/360/360/api/save_tour.php) (Suporte a floor_plan_json e exclusão física de planta órfã [CONCLUÍDO])
    *   [get_tour.php](file:///g:/Meu%20Drive/Dev's/360/360/api/get_tour.php) (Inclusão de floor_plan_json na resposta da API [CONCLUÍDO])
*   **Banco de Dados:**
    *   [schema.sql](file:///g:/Meu%20Drive/Dev's/360/360/api/schema.sql) (Ajuste para TINYINT, coluna deleted_at, timezone e floor_plan_json [CONCLUÍDO])
    *   [db_installer.php](file:///g:/Meu%20Drive/Dev's/360/360/db_installer.php) (Conversão de tipo e inclusão de deleted_at, timezone e floor_plan_json de forma segura [CONCLUÍDO])
*   **Interface:**
    *   [admin.html](file:///g:/Meu%20Drive/Dev's/360/360/admin.html) (Filtro lixeira, restaurar em lote e cache-buster v=1.0.5 [CONCLUÍDO])
    *   [admin.js](file:///g:/Meu%20Drive/Dev's/360/360/admin.js) (Eventos, Enter validation, lixeira e formatDate utilizando fuso do administrador com correção de regex [CONCLUÍDO])
    *   [dashboard.html](file:///g:/Meu%20Drive/Dev's/360/360/dashboard.html) (Adicionado botão e modal de edição de perfil, e bump de cache-buster v=1.0.8 [CONCLUÍDO])
    *   [dashboard.js](file:///g:/Meu%20Drive/Dev's/360/360/dashboard.js) (Links de miniatura, addEventListener nos cliques, logs de exclusão e cache-buster v=1.0.6 no redirect de login [CONCLUÍDO])
    *   [index.html](file:///g:/Meu%20Drive/Dev's/360/360/index.html) (Card da Planta na sidebar, modal do editor, widget de radar do visitante e cache-buster v=1.1.0 [CONCLUÍDO])
    *   [style.css](file:///g:/Meu%20Drive/Dev's/360/360/style.css) (Estilização premium do card, modal de planta baixa e widget de radar com conic-gradient e cache-buster v=1.1.0 [CONCLUÍDO])
    *   [app.js](file:///g:/Meu%20Drive/Dev's/360/360/app.js) (A-Frame rotation-listener, uploads de planta baixa, cliques em pontos, slider de offsets, widget dinâmico e cache-buster v=1.1.0 [CONCLUÍDO])
    *   [login.html](file:///g:/Meu%20Drive/Dev's/360/360/login.html) (Removido auto-redirect de sessão, e convertidos formulários em divs com manipulação de enter/clique e limpeza contínua pré-interação para contornar autofill forçado [CONCLUÍDO])

---

## 🎯 Próximos Passos (Ações para Continuar de Casa)

1.  **Deploy em Produção (`prod`):**
    *   Executar o script `.\deploy-prod.ps1` localmente para enviar as atualizações testadas para o ambiente de produção.
    *   Acessar `https://tour360.hubdigital360.com/db_installer.php` (URL de produção) para atualizar a estrutura de tabelas do banco de produção.

---

## 🚀 Roadmap / Ideias de Monetização (Planos Superiores)

*   **Exportação para Google Street View e Embed Externo (Plano Premium/Enterprise):**
    *   **Embed em Outros Sites:** Permitir a geração de um código `<iframe>` ou script de embed leve para incorporação dos passeios 360° diretamente.
    *   **Integração Google Street View:** Exportação direta das fotos esféricas via API do Google.
*   **Controle de Recursos baseados em Plano de Assinatura (Design Pronto):**
    *   Taguear funcionalidades do tour (como a Planta Baixa Interativa) para checagens de recursos do plano ativo (ex: `hasFeature('floor_plan')`).
    *   Criar um painel de Super Admin para gerenciar e associar quais recursos estão ativos em cada plano de assinatura.
