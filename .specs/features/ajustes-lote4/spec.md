# ajustes-lote4 Specification

## Problem Statement

Após a aprovação visual do Lote 3, o usuário levantou 4 ajustes pendentes: nomes longos estouram a barra de identificação do cartão de membro; as tabelas do painel admin não mostram o total de registros; a página de detalhe do membro não exibe o e-mail cadastrado; e o fluxo de troca de senha não dá feedback de sucesso (pior: o rebote do `proxy.ts` devolve o usuário ao form porque a flag `force_password_change` só é limpa no banco, não na sessão).

## Goals

- [ ] Usuário que troca a senha vê a caixa de sucesso e chega ao portal (painel/admin) sem reenvio a `/trocar-senha`.
- [ ] As 9 listagens do painel admin exibem o bloco TOTAL com a contagem geral de registros, em qualquer estado de filtro/pesquisa.
- [ ] A página de detalhe do membro exibe o e-mail cadastrado.
- [ ] O cartão de membro acomoda nomes longos sem transbordar a barra nem alterar as dimensões ISO ID-1.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Matriz de permissões (admin/usuarios/permissoes) | Não é listagem de registros; usuário aprovou exclusão |
| Listagens fora do painel admin (painel do membro, landing) | Pedido restrito às tabelas do admin |
| Política de senha (AUTH-11) e fluxo "esqueci minha senha" | Inalterados; só o feedback pós-troca muda |
| Rota admin de redefinir-senha do membro (SEN-04/05) | Comportamento existente preservado |
| Redesign do cartão ou das tabelas além do bloco TOTAL | A base visual aprovada do usuário é o ponto de partida |
| Dashboard/cards sem `<table>` | Sem contagem tabular |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | --------------- | --------- | ---------- |
| Escopo do bloco TOTAL | 9 listagens: membros, eventos, financeiro, fechamento, auditoria, usuários, liderança, patrimônio, relatórios | Matriz de permissões não é listagem | y (discussão A) |
| Total com filtro/pesquisa/paginação ativos | Total geral de registros; filtro não altera o número | Usuário pediu "número exato do total de membros registrados" | y (discussão B) |
| Posição do bloco | Acima da tabela, alinhado à esquerda: rótulo "TOTAL" em cima, número embaixo | Interpretação direta de "lado esquerdo antes das colunas" | y (discussão C) |
| Caixa de sucesso | Caixa com botão de confirmação; MEMBRO → `/painel`, admin → `/admin` | Alvos já existentes na rota de troca | y (discussão D) |
| Nome longo na barra do cartão | Truncar com reticências, fonte fixa | Garante dimensões inalteradas | y (discussão E) |
| E-mail no detalhe | Campo no mesmo bloco (grid WhatsApp/nascimento), fallback `—` quando indisponível | Layout mínimo, consistente com dados vizinhos | n — default do agente (área não discutida) |
| Falha de consulta na listagem | Bloco TOTAL não é exibido (evita mostrar 0 enganoso) | Página já trata `falhaConsulta` com alerta próprio | n — default do agente |
| Contadores já existentes | Em usuários, o bloco TOTAL substitui o texto "N usuário(s)" na mesma posição; o texto de paginação da auditoria ("Página X de Y (N registros)") permanece | Evita duplicar a mesma contagem na mesma tela | n — default do agente |
| Mecanismo da caixa de sucesso | Discrição do agente (redirect com parâmetro ou submissão via `fetch`) | Detalhe técnico, não produto | n — discrição do agente |

**Open questions:** none - all resolved or logged above.

**Implicit-Requirement dimensions (Medium sweep):** validação de entrada já coberta pela política existente (AUTH-11 → AUTH-23); fronteiras de auth e transição de estado cobertas por AUTH-21/22/24/25 (flag `force_password_change` → sessão); falhas cobertas por TAB-04 e ADMINMEM-37. Demais dimensões (idempotência, concorrência, lifecycle de dados, observabilidade, falha de dependência externa, rate limits) N/A para este escopo — sem novo estado persistente além da flag de sessão já coberta.

---

## User Stories

### P1: Trocar senha com confirmação e redirect limpo ⭐ MVP

**User Story**: As a membro (ou admin) com senha temporária, I want concluir a troca vendo uma confirmação e ser levado ao portal já logado, so that eu sei que a troca deu certo e consigo usar o sistema.

**Why P1**: Hoje não há feedback e o `proxy.ts` devolve o usuário ao form (flag `force_password_change` stale na sessão) — bug real de uso.

**Acceptance Criteria**:

1. WHEN o formulário de trocar senha for submetido com senha válida (mínimo 8 caracteres, com letra e número) e sessão ativa, THEN the system SHALL exibir uma caixa de sucesso confirmando a troca. <!-- event-driven -->
2. WHEN o usuário acionar o botão da caixa de sucesso, THEN the system SHALL redirecionar o usuário para `/painel` quando o papel for MEMBRO e para `/admin` quando o papel for admin. <!-- event-driven -->
3. WHEN o redirect de sucesso ocorrer, THEN the system SHALL entregar a área de destino sem reenvio a `/trocar-senha`. <!-- event-driven -->
4. IF a senha submetida não atender à política (mínimo 8 caracteres, com letra e número), THEN the system SHALL exibir mensagem de erro sem trocar a senha. <!-- unwanted-behavior -->
5. IF não houver sessão ativa, THEN the system SHALL exibir a mensagem de erro de sessão sem exibir caixa de sucesso. <!-- unwanted-behavior -->
6. WHILE a troca não for concluída, the system SHALL manter `/painel` e `/admin` bloqueados (reenvio a `/trocar-senha`). <!-- state-driven -->

**Independent Test**: Login de membro com `force_password_change: true` → trocar senha → caixa de sucesso → botão → chegar a `/painel` sem bounce.

### P1: Bloco TOTAL em todas as listagens do admin

**User Story**: As a admin, I want ver o total de registros de cada listagem antes das colunas, so that sei quantos registros existem sem contar linhas manualmente.

**Why P1**: Pedido central do lote; nenhuma listagem mostra hoje a contagem geral de forma padronizada.

**Acceptance Criteria**:

1. The system SHALL exibir, acima de cada listagem do painel admin (membros, eventos, financeiro, fechamento, auditoria, usuários, liderança, patrimônio, relatórios) e alinhado à esquerda, um bloco com o rótulo `TOTAL` e o número de registros. <!-- ubiquitous -->
2. WHILE busca, filtro ou paginação estiverem ativos, the system SHALL exibir no bloco o total geral de registros, independente dos filtros. <!-- state-driven -->
3. WHEN a listagem retornar vazio, THEN the system SHALL exibir o número `0` no bloco. <!-- event-driven -->
4. IF a consulta da listagem falhar, THEN the system SHALL omitir o bloco TOTAL. <!-- unwanted-behavior -->

**Independent Test**: `/admin/membros?q=inexistente` → linhas vazias, bloco TOTAL com o número total de membros; página sem filtro → mesmo número.

### P2: E-mail do membro na página de detalhe

**User Story**: As a admin, I want ver o e-mail cadastrado do membro na página de detalhe, so that confirmo o contato de acesso sem sair da tela.

**Why P2**: Acrescento simples; depende só da leitura de `auth.users` via `members.auth_user_id`.

**Acceptance Criteria**:

1. The system SHALL exibir o e-mail cadastrado do membro na página de detalhe, no mesmo bloco de dados de contato (WhatsApp e nascimento). <!-- ubiquitous -->
2. IF o e-mail não estiver disponível, THEN the system SHALL exibir o marcador `—` no campo e-mail, mantendo a página renderizada. <!-- unwanted-behavior -->

**Independent Test**: Abrir `/admin/membros/<id>` → e-mail presente no bloco de contato.

### P2: Barra ID/NOME do cartão com nome longo

**User Story**: As a admin imprimindo cartões, I want que nomes longos fiquem contidos na barra de identificação, so that o cartão mantém as dimensões ISO ID-1 e sai legível na impressão.

**Why P2**: Ajuste visual sobre base já aprovada; sem perda de função atual.

**Acceptance Criteria**:

1. WHEN o nome do membro exceder o espaço disponível na barra de identificação, THEN the system SHALL exibir o nome truncado com reticências dentro da barra. <!-- event-driven -->
2. WHEN o nome couber no espaço da barra, THEN the system SHALL exibir o nome integralmente, sem truncamento. <!-- event-driven -->
3. The system SHALL manter as dimensões do cartão (aspecto ISO ID-1 85,6 × 53,98 mm) inalteradas para qualquer nome. <!-- ubiquitous -->

**Independent Test**: Renderizar `MemberCard` com nome de 80 caracteres → texto cortado com `…` dentro da barra; com nome curto → nome completo.

---

## Edge Cases

- IF a listagem do admin falhar ao consultar, THEN o bloco TOTAL não aparece (TAB-04) — a mensagem de falha existente continua responsável pelo feedback.
- WHEN a listagem estiver vazia (filtro sem resultado ou tabela vazia), THEN TOTAL = 0 (TAB-03) — não confunde com falha.
- IF o membro não tiver e-mail associável, THEN o detalhe exibe `—` (ADMINMEM-37).
- WHEN um admin troca a senha, THEN o redirect é `/admin`, não `/painel` (AUTH-21).
- WHEN a flag `force_password_change` ainda estiver na sessão após a troca, THEN the system SHALL atualizar a sessão de forma que o usuário não seja reenviado a `/trocar-senha` (AUTH-22).
- WHEN o nome tiver comprimento extremo (80+ caracteres), THEN a barra não transborda (CART-17/CART-19).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| AUTH-20 | P1: Trocar senha | Design | Verified |
| AUTH-21 | P1: Trocar senha | Design | Verified |
| AUTH-22 | P1: Trocar senha | Design | Verified |
| AUTH-23 | P1: Trocar senha | Design | Verified |
| AUTH-24 | P1: Trocar senha | Design | Verified |
| AUTH-25 | P1: Trocar senha | Design | Verified |
| TAB-01 | P1: TOTAL tabelas | Design | Verified |
| TAB-02 | P1: TOTAL tabelas | Design | Verified |
| TAB-03 | P1: TOTAL tabelas | Design | Verified |
| TAB-04 | P1: TOTAL tabelas | Design | Verified |
| ADMINMEM-36 | P2: E-mail detalhe | Design | Verified |
| ADMINMEM-37 | P2: E-mail detalhe | Design | Verified |
| CART-17 | P2: Barra cartão | Design | Verified |
| CART-18 | P2: Barra cartão | Design | Verified |
| CART-19 | P2: Barra cartão | Design | Verified |

**ID format:** `[CATEGORY]-[NUMBER]`
**Status values:** Pending → In Design → In Tasks → Implementing → Verified
**Coverage:** 15 total, 15 mapped to tasks (T1–T7), 0 unmapped

---

## Success Criteria

- [x] Fluxo completo de troca de senha sem retorno ao form (caixa de sucesso → portal), MEMBRO e admin.
- [x] 9 listagens com bloco TOTAL coerente com e sem filtros ativos (0 e falha de consulta cobertos).
- [x] E-mail visível (ou `—`) no detalhe do membro.
- [x] Cartão com nome de 80+ caracteres sem transbordo, dimensões ISO ID-1 intactas.
- [x] `npm run lint`, `npm run typecheck`, `npm run test:ci` e `npm run build` verdes; gates SDD com 0 erros.
