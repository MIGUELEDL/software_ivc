# Eventos Validation

**Date**: 2026-09-08
**Spec**: `.specs/features/eventos/spec.md` (10 ACs, EVENTOS-01..10)
**Diff range**: `ef2b5d1..HEAD` (commits `bbc1e20` spec+context, `8a8c017` fonte+nav, `423d664` rotas)
**Verifier**: independent sub-agent (author ≠ verifier, read-only)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| bbc1e20 (spec + context `eventos`) | ✅ Done | 10 ACs EARS (EVENTOS-01..10); RF-006/RN-003/RNF-001/011/012 |
| 8a8c017 (fonte + nav) | ✅ Done | `EVENTS` vazio + tipo `Evento` + `NAV_ITEMS` com `/eventos`; Navbar/Footer com suporte rota/âncora |
| 423d664 (rotas) | ✅ Done | `/eventos` (listagem + estado vazio) e `/eventos/[id]` (detalhe + 404 + WhatsApp) |

---

## Spec-Anchored Acceptance Criteria

| Criterion | Spec-defined outcome | `file:line` evidência | Result |
| --------- | -------------------- | --------------------- | ------ |
| EVENTOS-01: `/eventos` lista EVENTS em cards | cada entrada de `EVENTS` com título | `src/app/eventos/page.tsx:30-37` (`EVENTS.map` + `<h2>{event.title}</h2>`); `constants.ts:78` (`EVENTS`) | ✅ PASS |
| EVENTOS-02: estado vazio sem dados fabricados | `EVENTS=[]` → aviso acessível | `page.tsx:18` (`EVENTS.length === 0`), `:22` literal **"Em breve avisaremos os próximos eventos"` | ✅ PASS |
| EVENTOS-03: card linka `/eventos/<id>` | Link com id interpolado | `page.tsx:52-53` (`<Link href={\`/eventos/${event.id}\`}>`) | ✅ PASS |
| EVENTOS-04: detalhe renderiza campos | title/date/time/location/description | `[id]/page.tsx:41-43` (title), `:46-57` (date/time/location), `:60-62` (description), `:22` (find) | ✅ PASS |
| EVENTOS-05: id inexistente → 404 | `notFound()` | `[id]/page.tsx:22-23` (`find` + `if (!event) notFound()`) | ✅ PASS |
| EVENTOS-06: WhatsApp pré-preenchido | `wa.me/5583999450781?text=` URL-encoded | `[id]/page.tsx:25-27` (`${SOCIAL.whatsapp}?text=${encodeURIComponent(...)}`); `constants.ts:46` | ✅ PASS |
| EVENTOS-07: fonte única | nº de `SOCIAL.whatsapp`, título de `EVENTS`, sem literais | `[id]/page.tsx:25,65,76`; `constants.ts:46,78` | ✅ PASS |
| EVENTOS-08: item no navbar/footer | NAV_ITEMS com `/eventos` consumido | `constants.ts:65`; `Navbar.tsx:8-41,79,111`; `Footer.tsx:16-28,66` | ✅ PASS |
| EVENTOS-09: acessibilidade | elementos interativos com nome acessível | `page.tsx:52-58`, `[id]/page.tsx:32-38,64-72` (`<a>`/`<Link>` com texto visível) | ✅ PASS |
| EVENTOS-10: responsivo mobile-first | classes responsivas | `page.tsx:7-8,29`; `[id]/page.tsx:30-31,40` (`sm:`/`md:`/`lg:`) | ✅ PASS |

**Status**: ✅ 10/10 ACs — 0 spec-precision gaps. Edge cases verificados dinamicamente:
(1) EVENTS vazio → estado vazio + qualquer `/eventos/[id]` → 404; (2) acentos/espaços no `text` encodados (`%20`, `%C3%A3`).

---

## Discrimination Sensor

Roda em scratch isolado `/tmp` (git worktree em HEAD; descartado após; tree real intocado — porcelain idêntico ao baseline).

| Mutation | Local | Probe que mata | Result |
| -------- | ----- | -------------- | ------ |
| M1 | remover `?text=` do WhatsApp | href renderizado perde a query (`wa.me/...` ≠ URL exata | ✅ Killed |
| M2 | `EVENTS.length === 0` → `> 0` | estado vazio some (`grep -c "Em breve..."` = 0) | ✅ Killed |
| M3 | remover `if (!event) notFound()` | gate typecheck falha (event possibly undefined) | ✅ Killed |
| M4 | `SOCIAL.whatsapp` → num. errado | href com nº errado, viola RN-003 | ✅ Killed |
| M5 | remover item `/eventos` do NAV_ITEMS | `/` renderiza `href="/eventos"` 2×; mutante 0× | ✅ Killed |

**Result**: 5/5 killed - ✅ PASS (0 sobreviventes)

---

## Dynamic Behavior Check (rotas reais)

- `GET /eventos` → **200**; body contém "Em breve avisaremos os próximos eventos"
- `GET /eventos/nonexistent` → **404**
- SSG: `/` estática, `/eventos` estática, `/eventos/[id]` SSG com `generateStaticParams`
- `href` real do botão: `https://wa.me/5583999450781?text=Gostaria%20de%20me%20inscrever%20no%20evento%20Culto%20de%20Gratid%C3%A3o`

---

## Interactive UAT Results

Não aplicável — comportamento validado por rotas dinâmicas (curl) + inspeção estática; UAT interativo fica para rotas com formulário/estado (validate.md §7).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ (2 páginas finas, sem abstrações desnecessárias) |
| Surgical changes | ✅ (commits atômicos: fonte+nav / rotas) |
| No scope creep | ✅ (sem formulário, sem banco, sem CRUD admin) |
| Matches patterns | ✅ (mesmo padrão visual/motion dos demais componentes) |
| Spec-anchored outcome check | ✅ (10/10 com evidência de linha + comportamento dinâmico) |
| Per-layer Coverage Expectation | ✅ (`EVENTS` vazio mas consumido; fonte única preservada) |
| Documented guidelines seguidos | `tlc-spec-driven` + AGENTS.md | ✅ |

---

## Edge Cases

- [x] `EVENTS` vazio → estado vazio amigável; `/eventos/[id]` → 404 para qualquer id
- [x] `text` com acentos/espaços → `encodeURIComponent` aplicado (verificado dinamicamente)

---

## Gate Check

- **Gate command**: `npm run lint && npm run typecheck && npm run build` (Node v22.23.2 via nvm)
- **Result**: 3 passed, 0 failed (usado pelo verifier; runtime adicional com `npm run start` + curl)
- **Test count**: 0 unidade (F10 ainda não existe) — verificação = probes estáticos (10) + sensor (5) + rotas dinâmicas (3)
- **Skipped**: nenhum

---

## Fix Plans

Nenhum — 0 gaps na iteração inicial.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| RF-006 (eventos: listagem+detalhe→WhatsApp) | 🔲 pending | ✅ verified (EVENTOS-01..06) |
| RN-003 (inscrever-se → WhatsApp (83) 99945-0781) | 🔲 pending | ✅ verified (EVENTOS-06/07) |
| RNF-011 (fonte única) | already verified | ✅ verified (EVENTOS-07) |
| RNF-012 (WCAG AA) | 🔲 pending | ✅ verified (EVENTOS-09) |
| RNF-001 (mobile-first) | 🔲 pending | ✅ verified (EVENTOS-10) |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 10/10 ACs matched spec outcome | 0 spec-precision gaps
**Sensor**: 5/5 mutations killed
**Gate**: 3/3 passed + rotas dinâmicas 200/404/empty-state OK

**What works**: rotas `/eventos` (listagem + estado vazio acessível) e `/eventos/[id]` (detalhe + 404); botão "Inscrever-se" gera URL WhatsApp oficial com mensagem pré-preenchida URL-encoded; navegação (navbar/footer) passou a suportar rotas além de âncoras; `EVENTS` vazio sem dados fabricados.

**Issues found**: nenhum.

**Next steps**: atualizar `docs/coverage-matrix.md` (`RF-006/RN-003` → `verified`), Handoff em `.specs/STATE.md`, commit final, push; avançar para F3 `doacao-pix` (RF-007, RN-001).