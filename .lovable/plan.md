

# UNBSTOOLS — Hub de Ferramentas Criativas

## Visão Geral
Criar o hub central da UNBSTOOLS (unbstools.com), uma suite de aplicações criativas da UNBSERVED. O hub será o ponto de acesso autenticado para todas as ferramentas, com visual fiel ao estilo UNBSERVED (fundo bege/creme, tipografia bold, design minimalista).

---

## 1. Autenticação (Supabase existente)
- Tela de login/registro com Email + Senha e Google OAuth
- Conexão com o banco de dados Supabase já existente (compartilhado com o site principal UNBSERVED)
- Verificação de assinatura/plano do usuário via tabela existente no Supabase
- Rotas protegidas — apenas usuários autenticados acessam as ferramentas

## 2. Layout Principal do Hub
- **Header** com logo UNBSTOOLS (SVG fornecido), navegação e avatar do usuário
- **Dashboard/Home** com grid de cards das ferramentas disponíveis:
  - **UNBSCOLOR** — Ferramenta de cores
  - **UNBSGRID** — Ferramenta de grid para logos
  - Cards com ícone, nome, descrição curta e status (ativo/em breve)
- Cards com indicação visual se o usuário tem acesso (baseado no plano)
- Design minimalista no estilo UNBSERVED: fundo bege `#f0ede6`, texto escuro, bordas suaves

## 3. Estrutura de Rotas para Ferramentas
- `/` — Dashboard com lista de ferramentas
- `/login` — Tela de autenticação
- `/unbscolor` — Placeholder da ferramenta UNBSCOLOR (pronto para receber o app Vite)
- `/unbsgrid` — Placeholder da ferramenta UNBSGRID (pronto para receber o app Vite)
- Cada rota de ferramenta terá um layout wrapper com header e navegação de volta ao hub
- Estrutura modular para facilitar a adição de novas ferramentas no futuro

## 4. Perfil do Usuário
- Menu dropdown no avatar com opções: Perfil, Configurações, Logout
- Página de perfil mostrando informações do usuário e plano atual
- Link para gerenciar assinatura (redirecionamento para o site principal)

## 5. Preparação para Integração dos Apps
- Cada ferramenta terá sua própria pasta/módulo dentro do projeto
- Estrutura pensada para que os apps Vite (UNBSCOLOR, UNBSGRID) sejam clonados e integrados como componentes/páginas
- Componentes compartilhados (header, sidebar, auth context) prontos para serem reutilizados por todas as ferramentas

