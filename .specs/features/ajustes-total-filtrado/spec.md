# ajustes-total-filtrado Specification

## Problem Statement

Após o fechamento do lote 4, o operador solicitou duas mudanças no bloco TOTAL das listagens do admin: (1) o número deve refletir o **resultado do filtro ativo** — se a filtragem retorna N linhas, TOTAL mostra N — revertendo a decisão B do lote4 (total geral ignorando filtros); (2) o design atual "está estranho" (bloco solto acima do card com `mb-4`) e deve seguir o padrão do módulo **Usuários**, onde o bloco fica embutido no cabeçalho do card da tabela (`p-4 border-b border-white/10 flex items-center justify-between`), que o operador aprovou visualmente.

## Goals

- [x] Nas 5 listagens filtradas (membros, financeiro, auditoria, usuários, relatórios) o número do TOTAL é a contagem do resultado do filtro ativo.
- [x] Nas 9 listagens o bloco TOTAL vive no cabeçalho do card da tabela, no mesmo padrão visual do módulo usuários.
- [x] Listas vazias mostram TOTAL 0 no cabeçalho do card, com a mensagem de vazio abaixo (padrão usuários).
- [x] Falha de consulta continua omitindo o bloco (card de erro sem TOTAL).
- [x] Helpers de contagem global (`contarMembros`, `contarLancamentos`, `contarAuditoria`, `contarDocumentos`, `totalGeral`) removidos — código morto após a reversão.

## Out of Scope

- Paginação nova (auditoria mantém a existente; TOTAL de auditoria = total filtrado em todas as páginas, igual ao já exibido no rodapé "N registros").
- Mudanças em filtros/busca existentes.
- Módulo de permissões (matriz) — continua sem bloco.

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | --------------- | --------- | ---------- |
| Semântica do TOTAL | Reflete o resultado do filtro ativo (reversão da decisão B do lote4) | Pedido explícito do operador pós-teste em tela: "tem que se atualizar de acordo com as filtragens" | y (pedido direto) |
| Design | Padrão do módulo usuários: faixa `p-4 border-b … flex items-center justify-between` dentro do card da tabela, bloco à esquerda | Operador aprovou o layout de usuários ("ficou legal") e rejeitou o bloco solto ("está estranho") | y (pedido direto) |
| Estado vazio | TOTAL 0 na faixa do cabeçalho + mensagem de vazio no mesmo card (como usuários) | Consistência com o padrão-alvo | n — default do agente |
| Auditoria paginada | TOTAL = total filtrado (todas as páginas), consistente com o rodapé "N registros" já existente | Evita duas contagens divergentes na mesma tela | n — default do agente |
| Páginas sem filtro (eventos, patrimônio, liderança, fechamento) | Mesmo número de antes; só o design muda | Não há filtro que alterar | n — default do agente |
| Relatórios (h2 "Documentos") | h2 sai do corpo do card; faixa TOTAL vira o cabeçalho (usuários não tem título no card) | Seguir o padrão-alvo sem inventar variação | n — default do agente |
| Limpeza de código | Remover `contarMembros`/`contarLancamentos`/`contarAuditoria`/`contarDocumentos`/`totalGeral` e `contar.test.ts` | Ficam sem uso após a reversão; morte-viva atrapalha manutenção | n — default do agente |

**Open questions:** none - all resolved or logged above.

**Implicit-Requirement dimensions (Medium sweep):** sem novo estado persistente, sem chamadas externas novas, sem mudança de auth/RBAC (guards inalterados — só o número e a posição do bloco mudam); falha de consulta já coberta por TAB-07 (preservação de TAB-04); idempotência/concorrência/lifecycle N/A (renders puros de listagem existente).

---

## User Stories

### P1: TOTAL reflete o filtro ativo ⭐ MVP

**User Story:** Como operador do painel, quero que o TOTAL mostre a contagem do resultado filtrado para saber quantos itens o filtro retornou.

**Why P1**: Motivo direto do pedido — o número global mostrava 7 com a busca retornando 1, informação inútil para quem filtra.

**Acceptance Criteria**:

- WHEN uma filtragem (busca, status, mês, tipo, papel, categoria, período) está ativa numa listagem do admin, THEN o bloco TOTAL exibe a contagem dos registros retornados pelo filtro (não o total geral da tabela). **[TAB-05]**
- WHEN a auditoria está paginada com filtro ativo, THEN o TOTAL exibe o total filtrado em todas as páginas (consistente com o rodapé "N registros"). **[TAB-05]**
- WHEN nenhuma filtragem está ativa, THEN o TOTAL exibe a contagem completa da listagem. **[TAB-05]**

**Independent Tests**:

- Página membros com `q` ativo retornando 1 de 7 → TOTAL exibe 1 (não 7) — discrimina filtro vs total geral.
- Página usuários com filtro de papel FINANCEIRO retornando 2 de 3 → TOTAL exibe 2.
- Auditoria com `total=45` e 20 logs na página → TOTAL exibe 45.

### P1: Design padrão usuários ⭐ MVP

**User Story:** Como operador, quero o bloco TOTAL no cabeçalho do card da tabela (como em usuários) para leitura visual consistente.

**Why P1**: Motivo direto do pedido — o operador rejeitou o bloco solto e apontou o módulo usuários como referência aprovada.

**Acceptance Criteria**:

- THEN nas 9 listagens do admin o bloco TOTAL é renderizado dentro do card da tabela, na faixa `p-4 border-b … flex items-center justify-between` com o bloco à esquerda (mesmo padrão do módulo usuários). **[TAB-06]**
- WHEN a listagem está vazia (com ou sem filtro), THEN o card exibe a faixa TOTAL 0 seguida da mensagem de vazio dentro do mesmo card. **[TAB-06]**

**Independent Tests**:

- Página eventos com lista vazia → faixa TOTAL 0 presente no mesmo card da mensagem de vazio.
- Markup de qualquer listagem contém `p-4 border-b` no ancestral do `total-bloco` (faixa embutida, não bloco solto).

### P2: Omissão em falha (preservado)

**User Story:** Como operador, quero que a falha de consulta não finja um TOTAL 0.

**Why P2**: Preservação do comportamento TAB-04 do lote4 — a reversão não pode reabrir o "0 enganoso".

**Acceptance Criteria**:

- WHEN a consulta da listagem falha, THEN a página renderiza o card de erro **sem** o bloco TOTAL. **[TAB-07]**

**Independent Tests**:

- Página eventos com `listarEventos` rejeitando → card de erro sem `total-bloco`.

---

## Edge Cases

- Lista vazia com filtro ativo (busca sem resultado): TOTAL 0 + mensagem de vazio no mesmo card.
- Auditoria com filtro retornando mais que uma página: TOTAL = total filtrado global, não o tamanho do array da página corrente.
- Falha na consulta: card de erro sem strip (nenhuma contagem exibida).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| TAB-05 | TOTAL reflete filtro | Execute | Verified |
| TAB-06 | Design padrão usuários | Execute | Verified |
| TAB-07 | Omissão em falha | Execute | Verified |

**ID format:** `[CATEGORY]-[NUMBER]`
**Status values:** Pending → In Design → In Tasks → Implementing → Verified
**Coverage:** 3 total, 3 mapped to tasks (T1–T3), 0 unmapped

---

## Success Criteria

- [x] Membro com busca retornando N linhas mostra TOTAL N; usuários com papel filtrado mostra a contagem do papel; auditoria mostra o total filtrado paginado.
- [x] 9 listagens com faixa TOTAL embutida no card (padrão usuários); vazio = TOTAL 0 + mensagem no mesmo card.
- [x] Falha de consulta → card de erro sem TOTAL.
- [x] `contar*`/`totalGeral` inexistentes no codebase; `npm run lint`, `npm run typecheck`, `npm run test:ci` e `npm run build` verdes; gates SDD com 0 erros.
