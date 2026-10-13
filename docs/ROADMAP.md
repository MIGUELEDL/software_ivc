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
| 9 | MVP | ✅ concluída em 2026-10-10 — todas as frentes verificadas (ver `docs/coverage-matrix.md`, linhas ✅ verified)
| 10 | Testes (framework entra aqui) | ✅ concluída (F10: Vitest 5 + Stryker `break:100`, feature `framework-testes` verified) |
| 11 | Observabilidade (Sentry free) | ✅ concluída em 2026-10-12 — Sentry errors-only + health + logger + runbook (ver `docs/OBSERVABILITY.md` e `docs/coverage-matrix.md`, linha ✅ verified) |
| 12 | Deploy (Vercel Hobby) | ✅ concluída em 2026-10-13 — push total + CI verde, Supabase prod isolado, `[REDACTED_DEPLOYMENT_URL]` no ar com fumaça 9/9 (ver `docs/coverage-matrix.md`, linha ✅ verified) |
| 13 | Hardening | 🟡 próxima |
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
- ADRs de produto registrados (WhatsApp D4 = ADR-010; CNPJ MP = ADR-011; MVV aprovado nos textos do `constants.ts`)
- **Blocker:** CNPJ/credenciais Mercado Pago antes do financeiro da F9 (AD-009: MVP é PIX apenas)
- Spec das features do MVP (portal, painel membro, painel admin) com escopo priorizado

## Fase 9 — MVP (visão)

FRENTES do MVP: portal público multirrota (Sobre/História/MV, Liderança, Localização, Cultos, Redes, Eventos→WhatsApp, Doação QR PIX), portal do membro (login+ID, avisos, QR dízimo, cartão de membro, perfil/foto 4x4), painel administrativo (dashboard, membros, igrejas/liderança, eventos, patrimônio, financeiro PIX+cartão/webhook, relatórios, RBAC, configurações, auditoria). Escopo priorizado quando a Fase 8 encerrar.

## Fase 9 — MVP (concluída)

**Concluída em 2026-10-10.** Todas as frentes do MVP foram especificadas, implementadas e **verificadas** (23 features ✅ verified em `docs/coverage-matrix.md`, incluindo `auth`, `painel-membro`, portal, `admin-*`, `barcode-membro`, `admin-auditoria` e `cartao-valididade-anual`; `landing-visual-hero` cancelada por decisão do usuário — AD-028). Handoffs e decisões em `.specs/STATE.md` (AD-001..029).

## Fase 10 — Testes (concluída)

**Concluída em 2026-10-10.** Framework de testes automatizados (QA-001): **Vitest 5** cobrindo o domínio puro (`code128`/`validade`/`cartao`/`documento`/`pix`, 220 testes) com runner no CI (`npm run test:ci` no job `tests`) + **PIT contínuo via StrykerJS** (`break:100`, 100.00% / 0 sobreviventes no subset migrado). Probes bash permanecem no CI (AD-031). Feature `framework-testes` ✅ verified; decisões AD-030/031/032 e handoff em `.specs/STATE.md`.

**Próxima (Fase 11 — Observabilidade):** ver `OBSERVABILITY.md`.

## Fase 11 — Observabilidade (concluída)

**Concluída em 2026-10-12.** Sentry free errors-only (`[REDACTED_PROJECT_NAME]`, NOOP sem DSN) nos 3 runtimes + boundary `global-error` + lib `src/lib/observability/` (release/logger anti-PII/reportError) + `GET /api/health` público e raso + webhook MP no logger + runbook com passo de alerta no dashboard. Feature `observabilidade` ✅ verified (OBS-01..13, Verifier R2 PASS 13/13, sensor 2/2); decisões AD-033 e handoff em `.specs/STATE.md`. Pendentes do operador: regra de alerta no dashboard + e-mail da liderança; Analytics entra na F12.

**Próxima (Fase 12 — Deploy):** concluída (ver acima).

## Fase 12 — Deploy (concluída)

**Concluída em 2026-10-13.** Push total com história preservada + CI verde; Supabase novo `[REDACTED_PROJECT_REF]` (migrations seletivas, zero demo/teste, seed SUPER_ADMIN real); Vercel `software-ivc` em produção com 5 envs, health com SHA real, logins funcionando; Analytics ativo; docs fiéis. Feature `deploy-producao` ✅ verified (DEP-01..15, Verifier PASS 15/15, sensor 4/4); handoff em `.specs/STATE.md`.

**Próxima (Fase 13 — Hardening).**

## Decisões & pendências transversais

- Número de WhatsApp da igreja (**D4**) — ✅ resolvido: (83) 99945-0781 (ADR-010)
- Conta Mercado Pago — CNPJ 68.683.917/0001-71 informado (ADR-011); **credenciais MP a cadastrar** antes do financeiro da Fase 9
- Seed demo — migration `0018_seed_ficticio_demo.sql` (membros fictícios p/ demonstração, sem DELETE; preserva dados de teste antigos) aplicada em dev e commitada (2026-09-22)
- Missão/Visão/Valores (MVV) — ✅ aprovado (textos atuais em `constants.ts`)
- Domínio próprio — decidido: manter `*.vercel.app` enquanto isso (RC-003); próprio quando houver