## Validation: admin-patrimonio - PASS
# Patrimônio (RF-025) — Validation

**Date**: 2026-09-15
**Spec**: `.specs/features/admin-patrimonio/spec.md`
**Diff range**: `b758421..HEAD` (1b20965, a5d77ab, 0924a95, 42a4ff8, eb8edc4, 12e10ad, 1c21a64)
**Verifier**: independent sub-agent (author != verifier) — evidence re-derived from tree + live probes + MCP SQL

---

## Spec-Anchored Acceptance Criteria (PAT-01..12)

| AC | Spec-defined outcome | Evidence (`file:line` + assertion) | Result |
| -- | -------------------- | ---------------------------------- | ------ |
| PAT-01 | Tabela `assets` (12 colunas, CHECK categoria enum fixo, CHECK status, tombo nullable + índice único parcial) | `supabase/migrations/0013_assets.sql:13-28` (DDL+CHECKs), `:33-35` (índice parcial `where numero_patrimonio is not null`); MCP dev: constraints `assets_category_check` (7 valores) e `assets_status_check`; índice `assets_numero_patrimonio_unique WHERE (numero_patrimonio IS NOT NULL)`; colunas 12/12 — `scripts/probes-admin-patrimonio.sh:61-86` | ✅ PASS |
| PAT-02 | SELECT só `authenticated` com `can_access('patrimonio','ler')`, SEM anon | `0013_assets.sql:40-44` (`for select ... to authenticated using (public.can_access('patrimonio','ler'))`); MCP dev: `assets_select_admin` roles `{authenticated}`, sem anon; probe `:89-97` | ✅ PASS |
| PAT-03 | Escrita (INSERT/UPDATE) `can_access('patrimonio','escrever')`; NENHUM DELETE (nem policy nem rota) | `0013_assets.sql:46-59` (insert/update `to authenticated` + `can_access('patrimonio','escrever')`), sem policy delete (`:61-62`); rotas sem `DELETE` — probe `:113-117` + `:241-250`; MCP dev: 0 policies DELETE | ✅ PASS |
| PAT-04 | POST válido (escritor) → cria com `status='ATIVO'`, responde 201 | `src/app/api/admin/assets/route.ts:13-43` (`requireEscrita("patrimonio")`, 201 `{asset}`); `src/lib/admin/assets.ts:63-87` (`status: "ATIVO"` em `:77`); runtime `scripts/probes-admin-patrimonio.sh:509-521` (ADMIN 201) e `:616-627` (PATRIMONIAL 201) | ✅ PASS |
| PAT-05 | POST inválido (nome vazio, categoria fora do enum, valor inválido, data inválida, status inválido) → 400 `{error:"dados_invalidos", campos}` discriminando cada campo | `src/lib/admin/validacao.ts:237-324` (campos.name `:247-248`, category enum `:257-259`, acquisition_value `:282-283`, acquisition_date `:291-292`, status `:312-313`); rota `:26-29` (`erroCampos(resultado.campos)` → 400 `dados_invalidos` em `src/lib/admin/http.ts:22-27`); runtime `probes:525-539` (400 + campos com name/category/acquisition_value) | ✅ PASS |
| PAT-06 | POST sem sessão ou papel sem escrita → 401/403 + negativa no log | `src/lib/admin/http.ts:68-80` (`requireEscrita`: sem claims 401; `negarPermissao` 403 + `console.error` `:34-43`); runtime `probes:450-451` (anon POST/GET 401), `:462`/`:472`/`:483` (leitor/SECRETARIA/MEMBRO 403) | ✅ PASS |
| PAT-07 | GET lista bens ordenados `name` asc (inclui INATIVO) → 200 | `src/lib/admin/assets.ts:39-52` (`.order("name", { ascending: true })` `:45`); rota `:67-79` (`authAdmin("patrimonio")`, 200); runtime `probes:461` (leitor GET 200), `:490-495` (seed na lista), `:585-590`, e INATIVO visível `:596-604` | ✅ PASS |
| PAT-08 | PATCH parcial (só campos enviados, incl. `status`) → 200 | `src/app/api/admin/assets/[id]/route.ts:36-43` (`validateAsset(body,"parcial")`, 200); `src/lib/admin/assets.ts:94-140` (patch condicional por campo `:116-127`); runtime `probes:571-580` (PATCH name/location → 200) e `:629-635` (PATRIMONIAL PATCH → 200) | ✅ PASS |
| PAT-09 | PATCH id inexistente → 404 `{error:"nao_encontrado"}` | `src/lib/admin/assets.ts:100-111` (`BemNaoEncontradoError`); rota `:45-50` (404 `nao_encontrado`); runtime `probes:556-566` (404 `nao_encontrado`) | ✅ PASS |
| PAT-10 | PATCH `status='INATIVO'` → baixa (soft-delete), sem remoção física | CHECK status inclui INATIVO (`0013_assets.sql:24`); rota aceita status (`[id]/route.ts` parcial); `atualizarAsset` persiste `status` (`assets.ts:127`); form toggle ATIVO/INATIVO (`asset-editar-form.tsx:314-337`); runtime `probes:593-608` (baixa A → 200 + lista mantém A INATIVO) | ✅ PASS |
| PAT-11 | anon/leitor sem `can('patrimonio','ler')` → vazio/401/403/redirect, sem expor inventário | MCP dev: `set local role anon; select count(*) from assets` → **0**; policies sem anon; API anon 401 (`probes:450-451`); leitor SEM linha escrever 403 (`:462-463`); MEMBRO 307 login/admin + 403 (`:475-483`); página sem sessão 307 (`:452`) | ✅ PASS |
| PAT-12 | `/admin` mostra cards "Eventos" (`/admin/eventos`) e "Patrimônio" (`/admin/patrimonio`) | `src/app/admin/page.tsx:56-87` (cards Eventos `:56-71` e Patrimônio `:72-87`, ícones `CalendarDays`/`Package`); runtime `probes:642-650` (HTML contém Eventos + /admin/patrimonio) e regressão cards pré-existentes `:651-656` | ✅ PASS |

**Status**: ✅ 12/12 ACs com evidência `file:line` + assert; 0 gaps de precisão de spec; 2 resíduos de qualidade de teste (ver Residuals).

---

## Discrimination Sensor

Scratch: `git worktree add /tmp/opencode/verif-rf025 HEAD` (nexo tmpfs; node_modules copiado real — hardlink cross-device falha), builds `next build` + servidor `:3100`, probes com `BASE_URL=:3100`. **Sensor depth**: lightweight→full (P0 RBAC: builds reais para kills runtime).

| # | Mutação | Detecção | Killed? |
| - | ------- | -------- | ------- |
| M1 | `0013_assets.sql:43` SELECT policy `to authenticated` → `to anon, authenticated` | Probe estático `:93` (`! grep 'to anon, authenticated'`) → `FAIL policy assets_select_admin ausente, alterada ou com anon (PAT-02/11)` (66 ok, 1 falhas) | ✅ Killed |
| M2 | `src/app/api/admin/assets/route.ts:49` `code === "23505"` → `code !== "23505"` (409 mapping morto) | Greps estáticos `:218-225` PASSAM (só checam presença de string) → **runtime** `:548-552` mata: `FAIL POST tombo duplicado -> 500 (esperado 409) (PAT-06)` (66 ok, 1 falhas) | ✅ Killed (runtime) |
| M3 | `src/lib/admin/validacao.ts:312` `valor !== "ATIVO" && valor !== "INATIVO"` → `valor !== "ATIVO"` (INATIVO rejeitado → baixa quebrada) | Runtime PAT-10 `:596-604` mata em DB limpo: `FAIL lista admin perdeu A INATIVO (baixa dura, PAT-10 quebrado)` (66 ok, 1 falhas). Curl direto confirmou 400 em PATCH INATIVO | ✅ Killed (runtime) |

**Resultado**: 3/3 killed. **Sensor depth**: P0-full (RBAC/inventário — mutantes executados contra build real em scratch). Survivor nenhum.

---

## Gate Check

- **Gate command**: `bash scripts/probes-admin-patrimonio.sh` (servidor `next start` :3000) + `npm run lint && npm run typecheck && npm run build`
- **Resultado (verifier reran live)**: probes admin-patrimonio **67 ok / 0 falhas** (rerun 2026-09-15 contra `next start` :3000); regressões registradas pelo autor: admin-eventos 71/0, admin-lideranca 102/0, admin-membros 139/0, painel-membro 27/0, auth 19/0; lint 0 erros (4 warnings pré-existentes em `SocialLinks.tsx`, fora do diff), `tsc --noEmit` limpo, `next build` ok (rotas `/api/admin/assets`, `/admin/patrimonio` `ƒ Dynamic`).

---

## Residuals

1. **Assert PAT-10 não-atômico sob resíduo** (`probes-admin-patrimonio.sh:599-600`): `grep '"$A_ID"'` + `grep '"status":"INATIVO"'` sobre a lista inteira — com bens INATIVO residuais de runs anteriores no DB, o assert passa mesmo quando o bem alvo NÃO foi baixado (falso positivo observado no sensor M3: 67/0 com a baixa quebrada). Em DB limpo, o mutante M3 foi morto. **Mitigação atual**: limpeza via MCP entre runs (prática documentada no script `:24-26`). **Melhoria recomendada (fix task, não bloqueante)**: tornar o assert atômico (ex.: `grep -E "\"id\":\"$A_ID\""` seguido de extração do status do objeto, ou `jq`) e/ou baixar para INATIVO 1 bem de teste fixo por run.
2. **Greps estáticos não discriminam flips booleanos** (M2): a presença de `"23505"`/`status: 409` não prova o branch `===`; a discriminação real é o assert runtime 409. Sem o runtime, o flip passaria. Mantido como está (runtime cobre), registrado para lição.
3. **`next build` em scratch**: node_modules por hardlink cross-device (tmpfs) falha — copia real necessária (762 MB). Documentado para futuros sensores.
4. Resíduo de probes: 26 bens `Probe *` acumulados em runs anteriores + 2 do run do sensor — **limpos via MCP** (delete `name like 'Probe %'`); seeds intactos (Kit de Som ATIVO/PAT-0001, `patrimonial.teste` com papel PATRIMONIAL). Servidor :3000 restaurado após sensor.

## Summary

**Overall**: ✅ Ready — **PASS** (12/12 ACs, 3/3 mutantes mortos, gates verdes).
