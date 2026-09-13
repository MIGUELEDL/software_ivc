# Matriz de Permissões (RBAC) — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/rbac-matriz/design.md`
**Status**: In Progress

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md` (gates `npm run lint`/`typecheck`/`build` até F10; runner entra na F10 — AD-006/QA-001), prática das features anteriores (`scripts/probes-*.sh` como camada de teste por AC — QA-002).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Migration / schema / RLS / seed (`0008`) | probe estático (grep do `.sql`) + checagem SQL (MCP) | tabela `permissions` (PK role+module, check nível), RLS (SELECT authenticated, escrita SUPER_ADMIN), seed 48 pares idempotente, `can_access()` definer, policies de `members`/`member_documents` recriadas com `can_access('membros',...)` | `supabase/migrations/0008*.sql` + asserts em `scripts/probes-admin-membros.sh` | `bash scripts/probes-admin-membros.sh` |
| Service / RBAC (`src/lib/auth/rbac.ts`) | probe estático por semântica + typecheck | 1:1 ACs MATRIZ; `can()` hierárquico (ler<escrever<administrar), fail-closed sem linha/erro, `getMatriz()` via session client + `React.cache`, `MODULOS`/`Nivel` exportados | `scripts/probes-admin-membros.sh` (asserts grep) | `bash scripts/probes-admin-membros.sh` |
| Guardas (`src/lib/admin/http.ts`) | probe estático (greps guardas module-aware) + typecheck | `authAdmin(modulo)`/`requireEscrita(modulo)`/`requireAdministrar(modulo)` substituem `requireWriter`/`requireHardDelete`; shapes 401/403 preservados | `scripts/probes-admin-membros.sh` | `bash scripts/probes-admin-membros.sh` |
| Route Handlers (`src/app/api/admin/membros*`) | probe estático (guards) + **e2e runtime** agregado | happy + edge + error de cada rota (create 201/400/409, dados 200/400/404, status 200/400, hard-delete 204/409/403, docs 201/400/204/404, RBAC 401/403) | `scripts/probes-admin-membros.sh` (curl) | `bash scripts/probes-admin-membros.sh` (servidor :3000) |
| Páginas RSC (`src/app/admin/membros*`) | probe estático + **e2e runtime** agregado | lista 200 + ordenação/busca/filtro; detalhe/cartão 200/404; ações de escrita/hard-delete conforme `can()` (escritor vê botões, leitor não) | `scripts/probes-admin-membros.sh` | `bash scripts/probes-admin-membros.sh` |
| Entity / config | none | - (build gate only) | - | `npm run lint && npm run typecheck && npm run build` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Após tarefas de lib/schema (sem rotas novas) | `npm run typecheck` (com PATH nvm; ver AGENTS.md) |
| Full | Após rotas/páginas/probes | `bash scripts/probes-admin-membros.sh` (servidor dev/start no :3000) + `npm run lint && npm run typecheck && npm run build` |
| Build | Fechamento de fase / tarefas só de config/entity | `npm run lint && npm run typecheck && npm run build` |

> PATH do Node: `export PATH="$HOME/.nvm/versions/node/v$(cat .nvmrc).0/bin:$PATH"` antes dos gates.

---

## Execution Plan

Phases são ordenadas e sequenciais. Tasks dentro de cada fase executam em ordem.

### Phase 1: Banco — fonte única (migration 0008)

Migration cria a tabela `permissions` + RLS + seed 48 + `can_access()` e recria as
policies de `members`/`member_documents` para decidir via matriz. Aplicada no dev
via MCP com checagem SQL (seed e comportamento por papel).

```
T1
```

### Phase 2: RBAC core — app module-aware (`rbac.ts` + `http.ts`)

`can()` hierárquico lendo a matriz; guardas module-aware.

```
T2 → T3
```

### Phase 3: Route Handlers do piloto (membros)

As 6 rotas passam a usar `requireEscrita('membros')` / `requireAdministrar('membros')`.

```
T4, T5, T6, T7, T8, T9  (todas dependem da T3)
```

### Phase 4: Páginas RSC (ações conforme a matriz)

As 3 páginas trocam `isAdminWriterRole`/`isHardDeleteRole` por `can()`.

```
T10, T11, T12  (todas dependem da T2)
```

### Phase 5: Probes e regressão (verificação por AC)

Probes discriminativos (leitor 200/403, escritor 201, hard-delete) + regressão completa.

```
T13  (depende retroativamente de T4..T12)
```

---

## Task Breakdown

### Phase 1: Banco — fonte única (migration 0008)

### T1: Migration 0008 — tabela permissions, can_access() e policies da matriz

**What**: Criar `supabase/migrations/0008_permissions_matriz.sql`: tabela `permissions`
(`role`, `module`, `nivel` check `ler/escrever/administrar`, PK `(role,module)`,
`criado_em`), RLS (SELECT `to authenticated`; INSERT/UPDATE/DELETE `to authenticated`
com `auth_role()='SUPER_ADMIN'`), `can_access(p_module, p_nivel)` SECURITY DEFINER
(hierarquia, lê `permissions` via `auth_role()`; revoke public + grant authenticated),
seed dos 48 pares do Anexo A (`on conflict do nothing`), e recriação das 7 policies
`members_*_admin`/`docs_*_admin` com `can_access('membros', 'ler'|'escrever'|'administrar')`.
Aplicar no dev `[REDACTED_PROJECT_REF]` via MCP e validar por SQL.
**Where**: `supabase/migrations/0008_permissions_matriz.sql`
**Depends on**: None
**Reuses**: padrão 0005/0006 (security definer, revoke/grant, `auth_role()`)
**Requirement**: MATRIZ-01..05, MATRIZ-06, MATRIZ-12..13

**Tools**:
- MCP: `supabase` (aplicar migration + checagens SQL no dev)
- Skill: NONE

**Done when**:
- [x] SQL versionado com tabela `permissions` (PK, check nível), RLS e seed 48
- [x] `can_access()` security definer com hierarquia e grants corretos
- [x] 7 policies de `members`/`member_documents` recriadas com `can_access('membros', ...)`
- [x] Migration aplicada no projeto dev via MCP sem erro
- [x] SQL: 48 linhas seed; `can_access('membros','ler'|'escrever'|'administrar')` por papel conforme Anexo A (spot-check SECRETARIA/FINANCEIRO/ADMIN)

**Tests**: probe estático (greps no `.sql`: tabela, RLS, seed, policies/can_access) + checagem SQL via MCP
**Gate**: quick
**Status**: ✅ Done (aplicada no dev; SQL: 48 linhas + spot-check membros 6 pares ok)

### Phase 2: RBAC core — app module-aware

### T2: rbac.ts — tipos Modulo/Nivel, getMatriz() e can() hierárquico

**What**: Evoluir `src/lib/auth/rbac.ts`: adicionar `type Nivel`, `const MODULOS`,
`type Modulo`, `ORDEM` (ler<escrever<administrar), `getMatriz()` (SELECT
`module,nivel` de `permissions` pelo client de sessão com `React.cache`) e
`can(papel, modulo, nivel)` (sem linha/erro → false); remover
`isAdminWriterRole`/`isHardDeleteRole`/`ADMIN_WRITER_ROLES`; manter
`ADMIN_ROLES`/`isAdminRole`/`isMemberRole` (ontologia do proxy).
**Where**: `src/lib/auth/rbac.ts`
**Depends on**: None
**Reuses**: pattern de client de sessão de `src/lib/auth/claims.ts`; `React.cache`
**Requirement**: MATRIZ-07..11

**Tools**:
- MCP: `supabase` (confirmar forma do SELECT via RLS já aplicado)
- Skill: NONE

**Done when**:
- [x] `can()` implementado com hierarquia e fail-closed (linha ausente e erro → false)
- [x] `getMatriz()` com `React.cache` deduplicando por request
- [x] Helpers obsoletos removidos; `ADMIN_ROLES` preservado
- [x] Gate quick passa: `npm run typecheck` (PATH nvm ativado)

**Tests**: probe estático (asserts T2 no script) + typecheck
**Gate**: quick
**Status**: ✅ Done (merge backward: http.ts reimplementado via `can()` sem trocar assinaturas; 3 páginas migradas para `can()` — ver relatório do batch)

### T3: http.ts — guardas module-aware (ler/escrever/administrar)

**What**: Evoluir `src/lib/admin/http.ts`: `authAdmin(modulo)` exige
`can(_, modulo, 'ler')`; novo `requireEscrita(modulo)` exige `can(_, modulo, 'escrever')`;
novo `requireAdministrar(modulo)` exige `can(_, modulo, 'administrar')`; remover
`requireWriter` e `requireHardDelete`; manter `nengar()`/`erroCampos()` (shapes 401/403/400).
**Where**: `src/lib/admin/http.ts`
**Depends on**: T2
**Reuses**: `getClaims`, `can`, shapes de erro atuais
**Requirement**: MATRIZ-08..11, MATRIZ-20

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Três guardas module-aware implementadas com os mesmos `nengar` 401/403
- [x] `requireWriter`/`requireHardDelete` removidos
- [x] Gate quick passa: `npm run typecheck`

**Tests**: probe estático (greps das novas guardas + ausência das antigas) + typecheck
**Gate**: quick

### Phase 3: Route Handlers do piloto (membros)

### T4: POST /api/admin/membros — guarda requireEscrita('membros')

**What**: Em `src/app/api/admin/membros/route.ts`, trocar `requireWriter()` por
`requireEscrita("membros")` (import e chamada). Sem mudança de fluxo/validação.
**Where**: `src/app/api/admin/membros/route.ts`
**Depends on**: T3
**Reuses**: guardas module-aware de `http.ts`
**Requirement**: MATRIZ-14, MATRIZ-15

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `requireEscrita("membros")` no import e na chamada
- [x] Gate quick passa: `npm run typecheck`

**Tests**: probe estático (grep da rota) + runtime agregado (T13)
**Gate**: full

### T5: DELETE /api/admin/membros/[id] — guarda requireAdministrar('membros')

**What**: Em `src/app/api/admin/membros/[id]/route.ts`, trocar
`requireHardDelete()` por `requireAdministrar("membros")` (import e chamada).
**Where**: `src/app/api/admin/membros/[id]/route.ts`
**Depends on**: T3
**Reuses**: guardas module-aware de `http.ts`
**Requirement**: MATRIZ-16, MATRIZ-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `requireAdministrar("membros")` no import e na chamada
- [x] Gate quick passa: `npm run typecheck`

**Tests**: probe estático (grep da rota) + runtime agregado (T13)
**Gate**: full

### T6: POST /api/admin/membros/[id]/dados — guarda requireEscrita('membros')

**What**: Em `src/app/api/admin/membros/[id]/dados/route.ts`, trocar `requireWriter()`
por `requireEscrita("membros")`.
**Where**: `src/app/api/admin/membros/[id]/dados/route.ts`
**Depends on**: T3
**Requirement**: MATRIZ-14, MATRIZ-15

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `requireEscrita("membros")` no import e na chamada
- [x] Gate quick passa: `npm run typecheck`

**Tests**: probe estático (grep da rota) + runtime agregado (T13)
**Gate**: full

### T7: POST /api/admin/membros/[id]/status — guarda requireEscrita('membros')

**What**: Em `src/app/api/admin/membros/[id]/status/route.ts`, trocar `requireWriter()`
por `requireEscrita("membros")`.
**Where**: `src/app/api/admin/membros/[id]/status/route.ts`
**Depends on**: T3
**Requirement**: MATRIZ-14, MATRIZ-15

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `requireEscrita("membros")` no import e na chamada
- [x] Gate quick passa: `npm run typecheck`

**Tests**: probe estático (grep da rota) + runtime agregado (T13)
**Gate**: full

### T8: POST /api/admin/membros/[id]/documentos — guarda requireEscrita('membros')

**What**: Em `src/app/api/admin/membros/[id]/documentos/route.ts`, trocar
`requireWriter()` por `requireEscrita("membros")`.
**Where**: `src/app/api/admin/membros/[id]/documentos/route.ts`
**Depends on**: T3
**Requirement**: MATRIZ-14, MATRIZ-15

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `requireEscrita("membros")` no import e na chamada
- [x] Gate quick passa: `npm run typecheck`

**Tests**: probe estático (grep da rota) + runtime agregado (T13)
**Gate**: full

### T9: DELETE /api/admin/membros/[id]/documentos/[docId] — guarda requireEscrita('membros')

**What**: Em `src/app/api/admin/membros/[id]/documentos/[docId]/route.ts`, trocar
`requireWriter()` por `requireEscrita("membros")`.
**Where**: `src/app/api/admin/membros/[id]/documentos/[docId]/route.ts`
**Depends on**: T3
**Requirement**: MATRIZ-14, MATRIZ-15

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `requireEscrita("membros")` no import e na chamada
- [x] Gate quick passa: `npm run typecheck`

**Tests**: probe estático (grep da rota) + runtime agregado (T13)
**Gate**: full

### Phase 4: Páginas RSC (ações conforme a matriz)

### T10: /admin/membros (lista) — escritor via can()

**What**: Em `src/app/admin/membros/page.tsx`, substituir `isAdminWriterRole(claims?.role)`
por `can(claims.role, "membros", "escrever")` (await) para definir `escritor`.
**Where**: `src/app/admin/membros/page.tsx`
**Depends on**: T2
**Requirement**: MATRIZ-12..13, MATRIZ-14

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `escritor` calculado via `can()`
- [x] Gate quick passa: `npm run typecheck`

**Tests**: probe estático (grep da página) + runtime agregado (T13)
**Gate**: full

### T11: /admin/membros/[id] (detalhe) — escritor e hard-delete via can()

**What**: Em `src/app/admin/membros/[id]/page.tsx`, substituir
`isAdminWriterRole`/`isHardDeleteRole` por `can(role, "membros","escrever")` e
`can(role, "membros","administrar")` (guard real continua nas rotas).
**Where**: `src/app/admin/membros/[id]/page.tsx`
**Depends on**: T2
**Requirement**: MATRIZ-12..13, MATRIZ-16

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `escritor`/`hardDelete` calculados via `can()`
- [x] Gate quick passa: `npm run typecheck`

**Tests**: probe estático (grep da página) + runtime agregado (T13)
**Gate**: full

### T12: /admin/membros/novo (form) — escritor via can()

**What**: Em `src/app/admin/membros/novo/page.tsx`, substituir `isAdminWriterRole`
por `can(claims.role, "membros", "escrever")`.
**Where**: `src/app/admin/membros/novo/page.tsx`
**Depends on**: T2
**Requirement**: MATRIZ-14

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `escritor` calculado via `can()`
- [x] Gate quick passa: `npm run typecheck`

**Tests**: probe estático (grep da página) + runtime agregado (T13)
**Gate**: full

### Phase 5: Probes e regressão (verificação por AC)

### T13: Probes da matriz — discriminação leitor/escritor + regressão completa

**What**: Atualizar `scripts/probes-admin-membros.sh` para o novo RBAC: greps
estruturais da migration 0008 (tabela/RLS/seed/`can_access` nas policies),
greps das guardas module-aware nas 6 rotas e nas 3 páginas (ausência de
`requireWriter`/`isAdminWriterRole`/`isHardDeleteRole`), e checagens runtime
discriminativas: `FINANCEIRO` lê listagem/detalhe → 200 e escreve → 403;
`SECRETARIA` cria membro → 201; `ADMIN` hard-delete → 204/404/409; `MEMBRO`
leitura admin → deny. Rodar regressão completa (admin 106 + painel 27 + auth 19)
e gates lint/typecheck/build.
**Where**: `scripts/probes-admin-membros.sh`
**Depends on**: T4, T5, T6, T7, T8, T9, T10, T11, T12
**Requirement**: MATRIZ-01..20

**Tools**:
- MCP: `supabase` (apenas checagem SQL opcional da Anexo A)
- Skill: NONE

**Done when**:
- [x] Greps novos (0008 + guardas module-aware) e ausencial das role-lists antigas
- [x] Checks runtime discriminativos (leitor 200/403, escritor 201, hard-delete regras)
- [x] Regressão: admin-membros ok, painel ok, auth ok (sem falhas)
- [x] Gates passam: `npm run lint && npm run typecheck && npm run build`

**Tests**: probes runtime + probe estático (suite completa `probes-admin-membros.sh`)
**Gate**: full

---

## Phase Execution Map

Visual representation of task ordering. Phases run in sequence, and tasks within a phase run in order:

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1
Phase 2:  T2 → T3
Phase 3:  T4  T5  T6  T7  T8  T9   (todas via T3)
Phase 4:  T10  T11  T12            (todas via T2)
Phase 5:  T13                      (via T4..T12)
```

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Migration 0008 (schema+RLS+seed+can_access+policies; 1 arquivo `.sql`) | 1 arquivo | ✅ Granular |
| T2: rbac.ts — tipos + can() + getMatriz() | 1 arquivo | ✅ Granular |
| T3: http.ts — guardas module-aware | 1 arquivo | ✅ Granular |
| T4: POST /api/admin/membros — troca de guarda | 1 rota | ✅ Granular |
| T5: DELETE /api/admin/membros/[id] — troca de guarda | 1 rota | ✅ Granular |
| T6: POST .../dados — troca de guarda | 1 rota | ✅ Granular |
| T7: POST .../status — troca de guarda | 1 rota | ✅ Granular |
| T8: POST .../documentos — troca de guarda | 1 rota | ✅ Granular |
| T9: DELETE .../documentos/[docId] — troca de guarda | 1 rota | ✅ Granular |
| T10: página lista — can() para escritor | 1 página | ✅ Granular |
| T11: página detalhe — can() escritor/hard-delete | 1 página | ✅ Granular |
| T12: página novo — can() para escritor | 1 página | ✅ Granular |
| T13: probes (atualização + regressão completa) | 1 script | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | - | ✅ Match |
| T2 | None | - | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T3 | T3 → T5 | ✅ Match |
| T6 | T3 | T3 → T6 | ✅ Match |
| T7 | T3 | T3 → T7 | ✅ Match |
| T8 | T3 | T3 → T8 | ✅ Match |
| T9 | T3 | T3 → T9 | ✅ Match |
| T10 | T2 | T2 → T10 | ✅ Match |
| T11 | T2 | T2 → T11 | ✅ Match |
| T12 | T2 | T2 → T12 | ✅ Match |
| T13 | T9 | T9 → T13 | ✅ Match (demais deps retroativas ok — fase anterior) |

> Nota: T13 depende de todas as rotas/páginas (T4..T12); o diagrama mostra a aresta
> representativa T9 → T13 (mesma fase); dependências retroativas a fases anteriores
> não exigem arestas no diagrama de fase (cross-phase check).

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Migration / schema / RLS / seed | probe estático + SQL | probe estático (greps `.sql`) + SQL MCP | ✅ OK |
| T2 | RBAC service | probe estático + typecheck | probe estático + typecheck | ✅ OK |
| T3 | Guardas | probe estático + typecheck | probe estático + typecheck | ✅ OK |
| T4..T9 | Route Handlers | e2e runtime agregado | probe estático + runtime agregado (T13) | ✅ OK |
| T10..T12 | Páginas RSC | e2e runtime agregado | probe estático + runtime agregado (T13) | ✅ OK |
| T13 | Probes (test layer) | e2e agregado + estáticos | probes runtime + estáticos | ✅ OK |