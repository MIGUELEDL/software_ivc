# deploy-producao — Relatório do Verifier

## Validation: deploy-producao - PASS

**Spec-anchored check**: 15/15 ACs (DEP-01..15) matched spec outcome (12 machine-verified, 3 human/author-confirmed: DEP-02 CI verde, release Sentry no dashboard, pageviews) | 0 spec-precision gaps

**Gate**: `smoke-prod.sh` full → **9 ok / 0 falhas** (com creds, autor) e 8 ok / 0 (sem creds, verifier); `test:ci` 243/0; CI GitHub verde (operador).

**Sensor** (worktree isolado, descartado): **4 injetados, 4 mortos, 0 sobreviventes**. Real tree intacta (baseline `M tsconfig.tsbuildinfo`).

**Diff range**: `d424fba..HEAD` (T1 `2c7d91b`, fix `b025d65`, landing `d435cb4`, CI `7ffbc9a`/`4fb6a15`, status `df74970`, fallback `4f4a02f`, email `0333087`, smoke-fix `558b62b`, T6 `2603bff`, T7 `147db9b`; fora do escopo: `84a1b5b`, `7784c63`, `91dd73a`).

**Evidence (file:line)** — por AC:

- DEP-01 — `git rev-list --count origin/main..HEAD` == 0; cadeia linear, sem force-push.
- DEP-02 — CI verde na HEAD, confirmação do operador (repo privado, sem acesso via API).
- DEP-03 — sem reescrita de história (só fast-forwards `..HEAD`).
- DEP-04 — Supabase prod `[REDACTED_PROJECT_REF]`: 14 tabelas RLS-on, `can_access()`, trigger `members_validade_cartao`, permissions=48, settings=18, buckets fotos-membros/fotos-lideranca/documentos; seeds de teste puladas (`0002,0004,0007,0009,0010,0018`) + 2 adaptações documentadas (sequence `0021` em banco vazio, seed `0005` inicia em IVC-0001).
- DEP-05 — members/events/transactions/assets/cash_closes = 0, zero `*.teste`, `auth.users` = 1; âncoras reais: churches = 1, leaders = 1; portal com empty state.
- DEP-06 — `admin@example.com`: `role=SUPER_ADMIN`, `force_password_change=true`, confirmado.
- DEP-07 — tier estática verde; chave só em `trocar-senha/route.ts:45` e `supabase/admin.ts:14` (server); zero client/NEXT_PUBLIC.
- DEP-08 — `[REDACTED_DEPLOYMENT_URL]` live (projeto duplicado `6b6f` excluído).
- DEP-09 — 5 envs exatas no dashboard (comportamento prova presença); zero segredo no repo.
- DEP-10 — `/api/health` 200 `{"status":"ok","release":"<sha-40hex>"}` == `origin/main` (tier flagrou defasagem real mid-session e o auto-deploy alcançou).
- DEP-11 — login admin → redirect `/admin` (alvo assertado, L-007); `eventos:[]` autenticado; release Sentry no dashboard (operador).
- DEP-12 — `layout.tsx:3,39` + dep `package.json`; marcador `Analytics"]` no HTML prod; pageviews no dashboard (operador).
- DEP-13 — zero `.track(` em `src`.
- DEP-14 — `DEPLOYMENT.md` sem Auth.js/Resend, tabela exata de envs, 2 projetos, URLs reais.
- DEP-15 — rollback via Redeploy + re-fumaça documentados.

**Sensor detail**:

| # | Mutação | Morto? |
| - | ------- | ------ |
| 1 | `<Analytics />` removido do layout scratch | ✅ tier DEP-12 falha |
| 2 | `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` em `"use client"` | ✅ tier DEP-07 falha |
| 3 | `.track("donation_pii")` em src | ✅ tier DEP-13 falha |
| 4 | Comparação `EXPECT_SHA` invertida | ✅ resultado inverte no prod live |

**Notas operacionais (fora do código, registradas)**: env Vercel exige Redeploy para valer; e-mail do commit precisa ser verificado no GitHub (bloqueio `558b62b`, resolvido com `0333087`); Preview tem Deployment Protection (SSO) — produção é pública; projeto duplicado excluído.

**Result**: PASS
