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
| **8** | **Fundação (em andamento)** | 🟡 kit SDD + piloto confirmados; docs e CI nesta fase |
| 9 | MVP | ⏳ próxima |
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
- `.specs/STATE.md` com ADR-001..008 e Handoff
- **Piloto**: feature `sobre-dados-institucionais` — spec → gate → validação PASS (9/9 ACs)
- CI dual-gate, git hook `commit-msg` (Conventional Commits), matriz de cobertura, docs índice

**Pendente (a partir daqui):**
- Docs detalhadas (PROJECT_OVERVIEW, ARCHITECTURE, DATABASE, SECURITY/LGPD, API, TESTING, OBSERVABILITY, DEPLOYMENT, COSTS) a partir dos ADRs e do conhecimento consolidado
- **Revisão do `docs/REQUIREMENTS.md` pelo administrador** (itens 🆕 → ✅) antes da Fase 9
- Registrar o restante de ADRs pendentes (WhatsApp D4, MVV final, domínio)

## Fase 9 — MVP (visão)

FRENTES do MVP: portal público multirrota (Sobre/História/MV, Liderança, Localização, Cultos, Redes, Eventos→WhatsApp, Doação QR PIX), portal do membro (login+ID, avisos, QR dízimo, cartão de membro, perfil/foto 4x4), painel administrativo (dashboard, membros, igrejas/liderança, eventos, patrimônio, financeiro PIX+cartão/webhook, relatórios, RBAC, configurações, auditoria). Escopo priorizado quando a Fase 8 encerrar.

## Decisões & pendências transversais

- Número de WhatsApp da igreja (**D4**) — em aberto (placeholder em `constants.ts`)
- Conta Mercado Pago (CNPJ) — usuário cria e informa **antes** da Fase 9
- Domínio próprio — manter `*.vercel.app` por enquanto