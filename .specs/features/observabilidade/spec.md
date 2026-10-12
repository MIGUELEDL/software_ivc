# Observabilidade (Fase 11) Specification

## Problem Statement

O portal IVC roda sem nenhuma observabilidade: nenhuma exceção server/client é
capturada centralmente, não existe rota de health para monitoramento externo e
os logs são `console.*` ad-hoc sem formato nem garantia anti-PII. Um erro em
produção (webhook MP, Supabase, rota admin) hoje é invisível até um usuário
reclamar. A Fase 11 ativa o plano de `docs/OBSERVABILITY.md` (RNF-008).

## Goals

- [ ] Exceções server-side e client-side capturadas no Sentry (plano free), com
      `release` e contexto funcional, sem PII
- [ ] Rota `GET /api/health` pública e rasa para monitores de uptime (RNF-003)
- [ ] Lib de log estruturado com sanitização anti-PII adotada na borda mais
      crítica (webhook Mercado Pago)
- [ ] Runbook de incidente + passo de alerta no dashboard documentados

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Vercel Analytics (`@vercel/analytics`) | Só gera dado com URL de produção; entra na F12 (Deploy) |
| Sentry Tracing/Performance/Replay | Quota do plano free; errors-only nesta fase |
| Regra de alerta versionada no repo | Alerta vive no dashboard Sentry (fora do código); repo documenta o passo |
| Health profundo (checar Supabase/DB) | Acoplaria uptime ao banco e ampliaria superfície; health é raso por decisão |
| Rollout do logger em todas as rotas | Adoção mínima validada no webhook MP; restante é evolução futura |
| E-mail institucional específico | Endereço real não confirmado; runbook usa canal genérico da liderança |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| DSN entra agora ou depois? | Ativação real nesta fase: DSN do projeto `[REDACTED_PROJECT_NAME]` em mãos (só em `.env.local`, gitignorado, nunca commitado); NOOP segue como fallback especificado e testado (OBS-02) | Usuário criou o projeto e entregou o DSN em 2026-10-12; captura real passa a ser o critério primário verificado | y |
| Canal de alerta | Regra de alerta configurada no dashboard Sentry; runbook documenta o passo | Alerta não é versionável no repo; dashboard é o mecanismo nativo do plano free | y |
| `GET /api/health` público e raso (`{status, release}`, sem DB) | Sim | Monitores externos exigem GET sem auth (`OBSERVABILITY.md`: "para o monitoramento externo"); RNF-003 ≥ 99% | n |
| Tracing/performance | Desligados (errors-only) | Preservar quota do plano free para o que importa: exceção com contexto | n |
| SDK | `@sentry/nextjs` (padrão oficial para Next.js) | Integração server/client/edge suportada pelo vendor; a verificar compat. com Next 16 no Design | n |
| `release` | SHA do deploy (env Vercel) com fallback `unknown` | Fonte de release exigida por `OBSERVABILITY.md`; fallback mantém contrato sem DSN/Vercel | n |
| Chaves PII sanitizadas pelo logger | `email`, `cpf`, `rg`, `foto`, `telefone`, `endereco`, `senha`, `token` (+ prefixos `*_pii`) | Alinha com `docs/LGPD.md` e SECURITY.md: e-mail/CPF/foto nunca em log/erro | n |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Captura de erros no Sentry (wiring + NOOP) ⭐ MVP

**User Story**: As a mantenedor, I want exceções server/client capturadas no
Sentry com release e sem PII so that nenhum erro crítico em produção passe
invisível.

**Why P1**: É o núcleo da RNF-008; sem isso a fase não existe.

**Acceptance Criteria** (each line is one EARS pattern):

1. WHEN uma exceção não capturada ocorrer num route handler ou server component THEN the system SHALL enviá-la ao Sentry com `release` e contexto funcional (rota, módulo). <!-- OBS-01, event-driven -->
2. IF `SENTRY_DSN` estiver ausente ou malformado THEN the system SHALL operar em NOOP (nenhum envio, nenhum throw na inicialização; build e start verdes). <!-- OBS-02, unwanted-behavior -->
3. The system SHALL incluir `release` em todo evento e SHALL NOT incluir PII (e-mail, CPF, RG, foto, telefone, endereço) em nenhum payload de erro. <!-- OBS-03, ubiquitous -->
4. WHEN uma exceção ocorrer num client component sob boundary THEN the system SHALL capturar o erro e renderizar fallback sem expor stack trace ao usuário. <!-- OBS-04, event-driven -->

**Independent Test**: Derrubar propositalmente uma rota de teste (ex.: throw em
ambiente local com DSN de teste) e ver o evento no Sentry com `release`;
repetir sem DSN e confirmar NOOP (app sobe, 0 throw).

---

### P1: Rota de health pública ⭐ MVP

**User Story**: As a monitor externo, I want `GET /api/health` sem
autenticação so that o uptime (RNF-003) seja verificável de fora.

**Why P1**: Pilar "Uptime/health" de `OBSERVABILITY.md`; pré-requisito do
monitoramento da F12.

**Acceptance Criteria**:

1. WHEN `GET /api/health` for chamado sem autenticação THEN the system SHALL responder 200 com `{ status: "ok", release: "<sha|unknown>" }`. <!-- OBS-05, event-driven -->
2. IF o método for diferente de GET THEN the system SHALL responder 405. <!-- OBS-06, unwanted-behavior -->
3. WHILE o Sentry estiver indisponível ou sem DSN, WHEN `GET /api/health` for chamado THEN the system SHALL responder 200 normalmente. <!-- OBS-07, complex -->
4. The health response SHALL NOT consultar banco/Supabase e SHALL NOT conter PII ou segredos. <!-- OBS-08, ubiquitous -->

**Independent Test**: `curl GET /api/health` sem cookie → 200 com o corpo
exato; `curl -X POST` → 405.

---

### P2: Log estruturado anti-PII + borda do webhook

**User Story**: As a mantenedor, I want logs JSON com níveis e sanitização de
PII, usados no webhook Mercado Pago, so that falhas de conciliação sejam
diagnosticáveis sem vazar dados pessoais.

**Why P2**: Pilar "Logs estruturados"; webhook MP é a borda onde perda
silenciosa trava conciliação (tabela de `OBSERVABILITY.md`).

**Acceptance Criteria**:

1. WHEN `logger.<level>(evento, meta)` for chamado com chaves PII na meta THEN the system SHALL emitir JSON com `level`, `evento`, timestamp e a meta com as chaves PII removidas/mascaradas. <!-- OBS-09, event-driven -->
2. WHEN o insert em `webhook_events` ou a conciliação falhar THEN the system SHALL registrar via logger (nível error) e capturar a exceção no Sentry, mantendo o status HTTP contratado da rota. <!-- OBS-10, event-driven -->
3. The logger SHALL ter assinatura estável exportada de `src/lib/observability/` para adoção futura nas demais rotas. <!-- OBS-11, ubiquitous -->

**Independent Test**: Teste Vitest (framework F10) com meta contendo
`{ email, cpf, descricao }` → saída sem `email`/`cpf`, com `descricao`;
mutação `||`→`??`-style na sanitização deve ser morta pelo teste.

---

### P2: Docs e runbook da F11

**User Story**: As a liderança/encarregado, I want o runbook de incidente e o
passo do alerta documentados so that um alerta vire resposta (rollback, PR,
re-deploy) sem improvisar.

**Why P2**: Fecha o pilar processual; sem runbook o alerta não vira ação.

**Acceptance Criteria**:

1. WHEN a feature for entregue THEN the system SHALL ter `docs/OBSERVABILITY.md` com a tabela Status marcando a F11 ativa (DSN, release, alerta-dashboard). <!-- OBS-12, event-driven -->
2. The runbook SHALL conter o passo de criação da regra de alerta no dashboard Sentry para o canal de e-mail da liderança e o fluxo Detecção→Triagem→Resposta→Aprendizado. <!-- OBS-13, ubiquitous -->

**Independent Test**: Leitura da doc + checklist: cada passo do runbook é
executável sem perguntar ao autor.

---

## Edge Cases

Edge cases are usually unwanted-behavior (IF/THEN) or boundary (WHEN) criteria:

- IF o DSN for sintaticamente inválido THEN the system SHALL tratá-lo como ausente (NOOP + warn em log, sem crash) <!-- cobre OBS-02 -->
- IF o envio ao Sentry falhar (rede/quota) THEN the system SHALL completar o request original normalmente; a falha de envio nunca propaga <!-- resiliência da borda -->
- WHEN `release` não for resolvível (fora da Vercel) THEN the system SHALL usar `"unknown"` e manter o contrato do payload <!-- fallback OBS-03/05 -->
- IF a meta do logger contiver objeto aninhado com PII THEN the system SHALL sanitizar recursivamente até profundidade 3 (além disso, truncar com marcador) <!-- limite anti-vazamento -->

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| OBS-01 | P1: Sentry | Execute | Implementing |
| OBS-02 | P1: Sentry | Execute | Implementing |
| OBS-03 | P1: Sentry | Execute | Implementing |
| OBS-04 | P1: Sentry | Execute | Implementing |
| OBS-05 | P1: Health | Design | Pending |
| OBS-06 | P1: Health | Design | Pending |
| OBS-07 | P1: Health | Design | Pending |
| OBS-08 | P1: Health | Design | Pending |
| OBS-09 | P2: Logger | Execute | Implementing |
| OBS-10 | P2: Logger | Design | Pending |
| OBS-11 | P2: Logger | Execute | Implementing |
| OBS-12 | P2: Docs | Design | Pending |
| OBS-13 | P2: Docs | Design | Pending |

**ID format:** `[CATEGORY]-[NUMBER]` (e.g., `AUTH-01`, `CART-03`, `NOTIF-02`)

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 13 total, 0 mapped to tasks, 13 unmapped ⚠️

---

## Success Criteria

How we know the feature is successful:

- [ ] Exceção proposital em rota local com DSN de teste aparece no Sentry com `release`, sem PII
- [ ] Sem DSN: build + start + suíte verdes, health 200, zero throw de inicialização
- [ ] `GET /api/health` sem auth → 200 `{status:"ok",release}`; POST → 405
- [ ] Logger com PII na meta emite JSON sem as chaves sensíveis (Vitest verde)
- [ ] `docs/OBSERVABILITY.md` marca F11 ativa; runbook executável por terceiro
