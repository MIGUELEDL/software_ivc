## Validation: admin-eventos - FAIL ❌

**Date**: 2026-09-14
**Spec**: `.specs/features/admin-eventos/spec.md`
**Diff range**: `24ea3c3..HEAD` (feat commits `fd98867`, `e4c9d13`, `5b1eeeb`, `8b3b243`, `39e6807`, `883f673`, `7667298`, `4ea42ec`, `3f8d497`)
**Verifier**: sub-agente independente (autor ≠ verificador). Evidência re-derivada do spec + diff + probes; nenhuma alegação do autor herdada.

**Veredicto: FAIL** — os probes não discriminam 2 comportamentos definidos no spec (EVT-05 shape 400 por campo; EVT-09 404 em PATCH inexistente). Sensor de mutação: 2 mutantes sobreviveram com suites 100% verdes.

---

## Task Completion

| Task | Status | Notas |
| ---- | ------ | ----- |
| T1 (migration 0012) | ✅ Done | SQL confere via MCP: 10 colunas, 3 policies, sem DELETE, seed `Clamor 12h` |
| T2 (service + validarEvento) | ✅ Done | eventos.ts 5 funções + EventoNaoEncontradoError; validarEvento completo/parcial |
| T3 (POST/GET) | ✅ Done | guards + 201/400/401/403 |
| T4 (PATCH [id]) | ✅ Done | parcial + visivel/status + 404 + sem DELETE |
| T5/T6 (páginas admin) | ✅ Done | lista/badges; form POST/PATCH, toggles sem DELETE |
| T7 (portal DB-driven) | ✅ Done | RSC async, empty state, WhatsApp RN-003; sem generateStaticParams |
| T8 (probes) | ✅ Done | `scripts/probes-admin-eventos.sh` 69 ok / 0 falhas (verificador: 2 runs) |
| T9 (fechamento) | 🔄 Pendente | validation.md Verifier **FAIL**; coverage-matrix já ✅; `validate_state.py` só após fix |

---

## Spec-Anchored Acceptance Criteria (EVT-01..16)

| AC | Outcome definido no spec | `file:line` + asserção | Resultado |
| -- | ------------------------ | ---------------------- | --------- |
| EVT-01 | tabela `events` id/title/description null/date/time/location/visivel default true/status check ATIVO·INATIVO | `supabase/migrations/0012_events.sql:9-21`; MCP SQL (10 colunas, defaults `true`/`'ATIVO'`, `description` nullable); `scripts/probes-admin-eventos.sh:59-70` (greps coluna a coluna + check) | ✅ PASS |
| EVT-02 | SELECT `events` para `anon` e `authenticated` via RLS | migration:25-30 (`to anon, authenticated` + `using (true)`); MCP `pg_policies` roles `{anon,authenticated}`; probe:79-86 | ✅ PASS |
| EVT-03 | escrita só `can_access('eventos','escrever')`; nenhum DELETE | migration:32-45 (insert `with check`, update `using`+`with check`); MCP: 3 policies, SEM policy DELETE; probe:88-109 (count `can_access` >= 3) + :210-219 (ausência de `DELETE` nas rotas) | ✅ PASS |
| EVT-04 | POST válido → 201 com `status='ATIVO'`, `visivel` enviado ou default true | `src/app/api/admin/eventos/route.ts:12-40` (`status: 201` :40); `src/lib/admin/eventos.ts:146-168` (`status: "ATIVO"` :158, `visivel: dados.visivel ?? true` :157); probe runtime:475-486 (ADMIN POST → 201 + id) e :592-603 (SECRETARIA POST → 201) | ✅ PASS |
| EVT-05 | POST inválido → 400 `{error:"dados_invalidos", campos}`, discriminando cada campo | rota:25-28 (`erroCampos(resultado.campos)` → `{error:"dados_invalidos", campos}`, http.ts:22-27); `validacao.ts:125-202` (rules por campo: title :133-140, date :147-157 + `validarDataEvento` :97-102, time HH:MM :159-169, location :171-179, visivel boolean :181-187, status :189-195); probes estáticos:173-186 (validators+regex), :194 (`erroCampos(resultado.campos)`), :245-251 (`corpo?.campos`); **sem probe runtime de POST inválido** — verificação manual do servidor real confirma o spec (400 + 4 campos: `{"error":"dados_invalidos","campos":{"title":...,"date":...,"time":...,"location":...}}`) | ❌ GAP (discriminação — mutante M3 sobreviveu) |
| EVT-06 | sem sessão/papel sem escrita → 401/403 e negativa no log | probe runtime:420 (POST sem sessão → 401), :430-431 (leitor POST/PATCH → 403), :434-441 (MEMBRO página → 307 login/admin), :442 (MEMBRO POST → 403); log via guarda compartilhada `negarPermissao` (`http.ts:34-43`, `console.error "rbac: acesso negado..."`) — mecanismo assertado na regressão `probes-admin-membros.sh:399-406` | ✅ PASS |
| EVT-07 | GET admin lista todos desc por `date`, inclui ocultos/INATIVO → 200 | rota:52-64; service:78-91 (`.order("date", { ascending: false })` :84); probe runtime:429 (leitor GET → 200), :506-511 (lista inclui A), :534-539 (lista inclui A oculto); ordem desc conferida manualmente ([2027-07-01 → 2026-10-01]) | ✅ PASS |
| EVT-08 | PATCH parcial só campos enviados (incl. `visivel`/`status`) → 200 | rota:35-42 (`validarEvento(body, "parcial")` :35); service:175-206 (patch parcial :187-193, `visivel` :192, `status` :193); probe runtime:491-499 (PATCH title+location → 200, corpo contém o título editado — payload assertado por valor), :605-611 (SECRETARIA PATCH → 200), ciclos :517-543/:567-584 (toggles visivel/status via PATCH → efeito de estado portado) | ✅ PASS |
| EVT-09 | PATCH id inexistente → 404 | rota:43-48 (`Error EventoNaoEncontradoError` → 404 `{error:"nao_encontrado"}`); service:179-180 (throw); probes estáticos:134-138, :203-205; **sem probe runtime** — servidor real confirma 404 manualmente, mas mutante M4 (remoção do throw → 500) sobrevive à suite inteira | ❌ GAP (discriminação — mutante M4 sobreviveu) |
| EVT-10 | `status='INATIVO'` oculta do portal | service:119-135 (`buscarEventoPublico` filtra ATIVO :127); probe runtime:566-580 (portal NAO contém A INATIVO; `/eventos/A` INATIVO → 404) | ✅ PASS |
| EVT-11 | `visivel=false` oculta do portal | service:97-112 (`.eq("visivel", true)` :103); probe runtime:514-532 (portal NAO contém A oculto; `/eventos/A` oculto → 404; admin ainda vê :534-539) | ✅ PASS |
| EVT-12 | portal lista `visivel=true`+`ATIVO`, `date` asc, do banco | `src/app/eventos/page.tsx:2,15` (`listarEventosPublicos`); service:97-112 (filtros :103-104, `ascending: true` :105); probe runtime:448-454 (portal contém seed título+data), :544-549 (portal contém A com visivel=true); ordem asc conferida ([2026-11-20 antes de 2027-01-10]) | ✅ PASS |
| EVT-13 | detalhe completo + "Inscrever-se via WhatsApp" oficial | `src/app/eventos/[id]/page.tsx:30,39-41,80-88` (`SOCIAL.whatsapp` + `encodeURIComponent`, botão :87); probe runtime:456-462 (href `wa.me/5583999450781?text=Gostaria%20de%20me%20inscrever...` url-encoded no HTML) e :556-563 | ✅ PASS |
| EVT-14 | `/eventos/[id]` inexistente/oculto/INATIVO → 404 (não expor) | page:28-37 (`buscarEventoPublico` → `notFound()`); probe runtime:527-532 (A oculto → 404), :575-580 (A INATIVO → 404); id inexistente verificado manualmente → 404; mutante M2 (remoção do filtro `ATIVO`) é morto exatamente por :575-580, provando que o 404 depende do filtro | ✅ PASS |
| EVT-15 | estado vazio "Em breve avisaremos os próximos eventos" | page:32-41; probe runtime:617-643 (todos ocultos/INATIVO → mensagem presente, sem seed e sem A) | ✅ PASS |
| EVT-16 | nav "Eventos" `/eventos` preservado | `src/lib/constants.ts:65` (`{ label: "Eventos", href: "/eventos" }`); probe:313-319 | ✅ PASS |

**Status**: ❌ 14/16 ACs com asserção valor/estado; 2 GAPs de discriminação (EVT-05, EVT-09) — cobertura só estática, sem murdering no runtime.

---

## Discrimination Sensor (scratch isolado — real tree nunca mutada)

Metodologia executada: worktree temporário em `/tmp/opencode/sensor-eventos` (HEAD `3f8d497`) + `next dev` em `:3100` (node_modules do repo via symlink + `.env.local` copiado — único modo de o servidor scratch operar com o dev Supabase); probes executados com `BASE_URL=http://localhost:3100` (greps estáticos lêem o scratch; runtime exercita o código mutado). Controles: baseline do scratch sem mutação → 69 ok/0 falhas; servidor real `:3000` como controle. Mutantes M5/M6 (estáticos) verificados por greps do probe sobre cópias em `/tmp/opencode/sensor-copy/`.

| # | Mutação | Onde | Descrição comportamental | Morto? |
| -- | ------- | ---- | ------------------------- | ------ |
| M1 | `listarEventosPublicos`: `.eq("visivel", true)` → `.eq("visivel", false)` | `src/lib/admin/eventos.ts:103` | Portal passaria a listar só ocultos (seed some; ocultos vazam) | ✅ Morto — 6 FAILs runtime (seed ausente EVT-12, leak visivel=false EVT-11, empty state EVT-15, restore) |
| M2 | `buscarEventoPublico`: remover `.eq("status","ATIVO")` | `src/lib/admin/eventos.ts:127` | Detalhe de evento INATIVO renderiza 200 em vez de 404 | ✅ Morto — 1 FAIL runtime: `/eventos/A INATIVO -> 200 (esperado >=404)` (probe:575-580) |
| M3 | `validarEvento`: remover regra de title vazio (POST com title "" → 201) | `src/lib/admin/validacao.ts:133-140` | Violação total de EVT-05 (400 por campo) | ❌ **Sobreviveu** — suite 69 ok/0 falhas com a violação no ar (verificado: POST title vazio → 201; o probe nunca envia payload inválido) |
| M4 | `atualizarEvento`: remover `if (!existente) throw new EventoNaoEncontradoError()` | `src/lib/admin/eventos.ts:179-180` | PATCH id inexistente → 500 em vez de 404 | ❌ **Sobreviveu** — suite 69 ok/0 falhas com a violação no ar (verificado: PATCH `99999999-...` → 500 `erro_interno`; o probe nunca PATCHa id inexistente) |
| M5 | RLS 0012: relaxar UPDATE para `using (true)` | `supabase/migrations/0012_events.sql:44` | Leitor com UPDATE ganharia escrita no banco | ✅ Morto — greps estáticos do probe (using can_access + contagem >= 3) falham |
| M6 | Re-adicionar handler `DELETE` em `[id]/route.ts` | `src/app/api/admin/eventos/[id]/route.ts` | Hard-delete de evento (viola EVT-03) | ✅ Morto — grep de ausência `! grep -q 'DELETE'` (probe:210-214) falha |

**Sensor depth**: lightweight (6 mutações — 2 extras além do piso por criticidade de RBAC/content-publishing).
**Resultado**: 4/6 mortos — **2 mutantes sobreviveram** → os probes não discriminam EVT-05 (400 shape por campo) nem EVT-09 (404 inexistente). Verdict: ❌.

---

## Payload / Conjunction Rule

- Portal: asserts por valor de estado renderizado — título/data do seed no HTML (`probe:448-454`), ausência de A quando `visivel=false` (:520-525) / `status=INATIVO` (:569-574), empty state (:628-633); não são "chamada ocorreu" (call-count). ✅
- PATCH 200: corpo da resposta contém o valor editado (`A_TITLE_EDITED`, probe:496) — payload assertado. ✅
- WhatsApp: href completo url-encoded no HTML renderizado, número oficial AD-010 (probe:457-458). ✅
- Conjunção do filtro público: `visivel=true AND status='ATIVO'` exige as duas; M1/M2 provam que cada perna tem assert runtime próprio. ✅

---

## Gate Check

| Gate | Resultado |
| ---- | --------- |
| `scripts/probes-admin-eventos.sh` (real :3000) | ✅ 69 ok / 0 falhas |
| `scripts/probes-admin-eventos.sh` (scratch :3100, sem mutação) | ✅ 69 ok / 0 falhas (baseline do harness) |
| `scripts/probes-admin-lideranca.sh` | ✅ 102 ok / 0 falhas |
| `scripts/probes-admin-membros.sh` | ✅ 139 ok / 0 falhas (inclui assert de `negarPermissao`/`rbac: acesso negado` em http.ts:399-406) |
| `scripts/probes-painel.sh` | ⚠️ 25 ok / 2 falhas — **resíduo ambiental pré-existente** (linha `membro.semcadastro@ivc.local` em `members` de run anterior; autocadastro retorna 200/`IVC-0020` em vez de 201). Não é regressão do RF-024; limpeza via MCP (`delete from public.members where auth_user_id = (select id from auth.users where email='membro.semcadastro@ivc.local')`) restaura 27/0 |
| `scripts/probes-auth.sh` | ✅ 19 ok / 0 falhas |
| `npm run lint` | ✅ 0 errors / 4 warnings pré-existentes |
| `npm run typecheck` | ✅ 0 errors |
| `npm run build` | ✅ compilado; `/eventos` e `/eventos/[id]` `ƒ Dynamic` |

**Test count**: 69 asserts na suite principal (nenhum removido/enfraquecido vs. baseline da feature; contagem igual à do autor — verificado por 2 runs independentes).

---

## Code Quality

| Princípio | Status |
| --------- | ------ |
| Código mínimo / sem scope creep | ✅ (portal/details/páginas admin dentro do escopo T1..T7; `EVENTS=[]` morto em constants.ts mencionado como resíduo, fora do escopo) |
| Mudanças cirúrgicas | ✅ (diff de 9 commits atômicos, 1 por tarefa) |
| Padrões existentes respeitados | ✅ (padrão liderança/membros: guards, `erroCampos`, exceção de domínio, RSC) |
| Spec-anchored outcome | ⚠️ 14/16 com valor/estado; EVT-05/EVT-09 só estáticos |
| Per-layer coverage | ⚠️ rotas: happy path + 403/401 runtime; **erro 400 e 404 sem runtime** |
| Testes mapeiam ACs (sem testes órfãos) | ✅ |
| Diretrizes documentadas | ✅ AGENTS.md (gates), prática probes por AC (QA-002), lessons L-006/007/008 aplicadas |

---

## Edge Cases

- [x] Evento oculto (`visivel=false`) mas ATIVO: oculto do portal + 404 no detalhe; admin continua vendo (EVT-11/14)
- [x] Evento INATIVO mas visível: 404 no detalhe público (EVT-10/14)
- [x] Sem sessão / MEMBRO / leitor-sem-escrita: 401/403/redirect distintos (EVT-06)
- [x] Todos os eventos ocultos → empty state (EVT-15)
- [x] Id inexistente no portal → 404 (verificado manualmente)
- [ ] PATCH id inexistente: código correto (404 manual verificado), porém sem asserção de probe → **fix task 2**
- [ ] POST inválido: código correto (400 + campos manual verificado), porém sem asserção de probe → **fix task 1**

---

## Discriminação / Gaps (fix tasks gerados — máx. 3 iterações)

1. **EVT-05 sem probe runtime de 400** — o probe só grepa a ligação `erroCampos(resultado.campos)` e as regras; um POST inválido com título vazio retorna 201 sob mutação M3 com a suite 100% verde. Fix: adicionar ao probe runtime um POST com payload inválido de ADMIN e assertar `400` + `{"error":"dados_invalidos","campos":{...}}` com campos discriminados (título vazio, date inválida, time `99:99`, visivel não-booleano, status inválido) — EVT-05 — `scripts/probes-admin-eventos.sh` (seção runtime) + alvo: `src/lib/admin/validacao.ts`.
2. **EVT-09 sem probe runtime de 404** — remover o throw em `atualizarEvento` (PATCH inexistente → 500) deixa a suite 100% verde. Fix: adicionar ao probe runtime `check_api_status "PATCH eventos id inexistente -> 404" "404" "PATCH" "/api/admin/eventos/99999999-9999-4000-8000-000000000099"` + assert do corpo `{"error":"nao_encontrado"}` com sessão ADMIN — EVT-09 — `scripts/probes-admin-eventos.sh` + alvo: `src/lib/admin/eventos.ts:179-180` e rota `[id]/route.ts:43-48`.

Nota de precisão (não-driver do FAIL): EVT-08 asserta o valor do título editado e o efeito de estado dos toggles; um mutante que também sobrescrevesse campos não enviados (ex.: sempre reescrever `location`) não seria discriminado pelo runtime atual — candidato a reforço no mesmo fix task 1.

---

## Requirement Traceability Update

| Requirement | Status anterior | Novo status |
| ----------- | --------------- | ----------- |
| EVT-01..04, 06..08, 10..16 | Done | ✅ Verificado (evidência acima) |
| EVT-05 | Done | ❌ Needs Fix (discriminação de teste — código correto, probe fraco) |
| EVT-09 | Done | ❌ Needs Fix (discriminação de teste — código correto, probe fraco) |

---

## Summary

**Overall**: ❌ Not Ready — implementação correta (comportamento real verificado por curl no servidor: 400+`campos`, 404 `nao_encontrado`, ordenações, WhatsApp), mas os probes não matam 2 mutantes de comportamento definidos no spec; a suite fica verde com EVT-05 e EVT-09 violados no servidor scratch.

**Spec-anchored check**: 14/16 ACs com asserção de valor/estado; 0 ACs sem evidência; 2 GAPs de discriminação (EVT-05, EVT-09).
**Sensor**: 4/6 mortos — 2 sobreviveram (M3 title-validator; M4 404-throw).
**Gate**: 69+102+139+19 ok / 0 falhas (RF-024 + regressões exceto painel 25/2 ambiental); lint/typecheck/build limpos.

**Próximos passos**: 2 fix tasks (probe runtime 400 EVT-05; probe runtime 404 EVT-09) → re-verificação (iteração 1 de 3).
