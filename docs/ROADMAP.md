# Roadmap — Igreja Virtude Cristã (IVC)

Roadmap em fases dirigido por especificação (processo `tlc-spec-driven`, ver `.specs/STATE.md`).

## Status global

| Fase | Etapa | Status |
| ---- | ----- | ------ |
| 0 | Discovery | ✅ concluída |
| 1 | Requisitos (RF-001..044, RNF-001..012, RN, RC, QA, R) | ✅ concluída (checkpoints registrados) |
| 2 | UX / Fluxos | ✅ concluída |
| 3 | Arquitetura | ✅ concluída |
| 4 | Modelagem de dados | ✅ concluída |
| 5 | Segurança / LGPD | ✅ concluída |
| 6 | Stack | ✅ concluída |
| 7 | Infra / Custos | ✅ concluída |
| **8** | **Fundação (concluída)** | ✅ kit SDD + piloto + requisitos aprovados + docs detalhadas;
| 9 | MVP | 🟡 próxima (frentes do MVP: ver abaixo) |
| 10 | Testes (framework entra aqui) | ⏳ |
| 11 | Observabilidade (Sentry free) | ⏳ |
| 12 | Deploy (Vercel Hobby) | ⏳ |
| 13 | Hardening | ⏳ |
| 14 | Produção (liderança 1 templo) | ⏳ |
| 15 | Evolução | ⏳ |

## Fase 8 — Fundação

**Entregue:**
- Kit Spec-Driven `tlc-spec-driven` v3.3.0 instalado (`.opencode/skills/`)
- Sub-agentes `tlc-verifier` (read-only) e `tlc-worker` (`.opencode/agent/`)
- Node 22 LTS via `nvm` (`.nvmrc`), script `typecheck`, deps instaladas
- `.specs/STATE.md` com ADR-001..009 e Handoff
- **Piloto**: feature `sobre-dados-institucionais` — spec → gate → validação PASS (9/9 ACs)
- CI dual-gate, git hook `commit-msg` (Conventional Commits), matriz de cobertura, docs índice
- **Revisão do `docs/REQUIREMENTS.md` aprovada** (RF-016 removido; RF-032/RNF-001/RNF-012/RC-003/R-001 ✅)
- **Docs detalhadas** escritas: PROJECT_OVERVIEW, ARCHITECTURE, DATABASE, SECURITY, LGPD, API, TESTING, OBSERVABILITY, DEPLOYMENT, COSTS

**Próximo (Fase 9 — MVP):**
- Registrar ADRs pendentes (WhatsApp D4, MVV final)
- **Blocker:** CNPJ/credenciais Mercado Pago antes do financeiro da F9 (AD-009: MVP é PIX apenas)
- Spec das features do MVP (portal, painel membro, painel admin) com escopo priorizado

## Fase 9 — MVP (visão)

FRENTES do MVP: portal público multirrota (Sobre/História/MV, Liderança, Localização, Cultos, Redes, Eventos→WhatsApp, Doação QR PIX), portal do membro (login+ID, avisos, QR dízimo, cartão de membro, perfil/foto 4x4), painel administrativo (dashboard, membros, igrejas/liderança, eventos, patrimônio, financeiro PIX+cartão/webhook, relatórios, RBAC, configurações, auditoria). Escopo priorizado quando a Fase 8 encerrar.

## Decisões & pendências transversais

- Número de WhatsApp da igreja (**D4**) — ✅ resolvido: (83) 99945-0781 (ADR-010)
- Conta Mercado Pago — CNPJ 68.683.917/0001-71 informado (ADR-011); **credenciais MP a cadastrar** antes do financeiro da Fase 9
- Seed demo — migration `0018_seed_ficticio_demo.sql` (membros fictícios p/ demonstração, sem DELETE; preserva dados de teste antigos) aplicada em dev e commitada (2026-09-22)
- Missão/Visão/Valores (MVV) — ✅ aprovado (textos atuais em `constants.ts`)
- Domínio próprio — decidido: manter `*.vercel.app` enquanto isso (RC-003); próprio quando houver