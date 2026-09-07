# Requisitos — Igreja Virtude Cristã (IVC)

**Status:** 🟡 PROPOSTA em consolidação (revisão do administrador do projeto)

Este documento é a **fonte de verdade de requisitos** do projeto. Sua base estrutural é a
**árvore de navegação fornecida pelo administrador** (único artefato salvo das fases
F0–F7), replicada integralmente abaixo, complementada pelas decisões registradas
(`.specs/STATE.md`, ADR-001..008) e pelo piloto `sobre-dados-institucionais`.

## Estrutura de referência (árvore oficial do portal IVC)

```
IGREJA VIRTUDE CRISTÃ
│
├─ PORTAL PÚBLICO (Visitante)
│  ├─ Home
│  │   ├─ Sobre / História / Missão-Valores
│  │   ├─ Liderança
│  │   ├─ Localização (1 templo) + contato
│  │   ├─ Cultos (Ter/Qui/Dom)
│  │   ├─ Redes sociais (Instagram/YouTube/WhatsApp)
│  │   ├─ Eventos (listagem + detalhe → "inscrever-se" → WhatsApp)
│  │   └─ Doação/Oferta (QR PIX público)
│  └─ Login (admin / membro)
│
├─ PAINEL DO MEMBRO  (login e-mail + ID→troca de senha)
│  ├─ Avisos de eventos
│  ├─ QR code de dízimo
│  ├─ Cartão de membro
│  └─ Minhas informações (editar dados + foto 4x4)
│
└─ PAINEL ADMINISTRATIVO (RBAC: líderes de alto nível, finanças, secretaria, admin)
   ├─ Dashboard
   ├─ Membros (CRUD, ciclo de vida, cartão, documentos)
   ├─ Igrejas/Liderança
   ├─ Eventos (CRUD, visibilidade)
   ├─ Patrimônio
   ├─ Financeiro (receitas/despesas/doações PIX+cartão, webhook, conciliação, fechamento)
   ├─ Relatórios/Documentos
   ├─ Usuários/Permissões (RBAC)
   ├─ Configurações (portal/CMS, WhatsApp, chave PIX, dados institucionais)
   └─ Auditoria
```

## Como ler

Cada requisito possui um **ID estável** (`RF-NNN` / `RNF-NNN` / `RN-…`) usado na matriz de
cobertura (`docs/coverage-matrix.md`) e nas specs de features (coluna "Requisito(s)").

| Status | Significado |
| ------ | ----------- |
| ✅ **Confirmado** | Da árvore oficial / ADR / piloto — não muda sem nova decisão (AD-NNN) |
| 🆕 **Proposta** | Sugerido nesta consolidação — aguarda sua revisão/edição |

> Regra: nada é **Definitivo** sem a sua aprovação desta lista. Itens 🆕 aprovados passam a ✅.

---

## 1. Requisitos Funcionais (RF)

### A. Portal público (árvore oficial)

| ID | Requisito | Status |
| -- | --------- | ------ |
| RF-001 | **Sobre / História / Missão-Valores** institucional fidedigno | ✅ |
| RF-002 | **Liderança** (página pública) | ✅ |
| RF-003 | **Localização (1 templo) + contato** | ✅ |
| RF-004 | **Cultos (Ter/Qui/Dom)** na agenda | ✅ |
| RF-005 | **Redes sociais** (Instagram/YouTube/WhatsApp) | ✅ |
| RF-006 | **Eventos**: listagem + detalhe + "inscrever-se" → WhatsApp | ✅ |
| RF-007 | **Doação/Oferta**: QR PIX público | ✅ |
| RF-008 | **Login** (porta de entrada aos painéis admin/membro) | ✅ |

### B. Painel do membro (árvore oficial)

| ID | Requisito | Status |
| -- | --------- | ------ |
| RF-011 | **Login** e-mail + senha-ID temporária → troca obrigatória no 1º acesso | ✅ |
| RF-012 | **Avisos de eventos** | ✅ |
| RF-013 | **QR code de dízimo** (pessoal do membro) | ✅ |
| RF-014 | **Cartão de membro** | ✅ |
| RF-015 | **Minhas informações**: editar dados + foto 4x4 | ✅ |
| RF-016 | Histórico de doações do próprio membro (extrato) | 🆕 |

### C. Painel administrativo (árvore oficial)

| ID | Requisito | Status |
| -- | --------- | ------ |
| RF-021 | **Dashboard** | ✅ |
| RF-022 | **Membros**: CRUD, ciclo de vida, cartão, documentos | ✅ |
| RF-023 | **Igrejas/Liderança** | ✅ |
| RF-024 | **Eventos**: CRUD + visibilidade | ✅ |
| RF-025 | **Patrimônio** | ✅ |
| RF-026 | **Financeiro**: receitas/despesas/doações PIX **+ cartão**, webhook, conciliação, fechamento | ✅ |
| RF-027 | **Relatórios/Documentos** | ✅ |
| RF-028 | **Usuários/Permissões (RBAC)** | ✅ |
| RF-029 | **Configurações**: portal/CMS, WhatsApp, chave PIX, dados institucionais | ✅ |
| RF-030 | **Auditoria** | ✅ |

### D. Controle de acesso (RBAC)

| ID | Requisito | Status |
| -- | --------- | ------ |
| RF-031 | Papéis: MEMBRO, SECRETARIA, LIDER, FINANCEIRO, PATRIMONIAL, ADMIN, SUPER_ADMIN | ✅ |
| RF-032 | Matriz de permissões por papel (ler/escrever/administrar por módulo) | 🆕 (detalhar) |

### E. Operação e conformidade

| ID | Requisito | Status |
| -- | --------- | ------ |
| RF-041 | Backup automatizado dos dados (política em RNF-006) | ✅ |

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
| RNF-012 | Acessibilidade | WCAG 2.1 AA | 🆕 |

---

## 3. Regras de Negócio (RN)

| ID | Regra | Status |
| -- | ----- | ------ |
| RN-001 | Portal público: doação/oferta é **QR PIX** (sem dados de cartão no portal) | ✅ |
| RN-001.1 | Financeiro: recebimentos via **webhook (Mercado Pago)** — PIX e cartão; conciliação e fechamento de caixa são obrigatórios | ✅ (conforme árvore) |
| RN-002 | Senha-ID temporária expira após o primeiro acesso (troca obrigatória) | ✅ |
| RN-003 | "Inscrever-se" em evento redireciona para **WhatsApp** | ✅ |
| RN-004 | Toda ação administrativa sensível gera registro de auditoria | ✅ |
| RN-005 | Um membro pertence a um templo (topologia hoje: 1 templo; evoluível) | ✅ |

## Ponto de atrito a decidir (cartão no lançamento?)

A árvore prevê **PIX + cartão** no financeiro, mas o portal é **QR PIX apenas** e a
doação pública foi priorizada como PIX/QR. **Pendência de decisão:** cartão deve estar
ativo no lançamento da Fase 9 (exige CNPJ/Mercado Pago + checkout) ou apenas PIX no
início, com cartão após? → registrará ADR.

---

## 4. Restrições (RC), Qualidade (QA), Riscos (R)

### RC
| ID | Restrição | Status |
| -- | --------- | ------ |
| RC-001 | Taxa de manutenção mensal ≈ R$ 0 (evangelização sem custo p/ a igreja) | ✅ |
| RC-002 | Mercado Pago exige CNPJ — criado pelo administrador antes da Fase 9 | ✅ |
| RC-003 | Domínio provavelmente `*.vercel.app` inicial (próprio somente se houver) | 🆕 |

### QA
| ID | Instrumento | Status |
| -- | ----------- | ------ |
| QA-001 | Framework de testes automatizados | entra na Fase 10 |
| QA-002 | Verificação por feature: probes por AC + gates (`lint`/`typecheck`/`build`) + verifier | ✅ |
| QA-003 | Testes de aceitação UAT com o administrador | Fase 9 |

### R
| ID | Risco | Mitigação | Status |
| -- | ----- | --------- | ------ |
| R-001 | Dependência de apenas 1 pessoa p/ conteúdo/operação | Docs + RBAC + auditoria | 🆕 |
| R-002 | WhatsApp (D4) em aberto | Placeholder `"#"` no código até decisão | ✅ registrado |
| R-003 | CNPJ/Mercado Pago pendentes | Bloqueiam financeiro da Fase 9 | ✅ registrado |

---

## 5. Pendências abertas (não são requisitos)

| Pendência | Status |
| --------- | ------ |
| Número de WhatsApp oficial da igreja (**D4**) | 🔴 |
| CNPJ + credenciais Mercado Pago | 🔴 (necessário p/ F9 – financeiro) |
| Missão/Visão/Valores finais (MVV) | 🔴 |
| Cartão no lançamento vs apenas PIX (RN-001.1) | 🔴 (ADR) |
| Domínio próprio vs `*.vercel.app` | 🔴 (RC-003) |

---

## Regras de manutenção deste documento

1. Toda alteração de requisito = nova revisão com aprovação (AD-NNN quando estrutural).
2. Ao criar uma feature, referenciar os IDs aqui na spec (`.specs/features/<feature>/spec.md`).
3. Ao verificar uma feature, marcar o requisito como **Coberto** na `coverage-matrix.md` (sem editá-lo aqui).
4. `🆕` só vira `✅` mediante aprovação explícita nesta revisão.