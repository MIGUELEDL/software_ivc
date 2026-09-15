# Patrimônio (RF-025) — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/admin-patrimonio/design.md`
**Status**: Completed

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md` (gates `npm run lint`/`typecheck`/`build` até F10; runner entra na F10 — AD-006/QA-001), prática das features anteriores (`scripts/probes-*.sh` como camada de teste por AC — QA-002), lessons L-006 (assertar role lists), L-007 (assertar redirect target no login), L-008 (assert explícito para negativos).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Migration / schema / RLS / seed (`0013`) | probe estático (grep do `.sql`) + checagem SQL (MCP) | tabela `assets` (colunas/CHECK categoria/índice único parcial), RLS `can_access('patrimonio',...)` **sem `anon`** (SELECT), escrita `escrever`, sem policy DELETE, seed `Kit de Som` + `patrimonial.teste` | `supabase/migrations/0013*.sql` + asserts em `scripts/probes-admin-patrimonio.sh` | `bash scripts/probes-admin-patrimonio.sh` |
| Service (`src/lib/admin/assets.ts`) | probe estático por semântica + typecheck | 1:1 ACs PAT; CRUD assets, exceção 404, validação por campo (enum/valor/data/status), `numero_patrimonio` duplicado → 409 | `scripts/probes-admin-patrimonio.sh` (asserts grep) | `bash scripts/probes-admin-patrimonio.sh` |
| Guardas/rotas (`/api/admin/assets*`) | probe estático (guards `patrimonio`) + **e2e runtime** | `requireEscrita('patrimonio')`/`authAdmin('patrimonio')`; shapes 401/403/400/404/409 preservados; PATCH aceita `status` | `scripts/probes-admin-patrimonio.sh` (curl) | `bash scripts/probes-admin-patrimonio.sh` |
| Páginas admin + dashboard (`/admin/patrimonio*`, `/admin/page.tsx`) | probe estático + **e2e runtime** agregado | lista 200 (papel leitor), ações de escrita visíveis só com `can('patrimonio','escrever')`; toggle `status` sem DELETE; cards Eventos+Patrimônio no dashboard | `scripts/probes-admin-patrimonio.sh` | `bash scripts/probes-admin-patrimonio.sh` |
| RLS admin-only (mens `anon`/MEMBRO) | probe estático + **check SQL (MCP)** | SELECT policy sem `anon`; sessão anon vazia; MEMBRO 403/redirect | `supabase/migrations/0013*.sql` + asserts runtime | `bash scripts/probes-admin-patrimonio.sh` |
| Entity / config | none | - (build gate only) | - | `npm run lint && npm run typecheck && npm run build` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Após tarefas de lib/schema (sem rotas novas) | `npm run typecheck` (com PATH nvm; ver AGENTS.md) |
| Full | Após rotas/páginas/probes | `bash scripts/probes-admin-patrimonio.sh` (servidor :3000) + `npm run lint && npm run typecheck && npm run build` |
| Build | Fechamento de fase / tarefas só de config/entity | `npm run lint && npm run typecheck && npm run build` |

> PATH do Node: `export PATH="$HOME/.nvm/versions/node/v$(cat .nvmrc).0/bin:$PATH"` antes dos gates.

---

## Execution Plan

Phases são ordenadas e sequenciais. Tasks dentro de cada fase executam em ordem.

### Phase 1: Banco — schema + RLS + seed (migration 0013)

Tabela `assets` (CHECK categoria, índice único parcial), RLS `can_access('patrimonio',...)`
**sem anon**, seed `Kit de Som` + `patrimonial.teste`.

```
T1
```

### Phase 2: Service layer (`assets.ts` + validação)

CRUD assets com exceção 404 e 409 (tombo duplicado); `validateAsset` em `validacao.ts`.

```
T2
```

### Phase 3: Route Handlers

Rotas `assets` (POST/GET; PATCH `[id]`), guardadas pela matriz.

```
T2 → T3
T2 → T4
```

### Phase 4: Páginas admin

Lista (RSC) + formulário nova + detalhe/edição com toggle `status` (baixa).

```
T5 → T6
```

### Phase 5: Dashboard admin — cards Eventos + Patrimônio

`/admin/page.tsx` ganha os dois cards (lacuna RF-024 corrigida).

```
T7
```

### Phase 6: Probes e regressão (verificação por AC)

Probes discriminativos por papel + regressão das suítes existentes + gates.

```
T8 → T9
```

---

## Task Breakdown

### Phase 1: Banco — schema + RLS + seed

### T1: Migration 0013 — tabela `assets`, RLS e seed

**What**: Criar `supabase/migrations/0013_assets.sql`: tabela `assets` (id uuid pk,
name text not null, category text not null CHECK in
`AUDIO`/`VIDEO`/`INSTRUMENTO`/`MOBILIA`/`EQUIPAMENTO`/`RELIGIOSO`/`OUTRO`,
numero_patrimonio text null com **índice único parcial** `where numero_patrimonio
is not null`, location text null, acquisition_value numeric null (check >= 0),
acquisition_date date null, responsible text null, status text not null default
'ATIVO' check in `ATIVO`/`INATIVO`, observations text null, timestamps); RLS:
SELECT `to authenticated` com `can_access('patrimonio','ler')` — **sem `anon`**;
INSERT/UPDATE `to authenticated` com `can_access('patrimonio','escrever')`;
**nenhuma** policy DELETE. Seed idempotente: bem "Kit de Som" (AUDIO, PAT-0001,
Templo, 2500.00, 2024-03-15, Equipe de Som, ATIVO) e usuário
`patrimonial.teste@ivc.local` (papel PATRIMONIAL, id
`00000000-0000-4000-8000-000000000007`, `senha-teste`, force_password_change=false,
padrão 0007/0009). Aplicar no dev `[REDACTED_PROJECT_REF]` via MCP e validar por SQL.
**Where**: `supabase/migrations/0013_assets.sql`
**Depends on**: None
**Reuses**: padrão 0005/0006/0008 (security definer + `auth_role()` + `can_access`), seed user 0007/0009
**Requirement**: PAT-01, PAT-02, PAT-03, PAT-10, PAT-11

**Tools**:
- MCP: `supabase` (aplicar migration + checagens SQL no dev)
- Skill: NONE

**Done when**:
- [x] SQL versionado com `assets` (CHECK categoria, índice único parcial, status default), RLS SELECT/INSERT/UPDATE **sem anon**, sem DELETE
- [x] RLS: SELECT `can_access('patrimonio','ler')` (authenticated only); escrita `can_access('patrimonio','escrever')`
- [x] Seed idempotente `Kit de Som` + `patrimonial.teste` (papel PATRIMONIAL)
- [x] Migration aplicada no dev via MCP sem erro
- [x] SQL/MCP: policy SELECT sem anon confere; tabela listada sem policy DELETE

**Tests**: probe estático (greps no `.sql`: tabela, CHECK, índice único, RLS sem anon, sem DELETE, seed) + checagem SQL via MCP
**Gate**: quick
**Status**: ✅ Done (2026-09-14 — migration aplicada no dev `[REDACTED_PROJECT_REF]`; MCP valida schema/RLS/seed/índice único/anon vazio)

### Phase 2: Service layer

### T2: Service layer — `src/lib/admin/assets.ts` + `validateAsset`

**What**: Criar `src/lib/admin/assets.ts` (padrão `eventos.ts`) com tipos `Asset`/
`AssetDados`/`AssetPatch`, exceção `BemNaoEncontradoError`, e funções
`listarAssets()` (todos, `name` asc — admin), `criarAsset()`, `atualizarAsset()`
(404 se inexistente; aceita `status`). Adicionar `validateAsset` em
`src/lib/admin/validacao.ts`: `name` obrigatório não-vazio; `category` no enum
fixo; `numero_patrimonio` não-vazia quando presente; `acquisition_value` numeric
>= 0; `acquisition_date` `YYYY-MM-DD`; `status` `ATIVO`/`INATIVO` quando enviado.
Expor uma constante `ASSET_CATEGORIES` (enum) para a UI e a validação.
**Where**: `src/lib/admin/assets.ts`, `src/lib/admin/validacao.ts`
**Depends on**: T1
**Reuses**: padrão de `src/lib/admin/eventos.ts`; `createServerClient` (session client); `validarDataEvento`
**Requirement**: PAT-01..11

**Tools**:
- MCP: `supabase` (confirmar schema pós-0013 p/ tipagem)
- Skill: NONE

**Done when**:
- [x] Service com CRUD assets, exceção 404 e lista `name` asc
- [x] `validateAsset` com enum/valor/data/status; `ASSET_CATEGORIES` exportado
- [x] Gate quick passa: `npm run typecheck` (PATH nvm ativado)

**Tests**: probe estático (asserts T2 no script) + typecheck
**Gate**: quick
**Status**: ✅ Done (2026-09-14 — probes 67/0, regressoes 358/0, gates verdes)


### Phase 3: Route Handlers

### T3: Rotas `POST/GET /api/admin/assets`

**What**: Criar `src/app/api/admin/assets/route.ts`: POST com `requireEscrita('patrimonio')`,
validação por campo via `validateAsset` → 400 `{error, campos}`, 201 com asset
(status default 'ATIVO'); GET com `authAdmin('patrimonio')`, lista `name` asc
(inclui INATIVO). Converter erro `23505` (índice único) → 409
`{error:"numero_patrimonio_duplicado"}`.
**Where**: `src/app/api/admin/assets/route.ts`
**Depends on**: T2
**Reuses**: `erroCampos`/guards de `src/lib/admin/http.ts`; padrão rota `eventos`
**Requirement**: PAT-04, PAT-05, PAT-06, PAT-07

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] POST cria asset 201 (ATIVO default); valida campos → 400 discriminado; tombo duplicado → 409; 401/403 sem escrita
- [x] GET lista para leitor 200 ordenado por `name` asc
- [x] Gate quick passa: `npm run typecheck`

**Tests**: probe estático (guards/validação) + runtime curl das rotas
**Gate**: quick
**Status**: ✅ Done (2026-09-14 — probes 67/0, regressoes 358/0, gates verdes)


### T4: Rota `PATCH /api/admin/assets/[id]` (incl. `status` baixa)

**What**: Criar `src/app/api/admin/assets/[id]/route.ts`: `requireEscrita('patrimonio')`,
valida apenas campos enviados (parcial) → 200; asset inexistente → 404
`{error:"nao_encontrado"}`; aceita `status` `ATIVO`/`INATIVO` (baixa). Tombo
duplicado → 409. Sem rota DELETE (PAT-03).
**Where**: `src/app/api/admin/assets/[id]/route.ts`
**Depends on**: T2
**Reuses**: `erroCampos`; padrão rota `eventos/[id]` (PATCH parcial)
**Requirement**: PAT-08, PAT-09, PAT-10, PAT-03

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] PATCH atualiza campos enviados e responde 200; 404 inexistente; 409 tombo duplicado
- [x] `status='INATIVO'` persistido (baixa/soft-delete); campo inválido → 400
- [x] Sem rota/action DELETE
- [x] Gate quick passa: `npm run typecheck`

**Tests**: probe estático + runtime curl
**Gate**: quick
**Status**: ✅ Done (2026-09-14 — probes 67/0, regressoes 358/0, gates verdes)


### Phase 4: Páginas admin

### T5: Páginas `/admin/patrimonio` e `/admin/patrimonio/nova`

**What**: Criar `src/app/admin/patrimonio/page.tsx` (RSC): guarda leitura via
`can('patrimonio','ler')` (redirect 403), lista bens com nome/categoria/tombo/
localização/status/valor, ações de edição/baixa por nível, link "Novo bem"; e
`nova/page.tsx` (client form): campos nome/categoria (select do enum)/tombo/
localização/valor/data de aquisição/responsável/observações → `POST
/api/admin/assets` com 400 por campo, 409 tombo duplicado e redirect ao detalhe.
**Where**: `src/app/admin/patrimonio/page.tsx`, `src/app/admin/patrimonio/nova/page.tsx`
**Depends on**: T3
**Reuses**: padrão RSC de `src/app/admin/eventos`; `can()`; `ASSET_CATEGORIES`
**Requirement**: PAT-04, PAT-05, PAT-07

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Lista para papel leitor 200; badges de `status`; ações de escrita ocultas p/ leitor
- [x] Form cria asset com 400 por campo, 409 duplicado e redirect
- [x] Gate quick passa: `npm run typecheck` (+ lint)

**Tests**: probe estático (guardas/badges) + runtime curl páginas
**Gate**: quick
**Status**: ✅ Done (2026-09-14 — probes 67/0, regressoes 358/0, gates verdes)


### T6: Página `/admin/patrimonio/[id]` — detalhe/edição + baixa

**What**: Criar `src/app/admin/patrimonio/[id]/page.tsx`: RSC lê asset (404 se
inexistente; uso de `listarAssets()` admin); painel edita (PATCH parcial) com
toggle `status` `ATIVO`/`INATIVO` (baixa); sem botão DELETE. Guarda de escrita por
`can('patrimonio','escrever')`; papéis leitores veem detalhe sem ações.
**Where**: `src/app/admin/patrimonio/[id]/page.tsx`
**Depends on**: T4, T5
**Reuses**: padrão de páginas/formulários admin existentes
**Requirement**: PAT-08, PAT-09, PAT-10

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Detalhe lê asset; 404 inexistente
- [x] Form de edição inclui toggle `status` ATIVO/INATIVO (sem DELETE)
- [x] Ações de escrita ocultas p/ leitor
- [x] Gate quick passa: `npm run typecheck` (+ lint)

**Tests**: probe estático + runtime curl páginas
**Gate**: quick
**Status**: ✅ Done (2026-09-14 — probes 67/0, regressoes 358/0, gates verdes)


### Phase 5: Dashboard

### T7: Dashboard admin — cards Eventos + Patrimônio

**What**: Editar `src/app/admin/page.tsx`: adicionar card "Eventos" (`/admin/eventos`,
ícone `CalendarDays`, subtitle "Gestão dos eventos e agenda da igreja") e card
"Patrimônio" (`/admin/patrimonio`, ícone `Package`, subtitle "Inventário dos bens
da igreja"), mantendo os padrões visuais dos cards existentes (Membros `Users`,
Igrejas & Liderança `Church`). Regressão dashboard: cards existentes (Membros,
Igrejas & Liderança) intactos.
**Where**: `src/app/admin/page.tsx`
**Depends on**: T5
**Reuses**: padrão visual dos cards existentes (lucide-react)
**Requirement**: PAT-12

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `/admin` renderiza cards Eventos e Patrimônio com hrefs corretos
- [x] Cards Membros/Igrejas & Liderança intactos; typecheck + lint passam
- [x] Gate quick passa: `npm run typecheck` (+ lint)

**Tests**: probe estático (greps de href/ícone/subtitle) + runtime (HTML do /admin contém os cards)
**Gate**: quick
**Status**: ✅ Done (2026-09-14 — probes 67/0, regressoes 358/0, gates verdes)


### Phase 6: Probes e regressão

### T8: Script `scripts/probes-admin-patrimonio.sh`

**What**: Criar script executável com: estático (greps na migration 0013 — tabela,
CHECK categoria, índice único parcial, RLS can_access **sem anon** em SELECT,
ausência de DELETE; guards de rotas; service validação; páginas admin; dashboard
cards; seeds) e runtime com sessões reais: PATRIMONIAL (patrimonial.teste) POST
201/PATCH 200 (incl. `status='INATIVO'` baixa)/GET 200; ADMIN POST 201 (hierarquia
administrar > escrever); leitor (leitor.teste FINANCEIRO, patrimonio=ler) GET 200,
POST/PATCH 403; SECRETARIA (secretaria.teste, patrimonio=ler) GET 200 e POST 403
(discriminador: escreve igrejas mas não patrimônio); MEMBRO 403/redirect; POST
inválido → 400+`campos` (PAT-05); PATCH inexistente → 404+`nao_encontrado`
(PAT-09); tombo duplicado → 409; `anon` não lê (API 401 + SQL vazio via MCP — a
menos que cheque anon impossível via curl, então cobrir pelo GET sem sessão → 401
e policy sem anon no estático). Trap EXIT clean (re-ativar seed, apagar assets
criados). Registra contagem ok/falhas.
**Where**: `scripts/probes-admin-patrimonio.sh`
**Depends on**: T1..T7
**Reuses**: padrão `scripts/probes-admin-eventos.sh` (sessões/curl/assert; L-007/008)
**Requirement**: PAT-01..12

**Tools**:
- MCP: `supabase` (limpar resíduo entre runs; verificar sessões/policies)
- Skill: NONE

**Done when**:
- [x] Suite roda limpa contra `next start` :3000 → 0 falhas (PATRIMONIAL, ADMIN, leitor, SECRETARIA, MEMBRO, 400/404/409, dashboard)
- [x] Discriminadores por papel ok (403 leitor/scretaria em escrita; 201 PATRIMONIAL/ADMIN; SELECT sem anon)
- [x] Resíduo limpo entre runs (idempotente) — trap EXIT
- [x] Regressões `probes-admin-eventos.sh`, `probes-admin-lideranca.sh`, `probes-admin-membros.sh`, `probes-painel.sh`, `probes-auth.sh` verdes + lint/typecheck/build

**Tests**: `bash scripts/probes-admin-patrimonio.sh` (servidor :3000) + suítes de regressão
**Gate**: full
**Status**: ✅ Done (2026-09-14 — probes 67/0, regressoes 358/0, gates verdes)


### T9: Fechamento — state/coverage/matrix/handoff

**What**: Marcar tasks como done no `tasks.md`; escrever `validation.md` provisório
(não final — Verifier assina); atualizar `docs/coverage-matrix.md` (linha RF-025 →
✅ com evidência), `.specs/STATE.md` (Handoff admin-eventos → admin-patrimonio,
decisões AD) se aplicável; rodar `validate_state.py admin-patrimonio` (0 errors
após verificação) e gates finais.
**Where**: `.specs/features/admin-patrimonio/tasks.md`, `validation.md`, `docs/coverage-matrix.md`, `.specs/STATE.md`
**Depends on**: T8
**Reuses**: padrão de fechamento das features anteriores
**Requirement**: — (processo)

**Tools**:
- Skill: NONE
- MCP: NONE

**Done when**:
- [x] tasks.md com todas as tarefas ✅ e cobertura 12/12 — validation.md Verifier PASS (12/12, sensor 3/3)
- [x] coverage-matrix RF-025 ✅ verified com evidência — `docs/coverage-matrix.md`
- [x] `validate_state.py admin-patrimonio` 0 erros (após Verifier PASS)
- [x] Gates finais (lint/typecheck/build) verdes

**Tests**: `validate_state.py admin-patrimonio` + gates
**Gate**: build
**Status**: ✅ Done (2026-09-14 — probes 67/0, regressoes 358/0, gates verdes)
