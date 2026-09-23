# Admin Dashboard Specification

## Problem Statement

O painel administrativo da IVC tem uma dashboard funcional com cards de navegacao e resumo financeiro basico, mas carece de visibilidade operacional — o lider nao sabe de relance quantos membros, eventos, igrejas ou documentos existem, nem quais foram as ultimas acoes realizadas no painel. Hoje e necessario navegar em cada modulo para ter essas informacoes.

## Goals

- [ ] Metric cards com contagens (Membros, Eventos, Igrejas, Patrimonio, Documentos, Usuarios)
- [ ] Feed de atividade com itens recentes de cada modulo
- [ ] Resumo financeiro expandido com top categorias e total mensal
- [ ] Layout grid compacto responsivo (2-3 colunas)
- [ ] Cards de metricas com links para os modulos correspondentes

## Out of Scope

| Feature | Reason |
| --------- | -------------- |
| Graficos/charts | Requer lib nova; MVP com numbers/badges |
| Alertas/notificacoes | Requer sistema de push ou polling; iteracao futura |
| Quick actions | Nice-to-have; pode ser adicionado iterativamente |
| Audit log centralizado | RF-030 e feature separada |
| Real-time updates | Dashboard e RSC; refresh manual ou auto-refresh futuro |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | --------------- | --------- | ---------- |
| Feed de atividade: usa dados existentes (sem tabela nova) | 5 membros + 5 transacoes + 5 eventos mais recentes por created_at | Evita migration; volume baixo (AD-001); audit log e RF-030 | y |
| Contagens: usa .length nas listagens existentes | Chama listMembros(), listarEventos(), etc. e conta .length | Sem migration; volume baixo | y |
| Layout: grid responsivo 2-3 colunas | grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 | Padrao mobile-first do projeto | y |
| Metricas visiveis para todos os admin roles | authAdmin('dashboard') para leitura | Dashboard e landing page do admin | y |
| Financeiro expandido: top 3 categorias + total mensal | Mostra categorias com maior valor + receitas/despesas do mes atual | Mes corrente e suficiente | y |

**Open questions:** none.

---

## User Stories

### P1: Metric cards com contagens

**User Story**: As an ADMIN, I want to see key metrics at a glance so that I understand the church's current state without navigating each module.

**Why P1**: The core value of a dashboard — at-a-glance visibility into all modules.

**Acceptance Criteria**:

1. WHEN a user with `ler` on `dashboard` navigates to `/admin` THEN the system SHALL display 6 metric cards in a responsive grid: Membros, Eventos, Igrejas, Patrimonio, Documentos, Usuarios  <!-- event-driven -->
2. WHEN the metric cards render THEN each card SHALL show the module icon, module name, and numeric count  <!-- ubiquitous -->
3. WHEN a metric card is clicked THEN the system SHALL navigate to the corresponding module page  <!-- event-driven -->
4. WHEN a list result is empty THEN the metric card SHALL display "0"  <!-- event-driven -->
5. WHEN the metric cards are displayed on mobile THEN the system SHALL show a 2-column grid; on tablet/desktop 3-4 columns  <!-- ubiquitous -->

### P2: Feed de atividade

**User Story**: As an ADMIN, I want to see the latest actions performed in the system so that I stay informed without checking each module.

**Why P2**: Activity visibility helps leaders track what is happening without manual checking.

**Acceptance Criteria**:

6. WHEN a user with `ler` on `dashboard` views the dashboard THEN the system SHALL display an "Atividade Recente" section with up to 10 most recent items across all modules  <!-- event-driven -->
7. WHEN an activity item is a new member THEN it SHALL show the member name, status badge, and relative timestamp  <!-- event-driven -->
8. WHEN an activity item is a financial transaction THEN it SHALL show the type (Receita/Despesa), value, and relative timestamp  <!-- event-driven -->
9. WHEN an activity item is a new event THEN it SHALL show the event title, date, and relative timestamp  <!-- event-driven -->
10. WHEN the activity feed is empty THEN the system SHALL display "Nenhuma atividade recente"  <!-- event-driven -->
11. WHEN activity items are from different modules THEN the feed SHALL be ordered by created_at desc, interleaving items from all modules  <!-- ubiquitous -->

### P3: Financeiro expandido

**User Story**: As an ADMIN, I want an expanded financial summary showing top spending categories and monthly totals.

**Why P2**: The current financial summary is minimal; expanding it provides actionable insight.

**Acceptance Criteria**:

12. WHEN a user with `ler` on `dashboard` views the dashboard THEN the system SHALL display a "Resumo Financeiro" section with: total Receitas, total Despesas, Saldo, and top 3 categories by value  <!-- event-driven -->
13. WHEN the financial summary is displayed THEN each category SHALL show its name and total value  <!-- event-driven -->
14. WHEN there are fewer than 3 categories THEN the system SHALL display only the available ones  <!-- event-driven -->
15. WHEN the current month has no transactions THEN the system SHALL display "R$ 0,00" for all values  <!-- event-driven -->

### P4: Integracao dashboard e RBAC

**User Story**: As an ADMIN, I want the dashboard to be consistent with the rest of the panel's access control.

**Acceptance Criteria**:

16. WHEN an unauthenticated user navigates to `/admin` THEN the system SHALL redirect to `/login/admin` (existing proxy behavior)  <!-- event-driven -->
17. WHEN a user without `dashboard:ler` navigates to `/admin` THEN the system SHALL show the access-denied block  <!-- event-driven -->
18. WHEN a MEMBRO user navigates to `/admin` THEN the proxy SHALL redirect to `/login/admin` (existing)  <!-- event-driven -->
19. The system SHALL display the user's email and role below the metric cards  <!-- ubiquitous -->
20. WHEN the user clicks "Sair" THEN the system SHALL logout and redirect to `/login/admin`  <!-- event-driven -->

## Edge Cases

- Todos os modulos vazios (0 membros, 0 eventos, etc.) → metric cards mostram "0", feed mostra "Nenhuma atividade recente", financeiro mostra "R$ 0,00".
- Modulo com erro de conexao → metric card mostra "—" (dash) em vez de crashar.
- Transacoes sem categoria → agrupadas em "Sem categoria" no top 3.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| DASH-01 | P1: 6 metric cards com contagens em grid responsivo | Design | Pending |
| DASH-02 | P1: Cada card com icon + nome + count numerico | Design | Pending |
| DASH-03 | P1: Cards clicaveis para modulos | Design | Pending |
| DASH-04 | P1: Count "0" quando modulo vazio | Design | Pending |
| DASH-05 | P1: Grid 2 colunas mobile, 3-4 desktop | Design | Pending |
| DASH-06 | P2: Feed "Atividade Recente" com ate 10 itens | Design | Pending |
| DASH-07 | P2: Item membro: nome + status badge + timestamp | Design | Pending |
| DASH-08 | P2: Item transacao: tipo + valor + timestamp | Design | Pending |
| DASH-09 | P2: Item evento: titulo + data + timestamp | Design | Pending |
| DASH-10 | P2: Empty state "Nenhuma atividade recente" | Design | Pending |
| DASH-11 | P2: Feed ordenado por created_at desc, interleaving modulos | Design | Pending |
| DASH-12 | P3: Secao "Resumo Financeiro" com Receitas/Despesas/Saldo + top 3 categorias | Design | Pending |
| DASH-13 | P3: Categoria mostra nome + valor total | Design | Pending |
| DASH-14 | P3: Menos de 3 categorias → mostra so as disponíveis | Design | Pending |
| DASH-15 | P3: Sem transacoes no mes → "R$ 0,00" | Design | Pending |
| DASH-16 | P4: Redirect unauthenticated → /login/admin | Design | Pending |
| DASH-17 | P4: Denied-block sem dashboard:ler | Design | Pending |
| DASH-18 | P4: MEMBRO redirect via proxy | Design | Pending |
| DASH-19 | P4: Email + role do usuario | Design | Pending |
| DASH-20 | P4: Botao Sair com logout | Design | Pending |

**Coverage:** 20 total, 0 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] ADMIN ve 6 metric cards com contagens reais de cada modulo
- [ ] Feed de atividade mostra ultimas acoes de membros, transacoes e eventos
- [ ] Resumo financeiro mostra receitas, despesas, saldo e top 3 categorias
- [ ] Layout responsivo: 2 colunas mobile, 3-4 desktop
- [ ] RBAC consistente: unauthenticated 401, sem permissão denied-block
- [ ] Todos os gates passam: lint, typecheck, build, probes
