# Admin Usuários — Revogar Permissões na Matriz Specification

## Problem Statement

A matriz de permissões (`/admin/usuarios/permissoes`) exibe em cada célula a opção "—" (sem acesso), mas o endpoint `PUT /api/admin/usuarios/permissoes` rejeita `nivel: ""` com 400 `nivel_invalido`. Como o editor envia **todas** as células a cada salvamento, basta uma célula vazia para o salvamento inteiro falhar. Na prática o admin não consegue revogar acesso de nenhum papel.

## Goals

- [ ] Revogar uma permissão enviando `nivel` vazio remove a linha de `permissions` e responde 200.
- [ ] `GET` reflete a revogação: o par `(role, module)` revogado some da matriz.
- [ ] Níveis válidos (`ler`/`escrever`/`administrar`) continuam sendo upsert; valor inválido continua 400 `nivel_invalido`.
- [ ] Após revogar o acesso de um módulo, requisições daquele papel ao módulo passam a ser negadas (fail-closed).

## Out of Scope

Explicitamente excluído para evitar expansão de escopo.

| Feature | Reason |
| ------- | ------ |
| Guarda anti-lockout (impedir zerar `usuarios:administrar` de todos os papéis) | Decisão do usuário: sem guarda; o super admin é responsável. |
| Auditoria das alterações da matriz | Não existe hoje; feature separada. |
| Novos níveis de permissão ou novos papéis/módulos | Fora do RF-032; enum já fixado em `rbac.ts`. |
| Alterar a UI do editor (rótulo "—", cores) | A UI já envia `""`; só o backend está errado. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| `""` (string vazia) é o token de "sem acesso" que o editor envia | Tratar `""` como revogação | `matrix-editor.tsx:14,48` já produz `nivel: ""` para célula vazia | y |
| Revogar = `DELETE` da linha `(role, module)` | Deletar a linha | `rbac.ts:101` já trata linha ausente como negação (fail-closed) | y |
| Sem guarda anti-lockout | Permitir revogar qualquer célula, inclusive `usuarios:administrar` | Decisão do usuário (2026-10-09) | y |
| Papel/módulo fora do enum seguem barrados | Manter a validação atual (`ADMIN_ROLES`/`MODULOS`) | Já implementado; não regride | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Revogar acesso pela matriz ⭐ MVP

**User Story**: As an admin, I want to set a matrix cell to "—" and save, so that I can remove a role's access to a module without writing SQL.

**Why P1**: É a correção do defeito que bloqueia o uso da matriz; sem ela a funcionalidade de edição não opera.

**Acceptance Criteria**:

1. WHEN an authorized admin submits `PUT /api/admin/usuarios/permissoes` with an update whose `nivel` is `""` for an existing `(role, module)` pair THEN the system SHALL delete that row and return 200 `{ ok: true, updated, removed }` with `removed >= 1`.  <!-- event-driven -->
2. WHEN `GET /api/admin/usuarios/permissoes` is requested after a revoke THEN the returned `matrix` SHALL NOT contain the revoked `(role, module)` pair.  <!-- event-driven -->
3. WHEN the `PUT` payload contains a valid `nivel` (`ler`, `escrever` or `administrar`) THEN the system SHALL upsert that row and count it in `updated`.  <!-- event-driven -->
4. IF a `nivel` is neither `""` nor one of `ler`/`escrever`/`administrar` THEN the system SHALL respond 400 `{ error: "nivel_invalido" }`.  <!-- unwanted-behavior -->
5. WHEN a revoke removes a role's grant for a module THEN the system SHALL deny (403 `nao_autorizado`) that role's requests guarded by that module.  <!-- event-driven -->
6. The system SHALL treat `nivel: ""` from the matrix editor as "revogar acesso" (label "—").  <!-- ubiquitous -->

**Independent Test**: As ADMIN, `PUT` an update com `nivel: ""` num par existente → 200 com `removed >= 1`; `GET` não retorna o par; restaurar o par original via `PUT` com o nível anterior.

---

## Edge Cases

- IF `(role, module)` não existe na matriz THEN o delete SHALL ser no-op e a resposta continua 200, com `removed` contando apenas exclusões efetivas.  <!-- unwanted-behavior -->
- WHEN o payload mistura revogações (`""`) e upserts (nível válido) THEN o sistema SHALL aplicar cada item e reportar `updated` e `removed` correspondentes.  <!-- event-driven -->
- IF `role` ou `module` está fora do enum THEN o sistema SHALL manter o comportamento atual (erro de validação).  <!-- unwanted-behavior -->

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| USRREV-01 | P1: `""` deleta a linha e responde 200 com `removed` | Execute | Done |
| USRREV-02 | P1: `GET` não retorna o par revogado | Execute | Done |
| USRREV-03 | P1: níveis válidos seguem upsert | Execute | Done |
| USRREV-04 | P1: nível inválido → 400 `nivel_invalido` | Execute | Done |
| USRREV-05 | P1: revogar nega acesso ao módulo (403) | Execute | Done |
| USRREV-06 | P1: editor trata `""` como revogação | Execute | Done |

**ID format:** `[CATEGORY]-[NUMBER]`

**Coverage:** 6 total, 6 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] Admin consegue zerar células da matriz e salvar sem receber `nivel_invalido`.
- [ ] `GET` confirma que o par revogado sumiu; papel perde o acesso ao módulo.
- [ ] Probes de `admin-usuarios` cobrem revogação, round-trip e restauração, verdes.
