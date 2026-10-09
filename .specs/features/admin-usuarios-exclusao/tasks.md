# Admin Usuários — Exclusão de Usuários Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/admin-usuarios-exclusao/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md` (gates lint/typecheck/build, "test runner entra na F10"), `.specs/STATE.md` AD-006/AD-023 (probes são gate local, sem CI), `package.json` (sem script de teste), `scripts/probes-admin-usuarios.sh` (probe da feature mãe). Sem runner de testes: o e2e do projeto é feito por probe shell contra servidor vivo; a coluna "none" reflete o gate de build.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Service | none | build gate only (sem runner; comportamento coberto pelo probe) | `src/lib/admin/usuarios.ts` | `npm run lint && npm run typecheck` |
| API Route | none | build gate only (sem runner; comportamento coberto pelo probe) | `src/app/api/admin/usuarios/[id]/route.ts` | `npm run lint && npm run typecheck` |
| Page / Client Component | none | build gate only | `src/app/admin/usuarios/*.tsx` | `npm run lint && npm run typecheck && npm run build` |
| Probes (e2e) | e2e | toda AC de exclusão: 401, 403 (auto/SUPER/sistema/sem permissão), 409 vínculos, 204 sucesso + estático dos símbolos e do marcador | `scripts/probes-admin-usuarios.sh` | `bash scripts/probes-admin-usuarios.sh` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After service/route tasks | `export PATH="$HOME/.nvm/versions/node/v$(cat .nvmrc).0/bin:$PATH" && npm run lint && npm run typecheck` |
| Build | After page/component tasks | `export PATH="$HOME/.nvm/versions/node/v$(cat .nvmrc).0/bin:$PATH" && npm run lint && npm run typecheck && npm run build` |
| Full | After probe task (servidor no ar) | `export PATH="$HOME/.nvm/versions/node/v$(cat .nvmrc).0/bin:$PATH" && npm run lint && npm run typecheck && npm run build && BASE_URL=http://localhost:3000 bash scripts/probes-admin-usuarios.sh` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Service Layer

Definem o marcador de origem, a flag de listagem e a exclusão guardada. T2 depende de T1 (mesmo arquivo).

```
T1 → T2
```

### Phase 2: API Route

Expõe o DELETE. T3 depende de T2.

```
T3
```

### Phase 3: UI

Botão e sua renderização condicional na listagem. T5 depende de T4.

```
T4 → T5
```

### Phase 4: Verification Artifacts

Probes de exclusão e fechamento documental. T7 depende de T6.

```
T6 → T7
```

---

## Task Breakdown

### T1: Service — marcador de origem e flag `deletable`

**What**: Gravar `app_metadata.criado_por_admin` na criação, preservá-lo na edição de papel e expor `deletable` na listagem.
**Where**: `src/lib/admin/usuarios.ts`
**Depends on**: None
**Reuses**: `gerarSenhaId`, `ADMIN_ROLES`
**Requirement**: USREX-10, USREX-11, USREX-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `criarUsuario` grava `app_metadata: { role, force_password_change: true, criado_por_admin: true }`
- [x] `editarPapel` faz `app_metadata: { ...existing.user.app_metadata, role }` (preserva o marcador)
- [x] `UsuarioAuth` ganha `criadoPorAdmin: boolean` e `deletable: boolean`
- [x] `listarUsuarios` mapeia `deletable = role !== "SUPER_ADMIN" && app_metadata.criado_por_admin === true`
- [x] Gate check passes: `npm run lint && npm run typecheck`
- [x] No TypeScript errors

**Tests**: none
**Gate**: quick

**Commit**: `feat(admin/usuarios): marca origem e expoe flag de exclusao no servico`

---

### T2: Service — `excluirUsuario` e erros de proteção

**What**: Adicionar `UsuarioProtegidoError`, `UsuarioComVinculosError` e `excluirUsuario(id, callerId)` com guardas ordenadas e checagem de vínculos.
**Where**: `src/lib/admin/usuarios.ts` (modify)
**Depends on**: T1
**Reuses**: `NaoEncontradoError`, `AutoModificacaoError`, `SuperAdminProtegidoError`, `createAdminClient`
**Requirement**: USREX-01, USREX-02, USREX-03, USREX-04, USREX-05, USREX-06, USREX-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `UsuarioProtegidoError` (`"usuario_protegido"`) e `UsuarioComVinculosError` (`"usuario_com_vinculos"`) exportados
- [ ] `excluirUsuario` executa na ordem: (1) `getUserById` ausente → `NaoEncontradoError`; (2) `userId === callerId` → `AutoModificacaoError`; (3) role `SUPER_ADMIN` → `SuperAdminProtegidoError`; (4) `criado_por_admin !== true` → `UsuarioProtegidoError`
- [ ] Checagem prévia de vínculos em `transactions.created_by`, `cash_closes.created_by`, `documents.uploaded_by` e `audit_logs.autor` → `UsuarioComVinculosError`
- [ ] Só então chama `admin.auth.admin.deleteUser(userId)` e propaga erro do Auth
- [ ] Gate check passes: `npm run lint && npm run typecheck`
- [ ] No TypeScript errors

**Tests**: none
**Gate**: quick

**Commit**: `feat(admin/usuarios): adiciona excluirUsuario com guardas e checagem de vinculos`

---

### T3: API Route — `DELETE /api/admin/usuarios/[id]`

**What**: Expor o DELETE com guarda `administrar`, auditoria e mapa de erros.
**Where**: `src/app/api/admin/usuarios/[id]/route.ts` (modify)
**Depends on**: T2
**Reuses**: `requireAdministrar`, `registrarAuditoria`, `extrairInfoRequest`, o `PATCH` já existente
**Requirement**: USREX-01, USREX-02, USREX-03, USREX-04, USREX-05, USREX-06, USREX-07, USREX-08, USREX-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `DELETE` usa `requireAdministrar("usuarios")` (401 sem sessão; 403 sem `administrar`)
- [ ] Chama `excluirUsuario(id, auth.sub)`; em sucesso registra auditoria `acao: "excluir"`, `entidade: "usuarios"`, `entidade_id: id` e retorna 204 sem corpo
- [ ] Mapa de erros: 404 `nao_encontrado`; 403 `auto_modificacao_nao_permitida` / `super_admin_protegido` / `usuario_protegido`; 409 `usuario_com_vinculos`; 500 `erro_interno` com `console.error`
- [ ] Gate check passes: `npm run lint && npm run typecheck`
- [ ] No TypeScript errors

**Tests**: none
**Gate**: quick

**Commit**: `feat(admin/usuarios): expoe DELETE /api/admin/usuarios/[id]`

---

### T4: Client Component — `DeleteUserButton`

**What**: Botão vermelho de exclusão com confirmação, fetch do DELETE e feedback de erro.
**Where**: `src/app/admin/usuarios/delete-user-button.tsx`
**Depends on**: T3
**Reuses**: padrão de `src/app/admin/patrimonio/delete-button.tsx` e `src/app/admin/membros/[id]/membro-detalhe-acoes.tsx`
**Requirement**: USREX-16, USREX-17

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `DeleteUserButton({ userId, email })` com estado `deleting` e `window.confirm` informando o email
- [ ] Em `204` chama `router.refresh()`; em `403`/`409` mostra a mensagem correspondente ao `error` e não atualiza
- [ ] Botão vermelho (`text-red-400 hover:text-red-300` ou equivalente do padrão) com ícone `Trash2`
- [ ] Gate check passes: `npm run lint && npm run typecheck && npm run build`
- [ ] No TypeScript errors

**Tests**: none
**Gate**: build

**Commit**: `feat(admin/usuarios): adiciona botao de exclusao com confirmacao`

---

### T5: Page — ação na listagem

**What**: Adicionar a coluna "Ações" com o botão apenas em linhas excluíveis e para quem administra.
**Where**: `src/app/admin/usuarios/page.tsx` (modify)
**Depends on**: T4
**Reuses**: tabela, `ROLE_LABELS`, `claims.sub`, `administrador`
**Requirement**: USREX-13, USREX-14, USREX-15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Coluna "Ações" no cabeçalho e célula por linha
- [ ] Renderiza `<DeleteUserButton>` só quando `administrador && u.deletable`
- [ ] Não renderiza botão para o próprio usuário (`u.id === claims?.sub`) nem para não-administradores
- [ ] Gate check passes: `npm run lint && npm run typecheck && npm run build`
- [ ] No TypeScript errors

**Tests**: none
**Gate**: build

**Commit**: `feat(admin/usuarios): renderiza acao de exclusao na listagem`

---

### T6: Probes — exclusão

**What**: Estender `probes-admin-usuarios.sh` com a cobertura estática e runtime das ACs de exclusão.
**Where**: `scripts/probes-admin-usuarios.sh` (modify)
**Depends on**: T5
**Reuses**: padrão `ok()`/`ko()`, login ADMIN/SECRETARIA, `reset-probe-residue.sql`
**Requirement**: USREX-01, USREX-02, USREX-03, USREX-04, USREX-05, USREX-06, USREX-07, USREX-08, USREX-09, USREX-10, USREX-11, USREX-12, USREX-13, USREX-14, USREX-15, USREX-16, USREX-17

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Estático: `criado_por_admin` no `criarUsuario`, `deletable` na listagem, `excluirUsuario` + erros no serviço, `DELETE` no route, `delete-user-button.tsx` presente
- [ ] Runtime: `DELETE` sem auth → 401; ADMIN excluindo conta de seed (`admin.teste`) → 403 (sistema/SUPER) ; SECRETARIA excluindo conta nova → 403
- [ ] Runtime dinâmico: ADMIN cria usuário de teste → exclui → 204, e a conta some; cleanup do resíduo
- [ ] Total de `ok` documentado; `0` falhas
- [ ] Gate check passes: `npm run lint && npm run typecheck && npm run build && BASE_URL=http://localhost:3000 bash scripts/probes-admin-usuarios.sh`

**Tests**: e2e
**Gate**: full

**Commit**: `test(admin/usuarios): cobre exclusao nos probes`

---

### T7: Regressões + documentação

**What**: Atualizar a matriz de cobertura e o Handoff/STATE com o resultado da feature.
**Where**: `docs/coverage-matrix.md`
**Depends on**: T6
**Reuses**: linhas existentes da RF-028 / `admin-usuarios`
**Requirement**: USREX-01, USREX-02, USREX-03, USREX-04, USREX-05, USREX-06, USREX-07, USREX-08, USREX-09, USREX-10, USREX-11, USREX-12, USREX-13, USREX-14, USREX-15, USREX-16, USREX-17

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `docs/coverage-matrix.md` ganha a linha da feature `admin-usuarios-exclusao` (USREX-01..17, status `verified`)
- [ ] `.specs/STATE.md` Handoff da feature atualizado para o estado final
- [ ] Regressões: lint, typecheck e build passam
- [ ] Gate check passes: `npm run lint && npm run typecheck && npm run build`

**Tests**: none
**Gate**: build

**Commit**: `docs(admin/usuarios): atualiza matriz de cobertura e STATE`

---

## Phase Execution Map

Visual representation of task ordering. Phases run in sequence, and tasks within a phase run in order:

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 ------→ T2
Phase 2:  T3
Phase 3:  T4 ------→ T5
Phase 4:  T6 ------→ T7
```

Execution is strictly sequential - there is no intra-phase parallelism.

### Full Dependency Diagram

```txt
T1 -> T2 -> T3 -> T4 -> T5 -> T6 -> T7
```

O diagrama completo só é válido porque todas as dependências são encadeadas.
O critério de empacotamento (batching) é contado abaixo.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Service marcador + `deletable` | 1 arquivo | ✅ Granular |
| T2: Service `excluirUsuario` + erros | 1 arquivo | ✅ Granular |
| T3: Route DELETE | 1 arquivo, 1 método | ✅ Granular |
| T4: `DeleteUserButton` | 1 client component | ✅ Granular |
| T5: Page ação | 1 arquivo edit | ✅ Granular |
| T6: Probes | 1 script | ✅ Granular |
| T7: Regressões + docs | 1 arquivo de doc | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | (start) | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1: Service marcador | Service | none | none | ✅ OK |
| T2: Service `excluirUsuario` | Service | none | none | ✅ OK |
| T3: Route DELETE | API Route | none | none | ✅ OK |
| T4: `DeleteUserButton` | Client Component | none | none | ✅ OK |
| T5: Page ação | Page | none | none | ✅ OK |
| T6: Probes | Probe script (e2e) | e2e | e2e | ✅ OK |
| T7: Docs | Docs | none | none | ✅ OK |

---

## Execution Notes

- **Total**: 7 tasks → cabe em **um único batch** (≤ ~8). Execute inline, sem sub-agentes `tlc-worker`.
- **Verifier**: após o último commit (T7), o agente `tlc-verifier` roda automaticamente (autor ≠ verificador): reconciliação dos 17 ACs + sensor de mutação em scratch + `validation.md`.
- **Ferramentas por task**: nenhum MCP é necessário (Supabase MCP só se um ajuste de dados for pedido — não há migration). Nenhum skill adicional além do `tlc-spec-driven`.
