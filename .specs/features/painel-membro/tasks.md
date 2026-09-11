# Painel Membro Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/painel-membro/design.md`
**Status**: In Progress

---

## Test Coverage Matrix

> Generated from codebase — no test runner until F10 (AD-006); TCM = `none` por task; validação via probes shell (`scripts/probes-*.sh`) + gates (`lint + typecheck + build`). Guidelines found: `AGENTS.md`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Entity / Schema (migration) | none | build gate only | `supabase/migrations/*.sql` | MCP apply + build |
| Lib / domain | none | probes + build gate | `src/lib/painel/*.ts`, `src/lib/pix.ts` | `npm run lint && npm run typecheck && npm run build` |
| Route Handlers (API) | none | probes: redirect 307/401 + build gate | `src/app/api/painel/*/route.ts` | probes + build |
| Pages (RSC) | none | probes: 200/307 + build gate | `src/app/painel/*/page.tsx` | probes + build |
| Probes | none (probes ARE the tests) | 1:1 AC coverage | `scripts/probes-painel.sh` | `npm run probe:painel` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After entity/config-only tasks | `export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && npm run lint && npm run typecheck` |
| Full | After lib/page tasks | `export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && npm run lint && npm run typecheck && npm run build` |
| Probes | After probes script | `npm run probe:painel` |

---

## Execution Plan

### Complete dependency graph

```
T1 -> T2
T1 -> T4
T3 -> T4
T3 -> T6
T3 -> T7
T4 -> T6
T4 -> T7
T4 -> T8
T4 -> T9
T5 -> T7
T5 -> T8
T6 -> T8
T1 -> T10
T2 -> T10
T3 -> T10
T4 -> T10
T5 -> T10
T6 -> T10
T7 -> T10
T8 -> T10
T9 -> T10
```

### Phase 1: Foundation (DB + seed)

T2 depends on T1 (same phase).

```
T1 -> T2
```

### Phase 2: Lib layer

T4 depends on T1 (Phase 1) and T3 (same phase); T5 independent; all cross-phase deps shown in graph.

```
T3 -> T4
```

### Phase 3: Pages + API

T8 depends on T6 (same phase); all others depend on Phase 1-2 tasks only — see complete graph.

```
T6 -> T8
```

### Phase 4: Probes

T10 depends on all prior phases — see complete graph.

```
T10
```

---

## Task Breakdown

### T1: Create migration SQL (members + event_notices) ✅ Complete

**What**: Create `supabase/migrations/0001_members_event_notices.sql` with `members` table (id, auth_user_id unique FK, nome, nascimento, whatsapp, matricula unique, foto_url, timestamps), `event_notices` table (id, titulo, data_hora, conteudo, visivel, criado_em), sequence `members_matricula_seq`, RLS policies (members: auth.uid()=auth_user_id select/insert/update; event_notices: select where visivel=true for authenticated), and indexes.
**Where**: `supabase/migrations/0001_members_event_notices.sql`
**Depends on**: None
**Reuses**: AD-013 (Supabase Auth, `auth.uid()`), DATABASE.md schema (members, event_notices), AD-014 (SQL pure migrations)

**Tools**: MCP: `supabase_apply_migration` (apply to dev project `[REDACTED_PROJECT_REF]` after writing file)

**Done when**:
- [x] File `supabase/migrations/0001_members_event_notices.sql` exists in repo
- [x] Tables `members` and `event_notices` created in Supabase dev project via MCP
- [x] RLS enabled on both tables; policies create as designed
- [x] Sequence `members_matricula_seq` created
- [x] `npm run build` passes (no code impact)

**Tests**: none
**Gate**: full

---

### T2: Apply seed (1 member + 2 notices) ✅ Complete

**What**: Create `supabase/migrations/0002_seed_painel_membro.sql` with INSERT statements: 1 member with auth_user_id = test auth user (seed:admin UUID if known, or placeholder), 2 event notices (one past, one future, both visivel=true). Apply to dev project.
**Where**: `supabase/migrations/0002_seed_painel_membro.sql`
**Depends on**: T1
**Reuses**: T1 schema; supabase MCP `apply_migration`

**Tools**: MCP: `supabase_execute_sql` (seed data inserts — apply_migration can't do DML)

**Done when**:
- [x] 2 rows in `event_notices` visible in Supabase dev project
- [x] 1 row in `members` (auth_user_id placeholder OK — replaced when service-role available)
- [x] Probe commands can query these rows (status check in probes)

**Tests**: none
**Gate**: full

---

### T3: Extend AuthClaims with sub (user ID) ✅ Complete

**What**: Add `sub: string` field to `AuthClaims` type and populate it from `session.user.id` in both `getClaims()` and `getClaimsFromRequest()` in `src/lib/auth/claims.ts`.
**Where**: `src/lib/auth/claims.ts`
**Depends on**: None (existing feature auth, backward compatible)
**Reuses**: AD-013, `getClaims()` pattern

**Tools**: MCP: NONE

**Done when**:
- [x] `AuthClaims` type includes `sub: string`
- [x] `getClaims()` returns `sub: session.user.id`
- [x] `getClaimsFromRequest()` returns `sub: session.user.id`
- [x] `npm run lint && npm run typecheck && npm run build` passes

**Tests**: none
**Gate**: full

---

### T4: Create src/lib/painel/ (members.ts + avisos.ts)

**What**: Create `src/lib/painel/members.ts` with `getMemberByAuthUid(authUid)`, `createMember(authUid, dados)`, `updateMember(authUid, dados)`, and `generateMatricula()` (read from sequence or compute max+1). Create `src/lib/painel/avisos.ts` with `listAvisosVisiveis()`. Both use `createServerClient` from `src/lib/supabase/server.ts`. Include TypeScript types for `Member` and `Aviso`.
**Where**: `src/lib/painel/members.ts`, `src/lib/painel/avisos.ts`
**Depends on**: T1 (schema exists), T3 (sub in claims)
**Reuses**: `src/lib/supabase/server.ts`, `getClaims()` from `src/lib/auth/claims.ts`

**Tools**: MCP: NONE

**Done when**:
- [ ] `src/lib/painel/members.ts` exports `Member` type + 4 functions
- [ ] `src/lib/painel/avisos.ts` exports `Aviso` type + 1 function
- [ ] Types aligned with DB schema (T1)
- [ ] `npm run lint && npm run typecheck` passes

**Tests**: none
**Gate**: quick

---

### T5: Extend buildBrCode with optional txid parameter

**What**: Add optional `txid?: string` parameter to `BrCodeInput` and `buildBrCode()`. When provided, use `emv("62", emv("05", txid))` instead of `referenceLabel = emv("05", "***")`. Export `buildBrCodePessoal(matricula: string)` helper that wraps `buildBrCode` with txid=matricula. Update `PIX_PAYLOAD` to keep `***` default (no behavioral change to `/doacao`).
**Where**: `src/lib/pix.ts`
**Depends on**: None
**Reuses**: existing `buildBrCode`, `emv()`, `PIX.key`

**Tools**: MCP: NONE

**Done when**:
- [ ] `buildBrCode({..., txid: "IVC-0001"})` generates payload with txid in field 62/05
- [ ] `buildBrCodePessoal("IVC-0001")` returns correct payload
- [ ] `PIX_PAYLOAD` unchanged (still uses `***`)
- [ ] `npm run lint && npm run typecheck && npm run build` passes

**Tests**: none
**Gate**: full

---

### T6: Create /painel (avisos landing)

**What**: Replace `src/app/painel/page.tsx` with: (1) layout with nav cards linking to dizimo/cartao/perfil, (2) list of avisos from `event_notices` (title, content, formatted date, newest first), (3) empty state "Nenhum aviso disponível", (4) logout button. Check `claims.sub` exists (redirect to perfil if no members row on first load).
**Where**: `src/app/painel/page.tsx`
**Depends on**: T3 (sub in claims), T4 (avisos.ts)
**Reuses**: `getClaims()`, `isMemberRole()`, `listAvisosVisiveis()`, lucide-react icons, tailwind patterns from project

**Tools**: MCP: NONE

**Done when**:
- [ ] `/painel` shows avisos list (or empty state)
- [ ] Nav links to `/painel/dizimo`, `/painel/cartao`, `/painel/perfil`
- [ ] Logout button present
- [ ] `npm run lint && npm run typecheck && npm run build` passes

**Tests**: none
**Gate**: full

---

### T7: Create /painel/perfil + API routes

**What**: Create `src/app/painel/perfil/page.tsx` (GET form: shows "complete cadastro" if no members row, else pre-filled edit form). Create `src/app/api/painel/perfil/route.ts` (POST: validate nome/nascimento/whatsapp → create or update members row by auth.uid(), generate matricula on create, return 200/201/4xx). Create `src/app/api/painel/perfil/foto/route.ts` (POST multipart: validate type jpeg/png/webp ≤2MB, upload to `fotos-membros` bucket path `members/{id}/foto-4x4.{ext}`, update foto_url, return 200/4xx). Handle duplicate auth_user_id with 409.
**Where**: `src/app/painel/perfil/page.tsx`, `src/app/api/painel/perfil/route.ts`, `src/app/api/painel/perfil/foto/route.ts`
**Depends on**: T3, T4, T5
**Reuses**: `getClaims()`, `createServerClient`, `getMemberByAuthUid()`, `createMember()`, `updateMember()`, form patterns from `/trocar-senha`

**Tools**: MCP: NONE

**Done when**:
- [ ] `/painel/perfil` shows form (autocadastro or edit)
- [ ] POST to `/api/painel/perfil` persists data + returns 201 (create) or 200 (update)
- [ ] POST to `/api/painel/perfil/foto` uploads photo + returns 200
- [ ] Invalid file type/size returns 400 with error message
- [ ] Missing required fields returns 400 with inline errors
- [ ] `npm run lint && npm run typecheck && npm run build` passes

**Tests**: none
**Gate**: full

---

### T8: Create /painel/dizimo (QR personal)

**What**: Create `src/app/painel/dizimo/page.tsx`: server component fetches `members.matricula`, calls `buildBrCodePessoal(matricula)`, passes payload to `PixDonation` component (or equivalent re-render). If no members row for `claims.sub`, redirect to `/painel/perfil`. Show QR + copy code.
**Where**: `src/app/painel/dizimo/page.tsx`
**Depends on**: T4, T5, T6 (avatar p/ link voltar)
**Reuses**: `PixDonation.tsx`, `buildBrCodePessoal()`, `getMemberByAuthUid()`, `getClaims()`

**Tools**: MCP: NONE

**Done when**:
- [ ] `/painel/dizimo` shows QR with payload containing matrícula in txid
- [ ] PIX key remains institutional (CNPJ, `PIX.key`)
- [ ] Copy button works
- [ ] No members row → redirect to `/painel/perfil`
- [ ] `npm run lint && npm run typecheck && npm run build` passes

**Tests**: none
**Gate**: full

---

### T9: Create /painel/cartao (card + print)

**What**: Create `src/app/painel/cartao/page.tsx`: server component renders card with `members.nome`, `members.matricula`, `CHURCH.name`, photo (from storage or placeholder). Add `@media print` CSS (or tailwind print classes) to isolate card content on print. Print button triggers `window.print()`. No members row → redirect to `/painel/perfil`.
**Where**: `src/app/painel/cartao/page.tsx`
**Depends on**: T4
**Reuses**: `getClaims()`, `getMemberByAuthUid()`, `CHURCH`, tailwind print patterns

**Tools**: MCP: NONE

**Done when**:
- [ ] `/painel/cartao` shows card with nome + matrícula + igreja + foto/placeholder
- [ ] Print button opens browser print dialog with only card content
- [ ] No members → redirect `/painel/perfil`
- [ ] `npm run lint && npm run typecheck && npm run build` passes

**Tests**: none
**Gate**: full

---

### T10: Create probes + run full gate

**What**: Create `scripts/probes-painel.sh` with probes covering: (1) `/painel` without session → 307 `/login`, (2) `/painel/dizimo` without session → 307 `/login`, (3) `/painel/cartao` without session → 307 `/login`, (4) `/painel/perfil` without session → 307 `/login`, (5) `/api/painel/perfil` POST without session → 401, (6) `/api/painel/perfil/foto` POST without session → 401, (7) `/painel` with session → 200 (if seed member exists), (8) buildBrCodePessoal("IVC-0001") outputs correct format. Add `npm run probe:painel` script to `package.json`. Run full gate: `npm run lint && npm run typecheck && npm run build && npm run probe:painel`.
**Where**: `scripts/probes-painel.sh`, `package.json`
**Depends on**: T1, T2, T3, T4, T5, T6, T7, T8, T9
**Reuses**: `scripts/probes-auth.sh` (pattern), `check_commit.py`

**Tools**: MCP: NONE

**Done when**:
- [ ] `scripts/probes-painel.sh` is executable and covers 8+ probes
- [ ] `npm run probe:painel` passes all probes
- [ ] `npm run lint && npm run typecheck && npm run build` passes
- [ ] Probe file committed with 100755 permissions

**Tests**: none
**Gate**: full

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Migration SQL | 1 file (schema) | ✅ Granular |
| T2: Seed SQL | 1 file (DML) | ✅ Granular |
| T3: Extend AuthClaims | 1 type + 2 functions | ✅ Granular |
| T4: lib/painel (members + avisos) | 2 related files, same domain | ✅ Cohesive |
| T5: buildBrCode txid | 1 function | ✅ Granular |
| T6: /painel page | 1 page component | ✅ Granular |
| T7: /painel/perfil + API | 3 files (page + 2 routes), one feature | ✅ Cohesive |
| T8: /painel/dizimo | 1 page component | ✅ Granular |
| T9: /painel/cartao | 1 page component | ✅ Granular |
| T10: Probes + gate | 1 script + package.json | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| ---- | ----------------- | ------------- | ------ |
| T1 | None | — | ✅ Match |
| T2 | T1 | T1→T2 | ✅ Match |
| T3 | None | — | ✅ Match |
| T4 | T1, T3 | T3→T4→T5 | ✅ Match (T1 implied by Phase) |
| T5 | None | T4→T5 | ✅ Match |
| T6 | T3, T4 | Phase 3 start | ✅ Match |
| T7 | T3, T4, T5 | T6→T7 | ✅ Match |
| T8 | T4, T5, T6 | T7→T8 | ✅ Match |
| T9 | T4 | T8→T9 | ✅ Match |
| T10 | T1–T9 | Phase 4 | ✅ Match |

## Test Co-location Validation

All tasks have `Tests: none` — consistent with coverage matrix (no test runner until F10; TCM = `none` across all layers). Probes covered in T10.

---

## Phase Execution Map

Execution is strictly sequential phase by phase: Phase 1 completes before Phase 2, Phase 2 before Phase 3, Phase 3 before Phase 4. Within a phase, tasks run in task-number order; cross-phase dependencies (all pointing backward) are listed in each task body.

- **Phase 1 (Foundation)**: T1 → T2
- **Phase 2 (Lib)**: T3 → T4 (T4 depends on T1 + T3); T5 independent
- **Phase 3 (Pages + API)**: T6, T7, T9 — cross-phase deps; T8 depends on T6 (same phase) + T4 + T5
- **Phase 4 (Probes)**: T10 — depends on all prior phases
