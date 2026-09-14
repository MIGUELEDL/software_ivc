## Validation: admin-eventos - PASS ✅

# Eventos (RF-024) Validation — VEREDICTO INDEPENDENTE

**Date**: 2026-09-14
**Spec**: `.specs/features/admin-eventos/spec.md`
**Diff range**: `24ea3c3..28bca31` (feat `fd98867..3f8d497` + fix `28bca31`; report `b5c121d`)
**Verifier**: sub-agente independente (autor ≠ verificador). Evidência re-derivada do spec + diff + probes; nenhuma alegação do autor herdada. Iteração 2 da malha fix→re-verify (limite 3).

**Veredicto: PASS** — os 2 mutantes sobreviventes da iteração 1 (M3 title-validator, M4 404-throw) foram re-injetados no scratch e **mortos** pelos novos asserts runtime do `fix 28bca31`; EVT-05/EVT-09 passam a ter asserção de valor/estado no runtime. 16/16 ACs com evidência.

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
| T8 (probes) | ✅ Done | `scripts/probes-admin-eventos.sh` — it-1: 69 ok/0 falhas; fix 28bca31 +2 asserts runtime; it-2: **71 ok/0 falhas** (3 runs verificador) |
| T9 (fechamento) | ✅ Done | validation.md Verifier **PASS**; coverage-matrix ✅; `validate_state.py` exit 0 |

---

## Spec-Anchored Acceptance Criteria (EVT-01..16)

| AC | Outcome definido no spec | `file:line` + asserção | Resultado |
| -- | ------------------------ | ---------------------- | --------- |
| EVT-01 | tabela `events` id/title/description null/date/time/location/visivel default true/status check ATIVO·INATIVO | `supabase/migrations/0012_events.sql:9-21`; MCP SQL (10 colunas, defaults `true`/`'ATIVO'`, `description` nullable); `scripts/probes-admin-eventos.sh:59-70` (greps coluna a coluna + check) | ✅ PASS |
| EVT-02 | SELECT `events` para `anon` e `authenticated` via RLS | migration:25-30 (`to anon, authenticated` + `using (true)`); MCP `pg_policies` roles `{anon,authenticated}`; probe:79-86 | ✅ PASS |
| EVT-03 | escrita só `can_access('eventos','escrever')`; nenhum DELETE | migration:32-45; MCP: 3 policies, SEM policy DELETE; probe:88-109 (count `can_access` >= 3) + :210-219 (ausência de `DELETE` nas rotas) | ✅ PASS |
| EVT-04 | POST válido → 201 com `status='ATIVO'`, `visivel` enviado ou default true | `src/app/api/admin/eventos/route.ts:12-40` (`status: 201` :40); `src/lib/admin/eventos.ts:146-168` (`status: "ATIVO"` :158, `visivel: dados.visivel ?? true` :157); probe runtime:475-486 (ADMIN POST → 201 + id) e :592-603 (SECRETARIA POST → 201) | ✅ PASS |
| EVT-05 | POST inválido → 400 `{error:"dados_invalidos", campos}`, discriminando cada campo | rota:25-28 (`erroCampos(resultado.campos)` → `{error:"dados_invalidos", campos}`); `validacao.ts:125-202` (rules por campo: title :133-140, date :147-157 + `validarDataEvento` :97-102, time HH:MM :159-169, location :171-179, visivel boolean :181-187, status :189-195); probes estáticos:173-186, :194, :245-251 + **runtime novo `probes-admin-eventos.sh:489-501`** (POST com `title:""`, `date:"06/15/2027"`, `time:"99:99"`, `location:""`, `visivel:"nao"`, `status:"ATIVADO"` → assert `400` **e** corpo contém `dados_invalidos`, `"campos"` **e** `"title"` — o campo discriminado, valor e corpo, não só status | ✅ PASS (ver resultado sensor M3 abaixo) |
| EVT-06 | sem sessão/papel sem escrita → 401/403 e negativa no log | probe runtime:420 (POST sem sessão → 401), :430-431 (leitor POST/PATCH → 403), :434-441 (MEMBRO página → 307 login/admin), :442 (MEMBRO POST → 403); log via `negarPermissao` (`http.ts:34-43`, `console.error "rbac: acesso negado..."`) — assertado na regressão `probes-admin-membros.sh:399-406` | ✅ PASS |
| EVT-07 | GET admin lista todos desc por `date`, inclui ocultos/INATIVO → 200 | rota:52-64; service:78-91 (`.order("date", { ascending: false })` :84); probe runtime:429 (leitor GET → 200), :506-511 (lista inclui A), :534-539 (lista inclui A oculto); ordem desc conferida manualmente ([2027-07-01 → 2026-10-01]) | ✅ PASS |
| EVT-08 | PATCH parcial só campos enviados (incl. `visivel`/`status`) → 200 | rota:35-42; service:175-206 (patch parcial :187-193); probe runtime:491-499 (PATCH title+location → 200, corpo contém o título editado), :605-611 (SECRETARIA PATCH → 200), ciclos :517-543/:567-584 (toggles visivel/status → efeito de estado portado) | ✅ PASS |
| EVT-09 | PATCH id inexistente → 404 | rota:43-48; service:179-180 (throw `EventoNaoEncontradoError`); probes estáticos:134-138, :203-205 + **runtime novo `probes-admin-eventos.sh:505-513`** (PATCH `99999999-9999-4000-8000-000000000099` → assert `404` **e** corpo contém `nao_encontrado` — corpo, não só status) | ✅ PASS (ver resultado sensor M4 abaixo) |
| EVT-10 | `status='INATIVO'` oculta do portal | service:119-135 (`buscarEventoPublico` filtra ATIVO :127); probe runtime:566-580 (portal NAO contém A INATIVO; `/eventos/A` INATIVO → 404) | ✅ PASS |
| EVT-11 | `visivel=false` oculta do portal | service:97-112 (`.eq("visivel", true)` :103); probe runtime:514-532 (portal NAO contém A oculto; `/eventos/A` oculto → 404; admin ainda vê :534-539) | ✅ PASS |
| EVT-12 | portal lista `visivel=true`+`ATIVO`, `date` asc, do banco | `src/app/eventos/page.tsx:2,15`; service:97-112 (filtros :103-104, `ascending: true` :105); probe runtime:448-454 (portal contém seed título+data), :544-549 (portal contém A com visivel=true); ordem asc conferida ([2026-11-20 antes de 2027-01-10]) | ✅ PASS |
| EVT-13 | detalhe completo + "Inscrever-se via WhatsApp" oficial | `src/app/eventos/[id]/page.tsx:30,39-41,80-88`; probe runtime:456-462 (href `wa.me/5583999450781?text=Gostaria%20de%20me%20inscrever...` no HTML) e :556-563 | ✅ PASS |
| EVT-14 | `/eventos/[id]` inexistente/oculto/INATIVO → 404 (não expor) | page:28-37 (`buscarEventoPublico` → `notFound()`); probe runtime:527-532 (A oculto → 404), :575-580 (A INATIVO → 404); id inexistente verificado manualmente → 404; M2 (remoção do filtro `ATIVO`) morre em :575-580, provando que o 404 depende do filtro | ✅ PASS |
| EVT-15 | estado vazio "Em breve avisaremos os próximos eventos" | page:32-41; probe runtime:617-643 (todos ocultos/INATIVO → mensagem presente, sem seed e sem A) | ✅ PASS |
| EVT-16 | nav "Eventos" `/eventos` preservado | `src/lib/constants.ts:65` (`{ label: "Eventos", href: "/eventos" }`); probe:313-319 | ✅ PASS |

**Status**: ✅ 16/16 ACs com asserção de valor/estado (EVT-05 e EVT-09 agora com runtime value/body asserts, não só estáticos).

---

## Discrimination Sensor (scratch isolado — real tree nunca mutada)

**Iteração 1** (worktree `sensor-eventos`, HEAD `3f8d497`, `next dev :3100`): M1 (flip `visivel` → 6 FAILs runtime) morto; M2 (remoção filtro `ATIVO` → 1 FAIL runtime) morto; M5 (RLS UPDATE relaxado) e M6 (DELETE re-adicionado) mortos por greps estáticos; **M3 e M4 sobreviveram** → verdict FAIL.

**Iteração 2** (worktree `ivc-sensor2`, HEAD `28bca31`, `next dev :3101`): o harness precisou de mudança de infraestrutura — Turbopack v16.2.12 **recusa symlink de `node_modules` que escape a raiz do projeto** (panic em `:3100` e `:3101` com symlink, mesmo na mesma filesystem); substituído por cópia real de `node_modules` (772M) dentro do worktree → dev server estável, baseline do harness 71 ok/0 falhas antes de qualquer mutação. 4 mutações re-injetadas, reinício do server por mutação (determinismo) e probes com `BASE_URL=http://localhost:3101`:

| # | Mutação (it-2) | Onde | Asserção nova que mata | Morto? |
| -- | -------------- | ---- | ----------------------- | ------ |
| M3 | desabilitar regra de title vazio (`if (!valor)` → `if (false)`, rerun do mutante da it-1) | `validacao.ts:136` | `probes:489-501` — POST title `""` (demais inválidos) → 400 sem `"title"` em `campos` → **FAIL `POST invalido -> 400 sem {error:dados_invalidos, campos} (EVT-05)`** (suite 70 ok/1 falha) | ✅ KILLED |
| M4 | remover guarda `if (!existente) throw new EventoNaoEncontradoError()` (rerun do mutante da it-1) | `eventos.ts:180` | `probes:505-513` — PATCH id inexistente → **500** (não 404) sem `nao_encontrado` → **FAIL `PATCH evento inexistente -> 500 sem nao_encontrado (EVT-09)`** (suite 70 ok/1 falha; e 69 ok/2 falhas com M3+M4 ativos) | ✅ KILLED |
| M1 (spot) | flip `.eq("visivel", true)` → `false` | `eventos.ts:103` | 6 FAILs runtime: seed ausente (EVT-12), leak visivel=false (EVT-11), empty state (EVT-15), restore | ✅ KILLED |
| M2 (spot, variante deleção) | remover `.eq("status", "ATIVO")` | `eventos.ts:127` | 1 FAIL runtime: `/eventos/A INATIVO -> 200 (esperado >=404)` (`probes:575-580`) | ✅ KILLED |

Restauração pós-mutações (git checkout do scratch) → suite **71 ok/0 falhas** de novo (sanity do harness). M5/M6 (estáticos, it-1) inalterados — código migração/rota não mudou entre as iterações.

**Sensor depth**: lightweight (it-2: 4 reinjeções cobrindo os 2 sobreviventes + spot dos 2 matadores de portal).
**Resultado final**: **6/6 classes de falha discriminadas** — 0 mutantes sobreviventes. Verdict: ✅.

---

## Payload / Conjunction Rule

- EVT-05 (novo): corpo assertado por valor — `dados_invalidos`, `"campos"` **e o campo discriminado `"title"` presente** no JSON de resposta; ausência do campo = kill (M3). Não é call-occurrence.
- EVT-09 (novo): corpo assertado — `404` **e** `nao_encontrado` no payload; 500 sem o token = kill (M4).
- Portal: asserts por valor de estado renderizado (título/data do seed no HTML, ausência de A quando `visivel=false`/`status=INATIVO`, empty state). ✅
- PATCH 200: corpo da resposta contém o valor editado (probe:496). ✅
- WhatsApp: href completo url-encoded no HTML renderizado, número oficial AD-010 (probe:457-458). ✅
- Conjunção do filtro público `visivel=true AND status='ATIVO'`: cada perna com assert runtime próprio (M1/M2 provam). ✅

---

## Gate Check (iteração 2, pós-fix 28bca31)

| Gate | Resultado |
| ---- | --------- |
| `scripts/probes-admin-eventos.sh` (real :3000) | ✅ **71 ok / 0 falhas** (2 runs verificador; +2 asserts novos) |
| `scripts/probes-admin-eventos.sh` (scratch :3101, sem mutação) | ✅ 71 ok / 0 falhas (baseline do harness) |
| `scripts/probes-admin-lideranca.sh` | ✅ 102 ok / 0 falhas |
| `scripts/probes-admin-membros.sh` | ✅ 139 ok / 0 falhas (inclui `negarPermissao`/`rbac: acesso negado`) |
| `scripts/probes-auth.sh` | ✅ 19 ok / 0 falhas |
| `scripts/probes-painel.sh` | ⚠️ 25 ok / 2 falhas ambientais pré-existentes (resíduo `membro.semcadastro` em `members`; não-RF-024; limpeza MCP → 27/0) — fora do escopo desta re-verificação |
| `npm run lint` | ✅ 0 errors / 4 warnings pré-existentes |
| `npm run typecheck` | ✅ 0 errors |
| `npm run build` | ✅ (it-1) `/eventos` e `/eventos/[id]` `ƒ Dynamic` |

---

## Code Quality

| Princípio | Status |
| --------- | ------ |
| Código mínimo / sem scope creep | ✅ fix 28bca31 toca SÓ o probe script (+30 linhas): zero mudança em código de produção |
| Spec-anchored outcome | ✅ 16/16 com valor/estado em runtime (erro 400 e 404 agora exercitados de verdade) |
| Per-layer coverage | ✅ rotas: happy + erro 400/404 + 401/403 |
| Testes mapeiam ACs | ✅ 71 asserts, todos com AC id |
| Padrões existentes | ✅ |

---

## Edge Cases

- [x] Evento oculto (`visivel=false`) mas ATIVO: oculto do portal + 404 no detalhe; admin continua vendo (EVT-11/14)
- [x] Evento INATIVO mas visível: 404 no detalhe público (EVT-10/14)
- [x] Sem sessão / MEMBRO / leitor-sem-escrita: 401/403/redirect distintos (EVT-06)
- [x] Todos os eventos ocultos → empty state (EVT-15)
- [x] Id inexistente no portal → 404
- [x] POST inválido → 400 + `campos` discriminados por campo (EVT-05, runtime `probes:489-501`)
- [x] PATCH id inexistente → 404 + `{error:"nao_encontrado"}` (EVT-09, runtime `probes:505-513`)

---

## Gaps da iteração 1 — resolvidos

1. ~~EVT-05 sem probe runtime de 400~~ → **resolvido** por `28bca31` (`probes:489-501`); M3 re-injetado morre.
2. ~~EVT-09 sem probe runtime de 404~~ → **resolvido** por `28bca31` (`probes:505-513`); M4 re-injetado morre.

Nota de precisão mantida (não-blocking): EVT-08 asserta título editado + efeito de estado dos toggles; um mutante que sobrescrevesse campos não-enviados (ex.: sempre reescrever `location`) não seria discriminado pelo runtime atual — reforço candidato, não requerido pelo spec vigente.

---

## Requirement Traceability Update

| Requirement | Status anterior | Novo status |
| ----------- | --------------- | ----------- |
| EVT-01..04, 06..08, 10..16 | Done | ✅ Verificado (evidência acima) |
| EVT-05 | Needs Fix (it-1) | ✅ **Done — verificado** (runtime `probes:489-501`; M3 killed) |
| EVT-09 | Needs Fix (it-1) | ✅ **Done — verificado** (runtime `probes:505-513`; M4 killed) |

`docs/coverage-matrix.md:38` (RF-024) atualizado: contagem 69 → **71 ok/0 falhas**.

---

## Summary

**Overall**: ✅ Ready — implementação correta (comportamento real verificado por curl no servidor: 400+`campos`, 404 `nao_encontrado`, ordenações, WhatsApp) **e** probes agora discriminam os dois comportamentos de erro; a suite fica verde 71/0 com os mutantes M3/M4 mortos ao serem re-injetados.

**Spec-anchored check**: 16/16 ACs com asserção de valor/estado; 0 ACs sem evidência; 0 gaps.
**Sensor**: it-2 4/4 mortos (M3, M4, spot M1/M2) → 0 sobreviventes no acumulado (6/6 classes discriminadas).
**Gate**: 71+102+139+19 ok / 0 falhas (RF-024 + regressões; painel 25/2 ambiental); lint/typecheck/build limpos.
**Iteração**: 2 de 3 (fix→re-verify) — encerrada com PASS; reste-verificações não necessárias.

**Lessons** (registradas na it-1 como candidatas, intactas): L-009 (400 por campo em runtime) e L-010 (404 inexistente em runtime) — o fix 28bca31 as valida na prática; permanecem candidatas até recorrência/confirmação.
