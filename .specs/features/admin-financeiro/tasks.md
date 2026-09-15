# Admin Financeiro Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/admin-financeiro/design.md`
**Status**: Approved

---

## Test Coverage Matrix

> Generated from codebase. No formal test framework (QA-001: enters Phase 10). Verification via probe scripts (static + runtime) + build gates. Guidelines: `AGENTS.md` (SDD workflow gates).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Migration / DB schema | static probes | Schema structure, RLS policies, CHECK constraints, seed | `supabase/migrations/0014_*.sql` | `probes-admin-financeiro.sh` (static section) |
| Service layer | runtime probes | CRUD operations: create, read, update, cancel, errors | `src/lib/admin/financeiro.ts` | `probes-admin-financeiro.sh` (runtime section) |
| Validation | runtime probes | 400 per field for each invalid input | `src/lib/admin/validacao.ts` | `probes-admin-financeiro.sh` (runtime section) |
| API routes | runtime probes | Happy path + error paths (400/403/404) for each endpoint | `src/app/api/admin/financeiro/` | `probes-admin-financeiro.sh` (runtime section) |
| Webhook | runtime probes | POST valid/duplicate/invalid, transaction creation | `src/app/api/webhooks/mercadopago/` | `probes-admin-financeiro.sh` (runtime section) |
| UI pages | static probes | Page structure, form fields, links | `src/app/admin/financeiro/` | `probes-admin-financeiro.sh` (static section) |
| Types / config | build gate only | TypeScript compilation | `src/lib/admin/financeiro-types.ts` | `npm run typecheck` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After individual tasks | `npm run lint && npm run typecheck` |
| Build | After phase completion | `npm run build` |
| Full | After all tasks (before Verifier) | `npm run lint && npm run typecheck && npm run build && bash scripts/probes-admin-financeiro.sh && bash scripts/probes-all.sh` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Foundation (DB + Types)

T1, T2 — independent; T1 = migration, T2 = types

### Phase 2: Service + Validation

T3 (dep T1, T2), segue T4 (dep T2)

### Phase 3: API Routes

T5 (dep T3, T4) → T6 (dep T5) → T7 (dep T6); depois T8 (dep T3), T9 (dep T3)

### Phase 4: UI Pages

T10 (dep T5) → T11 (dep T10) → T12 (dep T10, T7); depois T13 (dep T9)

### Phase 5: Probes + Regression

T14 (dep T3) → T15 (dep T1..T13) → T16 (dep T15)

---

## Task Breakdown

### T1: Migration 0014 — transactions, webhook_events, cash_closes

**What**: Create `supabase/migrations/0014_financeiro.sql` with three tables, RLS policies, CHECK constraints, indexes, and idempotent seeds
**Where**: `supabase/migrations/0014_financeiro.sql`
**Depends on**: None
**Reuses**: Migration pattern from `0013_assets.sql` (table + RLS via `can_access` + CHECK + seed idempotente)
**Requirement**: FIN-04, FIN-12

**Tools**:

- MCP: `supabase` (apply migration to dev `[REDACTED_PROJECT_REF]`)
- Skill: NONE

**Done when**:

- [x] `transactions` table created with CHECKs (tipo, metodo, status), DEFAULTs, FKs
- [x] `webhook_events` table created with UNIQUE on `event_id`
- [x] `cash_closes` table created with GENERATED `saldo` column
- [x] RLS enabled: `transactions` SELECT/INSERT/UPDATE via `can_access('financeiro', ...)` (ler/escrever), no DELETE
- [x] RLS enabled: `cash_closes` SELECT/INSERT via `can_access('financeiro', ...)` (ler/escrever), no UPDATE/DELETE
- [x] Indexes: `idx_transactions_status`, `idx_transactions_data`, `idx_transactions_external_ref` (partial)
- [x] Seed idempotente: 1 RECEITA (Dízimo seed, 100.00, PIX, PENDENTE) + 1 DESPESA (Aluguel seed, 500.00, PENDENTE) + user `financeiro.teste@ivc.local` (role FINANCEIRO)
- [ ] Migration applied to dev `[REDACTED_PROJECT_REF]` via MCP

**Tests**: static probes (migration structure, in T15)
**Gate**: build (migration applied, `supabase_list_tables` verifies)

**Commit**: `feat(financeiro): migration 0014 — transactions, webhook_events, cash_closes`

---

### T2: Types module — financeiro-types.ts

**What**: Create `src/lib/admin/financeiro-types.ts` with pure types and constants (no server imports)
**Where**: `src/lib/admin/financeiro-types.ts`
**Depends on**: None
**Reuses**: Pattern from `asset-types.ts` (pure module, client-safe)
**Requirement**: FIN-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `TIPOS_LANCAMENTO = ["RECEITA", "DESPESA"] as const` exported
- [x] `STATUS_LANCAMENTO = ["PENDENTE", "CONCILIADO", "CANCELADO"] as const` exported
- [x] `METODOS_PAGAMENTO = ["PIX", "CARTAO", "DINHEIRO", "TRANSFERENCIA"] as const` exported
- [x] Interfaces: `Lancamento`, `LancamentoDados`, `LancamentoPatch`, `FechamentoCaixa`, `WebhookEventPayload`
- [x] No `@/lib/supabase/*` imports (pure module)
- [x] `npm run typecheck` passes

**Tests**: build gate (types)
**Gate**: quick (`npm run typecheck`)

**Commit**: `feat(financeiro): tipos e constantes puros para módulo financeiro`

---

### T3: Service layer — financeiro.ts

**What**: Implement `src/lib/admin/financeiro.ts` with CRUD operations, domain errors, and cash close logic
**Where**: `src/lib/admin/financeiro.ts`
**Depends on**: T1, T2
**Reuses**: Pattern from `assets.ts` / `eventos.ts` (createServerClient, `.single()`, domain error classes, PATCH parcial)
**Requirement**: FIN-01, FIN-05, FIN-09, FIN-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `LancamentoNaoEncontradoError` class exported
- [ ] `LancamentoConciliadoError` class exported
- [ ] `listarLancamentos(filtros?)` — query com filtros opcionais (tipo, status, data_inicio, data_fim, busca), ORDER BY data DESC
- [ ] `buscarLancamento(id)` — SELECT + `.single()`, throws `LancamentoNaoEncontradoError` if null
- [ ] `criarLancamento(dados)` — INSERT, returns created row
- [ ] `atualizarLancamento(id, patch)` — SELECT first (check status ≠ CONCILIADO), then UPDATE parcial, throws `LancamentoConciliadoError` if CONCILIADO
- [ ] `cancelarLancamento(id)` — SELECT first (check status = PENDENTE), then UPDATE status=CANCELADO, throws if not PENDENTE
- [ ] `fecharCaixa()` — SELECT sum/count of CONCILIADO transactions, INSERT cash_close, UPDATE transactions with cash_close_id, return snapshot
- [ ] `listarFechamentos()` — SELECT all cash_closes ORDER BY created_at DESC
- [ ] `npm run typecheck` passes

**Tests**: runtime probes (CRUD via API, in T15)
**Gate**: quick (`npm run typecheck`)

**Commit**: `feat(financeiro): service layer — CRUD, cancelamento e fechamento de caixa`

---

### T4: Validation — validarLancamento

**What**: Add `validarLancamento` function to `src/lib/admin/validacao.ts`
**Where**: `src/lib/admin/validacao.ts` (append to existing file)
**Depends on**: T2
**Reuses**: Pattern from `validarEvento` / `validateAsset` in same file (discriminated union return, modo completo/parcial)
**Requirement**: FIN-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `validarLancamento(body, modo)` exported with return type `{ ok: true; dados: LancamentoDados } | { ok: false; campos: Record<string, string> }`
- [ ] Completo validates: `descricao` (string não vazia), `valor` (number ≥ 0), `tipo` (RECEITA|DESPESA), `metodo` (PIX|CARTAO|DINHEIRO|TRANSFERENCIA), `data` (YYYY-MM-DD válida)
- [ ] Parcial validates only fields present in body
- [ ] Error keys: `campos.descricao`, `campos.valor`, `campos.tipo`, `campos.metodo`, `campos.data`
- [ ] `npm run typecheck` passes

**Tests**: runtime probes (400 per field, in T15)
**Gate**: quick (`npm run typecheck`)

**Commit**: `feat(financeiro): validarLancamento — validação por campo`

---

### T5: API routes — POST + GET /api/admin/financeiro

**What**: Create list and create endpoints for financial entries
**Where**: `src/app/api/admin/financeiro/route.ts`
**Depends on**: T3, T4
**Reuses**: Pattern from `src/app/api/admin/assets/route.ts` (requireEscrita/authAdmin, erroCampos, try/catch domain errors, 23505→409)
**Requirement**: FIN-01, FIN-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] GET handler: `authAdmin("financeiro")` guard, reads query params (tipo, status, data_inicio, data_fim, busca), calls `listarLancamentos`, returns `{ lancamentos }`
- [ ] POST handler: `requireEscrita("financeiro")` guard, parses JSON, calls `validarLancamento(body, "completo")`, returns 400+campos if invalid, calls `criarLancamento`, returns 201 `{ lancamento }`
- [ ] Error handling: JSON parse error → 400, domain error → appropriate status, DB error → 500
- [ ] `npm run typecheck` passes

**Tests**: runtime probes (happy + error paths, in T15)
**Gate**: quick (`npm run typecheck`)

**Commit**: `feat(financeiro): API POST+GET /api/admin/financeiro`

---

### T6: API routes — GET + PATCH /api/admin/financeiro/[id]

**What**: Create detail and update endpoints for a single financial entry
**Where**: `src/app/api/admin/financeiro/[id]/route.ts`
**Depends on**: T5
**Reuses**: Pattern from `src/app/api/admin/assets/[id]/route.ts`
**Requirement**: FIN-01, FIN-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] GET handler: `authAdmin("financeiro")` guard, calls `buscarLancamento(id)`, returns 200 `{ lancamento }` or 404
- [ ] PATCH handler: `requireEscrita("financeiro")` guard, parses JSON, calls `validarLancamento(body, "parcial")`, calls `atualizarLancamento(id, patch)`, returns 200 `{ lancamento }`
- [ ] PATCH returns 400 `{ error: "transacao_conciliada" }` if LancamentoConciliadoError
- [ ] `npm run typecheck` passes

**Tests**: runtime probes (happy + error paths, in T15)
**Gate**: quick (`npm run typecheck`)

**Commit**: `feat(financeiro): API GET+PATCH /api/admin/financeiro/[id]`

---

### T7: API route — POST /api/admin/financeiro/[id]/cancelar

**What**: Create cancel endpoint (PENDENTE → CANCELADO)
**Where**: `src/app/api/admin/financeiro/[id]/cancelar/route.ts`
**Depends on**: T6
**Reuses**: Pattern from T6 (guard, domain error handling)
**Requirement**: FIN-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] POST handler: `requireEscrita("financeiro")` guard, calls `cancelarLancamento(id)`, returns 200 `{ lancamento }`
- [ ] Returns 400 `{ error: "transacao_nao_cancelavel" }` if not PENDENTE
- [ ] Returns 404 if not found
- [ ] `npm run typecheck` passes

**Tests**: runtime probes (happy + error paths, in T15)
**Gate**: quick (`npm run typecheck`)

**Commit**: `feat(financeiro): API POST /api/admin/financeiro/[id]/cancelar`

---

### T8: Webhook route — POST /api/webhooks/mercadopago

**What**: Create stub webhook endpoint that logs events and creates/updates transactions
**Where**: `src/app/api/webhooks/mercadopago/route.ts`
**Depends on**: T3
**Reuses**: Service layer from T3 (criarLancamento, buscarLancamento by external_reference)
**Requirement**: FIN-06, FIN-07, FIN-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] POST handler: NO auth guard (public endpoint)
- [ ] Parses JSON body; returns 400 `{ error: "payload_invalido" }` if invalid
- [ ] Logs event to `webhook_events` table (event_id, event_type, payload)
- [ ] Idempotent: if `event_id` already exists (UNIQUE constraint), returns 200 without duplicate
- [ ] If `action` contains "payment.created" or "payment.updated" with status "approved": creates transaction (tipo=RECEITA, método=PIX, status=CONCILIADO, external_reference from payment data) or updates existing if external_reference matches
- [ ] If payment status is not "approved": logs only, no transaction created
- [ ] Returns 200 `{ ok: true }` on success
- [ ] `npm run typecheck` passes

**Tests**: runtime probes (webhook idempotency, in T15)
**Gate**: quick (`npm run typecheck`)

**Commit**: `feat(financeiro): webhook stub /api/webhooks/mercadopago`

---

### T9: API routes — GET + POST /api/admin/financeiro/fechamento

**What**: Create cash close list and create endpoints
**Where**: `src/app/api/admin/financeiro/fechamento/route.ts`
**Depends on**: T3
**Reuses**: Service layer from T3 (fecharCaixa, listarFechamentos)
**Requirement**: FIN-09, FIN-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] GET handler: `authAdmin("financeiro")` guard, calls `listarFechamentos`, returns `{ fechamentos }`
- [ ] POST handler: `requireEscrita("financeiro")` guard, calls `fecharCaixa()`, returns 201 `{ fechamento }`
- [ ] POST returns 400 `{ error: "sem_transacoes_para_fechar" }` if no CONCILIADO transactions
- [ ] `npm run typecheck` passes

**Tests**: runtime probes (happy + error paths, in T15)
**Gate**: quick (`npm run typecheck`)

**Commit**: `feat(financeiro): API GET+POST /api/admin/financeiro/fechamento`

---

### T10: Page — /admin/financeiro (list with filters)

**What**: Create the financial entries list page with filter controls
**Where**: `src/app/admin/financeiro/page.tsx`
**Depends on**: T5
**Reuses**: Pattern from `src/app/admin/patrimonio/page.tsx` (RSC list, link to detail, empty state)
**Requirement**: FIN-01, FIN-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Page renders as RSC (server component)
- [ ] Fetches lancamentos via server-side query (not client fetch)
- [ ] Displays table: descrição, valor (formatted R$), tipo badge, método, status badge, data
- [ ] Filter controls: tipo (RECEITA/DESPESA/both), status (PENDENTE/CONCILIADO/CANCELADO), período (date range), busca (text)
- [ ] Filters update via URL search params (no client state)
- [ ] Empty state: "Nenhum lançamento encontrado"
- [ ] Link "Novo lançamento" → `/admin/financeiro/nova`
- [ ] Rows link to `/admin/financeiro/[id]`
- [ ] `npm run build` passes

**Tests**: static probes (page structure, in T15)
**Gate**: build (`npm run build`)

**Commit**: `feat(financeiro): página /admin/financeiro — listagem com filtros`

---

### T11: Page — /admin/financeiro/nova (create form)

**What**: Create the new financial entry form page
**Where**: `src/app/admin/financeiro/nova/page.tsx`
**Depends on**: T10
**Reuses**: Form pattern from `src/app/admin/patrimonio/nova/page.tsx` (client component, POST to API, error display)
**Requirement**: FIN-01, FIN-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Client component with form: descrição, valor, tipo (select), método (select), data, categoria (optional), observações (optional)
- [ ] Submit calls POST `/api/admin/financeiro` with JSON body
- [ ] On 400: displays per-field errors from `campos` object
- [ ] On 201: redirects to `/admin/financeiro`
- [ ] On 403: shows unauthorized message
- [ ] `npm run build` passes

**Tests**: static probes (page structure, in T15)
**Gate**: build (`npm run build`)

**Commit**: `feat(financeiro): página /admin/financeiro/nova — formulário de criação`

---

### T12: Page — /admin/financeiro/[id] (detail + actions)

**What**: Create the financial entry detail page with cancel action
**Where**: `src/app/admin/financeiro/[id]/page.tsx`
**Depends on**: T10, T7
**Reuses**: Pattern from `src/app/admin/patrimonio/[id]/page.tsx` (RSC detail, action buttons)
**Requirement**: FIN-01, FIN-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] RSC page displays full entry details (all fields)
- [ ] Shows tipo/method/status badges
- [ ] If PENDENTE: "Cancelar" button calls POST `/api/admin/financeiro/[id]/cancelar`
- [ ] If CONCILIADO: read-only (no cancel button), shows "Conciliado" badge
- [ ] If CANCELADO: read-only, shows "Cancelado" badge
- [ ] Edit button (PATCH flow) for PENDENTE entries
- [ ] 404 handling: shows not found
- [ ] `npm run build` passes

**Tests**: static probes (page structure, in T15)
**Gate**: build (`npm run build`)

**Commit**: `feat(financeiro): página /admin/financeiro/[id] — detalhe e ações`

---

### T13: Page — /admin/financeiro/fechamento (cash close)

**What**: Create the cash close list page with "Fechar caixa" action
**Where**: `src/app/admin/financeiro/fechamento/page.tsx`
**Depends on**: T9
**Reuses**: Simple list pattern (RSC, table)
**Requirement**: FIN-09, FIN-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] RSC page lists previous cash closes: data, total receitas, total despesas, saldo, qtd transações
- [ ] "Fechar caixa" button triggers POST `/api/admin/financeiro/fechamento`
- [ ] Shows preview of current period (total CONCILIADO receitas/despesas/saldo) before confirmation
- [ ] Empty state: "Nenhum fechamento realizado"
- [ ] `npm run build` passes

**Tests**: static probes (page structure, in T15)
**Gate**: build (`npm run build`)

**Commit**: `feat(financeiro): página /admin/financeiro/fechamento — fechamento de caixa`

---

### T14: Dashboard card — financeiro metrics

**What**: Update admin dashboard to show financeiro card with real data
**Where**: `src/app/admin/page.tsx`
**Depends on**: T3
**Reuses**: Existing dashboard card pattern (Patrimônio/Eventos cards)
**Requirement**: FIN-01

**Tools**:

- MCP: NONE
: NONE

**Done when**:

- [ ] Card "Financeiro" displays: total RECEITAS (count + valor sum), total DESPESAS (count + valor sum), saldo
- [ ] Data fetched server-side (RSC) from transactions table
- [ ] Link → `/admin/financeiro`
- [ ] `npm run build` passes

**Tests**: static probes (dashboard card, in T15)
**Gate**: build (`npm run build`)

**Commit**: `feat(financeiro): card financeiro no dashboard admin`

---

### T15: Probes — probes-admin-financeiro.sh

**What**: Create comprehensive probe script for admin-financeiro (static + runtime)
**Where**: `scripts/probes-admin-financeiro.sh`
**Depends on**: T13
**Reuses**: Pattern from `probes-admin-patrimonio.sh` (login flows, CRUD, RBAC discrimination, error assertions)
**Requirement**: All FIN-xx

**Tools**:

- MCP: NONE (probes run against running server)
- Skill: NONE

**Done when**:

- [ ] **Static probes**: migration structure (3 tables, RLS policies, CHECK constraints, indexes), service file exists, validation function exists, API routes exist, pages exist, types module exists (no server imports)
- [ ] **Runtime probes — CRUD**: ADMIN creates receita → 201, creates despesa → 201, GET list → 200 + contains entries, GET detail → 200, PATCH PENDENTE → 200, PATCH CONCILIADO → 400 `transacao_conciliada`, POST cancelar PENDENTE → 200, POST cancelar CONCILIADO → 400 `transacao_nao_cancelavel`
- [ ] **Runtime probes — Validation**: POST with empty descricao → 400 `campos.descricao`, POST with negative valor → 400 `campos.valor`, POST with invalid tipo → 400 `campos.tipo`, POST with invalid metodo → 400 `campos.metodo`, POST with invalid date → 400 `campos.data`
- [ ] **Runtime probes — RBAC**: FINANCEIRO creates → 201, SECRETARIA reads → 200 + writes → 403, LIDER reads → 200 + writes → 403, MEMBRO → proxy redirect + 403, anon → 401
- [ ] **Runtime probes — Webhook**: valid POST → 200, duplicate event_id → 200 (no duplicate), invalid JSON → 400, payment approved → transaction created, payment not approved → no transaction
- [ ] **Runtime probes — Fechamento**: create 2 CONCILIADO + 1 PENDENTE, fechar caixa → 201 + totals correct, fechar sem CONCILIADO → 400 `sem_transacoes_para_fechar`
- [ ] **Runtime probes — 404**: GET non-existent id → 404 `nao_encontrado`
- [ ] Trap EXIT for cleanup (idempotent)
- [ ] Discriminators per role (L-006, L-008): assert redirect targets, assert specific error bodies
- [ ] Probe script runs: `bash scripts/probes-admin-financeiro.sh` → all ok, 0 falhas

**Tests**: probes (self-executing)
**Gate**: full (`npm run lint && npm run typecheck && npm run build && bash scripts/probes-admin-financeiro.sh`)

**Commit**: `test(financeiro): probes por AC do módulo financeiro`

---

### T16: Regressões — probes-all.sh + coverage matrix

**What**: Run full regression suite and update coverage matrix
**Where**: `docs/coverage-matrix.md`
**Depends on**: T15
**Reuses**: `scripts/probes-all.sh` (existing regression runner)
**Requirement**: All

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `bash scripts/probes-all.sh` runs all probe suites: auth (19), painel (27), membros (139), liderança (102), eventos (71), patrimonio (67), financeiro (new) → all ok, 0 falhas
- [ ] `npm run lint && npm run typecheck && npm run build` all pass
- [ ] `docs/coverage-matrix.md` updated: RF-026 row with `admin-financeiro` FIN-01..12 → ✅ verified
- [ ] No regressions in existing modules

**Tests**: regression suite (probes-all.sh)
**Gate**: full

**Commit**: `test(financeiro): regressões e coverage matrix RF-026`

---

## Phase Execution Map

Execution is strictly sequential — no intra-phase parallelism. Phases are packed into ~7-task batches for sub-agent delegation:

- **Batch 1** (worker): Phase 1 + Phase 2 (T1..T4 = 4 tasks) → foundation
- **Batch 2** (worker): Phase 3 + Phase 4 (T5..T13 = 9 tasks) → API + UI
- **Batch 3** (inline): Phase 5 (T14..T16 = 3 tasks) → probes + regression + Verifier

Dependency arrows (every `Depends on` from task bodies):

```
T1 → T3
T2 → T3
T2 → T4
T3 → T5
T3 → T8
T3 → T9
T3 → T14
T4 → T5
T5 → T6
T5 → T10
T6 → T7
T7 → T12
T9 → T13
T10 → T11
T10 → T12
T13 → T15
T15 → T16
```

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Migration 0014 | 1 file (SQL) | ✅ Granular |
| T2: Types module | 1 file (TS) | ✅ Granular |
| T3: Service layer | 1 file (TS) | ✅ Granular |
| T4: Validation | 1 file (TS, append) | ✅ Granular |
| T5: API POST+GET | 1 file (route) | ✅ Granular |
| T6: API GET+PATCH [id] | 1 file (route) | ✅ Granular |
| T7: API POST cancelar | 1 file (route) | ✅ Granular |
| T8: Webhook | 1 file (route) | ✅ Granular |
| T9: API fechamento | 1 file (route) | ✅ Granular |
| T10: Page list | 1 file (page) | ✅ Granular |
| T11: Page nova | 1 file (page) | ✅ Granular |
| T12: Page [id] | 1 file (page) | ✅ Granular |
| T13: Page fechamento | 1 file (page) | ✅ Granular |
| T14: Dashboard card | 1 file (page, modify) | ✅ Granular |
| T15: Probes | 1 file (script) | ✅ Granular |
| T16: Regressões | 1 file (md, run) | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| ---- | ----------------- | ------------- | ------ |
| T1 | None | (start node) | ✅ Match |
| T2 | None | (start node) | ✅ Match |
| T3 | T1, T2 | T1→T3, T2→T3 | ✅ Match |
| T4 | T2 | T2→T4 | ✅ Match |
| T5 | T3, T4 | T3→T5, T4→T5 | ✅ Match |
| T6 | T5 | T5→T6 | ✅ Match |
| T7 | T6 | T6→T7 | ✅ Match |
| T8 | T3 | T3→T8 | ✅ Match |
| T9 | T3 | T3→T9 | ✅ Match |
| T10 | T5 | T5→T10 | ✅ Match |
| T11 | T10 | T10→T11 | ✅ Match |
| T12 | T10, T7 | T10→T12, T7→T12 | ✅ Match |
| T13 | T9 | T9→T13 | ✅ Match |
| T14 | T3 | T3→T14 | ✅ Match |
| T15 | T13 | T13→T15 | ✅ Match |
| T16 | T15 | T15→T16 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Migration/DB | static probes | static probes (migration structure, in T15) | ✅ OK |
| T2 | Types/config | build gate | build gate (types) | ✅ OK |
| T3 | Service layer | runtime probes | runtime probes (CRUD via API, in T15) | ✅ OK |
| T4 | Validation | runtime probes | runtime probes (400 per field, in T15) | ✅ OK |
| T5 | API routes | runtime probes | runtime probes (happy + error paths, in T15) | ✅ OK |
| T6 | API routes | runtime probes | runtime probes (happy + error paths, in T15) | ✅ OK |
| T7 | API routes | runtime probes | runtime probes (happy + error paths, in T15) | ✅ OK |
| T8 | Webhook | runtime probes | runtime probes (webhook idempotency, in T15) | ✅ OK |
| T9 | API routes | runtime probes | runtime probes (happy + error paths, in T15) | ✅ OK |
| T10 | UI pages | static probes | static probes (page structure, in T15) | ✅ OK |
| T11 | UI pages | static probes | static probes (page structure, in T15) | ✅ OK |
| T12 | UI pages | static probes | static probes (page structure, in T15) | ✅ OK |
| T13 | UI pages | static probes | static probes (page structure, in T15) | ✅ OK |
| T14 | Dashboard | static probes | static probes (dashboard card, in T15) | ✅ OK |
| T15 | Probes | runtime probes | probes (self-executing) | ✅ OK |
| T16 | Regressões | regression | regression suite (probes-all.sh) | ✅ OK |
