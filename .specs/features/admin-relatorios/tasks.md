# Admin Relatórios/Documentos Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/admin-relatorios/design.md`
**Status**: Approved

---

## Test Coverage Matrix

> Generated from codebase. No formal test framework (QA-001: enters Phase 10). Verification via probe scripts (static + runtime) + build gates. Guidelines: `AGENTS.md` (SDD workflow gates).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Migration / DB schema | static probes | Table `documents`, CHECK categories, RLS policies (`can_access('relatorios')`, no anon), bucket privado + storage policies, indexes | `supabase/migrations/0015_*.sql` | `probes-admin-relatorios.sh` (static section) |
| Service layer (CSV + docs) | runtime probes | CSV export each type, totals row, period filter, RFC 4180 escaping; upload/list/download/delete, error paths (400/404/500 rollback) | `src/lib/admin/relatorios.ts` | `probes-admin-relatorios.sh` (runtime section) |
| API routes | runtime probes | Happy path + error paths (400/401/403/404) for exportar, documentos (POST/GET), [id] (DELETE), [id]/download | `src/app/api/admin/relatorios/` | `probes-admin-relatorios.sh` (runtime section) |
| RBAC | runtime probes | FINANCEIRO uploads/deletes; SECRETARIA/PATRIMONIAL/LIDER read/download only (403 write); MEMBRO proxy redirect + 403; anon 401 | páginas + rotas `relatorios` | `probes-admin-relatorios.sh` (runtime section) |
| UI pages | static probes | Page sections (Relatórios/Documentos), category chips, upload form writer-only, download links, dash card | `src/app/admin/relatorios/`, `src/app/admin/page.tsx` | `probes-admin-relatorios.sh` (static section) |
| Types / config | build gate only | TypeScript compilation | `src/lib/admin/relatorios-constants.ts` | `npm run typecheck` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After individual tasks | `npm run lint && npm run typecheck` |
| Build | After phase completion | `npm run build` |
| Full | After all tasks (before Verifier) | `npm run lint && npm run typecheck && npm run build && bash scripts/probes-admin-relatorios.sh && bash scripts/probes-all.sh` |

---

## Execution Plan

Phases are ordered and run sequentially — each phase completes before the next begins, and tasks within a phase execute in order. Arrow = dependency (`A -> B` means B depends on A).

### Phase 1: Foundation (DB + Types)

T1, T2 — independent (T1 = migration, T2 = types/constants).

### Phase 2: Service Layer

T3 (dep T2) → T4 (dep T1, T2).

### Phase 3: API Routes

T5 (dep T3) → T6 (dep T4, T5) → T7 (dep T4, T6) → T8 (dep T4).

### Phase 4: UI Pages

T9 (dep T6, T7) → T10 (dep T9).

### Phase 5: Probes

T11 (dep T9, T10).

### Phase 6: Regressions

T12 (dep T11).

### Full Dependency Diagram

```txt
T2 -> T3
T1 -> T4
T2 -> T4
T3 -> T5
T4 -> T6
T5 -> T6
T4 -> T7
T6 -> T7
T4 -> T8
T6 -> T9
T7 -> T9
T9 -> T10
T9 -> T11
T10 -> T11
T11 -> T12
```

---

## Task Breakdown

### T1: Migration 0015 — public.documents + bucket privado `documentos`

**What**: Create `supabase/migrations/0015_relatorios_documentos.sql` with `public.documents` (CHECK categories), RLS via `can_access('relatorios', ...)` (no anon), indexes, and storage bucket `documentos` (private, 10MB, mime whitelist) with INSERT/UPDATE/DELETE policy for `escrever` and SELECT policy for `ler`
**Where**: `supabase/migrations/0015_relatorios_documentos.sql`
**Depends on**: None
**Reuses**: Migration pattern from `0013_assets.sql` (table + RLS via `can_access` + CHECK + no anon) and storage pattern from `0011_igrejas_lideranca.sql` (bucket + policies, incl. SELECT policy for storage ops — lição `2737ca0`)
**Requirement**: REL-09, REL-13, REL-23

**Tools**:

- MCP: `supabase` (apply migration to dev `[REDACTED_PROJECT_REF]`)
- Skill: NONE

**Done when**:

- [x] `documents` table: id pk, title CHECK length>0, description, category CHECK in (FINANCEIRO/MEMBROS/EVENTOS/PATRIMONIO/IGREJAS/GERAL), file_path UNIQUE, file_name, mime_type, file_size CHECK >=0, uploaded_by → auth.users, created_at
- [x] Indexes: `idx_documents_category`, `idx_documents_created_at` (created_at desc)
- [x] RLS: SELECT authenticated `can_access('relatorios','ler')`; INSERT/UPDATE/DELETE `can_access('relatorios','escrever')` — sem anon, sem role-lists (L-006)
- [x] Bucket `documentos`: `public=false`, `file_size_limit=10485760`, `allowed_mime_types` (PDF/CSV/xls/xlsx/doc/docx/ods/odt)
- [x] Storage policies: INSERT/UPDATE/DELETE via `can_access('relatorios','escrever')`; SELECT authenticated via `can_access('relatorios','ler')` (necessário p/ signed URL/upsert — lição foto)
- [x] Migration applied to dev `[REDACTED_PROJECT_REF]` via MCP

**Tests**: static probes (migration structure, in T11)
**Gate**: build (migration applied, `supabase_list_tables` verifies)

**Commit**: `feat(relatorios): migration 0015 — documents + bucket privado`

---

### T2: Types module — relatorios-constants.ts

**What**: Create `src/lib/admin/relatorios-constants.ts` with pure types/constants: `DOCUMENT_CATEGORIES`, `DOCUMENT_MIME_TYPES`, `DOCUMENT_MAX_BYTES`, `DocumentoCategoria`, `Documento`, `DocumentoDados` (no server-only imports)
**Where**: `src/lib/admin/relatorios-constants.ts`
**Depends on**: None
**Reuses**: Pattern from `src/lib/admin/asset-types.ts` (pure constants/types module)
**Requirement**: REL-08, REL-23

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `DOCUMENT_CATEGORIES` = FINANCEIRO/MEMBROS/EVENTOS/PATRIMONIO/IGREJAS/GERAL as const
- [x] `DOCUMENT_MIME_TYPES` whitelist matches migration bucket
- [x] `DOCUMENT_MAX_BYTES = 10 * 1024 * 1024`
- [x] Types `Documento`, `DocumentoDados`, `DocumentoCategoria` exported
- [x] No `server-only`/supabase imports (client-safe)
- [x] `npm run lint && npm run typecheck` pass

**Tests**: build gate only (from coverage matrix)
**Gate**: quick

**Commit**: `feat(relatorios): tipos e constantes de documentos`

---

### T3: Service layer — geração de CSV (financeiro, membros, eventos, patrimônio)

**What**: Create `src/lib/admin/relatorios.ts` with `escapaCSV` (RFC 4180), `gerarCSVFinanceiro(filtros)` with totals, `gerarCSVMembros()`, `gerarCSVEventos()`, `gerarCSVPatrimonio()` — each returning `{ csv, filename }`, consuming the existing module list functions
**Where**: `src/lib/admin/relatorios.ts`
**Depends on**: T2
**Reuses**: `listarLancamentos(filtros)` + `LancamentoFiltros` (`financeiro.ts`), `listMembros(filtros)` (`membros.ts`), `listarEventos()` (`eventos.ts`), `listarAssets()` (`assets.ts`)
**Requirement**: REL-02, REL-03, REL-04, REL-05, REL-06, REL-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `escapaCSV` quotes fields with embedded `"`/`;`/newline (RFC 4180)
- [x] `gerarCSVFinanceiro` respects período (data_inicio/data_fim), ordena `data` desc, columns exact (Data;Tipo;Metodo;Status;Categoria;Descricao;Valor)
- [x] Totals row: Receitas, Despesas, Saldo from filtered rows (valor `toFixed(2)` com vírgula)
- [x] `gerarCSVMembros` (Matricula;Nome;Status;Nascimento;Whatsapp;Cidade), `gerarCSVEventos` (Titulo;Data;Hora;Local;Visivel;Status), `gerarCSVPatrimonio` (Nome;Categoria;Tombo;Local;Valor Aquisicao;Data Aquisicao;Responsavel;Status)
- [x] CSV prefixado com BOM `\uFEFF`, separador `;`
- [x] Filenames: `relatorio-financeiro-<data>.csv`, `relatorio-membros.csv`, `relatorio-eventos.csv`, `relatorio-patrimonio.csv`
- [x] `npm run lint && npm run typecheck` pass

**Tests**: runtime probes (CSV content assertions — in T11)
**Gate**: quick

**Commit**: `feat(relatorios): geradores de CSV dos relatórios`

---

### T4: Service layer — documentos (CRUD + signed URL)

**What**: Add to `src/lib/admin/relatorios.ts`: `listarDocumentos(categoria?)`, `subirDocumento(dados, file)` with validation + storage upload + row insert + rollback, `buscarDocumento(id)`, `removerDocumento(id)`, `urlDownloadDocumento(id)` (signed URL 60s)
**Where**: `src/lib/admin/relatorios.ts`
**Depends on**: T1, T2
**Reuses**: Upload/validation pattern from `subirFotoLider` (`lideranca.ts:361`), exception classes pattern (`assets.ts`)
**Requirement**: REL-09, REL-11, REL-13, REL-14, REL-16

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `listarDocumentos` orders `created_at desc`, optional `categoria` filter
- [x] `subirDocumento`: path sempre `documentos/{uuid}.{ext}` (nunca nome do usuário); valida title/categoria/mime/tamanho → exceptions tipadas
- [x] Rollback: upload ok + insert falha → remove objeto storage (sem órfão, REL-13)
- [x] `removerDocumento` remove row + objeto storage
- [x] `urlDownloadDocumento` usa `createSignedUrl(path, 60)`; inexistente → exception 404
- [x] Exceptions de domínio exportadas (padrão `LancamentoNaoEncontradoError`)
- [x] `npm run lint && npm run typecheck` pass

**Tests**: runtime probes (upload/list/download/delete, rollback — in T11)
**Gate**: quick

**Commit**: `feat(relatorios): service de documentos com storage`

---

### T5: API route — GET /api/admin/relatorios/exportar

**What**: Create `src/app/api/admin/relatorios/exportar/route.ts` — GET with `authAdmin('relatorios')` guard, `tipo` (`financeiro|membros|eventos|patrimonio`) + `data_inicio`/`data_fim` params, returns CSV Response (BOM, `text/csv; charset=utf-8`, `Content-Disposition: attachment`)
**Where**: `src/app/api/admin/relatorios/exportar/route.ts`
**Depends on**: T3
**Reuses**: Guard `authAdmin` (`http.ts`), pattern GET route `financeiro/route.ts`
**Requirement**: REL-02, REL-04, REL-05, REL-06, REL-07, REL-22

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `tipo=financeiro` converte `data_inicio`/`data_fim` para `LancamentoFiltros` e retorna CSV
- [x] `tipo=membros|eventos|patrimonio` retornam CSV correspondente
- [x] `tipo` inválido/ausente → 400 `{ error: "tipo_invalido" }`
- [x] Response com BOM, headers `text/csv; charset=utf-8` + `Content-Disposition: attachment`
- [x] `npm run lint && npm run typecheck` pass

**Tests**: runtime probes (export each tipo 200 + tipo inválido 400 — in T11)
**Gate**: quick

**Commit**: `feat(relatorios): rota de exportação CSV`

---

### T6: API route — POST + GET /api/admin/relatorios/documentos

**What**: Create `src/app/api/admin/relatorios/documentos/route.ts` — POST (multipart: title, category, file) with `requireEscrita('relatorios')` guard + validation 400 per campo; GET (list) with `authAdmin('relatorios')` guard + `categoria` param
**Where**: `src/app/api/admin/relatorios/documentos/route.ts`
**Depends on**: T4, T5
**Reuses**: `requireEscrita`/`erroCampos` (`http.ts`), multipart pattern do route de foto (`lideres/[id]/foto/route.ts`)
**Requirement**: REL-09, REL-10, REL-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] POST parseia `request.formData()`, extrai title/category/file
- [x] Falta title/category/file ou tipo/tamanho inválido → 400 `{ error: "dados_invalidos", campos: {...} }`
- [x] Sucesso → 201 `{ documento }`
- [x] GET lista documentos (filtro `categoria`), guarda de leitura
- [x] Leitor (SECRETARIA/PATRIMONIAL/LIDER) no POST → 403 `nao_autorizado`; anon → 401
- [x] `npm run lint && npm run typecheck` pass

**Tests**: runtime probes (upload 201, 400 por campo, 403 leitor, 401 anon, list — in T11)
**Gate**: quick

**Commit**: `feat(relatorios): rota de upload e listagem de documentos`

---

### T7: API route — DELETE /api/admin/relatorios/documentos/[id]

**What**: Create `src/app/api/admin/relatorios/documentos/[id]/route.ts` — DELETE with `requireEscrita('relatorios')` guard; removes metadata row + storage object; 404 inexistente
**Where**: `src/app/api/admin/relatorios/documentos/[id]/route.ts`
**Depends on**: T4, T6
**Reuses**: 404 pattern de `financeiro/[id]` (`http.ts` guards)
**Requirement**: REL-15, REL-16, REL-17, REL-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] DELETE remove row+objeto → 200 `{ ok: true }`; inexistente → 404 `{ error: "nao_encontrado" }`
- [x] Leitor no DELETE → 403 `nao_autorizado`; anon → 401
- [x] `npm run lint && npm run typecheck` pass

**Tests**: runtime probes (delete 200/404/403 — in T11)
**Gate**: quick

**Commit**: `feat(relatorios): rota de exclusão de documento`

---

### T8: API route — GET /api/admin/relatorios/documentos/[id]/download

**What**: Create `src/app/api/admin/relatorios/documentos/[id]/download/route.ts` — GET with `authAdmin('relatorios')` (leitura) guard; redirects 307 to signed URL (60s); 404 inexistente
**Where**: `src/app/api/admin/relatorios/documentos/[id]/download/route.ts`
**Depends on**: T4
**Reuses**: `urlDownloadDocumento` (T4), `NextResponse.redirect`, guard `authAdmin` (`http.ts`)
**Requirement**: REL-14, REL-15, REL-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] GET download: documento existe → 307 redirect signed URL; inexistente → 404 `{ error: "nao_encontrado" }`
- [x] Leitor consegue baixar (200 no follow); anon → 401
- [x] `npm run lint && npm run typecheck` pass

**Tests**: runtime probes (download 307/404, leitor 200 — in T11)
**Gate**: quick

**Commit**: `feat(relatorios): rota de download de documento (signed URL)`

---

### T9: Page — /admin/relatorios

**What**: Create `src/app/admin/relatorios/page.tsx` — RSC com guarda `ler` (denied-block), seção Relatórios (form GET período financeiro + links export membros/eventos/patrimônio) e seção Documentos (chips categoria `next/link`, lista cronológica, form upload p/ escritores, links download p/ todos, excluir p/ escritores, empty state)
**Where**: `src/app/admin/relatorios/page.tsx`
**Depends on**: T6, T7
**Reuses**: Pattern da página `financeiro/page.tsx` (denied-block, chips `next/link` AD-016, GET form)
**Requirement**: REL-01, REL-11, REL-19

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Guarda `ler` com denied-block + voltar ao painel
- [ ] Seção Relatórios: form GET (data_inicio/data_fim) + 3 links de export (membros/eventos/patrimônio)
- [ ] Seção Documentos: chips categoria `next/link` + lista cronológica (título, categoria, tamanho, data, autor) + empty state "Nenhum documento cadastrado"
- [ ] Form upload multipart visível só p/ escritores (POST `/api/admin/relatorios/documentos`)
- [ ] Download link p/ todos os leitores; botão excluir p/ escritores
- [ ] `npm run lint && npm run typecheck && npm run build` pass

**Tests**: static probes (page structure, in T11)
**Gate**: build

**Commit**: `feat(relatorios): página do módulo relatórios/documentos`

---

### T10: Dashboard — card Relatórios

**What**: Add "Relatórios" navigation card ao `/admin` dashboard linkando `/admin/relatorios`
**Where**: `src/app/admin/page.tsx`
**Depends on**: T9
**Reuses**: Existing card pattern (Financeiro card) + lucide `BarChart3` icon
**Requirement**: REL-20, REL-21

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Card "Relatórios" with icon, title and subtitle, `<Link href="/admin/relatorios">`
- [ ] Placed after Financeiro card; layout unchanged for other cards
- [ ] `npm run lint && npm run typecheck` pass

**Tests**: static probes (dash card presence, in T11)
**Gate**: quick

**Commit**: `feat(relatorios): card Relatórios no dashboard`

---

### T11: Probes — probes-admin-relatorios.sh

**What**: Create comprehensive probe script for admin-relatorios (static + runtime)
**Where**: `scripts/probes-admin-relatorios.sh`
**Depends on**: T9, T10
**Reuses**: Pattern from `scripts/probes-admin-financeiro.sh` (login flows, CRUD, RBAC discrimination, error assertions, trap EXIT, residue cleanup)
**Requirement**: REL-01..23

**Tools**:

- MCP: NONE (probes run against running server)
- Skill: NONE

**Done when**:

- [ ] **Static probes**: migration (documents table + CHECK categories + RLS via `can_access` no anon + bucket privado + storage policies + indexes), service file, constants module (client-safe), API routes, page structure, dash card
- [ ] **Runtime — exports**: login ADMIN → export financeiro com período → 200 + CSV com BOM `;` e totais; membros/eventos/patrimonio → 200 CSV com cabeçalho esperado; tipo inválido → 400 `tipo_invalido`
- [ ] **Runtime — RBAC**: FINANCEIRO upload → 201; SECRETARIA lê 200 + upload 403; LIDER lê 200 + delete 403; MEMBRO proxy redirect + 403; anon → 401
- [ ] **Runtime — upload**: 400 por campo (title vazio, categoria inválida, arquivo não-whitelisted, >10MB)
- [ ] **Runtime — download/delete**: upload → GET download 307 (follow → 200); delete → 200 `ok:true`; second delete → 404 `nao_encontrado`; download inexistente → 404
- [ ] **Runtime — listagem/categoria**: GET documentos lista; `?categoria=FINANCEIRO` filtra (REL-11); documento criado presente
- [ ] Trap EXIT cleanup idempotente (remove documentos criados + storage objects)
- [ ] Discriminators per role (L-006, L-007, L-008): assert redirect targets, assert specific error bodies
- [ ] Probe script runs: `bash scripts/probes-admin-relatorios.sh` → all ok, 0 falhas

**Tests**: probes (self-executing)
**Gate**: full (`npm run lint && npm run typecheck && npm run build && bash scripts/probes-admin-relatorios.sh`)

**Commit**: `test(relatorios): probes por AC do módulo relatórios/documentos`

---

### T12: Regressões — probes-all.sh + coverage matrix

**What**: Run full regression suite and update coverage matrix
**Where**: `docs/coverage-matrix.md`
**Depends on**: T11
**Reuses**: `scripts/probes-all.sh` (existing regression runner)
**Requirement**: All

**Tools**:

- MCP: NONE (manual residue cleanup via MCP se necessário)
- Skill: NONE

**Done when**:

- [ ] `bash scripts/probes-all.sh` runs all probe suites: auth (19), painel (27), membros (139), liderança (102), eventos (71), patrimonio (67), financeiro (99), relatorios (novo) → all 0 falhas (resíduo painel `membro.semcadastro` limpo via MCP se aparecer)
- [ ] `npm run lint && npm run typecheck && npm run build` all pass
- [ ] `docs/coverage-matrix.md` updated: RF-027 row com `admin-relatorios` REL-01..23 → ✅ verified
- [ ] `validate_state.py admin-relatorios` 0 errors (após validation.md)
- [ ] No regressions in existing modules

**Tests**: regression suite (probes-all.sh)
**Gate**: full

**Commit**: `test(relatorios): regressões e coverage matrix RF-027`