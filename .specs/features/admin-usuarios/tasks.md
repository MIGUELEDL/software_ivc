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

**Depends on**: None

- [x] `EmailEmUsoError`, `NaoEncontradoError`, `AutoModificacaoError`, `SuperAdminProtegidoError`, `PapelInvalidoError` exported
- [x] `listarUsuarios({ role? })` calls `admin.auth.admin.listUsers()`, filters by `ADMIN_ROLES`, returns `{ users, total }`
- [x] `criarUsuario({ email, role })` calls `admin.auth.admin.createUser()` with `email_confirm: true`, `app_metadata: { role, force_password_change: true }`, generates temp password via `gerarSenhaId()`
- [x] `editarPapel(userId, role, callerId)` validates role in `ADMIN_ROLES`, blocks self-modification (`callerId === userId`), blocks SUPER_ADMIN reassignment, calls `admin.auth.admin.updateUserById()`
- [x] `redefinirSenha(userId)` generates new temp password, calls `admin.auth.admin.updateUserById()` with new password + `force_password_change: true`
- [x] No TypeScript errors


**Tests**: none
**Gate**: build

---

### T2: Service layer — permissoes.ts

**Depends on**: None

- [x] `obterMatriz()` queries `permissions` table via service-role, returns `Array<{ role, module, nivel }>`
- [x] `atualizarMatriz(updates)` validates each `nivel` in `['ler','escrever','administrar']`, validates each `role` in `ADMIN_ROLES`, validates each `module` in `MODULOS`, upserts via `ON CONFLICT (role, module) DO UPDATE SET nivel = excluded.nivel`
- [x] Returns `{ ok: true, updated: number }`
- [x] No TypeScript errors


**Tests**: none
**Gate**: build

---

### T3: API route — GET/POST /api/admin/usuarios

**Depends on**: T1

- [x] `GET` uses `authAdmin('usuarios')` guard, calls `listarUsuarios({ role })` from searchParams, returns 200 `{ users, total }`
- [x] `POST` uses `requireAdministrar('usuarios')` guard, parses JSON `{ email, role }`, validates fields, calls `criarUsuario()`, returns 201 `{ id, email, role, temporaryPassword }`
- [x] 400 `dados_invalidos` for empty email/invalid role
- [x] 409 `email_em_uso` for duplicate email
- [x] 403 `nao_autorizado` for insufficient permissions
- [x] 401 `nao_autenticado` for unauthenticated
- [x] 500 `erro_interno` fallback with `console.error`
- [x] No TypeScript errors


**Tests**: none
**Gate**: build

---

### T4: API route — PATCH /api/admin/usuarios/[id]

**Depends on**: T1

- [x] Uses `requireAdministrar('usuarios')` guard
- [x] Parses JSON `{ role }`, validates in `ADMIN_ROLES`
- [x] Calls `editarPapel(id, role, claims.sub)`, returns 200 `{ id, email, role }`
- [x] 404 `nao_encontrado` when user doesn't exist
- [x] 403 `auto_modificacao_nao_permitida` for self-change
- [x] 403 `super_admin_protegido` for SUPER_ADMIN reassignment
- [x] 400 `papel_invalido` for invalid role
- [x] No TypeScript errors


**Tests**: none
**Gate**: build

---

### T5: API route — POST /api/admin/usuarios/[id]/senha

**Depends on**: T1

- [x] Uses `requireAdministrar('usuarios')` guard
- [x] Calls `redefinirSenha(id)`, returns 200 `{ id, email, temporaryPassword }`
- [x] 404 `nao_encontrado` when user doesn't exist
- [x] No TypeScript errors


**Tests**: none
**Gate**: build

---

### T6: API route — GET/PUT /api/admin/usuarios/permissoes

**Depends on**: T2

- [x] `GET` uses `requireAdministrar('usuarios')` guard, calls `obterMatriz()`, returns 200 `{ matrix }`
- [x] `PUT` uses `requireAdministrar('usuarios')` guard, parses JSON `{ updates }`, validates each nivel, calls `atualizarMatriz()`, returns 200 `{ ok: true, updated }`
- [x] 400 `nivel_invalido` for invalid nivel values
- [x] No TypeScript errors


**Tests**: none
**Gate**: build

---

### T7: Page — /admin/usuarios (user list)

**Depends on**: T3

- [x] RSC fetches users via `listarUsuarios()` (server-side)
- [x] Shows denied-block when user lacks `usuarios:ler`
- [x] Table with columns: Email, Papel, Status, Criado em
- [x] Role filter chips (all roles from `ADMIN_ROLES`) using `next/link` with `?role=` param (AD-016)
- [x] Empty state: "Nenhum usuário cadastrado"
- [x] Link to `/admin/usuarios/permissoes` for matrix editor
- [x] Renders `CreateUserForm` client component
- [x] No TypeScript errors


**Tests**: none
**Gate**: build

---

### T8: Component — CreateUserForm

**Depends on**: T3

- [x] Form with email input + role select (options = `ADMIN_ROLES`)
- [x] Submit calls `POST /api/admin/usuarios` via fetch
- [x] On success: displays temporary password (copyable), shows success message
- [x] On 409: shows "Email já está em uso"
- [x] On 400: shows field errors
- [x] On 403: shows "Não autorizado"
- [x] Loading state during submission
- [x] No TypeScript errors


**Tests**: none
**Gate**: build

---

### T9: Page — /admin/usuarios/permissoes (matrix editor)

**Depends on**: T6

- [x] RSC page fetches matrix via `obterMatriz()`
- [x] Shows denied-block for non-SUPER_ADMIN
- [x] Table: roles as rows, modules as columns, cell = nivel (ler/escrever/administrar/—)
- [x] `MatrixEditor` client component with inline selects per cell
- [x] Save button calls `PUT /api/admin/usuarios/permissoes` with updated rows
- [x] Success/error feedback after save
- [x] No TypeScript errors


**Tests**: none
**Gate**: build

---

### T10: Dashboard card — "Usuários"

**Depends on**: T7

- [x] "Usuários" card with `Users` icon (lucide-react) linking to `/admin/usuarios`
- [x] Card placed after Relatórios card
- [x] No TypeScript errors


**Tests**: none
**Gate**: build

---

### T11: Probes — probes-admin-usuarios.sh

**Depends on**: T7, T8, T9

- [x] Static checks: service files exist with functions, routes exist with guards, pages exist with expected patterns, dashboard card exists
- [x] Runtime checks: RBAC per role with discriminators (L-009 list, L-010 create, L-011 edit role, L-012 reset password, L-013 matrix read, L-014 matrix write)
- [x] Auth 401 unauthenticated checks
- [x] All static checks report ok (13/13)
- [x] Total ok count documented


**Tests**: none
**Gate**: build

---

### T12: Regressões + coverage matrix

**Depends on**: T11

- [x] Auth probes pass: 19/0
- [x] `npm run lint && npm run typecheck && npm run build` pass
- [x] `coverage-matrix.md` updated: RF-028 row → `admin-usuarios`, USR-01..32, status `verified`
- [x] `STATE.md` Handoff updated


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
