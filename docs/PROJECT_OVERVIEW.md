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
| Fundação | 07/09/2025 (primeiro culto) |
| CNPJ | 68.683.917/0001-71 |
| Endereço | Rua Quiezinho Fernandes, 213 — Nossa Senhora de Fátima |
| E-mail | ivcvirtudecrista@gmail.com |
| YouTube | @IgrejaVirtudeCrista |
| Instagram | /igrejavirtudecrista |
| WhatsApp | (83) 99945-0781 (D4 resolvido, ADR-010) |
| Cultos | Ter 19:30 (Oração e Ensino) · Qui 19:30 (Evangelismo) · Dom 19:00 (Culto) |

Fonte única desses dados em código: `src/lib/constants.ts` (AD-008).

## Objetivos

1. Dar presença institucional fidedigna à igreja no mundo digital (portal público).
2. Registrar e manter o cadastro dos membros (dados pessoais, foto 4x4, aniversário)
   como base para o cartão de membro com código de barras e validade anual.
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

## Stack (AD-003, AD-006, AD-007, AD-013, AD-014)

Next.js 16 (App Router, TypeScript) · Tailwind CSS v4 · Supabase (PostgreSQL + Auth +
Storage, com RLS) · migrações SQL versionadas · Vercel Hobby · GitHub Actions ·
Sentry (errors-only) · Mercado Pago (webhook PIX — MVP é PIX apenas, AD-009) ·
Vitest 5 e Stryker para testes.

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