# Sobre — Dados Institucionais Validation

**Date**: 2026-09-08 (iteração 2 — re-verificação pós-fix `588940e`)
**Spec**: `.specs/features/sobre-dados-institucionais/spec.md` (11 ACs, DADOS-01..11)
**Diff range**: `c1066b0..HEAD` (feature `c1066b0` + fix `588940e`; demais commits docs/specs apenas — `git diff c1066b0..HEAD -- src/lib/constants.ts` = vazio)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| c1066b0 (feature: whatsapp/cnpj/fundação reais) | ✅ Done | `src/lib/constants.ts` +5/-2 |
| 588940e (fix iteração 1: consumir cnpj/city/leader/SCHEDULE) | ✅ Done | `About.tsx` +12, `Schedule.tsx` novo (+64), `page.tsx` +2 |
| 4724819 / db280ee / 79d95d0 (docs/ADR) | ✅ Done | sem toque no código |

---

## Spec-Anchored Acceptance Criteria

Cada AC exige a constante exposta com valor exato (método do spec = inspeção estática) **e** efeito observável na UI renderizada (gap da iteração 1). Evidência = `file:line` do literal + `file:line` do consumidor montado.

| Criterion | Spec-defined outcome | `file:line` literal + `file:line` consumidor | Result |
| --------- | -------------------- | ------------------------------------------- | ------ |
| DADOS-01: `CHURCH.city` | exact `"Santa Luzia - PB"` | `constants.ts:10` + renderizado em `About.tsx:44` (`{CHURCH.city}`, montado `page.tsx:16`) | ✅ PASS |
| DADOS-02: `CHURCH.foundedLocation` | exact `"Rua Quiezinho Fernandes, 213 - Nossa Senhora de Fátima, Santa Luzia - PB"` | `constants.ts:8-9` + `About.tsx:32` e `Schedule.tsx:59` | ✅ PASS |
| DADOS-03: `CHURCH.leader` | exact `"Pastor Ernandes Nogueira de Lucena"` | `constants.ts:11` + `About.tsx:40` (`{CHURCH.leader}`) | ✅ PASS |
| DADOS-04: `SOCIAL.email` | exact `"ivcvirtudecrista@gmail.com"` | `constants.ts:47` + `Footer.tsx:12` e `SocialLinks.tsx:33` (`mailto:`) | ✅ PASS |
| DADOS-05: `SOCIAL.youtube` | exact `"https://www.youtube.com/@IgrejaVirtudeCrista"` | `constants.ts:45` + `Footer.tsx:10`, `Hero.tsx:71`, `LiveBanner.tsx:33`, `SocialLinks.tsx:19` | ✅ PASS |
| DADOS-06: `SOCIAL.instagram` | exact `"https://instagram.com/igrejavirtudecrista"` | `constants.ts:44` + `Footer.tsx:9`, `SocialLinks.tsx:12` | ✅ PASS |
| DADOS-07: `SOCIAL.address` | exact string endereço completo | `constants.ts:48-49` + `Footer.tsx:75`, `SocialLinks.tsx:67` | ✅ PASS |
| DADOS-08: `SCHEDULE` | array exato `[TER 19:30 "Oração e Ensino", QUI 19:30 "Evangelismo", DOM 19:00 "Culto"]` em ordem | `constants.ts:52-56` + `Schedule.tsx:27` (`SCHEDULE.map`; renderiza `day`:38, `time`:42, `title`:45; montado `page.tsx:17`) | ✅ PASS |
| DADOS-09: `SOCIAL.whatsapp` | exact `"https://wa.me/5583999450781"` (D4 resolvido, era `"#"`) | `constants.ts:46` + `Footer.tsx:11`, `SocialLinks.tsx:26` | ✅ PASS |
| DADOS-10: `CHURCH.foundedDate` | exact `"07/09/2025"` (era `"Em breve"`) | `constants.ts:6` + `About.tsx:28` (`{CHURCH.foundedDate}`) | ✅ PASS |
| DADOS-11: `CHURCH.cnpj` | exact `"68.683.917/0001-71"` (novo nesta feature) | `constants.ts:7` + `About.tsx:36` (`{CHURCH.cnpj}`) | ✅ PASS |

**Status**: ✅ 11/11 ACs cobertas — literal exato + consumidor renderizado. Os 4 gaps da iteração 1 (DADOS-01/03/08/11 sem consumidor) foram fechados pelo commit `588940e` (evidência acima).

---

## Discrimination Sensor

Roda em scratch isolado `/tmp/opencode/reval/` (cópias; `git stash` não usado). Probe de saída renderizada: valor literal interpolado no JSX do consumidor montado ⇒ mutação altera o DOM observável. Consumo objetivo verificado por script (11/11 campos interpolados em componentes montados em `page.tsx`).

| Mutation | `constants.ts` | Description | Killed? |
| -------- | -------------- | ----------- | ------- |
| M1 | :53 (`SCHEDULE` DOM) | `DOM 19:00` → `19:30` (era sobrevivente na iteração 1) | ✅ Killed (`Schedule.tsx:42` renderiza `service.time`) |
| M2 | :7 (`CHURCH.cnpj`) | `"68.683.917/0001-71"` → `"12.345.678/0001-99"` (era sobrevivente) | ✅ Killed (`About.tsx:36`) |
| M3 | :10 (`CHURCH.city`) | `"Santa Luzia - PB"` → `"Campina Grande - PB"` (era sobrevivente) | ✅ Killed (`About.tsx:44`) |
| M4 | :46 (`SOCIAL.whatsapp`) | `5583999450781` → `5511999999999` | ✅ Killed (`Footer.tsx:11`, `SocialLinks.tsx:26`) |
| M5 | :6 (`CHURCH.foundedDate`) | `"07/09/2025"` → `"01/01/2000"` | ✅ Killed (`About.tsx:28`) |

**Sensor depth**: lightweight (5 mutações; 3 eram os sobreviventes da iteração 1 + 2 regressão)
**Result**: 5/5 killed - ✅ PASS (0 sobreviventes; os antigos sobreviventes cnpj/city/SCHEDULE agora são fatais na saída renderizada)

---

## Interactive UAT Results

Não aplicável — dados estáticos puros; validação automatizada suficiente (validate.md §7).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ (`Schedule.tsx` 64 linhas, sem abstrações desnecessárias) |
| Surgical changes | ✅ (`588940e` toca só `About.tsx`/`Schedule.tsx`/`page.tsx` — consumidores) |
| No scope creep | ✅ |
| Matches patterns | ✅ (mesmo padrão motion/framer dos demais componentes) |
| Spec-anchored outcome check (valores batem com spec) | ✅ (11/11 literais + consumidores) |
| Per-layer Coverage Expectation | ✅ (antes: 4 constantes órfãs; agora todas com consumidor) |
| Documented guidelines seguidos | `tlc-spec-driven` + AGENTS.md | ✅ |

---

## Edge Cases

- [x] Endereço único canônico por campo (`CHURCH.foundedLocation`/`SOCIAL.address` = mesma string) — `Schedule.tsx:59` e `About.tsx:32` reutilizam o mesmo literal, sem duplicação divergente

---

## Gate Check

- **Gate command**: `npm run lint && npm run typecheck && npm run build` (verificado pelo autor; F10 = framework de testes ainda não existe)
- **Result**: 3 passed, 0 failed (autor) — não re-executado pelo verifier (read-only)
- **Test count**: 0 unidade (F10) — verificação = probes estáticos por AC (11) + sensor (5) + consumo (11/11)
- **Skipped**: nenhum

---

## Fix Plans

Nenhum — gaps da iteração 1 resolvidos pelo commit `588940e`; re-verificação sem novas falhas.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| DADOS-01..08 | Verified (literal) — ⚠️ sem consumidor | ✅ Verified (literal + consumidor) |
| DADOS-09, 10 | Verified | ✅ Verified |
| DADOS-11 | ⚠️ Verified por literal, sem consumidor | ✅ Verified (literal + consumidor `About.tsx:36`) |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 11/11 ACs matched spec outcome | 0 spec-precision gaps
**Sensor**: 5/5 mutations killed (inclui os 3 sobreviventes da iteração 1)
**Gate**: 3/3 passed (autor)

**What works**: os 11 valores institucionais reais estão exatos em `src/lib/constants.ts` e **todos** têm consumidor renderizado e montado (`About.tsx`, `Schedule.tsx`, `Footer.tsx`, `SocialLinks.tsx`, `Hero.tsx`, `LiveBanner.tsx`); mutações de valor agora alteram a saída observável da UI; `constants.ts` intacto no range `c1066b0..HEAD` (fonte única preservada); sem dados fabricados.

**Issues found**: nenhum — os 4 gaps da iteração 1 (DADOS-01/03/08/11 sem consumidor) foram fechados com evidência `file:line` de renderização.

**Next steps**: feature pronta; rotear para verificação final/CI.
