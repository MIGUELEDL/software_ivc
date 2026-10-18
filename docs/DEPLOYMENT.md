# Deploy — IVC

Requisitos: **RNF-009** (CI dual-gate verde no main), **RNF-010** (deploy automático
Vercel após merge, **com aprovação explícita**), **RC-003** (domínio `*.vercel.app`
inicial). Decisão: **AD-007**.

## Pipeline (CI dual-gate)

`.github/workflows/ci.yml` roda em push para `main` e em PR:

| Job | Passos | Gate |
| --- | ------ | ---- |
| `tests` | `npm ci` → `npm run lint` → `npm run typecheck` → `npm run build` | Código saudável |
| `specs` | Para cada `.specs/features/*` com `spec.md`: `validate_spec.py`; com `validation.md`: `validate_state.py` | Estrutura/declaração de prontos |

Regras:
- `main` permanece verde (RNF-009); merge só com os dois jobs verdes.
- **Blast radius (AD-007):** deploy para produção **nunca** é automático por
  conveniência — exige **aprovação explícita** do operador (RNF-010). Préviews de PR
  no Vercel são permitidos sem aprovação.

## Deploy — Vercel (Hobby)

| Item | Configuração |
| ---- | ------------ |
| Framework preset | Next.js 16 (build: `next build`) |
| Domínio inicial | `*.vercel.app` (RC-003) — próprio quando houver recurso/CNPJ/domínio |
| Environments | Preview (PR) e Production (main) |
| Limite Hobby | **10 deployments/dia máx.** — coordenar merges |
| Variáveis de ambiente | Configuradas no dashboard Vercel (nunca no repo) |
| Rollback | Re-deploy de commit anterior no painel Vercel (Observabilidade: runbook em `OBSERVABILITY.md`) |

## Variáveis de ambiente (Vercel → Production)

| Nome | Origem | Tipo Vercel |
| ---- | ------ | ----------- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase [REDACTED_PROJECT_NAME]-**prod** → Settings → API | Configuração |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Idem (chave anon; o código também aceita `NEXT_PUBLIC_SUPABASE_ANON_KEY`) | Configuração |
| `SUPABASE_SERVICE_ROLE_KEY` | Idem (service_role) | **Segredo** |
| `SENTRY_DSN` | Sentry [REDACTED_PROJECT_NAME] | **Segredo** |
| `NEXT_PUBLIC_SENTRY_DSN` | Mesmo DSN (ingest pública por desenho) | Configuração |

> Regras: nenhuma no `git` (`docs/SECURITY.md`); env criada depois do build só vale após **Redeploy**; Preview fica sem envs de prod (não apontar teste a dado real).

## Projetos (2026-10-13)

- **Supabase dev**: `[REDACTED_PROJECT_REF]` (testes, seeds, probes locais).
- **Supabase prod**: `[REDACTED_PROJECT_REF]` (schema via migrations seletivas — sem seeds de teste; textos de `settings` alinhados aos atuais).
- **Vercel**: `software-ivc` → `[REDACTED_DEPLOYMENT_URL]` (Hobby). Projeto duplicado `[REDACTED_PROJECT_NAME]` excluído.
- **Sentry**: `[REDACTED_PROJECT_NAME]` (mesmo DSN dev/prod; `release` distingue).

## Ambientes e promosão

1. **Desenvolvimento:** `npm run dev` local (Node 22 via nvm, AD-006) contra o Supabase dev.
2. **Preview:** cada PR gera deploy preview (protegido por login Vercel); sem envs de prod.
3. **Production:** push em `main` dispara build; com CI verde, o deploy promove sozinho (a conexão do repo é a aprovação contínua, RNF-010). URL: `[REDACTED_DEPLOYMENT_URL]`.
4. **Pós-env:** qualquer env criada/alterada exige **Redeploy** (rebuild limpo) para valer.
5. **Rollback:** Deployments → deploy anterior → ⋯ → **Redeploy** (promove o código antigo na hora); fumaça com `bash scripts/smoke-prod.sh <url>`.

## Auth — URLs de redirect (manual, dashboard Supabase)

O fluxo de troca de senha por e-mail (`/alterar-senha` → link →
`/atualizar-senha`) depende de o Supabase Auth aceitar o `redirectTo`.
Configurar em **Supabase Dashboard → Authentication → URL Configuration**:

| Campo | Valores |
| ----- | ------- |
| Site URL | `https://[REDACTED_DOMAIN]/` |
| Redirect URLs | `https://[REDACTED_DOMAIN]/**`, `[REDACTED_DEPLOYMENT_URL]**`, `http://localhost:3000/**` |

Sem isso o link do e-mail cai em erro (`redirect_url_not_allowed`) e o fluxo
SEN-01..03 não completa. Após alterar, testar de ponta a ponta em prod:
pedir link em `/alterar-senha` e abrir o e-mail.

## Backup e recuperação

- **RNF-005/RNF-006:** backups via Supabase (banco) + git (código). RPO ≤ 24h / RTO ≤ 4h.
- Procedimento de restauração documentado no painel Supabase (PITR) — detalhes na Fase 12/13
  (hardening) conforme roadmap.

## Referências

- `.specs/STATE.md` (AD-007) — decisão CI/deploy
- `docs/ROADMAP.md` — fases 9–14 (MVP → produção)
- `docs/SECURITY.md` — segredos e env
- `docs/COSTS.md` — Vercel Hobby no TCO