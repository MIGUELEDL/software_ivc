# observabilidade — Relatório do Verifier

## Validation: observabilidade - PASS

**Spec-anchored check**: 13/13 ACs (OBS-01..13) matched spec outcome | 0 spec-precision gaps

**Gate**: `npm run test:ci` → **243 passed / 0 failed** (9 files; 220 base F10 + 23 novos `observability`); `scripts/probe-observabilidade.sh` → **13 ok / 0 falhas** (tiers estáticas + SSR + runtime `next build`/`next start` efêmero); regressão `probes-admin-financeiro.sh` → 94 ok / 5 falhas pré-existentes (dashboard, ver Nota).

**Sensor**: R1 (worktree isolado): **7 injetados, 6 mortos, 1 sobrevivente** → FAIL honesto; R2 pós-fix (worktree isolado, descartado): **2 injetados, 2 mortos, 0 sobreviventes**. Real tree intacta (baseline `M tsconfig.tsbuildinfo`, sem `git stash`).

**Diff range**: `23e99a3..fe60ea9` (9 commits: `3a5ff34` T1 … `458088a` T7 + `06a6b41` T8 + `fe60ea9` T9)

**Evidence (file:line)** — por AC:

- OBS-01 — captura server: `src/instrumentation.ts:17` (`onRequestError = Sentry.captureRequestError`); registro por runtime em `src/instrumentation.ts:9-15`; client `src/instrumentation-client.ts:9`. Chegada fim-a-fim com DSN real: throw scratch `prova-obs-p11` → 500 + issue `[prova-obs-f11]` **confirmada pelo operador no dashboard** em 2026-10-12 (release `unknown`, sem PII).
- OBS-02 — NOOP: `src/lib/observability/sentry-options.ts:18-21` (`cleanDsn`: ausente/vazio→`undefined`); smoke `src/lib/observability/sentry-init.test.ts:68-85` (`register()` nodejs/edge sem DSN + DSN malformado não lançam); runtime: health 200 com `SENTRY_DSN=` vazio (probe).
- OBS-03 — release + sem PII: `src/lib/observability/release.ts:5-8` (SHA ou `"unknown"`); `release.test.ts:13-26`; `sentry-init.test.ts:36-44` (release aplicado, `sendDefaultPii:false`, sem tracing/replay por construção); `beforeSend` = `scrubEvent` (`sentry-options.ts:23-32`).
- OBS-04 — boundary: `src/app/global-error.tsx:1-34` (`"use client"`, `captureException(error)` no efeito, fallback sem stack/mensagem); probe: 3 tiers estáticas + tier SSR (render executado contém texto/classe/retry, mensagem `SEGREDO-INTERNO-123` não vaza).
- OBS-05 — health 200 corpo exato: `src/app/api/health/route.ts:12-14`; probe runtime asserta igualdade com `{"status":"ok","release":"unknown"}` sem auth.
- OBS-06 — só GET: rota exporta apenas `GET`; probe: `POST` → 405 medido.
- OBS-07 — Sentry fora não derruba: rota sem import Sentry (probe estático); runtime com `SENTRY_DSN=` vazio → 200.
- OBS-08 — raso/sem PII: probe estático (sem import Sentry/Supabase); corpo só `{status, release}`.
- OBS-09 — logger: `src/lib/observability/logger.ts:46-62` (`sanitize`: PII top-level + aninhada, `*_pii`, arrays, profundidade 3 + `__truncated__`); `logger.test.ts:16-60` (valores `[redacted]`, killer de string vazia) + `:87-95` (JSON `{level,evento,ts,release,meta}`, sem `meta` quando ausente, mapa de níveis).
- OBS-10 — adoção webhook: `src/app/api/webhooks/mercadopago/route.ts:51,72,114,144,163,173` (2× `logger.warn` + 4× `reportError`, zero `console.*`); `logger.test.ts:127-147` (log + `captureException` com `extra` sanitizado, identidade do erro); probe: import + contagem ≥6 + veto `console.*`.
- OBS-11 — lib estável: `src/lib/observability/logger.ts:69-74` (`logger` + `reportError` exportados, adotados pelo webhook e pelos configs).
- OBS-12 — `docs/OBSERVABILITY.md`: tabela Status com F11 ativa (DSN, release, alerta-dashboard).
- OBS-13 — runbook com passo de criação da regra de alerta no dashboard (condição, canal da liderança, o que não alertar, revisão trimestral).

**Sensor detail**:

| # | Mutação | Morto? |
| - | ------- | ------ |
| R1-M1..M6 | sanitize-bypass, `cleanDsn→""`, `getRelease→""`, health-POST, vazamento `error.message`, drop sufixo `_pii` | ✅ |
| R1-M7 | webhook `reportError`→`console.error` (1 call site) | ❌ sobreviveu (suíte 242/242 verde) → gap R1-1 |
| R2-M1 | R1-M7 re-injetado contra a tier nova | ✅ (contagem 6→5 + veto `console.*` falham) |
| R2-M2 | guarda try/catch do `reportError` removida | ✅ (`logger.test.ts:149-157` falha, `rede fora` propaga) |

**R1 → R2**: FAIL honesto (12/13) → `06a6b41` (tier de adoção) + `fe60ea9` (teste do edge + guarda try/catch no `reportError` — o teste novo pegou bug real: o envio falho propagava) → PASS 13/13.

**Nota (pré-existente, não atribuível)**: `probes-admin-financeiro.sh` = 94 ok / 5 falhas, todas greps estáticos do dashboard (`card Financeiro`, `Resumo financeiro`, cards pré-existentes) contra `src/app/admin/page.tsx`, restilizado após o probe (`2fb2175`/`bbcc220`/`1b43aca`); `git diff 23e99a3..fe60ea9 --name-only` nunca toca esse arquivo. Todas as tiers do webhook (AC-13..19, com escrita real CONCILIADO) verdes.

**Boot**: warning Sentry `diagnostics-channel injection` (só spans/tracing, fora do escopo errors-only); captura manual + `onRequestError` independem desse canal.

**Result**: PASS
