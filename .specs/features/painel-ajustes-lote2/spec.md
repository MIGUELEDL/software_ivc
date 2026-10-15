# Ajustes Painel — Lote 2 Specification

## Problem Statement

Quatro lacunas funcionais: (1) lançamentos sempre PENDENTE sem poder trocar;
(2) resumo do dashboard diverge do financeiro (inclui CANCELADO, sem período
explícito); (3) membros sem foto no cadastro/edição admin; (4) landing ignora
`settings` do banco (só slogan/schedule chegam; resto é constants).

## Goals

- [ ] Status PENDENTE/CONCILIADO/CANCELADO selecionável ao criar e editar
- [ ] Resumo do dashboard consistente com o financeiro + período rotulado
- [ ] Foto no cadastro (pós-create) e na edição de membro
- [ ] Landing reflete `settings` (About/valores/redes/rodapé) com fallback

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Regras de transição de status | Backend já valida (CONCILIADO imutável etc.); só UI |
| Auditoria nova | Edits já auditados; upload de foto loga como editar |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Status no create | Select default PENDENTE; backend já aceita | Sem migração; validação existe | y |
| Status no edit | Select com os 3 (só PENDENTE editável, regra vigente) | Backend valida o resto | y |
| Resumo | Exclui CANCELADO + rótulo "este mês" | Alinha com a tela financeiro; escopo explícito | y |
| Foto membro | Novo endpoint admin `POST .../[id]/foto` (service-role, padrão lideres) + campo no cadastro (upload pós-create) e botão na edição | Bucket `fotos-membros` já existe; sem RLS anon | y |
| Landing | Home passa props settings→componentes; fallback = constants (saída idêntica sem DB) | `obterConfiguracoes` já mescla DEFAULTS | y |

**Open questions:** none.

---

## User Stories

### P1: Status editável ⭐

**User Story**: As a financeiro, I want escolher o status ao criar/editar so that o fluxo reflita a realidade.

**Acceptance Criteria**:

1. WHEN criar lançamento THEN the system SHALL oferecer PENDENTE/CONCILIADO/CANCELADO (default PENDENTE) e persistir o escolhido. <!-- AJ-01 -->
2. WHEN editar lançamento PENDENTE THEN the system SHALL oferecer os 3 status e persistir via PATCH. <!-- AJ-02 -->

**Independent Test**: Criar CONCILIADO direto; editar PENDENTE→CANCELADO; filtros refletem.

### P1: Resumo consistente

**Acceptance Criteria**:

1. The dashboard SHALL excluir CANCELADO das receitas/despesas/saldo. <!-- AJ-03 -->
2. The card SHALL rotular o período ("este mês"). <!-- AJ-04 -->

### P1: Foto do membro

**Acceptance Criteria**:

1. WHEN criar membro com foto THEN the system SHALL criar e subir a foto (2 passos), exibindo-a no detalhe. <!-- AJ-05 -->
2. WHEN escolher nova foto na edição THEN the system SHALL substituir (upsert) e atualizar a exibição. <!-- AJ-06 -->
3. IF tipo/tamanho inválido THEN the system SHALL 400/413 com mensagem (padrão lideres). <!-- AJ-07 -->

### P1: Landing lê settings

**Acceptance Criteria**:

1. WHEN `settings` tem About/valores/redes THEN the system SHALL exibi-los no portal em vez das constants. <!-- AJ-08 -->
2. WHEN banco indisponível THEN the system SHALL exibir as constants (fallback idêntico ao atual). <!-- AJ-09 -->

**Independent Test**: Editar valor no admin → ver no portal; derrubar DB → portal igual a antes.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| AJ-01 | Status | Execute | Verified |
| AJ-02 | Status | Execute | Verified |
| AJ-03 | Resumo | Execute | Verified |
| AJ-04 | Resumo | Execute | Verified |
| AJ-05 | Foto | Execute | Verified |
| AJ-06 | Foto | Execute | Verified |
| AJ-07 | Foto | Execute | Verified |
| AJ-08 | Landing | Execute | Verified |
| AJ-09 | Landing | Execute | Verified |

**Coverage:** 10 total.
| AJ-10 | Mês (filtro em JS; LIKE inválido p/ DATE) | Verified | Verified |
