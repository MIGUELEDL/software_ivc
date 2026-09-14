# Eventos (RF-024) Specification

## Problem Statement

O portal `/eventos` exibe eventos a partir de um literal vazio em
`src/lib/constants.ts` (`EVENTS = []`), com páginas de listagem e detalhe
estáticas (RF-006). O painel administrativo não tem gestão de eventos. A
RF-024 entrega o módulo `eventos` da matriz de permissões (RF-032 — seed já
presente em 0008): tabela `events` com RLS enraizado em
`can_access('eventos', ...)`, CRUD administrativo em `/admin/eventos`, e a
migração das páginas `/eventos` e `/eventos/[id]` para ler do banco (eventos
`visivel` + `ATIVO`), preservando "inscrever-se" via WhatsApp (RN-003).

## Goals

- [ ] Tabela `events` (título, descrição, data, hora, local, `visivel`, `status`) com RLS por `can_access('eventos', ...)` e leitura pública
- [ ] CRUD admin em `/admin/eventos` com guardas da matriz (ler/escrever)
- [ ] Visibilidade manual (`visivel` false oculta do portal) + soft-delete (`status` INATIVO oculta), sem DELETE direto
- [ ] Portal `/eventos` e `/eventos/[id]` migrados para ler `events` do banco — leitura pública, mantendo inscrição via WhatsApp (RN-003, regressão RF-006)
- [ ] Probes discriminativos por papel/AC (L-006..L-008)

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Inscrição/registro real em evento (lista de participantes) | RF-024 é CRUD + visibilidade; inscrição continua só WhatsApp (RN-003) |
| Imagem/capa do evento | Decisão do usuário: campos mínimos |
| Avisos de eventos no painel do membro | RF-012 (já existe em `event_notices`) |
| Calendário/integração externa | — |
| Publicação automática por data | Decisão do usuário: visibilidade manual |
| Hard-delete de evento | Decisão do usuário: só soft-delete (histórico preservado) |
| Troca de papel/fonte da matriz | RF-028; matriz `eventos` já existe no seed (0008) |
| Auditoria persistida negativas | RF-030; log do servidor (matriz atual) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Visibilidade | Booleano `visivel` (default `true`); admin decide o que publica | Decisão do usuário (manual, sem regra de data) | y |
| Ciclo de vida do evento | Soft-delete por `status` `ATIVO`/`INATIVO`; sem hard-delete | Decisão do usuário (histórico de dados institucionais) | y |
| Campos mínimos | `title`, `description` (nullable), `date`, `time`, `location`, `visivel`, `status` | Decisão do usuário (cobre o portal RF-006) | y |
| Portal DB-driven | `/eventos` e `/eventos/[id]` leem `events` do banco (visivel+ATIVO) | Decisão do usuário; padrão da Liderança (RF-023) | y |
| Inscrição | Botão "Inscrever-se via WhatsApp" preservado (RN-003, regressão RF-006) | WhatsApp oficial ADR-010 | y |
| Escrita no admin | `can_access('eventos','escrever')` (SUPER_ADMIN/ADMIN `administrar`, SECRETARIA `escrever` na matriz 0008) | Só papéis com escrita; demais (`FINANCEIRO`/`PATRIMONIAL`/`LIDER`) `ler` | y |
| Ordenação portal | `date` asc (próximos primeiro) | Listagem pública por data | y |
| Ordenação admin | `date` desc (mais recentes primeiro) | Listagem administrativa | y |
| DELETE | Sem policy de DELETE; `PATCH status INATIVO` oculta | Mesmo padrão de `leaders` (RF-023) | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P0: Gestão de eventos (`events`) ⭐ MVP

**User Story**: Como administrador do sistema, quero gerir os eventos da igreja
(título, data, local) e controlar a visibilidade no portal, para manter a agenda
pública atualizada.

**Why P0**: Sem a entidade, o portal não tem fonte de eventos.

**Acceptance Criteria** (EARS):

1. O sistema SHALL manter uma tabela pública `events` com colunas `id`, `title`, `description` (nullable), `date`, `time`, `location`, `visivel` (default `true`), `status` (`ATIVO`/`INATIVO`), `created_at` e `updated_at`. <!-- ubiquitous -->
2. O sistema SHALL permitir leitura (SELECT) de `events` a sessões `anon` e `authenticated` via RLS. <!-- ubiquitous -->
3. O sistema SHALL restringir escrita (INSERT/UPDATE) em `events` a sessões `authenticated` com `can_access('eventos','escrever')`, e SHALL não conceder DELETE direto (soft-delete por `status`). <!-- ubiquitous -->
4. WHEN `POST /api/admin/eventos` recebe dados válidos de uma sessão com `can('eventos','escrever')` THEN o sistema SHALL criar o evento com `status='ATIVO'` (e `visivel` enviado ou default `true`) e responder `201`. <!-- event-driven -->
5. WHEN `POST /api/admin/eventos` recebe dados inválidos THEN o sistema SHALL responder `400` com `{error:"dados_invalidos", campos}`, discriminando cada campo. <!-- event-driven -->
6. WHEN `POST /api/admin/eventos` é chamado sem sessão ou por papel sem escrita em `eventos` (ex.: `FINANCEIRO`, `PATRIMONIAL`, `LIDER`, `MEMBRO`) THEN o sistema SHALL responder `401`/`403` e registrar a negativa no log. <!-- event-driven -->
7. WHILE uma sessão com `can('eventos','ler')` acessa `GET /api/admin/eventos` THEN o sistema SHALL listar eventos ordenados por `date` desc (incluindo `visivel=false` e `status='INATIVO'`) e responder `200`. <!-- ubiquitous -->
8. WHEN `PATCH /api/admin/eventos/[id]` recebe dados válidos de uma sessão com `can('eventos','escrever')` THEN o sistema SHALL atualizar apenas os campos enviados (incluindo `visivel` e `status`) e responder `200`. <!-- event-driven -->
9. WHEN `PATCH /api/admin/eventos/[id]` referencia id inexistente THEN o sistema SHALL responder `404`. <!-- event-driven -->
10. WHEN `PATCH /api/admin/eventos/[id]` define `status='INATIVO'` THEN o sistema SHALL ocultar o evento do portal (soft-delete). <!-- event-driven -->
11. WHEN um evento tem `visivel=false` THEN o sistema SHALL ocultá-lo do portal público mesmo estando `ATIVO`. <!-- event-driven -->

### P1: Portal — eventos públicos ⭐ MVP

**User Story**: Como visitante do portal, quero ver os eventos reais da igreja
com data, hora e local, e me inscrever via WhatsApp.

**Why P1**: É o retorno visível da migração de dados para o banco e preserva RF-006.

**Acceptance Criteria** (EARS):

12. WHILE um visitante (sem sessão) acessa `/eventos` THEN o sistema SHALL listar os eventos `visivel=true` e `status='ATIVO'`, ordenados por `date` asc, com título, data, hora e local, lendo de `events` no banco. <!-- ubiquitous -->
13. WHEN um visitante abre `/eventos/[id]` de um evento `visivel=true` e `status='ATIVO'` THEN o sistema SHALL exibir o detalhe completo e o botão "Inscrever-se via WhatsApp" apontando para o WhatsApp oficial. <!-- event-driven -->
14. WHEN `/eventos/[id]` referencia um evento inexistente, `visivel=false` ou `status='INATIVO'` THEN o sistema SHALL responder `404` (não expor ocultos). <!-- event-driven -->
15. WHEN não existem eventos `visivel=true` e `status='ATIVO'` THEN o sistema SHALL exibir o estado vazio ("Em breve avisaremos os próximos eventos"). <!-- event-driven -->
16. O sistema SHALL manter o item de navegação "Eventos" (`/eventos`) do portal (regressão `portal-home`). <!-- ubiquitous -->

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| EVT-01 | P0: Eventos (schema) | - | Done (T1) |
| EVT-02 | P0: Eventos (select anon) | - | Done (T1) |
| EVT-03 | P0: Eventos (write, sem delete) | - | Done (T1) |
| EVT-04 | P0: Eventos (POST 201) | - | Pending |
| EVT-05 | P0: Eventos (POST 400) | - | Pending |
| EVT-06 | P0: Eventos (POST 401/403) | - | Pending |
| EVT-07 | P0: Eventos (GET list) | - | Pending |
| EVT-08 | P0: Eventos (PATCH 200) | - | Pending |
| EVT-09 | P0: Eventos (PATCH 404) | - | Pending |
| EVT-10 | P0: Eventos (PATCH INATIVO) | - | Pending |
| EVT-11 | P0: Eventos (visivel false oculta) | - | Pending |
| EVT-12 | P1: Portal (lista pública) | - | Pending |
| EVT-13 | P1: Portal (detalhe + WhatsApp) | - | Pending |
| EVT-14 | P1: Portal (404 para ocultos) | - | Pending |
| EVT-15 | P1: Portal (empty state) | - | Pending |
| EVT-16 | P1: Portal (nav) | - | Pending |

**Coverage:** 16 total, 0 mapped to tasks, 16 unmapped ⚠️

## External Interfaces

- **Público**: `/eventos` (lista) e `/eventos/[id]` (detalhe → WhatsApp) renderizadas no servidor, leitura via RLS `anon`.
- **Admin**: `/admin/eventos` (lista), `/admin/eventos/nova`, `/admin/eventos/[id]` (detalhe/edição).
- **API**: `POST`/`GET` `/api/admin/eventos`; `PATCH` `/api/admin/eventos/[id]`.
- **DB**: tabela `events` (migration 0012); sem storage (campos mínimos).

## Non-Functional Acceptance Criteria

- **Nível de segurança**: negativas de RBAC registradas no log do servidor (`negarPermissao`).
- **Gates determinísticos**: `validate_spec.py`, `validate_tasks.py`, `validate_state.py`, `check_commit.py`, lint/typecheck/build.
- **Verificação**: probes `scripts/probes-admin-eventos.sh` discriminando por papel (escritor `eventos` vs leitor vs `MEMBRO`), regressões `probes-admin-lideranca.sh`, `probes-admin-membros.sh`, `probes-painel.sh`, `probes-auth.sh`; sensor de mutação (máx. 3 iterações).