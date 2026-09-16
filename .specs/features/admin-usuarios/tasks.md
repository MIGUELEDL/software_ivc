# Admin Usuários/Permissões Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/admin-usuarios/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> No test infrastructure in the project (no jest, vitest, testing-library, or test scripts). Strong defaults not applicable — quality gates are lint + typecheck + build only. Probes serve as integration/e2e validation.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Service (usuarios, permissoes) | none | — (build gate only) | `src/lib/admin/*.ts` | `npm run lint && npm run typecheck` |
| API Routes | none | — (build gate only) | `src/app/api/admin/**/*.ts` | `npm run lint && npm run typecheck` |
| Pages / Components | none | — (build gate only) | `src/app/admin/**/*.tsx` | `npm run lint && npm run typecheck && npm run build` |

## Gate Check Commands

> Generated from codebase — no test runner; gates are lint/typecheck/build.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After service/route tasks | `export PATH="$HOME/.nvm/versions/node/v$(cat .nvmrc).0/bin:$PATH" && npm run lint && npm run typecheck` |
| Build | After page/integration tasks | `export PATH="$HOME/.nvm/versions/node/v$(cat .nvmrc).0/bin:$PATH" && npm run lint && npm run typecheck && npm run build` |

---

## Execution Plan

### Phase 1: Service Layer

Tasks that define business logic — no UI, no routes. T1 and T2 are independent (no deps between them).

```
T1, T2
```

### Phase 2: API Routes

HTTP endpoints consuming the service layer. T3, T4, T5 all depend on T1. T6 depends on T2.

```
T3, T4, T5, T6
```

### Phase 3: Pages

Admin UI pages and components. T7, T8 depend on T3. T9 depends on T6.

```
T7, T8, T9
```

### Phase 4: Integration + Verification

Dashboard, probes, regressões. T10 depends on T7. T11 depends on T7, T8, T9. T12 depends on T11.

```
T10, T11, T12
```

---

## Task Breakdown

### T1: Service layer — usuarios.ts

- [x] `EmailEmUsoError`, `NaoEncontradoError`, `AutoModificacaoError`, `SuperAdminProtegidoError`, `PapelInvalidoError` exported
- [x] `listarUsuarios({ role? })` calls `admin.auth.admin.listUsers()`, filters by `ADMIN_ROLES`, returns `{ users, total }`
- [x] `criarUsuario({ email, role })` calls `admin.auth.admin.createUser()` with `email_confirm: true`, `app_metadata: { role, force_password_change: true }`, generates temp password via `gerarSenhaId()`
- [x] `editarPapel(userId, role, callerId)` validates role in `ADMIN_ROLES`, blocks self-modification (`callerId === userId`), blocks SUPER_ADMIN reassignment, calls `admin.auth.admin.updateUserById()`
- [x] `redefinirSenha(userId)` generates new temp password, calls `admin.auth.admin.updateUserById()` with new password + `force_password_change: true`
- [x] No TypeScript errors

---

### T2: Service layer — permissoes.ts

**What**: Create `src/lib/admin/permissoes.ts` with permissions matrix functions (read + upsert).
**Where**: `src/lib/admin/permissoes.ts`
**Depends on**: None
**Reuses**: `createAdminClient()` from `src/lib/supabase/admin.ts`, `MODULOS` and `ADMIN_ROLES` from `src/lib/auth/rbac.ts`
**Requirement**: USR-23, USR-24, USR-25, USR-28

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `obterMatriz()` queries `permissions` table via service-role, returns `Array<{ role, module, nivel }>`
- [ ] `atualizarMatriz(updates)` validates each `nivel` in `['ler','escrever','administrar']`, validates each `role` in `ADMIN_ROLES`, validates each `module` in `MODULOS`, upserts via `ON CONFLICT (role, module) DO UPDATE SET nivel = excluded.nivel`
- [ ] Returns `{ ok: true, updated: number }`
- [ ] No TypeScript errors

**Tests**: none
**Gate**: quick

---

### T3: API route — GET/POST /api/admin/usuarios

**What**: Create route handler for listing and creating admin users.
**Where**: `src/app/api/admin/usuarios/route.ts`
**Depends on**: T1
**Reuses**: `authAdmin()` from `src/lib/admin/http.ts`, `requireAdministrar()` from `src/lib/admin/http.ts`, `erroCampos()` from `src/lib/admin/http.ts`
**Requirement**: USR-01, USR-02, USR-03, USR-04, USR-05, USR-06, USR-07, USR-08, USR-09, USR-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `GET` uses `authAdmin('usuarios')` guard, calls `listarUsuarios({ role })` from searchParams, returns 200 `{ users, total }`
- [ ] `POST` uses `requireAdministrar('usuarios')` guard, parses JSON `{ email, role }`, validates fields, calls `criarUsuario()`, returns 201 `{ id, email, role, temporaryPassword }`
- [ ] 400 `dados_invalidos` for empty email/invalid role
- [ ] 409 `email_em_uso` for duplicate email
- [ ] 403 `nao_autorizado` for insufficient permissions
- [ ] 401 `nao_autenticado` for unauthenticated
- [ ] 500 `erro_interno` fallback with `console.error`
- [ ] No TypeScript errors

**Tests**: none
**Gate**: quick

---

### T4: API route — PATCH /api/admin/usuarios/[id]

**What**: Create route handler for editing a user's role.
**Where**: `src/app/api/admin/usuarios/[id]/route.ts`
**Depends on**: T1
**Reuses**: `requireAdministrar()` from `src/lib/admin/http.ts`
**Requirement**: USR-11, USR-12, USR-13, USR-14, USR-15, USR-16, USR-17

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Uses `requireAdministrar('usuarios')` guard
- [ ] Parses JSON `{ role }`, validates in `ADMIN_ROLES`
- [ ] Calls `editarPapel(id, role, claims.sub)`, returns 200 `{ id, email, role }`
- [ ] 404 `nao_encontrado` when user doesn't exist
- [ ] 403 `auto_modificacao_nao_permitida` for self-change
- [ ] 403 `super_admin_protegido` for SUPER_ADMIN reassignment
- [ ] 400 `papel_invalido` for invalid role
- [ ] No TypeScript errors

**Tests**: none
**Gate**: quick

---

### T5: API route — POST /api/admin/usuarios/[id]/senha

**What**: Create route handler for resetting a user's password.
**Where**: `src/app/api/admin/usuarios/[id]/senha/route.ts`
**Depends on**: T1
**Reuses**: `requireAdministrar()` from `src/lib/admin/http.ts`
**Requirement**: USR-18, USR-19, USR-20, USR-21

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Uses `requireAdministrar('usuarios')` guard
- [ ] Calls `redefinirSenha(id)`, returns 200 `{ id, email, temporaryPassword }`
- [ ] 404 `nao_encontrado` when user doesn't exist
- [ ] No TypeScript errors

**Tests**: none
**Gate**: quick

---

### T6: API route — GET/PUT /api/admin/usuarios/permissoes

**What**: Create route handler for reading and updating the permissions matrix.
**Where**: `src/app/api/admin/usuarios/permissoes/route.ts`
**Depends on**: T2
**Reuses**: `requireAdministrar()` from `src/lib/admin/http.ts`
**Requirement**: USR-22, USR-23, USR-24, USR-25, USR-26, USR-27

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `GET` uses `requireAdministrar('usuarios')` guard, calls `obterMatriz()`, returns 200 `{ matrix }`
- [ ] `PUT` uses `requireAdministrar('usuarios')` guard, parses JSON `{ updates }`, validates each nivel, calls `atualizarMatriz()`, returns 200 `{ ok: true, updated }`
- [ ] 400 `nivel_invalido` for invalid nivel values
- [ ] No TypeScript errors

**Tests**: none
**Gate**: quick

---

### T7: Page — /admin/usuarios (user list)

**What**: Create the admin users list page with role filter, table, and create button.
**Where**: `src/app/admin/usuarios/page.tsx`
**Depends on**: T3
**Reuses**: denied-block pattern from `src/app/admin/relatorios/page.tsx`, `authAdmin()` pattern
**Requirement**: USR-01, USR-03, USR-04, USR-05, USR-30, USR-32

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] RSC fetches users via `GET /api/admin/usuarios` (server-side fetch or direct service call)
- [ ] Shows denied-block when user lacks `usuarios:ler`
- [ ] Table with columns: Email, Papel, Status, Criado em
- [ ] Role filter chips (all roles from `ADMIN_ROLES`) using `next/link` with `?role=` param (AD-016)
- [ ] Empty state: "Nenhum usuário cadastrado"
- [ ] Link to `/admin/usuarios/permissoes` for matrix editor
- [ ] Renders `CreateUserForm` client component
- [ ] No TypeScript errors

**Tests**: none
**Gate**: build

---

### T8: Component — CreateUserForm

**What**: Create the client component for the user creation form.
**Where**: `src/app/admin/usuarios/create-user-form.tsx`
**Depends on**: T3
**Reuses**: Form pattern from existing admin pages
**Requirement**: USR-06, USR-07, USR-08, USR-09, USR-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Form with email input + role select (options = `ADMIN_ROLES`)
- [ ] Submit calls `POST /api/admin/usuarios` via fetch
- [ ] On success: displays temporary password (copyable), shows success message
- [ ] On 409: shows "Email já está em uso"
- [ ] On 400: shows field errors
- [ ] On 403: shows "Não autorizado"
- [ ] Loading state during submission
- [ ] No TypeScript errors

**Tests**: none
**Gate**: build

---

### T9: Page — /admin/usuarios/permissoes (matrix editor)

**What**: Create the permissions matrix editor page (SUPER_ADMIN only).
**Where**: `src/app/admin/usuarios/permissoes/page.tsx`
**Depends on**: T6
**Reuses**: denied-block pattern, `requireAdministrar()` guard pattern
**Requirement**: USR-22, USR-23, USR-24, USR-25, USR-26, USR-27, USR-28

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] RSC page fetches matrix via `GET /api/admin/usuarios/permissoes`
- [ ] Shows denied-block for non-SUPER_ADMIN
- [ ] Table: roles as rows, modules as columns, cell = nivel (ler/escrever/administrar/—)
- [ ] Inline client component (`'use client'`) with selects per cell for nivel editing
- [ ] Save button calls `PUT /api/admin/usuarios/permissoes` with updated rows
- [ ] Success/error feedback after save
- [ ] No TypeScript errors

**Tests**: none
**Gate**: build

---

### T10: Dashboard card — "Usuários"

**What**: Add a "Usuários" navigation card to the admin dashboard.
**Where**: `src/app/admin/page.tsx`
**Depends on**: T7
**Reuses**: Card pattern from existing dashboard (Financeiro, Relatórios cards)
**Requirement**: USR-29

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] "Usuários" card with `Users` icon (lucide-react) linking to `/admin/usuarios`
- [ ] Card placed after Relatórios card
- [ ] No TypeScript errors

**Tests**: none
**Gate**: build

---

### T11: Probes — probes-admin-usuarios.sh

**What**: Create probe script for static + runtime validation of the usuarios module.
**Where**: `scripts/probes-admin-usuarios.sh`
**Depends on**: T7, T8, T9
**Reuses**: Probe pattern from `scripts/probes-admin-relatorios.sh`
**Requirement**: USR-01..32

**Tools**:

- MCP: NONE
**Skill**: NONE

**Done when**:

- [ ] Static checks: migration exists (N/A — no migration), RLS consistent, routes exist, pages exist, constants defined
- [ ] Runtime checks: RBAC per role with discriminators (L-009 list, L-010 create, L-011 edit role, L-012 reset password, L-013 matrix read, L-014 matrix write)
- [ ] Auth 401 unauthenticated checks
- [ ] Empty state checks
- [ ] All checks report ok/falha
- [ ] Total ok count documented

**Tests**: none
**Gate**: quick

---

### T12: Regressões + coverage matrix

**What**: Run regression probes, update coverage matrix, update STATE.md Handoff.
**Where**: `docs/coverage-matrix.md`
**Depends on**: T11
**Reuses**: Regression probe pattern from prior features
**Requirement**: USR-01..32

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] All prior regression probes pass (auth 19/0, painel 27/0, membros 139/0, etc.)
- [ ] `npm run lint && npm run typecheck && npm run build` pass
- [ ] `coverage-matrix.md` updated: RF-028 row → `admin-usuarios`, USR-01..32, status `verified`
- [ ] `validate_state.py admin-usuarios` passes (0 errors)

**Tests**: none
**Gate**: build

---

## Phase Execution Map

Phases run in sequence. Tasks within a phase run in dependency order.

### Full Dependency Diagram

```txt
T1 -> T3
T1 -> T4
T1 -> T5
T2 -> T6
T3 -> T7
T3 -> T8
T6 -> T9
T7 -> T10
T7 -> T11
T8 -> T11
T9 -> T11
T11 -> T12
```

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Service usuarios.ts | 1 file, 5 functions + errors | ✅ Granular |
| T2: Service permissoes.ts | 1 file, 2 functions | ✅ Granular |
| T3: Route GET/POST usuarios | 1 file, 2 methods | ✅ Granular |
| T4: Route PATCH [id] | 1 file, 1 method | ✅ Granular |
| T5: Route POST [id]/senha | 1 file, 1 method | ✅ Granular |
| T6: Route GET/PUT permissoes | 1 file, 2 methods | ✅ Granular |
| T7: Page usuarios list | 1 page + RSC | ✅ Granular |
| T8: CreateUserForm | 1 client component | ✅ Granular |
| T9: Page permissoes | 1 page + 1 client component | ✅ Granular |
| T10: Dashboard card | 1 file edit | ✅ Granular |
| T11: Probes | 1 script | ✅ Granular |
| T12: Regressões | 1 script run + docs | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| ---- | ----------------- | ------------- | ------ |
| T1 | None | (start) | ✅ Match |
| T2 | None | (start) | ✅ Match |
| T3 | T1 | T1 → T3 | ✅ Match |
| T4 | T1 | T1 → T4 | ✅ Match |
| T5 | T1 | T1 → T5 | ✅ Match |
| T6 | T2 | T2 → T6 | ✅ Match |
| T7 | T3 | T3 → T7 | ✅ Match |
| T8 | T3 | T3 → T8 | ✅ Match |
| T9 | T6 | T6 → T9 | ✅ Match |
| T10 | T7 | T7 → T10 | ✅ Match |
| T11 | T7, T8, T9 | T7,T8,T9 → T11 | ✅ Match |
| T12 | T11 | T11 → T12 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Service | none | none | ✅ OK |
| T2 | Service | none | none | ✅ OK |
| T3 | API Route | none | none | ✅ OK |
| T4 | API Route | none | none | ✅ OK |
| T5 | API Route | none | none | ✅ OK |
| T6 | API Route | none | none | ✅ OK |
| T7 | Page | none | none | ✅ OK |
| T8 | Component | none | none | ✅ OK |
| T9 | Page + Component | none | none | ✅ OK |
| T10 | Page (edit) | none | none | ✅ OK |
| T11 | Script | none | none | ✅ OK |
| T12 | Docs | none | none | ✅ OK |
