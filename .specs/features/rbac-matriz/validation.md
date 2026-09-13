# RBAC Matriz (RF-032) Validation

**Date**: 2026-09-13
**Spec**: `.specs/features/rbac-matriz/spec.md`
**Diff range**: `cc4c5e0..f05edb7` — commits 1e021cf, c8c2362, 0886f53, 78c0cbf, 9d98df9, f19b029, ba9c5d6, a8da66c, f05edb7
**Verifier**: inline na mesma sessão (sub-agente `tlc-verifier` cancelado pelo usuário após travar; protocolo evidence-or-zero + sensor de mutação executado manualmente e documentado abaixo)
**Result**: PASS

> Nota de processo: o sub-agente Verifier (autor ≠ verificador) foi despachado e
> cancelado pelo usuário por travamento; a verificação foi então executada inline,
> com o mesmo rigor (evidência por AC, mutações em scratch isolado, gates re-rodados).
> Recomendação de mitigação do travamento em RESIDUAL/processo.

---

## Spec-Anchored Acceptance Criteria (20/20 matched)

Evidência por AC ancora em `file:line`; asserts runtime rodam contra o servidor
real (produção `next start` :3000) e os estáticos leem os arquivos commitados.

| AC | Requisito | Evidência | Result |
| -- | --------- | --------- | ------ |
| MATRIZ-01 | Fonte única: tabela `permissions`, PK `(role, module)` | `0008_permissions_matriz.sql:10-16`; probe `tabela permissions: PK (role,module) + check de nivel (MATRIZ-01)` (probes-admin-membros.sh) | ✅ |
| MATRIZ-02 | `nivel` só `ler/escrever/administrar` (check) | `0008:13`; probe check de nivel | ✅ |
| MATRIZ-03 | Escrita em `permissions` só `SUPER_ADMIN` | `0008:33-44` (insert/update/delete policies + `auth_role() = 'SUPER_ADMIN'`); probe `escrita da matriz (insert/update/delete) so SUPER_ADMIN` | ✅ |
| MATRIZ-04 | Leitura de `permissions` liberada a authenticated (RLS) | `0008:29-31` `permissions_select_authenticated`; probe RLS de leitura | ✅ |
| MATRIZ-05 | Seed de 48 pares idempotente (Anexo A) | `0008:84-133` `on conflict (role, module) do nothing`; probe conta 48 pares exatos | ✅ |
| MATRIZ-06 | Níveis hierárquicos ler < escrever < administrar (banco e app) | `0008:63-67` hierarquia no `can_access`; `rbac.ts:44-48` `ORDEM`; probe hierarquia + runtime SECRETARIA escreve=essa concessão de leitura | ✅ |
| MATRIZ-07 | Sem linha para (papel,módulo) → negar | `can` `rbac.ts:101-104` (nivelPapel ausente → false); `can_access` sem match → false; runtime MEMBRO → 403 (fail-closed) | ✅ |
| MATRIZ-08 | `can_access(module,nivel)` SECURITY DEFINER decidindo policies RLS | `0008:51-69` (security definer, `auth_role()`), `0008:141-175` policies recriadas; probe_policy_access 7/7 com expressão exata | ✅ |
| MATRIZ-09 | Helper `can(papel,module,nivel)` no servidor, mesma tabela | `rbac.ts:90-108` via `getMatriz` (`rbac.ts:58-81`) lendo `permissions`; runtime discriminativo | ✅ |
| MATRIZ-10 | Falha na consulta → negar (fail-closed) | `can` catch `rbac.ts:105-107` → false; probe MEMBRO POST criar → 403; mutante E demonstrado (hierarquia removida → probe falha) | ✅ |
| MATRIZ-11 | Sem role-lists hard-coded nos dois lados da decisão | Ausência: probe `helpers antigos isAdminWriterRole/isHardDeleteRole/ADMIN_WRITER_ROLES removidos` e `guards antigos requireWriter/requireHardDelete removidos` (grep zero em src) | ✅ |
| MATRIZ-12 | Policies de `members`: can_access ler/escrever/administrar | `0008:144,148-149,154-155,159-160`; probe_policy_access (select=ler U, insert=escrever C, update=escrever UC, delete=administrar U) | ✅ |
| MATRIZ-13 | Policies de `member_documents`: can_access ler/escrever | `0008:165,171,175`; probe_policy_access (docs select=ler, insert/escrever, delete/escrever) | ✅ |
| MATRIZ-14 | Guardas das rotas `/api/admin/membros` via can escrever/administrar | `requireEscrita("membros")` nas rotas (route.ts:18/20, dados:20, status:22, documentos:20, doc-delete:17) e `requireAdministrar("membros")` (id/route.ts:19); probe greps das 6 rotas | ✅ |
| MATRIZ-15 | SECRETARIA POST criar → 201 + senha-ID | runtime probe `SECRETARIA POST criar valido -> 201 (MATRIZ-14)` (l160s probes-admin-membros.sh) + seed `0009` | ✅ |
| MATRIZ-16 | FINANCEIRO escrita → 403 | runtime probe leitor POST criar/status/DELETE → 403 (matriz) | ✅ |
| MATRIZ-17 | ADMIN hard-delete → 204/404/409 conforme regras | runtime probe (409 com doc, 204 sem doc, 404 após delete) (regras existentes mantidas) | ✅ |
| MATRIZ-18 | MEMBRO leitura admin → negar (RLS false / 403 na app) | runtime: página /admin/membros 307 login/admin + API POST criar 403 (`MATRIZ-10`); `members_delete_admin` via can_access nega SEM linha (fail-closed) | ✅ |
| MATRIZ-19 | Policies 0001, /painel próprio e autocadastro MEMBRO intactos | regressão `probes-painel.sh` 27 ok + `probes-auth.sh` 19 ok (zero falhas); auth_role/policies 0001 não tocadas (0008 só dropa `*_admin`) | ✅ |
| MATRIZ-20 | Negativa registrada no log com papel/módulo/nível | `http.ts:34-43` `negarPermissao` (log `rbac: acesso negado papel=... modulo=... nivel=...`); probe grep `rbac: acesso negado` | ✅ |

## Discrimination Sensor (scratch isolado `/tmp/opencode/verif-rf032`, árvore real intacta)

| # | Mutação | Kill signal (assert do probe) | Resultado |
|---|---------|------------------------------|-----------|
| A | `members_delete_admin` usando `escrever` em vez de `administrar` (RLS) | grep exato `using (public.can_access('membros','administrar'))` no bloco da policy → 0 | KILLED |
| B | Log de negativa removido de `negarPermissao` (http.ts) | grep `rbac: acesso negado` → 0 | KILLED |
| C | Rota DELETE `[id]` troca `requireAdministrar("membros")` por `requireEscrita` | grep `requireAdministrar("membros")` na rota → 0 | KILLED |
| D | Seed com 47 pares (remove SUPER_ADMIN/dashboard) | contagem probe `48` → 47 | KILLED |
| E | Linha de hierarquia `escrever` removida de `can_access` | grep `nivel = 'escrever' and p_nivel in` → 0 | KILLED |

Sensor depth: P0-full (auth/data-integrity). 5/5 killed, 0 survived.

## Gate Check

| Gate | Result |
|------|--------|
| `validate_spec.py rbac-matriz` | 0 errors, 0 warnings |
| `validate_tasks.py rbac-matriz` | 0 errors, 0 warnings |
| `npm run lint` | 0 errors; 2 warnings (SocialLinks.tsx — pré-existentes, fora do diff) |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `scripts/probes-admin-membros.sh` (:3000, prod `next start`) | **139 ok / 0 falhas** |
| `scripts/probes-painel.sh` (regressão) | **27 ok / 0 falhas** |
| `scripts/probes-auth.sh` (regressão) | **19 ok / 0 falhas** |
| MCP (checagem corroborante) | seeds secretaria/membro aplicados; 48 linhas `permissions` (verificado durante T1) |

Runtime discriminadores (sensor ao vivo): SECRETARIA cria 201 e não administra (403);
FINANCEIRO lê 200 e escreve 403; ADMIN hard-delete 204/409/404; MEMBRO deny (307 página + 403 API).
Prova o ramo `escrever` do `can()` sem depender da hierarquia administrar>escrever (seed 0009).

## Real-tree integrity

Porcelain baseline (`?? next-env.d.ts`, `?? opencode.json`, `?? tsconfig.tsbuildinfo`) idêntica
antes/depois; mutantes criados só em `/tmp/opencode/verif-rf032` (removidos ao fim); nenhum
resíduo do admin suite (probes hard-deletam os membros criados); servidor prod :3000 no ar a
pós-verificação. Resíduo de `membro.semcadastro@ivc.local` no painel é estado de dados
pré-existente do próprio probe-painel (limpo entre runs — ver R2).

## Residual notes (não-bloqueantes)

1. `docs/coverage-matrix.md` — atualizar a linha RF-032 → ✅ verified no fechamento (commit).
2. `.specs/STATE.md` — gravar Handoff do RF-032 no fechamento (commit).
3. **Processo/desempenho (pedido do usuário)**: verificação cada vez mais longa — causas
   observadas nesta sessão: (a) sub-agente Verifier travou/cancelado; (b) drift de dados do
   dev (seed `membro.teste` removido; resíduo `membro.semcadastro`) exigiu migração 0010 +
   limpeza MCP manual; (c) `next dev` compila sob demanda no teste (trocar por `next start` —
   usado aqui, subiu em 296 ms); (d) probes admin agora 139 checks com curls em série;
   (e) `validate_state.py` mistura dívida pré-existente (painel-membro sem validation.md) com
   o feature atual. Ações recomendadas (ver R4/R5 e Handoff).
4. Lessons: L-006/L-007/L-008 registradas (pendência do RF-022, commit `f05edb7`); novas
   candidatas desta sessão: servidor de teste = produção (`next start`), e probes devem
   autocorrigir resíduo entre runs. Registrar quando recorrer.
5. Recomendação concreta de mitigação: criar `scripts/probes-all.sh` (runner único, exit code
   único), `scripts/reset-probe-residue.sql` (limpeza idempotente dos seeds de teste) e rodar
   as suítes sempre contra `next start` (build+start) — elimina rebuild+travamento+orquestração.

## Summary

**Overall**: ✅ PASS — 20/20 ACs com evidência `file:line` (ou comportamento demonstrado);
5/5 mutantes mortos (sensor de discriminação); gates determinísticos e as 3 suítes live
verdes; nenhum bloqueador residual para entrega. Único desvio de processo: Verifier inline
no lugar do sub-agente (cancelado pelo usuário) — registrado acima.