# Tasks: admin-auditoria (RF-030)

## Execution Plan

### Phase 1: DB + Service

```
T1 -> T2
```

### Phase 2: API + Page

```
T2 -> T3 -> T4
T2 -> T5
```

### Phase 3: Instrumentation

```
T2 -> T6
T2 -> T7
T2 -> T8
T2 -> T9
T2 -> T10
T2 -> T11
T4 -> T12
```

### Phase 4: Probes & Verification

```
T1 -> T13
T12 -> T13
T13 -> T14
```

---

## Task Breakdown

### T1: Migration — audit_logs table

**What**: Create `audit_logs` table with RLS and indexes.
**Where**: `supabase/migrations/0017_audit_logs.sql`
**Depends on**: None
**Reuses**: `can_access()` function from 0008
**Requirement**: AUD-01..06

**Tools**:

- MCP: Supabase
- Skill: NONE

**Done when**:

- [x] `audit_logs` table created with columns: id (uuid PK), autor (uuid), acao (text), entidade (text), entidade_id (text), timestamp (timestamptz), ip (inet), user_agent (text), payload (jsonb)
- [x] Indexes on timestamp DESC, entidade, acao
- [x] RLS enabled: SELECT/INSERT for authenticated with `can_access('auditoria', 'ler')`
- [x] No UPDATE/DELETE policies (immutability)
- [x] Applied to dev `[REDACTED_PROJECT_REF]`

**Tests**: none
**Gate**: build

---

### T2: Service layer — auditoria.ts

**What**: Create service layer for registering and listing audit logs.
**Where**: `src/lib/admin/auditoria.ts`
**Depends on**: T1
**Reuses**: `createServerClient` from `src/lib/supabase/server.ts`
**Requirement**: AUD-01..06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Types: `AuditLog`, `AuditoriaFiltros`
- [x] `extrairInfoRequest(request)` extracts IP and user_agent
- [x] `registrarAuditoria(params)` inserts log
- [x] `listarAuditoria(filtros)` returns filtered logs with total
- [x] No TypeScript errors

**Tests**: none
**Gate**: build

---

### T3: API route — GET /api/admin/auditoria

**What**: Create API route for listing audit logs with filters.
**Where**: `src/app/api/admin/auditoria/route.ts`
**Depends on**: T2
**Reuses**: `authAdmin` from `src/lib/admin/http.ts`
**Requirement**: AUD-07..12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] GET handler with `authAdmin('auditoria')` guard
- [x] Query params: data_inicio, data_fim, acao, entidade, offset, limit
- [x] Returns 200 with `{ logs, total }`
- [x] No TypeScript errors

**Tests**: none
**Gate**: build

---

### T4: Page — /admin/auditoria

**What**: Create audit page with table, filters, and pagination.
**Where**: `src/app/admin/auditoria/page.tsx`
**Depends on**: T3
**Reuses**: `can` from `src/lib/auth/rbac.ts`
**Requirement**: AUD-13..17

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Server component with RBAC guard `can(papel, 'auditoria', 'ler')`
- [x] Table with columns: Data/Hora, Autor, Ação, Entidade, ID, IP
- [x] Filters: período (data_inicio/fim), ação (select), entidade (select)
- [x] Pagination: 20 items per page
- [x] Empty state: "Nenhum log de auditoria encontrado"
- [x] No TypeScript errors

**Tests**: none
**Gate**: build

---

### T5: API route — POST /api/admin/auditoria

**What**: Create API route for creating audit logs (internal use).
**Where**: `src/app/api/admin/auditoria/route.ts`
**Depends on**: T2
**Reuses**: `requireAdministrar` from `src/lib/admin/http.ts`
**Requirement**: AUD-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] POST handler with `requireAdministrar('auditoria')` guard
- [x] Body validation: acao (required), entidade (required), entidade_id (optional), payload (optional)
- [x] Returns 201 with `{ ok: true }`
- [x] No TypeScript errors

**Tests**: none
**Gate**: build

---

### T6: Instrument membros handlers

**What**: Add audit logging to membros route handlers.
**Where**: `src/app/api/admin/membros/route.ts`, `src/app/api/admin/membros/[id]/route.ts`
**Depends on**: T2
**Reuses**: `registrarAuditoria` from auditoria.ts, `extrairInfoRequest`
**Requirement**: AUD-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] POST /api/admin/membros logs "criar" after success
- [x] POST /api/admin/membros/[id]/status logs "editar" after success
- [x] POST /api/admin/membros/[id]/dados logs "editar" after success
- [x] DELETE /api/admin/membros/[id] logs "excluir" after success
- [x] Each log includes autor, acao, entidade_id, ip, user_agent
- [x] No TypeScript errors

**Tests**: none
**Gate**: build

---

### T7: Instrument eventos handlers

**What**: Add audit logging to eventos route handlers.
**Where**: `src/app/api/admin/eventos/route.ts`, `src/app/api/admin/eventos/[id]/route.ts`
**Depends on**: T2
**Reuses**: `registrarAuditoria` from auditoria.ts
**Requirement**: AUD-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] POST /api/admin/eventos logs "criar" after success
- [ ] PATCH /api/admin/eventos/[id] logs "editar" after success
- [ ] Each log includes autor, acao, entidade_id, ip, user_agent
- [ ] No TypeScript errors

**Tests**: none
**Gate**: build

---

### T8: Instrument patrimonio handlers

**What**: Add audit logging to patrimonio route handlers.
**Where**: `src/app/api/admin/patrimonio/route.ts`, `src/app/api/admin/patrimonio/[id]/route.ts`
**Depends on**: T2
**Reuses**: `registrarAuditoria` from auditoria.ts
**Requirement**: AUD-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] POST /api/admin/patrimonio logs "criar" after success
- [ ] PATCH /api/admin/patrimonio/[id] logs "editar" or "baixar" after success
- [ ] Each log includes autor, acao, entidade_id, ip, user_agent
- [ ] No TypeScript errors

**Tests**: none
**Gate**: build

---

### T9: Instrument financeiro handlers

**What**: Add audit logging to financeiro route handlers.
**Where**: `src/app/api/admin/financeiro/route.ts`, `src/app/api/admin/financeiro/[id]/route.ts`
**Depends on**: T2
**Reuses**: `registrarAuditoria` from auditoria.ts
**Requirement**: AUD-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] POST /api/admin/financeiro logs "criar" after success
- [ ] PATCH /api/admin/financeiro/[id] logs "editar" after success
- [ ] POST /api/admin/financeiro/[id]/cancelar logs "cancelar" after success
- [ ] Each log includes autor, acao, entidade_id, ip, user_agent
- [ ] No TypeScript errors

**Tests**: none
**Gate**: build

---

### T10: Instrument usuarios handlers

**What**: Add audit logging to usuarios route handlers.
**Where**: `src/app/api/admin/usuarios/route.ts`, `src/app/api/admin/usuarios/[id]/route.ts`
**Depends on**: T2
**Reuses**: `registrarAuditoria` from auditoria.ts
**Requirement**: AUD-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] POST /api/admin/usuarios logs "criar" after success
- [ ] PATCH /api/admin/usuarios/[id] logs "editar" after success
- [ ] Each log includes autor, acao, entidade_id, ip, user_agent
- [ ] No TypeScript errors

**Tests**: none
**Gate**: build

---

### T11: Instrument configuracoes handler

**What**: Add audit logging to configuracoes route handler.
**Where**: `src/app/api/admin/configuracoes/route.ts`
**Depends on**: T2
**Reuses**: `registrarAuditoria` from auditoria.ts
**Requirement**: AUD-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] PATCH /api/admin/configuracoes logs "atualizar" after success
- [ ] Log includes autor, acao, entidade ("configuracoes"), ip, user_agent
- [ ] No TypeScript errors

**Tests**: none
**Gate**: build

---

### T12: Dashboard card

**What**: Add "Auditoria" card to admin dashboard.
**Where**: `src/app/admin/page.tsx`
**Depends on**: T4
**Reuses**: `can` from `src/lib/auth/rbac.ts`
**Requirement**: AUD-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Card "Auditoria" appears in dashboard
- [ ] Card links to /admin/auditoria
- [ ] Card only visible when `can(papel, 'auditoria', 'ler')` is true
- [ ] No TypeScript errors

**Tests**: none
**Gate**: build

---

### T13: Create probes script

**What**: Create `scripts/probes-admin-auditoria.sh` with static and runtime tests.
**Where**: `scripts/probes-admin-auditoria.sh`
**Depends on**: T1-T12
**Reuses**: Pattern from other probe scripts
**Requirement**: All

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Static tests: migration, RLS, service, routes, page
- [ ] Runtime tests: login, create member, verify log, filters, pagination
- [ ] EXIT trap for cleanup
- [ ] Script passes without errors

**Tests**: none
**Gate**: bash

---

### T14: Update STATE.md

**What**: Update .specs/STATE.md with feature handoff.
**Where**: `.specs/STATE.md`
**Depends on**: T13
**Reuses**: validate_state.py
**Requirement**: All

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Handoff section updated with RF-030 status
- [ ] Commits listed
- [ ] validate_state.py passes

**Tests**: none
**Gate**: python

---

## Test Coverage Matrix

| Requirement | Tests | Status |
|-------------|-------|--------|
| AUD-01 | T1, T2, T3, T5, T6-T11 | Pending |
| AUD-02 | T1 | Pending |
| AUD-03 | T1 | Pending |
| AUD-04 | T1 | Pending |
| AUD-05 | T1 | Pending |
| AUD-06 | T1 | Pending |
| AUD-07 | T3, T4 | Pending |
| AUD-08 | T3, T4 | Pending |
| AUD-09 | T3, T4 | Pending |
| AUD-10 | T3, T4 | Pending |
| AUD-11 | T3, T4 | Pending |
| AUD-12 | T3, T4 | Pending |
| AUD-13 | T4, T12 | Pending |
| AUD-14 | T4 | Pending |
| AUD-15 | T4 | Pending |
| AUD-16 | T4 | Pending |
| AUD-17 | T4 | Pending |
| AUD-18 | T6-T11 | Pending |
| AUD-19 | T6-T11 | Pending |
| AUD-20 | T6-T11 | Pending |

---

## Gate Check Commands

```bash
# Before each commit
export PATH="$HOME/.nvm/versions/node/v$(cat .nvmrc).0/bin:$PATH"
npm run lint
npm run typecheck
npm run build

# After all tasks
python3 .opencode/skills/tlc-spec-driven/scripts/validate_spec.py .specs/features/admin-auditoria/spec.md
python3 .opencode/skills/tlc-spec-driven/scripts/validate_tasks.py .specs/features/admin-auditoria/tasks.md
python3 .opencode/skills/tlc-spec-driven/scripts/validate_state.py admin-auditoria

# Probes
bash scripts/probes-admin-auditoria.sh
```
