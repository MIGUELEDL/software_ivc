# Admin Usuários/Permissões (RBAC) Specification

## Problem Statement

O painel administrativo da IVC não possui módulo para gerenciar usuários e sua
atribuição de papéis (roles). Hoje os papéis são definidos apenas no cadastro de
membros (hardcoded `MEMBRO`) ou por seed SQL — não há UI para listar, criar,
editar ou redefinir senhas de usuários admin. A matriz de permissões (`permissions`)
também não tem interface — só pode ser alterada via SQL direto. Isso impede que
SUPER_ADMINs gerenciem acesso sem intervenção técnica.

## Goals

- [ ] Listar todos os usuários auth (email, papel, status) com filtro por papel
- [ ] Criar novos usuários admin (não-membro) com papel e senha temporária
- [ ] Editar o papel de um usuário existente (exceto auto-modificação e SUPER_ADMIN)
- [ ] Redefinir senha de qualquer usuário (force_password_change)
- [ ] Visualizar e editar a matriz de permissões (SUPER_ADMIN only)
- [ ] Dashboard card "Usuários" com navegação ao módulo

## Out of Scope

| Feature | Reason |
| --------- | -------------- |
| Desativação/remoção de usuários | MVP não requer; pode ser adicionado iterativamente |
| Atualização de email de usuário | Supabase Auth não suporta mudança de email via Admin API sem confirmação — fora do escopo MVP |
| Login/autenticação (auth) | RF-008/RF-011 — feature `auth` já implementada |
| Cadastro de membros com conta | RF-022 — `admin-membros` já cria auth user com role MEMBRO |
| Histórico de alterações de papel | Auditoria (RF-030) é feature separada |
| Convite por email | MVP usa senha temporária compartilhada; convite por email é iteração futura |
| Rate limiting de criação de usuários | Fora do escopo MVP; Supabase Auth já tem rate limits nativos |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | --------------- | --------- | ---------- |
| Listagem de usuários via `admin.auth.admin.listUsers()` | Service-role client, paginação via `perPage`/`page` | Padrão Supabase Admin API; não requer tabela adicional | y (decisão do usuário 2026-09-16) |
| Papéis disponíveis = `ADMIN_ROLES` (SECRETARIA, LIDER, FINANCEIRO, PATRIMONIAL, ADMIN, SUPER_ADMIN) | Mesmo array de `rbac.ts` | Consistente com a matriz existente; MEMBRO excluído (cadastro separado em RF-022) | y (decisão do usuário) |
| Senha temporária: 16 chars (padrão `gerarSenhaId`) | Reutilizar função existente de `membros.ts` | Já validada, gera senha com letras+números | y (agente) |
| Usuário não pode alterar seu próprio papel | Proteção contra auto-demissão | Segurança: prevê lockout acidental | y (agente) |
| SUPER_ADMIN não pode ser reatribuído via UI | ApenasSUPER_ADMIN pode gerenciarSUPER_ADMINs; reatribuição via SQL | Protege aRole mais elevada do sistema | y (agente) |
| Matriz de permissões editável apenas porSUPER_ADMIN | RLS da tabela `permissions` já restringe writes aSUPER_ADMIN | Consistente com DB; UI reflete a mesma restrição | y (decisão do usuário) |
| Cada role tem exatamente 10 rows na matriz (um por módulo) | Padrão fixo; inserção usa `ON CONFLICT DO UPDATE` | Simplifica UI; não há roles com acessos parciais por módulo no MVP | y (agente) |
| Usuários MEMBRO não aparecem na listagem admin | Membros são gerenciados em RF-022; listagem admin filtra por `ADMIN_ROLES` | Separação de responsabilidades | y (agente) |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Listagem de usuários ⭐ MVP

**User Story**: As an ADMIN, I want to list all admin users with their email, role and status so that I can manage who has access to the panel.

**Why P1**: Visibility into who has admin access is the foundation for all other user management actions.

**Acceptance Criteria**:

1. WHEN a user with `administrar` on `usuarios` navigates to `/admin/usuarios` THEN the system SHALL display a table with columns: Email, Papel, Status (ativo/inativo), data de criação  <!-- event-driven -->
2. WHEN a user with `administrar` on `usuarios` requests `GET /api/admin/usuarios` THEN the system SHALL return a JSON object `{ users: Array<{ id, email, role, createdAt, lastSignInAt }>, total: number }` listing all auth users whose role is in `ADMIN_ROLES`  <!-- event-driven -->
3. WHEN the request includes `?role=ADMIN` query param THEN the system SHALL filter results to users with that role only  <!-- event-driven -->
4. WHEN a user with only `ler` on `usuarios` (not possible per current matrix — only ADMIN/SUPER_ADMIN have `usuarios`) requests the list THEN the system SHALL return 403 `{ error: "nao_autorizado" }`  <!-- event-driven -->
5. WHEN there are no admin users THEN the system SHALL return `{ users: [], total: 0 }`  <!-- event-driven -->

### P2: Criação de usuário admin

**User Story**: As a SUPER_ADMIN, I want to create a new admin user with a specific role and auto-generated password so that new staff can access the panel.

**Why P1**: Admins need to onboard new users (secretaries, finance staff, leaders) without SQL.

**Acceptance Criteria**:

6. WHEN a user with `administrar` on `usuarios` submits `POST /api/admin/usuarios` with `{ email, role }` THEN the system SHALL create an auth user via `admin.auth.admin.createUser()` with `email_confirm: true`, `app_metadata: { role, force_password_change: true }`, and a randomly generated 16-char password  <!-- event-driven -->
7. WHEN the creation succeeds THEN the system SHALL return 201 `{ id, email, role, temporaryPassword }` with the generated password  <!-- event-driven -->
8. WHEN the email is already registered in Supabase Auth THEN the system SHALL return 409 `{ error: "email_em_uso" }`  <!-- unwanted-behavior -->
9. WHEN the email is empty, invalid format, or the role is not in `ADMIN_ROLES` THEN the system SHALL return 400 `{ error: "dados_invalidos", campos: { <field>: "<message>" } }`  <!-- unwanted-behavior -->
10. WHEN a user with only `ler` on `usuarios` submits the creation THEN the system SHALL return 403 `{ error: "nao_autorizado" }`  <!-- unwanted-behavior -->

### P3: Edição de papel (role)

**User Story**: As a SUPER_ADMIN, I want to change a user's role so that access levels match their current responsibilities.

**Why P2**: Role changes are common (promotion, department transfer); currently requires SQL.

**Acceptance Criteria**:

11. WHEN a user with `administrar` on `usuarios` submits `PATCH /api/admin/usuarios/[id]` with `{ role }` THEN the system SHALL update `app_metadata.role` via `admin.auth.admin.updateUserById()`  <!-- event-driven -->
12. WHEN the update succeeds THEN the system SHALL return 200 `{ id, email, role }` with the updated role  <!-- event-driven -->
13. WHEN the target user does not exist THEN the system SHALL return 404 `{ error: "nao_encontrado" }`  <!-- unwanted-behavior -->
14. WHEN the caller attempts to change their own role THEN the system SHALL return 403 `{ error: "auto_modificacao_nao_permitida" }`  <!-- unwanted-behavior -->
15. WHEN the caller attempts to change a SUPER_ADMIN's role THEN the system SHALL return 403 `{ error: "super_admin_protegido" }`  <!-- unwanted-behavior -->
16. WHEN the role is not in `ADMIN_ROLES` THEN the system SHALL return 400 `{ error: "papel_invalido" }`  <!-- unwanted-behavior -->
17. WHEN a user with only `ler` on `usuarios` submits the update THEN the system SHALL return 403 `{ error: "nao_autorizado" }`  <!-- unwanted-behavior -->

### P4: Redefinição de senha

**User Story**: As an ADMIN, I want to reset a user's password so that locked-out or compromised accounts can regain access.

**Why P2**: Password resets are a basic admin function; force_password_change ensures security.

**Acceptance Criteria**:

18. WHEN a user with `administrar` on `usuarios` submits `POST /api/admin/usuarios/[id]/senha` THEN the system SHALL generate a new 16-char temporary password, update via `admin.auth.admin.updateUserById()`, and set `force_password_change: true` in `app_metadata`  <!-- event-driven -->
19. WHEN the reset succeeds THEN the system SHALL return 200 `{ id, email, temporaryPassword }`  <!-- event-driven -->
20. WHEN the target user does not exist THEN the system SHALL return 404 `{ error: "nao_encontrado" }`  <!-- unwanted-behavior -->
21. WHEN a user with only `ler` on `usuarios` submits the reset THEN the system SHALL return 403 `{ error: "nao_autorizado" }`  <!-- unwanted-behavior -->

### P5: Matriz de permissões

**User Story**: As a SUPER_ADMIN, I want to view and edit the permissions matrix (role × module → level) so that I can adjust access without writing SQL.

**Why P3**: The matrix is the core of RBAC; editing it via SQL is error-prone and requires technical knowledge.

**Acceptance Criteria**:

22. WHEN a SUPER_ADMIN navigates to `/admin/usuarios/permissoes` THEN the system SHALL display a table with roles as rows, modules as columns, and cell values showing the current `nivel` (ler/escrever/administrar/—)  <!-- event-driven -->
23. WHEN a SUPER_ADMIN requests `GET /api/admin/usuarios/permissoes` THEN the system SHALL return the full matrix as `{ matrix: Array<{ role, module, nivel }> }`  <!-- event-driven -->
24. WHEN a SUPER_ADMIN submits `PUT /api/admin/usuarios/permissoes` with `{ updates: Array<{ role, module, nivel }> }` THEN the system SHALL upsert each row in the `permissions` table using `ON CONFLICT (role, module) DO UPDATE SET nivel = excluded.nivel`  <!-- event-driven -->
25. WHEN the PUT succeeds THEN the system SHALL return 200 `{ ok: true, updated: number }`  <!-- event-driven -->
26. WHEN a non-SUPER_ADMIN user requests the matrix endpoints THEN the system SHALL return 403 `{ error: "nao_autorizado" }`  <!-- unwanted-behavior -->
27. WHEN the `nivel` value is not `ler`, `escrever`, or `administrar` THEN the system SHALL return 400 `{ error: "nivel_invalido" }`  <!-- unwanted-behavior -->
28. The system SHALL define `ADMIN_ROLES` as the fixed set SECRETARIA, LIDER, FINANCEIRO, PATRIMONIAL, ADMIN, SUPER_ADMIN and `MODULOS` as the fixed set dashboard, membros, igrejas, eventos, patrimonio, financeiro, relatorios, usuarios, configuracoes, auditoria  <!-- ubiquitous -->

### P6: Integração dashboard e RBAC

**User Story**: As an ADMIN, I want the users module accessible from the dashboard and protected by the role matrix, so that access control is consistent.

**Why P2**: The module must be discoverable and governed by the same matrix as other admin modules.

**Acceptance Criteria**:

29. WHEN a user with `ler` on `usuarios` lands on `/admin` THEN the system SHALL show a "Usuários" navigation card linking to `/admin/usuarios`  <!-- event-driven -->
30. WHEN a user without `usuarios` in the matrix (e.g. SECRETARIA, FINANCEIRO) navigates to `/admin/usuarios` THEN the system SHALL show the access-denied block (page)  <!-- event-driven -->
31. WHEN an unauthenticated user calls any `/api/admin/usuarios/*` endpoint THEN the system SHALL return 401 `{ error: "nao_autenticado" }`  <!-- unwanted-behavior -->
32. WHEN a user with `administrar` on `usuarios` navigates to `/admin/usuarios` THEN the system SHALL display a button/link to the permissions matrix page (`/admin/usuarios/permissoes`)  <!-- event-driven -->

## Edge Cases

- Email já existe no Supabase Auth → 409 `email_em_uso` (tratado na criação).
- Role inválida (string fora de `ADMIN_ROLES`) → 400 `papel_invalido`.
- Usuário tenta mudar seu próprio papel → 403 `auto_modificacao_nao_permitida`.
- Usuário tenta reatribuir SUPER_ADMIN → 403 `super_admin_protegido`.
- Nenhum usuário admin cadastrado → tabela vazia com mensagem "Nenhum usuário cadastrado".
- Matriz de permissões com nível inválido → 400 `nivel_invalido`.
- Usuário MEMBRO não aparece na listagem admin → filtrado por `ADMIN_ROLES`.
- Página `/admin/usuarios` sem permissão `usuarios:ler` → denied-block (padrão do painel).

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| USR-01 | P1: Tabela de listagem com Email/Papel/Status/Criação | Design | Pending |
| USR-02 | P1: GET `/api/admin/usuarios` retorna JSON users+total | Design | Pending |
| USR-03 | P1: Filtro por role via query param | Design | Pending |
| USR-04 | P1: 403 sem permissão `usuarios:administrar` | Design | Pending |
| USR-05 | P1: Lista vazia quando nenhum admin user | Design | Pending |
| USR-06 | P2: POST cria auth user com role + senha temporária | Design | Pending |
| USR-07 | P2: Resposta 201 com id, email, role, temporaryPassword | Design | Pending |
| USR-08 | P2: 409 `email_em_uso` | Design | Pending |
| USR-09 | P2: 400 `dados_invalidos` por campo | Design | Pending |
| USR-10 | P2: 403 sem permissão `usuarios:administrar` | Design | Pending |
| USR-11 | P3: PATCH atualiza `app_metadata.role` | Design | Pending |
| USR-12 | P3: Resposta 200 com id, email, role atualizado | Design | Pending |
| USR-13 | P3: 404 `nao_encontrado` | Design | Pending |
| USR-14 | P3: 403 `auto_modificacao_nao_permitida` | Design | Pending |
| USR-15 | P3: 403 `super_admin_protegido` | Design | Pending |
| USR-16 | P3: 400 `papel_invalido` | Design | Pending |
| USR-17 | P3: 403 sem permissão `usuarios:administrar` | Design | Pending |
| USR-18 | P4: POST gera senha + atualiza force_password_change | Design | Pending |
| USR-19 | P4: Resposta 200 com id, email, temporaryPassword | Design | Pending |
| USR-20 | P4: 404 `nao_encontrado` | Design | Pending |
| USR-21 | P4: 403 sem permissão `usuarios:administrar` | Design | Pending |
| USR-22 | P5: Tabela matriz (roles × modules × nivel) | Design | Pending |
| USR-23 | P5: GET retorna matrix completa | Design | Pending |
| USR-24 | P5: PUT upsert rows na tabela `permissions` | Design | Pending |
| USR-25 | P5: Resposta 200 com ok + updated count | Design | Pending |
| USR-26 | P5: 403 para non-SUPER_ADMIN | Design | Pending |
| USR-27 | P5: 400 `nivel_invalido` | Design | Pending |
| USR-28 | P5: Enum fixo `ADMIN_ROLES` e `MODULOS` | Design | Pending |
| USR-29 | P6: Card "Usuários" no dashboard | Design | Pending |
| USR-30 | P6: Denied-block para usuários sem permissão | Design | Pending |
| USR-31 | P6: 401 unauthenticated nas rotas | Design | Pending |
| USR-32 | P6: Link para matriz de permissões na página | Design | Pending |

**Coverage:** 32 total, 0 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] ADMIN/SUPER_ADMIN listam, criam, editam papéis e redefinem senhas de usuários admin
- [ ] SUPER_ADMIN visualiza e edita a matriz de permissões via UI
- [ ] RBAC guards protegem todas as rotas; MEMBRO e não-autenticados bloqueados
- [ ] Usuário não pode auto-modificar papel nem reatribuir SUPER_ADMIN
- [ ] Dashboard card "Usuários" acessível para quem tem permissão
- [ ] Todos os gates passam: lint, typecheck, build, probe suite
