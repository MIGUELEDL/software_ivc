# Tasks: admin-configuracoes (RF-029)

## Execution Plan

### Phase 1: DB + Service

```
T1 -> T2
```

### Phase 2: API + Page

```
T3 -> T4 -> T5
```

### Phase 3: Verification

```
T6
```

---

## Task Breakdown

### T1: Migration — settings table

**What**: Create `settings` table with RLS and seed defaults from constants.ts.
**Where**: `supabase/migrations/00XX_settings.sql`
**Depends on**: None
**Reuses**: `can_access()` function from 0008, `constants.ts` for seed values
**Requirement**: CFG-16..18

**Tools**:

- MCP: Supabase
- Skill: NONE

**Done when**:

- [x] `settings` table created with `key` (text PK), `value` (jsonb), `updated_at` (timestamptz), `updated_by` (uuid)
- [x] RLS enabled: SELECT authenticated, ALL for `can_access('configuracoes', 'administrar')`
- [x] Seed idempotente populates 18 default settings from `constants.ts`
- [x] Applied to dev `[REDACTED_PROJECT_REF]`

**Tests**: none
**Gate**: build

---

### T2: Service layer — configuracoes.ts

**What**: Create service layer for reading and updating settings.
**Where**: `src/lib/admin/configuracoes.ts`
**Depends on**: T1
**Reuses**: `createAdminClient` from `src/lib/supabase/server.ts` for writes, `supabase` for reads
**Requirement**: CFG-19

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `SETTINGS_KEYS` whitelist with 18 keys, types, and defaults
- [ ] `obterConfiguracoes()` reads from DB, falls back to constants.ts defaults
- [ ] `atualizarConfiguracoes(updates)` validates keys, upserts, sets `updated_by`
- [ ] No TypeScript errors

**Tests**: none
**Gate**: build

---

### T3: API routes — GET/PATCH /api/admin/configuracoes

**What**: Create API routes for reading and updating settings.
**Where**: `src/app/api/admin/configuracoes/route.ts`
**Depends on**: T2
**Reuses**: `authAdmin`, `requireAdministrar` from `src/lib/admin/http.ts`
**Requirement**: CFG-12..15, CFG-23

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `GET /api/admin/configuracoes` returns `{ settings: { [key]: value } }`
- [ ] `PATCH /api/admin/configuracoes` accepts partial update, validates keys
- [ ] GET uses `authAdmin('configuracoes')`
- [ ] PATCH uses `requireAdministrar('configuracoes')`
- [ ] Unknown keys return 400 `chave_invalida`
- [ ] PATCH returns 200 `{ ok: true }`

**Tests**: none
**Gate**: build

---

### T4: Admin page — /admin/configuracoes

**What**: Create admin settings page with view/edit modes.
**Where**: `src/app/admin/configuracoes/page.tsx`
**Depends on**: T3
**Reuses**: `getClaims`, `can` from auth, `obterConfiguracoes` from service
**Requirement**: CFG-01..11, CFG-21..22

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Page renders 5 sections: Dados da Igreja, WhatsApp, PIX, Horarios, Redes Sociais
- [ ] Guard: `can(papel, 'configuracoes', 'ler')` — 403 card if denied
- [ ] Edit buttons only when `can(papel, 'configuracoes', 'administrar')`
- [ ] Schedule items editable (add/remove rows)
- [ ] Save calls PATCH, cancel reverts

**Tests**: none
**Gate**: build

---

### T5: Dashboard card + probes

**What**: Add "Configuracoes" card to dashboard and create probe script.
**Where**: `src/app/admin/page.tsx`, `scripts/probes-admin-configuracoes.sh`
**Depends on**: T4
**Reuses**: Dashboard card pattern from other modules
**Requirement**: CFG-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] "Configuracoes" card added to `/admin/page.tsx` with `Settings` icon
- [ ] `scripts/probes-admin-configuracoes.sh` created with static checks
- [ ] Probes report ok/falha count

**Tests**: none
**Gate**: build

---

### T6: Regressões + coverage matrix

**What**: Run regression checks, update coverage matrix, update STATE.md Handoff.
**Where**: `docs/coverage-matrix.md`, `.specs/STATE.md`
**Depends on**: T5
**Reuses**: Regression pattern from prior features
**Requirement**: CFG-01..25

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] lint 0 errors, typecheck 0 errors, build success
- [ ] `coverage-matrix.md` updated: RF-029 row
- [ ] STATE.md Handoff updated

**Tests**: none
**Gate**: build

---

## Phase Execution Map

```txt
T1 -> T2
T2 -> T3
T3 -> T4
T4 -> T5
T5 -> T6
```

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: migration | 1 SQL file | Granular |
| T2: service | 1 TS file | Granular |
| T3: API routes | 1 route file | Granular |
| T4: page | 1 page file | Granular |
| T5: dashboard + probes | 1 edit + 1 script | Granular |
| T6: regressões | docs update | Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| ---- | ----------------- | ------------- | ------ |
| T1 | None | (start) | Match |
| T2 | T1 | T1 -> T2 | Match |
| T3 | T2 | T2 -> T3 | Match |
| T4 | T3 | T3 -> T4 | Match |
| T5 | T4 | T4 -> T5 | Match |
| T6 | T5 | T5 -> T6 | Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Migration | none | none | OK |
| T2 | Service | none | none | OK |
| T3 | Route | none | none | OK |
| T4 | Page | none | none | OK |
| T5 | Page + Script | none | none | OK |
| T6 | Docs | none | none | OK |

---

## Test Coverage Matrix

| Task | Code Layer | Required Tests | Status |
| ---- | ---------- | -------------- | ------ |
| T1 | Migration | none (DDL only) | OK |
| T2 | Service | none (no test infra) | OK |
| T3 | Route | none (no test infra) | OK |
| T4 | Page | none (no test infra) | OK |
| T5 | Page + Script | none (no test infra) | OK |
| T6 | Docs | none | OK |

---

## Gate Check Commands

```bash
export PATH="$HOME/.nvm/versions/node/v$(cat .nvmrc).0/bin:$PATH"
npm run lint
npm run typecheck
npm run build
```
