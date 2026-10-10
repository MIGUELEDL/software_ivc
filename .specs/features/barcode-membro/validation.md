# barcode-membro — Relatório do Verifier

## Validation: barcode-membro - PASS

**Spec-anchored check**: 5/5 ACs (BRC-01..05) + 2/2 edge cases matched spec outcome | 0 spec-precision gaps

**Evidence (file:line)**:

- BRC-01 — barcode = matrícula (não gradiente): `MemberCard.tsx:284` (`<Code128Barcode value={campos.id}/>` em `bottom-[8%] right-[6%]`) + `cartao.ts:87` (`id: member.matricula`) + `probe-barcode.sh:51-56` (conjunção estática) + `probe-barcode.sh:157-158` (runtime `campos.id === "IVC-0001"` e `code128(campos.id) === expected`)
- BRC-02 — sequência Code 128: `code128.ts:133-152`; `probe-barcode.sh:119-125` (IVC-0001, checksum 10 re-computado independentemente) e `probe-barcode.sh:109-116` (âncoras start/stop/checksum)
- BRC-03 — invariantes estruturais: `code128.ts:14-122`; `probe-barcode.sh:96-106` (v=0..106: `^[01]{11}$`, pares/ímpares, run ≤4)
- BRC-04 — matrícula legível sob as barras: `MemberCard.tsx:285-287` (texto `{campos.id}` após `<Code128Barcode>`); `probe-barcode.sh:63-67`
- BRC-05 — determinismo + render proporcional: `code128.ts:156-173`; `probe-barcode.sh:128-129`, `probe-barcode.sh:132-136`, `probe-barcode.sh:141-146`
- EDGE-1 — RangeError degrada sem crash: `code128.ts:138-142`; `probe-barcode.sh:161` (`assert.throws(..., RangeError)`); tier SSR `probe-barcode.sh:222-224` renderiza "Código de barras indisponível" e não "da matrícula"
- EDGE-2 — matrícula ausente: tier SSR `probe-barcode.sh:225-226` ("Código de barras indisponível", sem lançar)

**Gate**: `bash scripts/probe-barcode.sh` → **7 ok / 0 falhas** (exit 0); `npm run probe:barcode` ligado ao CI (`.github/workflows/ci.yml`). `npm run lint`/`typecheck`/`build` verdes.

**Sensor** (worktree isolado no HEAD): **5 mutantes injetados, 5 mortos, 0 sobreviventes** — re-throw no catch (`MemberCard.tsx:12-14`), orientação flip (`code128.ts:164`), payload fixo `IVC-0000` (`cartao.ts:87`), gradiente reintroduzido no render (`MemberCard.tsx:22`), texto humano removido (`MemberCard.tsx:286`). Real tree intacta (porcelain idêntico antes/depois).

**Diff range**: `88e3b11~1..HEAD` (commits `88e3b11`, `65dda82`, `39d45bc`, `54fdaa5`, `a16daf3`).

**Histórico de verificação**: 1ª rodada FAIL (4 mutantes sobreviventes: payload fixo M8/M9, orientação M7, gradiente M10; edge 1/2; probe fora do CI) → endurecimento (runtime matrícula + anti-gradiente escopado + wiring CI) → 2ª rodada FAIL (1 sobrevivente: degradação token-only) → tier SSR de render → **PASS**.

**Result**: PASS