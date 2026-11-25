# Custos — IVC

Requisitos: **RNF-007** (custo fixo mensal ≈ R$ 0), **RC-001** (manutenção ≈ R$ 0,
evangelização sem custo para a igreja). Decisões: **AD-003/AD-007** e stack aprovada no
README. Valores de planos free sujeitos a mudança — revisar periodicamente.

## TCO mensal (fixo ≈ R$ 0)

| Serviço | Plano | Custo fixo | Uso |
| ------- | ----- | ---------- | --- |
| **Vercel** | Hobby | R$ 0 | Hosting Next.js 16; limite 10 deploys/dia |
| **Supabase** | Free | R$ 0 | PostgreSQL + Auth + Storage (limites de uso) |
| **GitHub Actions** | Free (público/IP) | R$ 0 | CI dual-gate (`tests` + `specs`) |
| **Sentry** | Free | R$ 0 | Observabilidade (RNF-008) |
| **Mercado Pago (PIX)** | — | **R$ 0 fixo** | Taxa **por transação** (variável; ver abaixo) |
| **Domínio** | — | R$ 0 (AGORA) | `*.vercel.app` (RC-003); próprio ≈ R$ 40–60/ano quando houver |

**Total fixo mensal ≈ R$ 0.** RC-001 atendido.

## Custos variáveis (por transação)

- **Mercado Pago — PIX:** taxa por transferência (≈ ~0,99% na tarifa padrão; conferir o
  plano vigente). Com ~20 doações/mês a valores pequenos (ex.: R$ 20), o custo mensal é
  irrisório (centavos) — **não quebra a RC-001**.
- **Cartão de crédito:** só em iteração futura (AD-009). Tarifas ~3-4% + antecipação —
  **evitar no MVP** para manter TCO ≈ 0.

## Limites do plano free (atenção)

| Serviço | Limite relevante |
| ------- | ---------------- |
| Vercel Hobby | 10 deployments/dia; sem licença de equipe |
| Supabase Free | 500 MB DB, 1 GB storage, projetos pausados após inatividade (90 dias) |
| Sentry Free | 5k eventos/mês (folga para ~20 doações/mês) |
| GitHub Actions | minutos gratuitos (repo público: ilimitado na prática) |

> **Mitigação de risco:** se o Supabase pausar o projeto por inatividade, reativar no
> painel (sem custo). Manter dados institucionais em `constants.ts` (AD-008) já minimiza
> dependência de DB no portal estático.

## Quando o custo sairia de zero

- **Mercado Pago + cartão** (AD-009 futuro): taxas por transação (variável).
- **Domínio próprio** (RC-003 futuro): ~R$ 40–60/ano.
- **Plano pago** de algum serviço: somente se volume/extensão justificar (indica nova ADR).

## Referências

- `docs/REQUIREMENTS.md` — RNF-007, RC-001
- `docs/DEPLOYMENT.md` — Vercel Hobby, envs, limites
- `docs/OBSERVABILITY.md` — Sentry (free no TCO)
- `.specs/STATE.md` — AD-003/007/009 (stack e decisões financeiras)