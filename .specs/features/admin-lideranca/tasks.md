# Igrejas & Liderança (RF-023) — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/admin-lideranca/design.md`
**Status**: In Progress

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md` (gates `npm run lint`/`typecheck`/`build` até F10; runner entra na F10 — AD-006/QA-001), prática das features anteriores (`scripts/probes-*.sh` como camada de teste por AC — QA-002).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Migration / schema / RLS / seed (`0011`) | probe estático (grep do `.sql`) + checagem SQL (MCP) | tabelas `churches`/`leaders` (FK cascade), RLS (SELECT anon/authenticated, escrita `can_access('igrejas','escrever')`, DELETE `SUPER_ADMIN`), storage bucket `fotos-lideranca` + policies, seed igreja IVC + líder + `superadmin.teste` | `supabase/migrations/0011*.sql` + asserts em `scripts/probes-admin-lideranca.sh` | `bash scripts/probes-admin-lideranca.sh` |
| Service (`src/lib/admin/lideranca.ts`) | probe estático por semântica + typecheck | 1:1 ACs IGR; CRUD igrejas/leaders, `listarLideresAtivos()`, `subirFotoLider()`, exceções 404 | `scripts/probes-admin-lideranca.sh` (asserts grep) | `bash scripts/probes-admin-lideranca.sh` |
| Guardas/rotas (`/api/admin/igrejas*`, `/api/admin/lideres*`) | probe estático (guards `igrejas`) + **e2e runtime** | `requireEscrita('igrejas')`/`authAdmin('igrejas')`; DELETE igreja só `SUPER_ADMIN` (403 p/ ADMIN); shapes 401/403/400/404 preservados | `scripts/probes-admin-lideranca.sh` (curl) | `bash scripts/probes-admin-lideranca.sh` |
| Páginas (`/admin/lideranca{,/nova,/\[id\]}`) | probe estático + **e2e runtime** agregado | lista 200 (papel leitor), ações de escrita visíveis só com `can('igrejas','escrever')`; `DELETE` só `SUPER_ADMIN` vê/executa | `scripts/probes-admin-lideranca.sh` | `bash scripts/probes-admin-lideranca.sh` |
| Portal (`page.tsx` + `Leadership.tsx`) | probe estático + runtime | seção `#lideranca` DB-driven: líderes ATIVO ordenados por `order`, estado vazio, âncora preservada | `scripts/probes-admin-lideranca.sh` | `bash scripts/probes-admin-lideranca.sh` |
| Entity / config | none | - (build gate only) | - | `npm run lint && npm run typecheck && npm run build` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Após tarefas de lib/schema (sem rotas novas) | `npm run typecheck` (com PATH nvm; ver AGENTS.md) |
| Full | Após rotas/páginas/probes | `bash scripts/probes-admin-lideranca.sh` (servidor dev/start no :3000) + `npm run lint && npm run typecheck && npm run build` |
| Build | Fechamento de fase / tarefas só de config/entity | `npm run lint && npm run typecheck && npm run build` |

> PATH do Node: `export PATH="$HOME/.nvm/versions/node/v$(cat .nvmrc).0/bin:$PATH"` antes dos gates.

---

## Execution Plan

Phases são ordenadas e sequenciais. Tasks dentro de cada fase executam em ordem.

### Phase 1: Banco — schema + RLS + storage + seed (migration 0011)

Tabelas `churches`/`leaders`, RLS por `can_access('igrejas',...)` (DELETE church
`SUPER_ADMIN`), storage `fotos-lideranca`, seed (igreja IVC + líder + superadmin.teste).

```
T1
```

### Phase 2: Service layer (`lideranca.ts` + validação)

CRUD igrejas/leaders com exceções 404; `listarLideresAtivos()`; `subirFotoLider()`.
`validarCnpj` em `validacao.ts`.

```
T2
```

### Phase 3: Route Handlers

Rotas `igrejas` (POST/GET, PATCH/DELETE) e `lideres` (POST, PATCH, foto), guardadas pela matriz.

```
T2 → T3 → T4
T2 → T5
T2 → T6
```

### Phase 4: Páginas admin

Lista (RSC) + formulário nova igreja + detalhe/edição com líderes.

```
T7 → T8
```

### Phase 5: Portal — seção Liderança DB-driven

`page.tsx` async RSC + `Leadership.tsx` com props; âncora/estado vazio preservados.

```
T9
```

### Phase 6: Probes e regressão (verificação por AC)

Probes discriminativos por papel + regressão das suítes existentes + gates.

```
T10 → T11
```

---

## Task Breakdown

### Phase 1: Banco — schema + RLS + storage + seed

### T1: Migration 0011 — tabelas igrejas/liderança, RLS, storage e seed

**What**: Criar `supabase/migrations/0011_igrejas_lideranca.sql`: tabela `churches`
(id, name, short_name, cnpj, address, city, founded_date, timestamps) e `leaders`
(id, church_id FK `churches.id` ON DELETE CASCADE, name, role, photo_url, order,
status check `ATIVO`/`INATIVO`, timestamps); RLS (SELECT `to anon, authenticated`
em ambas; INSERT/UPDATE `to authenticated` com `can_access('igrejas','escrever')`;
DELETE em `churches` `to authenticated` com `auth_role()='SUPER_ADMIN'`; nenhuma
policy DELETE em `leaders`); bucket `fotos-lideranca` (público, 2MB,
jpeg/png/webp) + policies storage INSERT/UPDATE com `can_access('igrejas','escrever')`;
seed idempotente (`on conflict do nothing`): igreja IVC (dados de `constants.ts`),
líder Pastor Ernandes (role 'Pastor Presidente', order 0, ATIVO) vinculado, e usuário
`superadmin.teste@ivc.local` com papel `SUPER_ADMIN` (senha `senha-teste`,
`force_password_change=false`, padrão 0007/0009). Aplicar no dev `[REDACTED_PROJECT_REF]`
via MCP e validar por SQL.
**Where**: `supabase/migrations/0011_igrejas_lideranca.sql`
**Depends on**: None
**Reuses**: padrão 0003/0005/0006/0008 (storage + security definer + `auth_role()` + `can_access`)
**Requirement**: IGR-01, IGR-02, IGR-03, IGR-04, IGR-13, IGR-14, IGR-15, IGR-25

**Tools**:
- MCP: `supabase` (aplicar migration + checagens SQL no dev)
- Skill: NONE

**Done when**:
- [x] SQL versionado com `churches`/`leaders` (FK cascade), RLS, storage + policies
- [x] RLS DELETE `churches` só `SUPER_ADMIN`; `leaders` sem DELETE policy
- [x] Seed idempotente: igreja IVC + líder + `superadmin.teste` (papel SUPER_ADMIN)
- [x] Migration aplicada no dev via MCP sem erro
- [x] SQL: `can_access('igrejas','escrever')` e `auth_role()='SUPER_ADMIN'` conferem; bucket listado

**Tests**: probe estático (greps no `.sql`: tabelas, RLS, bucket, seed) + checagem SQL via MCP
**Gate**: quick
**Status**: ✅ Done (aplicada no dev; SQL: 1 igreja + 1 líder + superadmin; bucket `fotos-lideranca`; 6 pares `igrejas` na matriz)

### Phase 2: Service layer

### T2: Service layer — `src/lib/admin/lideranca.ts` + `validarCnpj`

**What**: Criar `src/lib/admin/lideranca.ts` (padrão `membros.ts`) com tipos `Igreja`/
`Lider`, exceções `IgrejaNaoEncontradaError`/`LiderNaoEncontradoError`, e funções
`listarIgrejas()`, `criarIgreja()`, `atualizarIgreja()`, `excluirIgreja()`,
`listarLideres(igrejaId)`, `listarLideresAtivos()` (status ATIVO, order asc),
`criarLider()`, `atualizarLider()` (aceita `status` p/ soft-delete),
`subirFotoLider(id, file)` (upload `upsert` no bucket `fotos-lideranca`, path
`lideranca/{id}/foto.{ext}`, persistir `photo_url`). Adicionar `validarCnpj` (14
dígitos numeric) e `validarFoto` (mime/extensão) em `src/lib/admin/validacao.ts`.
**Where**: `src/lib/admin/lideranca.ts`, `src/lib/admin/validacao.ts`
**Depends on**: T1
**Reuses**: padrão de `src/lib/admin/membros.ts`; `createServerClient` (session client)
**Requirement**: IGR-01..12, IGR-13..21, IGR-25

**Tools**:
- MCP: `supabase` (confirmar schema pós-0011 p/ tipagem e upload)
- Skill: NONE

**Done when**:
- [x] Service com CRUD igrejas/leaders e exceções 404/dedup
- [x] `listarLideresAtivos()` filtrado/ordenado; `subirFotoLider()` com upsert no bucket
- [x] `validarCnpj`/`validarFoto` adicionados e exportados
- [x] Gate quick passa: `npm run typecheck` (PATH nvm ativado)

**Tests**: probe estático (asserts T2 no script) + typecheck
**Gate**: quick
**Status**: ✅ Done (lideranca.ts com 9 funções; validarCnpj + validarFoto em validacao.ts; typecheck 0 erros)

### Phase 3: Route Handlers

### T3: Rotas `POST/GET /api/admin/igrejas` e PATCH/DELETE `[id]`

**What**: Criar `src/app/api/admin/igrejas/route.ts` (POST com `requireEscrita('igrejas')`,
validação por campo → 400 `{error, campos}`, 201 com igreja; GET com `authAdmin('igrejas')`,
lista `created_at` asc) e `src/app/api/admin/igrejas/[id]/route.ts` (PATCH
`requireEscrita('igrejas')`, 200/404; DELETE com `authAdmin('igrejas')` + checagem
explícita `claims.role === 'SUPER_ADMIN'` → 204, `403` para ADMIN, 404 inexistente).
**Where**: `src/app/api/admin/igrejas/route.ts`, `src/app/api/admin/igrejas/[id]/route.ts`
**Depends on**: T2
**Reuses**: `erroCampos`/guards de `src/lib/admin/http.ts`; padrão rota `membros`
**Requirement**: IGR-05..12

**Tools**:
- MCP: `supabase` (checar rotas/SQL no dev se necessário)
- Skill: NONE

**Done when**:
- [x] POST cria igreja 201; valida campos → 400 discriminado; 401/403 sem escrita
- [x] GET lista para leitor 200; PATCH atualiza 200 e 404 inexistente
- [x] DELETE: SUPER_ADMIN 204 (cascata), ADMIN 403, inexistente 404
- [x] Gate quick passa: `npm run typecheck`

**Tests**: probe estático (guards/validação) + runtime curl das rotas
**Gate**: quick
**Status**: ✅ Done (route.ts POST/GET + [id]/route.ts PATCH/DELETE; typecheck 0 erros)

### T4: Rota `POST /api/admin/igrejas/[id]/lideres`

**What**: Criar `src/app/api/admin/igrejas/[id]/lideres/route.ts`: `requireEscrita('igrejas')`,
valida nome/cargo → 400 discriminado, igreja inexistente → 404, sucesso → 201 com líder
(status default `ATIVO`).
**Where**: `src/app/api/admin/igrejas/[id]/lideres/route.ts`
**Depends on**: T2, T3
**Reuses**: `erroCampos`; padrão rota `membros`
**Requirement**: IGR-16, IGR-17

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] POST líder 201 (ATIVO default); 400 por campo; 404 igreja inexistente
- [x] 401/403 sem `igrejas/escrever`
- [x] Gate quick passa: `npm run typecheck`

**Tests**: probe estático + runtime curl
**Gate**: quick
**Status**: ✅ Done (lideres/route.ts POST; typecheck 0 erros)

### T5: Rota `PATCH /api/admin/lideres/[id]` (incl. soft-delete por status)

**What**: Criar `src/app/api/admin/lideres/[id]/route.ts`: `requireEscrita('igrejas')`,
atualiza `name`/`role`/`order`/`status` por campo → 200; líder inexistente → 404;
`status` restrito a `ATIVO`/`INATIVO`.
**Where**: `src/app/api/admin/lideres/[id]/route.ts`
**Depends on**: T2
**Reuses**: `erroCampos`
**Requirement**: IGR-18, IGR-19

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] PATCH atualiza campos e responde 200; 404 inexistente
- [ ] `status='INATIVO'` persiste (soft-delete) e campo inválido → 400
- [ ] Gate quick passa: `npm run typecheck`

**Tests**: probe estático + runtime curl
**Gate**: quick
**Status**: ⏳ Pending

### T6: Rota `POST /api/admin/lideres/[id]/foto`

**What**: Criar `src/app/api/admin/lideres/[id]/foto/route.ts`: `requireEscrita('igrejas')`,
recebe `FormData('foto')`, valida mime/tamanho via `validarFoto` → 400/413, upload
upsert no bucket `fotos-lideranca` path `lideranca/{leaderId}/foto.{ext}`, grava
`photo_url` retornada pela storage (URL pública) e responde 200 `{photo_url}`;
lider inexistente → 404.
**Where**: `src/app/api/admin/lideres/[id]/foto/route.ts`
**Depends on**: T2
**Reuses**: padrão `src/app/api/painel/perfil/foto/route.ts` (upload + getPublicUrl)
**Requirement**: IGR-20, IGR-21, IGR-25

**Tools**:
- MCP: `supabase` (confirmar bucket/policy pós-0011 se necessário)
- Skill: NONE

**Done when**:
- [ ] Upload válido → 200 com `photo_url` persistida em `leaders.photo_url`
- [ ] Mime/tamanho inválido → 400/413 sem persistir
- [ ] Gate quick passa: `npm run typecheck`

**Tests**: probe estático + runtime curl (upload e rejeição)
**Gate**: quick
**Status**: ⏳ Pending

### Phase 4: Páginas admin

### T7: Páginas `/admin/lideranca` e `/admin/lideranca/nova`

**What**: Criar `src/app/admin/lideranca/page.tsx` (RSC): guarda leitura via
`can('igrejas','ler')` (redirect 403), lista igrejas com nome/cidade/contagem de
líderes e ações por nível (editar/excluir — excluir só `SUPER_ADMIN`), link "Nova
igreja"; e `nova/page.tsx` (client form): campos nome/sigla/CNPJ/endereço/cidade/
fundada_em → `POST /api/admin/igrejas` com 400 por campo e redirect ao detalhe.
**Where**: `src/app/admin/lideranca/page.tsx`, `src/app/admin/lideranca/nova/page.tsx`
**Depends on**: T3
**Reuses**: padrão RSC de `src/app/admin/membros`; `can()`
**Requirement**: IGR-05..12

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Lista para papel leitor 200; ações de escrita ocultas p/ leitor
- [ ] Botão excluir igreja só para `SUPER_ADMIN`
- [ ] Form cria igreja com 400 por campo e redirect
- [ ] Gate quick passa: `npm run typecheck` (+ lint)

**Tests**: probe estático (guardas/gmória) + runtime curl páginas
**Gate**: quick
**Status**: ⏳ Pending

### T8: Página `/admin/lideranca/[id]` — detalhe/edição + líderes

**What**: Criar `src/app/admin/lideranca/[id]/page.tsx`: RSC lê igreja + líderes
(404 se inexistente); painel edita igreja (PATCH) e gerencia líderes: adicionar
(form nome/cargo/ordem → POST lideres), editar (PATCH), inativar/ativar (PATCH
status), upload de foto (form → POST foto). Guarda de escrita por `can('igrejas','escrever')`;
`DELETE` igreja (confirmação) só `SUPER_ADMIN`.
**Where**: `src/app/admin/lideranca/[id]/page.tsx`
**Depends on**: T4, T5, T6, T7
**Reuses**: padrão de páginas/formulários admin existentes
**Requirement**: IGR-09..21

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Detalhe lê igreja + líderes; 404 inexistente
- [ ] Form de edição (igreja/líder), inativar/ativar, upload de foto operam
- [ ] Ações de escrita ocultas p/ leitor; DELETE igreja só SUPER_ADMIN
- [ ] Gate quick passa: `npm run typecheck` (+ lint)

**Tests**: probe estático + runtime curl páginas
**Gate**: quick
**Status**: ⏳ Pending

### Phase 5: Portal

### T9: Portal — `page.tsx` async + `Leadership.tsx` DB-driven

**What**: Evoluir `src/app/page.tsx` para async RSC: busca `listarLideresAtivos()`
e primeira igreja (`listarIgrejas()[0]`), passa `leaders`/`church` a `<Leadership>`.
Reescrever `src/components/Leadership.tsx` (client, framer-motion mantido): render
cards (`photo_url` com fallback, `name`, `role`) ordenados por `order`, estado vazio
quando sem líderes ATIVO; preservar `id="lideranca"` e título/navegação (HOME-04/08).
**Where**: `src/app/page.tsx`, `src/components/Leadership.tsx`
**Depends on**: T2
**Reuses**: `listarLideresAtivos`/`listarIgrejas`; padrão RSC do portal
**Requirement**: IGR-22, IGR-23, IGR-24

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Home render líderes ATIVO ordenados por `order` (seed visível), com foto quando houver
- [ ] Estado vazio sem líderes ATIVO; âncora `#lideranca` e nav preservadas
- [ ] Gate quick passa: `npm run typecheck` (+ lint)

**Tests**: probe estático (grep props/âncora, sem literal de líder) + runtime (HTML contém nome do líder ATIVO)
**Gate**: quick
**Status**: ⏳ Pending

### Phase 6: Probes e regressão

### T10: Script `scripts/probes-admin-lideranca.sh`

**What**: Criar script executável com: estático (greps nas migrations 0011 —
tabelas, RLS can_access, DELETE SUPER_ADMIN, bucket/policies, seed; guards de rotas;
ausência de literal de líder no Leadership; âncoras) e runtime com sessões reais:
ADMIN cria/edita igreja+líder e envia foto; `DELETE igreja` por  ADMIN → 403 e por
SUPER_ADMIN (`superadmin.teste`) → 204 (cascade); SECRETARIA/FINANCEIRO leem lista
200 e recebem 403 em escrita; MEMBRO 403/redirect; portal home contém líder ATIVO e
não contém INATIVO (após inativar e re-ativar). Registra contagem ok/falhas com
`trap` de cleanup.
**Where**: `scripts/probes-admin-lideranca.sh`
**Depends on**: T1..T9
**Reuses**: padrão `scripts/probes-admin-membros.sh` (sessões/curl/assert)
**Requirement**: IGR-01..25

**Tools**:
- MCP: `supabase` (limpar resíduo entre runs; verificar sessões)
- Skill: NONE

**Done when**:
- [ ] Suite roda limpa contra `next start` :3000 → 0 falhas (ADMIN, leitor, MEMBRO, SUPER_ADMIN, portal)
- [ ] Discriminadores por papel ok (403 SECRETARIA/FINANCEIRO; DELETE igreja 403 ADMIN vs 204 SUPER_ADMIN)
- [ ] Resíduo limpo entre runs (idempotente)
- [ ] Regressões `probes-admin-membros.sh`, `probes-painel.sh`, `probes-auth.sh` verdes + lint/typecheck/build

**Tests**: `bash scripts/probes-admin-lideranca.sh` (servidor :3000) + suítes de regressão
**Gate**: full
**Status**: ⏳ Pending

### T11: Fechamento — state/coverage/matrix/handoff

**What**: Marcar tasks como done no `tasks.md`; escrever `validation.md` provisório
(não final — Verifier assina); atualizar `docs/coverage-matrix.md` (linha RF-023 →
✅ com evidência), `.specs/STATE.md` (Handoff rbac-matriz → high-level da nova
feature, decisões AD) se aplicável; rodar `validate_state.py admin-lideranca` (0
errors após verificação) e gates finais.
**Where**: `.specs/features/admin-lideranca/tasks.md`, `validation.md`, `docs/coverage-matrix.md`, `.specs/STATE.md`
**Depends on**: T10
**Reuses**: padrão de fechamento das features anteriores
**Requirement**: — (processo)

**Tools**:
- Skill: NONE
- MCP: NONE

**Done when**:
- [ ] tasks.md com todas as tarefas ✅ e cobertura 25/25
- [ ] coverage-matrix RF-023 ✅ verified com evidência
- [ ] `validate_state.py admin-lideranca` 0 erros (após Verifier PASS)
- [ ] Gates finais (lint/typecheck/build) verdes

**Tests**: `validate_state.py admin-lideranca` + gates
**Gate**: build
**Status**: ⏳ Pending