# admin-auditoria — Relatório do Verifier

## Validation: admin-auditoria - PASS

**Spec-anchored check**: 18/18 ACs (AUD-01..18) matched spec outcome | 0 spec-precision gaps (4 edge cases assertados: best-effort insert, truncamento 10KB, `datas_invalidas` 400, defaults offset=0/limit=20)

**Evidence (file:line)**:

- AUD-01 — insert por valor: `auditoria.ts:75-83` + `probes-admin-auditoria.sh:221-232` (service, payload exato) e rota POST `route.ts:83-93` + `probes-admin-auditoria.sh:397-408` (autor=`auth.sub`, ip de `x-forwarded-for`)
- AUD-02/03 — fallback NULL: `auditoria.ts:38-39` + `probes-admin-auditoria.sh:216-219` e `:236-241` (`p.ip`/`p.user_agent`/`p.autor` `=== null`)
- AUD-04 — imutável (sem UPDATE/DELETE): `0017_audit_logs.sql:59` + `probes-admin-auditoria.sh:112` (`check_not` por `for update|delete`)
- AUD-05/06 — RLS + `can_access('auditoria','ler')`: `0017_audit_logs.sql:45-57` + `probes-admin-auditoria.sh:108-110`
- AUD-07 — página + tabela: `page.tsx:104-156` + `probes-admin-auditoria.sh:80`
- AUD-08/09/10 — filtros por operador/valor: `auditoria.ts:117-129` + `probes-admin-auditoria.sh:270-272` (`gte`/`lte`/`eq` com os valores exatos, `lte` `T23:59:59.999Z`)
- AUD-11 — paginação: `auditoria.ts:107-108,132` + `probes-admin-auditoria.sh:279` (`range [0,19]` default), `:376`, `:380-395` (clamps `limit=150→100`, `offset=-5→0`, `limit=abc→20`, `limit=-5→1`)
- AUD-12/13 — empty state + colunas: `page.tsx:98,107-124` + `probes-admin-auditoria.sh:81-87`
- AUD-14/15 — formulário + `router.push` com query: `auditoria-filtros.tsx:44-59` + `probes-admin-auditoria.sh:93-103`
- AUD-16 — Anterior/Próximo: `page.tsx:165-192` + `probes-admin-auditoria.sh:88-89`
- AUD-17 — guard RBAC: `page.tsx:15-17` (`can(papel,"auditoria","ler")` + `if (!leitor)`) + `probes-admin-auditoria.sh:77-78`
- AUD-18 — instrumentação: 12 handlers admin chamam `registrarAuditoria(` (uso real, sem import/comentário) — `probes-admin-auditoria.sh:127-138`
- Edge `datas_invalidas`: `route.ts:26-31` + `probes-admin-auditoria.sh:371-372` (GET `inicio>fim` → status 400 + `{error:"datas_invalidas"}`; datas iguais válidas)
- Estrutural: `validate_tasks.py` 0 erros (aresta T14→T15); `validate_spec.py` 0 erros.

**Gate**: `bash scripts/probes-admin-auditoria.sh` → **74 ok / 0 falhas** (exit 0); `npm run probe:admin-auditoria` ligado ao CI (`.github/workflows/ci.yml`). `npm run lint`/`typecheck`/`build` verdes.

**Sensor** (worktree isolado no HEAD): **17 mutantes injetados, 17 mortos, 0 sobreviventes** — S1..S11 service (insert removido, NULL→valor fixo, `gte`→`gt`, `data_fim` não-inclusivo, `acao`/`entidade` swap/drop, `limit` 20→50, range off-by-one, `can` ignorado, `if(!leitor)`→`if(false)`, instrumentação import-only), M1..M4 route (comparação de datas invertida, status 400→200, clamp de `limit`/`offset` removidos), S12/S13 da rodada 1 ainda mortos. Real tree intacta (porcelain idêntico antes/depois).

**Diff range**: `661824f..HEAD`.

**Histórico de verificação**: 1ª rodada FAIL (6/18 com evidência real, 12 gaps, 2/12 mortos) → endurecimento (estáticos acento/guard/layout + harness runtime do service com stub de `@/lib/supabase/server`) → 2ª rodada FAIL (11/11 re-checks mortos, mas 3 sobreviventes na route layer — comparação de datas, status, clamps) → harness route GET/POST com stubs (`next/server`, `@/lib/admin/http`, `@/lib/admin/auditoria`) + grafo T15 corrigido → **PASS**.

**Note**: teste executor (AD-023) permanece fora; a evidência executável é por probes/harness com sensor de mutação, não "acceptable com sobreviventes".

**Result**: PASS