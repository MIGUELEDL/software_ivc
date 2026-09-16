# Admin Dashboard Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow.

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/admin-dashboard/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> No test infrastructure in the project. Quality gates are lint + typecheck + build only. Probes serve as integration validation.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Service (dashboard) | none | — (build gate only) | `src/lib/admin/dashboard.ts` | `npm run lint && npm run typecheck` |
| Page | none | — (build gate only) | `src/app/admin/page.tsx` | `npm run lint && npm run typecheck && npm run build` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After service task | `export PATH="$HOME/.nvm/versions/node/v$(cat .nvmrc).0/bin:$PATH" && npm run lint && npm run typecheck` |
| Build | After page/integration tasks | `export PATH="$HOME/.nvm/versions/node/v$(cat .nvmrc).0/bin:$PATH" && npm run lint && npm run typecheck && npm run build` |

---

## Execution Plan

### Phase 1: Service Layer

```
T1
```

### Phase 2: Page Refactor

T2, T3, T4 all depend on T1; T3 and T4 depend on T2.

```
T2, T3, T4
```

### Phase 3: Verification

```
T5 -> T6
```

---

## Task Breakdown

### T1: Service layer — dashboard.ts

- [x] `Metricas` interface exported with 6 count fields
- [x] `AtividadeItem` interface exported with tipo, titulo, subtitulo, criadoEm
- [x] `ResumoFinanceiro` interface exported with receitas, despesas, saldo, topCategorias
- [x] `obterMetricas()` calls all 6 list functions, returns counts using `.length`
- [x] `obterAtividadeRecente()` merges recent items from members + transactions + events, sorts by created_at desc, returns max 10
- [x] `obterResumoFinanceiro()` computes receitas/despesas/saldo + top 3 categories
- [x] `temporizar(iso)` helper returns relative time format
- [x] No TypeScript errors

---

### T2: Page refactor — metric cards grid

**What**: Refactor `/admin` page to display 6 metric cards in a responsive grid.
**Where**: `src/app/admin/page.tsx`
**Depends on**: T1
**Reuses**: `obterMetricas()` from dashboard.ts, icons from lucide-react, existing card styling
**Requirement**: DASH-01..05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Page calls `obterMetricas()` server-side
- [ ] 6 metric cards displayed in grid: Membros (Users), Eventos (CalendarDays), Igrejas (Church), Patrimonio (Package), Documentos (FileText), Usuarios (Shield)
- [ ] Each card shows icon + name + numeric count
- [ ] Each card is a Link to the corresponding module page
- [ ] Grid is responsive: 2 cols mobile, 3 cols tablet, 4 cols desktop
- [ ] Container width changed from `max-w-2xl` to `max-w-6xl` to accommodate grid
- [ ] No TypeScript errors

**Tests**: none
**Gate**: build

---

### T3: Page refactor — activity feed

**What**: Add "Atividade Recente" section to the dashboard.
**Where**: `src/app/admin/page.tsx`
**Depends on**: T2
**Reuses**: `obterAtividadeRecente()` from dashboard.ts
**Requirement**: DASH-06..11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Page calls `obterAtividadeRecente()` server-side
- [ ] "Atividade Recente" section displayed with up to 10 items
- [ ] Each item shows: icon (based on tipo), titulo, subtitulo, relative timestamp
- [ ] Member items show status badge (ATIVO green, INATIVO gray, TRANSFERIDO yellow)
- [ ] Transaction items show type badge (RECEITA green, DESPESA red) + formatted value
- [ ] Event items show title + formatted date
- [ ] Empty state: "Nenhuma atividade recente"
- [ ] No TypeScript errors

**Tests**: none
**Gate**: build

---

### T4: Page refactor — financial summary expandido

**What**: Expand the financial summary section with top 3 categories.
**Where**: `src/app/admin/page.tsx`
**Depends on**: T2
**Reuses**: `obterResumoFinanceiro()` from dashboard.ts, `formatarMoeda()` already in page
**Requirement**: DASH-12..15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Page calls `obterResumoFinanceiro()` server-side (replaces current listarLancamentos call)
- [ ] "Resumo Financeiro" section shows: Receitas, Despesas, Saldo (existing layout)
- [ ] Top 3 categories displayed below the totals, each with name + formatted value
- [ ] Categories ordered by value desc
- [ ] Empty state: "R$ 0,00" for all values
- [ ] No TypeScript errors

**Tests**: none
**Gate**: build

---

### T5: Probes — probes-admin-dashboard.sh

**What**: Create probe script for static validation of the dashboard module.
**Where**: `scripts/probes-admin-dashboard.sh`
**Depends on**: T4
**Reuses**: Probe pattern from other admin features
**Requirement**: DASH-01..20

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Static checks: dashboard.ts exists with functions, page.tsx has metric cards, activity feed, financial summary
- [ ] All checks report ok/falha
- [ ] Total ok count documented

**Tests**: none
**Gate**: quick

---

### T6: Regressões + coverage matrix

**What**: Run regression probes, update coverage matrix, update STATE.md Handoff.
**Where**: `docs/coverage-matrix.md`
**Depends on**: T5
**Reuses**: Regression pattern from prior features
**Requirement**: DASH-01..20

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Auth probes pass: 19/0
- [ ] `npm run lint && npm run typecheck && npm run build` pass
- [ ] `coverage-matrix.md` updated: RF-021 row → `admin-dashboard`, DASH-01..20, status `verified`

**Tests**: none
**Gate**: build

---

## Phase Execution Map

```txt
T1 -> T2
T2 -> T3
T2 -> T4
T4 -> T5
T5 -> T6
```

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: dashboard.ts service | 1 file, 3 functions + helper | Granular |
| T2: metric cards | 1 file edit (page.tsx) | Granular |
| T3: activity feed | 1 file edit (page.tsx) | Granular |
| T4: financial summary | 1 file edit (page.tsx) | Granular |
| T5: probes | 1 script | Granular |
| T6: regressões | docs update | Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| ---- | ----------------- | ------------- | ------ |
| T1 | None | (start) | Match |
| T2 | T1 | T1 -> T2 | Match |
| T3 | T2 | T2 -> T3 | Match |
| T4 | T2 | T2 -> T4 | Match |
| T5 | T4 | T4 -> T5 | Match |
| T6 | T5 | T5 -> T6 | Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Service | none | none | OK |
| T2 | Page | none | none | OK |
| T3 | Page | none | none | OK |
| T4 | Page | none | none | OK |
| T5 | Script | none | none | OK |
| T6 | Docs | none | none | OK |
