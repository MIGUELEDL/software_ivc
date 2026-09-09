# Portal Home Validation

**Date**: 2026-09-08 (iteração 2 — re-verificação pós-fix `956ecd3`)
**Spec**: `.specs/features/portal-home/spec.md` (12 ACs, HOME-01..12)
**Diff range**: `0e4f1da..HEAD` (5 commits: `13b627b` spec, `a0d1073` imagens+placeholders, `b9ab530` liderança, `2be0c65` missão/visão, `956ecd3` fix HOME-08/HOME-09)
**Verifier**: independent sub-agent (author ≠ verifier, read-only)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| 13b627b (spec + context `portal-home`) | ✅ Done | `.specs/features/portal-home/{spec,context}.md` (12 ACs EARS) |
| a0d1073 (reestruturação de imagens) | ✅ Done | remove `public/img{1..10}.jpg` e `Gallery.tsx`; placeholders em Hero/About; drop do import em `page.tsx` |
| b9ab530 (seção liderança) | ✅ Done | `Leadership.tsx` novo (`#lideranca`); `NAV_ITEMS` + item; montado em `page.tsx:17` |
| 2be0c65 (missão/visão) | ✅ Done | `Values.tsx` renderiza `CHURCH.mission`/`CHURCH.vision` acima dos cards |
| 956ecd3 (fix iteração 1) | ✅ Done | `NAV_ITEMS` + `#cultos`; alts com fonte única |

---

## Spec-Anchored Acceptance Criteria

Evidência = `file:line` da constante → consumidor montado na rota `/` (`page.tsx`). Método do spec = inspeção estática + gates.

| Criterion | Spec-defined outcome | `file:line` evidência | Result |
| --------- | -------------------- | --------------------- | ------ |
| HOME-01: hero com `CHURCH.name`/`CHURCH.slogan` | hero renderiza nome e slogan | `Hero.tsx:42` (`{CHURCH.name}`), `Hero.tsx:51` (`{CHURCH.slogan}`), id `hero` `Hero.tsx:11`, montado `page.tsx:15` | ✅ PASS |
| HOME-02: seção Sobre/História | about, foundedDate, foundedLocation, cnpj | `About.tsx:23` (`about`), `:28` (`foundedDate`), `:32` (`foundedLocation`), `:36` (`cnpj`), id `sobre` `:9` | ✅ PASS |
| HOME-03: seção Missão/Visão/Valores | mission, vision, todos os valores | `Values.tsx:64` (`mission`), `:79` (`vision`), `:100` (`CHURCH.values.map` → `:116` title, `:119` description), id `valores` `:33` | ✅ PASS |
| HOME-04: seção Liderança `#lideranca` | exibe `CHURCH.leader` | `Leadership.tsx:4` (`id="lideranca"`), `:29` (`{CHURCH.leader}`), montado `page.tsx:17` | ✅ PASS |
| HOME-05: cultos `#cultos` | todos os itens de `SCHEDULE` | `Schedule.tsx:9` (`id="cultos"`), `:27` (`SCHEDULE.map` → `:38` day, `:42` time, `:45` title) | ✅ PASS |
| HOME-06: localização + contato | `SOCIAL.address` e `SOCIAL.email` | `SocialLinks.tsx:67` (`{SOCIAL.address}`), `SocialLinks.tsx:33` (`mailto:${SOCIAL.email}`), `Footer.tsx:12/:75` | ✅ PASS |
| HOME-07: redes `#redes` | instagram/youtube/whatsapp | `SocialLinks.tsx:41` (`id="redes"`), `:12` instagram, `:19` youtube, `:26` whatsapp | ✅ PASS |
| HOME-08: âncoras de navegação | `#sobre #valores #lideranca #cultos #redes` em `NAV_ITEMS` | `constants.ts:60-65` (fix `#cultos` em `:64`); consumido em `Navbar.tsx:49/:82` e `Footer.tsx:43`; ids-alvo existem (`About.tsx:9`, `Values.tsx:33`, `Leadership.tsx:4`, `Schedule.tsx:9`, `SocialLinks.tsx:41`) | ✅ PASS |
| HOME-09: fonte única | nenhum literal institucional nos componentes | grep em `src/components/*.tsx` por literais institucionais = zero; alts via `alt={`Logo ${CHURCH.name}`}` (`Hero.tsx:28`, `About.tsx:59`, `Navbar.tsx:34`) | ✅ PASS |
| HOME-10: acessibilidade (WCAG AA) | imagens com `alt`, links ícone-only com label | alts: `Hero.tsx:28`, `About.tsx:59`, `Navbar.tsx:34`, `Footer.tsx:24`; aria-labels: `Navbar.tsx:67` (menu), `Footer.tsx:67` | ✅ PASS |
| HOME-11: dependência só de `logo.png` | `img1..10` fora do componente; placeholders | `public/` contém apenas `logo.png`; zero refs `img[0-9]` em `src/`; placeholders `Hero.tsx:14-16`, `About.tsx:54-56` | ✅ PASS |
| HOME-12: sem galeria na home | gallery não renderizada | `page.tsx:1-9` sem import Gallery e `:14-22` sem render; `Gallery.tsx` removido no diff | ✅ PASS |

**Status**: ✅ 12/12 ACs cobertas. Os gaps da iteração 1 (HOME-08 sem `#cultos`; HOME-09 alts literais) foram fechados pelo commit `956ecd3`.

---

## Discrimination Sensor

Roda em scratch isolado `/tmp/opencode/ivc-scratch-portal-home/` (worktree em HEAD, descartado após; porcelain do tree real idêntico ao baseline). Probes de inspeção estática por AC (materialização do método do spec).

| Mutation | Description | Killed? |
| -------- | ----------- | ------- |
| M1 | remover `#cultos` do `NAV_ITEMS` | ✅ Killed (grep AC-08 detecta ausência) |
| M2 | remover `#lideranca` do `NAV_ITEMS` | ✅ Killed (grep EC/AC-08 detecta ausência) |
| M3 | reintroduzir `alt="Logo Igreja Virtude Cristã"` no Hero | ✅ Killed (grep AC-09/10 detecta literal em componente) |

**Sensor depth**: lightweight (3 mutações cobrindo os 2 fixes + regressão de âncora)
**Result**: 3/3 killed - ✅ PASS (0 sobreviventes)
**Honestidade**: `typecheck`/`lint` passam mesmo com M3 ativo (exit 0) — a discriminação vem da perna de inspeção estática, que é exatamente o "Independent Test" declarado na spec. Nenhum mutante sobreviveu ao método de teste.

---

## Interactive UAT Results

Não aplicável — conteúdo estático institucional; validação automatizada suficiente (validate.md §7 do skill).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ (Leadership.tsx 48 linhas; placeholders reutilizam paleta existente) |
| Surgical changes | ✅ (commits por tarefa: imagens / liderança / missão-visão / fix) |
| No scope creep | ✅ (galeria removida; nada de rotas novas) |
| Matches patterns | ✅ (mesmo padrão motion/framer e classes dos demais componentes) |
| Spec-anchored outcome check | ✅ (12/12 ACs com evidência de renderização) |
| Per-layer Coverage Expectation | ✅ missão/visão/liderança agora com consumidor; liderança em constants consumida) |
| Documented guidelines seguidos | `tlc-spec-driven` + AGENTS.md | ✅ |

---

## Edge Cases

- [x] `#lideranca` e `#cultos` incluídos em `NAV_ITEMS` consistentes com os ids montados — `constants.ts:62/:64`
- [x] Todos os consumidores importam de `@/lib/constants` (Navbar/Footer/Schedule/SocialLinks/LiveBanner/Hero/About/Values/Leadership) — fonte única mantida

---

## Gate Check

- **Gate command**: `npm run lint && npm run typecheck && npm run build` (Node v22.23.2 via nvm)
- **Result**: 3 passed, 0 failed (verifier re-executou no tree limpo do scratch) — lint 0 erros, 2 warnings pré-existentes em `SocialLinks.tsx` (arquivo não tocado pelo diff)
- **Test count**: 0 unidade (F10 ainda não existe) — verificação = probes estáticos por AC (12) + sensor (3) + gates
- **Skipped**: nenhum

---

## Fix Plans

Iteração 1 → gaps `HOME-08` (Major) e `HOME-09` (Minor) apontados; resolvidos no commit `956ecd3` (evidência nas tabelas acima) e re-verificados com PASS. Nenhum gap restante.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| RF-001 (sobre/história/MVV) | 🔲 pending | ✅ verified (HOME-02/03: `About.tsx`, `Values.tsx`) |
| RF-002 (liderança) | 🔲 pending | ✅ verified (HOME-04: `Leadership.tsx`) |
| RF-003 (localização + contato) | 🔲 pending | ✅ verified (HOME-06: `SocialLinks.tsx`) |
| RF-004 (cultos) | 🔲 pending | ✅ verified (HOME-05: `Schedule.tsx`) |
| RF-005 (redes sociais) | 🔲 pending | ✅ verified (HOME-07: `SocialLinks.tsx`) |
| RNF-001 (mobile-first) | 🔲 pending | ✅ verified (classes responsivas `sm:`/`md:`/`lg:` — padrão aplicado em todos os componentes) |
| RNF-011 (fonte única) | already verified | ✅ verified (HOME-09: zero literais) |
| RNF-012 (WCAG AA) | 🔲 pending | ✅ verified (HOME-10: alts/aria-labels) |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 12/12 ACs matched spec outcome | 0 spec-precision gaps
**Sensor**: 3/3 mutations killed
**Gate**: 3/3 passed

**What works**: home one-page com todas as seções da árvore oficial (Sobre/História, Missão/Visão/Valores, Liderança, Cultos, Localização+contato, Redes); dados todos via `src/lib/constants.ts`; âncoras de navegação completas (`#sobre #valores #lideranca #clamor #cultos #redes`); imagens obsoletas removidas com placeholders (só `logo.png` permanece) e galeria fora do escopo conforme `context.md`.

**Issues found**: nenhum — os 2 gaps da iteração 1 (HOME-08 âncora `#cultos`, HOME-09 alts literais) foram fechados com evidência `file:line`.

**Next steps**: atualizar `docs/coverage-matrix.md` para `verified`, registrar Handoff, push `origin/main` (aguardando autorização); avançar para F2 `eventos`.