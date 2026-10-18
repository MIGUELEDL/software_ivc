# Ajustes Lote 3 — Cartão A4, Aniversário, Senhas Specification

## Problem Statement

Seis pedidos: (1) impressão de cartões desperdiça folha A4 (1 cartão por folha);
(2) cadastro de eventos quebra em produção (constraint de status desatualizada —
migration 0019 nunca aplicada no prod); (3) landing sem saudação de aniversário;
(4) sem forma de trocar senha após a 1ª troca (membro e admin); (5) admin não
resolve "esqueci a senha" do membro; (6) campos de senha sem "ver senha".

## Goals

- [ ] Selecionar 1–4 membros na lista admin e imprimir frente+verso de todos numa única folha A4
- [ ] Cartão impresso ~2px maior por lado (escala proporcional)
- [ ] Bug de criação de eventos corrigido em produção
- [ ] Caixa de parabéns no topo da home para aniversariantes do dia (banco)
- [ ] Troca de senha por link de e-mail (membro e admin), após a 1ª troca
- [ ] Botão "Redefinir senha" (ADMIN/SUPER_ADMIN) com senha temporária exibida 1x
- [ ] Toggle "ver senha" em todos os inputs de senha de autenticação

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Envio de e-mail via Resend | Supabase Auth envia o e-mail de recuperação nativamente (SMTP do projeto) |
| Exibir senha atual de usuário | Impossível (hash unidirecional) — decidido: redefinir gera nova |
| Impressão em lote >4 membros | Decidido: máximo 4 por folha |
| Troca de senha sem e-mail na 1ª troca | Fluxo FORÇADO atual (/trocar-senha) permanece direto |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Layout A4 multi | Pares frente+verso empilhados (1 par/membro, até 4) — mesmo visual atual | Usuário: "da mesma forma que está, um abaixo do outro"; cabe: 4×54mm ≈ 216mm < 297mm | y |
| Seleção | Checkbox na lista /admin/membros + botão "Imprimir cartões" → página com ?ids= | Opção recomendada pelo usuário | y |
| Tamanho cartão | +2px por lado via escala proporcional (~1.2%) no CSS de impressão | "margem de 1px ou 2px de cada lado, no geral" | y |
| Aniversário múltiplo | Uma caixa listando todos os nomes | Opção recomendada | y |
| Aniversário visibilidade | Só na home, topo abaixo do navbar, botão X (some ao navegar) | Opção recomendada | y |
| Trocar senha (pós-1ª) | Link de confirmação por e-mail (resetPasswordForEmail → /atualizar-senha) | Decisão explícita do usuário | y |
| E-mail | Supabase Auth nativo (sem Resend; free tier ~3–4/h — suficiente p/ 50 membros) | Zero infra nova | y |
| Senhas no admin | Botão "Redefinir senha" (ADMIN/SUPER_ADMIN) gera temporária, exibe 1x, força troca | Decisão do usuário após explicar hash | y |
| Ver senha | Componente compartilhado com olho em: logins, trocar-senha, atualizar-senha | Pedido literal | y |
| Aniversário no banco | RPC SECURITY DEFINER `aniversariantes_do_dia()` p/ anon (só nomes) | members tem RLS admin-only; landing é pública | y |

**Open questions:** none.

---

## User Stories

### P1: Impressão A4 multi-cartão

**User Story**: As a admin, I want selecionar até 4 membros e imprimir os
cartões numa folha A4 so that não desperdice papel.

**Acceptance Criteria**:

1. WHEN lista de membros exibir checkboxes and admin marcar 1–4 THEN the system SHALL habilitar "Imprimir cartões" com a contagem; a 5ª marcação SHALL ser impedida. <!-- CART-01 -->
2. WHEN "Imprimir cartões" clicado THEN the system SHALL abrir pré-visualização com os pares frente+verso de cada membro empilhados verticalmente. <!-- CART-02 -->
3. WHEN imprimir pré-visualização THEN the system SHALL renderizar até 4 pares numa única folha A4 portrait sem página extra. <!-- CART-03 -->
4. WHEN cartão impresso THEN the system SHALL aplicar escala proporcional ~1.2% (+~2px por lado) nas faces. <!-- CART-04 -->
5. IF ids ausente/inválido ou >4 THEN the system SHALL 404/limitar a 4 com aviso. <!-- CART-05 -->

**Independent Test**: Marcar 3 membros → imprimir → 1 folha com 3 pares; marcar 5 → 5ª bloqueada.

### P1: Eventos — fix de criação em produção

**Acceptance Criteria**:

1. WHEN admin cadastrar evento THEN the system SHALL persistir (201) sem 500 em produção. <!-- EVT-01 -->
2. WHEN constraint de status existir THEN the system SHALL aceitar somente 'EM ABERTO' e 'CONCLUIDO' (parity dev/prod). <!-- EVT-02 -->

**Independent Test**: POST /api/admin/eventos em produção → 201; linha consultável.

### P1: Aniversário na landing

**User Story**: As a visitante, I want ver parabéns ao aniversariante do dia so
that a comunidade celebre publicamente.

**Acceptance Criteria**:

1. WHEN exists membro ATIVO com nascimento no dia (fuso America/Fortaleza) THEN the system SHALL exibir caixa de parabéns no topo da home com o(s) nome(s). <!-- ANI-01 -->
2. WHEN múltiplos aniversariantes THEN the system SHALL listar todos na mesma caixa (nomes separados por vírgula, "e" antes do último). <!-- ANI-02 -->
3. WHEN nenhum aniversariante THEN the system SHALL não exibir a caixa. <!-- ANI-03 -->
4. WHEN caixa visível THEN the system SHALL permitir dispensar com botão X (estado em memória; volta ao recarregar). <!-- ANI-04 -->
5. WHEN renderizada THEN the system SHALL seguir o tema da landing (cores/fontes/gradiente) e ser responsiva (360px+). <!-- ANI-05 -->
6. WHEN landing pública consulta aniversariantes THEN the system SHALL expor apenas nomes via RPC SECURITY DEFINER (sem CPF/documentos). <!-- ANI-06 -->

**Independent Test**: Membro nascido hoje → home mostra caixa com nome; sem aniversariante → sem caixa.

### P1: Senhas — troca por e-mail, redefinição admin, ver senha

**User Story**: As a membro/admin, I want trocar minha senha depois da 1ª vez so
that minha conta fique segura sem depender do admin.

**User Story**: As a admin, I want redefinir a senha de um membro so that
resolva "esqueci a senha" sem acesso à senha antiga.

**Acceptance Criteria**:

1. WHEN autenticado solicitar alterar senha (painel membro ou admin) THEN the system SHALL enviar e-mail com link de recuperação e confirmar "confira seu e-mail". <!-- SEN-01 -->
2. WHEN usuário abrir o link válido THEN the system SHALL apresentar formulário nova senha + confirmação; sucesso SHALL atualizar a senha e redirecionar ao login. <!-- SEN-02 -->
3. WHEN link inválido/expirado THEN the system SHALL exibir mensagem de erro com ação para pedir novo link. <!-- SEN-03 -->
4. WHEN ADMIN/SUPER_ADMIN acionar "Redefinir senha" no detalhe do membro THEN the system SHALL gerar senha temporária, exibir UMA vez com botão copiar e marcar force_password_change. <!-- SEN-04 -->
5. IF papel não for ADMIN/SUPER_ADMIN THEN the system SHALL negar redefinição (403). <!-- SEN-05 -->
6. WHEN input de senha em login/trocar-senha/atualizar-senha THEN the system SHALL oferecer toggle ver/ocultar senha sem alterar o valor enviado. <!-- SEN-06 -->

**Independent Test**: Solicitar alteração → e-mail chega → link troca senha → login com nova; redefinir membro → temporária funciona e força troca; olho alterna type sem mudar valor.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| CART-01 | Impressão | Design | Pending |
| CART-02 | Impressão | Design | Pending |
| CART-03 | Impressão | Design | Pending |
| CART-04 | Impressão | Design | Pending |
| CART-05 | Impressão | Design | Pending |
| EVT-01 | Eventos | Design | Pending |
| EVT-02 | Eventos | Design | Pending |
| ANI-01 | Aniversário | Design | Pending |
| ANI-02 | Aniversário | Design | Pending |
| ANI-03 | Aniversário | Design | Pending |
| ANI-04 | Aniversário | Design | Pending |
| ANI-05 | Aniversário | Design | Pending |
| ANI-06 | Aniversário | Design | Pending |
| SEN-01 | Senhas | Design | Pending |
| SEN-02 | Senhas | Design | Pending |
| SEN-03 | Senhas | Design | Pending |
| SEN-04 | Senhas | Design | Pending |
| SEN-05 | Senhas | Design | Pending |
| SEN-06 | Senhas | Design | Pending |

**Coverage:** 19 total.
