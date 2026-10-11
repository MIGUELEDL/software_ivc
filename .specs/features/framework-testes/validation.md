# framework-testes — Relatório do Verifier

## Validation: framework-testes - PASS

**Spec-anchored check**: 12/12 ACs (FWT-01..12) matched spec outcome | 2 spec-precision gaps (doc-level, não-bloqueantes)

**Gate**: `npm run test:ci` → **220 passed / 0 failed** (6 files: alias.smoke, code128, validade, cartao, documento, pix); `npm run test:mutate` → **100.00%** (516 killed / 5 timeout / **0 survived** / 0 no-cov / 0 errors), **exit 0** com `thresholds.break: 100`. Diff do CI aditivo.

**Sensor** (worktree isolado `git worktree` em `/tmp/opencode/fwt-scratch`): **5 mutantes injetados, 5 mortos, 0 sobreviventes** + 1 demonstração da barreira. Real tree intacta (`git status --porcelain` EMPTY antes e depois; sem `git stash`).

**Diff range**: `5ada1c4..f3bdd90`

**Evidence (file:line)** — por AC:

- FWT-01 — config Vitest: `vitest.config.ts:1-19` (`tsconfigPaths()`, `environment:"node"`, `include:["src/**/*.test.ts"]`), alias via `tsconfig.json` `paths` `@/*`; smoke end-to-end `src/lib/alias.smoke.test.ts:14-16`.
- FWT-02 — runner no CI: `.github/workflows/ci.yml:31` (`- run: npm run test:ci` no job `tests`); diff aditivo (única linha removida é o `name:` do job); `probe:barcode:37`, `probe:admin-auditoria:38` e o job `cartao` intactos (AD-031).
- FWT-03 — code128: `code128.test.ts` 107 símbolos/11 módulos (`:28-32`), paridade barra/espaço (`:34-46`), runs ≤ 4 (`:48-53`), 18 anchors `it.each` (`:57-80`), checksum-10 de `IVC-0001` (`:84-86`), determinismo/distinção (`:88-94`), `code128Runs` quiet-zone/total/orientação (`:102-132`).
- FWT-04 — validade: clamp 29/02 (`vide :20-34`), limite inclusivo (`:79-89`), fronteira civil `2026-10-02T00:30:00Z`→`2026-10-01` + witness (`:37-52`), ISO com offset (`:112-130`), 5 dígitos `10000-12-31` (`:154-170`), teto `275760` sem NaN (`:186-223`), `FUSO_CIVIL` fixo.
- FWT-05 — cartao: `fmtData` 4–6 dígitos / inválido→`—` / round-trip 02-30 (`:118-186`), `camposCartao` id/name/cpf/rg/validity/photo (`:30-58`), validade via `hoje` injetado, dia civil `12/09/2027` (`:42-50`).
- FWT-06 — documento: `normalizarCpf/Rg/DataBatismo` máscaras/controle/overflow (`:37-191`), `dadosDocumento` vazio→NULL trio (`:194-200`), `Pronto<T>` congelado provado em runtime por `Object.isFrozen` (`:263`), key-set exato `colunasPerfil` = 7 colunas (`:334-345`, `:578-590`).
- FWT-07 — pix: CNPJ sem máscara `68683917000171` (`:21,32,46`), txid=matrícula (`:108-128`), CRC16/6304 (`:70-72,130-132`), payload final literal (`:27-28,75`).
- FWT-08 — paridade de asserts (recôntagem independente): code128 = 30 na base executada (23 `expect(` textuais expandidos por `it.each`; floor 30 → ✅); validade+cartao+documento = 225 (52+37+136) ≥ 199 (`N_ASSERCOES_DOMINIO=199`, `probe-cartao-validade.sh:57,1317`) → ✅; pix = 30 (novo, AD-012). Assertos em nível de valor (literais oficiais, `Object.isFrozen`, key-sets exatos, regex CRC), não presença-de-chamada.
- FWT-09 — fail-loud: cada mutante do sensor fez `test:ci` sair 1 com o caso nomeado; `test`/`test:ci` fixam `vitest run` (`package.json:11-13`); sem `.only/.skip/.todo/.fails`.
- FWT-10/11/12 — Stryker: `stryker.config.json:4-9,11-15` (`testRunner:"vitest"`, `mutate` = exatamente os 5 módulos, `break/high/low:100`). `npm run test:mutate` = **100.00% / 0 survived / exit 0**. `break:100` provado real: reabilitar o mutante-equivalente documentado `diasBase===null` derruba o score a 99.81 e o Stryker sai 1 ("under breaking threshold 100").

**Sensor detail** (worktree @ `/tmp/opencode/fwt-scratch`):

| # | Mutação | Morto? |
| - | ------- | ------ |
| M1 | `validade.ts` clamp 28/02 removido (`Math.min(dia,diasAlvo)`→`dia`) | ✅ (3 failed) |
| M2 | `validade.ts` `FUSO_CIVIL` `"America/Sao_Paulo"`→`"UTC"` | ✅ (12 failed) |
| M3 | `pix.ts` polinômio CRC `0x1021`→`0x8005` | ✅ (1 failed) |
| M4 | `cartao.ts` `fmtData` regex perde o `$` | ✅ (1 failed) |
| M5 | `documento.ts` `colunasDocumento` `rg` `\|\|`→`??` | ✅ (1 failed) |

**Gaps de spec-precision (não-bloqueantes)**:

1. `design.md:89` especificava `thresholds: {break:0}` — desatualizado; a implementação segue FWT-11 (`break:100`). Corrigido neste fechamento.
2. `spec.md` traceability ainda listava FWT-02 como `Pending` e `tasks.md` T8/T9 com checkboxes abertos — atualizados neste fechamento.

**Nota**: os 28 mutantes anotados inline com `// Stryker disable next-line` são equivalentes/artefatos de carga argumentados em comentário (18 semânticos + 10 de load do harness); o comportamento subjacente continua morto pelo sensor independente. A barreira deixou de ser "verde por construção" (`break:0`) — agora falha por mérito.

**Result**: PASS
