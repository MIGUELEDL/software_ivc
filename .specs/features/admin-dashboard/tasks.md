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

- [x] Page calls `obterMetricas()` server-side
- [x] 6 metric cards displayed in grid with icons, names, counts
- [x] Each card is a Link to the corresponding module page
- [x] Grid responsive: 2 cols mobile, 3 cols tablet, 4 cols desktop
- [x] Container changed from `max-w-2xl` to `max-w-6xl`
- [x] No TypeScript errors

---

### T3: Page refactor — activity feed

- [x] Page calls `obterAtividadeRecente()` server-side
- [x] "Atividade Recente" section with up to 10 items
- [x] Each item: icon (per tipo), titulo, subtitulo, relative timestamp
- [x] `AtividadeIcon` component maps tipo to lucide-react icon
- [x] Empty state: "Nenhuma atividade recente."
- [x] No TypeScript errors

---

### T4: Page refactor — financial summary expandido

- [x] Page calls `obterResumoFinanceiro()` server-side (replaces old listarLancamentos)
- [x] Receitas, despesas, saldo displayed in distinct sections
- [x] Top 3 categories by value listed below the totals
- [x] Uses `formatarMoeda()` for all monetary values
- [x] No TypeScript errors

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
