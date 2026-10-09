# Admin Usuários — Exclusão de Usuários Specification

## Problem Statement

O módulo `admin-usuarios` (RF-028) lista, cria, edita o papel e redefine a senha
de usuários admin, mas não permite excluí-los — exclusão foi explicitamente
deixada fora de escopo naquela feature. Na prática, contas criadas por engano
(ex.: um `LIDER` de teste) ficam permanentes no sistema, sem caminho de remoção
pela UI, exigindo SQL direto. Esta feature adiciona a exclusão de contas, restrita
a ADMIN/SUPER_ADMIN, e protege os usuários "de sistema" (todos os já existentes)
de remoção acidental.

## Goals

- [ ] Permitir que quem tem `administrar` no módulo `usuarios` exclua uma conta
      admin criada pelo painel, com confirmação e auditoria.
- [ ] Proteger todos os usuários pré-existentes ("padrão do sistema") e o papel
      `SUPER_ADMIN` de exclusão — apenas contas novas, criadas pelo painel, são excluíveis.
- [ ] Impedir exclusão que quebre integridade referencial (financeiro, documentos,
      auditoria) com resposta 409 explícita.

## Out of Scope

Explicitamente excluído. Documentado para prevenir scope creep.

| Feature | Reason |
| ------- | ------ |
| Desativação/inativação (soft delete) | Decisão de escopo: exclusão é hard delete; inativar seria feature separada |
| Excluir usuário MEMBRO | `admin-membros` já faz hard-delete da conta auth de membro (RF-022) |
| Backfill para tornar excluíveis contas já existentes | Decisão do usuário (2026-10-08): todos os atuais são "padrão do sistema" e permanecem protegidos |
| Anonimizar referências (`created_by`/`uploaded_by`/`autor` → NULL) | Decisão do usuário: preservar auditoria; referência bloqueia com 409 |
| Exclusão em lote / múltipla seleção | Volume baixo (AD-001); não pedido |
| Restaurar/desfazer exclusão | Hard delete sem lixeira no MVP |
| Alterar/limpar a trilha de auditoria de uma exclusão | `audit_logs` é append-only |
| Rate limiting de exclusão | Supabase Auth já aplica limites nativos |

---

## Assumptions & Open Questions

Toda ambiguidade é resolvida ou registrada aqui — nada fica silenciosamente incerto.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | --------------- | --------- | ---------- |
| Marcador durável de origem | `app_metadata.criado_por_admin = true`, gravado em `criarUsuario` | Único sinal no Auth que não depende de `force_password_change` (limpo ao trocar senha, `trocar-senha/route.ts:62`) | y (decisão do usuário 2026-10-08) |
| Usuários existentes | Nenhum é excluível; sem backfill | Decisão do usuário: "todos os atuais são padrões e não podem ser excluídos" | y (decisão do usuário 2026-10-08) |
| Definição de excluível | `role !== "SUPER_ADMIN"` **e** `app_metadata.criado_por_admin === true` | Combina proteção do papel mais alto com origem painel | y (decisão do usuário) |
| Auto-exclusão | Bloqueada no servidor (`callerId === userId`) | Evita lockout acidental; espelha `AutoModificacaoError` de `editarPapel` | y (decisão do usuário) |
| `SUPER_ADMIN` | Nunca excluível pela UI | Espelha `SuperAdminProtegidoError` de `editarPapel`; remoção só via SQL/seed | y (decisão do usuário) |
| Referências que bloqueiam | Checagem prévia em `transactions.created_by`, `cash_closes.created_by`, `documents.uploaded_by`, `audit_logs.autor` → 409 se houver | FKs sem `ON DELETE` derrubam o delete; bloquear preserva auditoria (append-only) | y (decisão do usuário) |
| Confirmação | `window.confirm` simples + botão vermelho + estado "Excluindo..." | Segue o padrão de `patrimonio/delete-button.tsx` e `membros/[id]` | y (decisão do usuário) |
| Tipo de exclusão | Hard delete via `admin.auth.admin.deleteUser(id)` | Espelha `excluirMembro` (`membros.ts:389`); 204 sem corpo | y (agente) |
| Sucesso HTTP | `204 No Content` | Consistente com `DELETE /api/admin/membros/[id]` | y (agente) |
| Preservação do marcador em `editarPapel` | Espelhar `app_metadata` existente no update (como `redefinirSenha` já faz) | Garante o marcador independente da semântica de merge do GoTrue | y (agente) |
| Membro ligado à conta | Não tratado: contas admin criadas pelo painel não têm linha em `members`; se tivessem, o `ON DELETE CASCADE` removeria em cascata | Fora do caso real; registrado | y (agente) |
| Ordem das guardas | 404 (inexistente) → 403 auto-exclusão → 403 SUPER_ADMIN → 403 sistema sem marcador → 409 vínculos | Torna os testes determinísticos quando mais de uma condição ocorre | y (agente) |
| Auditoria | `registrarAuditoria({ acao: "excluir", entidade: "usuarios" })` após sucesso | Padrão de todas as rotas admin | y (agente) |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Excluir usuário criado pelo painel ⭐ MVP

**User Story**: As an ADMIN, I want to delete an admin user that was created by mistake through the panel so that the account list stays accurate without touching SQL.

**Why P1**: É o caminho completo (rota + serviço + guardas) — a fatia vertical mínima demonstrável.

**Acceptance Criteria**:

1. WHEN a user with `administrar` on `usuarios` submits `DELETE /api/admin/usuarios/[id]` for an excluível user THEN the system SHALL delete the auth user via `admin.auth.admin.deleteUser(id)` and return 204 with no body  <!-- event-driven -->
2. WHEN the deletion succeeds THEN the system SHALL register an audit log with `acao: "excluir"`, `entidade: "usuarios"`, `entidade_id: <id>` and `autor` = caller id  <!-- event-driven -->
3. IF the target user does not exist THEN the system SHALL return 404 `{ error: "nao_encontrado" }` and delete nothing  <!-- unwanted-behavior -->
4. IF the caller attempts to delete their own account THEN the system SHALL return 403 `{ error: "auto_modificacao_nao_permitida" }` and delete nothing  <!-- unwanted-behavior -->
5. IF the target user's role is `SUPER_ADMIN` THEN the system SHALL return 403 `{ error: "super_admin_protegido" }` and delete nothing  <!-- unwanted-behavior -->
6. IF the target user lacks `app_metadata.criado_por_admin === true` THEN the system SHALL return 403 `{ error: "usuario_protegido" }` and delete nothing  <!-- unwanted-behavior -->
7. IF the target user is referenced by `transactions.created_by`, `cash_closes.created_by`, `documents.uploaded_by` or `audit_logs.autor` THEN the system SHALL return 409 `{ error: "usuario_com_vinculos" }` and delete nothing  <!-- unwanted-behavior -->
8. IF an unauthenticated caller submits the DELETE THEN the system SHALL return 401 `{ error: "nao_autenticado" }`  <!-- unwanted-behavior -->
9. IF the caller lacks `administrar` on `usuarios` THEN the system SHALL return 403 `{ error: "nao_autorizado" }`  <!-- unwanted-behavior -->

**Independent Test**: Autenticado como ADMIN, criar um usuário pelo formulário e excluí-lo pela linha → 204 e some da lista; tentar excluir `admin.teste@ivc.local` → 403.

---

### P2: Marcar a origem na criação

**User Story**: As the system, I want new panel-created users to carry an immutable origin flag so that only they can be deleted.

**Why P2**: Sem o marcador, os usuários novos não seriam distinguíveis dos "padrão do sistema".

**Acceptance Criteria**:

10. WHEN `criarUsuario` creates an auth user THEN the system SHALL include `app_metadata.criado_por_admin: true` alongside `role` and `force_password_change: true`  <!-- event-driven -->
11. WHEN `editarPapel` updates a user's role THEN the system SHALL preserve `criado_por_admin` in `app_metadata`  <!-- event-driven -->
12. WHEN `listarUsuarios` returns the user list THEN the system SHALL expose a boolean `deletable` per user equal to (`role !== "SUPER_ADMIN"` AND `app_metadata.criado_por_admin === true`)  <!-- event-driven -->

**Independent Test**: Criar usuário; `getUserById` mostra `criado_por_admin: true`; `GET /api/admin/usuarios` traz `deletable: true` só para ele.

---

### P3: Botão de exclusão na listagem

**User Story**: As an ADMIN, I want a red delete button per deletable row so that I can remove accounts from the panel with confirmation.

**Why P3**: Fecha a fatia de UI; sem isso a rota não tem gatilho no painel.

**Acceptance Criteria**:

13. WHEN a user with `administrar` on `usuarios` views `/admin/usuarios` THEN the system SHALL render a red "Excluir" button for each user whose `deletable` is true  <!-- event-driven -->
14. WHILE `deletable` is false (incluindo o próprio usuário e `SUPER_ADMIN`) the system SHALL NOT render the "Excluir" button for that row  <!-- state-driven -->
15. WHERE the viewer lacks `administrar` on `usuarios` the system SHALL NOT render any "Excluir" control  <!-- optional-feature -->
16. WHEN the admin clicks "Excluir" and confirms `window.confirm` THEN the system SHALL call `DELETE /api/admin/usuarios/[id]` and refresh the list on 204  <!-- event-driven -->
17. IF the DELETE responds 403 or 409 THEN the system SHALL show the corresponding message and NOT refresh the list  <!-- unwanted-behavior -->

**Independent Test**: Como ADMIN, a linha `admin.teste` (sistema) não mostra botão; a linha recém-criada mostra; clicar → confirma → linha some.

---

## Edge Cases

- IF o alvo é simultaneamente `SUPER_ADMIN` e sem marcador THEN o sistema SHALL aplicar a guarda de `SUPER_ADMIN` (403 `super_admin_protegido`), pela ordem das guardas.
- IF o chamador é o próprio alvo e também `SUPER_ADMIN` THEN o sistema SHALL aplicar a guarda de auto-exclusão (403 `auto_modificacao_nao_permitida`), pela ordem das guardas.
- IF o alvo tem marcador mas criou lançamento/documento/log THEN o sistema SHALL retornar 409 `usuario_com_vinculos` antes de chamar o Auth.
- WHEN a lista não tem nenhum usuário excluível THEN o sistema SHALL exibir a tabela sem qualquer botão "Excluir".
- IF o `deleteUser` falhar após a checagem (corrida) THEN o sistema SHALL retornar 500 `{ error: "erro_interno" }` e registrar `console.error`.

---

## Requirement Traceability

Cada requisito tem ID único para rastreamento em design, tasks e validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| USREX-01 | P1: DELETE exclui via deleteUser → 204 | Design | Pending |
| USREX-02 | P1: auditoria da exclusão | Design | Pending |
| USREX-03 | P1: 404 inexistente | Design | Pending |
| USREX-04 | P1: 403 auto-exclusão | Design | Pending |
| USREX-05 | P1: 403 SUPER_ADMIN | Design | Pending |
| USREX-06 | P1: 403 usuário de sistema | Design | Pending |
| USREX-07 | P1: 409 vínculos | Design | Pending |
| USREX-08 | P1: 401 não autenticado | Design | Pending |
| USREX-09 | P1: 403 sem administrar | Design | Pending |
| USREX-10 | P2: marcador na criação | Done | Done |
| USREX-11 | P2: marcador preservado na edição | Done | Done |
| USREX-12 | P2: `deletable` na listagem | Done | Done |
| USREX-13 | P3: botão para linhas excluíveis | Design | Pending |
| USREX-14 | P3: sem botão para protegidos/próprio | Design | Pending |
| USREX-15 | P3: sem controle sem administrar | Design | Pending |
| USREX-16 | P3: confirm + DELETE + refresh | Design | Pending |
| USREX-17 | P3: mensagem em 403/409 | Design | Pending |

**Coverage:** 17 total, 0 mapped to tasks, 17 unmapped ⚠️

---

## Success Criteria

Como sabemos que a feature é bem-sucedida:

- [ ] ADMIN/SUPER_ADMIN excluem contas criadas pelo painel pela UI, com confirmação e auditoria
- [ ] Nenhum usuário pré-existente ("padrão do sistema") nem `SUPER_ADMIN` é excluível
- [ ] Exclusão com vínculos retorna 409 e não corrompe auditoria/financeiro
- [ ] Auto-exclusão e não-autorizados são bloqueados no servidor (não só na UI)
- [ ] Gates passam: lint, typecheck, build, `probes-admin-usuarios.sh`
