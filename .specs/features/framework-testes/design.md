# Framework de Testes (Fase 10) — Design

**Spec**: `.specs/features/framework-testes/spec.md`
**Status**: Draft

---

## Architecture Overview

Introduz **Vitest** como framework de testes da F10, restrito a **módulos de
domínio puros** (sem Supabase, sem rotas, sem SSR): `code128`, `validade`,
`cartao`, `documento`, `pix`. Suítes **colocated** ao lado do módulo
(`src/lib/<mod>/<mod>.test.ts`), import relativo direto — zero configuração de
resolver para o piloto. Runner determinístico (`vitest run`) no CI, dev com
watch (`vitest`). **Stryker** (vitest-runner) sobre o mesmo subset, com exigência
de **0 sobreviventes** (barreira idêntica ao sensor manual dos probes).

```mermaid
graph LR
    SRC[src/lib/{barcode,painel,pix}/*.ts] --> TESTS[colocated *.test.ts]
    TESTS --> VIT[Vitest 5 - node env]
    VIT --> CI[npm run test:ci no job tests]
    TESTS --> STR[Stryker vitest-runner]
    STR --> G1{0 sobreviventes?}
    G1 -->|nao| FAIL[exit 1]
    G1 -->|sim| OK[exit 0]
    PROBES[probes bash - integracao/SSR/DB] --> CI2[jobs existentes - intactos]
```

**Antes de qualquer arquivo de teste, `npm run test:ci` precisa de pelo menos 1
teste real** (o primeiro commit traz config + smoke test de alias) — `vitest run`
falha quando não encontra suíte (nada de "verde por vazio").

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --------- | -------- | ---------- |
| `code128` (encoder puro) | `src/lib/barcode/code128.ts` | Teste direto — invariantes tabela, IVC-0001, determinismo, runs |
| `validade` (regra anual pura) | `src/lib/painel/validade.ts` | Teste direto — aniversario/clamp, civilDe, calcularValidadeCartao |
| `cartao` (mapper puro) | `src/lib/painel/cartao.ts` | Teste direto — fmtData, camposCartao |
| `documento` (normalizacao pura) | `src/lib/painel/documento.ts` | Teste direto — normalizar*, dadosDocumento, colunas* |
| `pix.ts` (BR Code puro) | `src/lib/pix.ts` | Teste direto — buildBrCode/buildBrCodePessoal com valores de AD-012 |
| Asservações dos probes bash | `scripts/probe-barcode.sh`, `scripts/probe-cartao-validade.sh` (`node -e` tiers) | **Migração by-value**: cada `assert` bash vira `expect` Vitest (sem lossy rewrite) |
| Matriz RBAC/civil | AD-020 (`FUSO_CIVIL`) | Teste do civilDe ancorado no fuso fixo, `hoje` injetado |

### Integration Points

| System | Integration Method |
| ------ | ------------------ |
| `tsconfig.json` `paths` (`@/*`) | `vite-tsconfig-paths` no `vitest.config.ts` (recomendação Next 16 `vitest.md`); 1 smoke test exercita o alias |
| CI `tests` job | step `npm run test:ci` após lint/typecheck/build (gates existentes intactos) |
| CI `cartao` job / probes | **intactos** (regra de design abaixo) |
| `docs/TESTING.md`, `docs/coverage-matrix.md` | linha F10 + coluna de evidência |

---

## Components

### `vitest.config.ts`

- **Purpose**: configuração única do Vitest para o piloto.
- **Location**: raiz do repo.
- **Interfaces**:
  - plugins: `tsconfigPaths()` (alias `@/*` do `tsconfig.json`)
  - `test.environment: "node"` (sem jsdom no piloto)
  - `test.include`: `["src/**/*.test.ts"]`, `exclude` default (node_modules, .next)
  - `reporters: ["default"]`
- **Dependencies**: `vitest@^5`, `vite-tsconfig-paths`.
- **Reuses**: `tsconfig.json` paths.

### Suítes colocated (5)

| Suíte | Location | Cobre (by-value dos probes) |
| ----- | -------- | --------------------------- |
| `code128.test.ts` | `src/lib/barcode/` | BRC tabela 107 símbolos (~invariantes), anchors, sequência `IVC-0001` checksum 10, determinismo, `code128Runs` totais/quiet zone/orientação, `camposCartao`→`id`, smoke de alias `@/` |
| `validade.test.ts` | `src/lib/painel/` | aniversario (clamp 28/02, bissexto, mês 00/13, ano 0, teto 275760), civilDe fronteira dia civil fuso igreja, compararDatas não-lexical, calcularValidadeCartao (limite inclusivo, rollup, ISO com offset, futuro, 5 dígitos `10000-12-31`, NaN→null, janela baixa) |
| `cartao.test.ts` | `src/lib/painel/` | fmtData (4–6 dígitos ano, inválido→`—`, rejeita 02-30), camposCartao (id=nome data, cpf/rg `??`, validity via calcularValidadeCartao com `hoje` injetado, photo) |
| `documento.test.ts` | `src/lib/painel/` | normalizarCpf/Rg/DataBatismo (máscara, controle no FINAL cru, overflow calendário, janela 0000-0099), dadosDocumento vazio→NULL trio, comporDadosDocumento (Pronto<T> ok/fail, freeze runtime, precedência form>base, ramo erro sem dados), colunas* (projeção fiel da row) |
| `pix.test.ts` | `src/lib/` | buildBrCode (payload AD-012, CNPJ sem máscara `68683917000171`, sem campo 54, CRC16/6304), buildBrCodePessoal (txid=matrícula, chave institucional) |

### `stryker.config.json`

- **Purpose**: PIT contínuo do subset migrado (P2 / GA-001).
- **Location**: raiz.
- **Interfaces**: `mutate: ["src/lib/barcode/code128.ts","src/lib/painel/{validade,cartao,documento}.ts","src/lib/pix.ts"]`, runner `@stryker-mutator/vitest-runner`, `thresholds: {high:100, low:100, break:0}`, `commandRunner` disabled, falha em fuga.
- **Dependencies**: `@stryker-mutator/core@^10`, `@stryker-mutator/vitest-runner@^10` (versões pareadas).

### Scripts `package.json`

| Script | Comando | Uso |
| ------ | ------- | --- |
| `test` | `vitest` | watch (dev) |
| `test:ci` | `vitest run` | CI e gates locais |
| `test:mutate` | `stryker run` | PIT no subset (exit 0/1) |

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| -------------- | -------- | ----------- |
| Suíte falha (1+ teste) | `vitest run` exit 1, nome do caso reportado | CI vermelho; dev vê o caso no relatório |
| Alias não resolve | `vite-tsconfig-paths` erro de resolução → teste falha | Ruído alto — suíte smoke de alias pega antes |
| Stryker com mutante sobrevivente | exit 1 (threshold break 0) | CI/locale avisam a fuga |
| `vitest run` sem suíte | exit 1 (mudança de comportamento baseline) | Impossível "verde por vazio" |

---

## Risks & Concerns

| Concern | Location | Impact | Mitigation |
| ------- | -------- | ------ | ---------- |
| Contagem de asserções migradas (FWT-08) | probes bash `node -e` tiers | Migração "lossy" passaria despercebida | Verifier reconta `expect` das suítes vs asserts dos probes; numero-alvo no spec traçável |
| Stryker vitest-runner: config detalhada | `stryker.config.json` | Runner ignorar arquivos/errar thresholds | Pesquisar na implementação (Knowledge chain → docs Stryker 10); smoke com mutante injetado no Verifier |
| `vite-tsconfig-paths` x Vitest 5/Vite 7 | config | Incompatibilidade de peer deps | Instalar versões pareadas; se plugin falhar, fallback documentado: `resolve.alias` manual |
| Duplicação bash+Vitest no domínio | CI `cartao` | Custo ~4s/probe redundante | **Aceito no piloto** (design decide manter; ver Tech Decisions) |
| `next build` pegar `*.test.ts` do `src/` | build | Typecheck/build incluem testes (bom: tipo dos testes valida); risco de rotas não referenciadas? | testes colocated não são importados por app; `tsc --noEmit` os type-checa (benefício) |
| Instalação de deps (registry offline) | npm ci | Novo `package-lock` | `npm install --package-lock-only` + commit separado do código |

---

## Tech Decisions

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Probes bash permanecem **no CI** (não removidos) | manter jobs existentes intactos + Vitest adicionado | Probes de integração/SSR/DB não têm equivalente no piloto; remover `probe:barcode`/tier `--domain` do cartao perderia cobertura real. Duplicação do domínio é transitória. **Divergência pontual do spec (assunção) — registrada como AD-031**. |
| Imports dos testes | relativo (colocation) + 1 smoke de alias `@/` | Módulos do piloto não usam `@/`; colocation simplifica; plugin alias fica exercitado e pronto p/ fases futuras |
| Threshold Stryker | `high/low/break = 100` | Igual à barreira do sensor manual (AD-005): 0 fuga |
| `test` (watch) não roda no CI | `test:ci` pinado a `run` | CI não pode travar em watch |
| dependências dev | `vitest@^5`, `vite-tsconfig-paths`, `@stryker-mutator/core@^10`, `@stryker-mutator/vitest-runner@^10` | Versões atuais (registry 2026-10); Node 22.23.2 compatível |

---

> **Decisões de convenção (project-level) → AD no `.specs/STATE.md`**: AD-030
> define Vitest + Stryker como o framework de testes padrão da F10; AD-031
> registra a regra "probes de integração permanecem no CI; Vitest é camada de
> domínio aditiva" (supersede a linha da assunção do spec).