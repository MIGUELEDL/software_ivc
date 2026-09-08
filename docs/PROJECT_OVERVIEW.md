# Visão Geral do Projeto — IVC

## O que é

Plataforma digital institucional da **Igreja Virtude Cristã (IVC)**, Santa Luzia-PB:
um **portal público**, um **painel do membro** e um **painel administrativo** (RBAC),
entregues como produto único de baixo custo (AD-001).

## Contexto institucional

| Atributo | Valor |
| -------- | ----- |
| Templo | 1 (topologia evoluível, RN-005) |
| Cidade | Santa Luzia - PB |
| Membros | ~30–50 |
| Pastor presidente | Pastor Ernandes Nogueira de Lucena |
| Endereço | Rua Quiezinho Fernandes, 213 — Nossa Senhora de Fátima |
| E-mail | ivcvirtudecrista@gmail.com |
| YouTube | @IgrejaVirtudeCrista |
| Instagram | /igrejavirtudecrista |
| WhatsApp | em aberto (D4) — placeholder em `src/lib/constants.ts` |
| Cultos | Ter 19:30 (Oração e Ensino) · Qui 19:30 (Evangelismo) · Dom 19:00 (Culto) |

Fonte única desses dados em código: `src/lib/constants.ts` (AD-008).

## Objetivos

1. Dar presença institucional fidedigna à igreja no mundo digital (portal público).
2. Registrar e manter o cadastro dos membros (dados pessoais, foto 4x4, aniversário)
   como base para futuros cartões de membro (AD-009/revisão do administrador).
3. Facilitar a doação via **QR PIX** (público) e o acompanhamento da vida da igreja
   (eventos, avisos, dízimo).
4. Dar à liderança um painel administrativo seguro (RBAC) para operar membros,
   eventos, patrimônio, financeiro e relatórios — sem depender de um único operador
   (R-001: continuidade via RBAC + auditoria).

## Públicos

- **Visitante** — navega no portal público e pode doar por QR PIX.
- **Membro** — acessa o painel do membro (login e-mail + senha-ID; avisos; QR de
  dízimo; cartão de membro; edição dos próprios dados/foto).
- **Liderança** — operacionaliza o painel administrativo conforme o papel (RBAC).

## Stack (AD-003, AD-004, AD-006, AD-007)

Next.js 16 (App Router, TypeScript) · Tailwind CSS v4 · Supabase (PostgreSQL + Auth +
Storage) · Drizzle ORM · Auth.js (NextAuth) · Resend · Vercel Hobby · GitHub Actions ·
Sentry (free) · Mercado Pago (webhook PIX — MVP é PIX apenas, AD-009).

## Critérios transversais (requisitos aprovados)

- Responsiva mobile-first: Lighthouse ≥ 90 (RNF-001).
- Acessibilidade: WCAG 2.1 AA (RNF-012).
- Custo fixo mensal ≈ R$ 0 (RNF-007, RC-001).
- Domínio inicial `*.vercel.app` (RC-003).
- Conformidade LGPD (RNF-005) e continuidade operacional (R-001).

## Referências

- Requisitos: [`REQUIREMENTS.md`](REQUIREMENTS.md)
- Decisões (AD-NNN): `.specs/STATE.md`
- Documento por área: [`README.md`](README.md) (índice)