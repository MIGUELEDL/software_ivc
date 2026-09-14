# Eventos (RF-024) — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/admin-eventos/design.md`
**Status**: In Progress

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md` (gates `npm run lint`/`typecheck`/`build` até F10; runner entra na F10 — AD-006/QA-001), prática das features anteriores (`scripts/probes-*.sh` como camada de teste por AC — QA-002), lessons L-006 (assertar role lists), L-007 (assertar redirect target no login), L-008 (assert explícito para negativos).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Migration / schema / RLS / seed (`0012`) | probe estático (grep do `.sql`) + checagem SQL (MCP) | tabela `events` (colunas/check `status`/default `visivel`), RLS (SELECT anon/authenticated, escrita `can_access('eventos','escrever')`, sem policy DELETE), seed `Clamor 12h` | `supabase/migrations/0012*.sql` + asserts em `scripts/probes-admin-eventos.sh` | `bash scripts/probes-admin-eventos.sh` |
| Service (`src/lib/admin/eventos.ts`) | probe estático por semântica + typecheck | 1:1 ACs EVT; CRUD eventos, `listarEventosPublicos()`, `buscarEventoPublico()`, exceção 404, validação por campo | `scripts/probes-admin-eventos.sh` (asserts grep) | `bash scripts/probes-admin-eventos.sh` |
| Guardas/rotas (`/api/admin/eventos*`) | probe estático (guards `eventos`) + **e2e runtime** | `requireEscrita('eventos')`/`authAdmin('eventos')`; shapes 401/403/400/404 preservados; PATCH aceita `visivel`/`status` | `scripts/probes-admin-eventos.sh` (curl) | `bash scripts/probes-admin-eventos.sh` |
| Páginas admin (`/admin/eventos{,/nova,/\[id\]}`) | probe estático + **e2e runtime** agregado | lista 200 (papel leitor), ações de escrita visíveis só com `can('eventos','escrever')`; toggle `visivel`/`status` sem DELETE | `scripts/probes-admin-eventos.sh` | `bash scripts/probes-admin-eventos.sh` |
| Portal (`/eventos` + `/eventos/[id]`) | probe estático + runtime | páginas DB-driven: leitura de `events` (visivel+ATIVO, `date` asc), 404 para ocultos, WhatsApp preservado (RN-003), empty state; ausência de literal `EVENTS` | `scripts/probes-admin-eventos.sh` | `bash scripts/probes-admin-eventos.sh` |
| Entity / config | none | - (build gate only) | - | `npm run lint && npm run typecheck && npm run build` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Após tarefas de lib/schema (sem rotas novas) | `npm run typecheck` (com PATH nvm; ver AGENTS.md) |
| Full | Após rotas/páginas/probes | `bash scripts/probes-admin-eventos.sh` (servidor dev/start no :3000) + `npm run lint && npm run typecheck && npm run build` |
| Build | Fechamento de fase / tarefas só de config/entity | `npm run lint && npm run typecheck && npm run build` |

> PATH do Node: `export PATH="$HOME/.nvm/versions/node/v$(cat .nvmrc).0/bin:$PATH"` antes dos gates.

---

## Execution Plan

Phases são ordenadas e sequenciais. Tasks dentro de cada fase executam em ordem.

### Phase 1: Banco — schema + RLS + seed (migration 0012)

Tabela `events`, RLS por `can_access('eventos',...)` (sem DELETE), seed `Clamor 12h`.

```
T1
```

### Phase 2: Service layer (`eventos.ts` + validação)

CRUD eventos com exceção 404; `listarEventosPublicos()`/`buscarEventoPublico()`;
`validarEvento` em `validacao.ts`.

```
T2
```

### Phase 3: Route Handlers

Rotas `eventos` (POST/GET; PATCH `[id]`), guardadas pela matriz.

```
T2 → T3
T2 → T4
```

### Phase 4: Páginas admin

Lista (RSC) + formulário nova + detalhe/edição com toggles `visivel`/`status`.

```
T5 → T6
```

### Phase 5: Portal — páginas `eventos` DB-driven

`/eventos` e `/eventos/[id]` async RSC; empty state e WhatsApp preservados.

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

### T1: Migration 0012 — tabela `events`, RLS e seed

**What**: Criar `supabase/migrations/0012_events.sql`: tabela `events` (id, title,
description nullable, date, time, location, visivel default true, status check
`ATIVO`/`INATIVO`, timestamps); RLS: SELECT `to anon, authenticated`, INSERT/UPDATE
`to authenticated` com `can_access('eventos','escrever')`, **nenhuma** policy DELETE;
seed idempotente (`on conflict do nothing`): evento **"Clamor 12h"** (title, descricao
curta, date futura 2026-10-01, time '12:00', location 'Santa Luzia - PB', visivel
true, status ATIVO). Aplicar no dev `[REDACTED_PROJECT_REF]` via MCP e validar por SQL.
**Where**: `supabase/migrations/0012_events.sql`
**Depends on**: None
**Reuses**: padrão 0005/0006/0008 (security definer + `auth_role()` + `can_access`), RLS de `0011` (SELECT anon/authenticated)
**Requirement**: EVT-01, EVT-02, EVT-03, EVT-10, EVT-11, EVT-15

**Tools**:
- MCP: `supabase` (aplicar migration + checagens SQL no dev)
- Skill: NONE

**Done when**:
- [x] SQL versionado com `events` (check `status`, default `visivel`), RLS SELECT/INSERT/UPDATE, sem DELETE
- [x] RLS escrita `can_access('eventos','escrever')`; SELECT anon/authenticated
- [x] Seed idempotente `Clamor 12h` (visivel=true, ATIVO, date futura)
- [x] Migration aplicada no dev via MCP sem erro
- [x] SQL: `can_access('eventos','escrever')` confere; tabela listada sem policy DELETE

**Tests**: probe estático (greps no `.sql`: tabela, RLS, sem DELETE, seed) + checagem SQL via MCP
**Gate**: quick
**Status**: ✅ Done (aplicada no dev `[REDACTED_PROJECT_REF]`; SQL confere: 10 colunas, check `events_status_check`, 3 policies SEM DELETE, seed `Clamor 12h` com visivel=true/ATIVO)

### Phase 2: Service layer

### T2: Service layer — `src/lib/admin/eventos.ts` + `validarEvento`

**What**: Criar `src/lib/admin/eventos.ts` (padrão `lideranca.ts`) com tipos `Evento`/
`EventoDados`/`EventoPatch`, exceção `EventoNaoEncontradoError`, e funções
`listarEventos()` (todos, `date` desc — admin), `listarEventosPublicos()`
(visivel+ATIVO, `date` asc — portal), `buscarEventoPublico(id)` (visivel+ATIVO ou
null), `criarEvento()`, `atualizarEvento()` (404 se inexistente; aceita `visivel` e
`status`). Adicionar `validarEvento` em `src/lib/admin/validacao.ts`: `title`/`date`/
`time`/`location` obrigatórios não vazios, `date` `YYYY-MM-DD`, `time` `HH:MM`,
`visivel` booleano, `status` `ATIVO`/`INATIVO`.
**Where**: `src/lib/admin/eventos.ts`, `src/lib/admin/validacao.ts`
**Depends on**: T1
**Reuses**: padrão de `src/lib/admin/lideranca.ts`; `createServerClient` (session client)
**Requirement**: EVT-01..11, EVT-12, EVT-13, EVT-14

**Tools**:
- MCP: `supabase` (confirmar schema pós-0012 p/ tipagem)
- Skill: NONE

**Done when**:
- [x] Service com CRUD eventos, exceção 404 e filtros público/admin
- [x] `listarEventosPublicos()` visivel+ATIVO `date` asc; `buscarEventoPublico()` ocultos null
- [x] `validarEvento` adicionado e exportado (obrigatórios, date/time/visivel/status)
- [x] Gate quick passa: `npm run typecheck` (PATH nvm ativado)

**Tests**: probe estático (asserts T2 no script) + typecheck
**Gate**: quick
**Status**: ✅ Done (eventos.ts com 5 funções + EventoNaoEncontradoError; validarEvento completo/parcial em validacao.ts; typecheck 0 erros)

### Phase 3: Route Handlers

### T3: Rotas `POST/GET /api/admin/eventos`

**What**: Criar `src/app/api/admin/eventos/route.ts`: POST com `requireEscrita('eventos')`,
validação por campo via `validarEvento` → 400 `{error, campos}`, 201 com evento
(status default `ATIVO`, `visivel` default true); GET com `authAdmin('eventos')`,
lista `date` desc (inclui ocultos/INATIVO).
**Where**: `src/app/api/admin/eventos/route.ts`
**Depends on**: T2
**Reuses**: `erroCampos`/guards de `src/lib/admin/http.ts`; padrão rota `igrejas`
**Requirement**: EVT-04, EVT-05, EVT-06, EVT-07

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] POST cria evento 201 (ATIVO/visivel defaults); valida campos → 400 discriminado; 401/403 sem escrita
- [x] GET lista para leitor 200 ordenado por `date` desc
- [x] Gate quick passa: `npm run typecheck`

**Tests**: probe estático (guards/validação) + runtime curl das rotas
**Gate**: quick
**Status**: ✅ Done (route.ts POST/GET com requireEscrita('eventos')/authAdmin('eventos'), validarEvento completo → 400 por campo, 201 com defaults; typecheck 0 erros)

### T4: Rota `PATCH /api/admin/eventos/[id]` (incl. `visivel` e `status`)

**What**: Criar `src/app/api/admin/eventos/[id]/route.ts`: `requireEscrita('eventos')`,
valida apenas campos enviados (parcial) → 200; evento inexistente → 404 `{error:
"nao_encontrado"}`; aceita `visivel` (toggle) e `status` `ATIVO`/`INATIVO`
(soft-delete). Sem rota DELETE (EVT-03).
**Where**: `src/app/api/admin/eventos/[id]/route.ts`
**Depends on**: T2
**Reuses**: `erroCampos`; padrão rota `lideres/[id]` (PATCH parcial)
**Requirement**: EVT-08, EVT-09, EVT-10, EVT-11

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] PATCH atualiza campos enviados e responde 200; 404 inexistente
- [x] `visivel=false` e `status='INATIVO'` persistidos (ocultam portal); campo inválido → 400
- [x] Sem rota/action DELETE
- [x] Gate quick passa: `npm run typecheck`

**Tests**: probe estático + runtime curl
**Gate**: quick
**Status**: ✅ Done (PATCH parcial via validarEvento('parcial'), aceita visivel/status, 404 {error:'nao_encontrado'}, sem DELETE; typecheck 0 erros)

### Phase 4: Páginas admin

### T5: Páginas `/admin/eventos` e `/admin/eventos/nova`

**What**: Criar `src/app/admin/eventos/page.tsx` (RSC): guarda leitura via
`can('eventos','ler')` (redirect 403), lista eventos com título/data/local e badges
`visivel`/`status`, ações de edição por nível, link "Novo evento"; e
`nova/page.tsx` (client form): campos título/descrição/data/hora/local/visibilidade →
`POST /api/admin/eventos` com 400 por campo e redirect ao detalhe.
**Where**: `src/app/admin/eventos/page.tsx`, `src/app/admin/eventos/nova/page.tsx`
**Depends on**: T3
**Reuses**: padrão RSC de `src/app/admin/lideranca`; `can()`
**Requirement**: EVT-04, EVT-05, EVT-07

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Lista para papel leitor 200; badges de `visivel`/`status`; ações de escrita ocultas p/ leitor
- [x] Form cria evento com 400 por campo e redirect
- [x] Gate quick passa: `npm run typecheck` (+ lint)

**Tests**: probe estático (guardas/badges) + runtime curl páginas
**Gate**: quick
**Status**: ✅ Done (page.tsx lista com badges e ações por nível; nova/ page.tsx + form client com 400 por campo e redirect ao detalhe; typecheck/lint 0 erros)

### T6: Página `/admin/eventos/[id]` — detalhe/edição + toggles

**What**: Criar `src/app/admin/eventos/[id]/page.tsx`: RSC lê evento (404 se
inexistente; uso de `listarEventos()` admin); painel edita (PATCH parcial) com
toggle `visivel` (Visível/Oculto) e toggle `status` `ATIVO`/`INATIVO` (soft-delete);
sem botão DELETE. Guarda de escrita por `can('eventos','escrever')`; papéis leitores
veem detalhe sem ações.
**Where**: `src/app/admin/eventos/[id]/page.tsx`
**Depends on**: T4, T5
**Reuses**: padrão de páginas/formulários admin existentes
**Requirement**: EVT-08, EVT-09, EVT-10, EVT-11

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Detalhe lê evento; 404 inexistente
- [ ] Form de edição inclui toggles `visivel`/`status` (sem DELETE)
- [ ] Ações de escrita ocultas p/ leitor
- [ ] Gate quick passa: `npm run typecheck` (+ lint)

**Tests**: probe estático + runtime curl páginas
**Gate**: quick
**Status**: Pending

### Phase 5: Portal

### T7: Portal — `/eventos` e `/eventos/[id]` DB-driven

**What**: Evoluir `src/app/eventos/page.tsx` para async RSC: `listarEventosPublicos()`
→ grid (título, data, hora, local) com link `/eventos/[id]`, **estado vazio**
preservado quando não houver eventos. Reescrever `src/app/eventos/[id]/page.tsx`
para async RSC: `buscarEventoPublico(id)` → `notFound()` se inexistente/oculto/INATIVO;
**remover `generateStaticParams`** (página dinâmica); manter "Inscrever-se via
WhatsApp" (RN-003/EVT-13) e layout. Preservar item de navegação `Eventos` (EVT-16).
**Where**: `src/app/eventos/page.tsx`, `src/app/eventos/[id]/page.tsx`
**Depends on**: T2
**Reuses**: `listarEventosPublicos`/`buscarEventoPublico`; padrão RSC do portal/liderança
**Requirement**: EVT-12, EVT-13, EVT-14, EVT-15, EVT-16

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `/eventos` renderiza eventos visivel+ATIVO (date asc) lendo de `events` (seed visível)
- [ ] `/eventos/[id]` mostra detalhe + WhatsApp; oculto/INATIVO/inexistente → 404; sem `generateStaticParams`
- [ ] Estado vazio e nav `Eventos` preservados
- [ ] Gate quick passa: `npm run typecheck` (+ lint)

**Tests**: probe estático (grep RSC/remoção de `EVENTS`, sem `generateStaticParams`) + runtime (HTML contém título do seed, 404 oculto)
**Gate**: quick
**Status**: Pending

### Phase 6: Probes e regressão

### T8: Script `scripts/probes-admin-eventos.sh`

**What**: Criar script executável com: estático (greps na migration 0012 — tabela,
RLS can_access, ausência de DELETE; guards de rotas; service filtros; páginas
admin/portal; ausência de literal `EVENTS`/`EVENTS.length` nas páginas) e runtime
com sessões reais: ADMIN cria evento 201, edita 200 (incl. `visivel=false` e
`status=INATIVO`); SECRETARIA (`secretaria.teste`, `eventos=escrever`) POST 201/
PATCH 200; leitor (`leitor.teste`, `eventos=ler`) GET 200, POST/PATCH 403; MEMBRO
(`membro.teste`) 403/redirect; portal `/eventos` contém evento ATIVO+visivel seed e
não contém quando ocultado; `/eventos/[id]` oculto → 404; empty state quando todos
ocultos/inativos. Registra contagem ok/falhas com `trap` de cleanup (re-ativar/reexibir e apagar eventos criados).
**Where**: `scripts/probes-admin-eventos.sh`
**Depends on**: T1..T7
**Reuses**: padrão `scripts/probes-admin-lideranca.sh` (sessões/curl/assert; L-007/008)
**Requirement**: EVT-01..16

**Tools**:
- MCP: `supabase` (limpar resíduo entre runs; verificar sessões)
- Skill: NONE

**Done when**:
- [ ] Suite roda limpa contra `next start` :3000 → 0 falhas (ADMIN, SECRETARIA, leitor, MEMBRO, portal)
- [ ] Discriminadores por papel ok (403 leitor em escrita; 201/200 escritores; portal oculta quando `visivel=false`/INATIVO)
- [ ] Resíduo limpo entre runs (idempotente) — trap EXIT
- [ ] Regressões `probes-admin-lideranca.sh`, `probes-admin-membros.sh`, `probes-painel.sh`, `probes-auth.sh` verdes + lint/typecheck/build

**Tests**: `bash scripts/probes-admin-eventos.sh` (servidor :3000) + suítes de regressão
**Gate**: full
**Status**: Pending

### T9: Fechamento — state/coverage/matrix/handoff

**What**: Marcar tasks como done no `tasks.md`; escrever `validation.md` provisório
(não final — Verifier assina); atualizar `docs/coverage-matrix.md` (linha RF-024 →
✅ com evidência), `.specs/STATE.md` (Handoff admin-lideranca → admin-eventos,
decisões AD) se aplicável; rodar `validate_state.py admin-eventos` (0 errors após
verificação) e gates finais.
**Where**: `.specs/features/admin-eventos/tasks.md`, `validation.md`, `docs/coverage-matrix.md`, `.specs/STATE.md`
**Depends on**: T8
**Reuses**: padrão de fechamento das features anteriores
**Requirement**: — (processo)

**Tools**:
- Skill: NONE
- MCP: NONE

**Done when**:
- [ ] tasks.md com todas as tarefas ✅ e cobertura 16/16 — validation.md Verifier PASS (16/16, sensor 3/3)
- [ ] coverage-matrix RF-024 ✅ verified com evidência — `docs/coverage-matrix.md`
- [ ] `validate_state.py admin-eventos` 0 erros (após Verifier PASS)
- [ ] Gates finais (lint/typecheck/build) verdes

**Tests**: `validate_state.py admin-eventos` + gates
**Gate**: build
**Status**: Pending