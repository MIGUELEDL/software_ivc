# Admin Financeiro Specification

## Problem Statement

A igreja Virtude Cristã precisa de um módulo financeiro no painel administrativo para registrar receitas (dízimos, ofertas, doações PIX) e despesas (contas, manutenção), receber notificações automáticas via webhook do Mercado Pago, e realizar fechamentos periódicos de caixa com conciliação. Hoje não há nenhum registro estruturado das finanças — a liderança depende de planilhas manuais e WhatsApp.

## Goals

- [ ] Cadastro manual de receitas e despesas com validação por campo
- [ ] Recebimento de notificações PIX via webhook Mercado Pago (stub, sem credenciais reais)
- [ ] Fechamento de caixa periódico com totais automáticos
- [ ] Controle de acesso via RBAC (FINANCEIRO escreve; outros papéis com permissão lêem)

## Out of Scope

| Feature | Reason |
| --------- | -------------- |
| Cartão de crédito | PIX apenas no MVP (AD-009); cartão entra em iteração futura quando CNPJ/MP estiver pronto |
| Dashboard financeiro com gráficos | RF-021 dashboard já tem cards; gráficos ficam para iteração futura |
| Relatórios financeiros exportáveis | RF-027 relatórios é feature separada |
| Gateway de pagamento dinâmico | QR PIX é estático (doacao-pix); cobranças dinâmicas ficam para iteração futura |
| Notificações por e-mail ao doador | Fora do escopo do módulo financeiro |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | --------------- | --------- | ---------- |
| Webhook MP sem validação de assinatura (stub) | Aceitar todos os POSTs, logar evento, criar/atualizar transação | Credenciais MP não estão disponíveis (R-003); stub permite estrutura pronta para plugar assinatura real depois | y (decisão do usuário) |
| Fechamento de caixa é periódico manual (não automático) | FINANCEIRO clica "Fechar caixa"; sistema agrega transações CONCILIADO do período | volume baixo (~30 lançamentos/mês); automação seria overhead | y (decisão do usuário) |
| Transações do portal (QR PIX estático) não fluem automaticamente para o módulo financeiro | Webhook MP é a ponte; sem webhook, registros são manuais | QR estático sem webhook = sem notificação automática; financeiro entra quando MP estiver configurado | y (implícito em AD-009) |
| Status de transação: PENDENTE → CONCILIADO → (fechamento) ou CANCELADO | Transição unidirecional; CANCELADO só manualmente | Simplifica lógica de conciliação; soft-delete por CANCELADO | y (decisão do usuário) |
| Método de pagamento default MVP: PIX | Campo aceita PIX/CARTAO/DINHEIRO/TRANSFERENCIA mas MVP usa PIX | Prepara para iteração futura sem refatorar schema | y (AD-009) |
| Fechamento de caixa gera snapshot (não altera transações) | Registra totais do período; transações permanecem consultáveis | Histórico preservado; fechamento é relatório, não destruição | y (decisão do usuário) |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Cadastro manual de lançamentos financeiros ⭐ MVP

**User Story**: As a FINANCEIRO, I want to register income and expense entries manually so that the church has a structured financial record.

**Why P1**: Without manual entry, there is no financial data at all — the webhook only captures incoming PIX when MP is configured.

**Acceptance Criteria**:

1. WHEN a FINANCEIRO user navigates to `/admin/financeiro` THEN the system SHALL display a list of financial entries sorted by `data` descending with columns: descrição, valor, tipo (RECEITA/DESPESA), método, status, data  <!-- event-driven -->
2. WHEN a FINANCEIRO user clicks "Novo lançamento" THEN the system SHALL display a form with fields: descrição (text, required), valor (number ≥ 0, required), tipo (RECEITA|DESPESA, required), método (PIX|CARTAO|DINHEIRO|TRANSFERENCIA, required), data (date, required), categoria (optional text), observações (optional text)  <!-- event-driven -->
3. WHEN the form is submitted with all required fields valid THEN the system SHALL persist the transaction with status PENDENTE and return 201 with the created entry  <!-- event-driven -->
4. IF the description is empty, amount is negative, date is invalid, tipo is not RECEITA|DESPESA, or método is not PIX|CARTAO|DINHEIRO|TRANSFERENCIA THEN the system SHALL return 400 with `{ error: "dados_invalidos", campos: { <field>: "<message>" } }` for each invalid field  <!-- unwanted-behavior -->
5. WHEN a user with insufficient permissions (e.g., LIDER, MEMBRO) tries to create a transaction THEN the system SHALL return 403  <!-- unwanted-behavior -->
6. WHEN the user clicks on a transaction row THEN the system SHALL navigate to `/admin/financeiro/[id]` showing full details  <!-- event-driven -->
7. WHEN a FINANCEIRO user edits a PENDENTE transaction THEN the system SHALL allow partial updates (PATCH) to any field and return 200 with updated entry  <!-- event-driven -->
8. IF a user tries to edit a CONCILIADO transaction THEN the system SHALL return 400 with `{ error: "transacao_conciliada" }`  <!-- unwanted-behavior -->
9. WHEN a FINANCEIRO user cancels a PENDENTE transaction THEN the system SHALL set status to CANCELADO and return 200  <!-- event-driven -->
10. IF the transaction is already CONCILIADO or CANCELADO THEN the system SHALL return 400 with `{ error: "transacao_nao_cancelavel" }`  <!-- unwanted-behavior -->
11. WHEN a user queries a non-existent transaction THEN the system SHALL return 404 with `{ error: "nao_encontrado" }`  <!-- unwanted-behavior -->
12. THE system SHALL enforce RLS via `can_access('financeiro', ...)` — SELECT for roles with `ler`, INSERT/UPDATE for `escrever`, no DELETE policy (soft-delete by CANCELADO)  <!-- ubiquitous -->

**Independent Test**: Login as FINANCEIRO, create a receita (descrição="Dízimo半导体", valor=100, tipo=RECEITA, método=PIX, data=2026-09-15), verify 201 + entry appears in list. Try create with valor=-1 → 400. Try create as LIDER → 403.

---

### P2: Webhook Mercado Pago (stub)

**User Story**: As the system, I want to receive and process PIX payment notifications from Mercado Pago so that incoming donations are automatically recorded.

**Why P2**: Automates recording of PIX donations when MP is configured; stub now, real later.

**Acceptance Criteria**:

13. WHEN a POST arrives at `/api/webhooks/mercadopago` with a valid JSON body THEN the system SHALL log the event to `webhook_events` table and return 200 with `{ ok: true }`  <!-- event-driven -->
14. WHEN the same webhook event ID is received again (duplicate) THEN the system SHALL return 200 without creating a duplicate record (idempotent)  <!-- event-driven -->
15. IF the POST body is not valid JSON THEN the system SHALL return 400 with `{ error: "payload_invalido" }`  <!-- unwanted-behavior -->
16. WHEN the webhook indicates a payment with status "approved" THEN the system SHALL create a transaction (tipo=RECEITA, método=PIX, status=CONCILIADO) if no matching `external_reference` exists, or update the existing transaction status to CONCILIADO  <!-- event-driven -->
17. WHEN the webhook indicates a payment with status other than "approved" THEN the system SHALL log the event but NOT create/update a transaction  <!-- event-driven -->
18. THE webhook endpoint SHALL NOT require authentication (it is called by Mercado Pago's servers) but SHALL validate the event structure  <!-- ubiquitous -->
19. THE system SHALL store the raw payload in `webhook_events` for auditability  <!-- ubiquitous -->

**Independent Test**: `curl -X POST /api/webhooks/mercadopago -d '{"id":"evt-123","data":{"id":"pay-456"},"type":"payment","action":"payment.created"}' -H 'Content-Type: application/json'` → 200. Repeat with same id → 200 (no duplicate). POST with invalid JSON → 400.

---

### P3: Fechamento de caixa

**User Story**: As a FINANCEIRO, I want to close a cash period so that reconciled transactions are snapshotted and the period is finalized.

**Why P3**: Provides periodic financial control and prevents post-close modifications to reconciled data.

**Acceptance Criteria**:

20. WHEN a FINANCEIRO user navigates to `/admin/financeiro/fechamento` THEN the system SHALL display a list of previous cash closes with date, totals, and status  <!-- event-driven -->
21. WHEN a FINANCEIRO user clicks "Fechar caixa" THEN the system SHALL calculate and display a preview: total receitas (CONCILIADO only), total despesas (CONCILIADO only), saldo, count of PENDENTE transactions (informational)  <!-- event-driven -->
22. WHEN the user confirms the cash close THEN the system SHALL create a `cash_close` record with the snapshot totals and mark all included CONCILIADO transactions with `cash_close_id`  <!-- event-driven -->
23. IF there are no CONCILIADO transactions to close THEN the system SHALL return 400 with `{ error: "sem_transacoes_para_fechar" }`  <!-- unwanted-behavior -->
24. WHEN a cash close is created THEN the system SHALL NOT allow editing or deleting the cash close record  <!-- ubiquitous -->
25. THE system SHALL enforce RLS: only users with `can_access('financeiro', 'escrever')` can create cash closes; all users with `can_access('financeiro', 'ler')` can view them  <!-- ubiquitous -->

**Independent Test**: Create 2 RECEITA entries (status=CONCILIADO), 1 DESPESA (status=PENDENTE), click "Fechar caixa" → preview shows receitas total, despesas=0, saldo. Confirm → cash_close record created with correct totals. PENDENTE transaction not included.

---

### P4: Listagem e filtros

**User Story**: As a user with financeiro read access, I want to filter and search financial entries so that I can find specific transactions quickly.

**Why P4**: With 30+ entries/month, unfiltered lists become unusable fast.

**Acceptance Criteria**:

26. WHEN the user accesses `/admin/financeiro` THEN the system SHALL support filtering by: tipo (RECEITA/DESPESA/both), status (PENDENTE/CONCILIADO/CANCELADO/both), período (data início/fim), and text search on descrição  <!-- event-driven -->
27. WHEN no filters are applied THEN the system SHALL show all transactions sorted by `data` descending  <!-- event-driven -->
28. WHEN filters are applied THEN the system SHALL apply them cumulatively and update the list without page reload  <!-- event-driven -->
29. WHEN the filtered result is empty THEN the system SHALL display "Nenhum lançamento encontrado"  <!-- event-driven -->

**Independent Test**: Create 3 entries (2 RECEITA, 1 DESPESA). Filter by DESPESA → only 1 shown. Filter by RECEITA + status PENDENTE → 2 shown (if both PENDENTE). Clear filters → all 3 shown.

---

### P5: Seed e dados iniciais

**User Story**: As a developer, I want seed data so that the module can be tested immediately after migration.

**Why P5**: Enables probe testing and demo without manual data entry.

**Acceptance Criteria**:

30. THE migration SHALL include an idempotent seed with at least one RECEITA entry (Dízimo半导体 seed, valor=100, método=PIX, status=PENDENTE) and one DESPESA entry (Aluguel seed, valor=500, status=PENDENTE)  <!-- ubiquitous -->
31. THE seed SHALL include a test user `financeiro.teste@ivc.local` with role FINANCEIRO in `auth.users` and a corresponding row in `members` (if needed for FK)  <!-- ubiquitous -->

---

## Edge Cases

- IF a transaction has valor=0 THEN the system SHALL accept it (zero-value transactions are valid, e.g., a donation确认 with no amount)
- IF the webhook payload contains an `external_reference` matching an existing PENDENTE transaction THEN the system SHALL update status to CONCILIADO (not create duplicate)
- IF two cash closes overlap in period THEN the system SHALL allow it (no uniqueness constraint on periods — manual control)
- IF a CONCILIADO transaction is part of a cash_close THEN it SHALL still be viewable but not editable
- WHEN the server is down during webhook receipt THEN Mercado Pago will retry — idempotency on event_id prevents duplicates

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| FIN-01 | P1: CRUD lançamentos | Design | Pending |
| FIN-02 | P1: Validação por campo | Design | Pending |
| FIN-03 | P1: RBAC escritor/leitor | Design | Pending |
| FIN-04 | P1: RLS can_access('financeiro') | Design | Done (T1 — migration 0014: policies transactions/cash_closes, sem DELETE) |
| FIN-05 | P1: Soft-delete (CANCELADO) | Design | Pending |
| FIN-06 | P2: Webhook MP stub | Design | Pending |
| FIN-07 | P2: Idempotência webhook | Design | Pending |
| FIN-08 | P2: Criação automática de transação | Design | Pending |
| FIN-09 | P3: Fechamento de caixa | Design | Pending |
| FIN-10 | P3: Snapshot de totais | Design | Pending |
| FIN-11 | P4: Filtros e busca | Design | Pending |
| FIN-12 | P5: Seed dados iniciais | Design | Done (T1 — migration 0014: seeds RECEITA/DESPESA + financeiro.teste) |

**Coverage:** 12 total, 0 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] FINANCEIRO can create, view, edit, and cancel financial entries via admin UI
- [ ] Webhook endpoint accepts POST, logs event, creates/updates transaction idempotently
- [ ] Cash close snapshots reconciled transactions with correct totals
- [ ] Non-FINANCEIRO roles get 403 on write operations; anon gets 401
- [ ] All gates pass: lint, typecheck, build, probe suite (static + runtime)
