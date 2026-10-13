# Deploy em Produção (Fase 12) Specification

## Problem Statement

O portal IVC existe só localmente: 118 commits nunca saíram da máquina, não há
CI rodando no GitHub, não há projeto Vercel nem Supabase de produção. Sem a
F12, a liderança não usa o sistema e todo o trabalho das F8–F11 não gera valor.
A fase coloca o app no ar em `*.vercel.app` (RC-003) com dados reais isolados.

## Goals

- [ ] `main` no GitHub com histórico preservado e CI verde (RNF-009)
- [ ] Supabase novo só de produção, com schema completo e sem dados demo/teste
- [ ] Deploy Production na Vercel (Hobby) com aprovação explícita (RNF-010)
- [ ] Fumaça em produção: health com release real, logins, Sentry com release
- [ ] Vercel Analytics ativo (adiado da F11) + docs fiéis à realidade

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Domínio próprio | RC-003 decide `*.vercel.app` inicial; próprio quando houver recurso |
| Credenciais Mercado Pago | Inexistentes (stub segue; AD-009: MVP é PIX QR estático) |
| Resend/e-mail transacional | Sem uso no código; menção em `DEPLOYMENT.md` será removida como correção |
| PITR detalhado / restore drill | RNF-005/006: procedimento básico nesta fase; drill fica na F13 (Hardening) |
| Preview de PR como gate | Permitidos sem aprovação (AD-007), mas não exigidos por AC |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Push dos 118 commits | Total, sem squash/rebase, agora | Usuário aprovou ("Push total agora"); SDD exige história atômica preservada | y |
| Supabase de produção | Projeto novo, só prod | Usuário aprovou ("Projeto novo"); isola dados reais de seeds demo/teste do dev | y |
| Analytics | `@vercel/analytics` nesta fase | Usuário aprovou; só gera dado com URL prod, que nasce aqui | y |
| Quem cria conta/projeto | Operador cria conta Vercel + projeto Supabase novo (guiado como no Sentry); agente configura código/envs/docs | Contas são pessoais/institucionais; segredos nunca transitam além do necessário | y |
| Exclusão do seed demo no prod | Mecanismo decidido no Design (aplicar tudo + limpeza documentada, ou pular `0018` com guarda) | `supabase db push` aplica a pasta inteira; AC-04 exige prod sem demo de qualquer jeito | n |
| Release em prod | `VERCEL_GIT_COMMIT_SHA` automático (código já pronto, F11) | Zero config; AC-09 verifica `≠ unknown` | n |
| Limite 10 deploys/dia (Hobby) | Deploys coordenados; sem AC próprio | Restrição operacional, não comportamento | n |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Push + CI verde ⭐ MVP

**User Story**: As a mantenedor, I want `main` no GitHub com história intacta e CI verde so that Vercel e colaboração tenham base confiável.

**Why P1**: Sem push não há integração Vercel, CI nem deploy — tudo mais trava.

**Acceptance Criteria**:

1. WHEN `main` for enviada a `origin` THEN the system SHALL preservar os 118 commits (contagem `origin/main` == local, sem squash/rebase). <!-- DEP-01, event-driven -->
2. WHEN o push completar THEN the system SHALL ter os jobs `tests`, `specs` (e `cartao`) verdes na HEAD no GitHub. <!-- DEP-02, event-driven -->
3. IF o push for rejeitado (non-fast-forward) THEN the system SHALL parar e pedir decisão — nunca force-push. <!-- DEP-03, unwanted-behavior -->

**Independent Test**: `git rev-list --count origin/main` == local; badge/jobs verdes no GitHub.

---

### P1: Supabase novo de produção ⭐ MVP

**User Story**: As a liderança, I want dados reais isolados dos dados de teste so that membros e financeiro de verdade nunca se misturem com demo.

**Why P1**: Produção com seed fictícia é incidente LGPD/operacional na estreia.

**Acceptance Criteria**:

1. WHEN as migrations forem aplicadas no projeto novo THEN the system SHALL ter o schema completo (membros, permissões/RBAC, financeiro, auditoria, RLS `can_access`, triggers da validade). <!-- DEP-04, event-driven -->
2. The banco de produção SHALL NOT conter membros demo (`0018`), usuários de teste (`*.teste`) nem fechamentos-resíduo de probe. <!-- DEP-05, ubiquitous -->
3. WHEN o seed do 1º admin rodar contra o projeto novo THEN the system SHALL permitir login em `/login/admin` com troca de senha exigida. <!-- DEP-06, event-driven -->
4. The chave service-role SHALL existir só server-side e SHALL NOT aparecer em bundle client nem em `NEXT_PUBLIC_*`. <!-- DEP-07, ubiquitous -->

**Independent Test**: Login admin no projeto novo + consulta mostra zero membros demo; grep confirma service-role fora do client.

---

### P1: Deploy Production na Vercel ⭐ MVP

**User Story**: As a liderança, I want o portal no ar em `*.vercel.app` so that membros e secretaria usem o sistema real.

**Why P1**: É o objetivo da fase.

**Acceptance Criteria**:

1. WHEN `main` (CI verde) for promovida com aprovação explícita THEN the system SHALL deployar Production com preset Next.js (`next build` verde na Vercel). <!-- DEP-08, event-driven -->
2. The environments de produção SHALL conter exatamente (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` apontando ao Supabase/Sentry novos) e SHALL NOT ter nenhuma delas no repo. <!-- DEP-09, ubiquitous -->
3. WHEN `GET /api/health` for chamado em produção THEN the system SHALL responder 200 com `release` == SHA do deploy (diferente de `unknown`). <!-- DEP-10, event-driven -->
4. WHEN login de membro e de admin forem feitos em produção THEN the system SHALL autenticar contra o Supabase novo e o Sentry SHALL registrar o release do deploy. <!-- DEP-11, event-driven -->

**Independent Test**: Health prod com SHA real; logins funcionam; release visível no Sentry.

---

### P2: Vercel Analytics

**User Story**: As a liderança, I want ver páginas mais acessadas e o funil da doação so that decisões de conteúdo tenham dado.

**Why P2**: Pilar de métricas adiado da F11; só funciona com URL prod.

**Acceptance Criteria**:

1. WHEN páginas forem acessadas em produção THEN the system SHALL registrar pageviews no dashboard Vercel (componente `<Analytics />` no layout raiz). <!-- DEP-12, event-driven -->
2. The Analytics SHALL coletar só pageviews padrão, sem eventos custom com dado pessoal. <!-- DEP-13, ubiquitous -->

**Independent Test**: Tráfego real aparece no dashboard Vercel; grep confirma ausência de `track(` com PII.

---

### P2: Docs fiéis + rollback

**User Story**: As a mantenedor, I want docs que descrevem a produção real so that o próximo deploy/incidente não dependa de memória.

**Why P2**: `DEPLOYMENT.md` atual cita Auth.js/Resend e envs que não existem — doc errada é pior que ausente.

**Acceptance Criteria**:

1. WHEN a feature for entregue THEN the system SHALL ter `docs/DEPLOYMENT.md` sem Auth.js/Resend, com a lista exata de envs, os dois projetos Supabase e o passo de promoção/rollback. <!-- DEP-14, event-driven -->
2. The runbook SHALL permitir voltar produção ao deploy anterior pelo painel Vercel. <!-- DEP-15, ubiquitous -->

**Independent Test**: Terceiro executa promoção e rollback só pela doc.

---

## Edge Cases

- IF o build falhar na Vercel THEN the system SHALL não promover (Production segue no deploy anterior) e o fix SHALL sair em PR. <!-- RNF-009 -->
- IF env obrigatória ausente THEN the system SHALL falhar alto no boot/deploy, nunca operar meio-configurado.
- IF o limite de 10 deploys/dia for atingido THEN the system SHALL aguardar a janela seguinte (coordenar merges).
- WHEN probe/fumaça detectar dado demo em prod THEN the system SHALL bloquear a entrega até a limpeza (DEP-05 é gate).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| DEP-01 | P1: Push | Execute | Implementing |
| DEP-02 | P1: Push | Execute | Implementing |
| DEP-03 | P1: Push | Execute | Implementing |
| DEP-04 | P1: Supabase | Execute | Implementing |
| DEP-05 | P1: Supabase | Execute | Implementing |
| DEP-06 | P1: Supabase | Execute | Implementing |
| DEP-07 | P1: Supabase | Execute | Implementing |
| DEP-08 | P1: Vercel | Design | Pending |
| DEP-09 | P1: Vercel | Design | Pending |
| DEP-10 | P1: Vercel | Execute | Implementing |
| DEP-11 | P1: Vercel | Execute | Implementing |
| DEP-12 | P2: Analytics | Execute | Implementing |
| DEP-13 | P2: Analytics | Execute | Implementing |
| DEP-14 | P2: Docs | Execute | Implementing |
| DEP-15 | P2: Docs | Execute | Implementing |

**Coverage:** 15 total, 0 mapped to tasks, 15 unmapped ⚠️

---

## Success Criteria

- [ ] `origin/main` == local (118+ commits) com CI verde
- [ ] Supabase prod com schema completo, zero demo/teste, admin logando
- [ ] Produção no ar: health com SHA real, logins ok, Sentry com release
- [ ] Pageviews no dashboard Vercel; docs executáveis por terceiro
