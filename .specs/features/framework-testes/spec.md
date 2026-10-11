# Framework de Testes (Fase 10) — Vitest + Stryker

## Problem Statement

O MVP (Fase 9) foi verificado por **probes bash** (~1000 asserções): cada probe
compila módulos com `npx tsc` para um tempdir e os executa com `node -e` +
patches de `Module._resolveFilename` — um harness artesanal, lento, frágil
(guards de caractere de controle, contadores de asserção, apostrofo-guard) e sem
relatório estruturado nem suporte a fuga de mutantes fora do Verifier manual.
A `QA-001` marca o **framework de testes automatizados na Fase 10**; o
ROADMAP prevê "framework + runner no CI + PIT (mutation) contínuo". O desafio é
introduzir o framework sem jogar fora o investimento de discriminação dos probes
nem regredir gates já verdes: começar pelos **módulos de domínio puros** (sem
Supabase), que hoje são os que mais pagam a migração (o `node -e` gasta ~4s de
`npx tsc` para cada `npm run probe:*`).

## Goals

- [x] Vitest instalado e configurado (ambiente `node`, alias `@/*` resolvido por `vite-tsconfig-paths`), com script `test` e `test:ci` (run, sem watch)
- [x] Suíte de testes Vitest cobrindo os **módulos de domínio puros**: `code128`, `validade`, `cartao`, `documento`, `pix` — assertando os MESMOS valores que o sensor de mutação dos probes discriminou (evidence-or-zero preservado)
- [x] Probes bash de domínio puro migrados → Vitest, sem perda de asserção discriminante (contagens originais preservadas/verificadas)
- [x] `npm test` no CI (job `tests`), ao lado de lint/typecheck/build e dos demais probes
- [x] StrykerJS configurado e rodando no subconjunto migrado (gate de fuga de mutante > 0 falha)
- [x] `docs/TESTING.md` e `docs/coverage-matrix.md` refletem a F10 concluída (linha framework)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Migrar probes de **integração** (rotas/SSR/Postgres) para Vitest | Piloto é só domínio puro; rotas exigem stubs de next/server + supabase (decisão do usuário: manter bash p/ tiers infra) |
| Comportamento de UI (jsdom/React Testing Library) | Sem componente migrado no piloto; jsdom adicionaria superfície sem retorno |
| Migrar os ~16 probes restantes (auth/admin-*/painel-financeiro etc.) | Escopo do piloto; expansão = fases seguintes (ROADMAP) |
| Cobertura de linha/e2e (Lighthouse, Clover) | Testes de cobertura % pertencem a fases seguintes (QA-001 já contempla) |
| Migração das features já VERIFIED | Nenhuma feature retrocede; suíte nova é gate adicional + futura substituição gradual |
| Integração no `dev`/Vercel | Deploy/remote exigem aprovação explícita (blast radius) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|----------------------|----------------|-----------|------------|
| Framework | **Vitest 5** (Node ^22.12.0; temos 22.23.2) | Escolhido pelo usuário; padrão do ecossistema TS/Next 16 | Sim (decisão do usuário) |
| Ambiente | `node` (sem jsdom) | Só módulos puros: nenhum precisa de DOM | Sim (decisão técnica) |
| Alias `@/*` | `vite-tsconfig-paths` | Resolve `tsconfig.json` paths sem duplicar `resolve.alias` (guia Next 16 vitest.md) | Sim (decisão técnica) |
| Diretório das suítes | `src/<mod>/__tests__` colocado ao lado do módulo (ex.: `src/lib/barcode/code128.test.ts`) | Colocation = importação relativa, sem config de resolver extra; convenção comum Vitest/Next | Sim (decisão técnica) |
| Script | `test` = `vitest run` (CI); `test:watch` = `vitest` | CI não pode ficar em watch | Sim (padrão) |
| Contagens do probe migrado | Mantidas/verificadas por comparação no Verifier | Migrar sem perder asserção discriminante (evidence-or-zero) | Pendente de Verifier |
| Probes bash após migração | Permanecerem no repo (sem deletar), mas o CI não os roda como gate de domínio puro duplicado; ViTest assume | Menor risco de regressão; fases seguintes deletam/migram integração | Sim (decisão do usuário) |
| Stryker | `@stryker-mutator/core` + `@stryker-mutator/vitest-runner`, escopo = suíte migrada | PIT contínuo restrito ao piloto (rápido) | Sim (decisão do usuário) |
| Script `test:mutate` | `stryker run` (vitest-runner), senão exit 1 quando sobreviventes > 0 | GA-001: zero mutante sobrevivente no subconjunto | Sim (decisão técnica) |

**Open questions:** none — todos resolvidos ou registrados acima.

---

## User Stories

### P1: Framework Vitest operando nos módulos de domínio puro ⭐ MVP

**User Story**: As a maintainer, I want a real test framework (not a bash harness)
that runs my pure-domain logic fast and with structured reports, so regressions
are caught by a standard runner in CI, not by hand-written node -e blocks.

**Why P1**: É o gate de entrada da F10 (QA-001) e o que destrava as fases de
manutenção do projeto.

**Acceptance Criteria**:

1. WHEN the repository contains `vitest.config.ts` THEN it SHALL resolve the `@/*` alias from `tsconfig.json` and set `environment: node` with `include` restricted to the pure-domain suites
2. WHEN `npm test` (CI) or `test:watch` (dev) runs THEN it SHALL execute all Vitest suites under `src/` and exit non-zero on any single failure
3. WHERE the Code128 suite (`src/lib/barcode/code128.test.ts`) exists THEN it SHALL assert the structural invariants of the full table (107 symbols, 11 módules each, runs ≤ 4, parity of bars/spaces), the known `IVC-0001` checksum=10 sequence, determinism, `code128Runs` totals, and orientation reconstruction
4. WHERE the Validade suite (`src/lib/painel/validade.test.ts`) exists THEN it SHALL assert the anniversary rule (28/02 clamp), the inclusive boundary, the civil-day frontier (`civilDe` at midnight UTC, fixed `America/Sao_Paulo`), ISO-with-offset inputs, and the 5-digit year (`10000-12-31`) without NaN
5. WHERE the Cartão suite (`src/lib/painel/cartao.test.ts`) exists THEN it SHALL assert `fmtData` (4–6 digit years, invalid → `—`, round-trip rejects 02-30), `camposCartao` projection of id/name/cpf/rg/validity/photo, and `calcularValidadeCartao` wired with injected `hoje`
6. WHERE the Documento suite (`src/lib/painel/documento.test.ts`) exists THEN it SHALL assert `normalizarCpf/Rg/DataBatismo` (masks, control chars, calendar overflow), `dadosDocumento` empty→NULL trio, and `colunasCriarMembro/Editar/Perfil` payload projection with frozen `Pronto<T>`
7. WHERE the Pix suite (`src/lib/pix.test.ts`) exists THEN it SHALL assert `buildBrCode`/`buildBrCodePessoal` (CNPJ unmasked key, txid=matrícula for pessoal, CRC16 of the final payload)
8. WHEN the migrated suites run THEN each former bash assertion SHALL remain represented (no lossy rewrite): the sum of `expect` in the Vitest suites SHALL equal or exceed the migrated probe's assertion count for the same module domain
9. IF a single unit test or suite fails THEN `npm run test:ci` SHALL exit with failure and report the failing case name

**Independent Test**: `npm run test:ci` verde; `npm run test:mutate` com 0 sobreviventes; diff da contagem de asserções (Vitest vs probe bash) coberto no Verifier.

---

### P2: Stryker no subconjunto migrado

**User Story**: As a maintainer, I want mutation testing on the migrated domínio so a cell of logic has to justify every mutant it lets survive.

**Why P2**: GA-001 pede PIT contínuo; piloto restrito mantém o tempo de execução curto.

**Acceptance Criteria**:

1. WHEN `stryker run` executes THEN it SHALL use the vitest-runner over only the migrated pure-domain suites (`mutate` restricted to `src/lib/{barcode,painel,pix}`)
2. WHEN a mutation survives (fuga) THEN the script SHALL exit non-zero; WHEN all mutants are killed THEN it SHALL exit zero
3. WHEN Stryker runs on the migrated subset THEN the mutation score on that subset SHALL be 100% (0 surviving mutants) — barreira igual à do sensor manual dos probes

**Independent Test**: `npm run test:mutate` (green = exit 0) e, sob um mutante injetado ad hoc, o runner o mata (verificado pelo Verifier).

---

## Edge Cases

- IF `npm test` is invoked in a TZ other than UTC THEN the civil-day assertions SHALL still pass (they inject `hoje` explicitly; no `new Date()` bare reads)
- IF the alias resolution fails in the CI checkout THEN the suite SHALL fail loudly (no silent skip)
- WHEN a test file imports `@/lib/...` THEN the alias plugin SHALL resolve it from `tsconfig.json` `paths`
- IF a future dev runs `npx vitest` without flags THEN it SHALL not watch indefinitely in CI (script `test:ci` pins `run`)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|----------------|-------|-------|--------|
| FWT-01 | P1: config | Execute | Verified |
| FWT-02 | P1: runner CI | Execute | Verified |
| FWT-03 | P1: code128 | Execute | Verified |
| FWT-04 | P1: validade | Execute | Verified |
| FWT-05 | P1: cartao | Execute | Verified |
| FWT-06 | P1: documento | Execute | Verified |
| FWT-07 | P1: pix | Execute | Verified |
| FWT-08 | P1: no lossy (contagem) | Execute | Verified (code128 + validade + cartao + documento + pix) |
| FWT-09 | P1: fail-loud | Execute | Verified |
| FWT-10 | P2: stryker escopo | Execute | Verified (mutate = 5 módulos do subset, exclui testes/config) |
| FWT-11 | P2: exit code | Execute | Verified (break:100, high/low:100; score <100 → exit 1) |
| FWT-12 | P2: 100% kill | Execute | Verified (100.00% real: 3 killables mortos por asserção + 28 anotados inline com `// Stryker disable` — 18 equivalentes e 10 artefatos de carga, documentados em tasks.md T7; sensor 5/5) |

**Coverage:** 12 total, 0 mapped to tasks, 12 unmapped ⚠️

---

## Success Criteria

- [x] `npm run test:ci` verde e `npm run test:mutate` com **0 sobreviventes** no subset (100% real com `break:100`; equivalentes/artefatos de carga anotados inline — ver tasks.md T7)
- [x] Contagem de asserções migradas ≥ contagem original dos probes de domínio (por módulo)
- [x] CI `tests` roda `npm run test:ci` sem regressão dos gates existentes (lint/typecheck/build/probes)
- [x] `docs/TESTING.md` documenta o framework como ativo a partir da F10 e a `coverage-matrix.md` ganha linha