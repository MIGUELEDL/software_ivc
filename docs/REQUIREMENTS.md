# Requisitos — Igreja Virtude Cristã (IVC)

**Status:** 🟡 PROPOSTA em consolidação (revisão do administrador do projeto)

Este documento é a **fonte de verdade de requisitos** do projeto. Ele consolida o
material produzido nas fases F0–F7 (histórico de sessões) com o que está registrado nas
decisões (`.specs/STATE.md`, ADR-001..008) e no piloto `sobre-dados-institucionais`.

## Como ler

Cada requisito possui um **ID estável** (`RF-NNN` / `RNF-NNN` / `RN-…`) usado na matriz de
cobertura (`docs/coverage-matrix.md`) e nas specs de features (coluna "Requisito(s)").
`SPEC-*` identifica o documento de especificação (`.specs/features/<feature>/spec.md`)
que implementa o requisito.

| Status | Significado |
| ------ | ----------- |
| ✅ **Confirmado** | Já decidido (ADR) ou verificado no piloto — não deve mudar sem nova decisão (AD-NNN) |
| 🆕 **Proposta** | Sugerido nesta consolidação — aguarda sua revisão/edição |

> Regra: nada é **Definitivo** sem a sua aprovação desta lista. Itens 🆕 aprovados passam a ✅.

---

## 1. Requisitos Funcionais (RF)

### A. Portal público

| ID | Requisito | Status |
| -- | --------- | ------ |
| RF-001 | Página institucional "Sobre" com dados fidedignos (cidade, líder, contatos, endereço, cultos) | ✅ |
| RF-002 | Agenda/eventos públicos (cultos semanais fixos + eventos avulsos) | ✅ |
| RF-003 | Doação pública por **PIX/QR** (sem cartão) | ✅ |
| RF-004 | Contato: redes sociais (YouTube, Instagram) + e-mail oficial | ✅ |
| RF-005 | Programações/blog públicos | 🆕 |
| RF-006 | Número de WhatsApp da igreja visível no portal | 🟡 pendente (decisão D4) |

### B. Portal do membro („minha conta")

| ID | Requisito | Status |
| -- | --------- | ------ |
| RF-011 | Login com e-mail + senha-ID temporária | ✅ |
| RF-012 | Troca obrigatória da senha no primeiro acesso | ✅ |
| RF-013 | Perfil do membro (dados + foto) | ✅ |
| RF-014 | Histórico de doações e ofertas do próprio membro | ✅ |
| RF-015 | Recuperação de senha | 🆕 |

### C. Painel administrativo

| ID | Requisito | Status |
| -- | --------- | ------ |
| RF-021 | Gestão de conteúdo do portal (Sobre, agenda, programações) | ✅ |
| RF-022 | Gestão de membros (cadastro, vínculos, cargos) | ✅ |
| RF-023 | Gestão financeira (doações recebidas, ofertas) | ✅ |
| RF-024 | Gestão de eventos | ✅ |

### D. Controle de acesso (RBAC)

| ID | Requisito | Status |
| -- | --------- | ------ |
| RF-031 | Papéis: MEMBRO, SECRETARIA, LIDER, FINANCEIRO, PATRIMONIAL, ADMIN, SUPER_ADMIN | ✅ |
| RF-032 | Permissões por papel (ler/escrever/administrar por módulo) | 🆕 (detalhar matriz) |

### E. Operação e conformidade

| ID | Requisito | Status |
| -- | --------- | ------ |
| RF-041 | Backup automatizado dos dados (ver RNF-009) | ✅ |
| RF-042 | Registro de auditoria de ações administrativas sensíveis | 🆕 |

---

## 2. Requisitos Não-Funcionais (RNF)

| ID | Requisito | Valor-alvo | Status |
| -- | --------- | ---------- | ------ |
| RNF-001 | Plataforma web responsiva (mobile-first) | Lighthouse ≥ 90 | 🆕 |
| RNF-002 | Identidade visual IVC | Design system definido | ✅ |
| RNF-003 | Disponibilidade | ≥ 99% (Vercel Hobby) | ✅ |
| RNF-004 | Segurança de autenticação | Auth.js + cookies seguros | ✅ |
| RNF-005 | LGPD | Política de privacidade + consentimentos + DPIA | ✅ |
| RNF-006 | Backup | RPO ≤ 24h / RTO ≤ 4h | ✅ |
| RNF-007 | Custo fixo mensal | ≈ R$ 0 (Vercel Hobby + Supabase free) | ✅ |
| RNF-008 | Observabilidade | Sentry (plano free) | ✅ |
| RNF-009 | Integração contínua | GitHub Actions dual-gate verde no `main` | ✅ |
| RNF-010 | Deploy | Automático p/ Vercel após merge (com aprovação explícita) | ✅ |
| RNF-011 | Conteúdo institucional fidedigno em fonte única | `src/lib/constants.ts` | ✅ |
| RNF-012 | Acessibilidade | WCAG 2.1 AA (público-alvo 30–50 membros, 1 templo) | 🆕 |

---

## 3. Regras de Negócio (RN)

| ID | Regra | Status |
| -- | ----- | ------ |
| RN-001 | Doação pública é exclusivamente via PIX/QR (sem cartão/transferências manuais) | ✅ |
| RN-002 | Senha-ID temporária expira após o primeiro acesso | ✅ |
| RN-003 | Um membro pertence a um templo (topologia: 1 templo hoje, evoluível) | ✅ |
| RN-004 | Toda ação financeira gera registro imutável rastreável | 🆕 |

---

## 4. Restrições (RC), Qualidade (QA), Riscos (R)

### RC
| ID | Restrição | Status |
| -- | --------- | ------ |
| RC-001 | Taxa de manutenção mensal ≈ R$ 0 (evangelização sem custo para a igreja) | ✅ |
| RC-002 | Conta Mercado Pago exige CNPJ — criada pelo administrador antes da Fase 9 | ✅ |
| RC-003 | Provável domínio `*.vercel.app` inicial (domínio próprio somente se houver) | 🆕 |

### QA
| ID | Instrumento | Status |
| -- | ----------- | ------ |
| QA-001 | Framework de testes automatizados | entra na Fase 10 |
| QA-002 | Verificação por feature: probes por AC + gates (`lint`/`typecheck`/`build`) + verifier | ✅ |
| QA-003 | Testes de aceitação UAT com o administrador | Fase 9 |

### R
| ID | Risco | Mitigação | Status |
| -- | ----- | --------- | ------ |
| R-001 | Dependência de apenas 1 pessoa para conteúdo/operação | Docs + RBAC + auditoria | 🆕 |
| R-002 | WhatsApp/D4 em aberto | Placeholder `"#"` no código até decisão | ✅ registrado |
| R-003 | CNPJ/Mercado Pago pendentes | Bloqueiam Fase 9 (financeiro) | ✅ registrado |

---

## 5. Pendências abertas para decisão (não são requisitos)

| # | Pendência | Status |
| -- | --------- | ------ |
| D4 | Número de WhatsApp oficial da igreja | 🔴 em aberto |
| — | Número do CNPJ + credenciais Mercado Pago | 🔴 em aberto (necessário p/ F9) |
| — | Missão/Visão/Valores finais (MVV) | 🔴 em aberto |
| — | Domínio próprio vs `*.vercel.app` | 🔴 em aberto (RC-003) |

---

## Regras de manutenção deste documento

1. Toda alteração de requisito = nova revisão com aprovação (nível de decisão AD-NNN quando estrutural).
2. Ao criar uma feature, referenciar os IDs aqui na spec (`.specs/features/<feature>/spec.md`);
3. Ao verificar uma feature, marcar o requisito como **Coberto** na `coverage-matrix.md` (sem editá-lo aqui).
4. `🆕` só vira `✅` mediante aprovação explícita nesta revisão.