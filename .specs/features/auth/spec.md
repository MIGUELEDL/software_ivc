# Autenticação e RBAC — Especificação

## Problem Statement

O portal IVC virou público-estático (F1..F3). Sem autenticação não há porta de
entrada para o painel do membro (RF-011..015) nem para o painel administrativo
(RF-021..030). É preciso estabelecer login separado membro/admin, sessão
server-side com Supabase Auth, primeiro acesso por senha-ID temporária com troca
obrigatória (RN-002) e RBAC de rotas pelos papéis do RF-031 — como fundação sobre
a qual os painéis reais serão construídos nas próximas features.

## Goals

- [ ] Usuário (membro ou admin) consegue autenticar e chegar à sua área após o 1º acesso trocar a senha-ID (RN-002).
- [ ] Rotas `/painel/*` e `/admin/*` só respondem para sessão autenticada com papel da área correspondente (RF-031).
- [ ] Papel vem de `app_metadata.role` (Supabase), não-editável pelo usuário; decisão de permissão é server-side (getClaims).

## Out of Scope

| Feature     | Reason         |
| ----------- | -------------- |
| Painéis reais (avisos RF-012, QR dízimo RF-013, cartão RF-014, perfil RF-015) | Features seguintes; aqui só landings mínimos de auth |
| Painel administrativo (RF-021..030) | Features seguintes; aqui só landing mínimo `/admin` |
| Gestão de usuários/permissões (RF-028) e matriz completa RF-032 | Feature dedicada (CRUD de papéis por módulo) |
| Recuperação de senha por e-mail | Entrega manual da senha-ID (D2); e-mail fora do MVP |
| Cadastro público (self-signup) | Acessos criados pela liderança |
| Rate limiting próprio, MFA, SSO | Nativo do Supabase (rate limit) e fora do MVP (MFA/SSO) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default  | Rationale | Confirmed? |
| --------------------- | --------------- | --------- | ---------- |
| Provedor de auth | Supabase Auth nativo via `@supabase/ssr` | AD-013 (substitui AD-004); hash/sessão/refresh/rate limit prontos | ✅ |
| Papel no JWT | `app_metadata.role` | Não-editável pelo usuário; lido via `getClaims()` | ✅ |
| Sessão | Cookies httpOnly geridos pelo `@supabase/ssr` (`sb-<ref>-auth-token`) | `getClaims()` valida JWT sem confiar no cliente | ✅ |
| Flag 1º acesso | `app_metadata.force_password_change = true`, limpo ao trocar | Suporte a RN-002 sem mecanismo nativo de expiração | ✅ |
| Logins separados | `/login` (membro) e `/login/admin` | D4; sessão única, papel decide área | ✅ |
| Entrega senha-ID | Manual pela liderança (script seed / dashboard) | D2; sem Resend no MVP | ✅ |
| 1º admin | Script `seed:admin` (service-role) cria SUPER_ADMIN | D5 | ✅ |
| Destino pós-login | Landings mínimos `/painel` e `/admin` | D6 | ✅ |
| Bloqueio da área | Redireciona a `/trocar-senha` até trocar; senha-ID antiga expira | D7; RN-002 literal | ✅ |
| Dependências | `@supabase/ssr` + `@supabase/supabase-js`; sem lib de validação nova | Validação server-side manual; RC-001 custo ≈ 0 | ✅ |
| Env | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Docs 2026: publishable (`sb_publishable_...`) recomendada; service-role só servidor | ✅ |
| Navbar não muda | Sem link de área na navbar SSG nesta feature | Entra junto com os painéis reais | ✅ |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Autenticação de membro (login + sessão + painel) ⭐ MVP

**User Story**: Como membro da IVC, quero entrar no portal com e-mail e senha-ID
(depois pessoal) para acessar minha área, de modo que eu veja apenas o que é meu.

**Why P1**: Fundação do painel do membro (RF-011); sem login não há membro autenticado.

**Acceptance Criteria** (each line is one EARS pattern):

1. WHEN um membro autenticado com sucesso em `/login` THEN o sistema SHALL criar sessão e redirecionar para `/painel`. <!-- event-driven -->
2. WHEN um visitante acessa `/painel` sem sessão autenticada THEN o sistema SHALL redirecionar para `/login`. <!-- event-driven -->
3. IF os dados de login em `/login` forem inválidos THEN o sistema SHALL exibir erro de credenciais e NÃO criar sessão. <!-- unwanted-behavior -->
4. WHILE autenticado com papel MEMBRO em `/painel` o sistema SHALL exibir o e-mail e o papel da sessão. <!-- state-driven -->

**Independent Test**: Login manual com membro seed → 302 para `/painel`; `/painel` sem cookie → 302 `/login`; credencial errada → erro na página.

---

### P1: Autenticação de administrador (login separado + sessão + área admin) ⭐ MVP

**User Story**: Como administrador da IVC, quero entrar por `/login/admin` com
credenciais de gestão para acessar a área administrativa, de modo que o acesso
administrativo fique separado do acesso de membro.

**Why P1**: Porta de entrada do painel admin (RF-008/RF-021); separação de contexto (AD-013).

**Acceptance Criteria**:

1. WHEN um admin autentica com sucesso em `/login/admin` THEN o sistema SHALL criar sessão e redirecionar para `/admin`. <!-- event-driven -->
2. WHEN um visitante acessa `/admin` sem sessão autenticada THEN o sistema SHALL redirecionar para `/login/admin`. <!-- event-driven -->
3. IF o papel da sessão NÃO pertencer ao conjunto admin (SECRETARIA, LIDER, FINANCEIRO, PATRIMONIAL, ADMIN, SUPER_ADMIN) ao acessar `/admin` THEN o sistema SHALL redirecionar para `/login/admin`. <!-- unwanted-behavior -->
4. WHILE autenticado com papel admin em `/admin` o sistema SHALL exibir o e-mail e o papel da sessão. <!-- state-driven -->

**Independent Test**: Login manual com admin seed → 302 `/admin`; `/admin` sem cookie → 302 `/login/admin`; login de membro EM `/login/admin` → 302 `/login/admin`.

---

### P1: Primeiro acesso — senha-ID com troca obrigatória ⭐ MVP

**User Story**: Como usuário novo (membro ou admin), quero trocar minha senha-ID
temporária na primeira vez que entrar, de modo que a senha-ID expira após o uso
(RN-002).

**Why P1**: Requisito RN-002/mandatório da liderança; pré-requisito para liberar qualquer área.

**Acceptance Criteria**:

1. WHILE a sessão tem `force_password_change = true` o sistema SHALL redirecionar qualquer rota protegida (`/painel` ou `/admin`) para `/trocar-senha`. <!-- state-driven -->
2. WHEN o usuário envia nova senha válida em `/trocar-senha` THEN o sistema SHALL atualizar a senha, limpar `force_password_change` e redirecionar para a área do seu papel (/painel ou /admin). <!-- event-driven -->
3. IF a nova senha violar a política (mínimo 8 caracteres, com letra e número) THEN o sistema SHALL exibir erro de validação e NÃO concluir a troca. <!-- unwanted-behavior -->
4. IF o usuário tentar usar a senha-ID antiga após a troca THEN o sistema SHALL rejeitar o login (senha expirada). <!-- unwanted-behavior -->

**Independent Test**: Usuário criado com flag → login → forçado a `/trocar-senha`; troca com senha válida → 302 `/painel`/`/admin`; relogin com senha antiga → erro; relogin com nova → OK.

---

### P1: RBAC de rotas por papel ⭐ MVP

**User Story**: Como sistema, quero liberar rota apenas ao papel certo, de modo
que nenhum usuário cruze para área que não lhe pertence (RF-031).

**Why P1**: Segurança em profundidade; decisão de permissão no servidor (SECURITY.md).

**Acceptance Criteria**:

1. WHEN uma sessão autenticada com papel admin acessa `/painel` THEN o sistema SHALL redirecionar para `/admin`. <!-- event-driven -->
2. WHEN uma sessão autenticada com papel MEMBRO acessa `/admin` THEN o sistema SHALL redirecionar para `/login/admin`. <!-- event-driven -->
3. WHILE não autenticado o sistema SHALL permitir acesso público apenas às rotas públicas (`/`, `/eventos`, `/doacao`, `/login`, `/login/admin`, `/trocar-senha`, assets). <!-- state-driven -->

**Independent Test**: Sessão admin → `/painel` → 302 `/admin`; sessão membro → `/admin` → 302 `/login/admin`; rota pública sem sessão → 200.

---

## Edge Cases

- IF o token da sessão estiver expirado/inválido em rota protegida THEN o sistema SHALL redirecionar para o login da área. <!-- unwanted-behavior -->
- IF o e-mail informado não existir THEN o sistema SHALL exibir erro genérico de credenciais (sem revelar existência). <!-- unwanted-behavior -->
- WHEN o usuário faz logout THEN o sistema SHALL encerrar a sessão e redirecionar para o login da área. <!-- event-driven -->
- WHEN a sessão não possui `app_metadata.role` THEN o sistema SHALL tratar como ausência de papel (sem área liberada). <!-- event-driven -->

---

## Requirement Traceability

| Requirement ID | Story       | Phase  | Status  |
| -------------- | ----------- | ------ | ------- |
| AUTH-01 | P1: Membro login | Execute | Execute |
| AUTH-02 | P1: Membro login | Design | Pending |
| AUTH-03 | P1: Membro login | Design | Pending |
| AUTH-04 | P1: Membro login | Design | Pending |
| AUTH-05 | P1: Admin login | Execute | Execute |
| AUTH-06 | P1: Admin login | Design | Pending |
| AUTH-07 | P1: Admin login | Design | Pending |
| AUTH-08 | P1: Admin login | Design | Pending |
| AUTH-09 | P1: 1º acesso troca | Design | Pending |
| AUTH-10 | P1: 1º acesso troca | Design | Pending |
| AUTH-11 | P1: 1º acesso troca | Design | Pending |
| AUTH-12 | P1: 1º acesso troca | Design | Pending |
| AUTH-13 | P1: RBAC de rotas | Design | Pending |
| AUTH-14 | P1: RBAC de rotas | Design | Pending |
| AUTH-15 | P1: RBAC de rotas | Design | Pending |
| AUTH-16 | Edge: sessão expirada | Design | Pending |
| AUTH-17 | Edge: e-mail inexistente | Design | Pending |
| AUTH-18 | Edge: logout | Design | Pending |
| AUTH-19 | Edge: sem papel | Design | Pending |

**Coverage:** 19 total, 0 mapped to tasks, 19 unmapped ⚠️

---

## Success Criteria

- [ ] Um membro e um admin de seed autenticam, trocam a senha-ID e alcançam suas áreas em fluxo manual (< 2 min cada).
- [ ] Rotas protegidas respondem 302 para login correto da área em todos os casos não autorizados testados.
- [ ] `npm run lint && npm run typecheck && npm run build` verdes; probes por AC passam (evidência file:line).