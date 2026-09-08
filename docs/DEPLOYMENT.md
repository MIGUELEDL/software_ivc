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

## Variáveis de ambiente (Vercel)

- `DATABASE_URL` / keys Supabase (service-role apenas server-side; anon para client)
- Auth.js secrets (`NEXTAUTH_SECRET`, session secret)
- `RESEND_API_KEY`
- `MERCADOPAGO_*` (access token, webhook secret) — **Fase 9**, quando credenciais existirem
- `SENTRY_DSN` — quando Sentry for ativado (F11)
- `NEXT_PUBLIC_*` somente para valores não sensíveis (ex.: APP_URL)

> Todas listadas como **segredos** (`docs/SECURITY.md`); nenhuma no `git`.

## Ambientes e promosão

1. **Desenvolvimento:** `npm run dev` local (Node 22 via nvm, AD-006).
2. **Preview:** cada PR gera deploy preview no Vercel — validação visual/UAT.
3. **Production:** merge em `main` (CI verde) → deploy aprovado explicitamente pelo
   operador → produção em `*.vercel.app`.

## Backup e recuperação

- **RNF-005/RNF-006:** backups via Supabase (banco) + git (código). RPO ≤ 24h / RTO ≤ 4h.
- Procedimento de restauração documentado no painel Supabase (PITR) — detalhes na Fase 12/13
  (hardening) conforme roadmap.

## Referências

- `.specs/STATE.md` (AD-007) — decisão CI/deploy
- `docs/ROADMAP.md` — fases 9–14 (MVP → produção)
- `docs/SECURITY.md` — segredos e env
- `docs/COSTS.md` — Vercel Hobby no TCO