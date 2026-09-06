# Igreja Virtude Cristã (IVC) — Portal e Sistema

Plataforma digital da Igreja Virtude Cristã (Santa Luzia-PB): portal público, painel do
membro e painel administrativo (RBAC). Desenvolvimento dirigido por especificação
(spec-driven) — ver "Workflow" abaixo.

## Visão geral

- **1 templo** · Santa Luzia-PB · ~30–50 membros · Pastor Ernandes Nogueira de Lucena
- e-mail ivcvirtudecrista@gmail.com · YouTube @IgrejaVirtudeCrista · Instagram /igrejavirtudecrista
- Cultos: Ter 19:30 (Oração e Ensino) · Qui 19:30 (Evangelismo) · Dom 19:00 (Culto)

## Stack (aprovada)

Next.js 16 (App Router, TS) · Tailwind CSS v4 · Supabase (PostgreSQL + Auth + Storage) ·
Drizzle ORM · Auth.js · Resend · Vercel Hobby · GitHub Actions · Sentry (free) · Mercado Pago
(TCO ~R$0 fixo/mês).

## Documentação (leia antes de codificar)

| Onde | O quê |
| ---- | ----- |
| `AGENTS.md` | Regras de agente: Next.js 16 (breaking changes) + **workflow spec-driven obrigatório** + ambiente Node |
| `.specs/STATE.md` | Decisões (AD-NNN) + **Handoff** (snapshot de retomada de sessão) |
| `.specs/features/*/` | Specs por feature (EARS), design, tasks, validação |
| `docs/` | Índice, roadmap e matriz de cobertura (ver `docs/README.md`) |
| `.opencode/` | Skill `tlc-spec-driven` + sub-agentes (verificador/worker) |

## Ambiente

- Node 22 LTS via nvm (`.nvmrc`). Fora do PATH por padrão:
  `export PATH="$HOME/.nvm/versions/node/v$(cat .nvmrc).0/bin:$PATH"`
- Gates locais: `npm run lint`, `npm run typecheck`, `npm run build`
- CI dupla em `.github/workflows/ci.yml` (código + validação estrutural das specs)
- Commits: Conventional Commits, atômicos, enforced por `.githooks/commit-msg`

## Getting Started

```bash
npm run dev
```

Abra http://localhost:3000. Edite em `src/app/` (rotas) e `src/components/`.

## Roadmap

Fases 0–7 concluídas; **Fase 8 (Fundação) em andamento**; Fase 9 = MVP. Detalhes:
`docs/ROADMAP.md`.