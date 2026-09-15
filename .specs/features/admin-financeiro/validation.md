# Admin Financeiro (RF-026) — Validation

**Date**: 2026-09-15
**Spec**: `.specs/features/admin-financeiro/spec.md`
**Requirement**: RF-026 (FIN-01..12, AC-01..31)
**Diff range**: `36226ba..HEAD` (HEAD `e2cf1e7`) — 18 commits, 21 files, +4637/−2
**Verifier**: independent sub-agent (author ≠ verifier) — evidence re-derived
from tree + live probes
**Deviations**: AD-016 (filtros GET server-side via `searchParams`, AC-28) e
AD-017 (`cash_closes` sem coluna `status`, AC-20/24) — registrados em
`.specs/STATE.md`, reconciliados como não-bloqueantes
**Result**: PASS

---

## Spec-Anchored Acceptance Criteria (31/31 matched)

| AC | Spec-defined outcome | Evidence (`file:line` + assert) | Result |
| -- | -------------------- | ------------------------------- | ------ |
| 01 | Lista ordenada `data` desc; colunas descrição/valor/tipo/método/status/data | `financeiro.ts:81` `.order("data",{ascending:false})`; rota GET `route.ts:70-118`; tabela `page.tsx:276-284`; estático `probes-admin-financeiro.sh:180-184` + runtime lista contém seeds `:535-541` | ✅ PASS |
| 02 | Form nova: descrição, valor, tipo, método, data, categoria, observações | `nova/page.tsx` (form client POST); probe `probes-admin-financeiro.sh:357-369` (`method:"POST"`, `name="tipo"`/`name="metodo"`) — nota N3 | ✅ PASS |
| 03 | POST válido → 201; status PENDENTE | `route.ts:43` (`status: 201`); `financeiro.ts:165` (`status: dados.status ?? "PENDENTE"`); runtime `probes-admin-financeiro.sh:550-566` (201 + `"status":"PENDENTE"` no corpo) | ✅ PASS |
| 04 | Inválido → 400 `{error:"dados_invalidos", campos:{<campo>:msg}}` por campo | `validacao.ts:345-427` (accum por campo `:354-401`); `route.ts:36-39` → `erroCampos`; runtime `probes-admin-financeiro.sh:568-585` (400 + descricao/valor/tipo/metodo/data) | ✅ PASS |
| 05 | Sem permissão → 403 (anon → 401) | `route.ts:21` `requireEscrita("financeiro")`; runtime `probes-admin-financeiro.sh:504` (anon 401), `:517` (SECRETARIA 403), `:529` (MEMBRO 403) | ✅ PASS |
| 06 | Clique na linha → `/admin/financeiro/[id]` detalhe | `[id]/route.ts:17-38` GET; `[id]/page.tsx`; runtime `probes-admin-financeiro.sh:615-622` (GET [id] → 200 + id no corpo) | ✅ PASS |
| 07 | PATCH parcial (campos enviados) → 200 | `[id]/route.ts:68-78` (`validarLancamento "parcial"`, 200); `financeiro.ts:188-237`; runtime `probes-admin-financeiro.sh:600-613` (PATCH descricao/categoria → 200) | ✅ PASS |
| 08 | Editar CONCILIADO → 400 `{error:"transacao_conciliada"}` | `financeiro.ts:206-208` (throw); `[id]/route.ts:80-84` (400); runtime `probes-admin-financeiro.sh:766-777` (PATCH CONCILIADO → 400) | ✅ PASS |
| 09 | Cancelar PENDENTE → status CANCELADO, 200 | `cancelar/route.ts:28-29`; `financeiro.ts:263-268` (update CANCELADO); runtime `probes-admin-financeiro.sh:624-632` (200 + `"status":"CANCELADO"`) | ✅ PASS |
| 10 | Cancelar CONCILIADO/CANCELADO → 400 `transacao_nao_cancelavel` | `financeiro.ts:259-261`; `cancelar/route.ts:31-35`; runtime `probes-admin-financeiro.sh:634-639` (2º cancelar → 400) | ✅ PASS |
| 11 | Inexistente → 404 `{error:"nao_encontrado"}` | `financeiro.ts:126` (throw); `[id]/route.ts:86-88` (404); runtime `probes-admin-financeiro.sh:587-598` (404 + corpo) | ✅ PASS |
| 12 | RLS `can_access('financeiro',...)`: SELECT ler, INSERT/UPDATE escrever, sem DELETE | `0014_financeiro.sql:75-98` (policies `:76-95`, sem delete `:97-98`); estático `probes-admin-financeiro.sh:94-128` | ✅ PASS |
| 13 | Webhook válido → loga `webhook_events` + 200 `{ok:true}` | `webhook/route.ts:48-56` (insert), `:169` (ok); runtime `probes-admin-financeiro.sh:654-663` (200 + `{"ok":true}`) | ✅ PASS |
| 14 | Duplicado (mesmo `event_id`) → 200, sem registro duplicado | `webhook/route.ts:58-62` (23505 → 200); runtime `probes-admin-financeiro.sh:675-688` (200 + 1 ocorrência da ext-ref) | ✅ PASS |
| 15 | JSON inválido → 400 `{error:"payload_invalido"}` | `webhook/route.ts:31-38`; runtime `probes-admin-financeiro.sh:709-715` (400) | ✅ PASS |
| 16 | `approved` → cria RECEITA/PIX/CONCILIADO ou atualiza por `external_reference` | `webhook/route.ts:94-159` (busca ext-ref `:97-101`, update `:123-131`, create `:141-150`); runtime `probes-admin-financeiro.sh:654-673` (cria + RECEITA/PIX/CONCILIADO + ext-ref) — nota N1 | ✅ PASS |
| 17 | Status ≠ approved → loga, NÃO cria/atualiza transação | `webhook/route.ts:83-86`; runtime `probes-admin-financeiro.sh:690-708` (200 + assert negativo por `external_reference` na lista sem filtro — M-H) | ✅ PASS |
| 18 | Endpoint sem auth (MP chama); valida estrutura | `webhook/route.ts:29-45` (sem guard; parse+validação); runtime `probes-admin-financeiro.sh:506` (POST sem sessão → 200) | ✅ PASS |
| 19 | Payload cru persistido em `webhook_events` | `0014_financeiro.sql:15-22` (`payload jsonb not null`); `webhook/route.ts:48-56`; estático `probes-admin-financeiro.sh:77-83` | ✅ PASS |
| 20 | Lista fechamentos: data + totais | `fechamento/route.ts:10-23`; `financeiro.ts:431-443` (order created_at desc); runtime `probes-admin-financeiro.sh:823-829` (snapshot na lista) — AD-017 | ✅ PASS |
| 21 | Preview: receitas/despesas CONCILIADO, saldo, count PENDENTE | `financeiro.ts:296-335`; `fechamento/page.tsx:89-98` (`data-testid="preview-fechamento"`, `preview.receitas`); `fechar-caixa-button.tsx:75-80`; runtime `probes-admin-financeiro.sh:779-792` (bloco preview: R$ 150,00/50,00/100,00 + PENDENTES) | ✅ PASS |
| 22 | Confirmar → snapshot `cash_closes` + marca `cash_close_id` nas CONCILIADO | `financeiro.ts:345-425` (base `:350-355`, insert `:383-393`, marcação `:399-404`); `fechamento/route.ts:39-47` (201); runtime `probes-admin-financeiro.sh:801-822` (201 + totais exatos 150/50/2) | ✅ PASS |
| 23 | Sem CONCILIADO → 400 `{error:"sem_transacoes_para_fechar"}` | `financeiro.ts:362-364` (null); `fechamento/route.ts:41-45`; runtime `probes-admin-financeiro.sh:831-836` (400 determinístico pós-snapshot) | ✅ PASS |
| 24 | Snapshot imutável — sem editar/deletar | `0014_financeiro.sql:117` (sem UPDATE/DELETE em cash_closes); estático `probes-admin-financeiro.sh:121-128` — AD-017 | ✅ PASS |
| 25 | RLS: `escrever` cria; `ler` vê | `0014_financeiro.sql:103-115` (select `ler` / insert `escrever`); runtime `probes-admin-financeiro.sh:516-518` (SECRETARIA ler 200 / POST 403) | ✅ PASS |
| 26 | Filtros tipo/status/período/busca, cumulativos | `route.ts:76-113` (query params + multi-status `:85-94`/`:111-113`); `financeiro.ts:84-98`; `page.tsx:72-104`; runtime `probes-admin-financeiro.sh:864-903` (DESPESA, CANCELADO, multi-status, período, cumulativo) | ✅ PASS |
| 27 | Sem filtros → todos, `data` desc | `financeiro.ts:81`; `route.ts:110`; estático `probes-admin-financeiro.sh:180-184` | ✅ PASS |
| 28 | Filtros cumulativos sem reload | chips `Link` client-side `page.tsx:232-256` + form GET `:158-226` (AD-016); runtime `probes-admin-financeiro.sh:894-903` | ✅ PASS |
| 29 | Filtro vazio → "Nenhum lançamento encontrado" | `page.tsx:267-272`; runtime `probes-admin-financeiro.sh:904-909` | ✅ PASS |
| 30 | Seed RECEITA (Dízimo 100, PIX, PENDENTE) + DESPESA (Aluguel 500) idempotente | `0014_financeiro.sql:124-139` (`on conflict (id) do nothing`); estático `probes-admin-financeiro.sh:131-148` + runtime `:535-541` (seeds na lista) | ✅ PASS |
| 31 | Seed `financeiro.teste@ivc.local` papel FINANCEIRO | `0014_financeiro.sql:149-166` (`role` FINANCEIRO em raw_app_meta_data); estático `probes-admin-financeiro.sh:149-155` + login `:456-471` (307 → /admin) | ✅ PASS |

**Status**: ✅ 31/31 ACs com evidência `file:line` + assert por valor; 2 desvios
registrados (AD-016/AD-017); 3 notas de precisão não-bloqueantes (N1–N3).

---

## Discrimination Sensor

Scratch: `git worktree add /tmp/opencode/verif-rf026 HEAD` (node_modules copiado —
hardlink cross-device falha, lição RF-025), `next build` real + servidor `:3100`,
probes com `BASE_URL=:3100`. **Sensor depth**: P0-full (dados financeiros — kills
runtime em build real).

| # | Injeção | Detecção empírica (build mutado) | R1 | Final |
| - | ------- | -------------------------------- | -- | ----- |
| M-A | `0014_financeiro.sql:76-80` SELECT policy `to authenticated` → `to anon, authenticated` (AC-12/05) | Estático `probes-admin-financeiro.sh:98` (`! grep 'to anon, authenticated'`) → `FAIL ...com anon` | KILLED | KILLED |
| M-B | `validarLancamento` sem validação por campo (`validacao.ts:354-401`, AC-04) | Runtime `probes-admin-financeiro.sh:568-585` → `FAIL POST invalido -> 400 sem campos` | KILLED | KILLED |
| M-C | `financeiro.ts:259` flip `!=="PENDENTE"` → `==="PENDENTE"` (cancelaria CONCILIADO/CANCELADO, AC-10) | Runtime `probes-admin-financeiro.sh:634-639` → `FAIL cancelar de novo -> 200 (esperado 400)` | KILLED | KILLED |
| M-D | Idempotência webhook removida (`webhook/route.ts:60-62`, 23505→200, AC-14) | Runtime `probes-admin-financeiro.sh:675-688` → `FAIL webhook duplicado (esperado 200)` / 2ª transação | KILLED | KILLED |
| M-E | Prévia do fechamento errada/ausente na DOM (`fechamento/page.tsx:89-98`, AC-21) | R1 só tinha assert estrutural → **SURVIVED R1**. Fix `45fab1a` (preview server-side + bloco `data-testid`); assert final isola o bloco e exige R$ 150,00/50,00/100,00 + PENDENTES (`probes-admin-financeiro.sh:779-792`) → `FAIL preview ... no bloco preview` | SURVIVED | KILLED |
| M-F | `fecharCaixa`/preview: troca do reduce por tipo — `total_receitas` somando DESPESA (AC-22) | R1 só assert de presença de chaves → **SURVIVED R1**. Fix `45fab1a`: assert exato via awk (receitas=150, despesas=50, qtd=2, `probes-admin-financeiro.sh:809-822`) → `FAIL snapshot totais errados (esperado 150/50/2)` | SURVIVED | KILLED |
| M-G | Guarda CONCILIADO removida em `atualizarLancamento` (`financeiro.ts:206-208`, AC-08) | Grep estático `probes-admin-financeiro.sh:190-195` mata a remoção; runtime PATCH CONCILIADO→400 adicionado no fix (`:766-777`) cobre flip | KILLED | KILLED |
| M-H | Webhook status ≠ approved passou a criar transação (`webhook/route.ts:83-86`, AC-17) | v1..v3 (só assert de 200) → **SURVIVED R1..R3** (transação mutante nasce c/ descrição padrão — invisível ao filtro `busca`). Fix `e2cf1e7` v4: assert negativo por `external_reference` na lista SEM filtro (`probes-admin-financeiro.sh:699-708`) → `FAIL webhook nao-approved criou transacao indevida` | SURVIVED | KILLED |

**Resultado**: R1 → 5/8 killed, 3/8 SURVIVED (M-E/M-F/M-H → 3 fix tasks
`45fab1a`+`e2cf1e7`); rodada final (R2) → 3/3 re-injetados mortos + re-checagem
dos 5 → **8/8 killed, 0 survivals** — PASS.

---

## Gate Check

| Gate | Result |
| ---- | ------ |
| `probes-admin-financeiro.sh` (live `next start` :3000) | **99 ok / 0 falhas** |
| `npm run lint` | 0 erros; 4 warnings pré-existentes (`SocialLinks.tsx`, fora do diff) |
| `npm run typecheck` | PASS (exit 0) |
| `npm run build` | PASS |
| Regressões (registradas pelo autor, `probes-all.sh`) | eventos 71/0, liderança 102/0, membros 139/0, patrimônio 67/0, painel 27/0, auth 19/0 |
| `validate_spec.py admin-financeiro` / `validate_tasks.py` | 0 errors (autor) |

---

## Notas de precisão (não-bloqueantes)

1. **N1 — AC-16, ramo update por `external_reference`**: runtime cobre só o ramo
   create (`probes-admin-financeiro.sh:654-673`); o ramo update
   (`webhook/route.ts:123-131`) tem evidência estática apenas. O outcome do
   AC-16 (status CONCILIADO) é o mesmo nos dois ramos.
2. **N2 — edge `valor=0`**: aceito por `validacao.ts:366` (`valor < 0` rejeita;
   0 passa) e pelo CHECK `valor >= 0` (`0014_financeiro.sql:42`) — coberto por
   código, sem assert runtime dedicado de POST com valor=0.
3. **N3 — AC-02, campos do form**: `nova/page.tsx` tem todos os campos, mas o
   probe asserta estrutura (POST, `name="tipo"`/`name="metodo"`) sem discriminar
   individualmente `categoria`/`observacoes` (opcionais).

---

## Isolamento do sensor (tree real intacta)

Baseline porcelain (`?? .specs/features/admin-financeiro/design.md`,
`?? next-env.d.ts`, `?? opencode.json`, `?? tsconfig.tsbuildinfo`) idêntico
antes/depois do sensor; scratch `/tmp/opencode/verif-rf026` removido; servidor
:3000 restaurado servindo o build final. Resíduo dos probes (fechamentos criados
e lançamentos cancelados) é snapshot/resíduo aceito pelo script (limpeza via MCP
entre rodadas, padrão RF-025).

---

## Summary

**Overall**: ✅ PASS — 31/31 ACs com evidência `file:line` + assert por valor;
sensor 8/8 killed (0 survivals); gates e regressões verdes; desvios AD-016/017
registrados e reconciliados. Sem bloqueantes.

**Assinatura**: Verifier (independente) — 2026-09-15
