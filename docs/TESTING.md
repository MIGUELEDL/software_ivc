# Testes — IVC

Estratégia de verificação/acompanhamento das fases. Os **probes por AC**, o
`validador independente` e os gates determinísticos são o coração negativo do processo
spec-driven (AD-005); framework de testes automatizados entra na **Fase 10** (QA-001).

## Visão geral

| Camada | Ferramenta | Quando |
| ------ | ---------- | ------ |
| **Probes estáticos por AC** | Spectral/regex à spec-diriven (verificador) | A cada feature (F8 em diante) |
| **Probes de UI (responsividade/acessibilidade)** | Lighthouse ≥ 90 (RNF-001) + WCAG 2.1 AA (RNF-012) | Fase 9 (gate de quality) |
| **Gates de código** | `npm run lint` (`eslint`), `npm run typecheck` (`tsc --noEmit`), `npm run build` | A cada commit (CI `tests`) |
| **Gates estruturais de spec** | `validate_spec.py` / `validate_tasks.py` / `validate_state.py` | CI `specs` + local |
| **Framework de testes automatizados** | Vitest 5 (módulos puros; `npm run test:ci`) + StrykerJS/PIT (`npm run test:mutate`, barreira 100%) | A cada commit (CI `tests`) |
| **Testes de aceitação UAT** | com o administrador (QA-003) | Fase 9 (MVP) |

## Postura

**Spec-driven:** cada feature tem `spec.md` com **ACs em EARS (IDs)**; o `verificador
independente` (autor ≠ verificador) valida cada AC com **evidência `arquivo:linha`**
(evidence-or-zero) e roda o **sensor de discriminação** em scratch isolado (mutações
injetadas não sobrevivem). Feature só é declarada pronta com PASS — ver `validation.md`
e o gate `validate_state.py`.

**Probes por AC:** a verificação de camadas sem framework (rotas/SSR/Postgres e
features não migradas) segue por probes determinísticos (scripts/checagens por AC),
mantendo a rastreabilidade RF→spec→AC→probe→aceite, materializada em
`docs/coverage-matrix.md`. A partir da **F10**, os módulos de domínio puro
(`code128`, `validade`, `cartao`, `documento`, `pix`) têm suíte Vitest colocated como
gate de runner; os probes bash desses módulos permanecem no repo (AD-031) — o
runner não os substitui como gate de CI.

**Framework de testes (F10, QA-001):** **Vitest 5** (`npm run test:ci`, ambiente
`node`, alias `@/*` via `vite-tsconfig-paths`) cobre o domínio puro com paridade de
asserts dos probes migrados (FWT-08, evidence-or-zero); **StrykerJS**
(`npm run test:mutate`, `@stryker-mutator/vitest-runner`) roda PIT contínuo no
subconjunto migrado com barreira `break: 100` (0 sobreviventes). Decisões AD-030/031/032
em `.specs/STATE.md`.

**Verificação dupla (AD-007):** CI roda `tests` (lint→typecheck→build) e `specs`
(validação estrutural das features em Python3) — gates de máquina, não memória.

## Cobertura e rastreabilidade

- Matriz de cobertura em `docs/coverage-matrix.md`: Requisito → Feature → Spec ACs →
  Teste/Gate → Status (`pending` / `in progress` / `verified`).
- Nenhuma feature em `verified` sem `validation.md` PASS no gate determinístico
  `validate_state.py` e sem linha correspondente na matriz.
- Regra: **nunca** remover/suavizar teste para fazer passar — em `evidence-or-zero`,
  criticidade de AC ausente é fracasso (não silêncio).

## Fases futuras

| Fase | Adição de testes |
| ---- | ---------------- |
| **F9 (MVP)** | Probes de UI por feature + UAT com o administrador (QA-003) + Lighthouse/WCAG |
| **F10** | ✅ Framework de testes automatizados (QA-001): Vitest 5 no domínio puro + runner no CI + PIT (Stryker) contínuo |
| **F11** | Observabilidade como camada ativa (ver `OBSERVABILITY.md`) |

## Referências

- `docs/coverage-matrix.md` — matriz RF/RNF → spec → teste → status
- `docs/ARCHITECTURE.md` — camadas testáveis (Ports & Adapters)
- `docs/REQUIREMENTS.md` — QA-001/002/003, RNF-001/012