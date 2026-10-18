# Ajustes Total Filtrado Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec. Guidelines found: `AGENTS.md` (SDD obrigatório, gates lint/typecheck/test/build via nvm), `vitest.config.ts`, `package.json` scripts.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Page RSC (filtradas) | unit (`renderToStaticMarkup`) | TAB-05: contagem do filtro (membros q ativo, auditoria paginada); TAB-07: falha sem strip | `src/app/admin/{membros,auditoria}/page.test.tsx` | `npm run test:ci` |
| Page RSC (design) | unit (`renderToStaticMarkup`) | TAB-06: faixa `p-4 border-b` no card; vazio = TOTAL 0 + mensagem no mesmo card; TAB-07: erro sem strip | `src/app/admin/{eventos,patrimonio}/page.test.tsx` | `npm run test:ci` |
| Lib/service | unit | `total` = contagem do papel filtrado (sem `totalGeral`) | `src/lib/admin/usuarios.test.ts` | `npm run test:ci` |
| Estrutura das 9 páginas | probe estática | greps TAB-05 (total=filtrado) + TAB-06 (faixa no card) por listagem | `scripts/probe-ajustes-total-filtrado.sh` | `bash scripts/probe-ajustes-total-filtrado.sh` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Após tarefas com unit tests | `export PATH="$HOME/.nvm/versions/node/v22.0/bin:$PATH" && npm run test:ci` |
| Full | Após integração de páginas | `export PATH="$HOME/.nvm/versions/node/v22.0/bin:$PATH" && npm run lint && npm run typecheck && npm run test:ci && bash scripts/probe-ajustes-total-filtrado.sh` |
| Build | Última tarefa / fechamento | `export PATH="$HOME/.nvm/versions/node/v22.0/bin:$PATH" && npm run build` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase A: Semântica do TOTAL (TAB-05)

```
T1
```

### Phase B: Design padrão usuários (TAB-06/07)

```
T2
```

### Phase C: Fecho

```
T3
```

---

## Task Breakdown

### T1: TOTAL reflete o filtro nas 5 listagens filtradas

**What**:

- `src/app/admin/membros/page.tsx`: `TotalBloco total={membros.length}`; remover import/chamada de `contarMembros`.
- `src/app/admin/financeiro/page.tsx`: `TotalBloco total={lancamentos.length}`; remover `contarLancamentos`/`totalGeral`.
- `src/app/admin/auditoria/page.tsx`: `TotalBloco total={total}` (total filtrado de `listarAuditoria`, todas as páginas); remover `contarAuditoria`/`falhaContagem`.
- `src/app/admin/usuarios/page.tsx`: `TotalBloco total={result.total}` (contagem do papel filtrado).
- `src/app/admin/relatorios/page.tsx`: `TotalBloco total={documentos.length}`; remover `contarDocumentos`/`totalGeral`.
- `src/lib/admin/membros.ts`/`financeiro.ts`/`auditoria.ts`/`relatorios.ts`: remover `contarMembros`/`contarLancamentos`/`contarAuditoria`/`contarDocumentos`.
- `src/lib/admin/usuarios.ts`: remover campo `totalGeral` de `ListarUsuariosResult` e do return.
- Deletar `src/lib/admin/contar.test.ts`; ajustar `src/lib/admin/usuarios.test.ts` (sem `totalGeral`; `total` = contagem do papel filtrado).
- Atualizar `src/app/admin/membros/page.test.tsx`: com `q` ativo retornando 1 de 7 membros → TOTAL exibe **1** (TAB-05, discrimina filtro vs total geral); falha → sem strip (TAB-07).
- Novo `src/app/admin/auditoria/page.test.tsx`: `listarAuditoria` retorna `{logs: 20 itens, total: 45}` → TOTAL exibe 45 (consistente com paginação).

**Where**: `src/app/admin/{membros,financeiro,auditoria,usuarios,relatorios}/page.tsx`, `src/lib/admin/{membros,financeiro,auditoria,usuarios,relatorios}.ts`, `src/lib/admin/contar.test.ts` (deletar), `src/lib/admin/usuarios.test.ts`, `src/app/admin/membros/page.test.tsx`, `src/app/admin/auditoria/page.test.tsx` (novo)

**Tests**: unit (usuarios lib), RSC (membros, auditoria)

**Gate**: full

**Commit**: `fix(admin): reflect active filters in listing totals`

**Depends on**: none

---

### T2: Faixa TOTAL embutida no card nas 9 listagens

**What**:

- Padrão-alvo (copiar do módulo usuários): card da tabela ganha, como primeiro filho, `<div className="p-4 border-b border-white/10 flex items-center justify-between"><TotalBloco …/>{ação opcional à direita}</div>`; estado vazio vira `<div className="p-10 text-center">` **dentro** do mesmo card; card de erro (falha de consulta) continua separado e **sem** strip.
- Aplicar em: `eventos`, `patrimonio`, `lideranca`, `financeiro`, `auditoria`, `relatorios` (h2 "Documentos" sai; strip no topo do card, chips + lista no corpo `p-5`).
- `membros`: strip no card de `MembrosListaClient` via prop `total`, empty case no server com o mesmo card.
- `fechamento` (tema claro): strip `p-4 border-b border-text-dark/10 flex items-center justify-between` dentro do card `rounded-2xl bg-white shadow-xl`, `tom="claro"`.
- `usuarios`: strip já no lugar (T1 só troca o número).
- Atualizar `eventos/page.test.tsx` e `patrimonio/page.test.tsx`: vazio → strip TOTAL 0 + mensagem no mesmo card (strip antes da mensagem no markup); erro → sem strip; presença de `p-4 border-b` no markup (faixa embutida).
- Ajustar `membros-lista-client.test.tsx` se a prop `total` mudar a assinatura.
- Criar `scripts/probe-ajustes-total-filtrado.sh` com greps TAB-05 (`total={membros.length}`, `total={lancamentos.length}`, `total={total}`, `total={result.total}`, `total={documentos.length}`) e TAB-06 (`p-4 border-b` nas 9 páginas + `border-text-dark/10` no fechamento).

**Where**: `src/app/admin/{eventos,patrimonio,lideranca,financeiro,auditoria,relatorios,financeiro/fechamento}/page.tsx`, `src/app/admin/membros/{page.tsx,membros-lista-client.tsx}`, `src/app/admin/{eventos,patrimonio}/page.test.tsx`, `scripts/probe-ajustes-total-filtrado.sh` (novo)

**Tests**: RSC (eventos, patrimonio, membros client)

**Gate**: full (lint, typecheck, test:ci, build, probe)

**Commit**: `style(admin): embed total block in listing card headers`

**Depends on**: T1

---

### T3: Fecho SDD (spec → Verified, STATE, coverage, Verifier)

**What**:

- Atualizar traceability da spec (TAB-05..07 → Verified) e Success Criteria.
- Rodar `validate_spec.py`/`validate_tasks.py`/`validate_state.py`; Verifier independente + discrimination sensor; `validation.md`.
- AD-034 no `.specs/STATE.md` (reversão da decisão B do lote4) + Handoff; linha em `docs/coverage-matrix.md`.

**Where**: `.specs/features/ajustes-total-filtrado/{spec.md,validation.md}`, `.specs/STATE.md`, `docs/coverage-matrix.md`

**Tests**: n/a (gates estruturais)

**Gate**: structural validators

**Commit**: `docs(specs): close ajustes-total-filtrado as verified`

**Depends on**: T2

---

## Phase Execution Map

Phase A:  T1
Phase B:  T2
Phase C:  T3

Execution is strictly sequential within the flow above.

## Notes

- Commits seguem Conventional Commits (hook `check_commit.py`); identidade `MIGUELEDL`.
- A base visual aprovada do operador é o módulo usuários — replicar, não inventar variação.
- `contar*`/`totalGeral` são deletados na T1 (código morto pós-reversão); nenhum teste pode sobreviver referenciando-os.
