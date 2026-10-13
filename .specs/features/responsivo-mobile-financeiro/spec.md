# Responsivo Mobile — Financeiro (Parte 2) Specification

## Problem Statement

O módulo Financeiro no mobile (360px) tem três defeitos funcionais: (1) busca +
datas se espremem na mesma linha (sobreposição); (2) `ml-4` nos rótulos
Status/Pagamento quebra os grupos de chips no meio; (3) a tabela de 6 colunas
é cortada (`overflow-hidden`) em vez de rolar. Desktop está correto e não muda.

## Goals

- [ ] Busca, datas e ações sem sobreposição em 360px
- [ ] Cada grupo de chips (Tipo/Status/Pagamento) em bloco próprio no mobile
- [ ] Tabela legível no mobile via scroll-x, sem corte
- [ ] Desktop pixel-idêntico; probes FIN verdes; zero texto/rota alterados

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Demais módulos admin | Slices seguintes, um por vez |
| Lógica de filtros/paginação | Só layout; comportamento intacto |
| Cores, textos, rotas | Intocáveis |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Estrutura dos filtros | Busca `col-span-2`, datas em grid-2, ações em linha própria; grupos com `w-full sm:w-auto` | Previsível em 360px, idêntico ≥640px | y |
| Tabela | Wrapper `overflow-x-auto` + `min-w-[720px]` | Padrão para tabelas densas; cards seriam redesign (fora do escopo) | y |
| Verificação | Frames do operador + probes FIN | Sem device farm | y |

**Open questions:** none.

---

## User Stories

### P1: Filtros utilizáveis ⭐ MVP

**User Story**: As a financeiro no celular, I want busca, datas e chips sem sobreposição so that filtrar funcione com o dedo.

**Acceptance Criteria**:

1. WHEN em 360px THEN the system SHALL exibir busca em linha própria, datas lado a lado e Filtrar/Limpar sem sobrepor. <!-- FINM-01 -->
2. WHEN em 360px THEN the system SHALL exibir cada grupo (Tipo/Status/Pagamento) em bloco próprio, sem rótulo isolado. <!-- FINM-02 -->
3. WHEN em ≥640px THEN the system SHALL manter o layout atual. <!-- FINM-03 -->

**Independent Test**: Frames 360px; todos os controles acionáveis sem zoom.

### P2: Tabela legível

**User Story**: As a financeiro no celular, I want rolar a tabela lateralmente so that nenhuma coluna seja cortada.

**Acceptance Criteria**:

1. WHEN em 360px THEN the system SHALL permitir scroll-x na tabela com todas as 6 colunas íntegras. <!-- FINM-04 -->
2. The probes FIN SHALL seguir verdes (textos/rotas intactos). <!-- FINM-05 -->

**Independent Test**: Arrastar a tabela no mobile; última coluna (Data) alcançável.

---

## Edge Cases

- IF 320px THEN sem overflow da página (só da tabela, com scroll). <!-- FINM-06 -->

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| FINM-01 | P1 | Execute | Pending |
| FINM-02 | P1 | Execute | Pending |
| FINM-03 | P1 | Execute | Pending |
| FINM-04 | P2 | Execute | Pending |
| FINM-05 | P2 | Execute | Pending |
| FINM-06 | Edge | Execute | Pending |

**Coverage:** 6 total, 0 mapped, 6 unmapped ⚠️

---

## Success Criteria

- [ ] 360px: filtros e tabela usáveis (frames do operador)
- [ ] Desktop idêntico; `probes-admin-financeiro.sh` sem falha nova
