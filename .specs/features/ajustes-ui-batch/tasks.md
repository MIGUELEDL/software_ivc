# Ajustes UI Batch Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/ajustes-ui-batch/spec.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec. Guidelines found: `AGENTS.md` (gates: lint/typecheck/build). No test framework configured yet — strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|------------|-------------------|---------------------|------------------|-------------|
| UI Components | none | build gate only | `src/components/*.tsx` | `npm run build` |
| Pages/Forms | none | build gate only | `src/app/**/*.tsx` | `npm run build` |
| API Routes | none | build gate only | `src/app/api/**/*.ts` | `npm run build` |
| Service/Types | none | build gate only | `src/lib/**/*.ts` | `npm run build` |
| Migrations | none | static review | `supabase/migrations/*.sql` | manual |

## Gate Check Commands

> Generated from codebase.

| Gate Level | When to Use | Command |
|------------|-------------|---------|
| Build | All tasks (no test framework yet) | `export PATH="$HOME/.nvm/versions/node/v$(cat .nvmrc).0/bin:$PATH" && npm run lint && npm run typecheck && npm run build` |

---

## Execution Plan

### Phase 1: UI Quick Wins (no DB changes)

Independent visual fixes. All tasks have no dependencies.

```
T1 (no deps)
T2 (no deps)
T3 (no deps)
T4 (no deps)
T5 (no deps)
```

### Phase 2: Migrations + Dark Theme Forms

T6/T9/T10 depend on Phase 1 (T5). T7 depends on T6. T8 depends on T7. T11 depends on T6.

```
T5 → T6 → T7 → T8
T5 → T9
T10
T6 → T11
```

### Phase 3: Feature Enhancements

T12/T13 depend on T11. T14 depends on T6. T15 depends on T14. T16 has no deps. T17 depends on T14. T18 has no deps.

```
T11 → T12
T11 → T13
T6 → T14 → T15
T16
T14 → T17
T18
```

---

## Task Breakdown

### T1: Remove logo borders (Hero + Footer)

**What**: Remove decorative border classes from logos in Hero and Footer components
**Where**: `src/components/Hero.tsx`, `src/components/Footer.tsx`
**Depends on**: None
**Reuses**: Existing Image components
**Requirement**: AJUSTE-01

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Hero logo: `border-2 border-accent/50` class removed
- [x] Footer logo: `border border-accent/50` class removed
- [x] Gate check passes

**Tests**: none
**Gate**: build

---

### T2: Standardize Navbar logo to 48px

**What**: Change Navbar logo from 40x40 to 48x48 to match Footer
**Where**: `src/components/Navbar.tsx`
**Depends on**: None
**Reuses**: Existing Image component
**Requirement**: AJUSTE-01

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Logo width changed from 40 to 48
- [x] Logo height changed from 40 to 48
- [x] Gate check passes

**Tests**: none
**Gate**: build

---

### T3: Create dedicated favicon

**What**: Configure layout.tsx to use a dedicated `/favicon.png` file instead of `/logo.png`
**Where**: `src/app/layout.tsx`
**Depends on**: None
**Reuses**: Existing metadata config
**Requirement**: AJUSTE-01

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `icons: { icon: "/favicon.png" }` configured in layout metadata
- [x] A `/public/favicon.png` file exists (can be a copy of logo.png for now)
- [x] Gate check passes

**Tests**: none
**Gate**: build

---

### T4: Fix PixDonation dark background

**What**: Change PixDonation cards from white to dark theme colors
**Where**: `src/components/PixDonation.tsx`
**Depends on**: None
**Reuses**: Existing component structure
**Requirement**: AJUSTE-02

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] QR code card: `bg-white` → `bg-[#132744]`
- [x] PIX code card: `bg-white` → `bg-[#132744]`
- [x] Text colors updated to white/white-variants for contrast
- [x] Copy button remains visible with adequate contrast
- [x] Gate check passes

**Tests**: none
**Gate**: build

---

### T5: Apply dark theme to login pages

**What**: Restyle both login pages (membro + admin) with admin dark theme
**Where**: `src/app/login/page.tsx`, `src/app/login/admin/page.tsx`
**Depends on**: None
**Reuses**: Admin dark theme color palette
**Requirement**: AJUSTE-03

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Page background: `bg-[#0a1628]`
- [x] Card: `bg-[#132744] border border-white/10 rounded-xl`
- [x] Inputs: `bg-[#0d1f3c] border border-white/10 text-white`
- [x] Labels: `text-white/70`
- [x] Button: `bg-[#c9a84c] hover:bg-[#e0c872] text-[#0d1f3c]`
- [x] Title: `text-white`
- [x] Church logo added at top of card
- [x] Both member and admin login updated
- [x] Gate check passes

**Tests**: none
**Gate**: build

---

### T6: Migration — Event status ATIVO/INATIVO → EM ABERTO/CONCLUIDO

**What**: Create migration to change events.status CHECK constraint and update existing data
**Where**: `supabase/migrations/0019_event_status_change.sql`
**Depends on**: T5
**Reuses**: Existing events table structure
**Requirement**: AJUSTE-05

**Tools**:
- MCP: supabase
- Skill: NONE

**Done when**:
- [ ] Migration drops existing `events_status_check` constraint
- [ ] Migration adds new CHECK constraint: `status in ('EM ABERTO', 'CONCLUIDO')`
- [ ] Migration updates existing rows: ATIVO → EM ABERTO, INATIVO → CONCLUIDO
- [ ] Migration is idempotent (safe to re-run)
- [ ] Migration applied to dev database
- [ ] Gate check passes

**Tests**: none
**Gate**: build

---

### T7: Update EventoStatus type + event forms dark theme

**What**: Update TypeScript types and apply dark theme to event creation/edit forms
**Where**: `src/lib/admin/eventos.ts`, `src/app/admin/eventos/nova/evento-novo-form.tsx`, `src/app/admin/eventos/[id]/evento-editar-form.tsx`
**Depends on**: T6
**Reuses**: Admin dark theme pattern from login
**Requirement**: AJUSTE-04, AJUSTE-05

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `EventoStatus` type changed to `"EM ABERTO" | "CONCLUIDO"`
- [ ] Event creation form uses dark theme (bg-[#132744] card, dark inputs)
- [ ] Event edit form uses dark theme
- [ ] Status toggle in edit form shows "EM ABERTO" (green) / "CONCLUIDO" (gray)
- [ ] Helper text updated: "CONCLUIDO oculta o evento do portal"
- [ ] Gate check passes

**Tests**: none
**Gate**: build

---

### T8: Update events list page badges

**What**: Update events list page to show EM ABERTO/CONCLUIDO badges
**Where**: `src/app/admin/eventos/page.tsx`
**Depends on**: T7
**Reuses**: Existing badge pattern
**Requirement**: AJUSTE-05

**Tools**:
- MCP: NONE
**Requirement**: AJUSTE-05

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Status badges display "EM ABERTO" (emerald) and "CONCLUIDO" (white/10)
- [ ] Badge values match new EventoStatus type
- [ ] Gate check passes

**Tests**: none
**Gate**: build

---

### T9: Config labels + landing page integration

**What**: Rename config labels and make Schedule/PixDonation/Hero read from database
**Where**: `src/app/admin/configuracoes/configuracoes-form.tsx`, `src/components/Schedule.tsx`, `src/components/PixDonation.tsx`, `src/components/Hero.tsx`
**Depends on**: T5
**Reuses**: `obterConfiguracoes()` from `src/lib/admin/configuracoes.ts`
**Requirement**: AJUSTE-06, AJUSTE-07

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Config form: "Pastor" label → "Pastor Presidente"
- [ ] Config form: "Missão" label → "Propósito"
- [ ] Schedule.tsx: reads schedule items from `obterConfiguracoes()`, falls back to constants
- [ ] PixDonation.tsx: reads PIX key from `obterConfiguracoes()`, falls back to constants
- [ ] Hero.tsx: reads slogan from `obterConfiguracoes()`, falls back to constants
- [ ] constants.ts preserved as fallback (no deletion)
- [ ] Gate check passes

**Tests**: none
**Gate**: build

---

### T10: Templos form — remove Sigla, optional CNPJ, dark theme

**What**: Simplify church creation form and apply dark theme
**Where**: `src/app/admin/lideranca/nova/lideranca-nova-form.tsx`
**Depends on**: None
**Reuses**: Admin dark theme pattern
**Requirement**: AJUSTE-08

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] "Sigla" (short_name) field removed from form
- [ ] CNPJ field: `required` attribute removed
- [ ] Form uses dark theme classes (bg-[#132744] card, dark inputs)
- [ ] Gate check passes

**Tests**: none
**Gate**: build

---

### T11: Migration — Add member card columns

**What**: Create migration to add RG, CPF, baptism date, and card validity columns to members table
**Where**: `supabase/migrations/0020_member_card_columns.sql`
**Depends on**: T6
**Reuses**: Existing members table structure
**Requirement**: AJUSTE-14

**Tools**:
- MCP: supabase
- Skill: NONE

**Done when**:
- [ ] Migration adds `rg TEXT` column to members
- [ ] Migration adds `cpf TEXT` column to members
- [ ] Migration adds `data_batismo DATE` column to members
- [ ] Migration adds `validade_cartao DATE` column to members
- [ ] Migration is idempotent
- [ ] Migration applied to dev database
- [ ] Gate check passes

**Tests**: none
**Gate**: build

---

### T12: Member card redesign + permission control

**What**: Redesign MemberCard component with church colors and 7 fields, add permission checks to cartão page
**Where**: `src/components/MemberCard.tsx`, `src/app/painel/cartao/page.tsx`
**Depends on**: T11
**Reuses**: Existing MemberCard structure, RBAC `can()` function
**Requirement**: AJUSTE-14

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] MemberCard shows: Photo, Nome, Matrícula, RG, CPF, Data de Batismo, Validade do Cartão
- [ ] Card uses primary (#1a3a6b) header and accent (#c9a84c) accents
- [ ] Missing RG/CPF shows "—" fallback
- [ ] Cartão page: print/update buttons only for ADMIN, SUPER_ADMIN, SECRETARIA
- [ ] Gate check passes

**Tests**: none
**Gate**: build

---

### T13: Admin members — birth month filter

**What**: Add birth month filter dropdown to admin members list page
**Where**: `src/app/admin/membros/page.tsx`
**Depends on**: T11
**Reuses**: Existing filter pattern (GET form with searchParams)
**Requirement**: AJUSTE-15

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Birth month filter dropdown added (Janeiro through Dezembro)
- [ ] Filter uses GET searchParams pattern (server-side)
- [ ] Filter is cumulative with existing status/search filters
- [ ] Empty state when no members match
- [ ] Gate check passes

**Tests**: none
**Gate**: build

---

### T14: Migration — Asset auto-numbering RPC

**What**: Create RPC function `proximo_patrimonio()` for sequential PAT-NNNN numbering
**Where**: `supabase/migrations/0021_asset_autonumber.sql`
**Depends on**: T6
**Reuses**: Existing `proxima_matricula()` RPC pattern
**Requirement**: AJUSTE-09

**Tools**:
- MCP: supabase
- Skill: NONE

**Done when**:
- [ ] RPC `proximo_patrimonio()` created (SECURITY DEFINER)
- [ ] Uses sequence or max+1 pattern similar to `proxima_matricula()`
- [ ] Returns format: PAT-0001, PAT-0002, etc.
- [ ] Migration applied to dev database
- [ ] Gate check passes

**Tests**: none
**Gate**: build

---

### T15: Asset auto-number + delete endpoint + UI

**What**: Auto-generate patrimony numbers on creation, add DELETE endpoint, add delete button to UI
**Where**: `src/lib/admin/assets.ts`, `src/app/api/admin/assets/route.ts`, `src/app/api/admin/assets/[id]/route.ts`, `src/app/admin/patrimonio/page.tsx`
**Depends on**: T14
**Reuses**: Existing asset service pattern, `registrarAuditoria()`
**Requirement**: AJUSTE-09, AJUSTE-10

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `criarAsset()` calls `proximo_patrimonio()` RPC for numero_patrimonio
- [ ] `numero_patrimonio` field no longer required in POST body
- [ ] DELETE `/api/admin/assets/[id]` endpoint added (ADMIN/SUPER_ADMIN only)
- [ ] DELETE hard-deletes the asset (with audit log)
- [ ] Patrimônio list page: "Excluir" button with confirmation dialog
- [ ] Delete button only visible for ADMIN/SUPER_ADMIN
- [ ] Gate check passes

**Tests**: none
**Gate**: build

---

### T16: Financeiro — ENTRADA/SAÍDA labels + method filter + saldo

**What**: Rename type labels, add payment method filter, add monthly balance section
**Where**: `src/app/admin/financeiro/page.tsx`, `src/lib/admin/financeiro-types.ts`
**Depends on**: None
**Reuses**: Existing chip/filter pattern, GET searchParams
**Requirement**: AJUSTE-11, AJUSTE-12, AJUSTE-13

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Type chips show "ENTRADA" and "SAÍDA" (not RECEITA/DESPESA)
- [ ] Transaction type badges display "ENTRADA"/"SAÍDA"
- [ ] Payment method filter added (PIX, CARTAO, DINHEIRO, TRANSFERENCIA chips)
- [ ] Method filter is cumulative with type/status/date filters
- [ ] "Saldo do Mês" section shows: total ENTRADAs - total SAÍDAs for filtered month
- [ ] Saldo shows R$ 0,00 when no transactions
- [ ] Gate check passes

**Tests**: none
**Gate**: build

---

### T17: Migration — Add asset delete policy

**What**: Add RLS DELETE policy for assets table (ADMIN/SUPER_ADMIN only)
**Where**: `supabase/migrations/0022_asset_delete_policy.sql`
**Depends on**: T14
**Reuses**: Existing `can_access()` function
**Requirement**: AJUSTE-10

**Tools**:
- MCP: supabase
- Skill: NONE

**Done when**:
- [ ] DELETE policy on assets table using `can_access('patrimonio', 'administrar')`
- [ ] Only ADMIN/SUPER_ADMIN can hard-delete
- [ ] Migration applied to dev database
- [ ] Gate check passes

**Tests**: none
**Gate**: build

---

### T18: PDF export for reports

**What**: Add jspdf dependency and create PDF export endpoint alongside CSV
**Where**: `src/app/api/admin/relatorios/exportar/route.ts`, `src/lib/admin/relatorios.ts`, `package.json`
**Depends on**: None
**Reuses**: Existing CSV generator functions as data source
**Requirement**: AJUSTE-16

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `jspdf` and `jspdf-autotable` added as dependencies
- [ ] PDF generator function created in `relatorios.ts`
- [ ] PDF has IVC header, date, applied filters, data table, totals footer
- [ ] Export endpoint accepts `format=pdf` parameter
- [ ] PT-BR characters render correctly in PDF
- [ ] Export page shows PDF as download option
- [ ] Gate check passes

**Tests**: none
**Gate**: build

---

**Batch plan** (3 batches, ~8 tasks each):
- Batch 1: Phase 1 (T1-T5) — UI quick wins, all independent
- Batch 2: Phase 2 (T6-T11) — Migrations + form theming
- Batch 3: Phase 3 (T12-T18) — Feature enhancements
