# Docs — Igreja Virtude Cristã (IVC)

Índice da documentação do projeto. A fonte de verdade operacional das features é o
processo **Spec-Driven** em `.specs/` (ver abaixo); as docs em `docs/` consolidam o
contexto transversal (arquitetura, segurança, custos, roadmap).

## Índice

| Documento | Conteúdo |
| --------- | -------- |
| [ROADMAP.md](ROADMAP.md) | Fases 0–15 e status atual |
| [coverage-matrix.md](coverage-matrix.md) | Matriz RF/RNF → spec → teste → status (rastreabilidade) |
| [REQUIREMENTS.md](REQUIREMENTS.md) | Requisitos RF/RNF/RN/RC/QA/R — **fonte de verdade** (aprovado pelo administrador) |
| [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) | Visão geral, contexto e contatos institucionais |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Decisões de arquitetura (monólito modular Next.js 16) |
| [DATABASE.md](DATABASE.md) | Modelo de dados (Supabase/PostgreSQL, Drizzle) |
| [SECURITY.md](SECURITY.md) | Segurança, autenticação, RBAC e auditoria |
| [LGPD.md](LGPD.md) | Adequação à LGPD (consentimentos, DPIA, direitos do titular) |
| [API.md](API.md) | Rotas e contratos de integração (F3) |
| [TESTING.md](TESTING.md) | Estratégia de verificação por fase (F10: framework) |
| [OBSERVABILITY.md](OBSERVABILITY.md) | Sentry free + logs + métricas (F11) |
| [DEPLOYMENT.md](DEPLOYMENT.md) | CI dual-gate + Vercel Hobby (RC-003) |
| [COSTS.md](COSTS.md) | TCO ≈ R$ 0 fixo/mês (RNF-007, RC-001) |

> **Nota de formato**: o conteúdo de comportamento segue o formato **OpenSpec** como
> referência (especificar WHAT testável, não a solução), e vive em `.specs/features/*`
> (ver decisão AD-007 no `.specs/STATE.md`). As docs acima são o papel ortogonal a ele.

## Fonte de verdade operacional — `.specs/`

- `.specs/STATE.md` — decisões (AD-NNN) + Handoff (snapshot de retomada)
- `.specs/features/<feature>/` — `spec.md`, `design.md`, `tasks.md`, `validation.md`
- Processo e gates determinísticos: skill `tlc-spec-driven` em `.opencode/skills/`

## Ambiente

- Node.js 22 LTS via `nvm` (ver `.nvmrc`); gates locais: `npm run lint`, `npm run typecheck`, `npm run build`
- CI dupla: `.github/workflows/ci.yml` (gates de código + validação estrutural das specs)