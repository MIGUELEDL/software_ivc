# Ajustes UI Batch — Landing Page, Admin Panel, Membros, Relatórios

## Problem Statement

A landing page e o painel administrativo possuem inconsistências visuais (logos com bordas desnecessárias, tamanhos despadronizados), login sem dark theme, formulários admin com tema claro, eventos com status ATIVO/INATIVO ao invés de EM ABERTO/CONCLUIDO, cartão de membro com dados insuficientes, relatórios CSV ao invés de PDF, e dados hardcoded que deveriam vir do banco. Este batch resolve todas essas pendências de uma vez.

## Goals

- [ ] Padronizar logos (sem bordas, tamanho 48px navbar, 48px footer)
- [ ] Criar favicon dedicado maior
- [ ] Aplicar dark theme no login (membro + admin)
- [ ] Aplicar dark theme nos forms de eventos
- [ ] Trocar status eventos ATIVO/INATIVO → EM ABERTO/CONCLUIDO (migration + code)
- [ ] Redesenhar cartão de membro com cores da igreja + dados completos (RG, CPF, batismo, validade)
- [ ] Adicionar filtro de aniversário na listagem admin de membros
- [ ] Remover campo Sigla do form de igrejas, tornar CNPJ opcional
- [ ] Auto-numeração patrimônio (PAT-0001) + botão excluir
- [ ] Trocar labels RECEITA/DESPESA → ENTRADA/SAÍDA + filtro método pagamento + saldo mensal
- [ ] Exportar PDF ao invés de CSV nos relatórios
- [ ] Renomear labels "Pastor" → "Pastor Presidente", "Missão" → "Propósito"
- [ ] Integrar landing page com dados do banco (horários, PIX, slogan)
- [ ] Corrigir fundo branco do PixDonation

## Out of Scope

| Feature | Reason |
|---------|--------|
| Reescrita completa do design system | Batch de ajustes, não refactoring |
| Sistema de impressão de cartão | Usar print CSS existente |
| Multi-tenant | Escopo single temple (AD-001) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|----------------------|----------------|-----------|------------|
| Navbar logo 48px | 48x48 | Padronização com footer | Sim (decisão do usuário) |
| PDF via jspdf | jspdf | Mais leve, server-side sem React | Sim (decisão do usuário) |
| Validade cartão 1 ano da emissão | Emissão + 365 dias | Controle mais natural | Sim (decisão do usuário) |
| RG/CPF em members | Colunas na tabela members | Mais simples, queries diretas | Sim (decisão do usuário) |
| Login dark theme usa mesmas cores do admin | bg-[#0a1628], card bg-[#132744] | Consistência visual | Sim (implícito no prompt) |
| Eventos status migration usa CHECK constraint | Recriar CHECK com novos valores | Manter integridade referencial | Sim (detalhado no prompt) |
| Filtros financeiro mantêm server-side GET pattern | Chips via next/link, busca via GET form | Padrão existente (AD-016) | Sim (padrão existente) |

**Open questions:** All resolved above — no pending decisions.

---

## User Stories

### P1: Landing Page — Logos, Favicon, PixDonation Fix ⭐ MVP

**User Story**: As a visitor, I want consistent logos without decorative borders and a proper favicon so the site looks professional.

**Acceptance Criteria**:

1. WHEN the Hero renders THEN the logo SHALL NOT have `border-2 border-accent/50` class
2. WHEN the Footer renders THEN the logo SHALL NOT have `border border-accent/50` class
3. WHEN the Navbar renders THEN the logo SHALL be 48x48 pixels
4. WHEN the browser loads the site THEN a `/favicon.png` file SHALL be served as favicon
5. WHEN PixDonation renders THEN both QR and code cards SHALL have `bg-[#132744]` background (not white)
6. WHEN PixDonation renders THEN text colors SHALL be white/white-variants for contrast

**Independent Test**: Visual inspection — no gold borders on logos, 48px navbar logo, dark PixDonation cards.

---

### P2: Login — Dark Theme

**User Story**: As a member/admin, I want the login page to match the admin dark theme for visual consistency.

**Acceptance Criteria**:

1. WHEN the login page renders THEN the background SHALL be `bg-[#0a1628]`
2. WHEN the login card renders THEN it SHALL have `bg-[#132744] border border-white/10 rounded-xl`
3. WHEN input fields render THEN they SHALL have `bg-[#0d1f3c] border border-white/10 text-white`
4. WHEN labels render THEN they SHALL have `text-white/70`
5. WHEN the submit button renders THEN it SHALL have `bg-[#c9a84c] hover:bg-[#e0c872] text-[#0d1f3c]`
6. WHEN the login page renders THEN the church logo SHALL appear at the top of the card
7. WHEN the title renders THEN it SHALL have `text-white`

**Independent Test**: Navigate to /login and /login/admin — both show dark theme with logo.

---

### P3: Eventos — Dark Theme Forms + Status EM ABERTO/CONCLUIDO

**User Story**: As an admin, I want event forms in dark theme and status labels that reflect "EM ABERTO" (open) and "CONCLUIDO" (completed) instead of ATIVO/INATIVO.

**Acceptance Criteria**:

1. WHEN the event creation form renders THEN it SHALL use dark theme classes (bg-[#132744] card, dark inputs)
2. WHEN the event edit form renders THEN it SHALL use dark theme classes
3. WHEN the events list renders THEN status badges SHALL show "EM ABERTO" (green) and "CONCLUIDO" (gray)
4. WHEN the database migration runs THEN the `events.status` CHECK constraint SHALL accept 'EM ABERTO' and 'CONCLUIDO'
5. WHEN existing events have status 'ATIVO' THEN they SHALL be updated to 'EM ABERTO'
6. WHEN existing events have status 'INATIVO' THEN they SHALL be updated to 'CONCLUIDO'
7. WHEN the EventoStatus type is used THEN it SHALL be `"EM ABERTO" | "CONCLUIDO"`
8. WHEN the edit form shows status THEN it SHALL display "EM ABERTO" and "CONCLUIDO" labels

**Independent Test**: Create/edit events — forms are dark, status shows EM ABERTO/CONCLUIDO.

---

### P4: Config — Labels + Integração Landing Page

**User Story**: As an admin, I want correct labels ("Pastor Presidente", "Propósito") and the landing page to read data from the database.

**Acceptance Criteria**:

1. WHEN the config form renders THEN "Pastor" label SHALL be "Pastor Presidente"
2. WHEN the config form renders THEN "Missão" label SHALL be "Propósito"
3. WHEN Schedule component renders THEN it SHALL call `obterConfiguracoes()` and use DB schedule items
4. WHEN PixDonation renders THEN it SHALL read PIX key from `obterConfiguracoes()`
5. WHEN Hero renders THEN slogan SHALL come from `obterConfiguracoes()` when available
6. WHEN constants.ts is checked THEN it SHALL remain as fallback (no deletion)

**Independent Test**: Change schedule/PIX/slogan in config → landing page reflects changes.

---

### P5: Templos — Form Ajustes

**User Story**: As an admin, I want to create churches without being forced to fill Sigla and CNPJ.

**Acceptance Criteria**:

1. WHEN the church creation form renders THEN the "Sigla" (short_name) field SHALL NOT be present
2. WHEN the CNPJ field renders THEN it SHALL NOT have `required` attribute
3. WHEN the church creation form renders THEN it SHALL use dark theme classes

**Independent Test**: Create a church with only name, address, city — succeeds without Sigla/CNPJ.

---

### P6: Patrimônio — Auto-numeração + Exclusão

**User Story**: As an admin, I want assets to auto-generate sequential patrimony numbers and be deletable.

**Acceptance Criteria**:

1. WHEN a new asset is created THEN `numero_patrimonio` SHALL be auto-generated as PAT-NNNN (sequential)
2. WHEN the next patrimony number is requested THEN an RPC `proximo_patrimonio()` SHALL return the next value
3. WHEN DELETE /api/admin/assets/[id] is called THEN the asset SHALL be hard-deleted (RLS: ADMIN/SUPER_ADMIN only)
4. WHEN the assets list renders THEN each row SHALL have an "Excluir" button (ADMIN/SUPER_ADMIN only)
5. WHEN "Excluir" is clicked THEN a confirmation dialog SHALL appear before deletion

**Independent Test**: Create asset → auto-numbered PAT-XXXX. Delete asset → removed from list.

---

### P7: Financeiro — Filtros + Saldo Mensal + Labels

**User Story**: As an admin, I want ENTRADA/SAÍDA labels, payment method filter, and monthly balance summary.

**Acceptance Criteria**:

1. WHEN the financeiro list renders THEN type chips SHALL show "ENTRADA" and "SAÍDA" (not RECEITA/DESPESA)
2. WHEN a transaction badge renders THEN tipo field SHALL display "ENTRADA" or "SAÍDA"
3. WHEN the financeiro page renders THEN a payment method filter SHALL be available (PIX, CARTAO, DINHEIRO, TRANSFERENCIA)
4. WHEN filters are applied THEN the payment method filter SHALL be cumulative with existing filters
5. WHEN the financeiro page renders THEN a "Saldo do Mês" section SHALL show (total ENTRADAs - total SAÍDAs) for the filtered month
6. WHEN TipoLancamento type is used THEN it SHALL be `"ENTRADA" | "SAIDA"` (or display mapping applied)

**Independent Test**: Financeiro page shows ENTRADA/SAÍDA labels, method filter works, saldo updates.

---

### P8: Membros — Cartão Redesign + Filtro Aniversário

**User Story**: As a member, I want a complete membership card with my photo, name, matricula, RG, CPF, baptism date, and card validity. As an admin, I want to filter members by birth month.

**Acceptance Criteria**:

1. WHEN the MemberCard renders THEN it SHALL show: Photo, Nome, Matrícula, RG, CPF, Data de Batismo, Validade do Cartão
2. WHEN the MemberCard renders THEN colors SHALL use primary (#1a3a6b) and accent (#c9a84c)
3. WHEN the cartão page renders THEN only ADMIN, SUPER_ADMIN, SECRETARIA roles SHALL see print/update buttons
4. WHEN the admin members list renders THEN a birth month filter SHALL be available
5. WHEN the birth month filter is applied THEN only members born in that month SHALL be shown
6. WHEN the members table has rg, cpf, data_batismo, validade_cartao columns THEN they SHALL be populated

**Independent Test**: View cartão → shows all 7 fields. Filter by birth month → filtered results.

---

### P9: Relatórios — PDF Export

**User Story**: As an admin, I want to export reports as PDF instead of CSV for professional presentation.

**Acceptance Criteria**:

1. WHEN the export endpoint is called with `format=pdf` THEN a PDF document SHALL be generated
2. WHEN the PDF is generated THEN it SHALL have IVC header, date, applied filters, data table, and totals footer
3. WHEN the export page renders THEN format options SHALL include PDF (and optionally keep CSV)
4. WHEN jspdf is used THEN it SHALL be added as a dependency
5. WHEN the PDF contains PT-BR text THEN special characters SHALL render correctly

**Independent Test**: Export financeiro report as PDF → valid PDF with header, table, totals.

---

## Edge Cases

- IF a member has no RG/CPF THEN the card SHALL show "—" for those fields
- IF the PIX key is not configured THEN PixDonation SHALL fallback to constants.ts value
- IF schedule items are empty in DB THEN Schedule component SHALL fallback to constants.ts
- IF asset deletion fails (FK constraint) THEN the API SHALL return 409 with descriptive error
- IF PDF export fails THEN the API SHALL return 500 with error message
- IF no transactions exist for the month THEN saldo SHALL show R$ 0,00

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---------------|-------|-------|--------|
| AJUSTE-01 | P1: Logos/Favicon | Design | Pending |
| AJUSTE-02 | P1: PixDonation Fix | Design | Pending |
| AJUSTE-03 | P2: Login Dark Theme | Design | Pending |
| AJUSTE-04 | P3: Event Forms Dark Theme | Design | Pending |
| AJUSTE-05 | P3: Status EM ABERTO/CONCLUIDO | Design | Pending |
| AJUSTE-06 | P4: Config Labels | Design | Pending |
| AJUSTE-07 | P4: Landing Integration | Design | Pending |
| AJUSTE-08 | P5: Templos Form | Design | Pending |
| AJUSTE-09 | P6: Patrimonio Auto-number | Design | Pending |
| AJUSTE-10 | P6: Patrimonio Delete | Design | Pending |
| AJUSTE-11 | P7: Financeiro Labels | Design | Pending |
| AJUSTE-12 | P7: Financeiro Filters | Design | Pending |
| AJUSTE-13 | P7: Financeiro Saldo | Design | Pending |
| AJUSTE-14 | P8: Member Card Redesign | Design | Pending |
| AJUSTE-15 | P8: Birth Month Filter | Design | Pending |
| AJUSTE-16 | P9: PDF Export | Design | Pending |

**Coverage:** 16 total, 0 mapped to tasks, 16 unmapped ⚠️

---

## Success Criteria

- [ ] All logos consistent (48px, no borders) across Navbar/Footer
- [ ] Login pages show dark theme matching admin panel
- [ ] Event status uses EM ABERTO/CONCLUIDO with proper migration
- [ ] Member card shows 7 fields with church colors
- [ ] Financeiro shows ENTRADA/SAÍDA with saldo mensal
- [ ] Reports export as PDF with IVC branding
- [ ] Config labels corrected (Pastor Presidente, Propósito)
- [ ] Landing page reads dynamic data from database
- [ ] PixDonation has dark background
- [ ] Church form simplified (no Sigla, optional CNPJ)
- [ ] Assets auto-numbered and deletable
- [ ] All gates pass: lint, typecheck, build
