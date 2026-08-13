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
    *   **Cache-Busters:** Cache-buster do dashboard atualizado para `v=1.0.5`, do editor para `v=1.0.4`, do index.html (style.css e app.js) para `v=1.3.8` para forçar o recarregamento do novo popup de anúncios e da barra inferior ajustada, e adicionado cache-buster `v=1.0.6` nos redirecionamentos para `login.html` no [index.html](file:///g:/Meu%20Drive/Dev's/360/360/index.html) e no [dashboard.js](file:///g:/Meu%20Drive/Dev's/360/360/dashboard.js) para forçar o recarregamento instantâneo do login nos navegadores de todos os usuários.
    *   **Controle de Redirecionamento e Bloqueio de Autofill:** Removido o redirecionamento automático baseado em sessão ativa (`check_auth.php`) ao carregar o formulário em [login.html](file:///g:/Meu%20Drive/Dev's/360/360/login.html). Além disso, as tags de formulário `<form>` foram convertidas em contêineres `<div>` e foi implementada uma limpeza contínua e interativa (`setInterval` de 50ms por 8s) que força o esvaziamento dos campos de entrada (`login-username` e `login-password`) até que seja detectada qualquer interação do usuário (como clique, foco, toque ou digitação). Isso impede a exposição de credenciais por autofill passivo de navegadores ou extensões, mantendo sempre a exibição limpa dos placeholders.
    *   **Exibição Temporária Obrigatória de Anúncios (Janela Popup Centralizada):** A publicidade no plano Grátis agora abre como um popup modal elegante de `800px` x `600px` no centro da tela sobre um overlay escurecido (`#google-ads-overlay`) com desfoque de fundo, bloqueando interações com o tour virtual. Uma barra de progresso horizontal (`#ads-progress-bar`) com gradiente indica visualmente a passagem do tempo de 10 segundos junto a um contador discreto (`#ads-countdown`). O botão de fechar circular (`#close-ads-btn`) só fica visível e disponível após concluir a contagem regressiva de 10s. O popup inclui também um botão promocional chamativo de upgrade de plano.
    *   **Marca d'água de Plano Grátis:** O link do botão promocional "Criado com 360° Studio" (`#promotional-watermark`) foi modificado para apontar localmente para a página inicial `home.html` em vez de apontar para a URL fixa de produção, permitindo portabilidade correta em localhost, HML e ambientes produtivos.
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

11. **Barra de Navegação de Cenas e Otimização de Hotspots 3D (CONCLUÍDO):**
    *   **Barra Inferior de Miniaturas (Strip / Carousel):** Adicionada barra flutuante em vidro escuro no rodapé com rolagem horizontal de todas as cenas e atalhos de teclado (Setas Esquerda e Direita). As setas laterais de navegação da interface (#btn-prev-scene e #btn-next-scene) realizam a rolagem lateral suave da barra em 200px para revelar miniaturas ocultas em vez de mudar bruscamente de cena. Além disso, ao trocar de cena (seja via teclado, hotspots ou sidebar), a miniatura correspondente é centralizada automaticamente e de forma suave na barra inferior (`scrollIntoView` alinhado ao centro visual).
    *   **Correção de Raycaster e Posicionamento de Hotspots:** Adicionado `cursor="rayOrigin: mouse"` e raycaster estendido para `a-sky` e `.hotspot-element`, permitindo mira e clique direto pelo mouse/touch tanto no modo de edição quanto no modo visualização.
    *   **Ícones e Labels 3D:** Hotspots agora possuem visual com degradê radial e anéis pulsantes com texto voltado sempre para a câmera (`look-at="#camera"`).
    *   **Suporte Universal AVIF/WebP:** Inclusão de verificação por assinaturas binárias (*magic numbers*) em [api/upload.php](file:///g:/Meu%20Drive/Dev's/360/360/api/upload.php).

12. **Monetização e Gestão de Limites (Soft-Lock de Cenas + Hard Limit de Tours com Upgrade CTA) (CONCLUÍDO):**
    *   **Upload e Salvamento Ilimitado de Cenas:** O usuário pode fazer upload de qualquer quantidade de imagens (ex: 12 fotos no Grátis); todas são salvas e persistidas no banco sem erro 403.
    *   **Soft-Lock Visual nas Cenas Excedentes:** As cenas acima do limite do plano (ex: a partir da 11ª no Grátis) ficam com card/miniatura avermelhado escuro, badge e overlay de cadeado 🔒.
    *   **Modal de Upgrade CTA nas Cenas:** Clicar em qualquer cena bloqueada (na sidebar, no carrossel ou em um hotspot 3D) abre um modal persuasivo de Upgrade de Plano com link para `plans.html`.
    *   **Hard Limit de Tours com Modal CTA no Dashboard:** O usuário é impedido de ultrapassar a quantidade de tours ativos do seu plano (ex: 5 no Grátis), mas ao clicar no botão "Novo Tour" quando cheio, abre um modal de Upgrade CTA exclusivo.
    *   **Purga Automática de Mídias Órfãs:** Criado [api/clean_orphans.php](file:///g:/Meu%20Drive/Dev's/360/360/api/clean_orphans.php) integrado ao painel admin e rotinas de manutenção para apagar automaticamente arquivos abandonados na pasta `/uploads/`.

13. **Interação Avançada de Hotspots, Enquadramento Suave e Reposicionamento (CONCLUÍDO):**
    *   **Renderização 3D de Alta Definição:** Correção dos hotspots pretos/retangulares através de texturas SVG base64 de alta resolução (`HOTSPOT_ICON_FREE`, `HOTSPOT_ICON_PREMIUM`, `HOTSPOT_ICON_SELECTED`), fontes A-Frame padrão (`roboto`), pill translúcida e anéis pulsantes em neon (`a-ring`).
    *   **Enquadramento Automático da Câmera (`lookAtHotspot`):** Ao clicar em qualquer portal na lista do menu lateral, a câmera 360° gira suavemente (interpolação esférica `smoothRotateCamera` com easing cúbico) e aponta diretamente para o hotspot na tela.
    *   **Seleção e Reposicionamento Dinâmico na Cena:** Ao selecionar um hotspot, o card fica ativo com visual destacado e botões dedicados:
        *   **Reposicionar / Mover:** Ativa o modo de reposicionamento com retículo e pulso visual. O usuário clica em qualquer ponto da foto 360° para mover o portal imediatamente, com salvamento instantâneo.
        *   **Editar:** Abre o modal pré-preenchido para alterar descrição do balão ou trocar a cena de destino.
        *   **Excluir:** Remove o portal da cena e atualiza o banco/local.
    *   **Cache-Busters:** Bump para `v=1.3.9` no `style.css` e `app.js` em `index.html`.

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
    *   [recover_password.php](file:///g:/Meu%20Drive/Dev's/360/360/api/recover_password.php) (Endpoint para solicitação de recuperação de senha por e-mail [CONCLUÍDO])
    *   [reset_password_with_token.php](file:///g:/Meu%20Drive/Dev's/360/360/api/reset_password_with_token.php) (Endpoint para redefinir senha usando token [CONCLUÍDO])
    *   [config.php](file:///g:/Meu%20Drive/Dev's/360/360/api/config.php) (Adicionada função resolvePlanName para normalização de active/trial e validação de features [CONCLUÍDO])
    *   [update_subscription.php](file:///g:/Meu%20Drive/Dev's/360/360/api/admin/update_subscription.php) (Validação estendida para suportar planos reais [CONCLUÍDO])
    *   [bulk_update.php](file:///g:/Meu%20Drive/Dev's/360/360/api/admin/bulk_update.php) (Validação estendida para suportar planos reais em lote [CONCLUÍDO])
    *   [get_stats.php](file:///g:/Meu%20Drive/Dev's/360/360/api/admin/get_stats.php) (Estatísticas adaptadas para agrupar os novos planos reais de faturamento [CONCLUÍDO])
*   **Banco de Dados:**
    *   [schema.sql](file:///g:/Meu%20Drive/Dev's/360/360/api/schema.sql) (Ajuste para TINYINT, deleted_at, timezone, floor_plan_json e colunas de recuperação de senha [CONCLUÍDO])
    *   [db_installer.php](file:///g:/Meu%20Drive/Dev's/360/360/db_installer.php) (Conversão de tipo, deleted_at, timezone, floor_plan_json e colunas de recuperação de forma segura [CONCLUÍDO])
*   **Interface:**
    *   [admin.html](file:///g:/Meu%20Drive/Dev's/360/360/admin.html) (Filtro lixeira, restaurar em lote, cache-buster e dropdowns de assinatura com planos reais [CONCLUÍDO])
    *   [admin.js](file:///g:/Meu%20Drive/Dev's/360/360/admin.js) (Auto-logout, mapeamento de planos e badges corretas na listagem e modal de edição [CONCLUÍDO])
    *   [dashboard.html](file:///g:/Meu%20Drive/Dev's/360/360/dashboard.html) (Adicionado botão e modal de edição de perfil, e bump de cache-buster v=1.0.8 [CONCLUÍDO])
    *   [dashboard.js](file:///g:/Meu%20Drive/Dev's/360/360/dashboard.js) (Auto-logout, mapeamento de active/trial para planos reais no limite de tours [CONCLUÍDO])
    *   [index.html](file:///g:/Meu%20Drive/Dev's/360/360/index.html) (Card da Planta na sidebar, modal do editor, widget de radar do visitante e cache-buster v=1.3.8 [CONCLUÍDO])
    *   [style.css](file:///g:/Meu%20Drive/Dev's/360/360/style.css) (Estilização premium, modal de planta, popup de anúncios e cache-buster v=1.3.8 [CONCLUÍDO])
    *   [app.js](file:///g:/Meu%20Drive/Dev's/360/360/app.js) (Hotspots pulsantes, angulo inicial com restrição PRO no editor, feedback de clique e cache-buster v=1.3.8 [CONCLUÍDO])
    *   [login.html](file:///g:/Meu%20Drive/Dev's/360/360/login.html) (Removido auto-redirect, bloqueio de autofill por divs, gravação de session_active no sessionStorage, link Esqueci minha senha e cards de recuperação/redefinição [CONCLUÍDO])
    *   [plans.js](file:///g:/Meu%20Drive/Dev's/360/360/plans.js) (Validação checkAuth de session_active inativa no PC para limpar sessão do servidor [CONCLUÍDO])
    *   [home.js](file:///g:/Meu%20Drive/Dev's/360/360/home.js) (Validação checkUserSession de session_active inativa no PC para limpar sessão do servidor [CONCLUÍDO])

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

---

## 📈 11. Plano Estratégico de Marca, Pitch de Vendas e Tráfego Pago

*   **Identidade e Posicionamento (Branding):**
    *   **Proposta Única de Valor (UVP):** *"A plataforma brasileira mais intuitiva e completa para criar, hospedar e compartilhar passeios virtuais 360° com plantas baixas inteligentes e radar interativo."*
    *   **Arquétipo:** O Criador / Inovador (moderno, ágil, premium e sem burocracia).
    *   **Slogans:** *"Não mostre fotos. Transporte seu cliente para dentro do espaço."* / *"Do upload à experiência imersiva em minutos."*
    *   **Diferenciais:** Preço em Reais via Pix/Cartão, planta baixa com radar em tempo real, 100% responsivo em browser sem apps externos, compatível com qualquer câmera 360° ou render 3D.
*   **Pitch Comercial (4 Etapas):**
    1.  *Problema:* Fotos 2D estáticas não vendem a sensação de espaço; imobiliárias perdem tempo com visitas desqualificadas.
    2.  *Solução:* Plataforma 360° Studio com portais entre cômodos, planta baixa e radar em tempo real.
    3.  *Demonstração:* Link ou QR Code na placa que permite tour autônomo 24h e botão de contato no WhatsApp.
    4.  *CTA:* Criação de conta com até 5 tours 100% grátis para validação imediata.
*   **Pilares de Redes Sociais (Instagram, TikTok, LinkedIn):**
    *   Vídeos de impacto visual / Reels mostrando antes/depois e a sincronização do radar com a câmera 360°.
    *   Dicas práticas de captação fotográfica 360° para corretores e fotógrafos.
    *   Artigos no LinkedIn focados em diretores imobiliários e aumento de conversão de vendas.
*   **Plano de Tráfego Pago (Ads & Funil):**
    *   *Topo de Funil (Meta Ads):* Vídeos de demonstração rápida atraindo para o Plano Grátis.
    *   *Meio de Funil (Meta/YouTube):* Carrossel de recursos (Planta com Radar + Portais + Marca Própria).
    *   *Fundo de Funil (Google Search):* Palavras-chave de alta intenção (*"criar tour virtual 360"*, *"plataforma de passeio 360"*).
    *   *Remarketing:* Banners para usuários cadastrados no plano grátis realizarem upgrade para planos pagos.

