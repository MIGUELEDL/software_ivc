# Igrejas & Liderança (RF-023) Specification

## Problem Statement

O portal exibe a liderança a partir de um literal em `src/lib/constants.ts`
(`CHURCH.leader` — um único card, `Leadership.tsx`). O painel administrativo
não tem gestão de igrejas nem de líderes. A RF-023 entrega o módulo `igrejas`
da matriz de permissões (RF-032): tabelas `churches` e `leaders` com RLS
enraizado em `can_access('igrejas', ...)`, CRUD administrativo em
`/admin/lideranca`, fotos de líder no Supabase Storage, e a migração da seção
Liderança do portal para ler do banco (líderes `ATIVO` ordenados).

## Goals

- [ ] Tabelas `churches` (CRUD) e `leaders` (campos completos + soft-delete) com RLS por `can_access('igrejas', ...)`
- [ ] CRUD admin em `/admin/lideranca` com guardas da matriz (ler/escrever/administrar)
- [ ] Hard-delete de igreja restrito a `SUPER_ADMIN` (RLS + app), com cascata aos líderes
- [ ] Foto de líder via upload no bucket `fotos-lideranca` (padrão AD-014)
- [ ] Portal (seção Liderança) migrado para ler `leaders`/`churches` do banco — leitura pública
- [ ] Probes discriminativos por papel/AC cobrindo toda a matriz `igrejas` (L-006..L-008)

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Editor de MVV/CMS/WhatsApp/PIX institucional | RF-029 (Configurações) |
| Seleção de igreja "ativa" para o portal | RF-029; hoje exibe a 1ª criada |
| Hard-delete de líderes | Decisão: só soft-delete (histórico preservado) |
| Troca de papel/fonte da matriz | RF-028; aqui a matriz `igrejas` já existe no seed (0008) |
| Multi-igreja no portal (templo do membro) | RN-005 topologia atual 1 templo; evoluível no banco |
| Auditoria persistida negativas | RF-030; log do servidor (matriz atual) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Escopo de igrejas | Full CRUD (criar/editar/listar/excluir) | Decisão do usuário (evoluível apesar de RN-005) | y |
| Exclusão de igreja | Hard-delete só `SUPER_ADMIN` (RLS + app); sem soft-delete | Decisão do usuário; mais restritivo que `igrejas/administrar` | y |
| Cascata de exclusão | `DELETE church` remove seus `leaders` (FK `on delete cascade`) | FK resolve órfãos; RLS não bloqueia ações de integridade referencial | y |
| Campos de líder | `name`, `role`, `photo_url`, `order`, `status`, `church_id` | Decisão do usuário (completo) | y |
| Ciclo de vida do líder | Soft-delete por status `ATIVO`/`INATIVO`; sem hard-delete | Decisão do usuário (histórico de dados institucionais) | y |
| Foto do líder | Upload no bucket `fotos-lideranca` (path `lideranca/{id}/foto.{ext}`) | Decisão do usuário; padrão AD-014 | y |
| Leitura pública do portal | RLS SELECT para `anon` + `authenticated` em `churches`/`leaders` | Portal é público; acesso admin vem do gate de página + guardas | y |
| Escrita no admin | `can_access('igrejas','escrever')` (só `ADMIN`/`SUPER_ADMIN` na matriz) | Módulo `igrejas` no seed 0008: demais papéis só `ler` | y |
| Portal com 1+ igreja | Exibe a 1ª criada (`created_at`) | Seleção de igreja ativa fica para RF-029 | y |
| Regressão `portal-home` HOME-04 | Migração legítima: `Leadership.tsx` passa de literal para DB | `portal-home` context.md previu ampliação na RF-023 | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P0: Igrejas (`churches`) ⭐ MVP

**User Story**: Como administrador do sistema, quero gerir as igrejas cadastradas
(hoje a IVC), para manter os dados institucionais e o vínculo da liderança.

**Why P0**: Sem a entidade igreja, a liderança não tem vínculo e o portal não
tem fonte.

**Acceptance Criteria** (EARS):

1. O sistema SHALL manter uma tabela pública `churches` com colunas `id`, `name`, `short_name`, `cnpj`, `address`, `city`, `founded_date`, `created_at` e `updated_at`. <!-- ubiquitous -->
2. O sistema SHALL permitir leitura (SELECT) de `churches` a sessões `anon` e `authenticated` via RLS. <!-- ubiquitous -->
3. O sistema SHALL restringir escrita (INSERT/UPDATE) em `churches` a sessões `authenticated` com `can_access('igrejas','escrever')`. <!-- ubiquitous -->
4. O sistema SHALL restringir exclusão (DELETE) em `churches` a sessões `authenticated` com papel `SUPER_ADMIN`. <!-- ubiquitous -->
5. WHEN `POST /api/admin/igrejas` recebe dados válidos de uma sessão com `can('igrejas','escrever')` THEN o sistema SHALL criar a igreja e responder `201`. <!-- event-driven -->
6. WHEN `POST /api/admin/igrejas` recebe dados inválidos THEN o sistema SHALL responder `400` com `{error:"dados_invalidos", campos}`, discriminando cada campo. <!-- event-driven -->
7. WHEN `POST /api/admin/igrejas` é chamado sem sessão ou por papel sem escrita em `igrejas` (ex.: `SECRETARIA`, `FINANCEIRO`, `MEMBRO`) THEN o sistema SHALL responder `401`/`403` e registrar a negativa no log. <!-- event-driven -->
8. WHILE uma sessão com `can('igrejas','ler')` acessa `GET /api/admin/igrejas` THEN o sistema SHALL listar igrejas ordenadas por `created_at` (resposta `200`). <!-- ubiquitous -->
9. WHEN `PATCH /api/admin/igrejas/[id]` recebe dados válidos de uma sessão com `can('igrejas','escrever')` THEN o sistema SHALL atualizar apenas os campos enviados e responder `200`. <!-- event-driven -->
10. WHEN `PATCH /api/admin/igrejas/[id]` referencia id inexistente THEN o sistema SHALL responder `404`. <!-- event-driven -->
11. WHEN `DELETE /api/admin/igrejas/[id]` é chamado por sessão `SUPER_ADMIN` THEN o sistema SHALL excluir a igreja e seus líderes (cascata) e responder `204`. <!-- event-driven -->
12. WHEN `DELETE /api/admin/igrejas/[id]` é chamado por sessão `ADMIN` (que tem `igrejas/administrar` na matriz) THEN o sistema SHALL responder `403`. <!-- event-driven -->

### P1: Liderança (`leaders`) ⭐ MVP

**User Story**: Como administrador do sistema, quero gerir os líderes e suas
fotos, para o portal exibir a liderança real da igreja.

**Why P1**: É o conteúdo visível da RF-023 e alimenta o portal.

**Acceptance Criteria** (EARS):

13. O sistema SHALL manter uma tabela pública `leaders` com colunas `id`, `church_id`, `name`, `role`, `photo_url` (nullable), `order`, `status` (`ATIVO`/`INATIVO`), `created_at` e `updated_at`, com `church_id` referenciando `churches(id)` em cascata na exclusão. <!-- ubiquitous -->
14. O sistema SHALL permitir leitura (SELECT) de `leaders` a sessões `anon` e `authenticated` via RLS. <!-- ubiquitous -->
15. O sistema SHALL restringir escrita (INSERT/UPDATE/DELETE) em `leaders` a sessões `authenticated` com `can_access('igrejas','escrever')`, e SHALL não conceder DELETE direto (soft-delete por status); a cascata de `churches` é a única via de remoção física. <!-- ubiquitous -->
16. WHEN `POST /api/admin/igrejas/[id]/lideres` recebe dados válidos de sessão com `can('igrejas','escrever')` THEN o sistema SHALL criar o líder com `status='ATIVO'` e responder `201`. <!-- event-driven -->
17. WHEN `POST /api/admin/igrejas/[id]/lideres` referencia igreja inexistente THEN o sistema SHALL responder `404`. <!-- event-driven -->
18. WHEN `PATCH /api/admin/lideres/[id]` recebe campos válidos (`name`, `role`, `order`, `status`) de sessão com `can('igrejas','escrever')` THEN o sistema SHALL atualizá-los e responder `200`. <!-- event-driven -->
19. WHEN `PATCH /api/admin/lideres/[id]` define `status='INATIVO'` THEN o sistema SHALL ocultar o líder do portal (soft-delete). <!-- event-driven -->
20. WHEN `POST /api/admin/lideres/[id]/foto` recebe uma imagem válida de sessão com `can('igrejas','escrever')` THEN o sistema SHALL fazer upload no bucket `fotos-lideranca` e responder `200` com `{photo_url}`. <!-- event-driven -->
21. WHEN o upload de foto não corresponde a imagem permitida OU excede o limite do bucket THEN o sistema SHALL rejeitar com `400`/`413` e não persistir `photo_url`. <!-- event-driven -->

### P2: Portal — seção Liderança ⭐ MVP

**User Story**: Como visitante do portal, quero ver os líderes reais da igreja
com cargo e foto, para conhecer a liderança.

**Why P2**: É o retorno visível da migração de dados para o banco.

**Acceptance Criteria** (EARS):

22. WHILE um visitante (sem sessão) acessa a home THEN o sistema SHALL exibir na seção `#lideranca` os líderes `ATIVO` — ordenados por `order` — com foto (quando houver), nome e cargo, lendo de `leaders`/`churches` no banco. <!-- ubiquitous -->
23. WHEN não existem líderes `ATIVO` THEN o sistema SHALL exibir estado vazio na seção. <!-- event-driven -->
24. O sistema SHALL manter a âncora `#lideranca` e o item de navegação correspondente (regressão `portal-home` HOME-04/HOME-08). <!-- ubiquitous -->
25. O sistema SHALL persistir `photo_url` do líder em `leaders.photo_url` e SHALL não expor a foto em caminho não-público. <!-- ubiquitous -->

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| IGR-01 | P0: Igrejas (schema) | - | Pending |
| IGR-02 | P0: Igrejas (select anon) | - | Pending |
| IGR-03 | P0: Igrejas (write) | - | Pending |
| IGR-04 | P0: Igrejas (delete) | - | Pending |
| IGR-05 | P0: Igrejas (POST 201) | - | Pending |
| IGR-06 | P0: Igrejas (POST 400) | - | Pending |
| IGR-07 | P0: Igrejas (POST 401/403) | - | Pending |
| IGR-08 | P0: Igrejas (GET list) | - | Pending |
| IGR-09 | P0: Igrejas (PATCH 200) | - | Pending |
| IGR-10 | P0: Igrejas (PATCH 404) | - | Pending |
| IGR-11 | P0: Igrejas (DELETE 204) | - | Pending |
| IGR-12 | P0: Igrejas (DELETE 403 ADMIN) | - | Pending |
| IGR-13 | P1: Leaders (schema) | - | Pending |
| IGR-14 | P1: Leaders (select) | - | Pending |
| IGR-15 | P1: Leaders (write) | - | Pending |
| IGR-16 | P1: Leaders (POST 201) | - | Pending |
| IGR-17 | P1: Leaders (POST 404 igreja) | - | Pending |
| IGR-18 | P1: Leaders (PATCH 200) | - | Pending |
| IGR-19 | P1: Leaders (PATCH INATIVO) | - | Pending |
| IGR-20 | P1: Leaders (foto 200) | - | Pending |
| IGR-21 | P1: Leaders (foto rejeitada) | - | Pending |
| IGR-22 | P2: Portal (render leaders) | - | Pending |
| IGR-23 | P2: Portal (empty state) | - | Pending |
| IGR-24 | P2: Portal (anchor/nav) | - | Pending |
| IGR-25 | P2: Portal (photo_url não exposta) | - | Pending |

**Coverage:** 25 total, 0 mapped to tasks, 25 unmapped ⚠️

## External Interfaces

- **Público**: seção `#lideranca` na home (renderizada no servidor, leitura via RLS `anon`).
- **Admin**: `/admin/lideranca` (lista), `/admin/lideranca/nova`, `/admin/lideranca/[id]` (detalhe/edição).
- **API**: `POST`/`GET` `/api/admin/igrejas`; `PATCH`/`DELETE` `/api/admin/igrejas/[id]`; `POST` `/api/admin/igrejas/[id]/lideres`; `PATCH` `/api/admin/lideres/[id]`; `POST` `/api/admin/lideres/[id]/foto`.
- **Storage**: bucket `fotos-lideranca`.

## Non-Functional Acceptance Criteria

- **Nível de segurança**: negativas de RBAC registradas no log do servidor (`negarPermissao`).
- **Gates determinísticos**: `validate_spec.py`, `validate_tasks.py`, `validate_state.py`, `check_commit.py`, lint/typecheck/build.
- **Verificação**: probes `scripts/probes-admin-lideranca.sh` discriminando por papel (escritor `igrejas` vs leitor vs `MEMBRO`), regressões `probes-admin-membros.sh`, `probes-painel.sh`, `probes-auth.sh`; sensor de mutação (máx. 3 iterações).