# Admin Usuários — Exclusão de Usuários Design

**Spec**: `.specs/features/admin-usuarios-exclusao/spec.md`
**Status**: Draft

---

## Architecture Overview

A feature estende `admin-usuarios` sem novas tabelas e sem migration. O único
estado novo vive em `app_metadata` (Supabase Auth): o marcador durável
`criado_por_admin`. A exclusão é um hard delete via `admin.auth.admin.deleteUser`,
protegido por guardas de serviço e por uma checagem de integridade referencial
antes do Auth.

```mermaid
graph TD
    A["Page /admin/usuarios (RSC)"] -->|renderiza por linha| B["DeleteUserButton (client)"]
    B -->|"window.confirm + fetch DELETE"| C["DELETE /api/admin/usuarios/[id]"]
    C -->|requireAdministrar('usuarios')| D["excluirUsuario(id, callerId)"]
    D -->|"1. getUserById (service-role)"| E["Supabase Admin API (GoTrue)"]
    D -->|"2. checagem de vínculos"| F["transactions / cash_closes / documents / audit_logs"]
    D -->|"3. deleteUser (service-role)"| E
    C -->|sucesso| G["registrarAuditoria(acao:'excluir')"]
    H["criarUsuario"] -->|"app_metadata.criado_por_admin=true"| E
```

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --------- | -------- | ---------- |
| `criarUsuario` / `editarPapel` / `listarUsuarios` / `redefinirSenha` | `src/lib/admin/usuarios.ts` | Estender (marcador, `deletable`) e adicionar `excluirUsuario` |
| `createAdminClient()` | `src/lib/supabase/admin.ts` | Service-role para `getUserById`/`deleteUser` e checagem de vínculos |
| `requireAdministrar(modulo)` | `src/lib/admin/http.ts:87` | Guard do DELETE (401/403 + log de negativa) |
| `registrarAuditoria` / `extrairInfoRequest` | `src/lib/admin/auditoria.ts` | Log de exclusão (padrão de todas as rotas) |
| `NaoEncontradoError`, `AutoModificacaoError`, `SuperAdminProtegidoError` | `src/lib/admin/usuarios.ts:12-31` | Reutilizados; só 2 erros novos |
| `excluirMembro` | `src/lib/admin/membros.ts:389` | Padrão de referência: `getMembro` → checagem → `deleteUser` → linha |
| `RemoverDocumentoButton` / `HardDeleteButton` | `src/app/admin/membros/[id]/membro-detalhe-acoes.tsx` | Padrão de confirmação + fetch + refresh |
| `DeleteAssetButton` | `src/app/admin/patrimonio/delete-button.tsx` | Estilo do botão vermelho perigoso |
| Coluna de ações + `can(...)` na página | `src/app/admin/usuarios/page.tsx:40-41,106-181` | Extensão da tabela |
| `probes-admin-usuarios.sh` | `scripts/probes-admin-usuarios.sh` | Estender com ACs de exclusão (estático + runtime) |

### Integration Points

| System | Integration Method |
| ------ | ------------------ |
| Supabase Auth Admin API | `admin.auth.admin.getUserById()` e `deleteUser()` via service-role |
| Tabelas referenciadoras | `select id ... limit 1` por `created_by`/`uploaded_by`/`autor` via service-role (bypassa RLS) |
| `audit_logs` | `registrarAuditoria({ acao: "excluir", entidade: "usuarios", entidade_id })` |
| RBAC | `requireAdministrar('usuarios')`; `can(papel, 'usuarios', 'administrar')` na página |

---

## Components

### Service Layer: `src/lib/admin/usuarios.ts` (modificar)

- **Purpose**: origem dos usuários, listagem com flag `deletable` e exclusão guardada.
- **Location**: `src/lib/admin/usuarios.ts`
- **Interfaces**:
  - `criarUsuario(dados)` — passa a gravar `app_metadata: { role, force_password_change: true, criado_por_admin: true }`
  - `editarPapel(userId, role, callerId)` — update passa a espelhar `app_metadata` existente (preserva `criado_por_admin`)
  - `UsuarioAuth` — ganha `criadoPorAdmin: boolean` e `deletable: boolean`
  - `listarUsuarios(opts?)` — `deletable = role !== "SUPER_ADMIN" && app_metadata.criado_por_admin === true`
  - `excluirUsuario(userId: string, callerId: string): Promise<void>` — ordem: (1) `getUserById` → 404; (2) self → 403; (3) `SUPER_ADMIN` → 403; (4) sem marcador → 403; (5) vínculos → 409; (6) `deleteUser`
- **Dependencies**: `createAdminClient`, `NaoEncontradoError`, `AutoModificacaoError`, `SuperAdminProtegidoError`
- **Novos erros**: `UsuarioProtegidoError` (`"usuario_protegido"`), `UsuarioComVinculosError` (`"usuario_com_vinculos"`)
- **Reuses**: `gerarSenhaId`, `ADMIN_ROLES`

### API Route: `src/app/api/admin/usuarios/[id]/route.ts` (modificar)

- **Purpose**: expor `DELETE` para o serviço.
- **Location**: `src/app/api/admin/usuarios/[id]/route.ts`
- **Interfaces**: `DELETE(request, { params })` — `requireAdministrar('usuarios')` → `excluirUsuario(id, auth.sub)` → auditoria → 204; mapa de erros 404/403/409/500
- **Dependencies**: serviço + `requireAdministrar` + `registrarAuditoria`
- **Reuses**: estrutura do `PATCH` já existente no mesmo arquivo

### Client Component: `src/app/admin/usuarios/delete-user-button.tsx` (novo)

- **Purpose**: botão vermelho com confirmação para disparar a exclusão.
- **Location**: `src/app/admin/usuarios/delete-user-button.tsx`
- **Interfaces**: `DeleteUserButton({ userId: string, email: string })`
- **Dependencies**: `next/navigation` (`useRouter`), `lucide-react` (`Trash2`)
- **Reuses**: padrão de `patrimonio/delete-button.tsx` (estado `deleting`, `router.refresh()`, alertas)

### Page: `src/app/admin/usuarios/page.tsx` (modificar)

- **Purpose**: adicionar a coluna "Ações" com o botão apenas em linhas excluíveis.
- **Location**: `src/app/admin/usuarios/page.tsx`
- **Interfaces**: RSC já tem `claims` (`claims.sub`) e `administrador`; renderiza `<DeleteUserButton>` quando `administrador && u.deletable`
- **Reuses**: tabela e `ROLE_LABELS` existentes

---

## Data Models

```typescript
// app_metadata em auth.users (Supabase Auth)
interface AppMetadata {
  role?: string;
  force_password_change?: boolean;
  criado_por_admin?: boolean; // NOVO — durável, gravado só por criarUsuario
}

// src/lib/admin/usuarios.ts
interface UsuarioAuth {
  id: string;
  email: string;
  role: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  criadoPorAdmin: boolean; // NOVO
  deletable: boolean;      // NOVO — role !== SUPER_ADMIN && criado_por_admin === true
}
```

**Relationships**: `criado_por_admin` distingue contas de painel (excluíveis) das
contas "padrão do sistema" (sem marcador, protegidas). Não há migration — o dado
mora no Auth.

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| -------------- | -------- | ----------- |
| Usuário inexistente | `NaoEncontradoError` → 404 | "Usuário não encontrado." |
| Auto-exclusão | `AutoModificacaoError` → 403 | "Você não pode excluir sua própria conta." |
| Alvo `SUPER_ADMIN` | `SuperAdminProtegidoError` → 403 | "Conta SUPER_ADMIN não pode ser excluída." |
| Alvo sem `criado_por_admin` | `UsuarioProtegidoError` → 403 | "Usuário do sistema não pode ser excluído." |
| Alvo com vínculos | `UsuarioComVinculosError` → 409 | "Usuário possui registros vinculados; exclusão bloqueada." |
| Sem sessão | guard → 401 | "Não autenticado." |
| Sem `administrar` | guard → 403 | "Não autorizado." |
| Falha do Auth / corrida | catch → 500 `erro_interno` + `console.error` | "Erro interno. Tente novamente." |

---

## Risks & Concerns

| Concern | Location (file:line) | Impact | Mitigation |
| ------- | -------------------- | ------ | ---------- |
| Semântica de merge de `app_metadata` no GoTrue não documentada explicitamente | `src/lib/admin/usuarios.ts:155` (`editarPapel`) | Um update de papel poderia apagar `criado_por_admin` (e já arrisca `force_password_change`) | `editarPapel` passa a espelhar `...existing.user.app_metadata` como `redefinirSenha` já faz (`usuarios.ts:178`) — USREX-11 |
| `criarUsuario` hoje aceita `SUPER_ADMIN` (só valida `ADMIN_ROLES`) | `src/lib/admin/usuarios.ts:105,114` | Uma conta SUPER_ADMIN criada pelo painel teria marcador mas ficaria bloqueada pelo guard de papel | Fora de escopo (não alterar criação); a guarda de `SUPER_ADMIN` vence pela ordem — registrado |
| TOCTOU entre checagem de vínculos e `deleteUser` | `src/lib/admin/usuarios.ts` (`excluirUsuario`) | Vínculo criado no intervalo faz o `deleteUser` falhar → 500 | Volume baixo (AD-001); `deleteUser` não deixa linha semi-apagada; erro mapeado como 500 |
| `listUsers({ perPage: 200 })` trunca acima de 200 usuários | `src/lib/admin/usuarios.ts:76-79` | Conta excluível fora da 1ª página não aparece na UI | Pré-existente e fora do volume do MVP; não regride nesta feature |
| `members.auth_user_id` é `ON DELETE CASCADE` | `supabase/migrations/0001:10` | Se um usuário excluível tiver linha em `members`, a exclusão remove membro + documentos em cascata | Contas de painel não têm linha em `members`; registrado nas Assumptions |
| `audit_logs` é append-only e `autor` é FK | `supabase/migrations/0017:12` | Exclusão de quem tem log falharia; anonimizar violaria a trilha | Bloqueio com 409 antes do `deleteUser` (USREX-07) |
| Probes não rodam no CI (AD-023) | `scripts/probes-admin-usuarios.sh` | Gate de exclusão é local; pode apodrecer | Rodar o probe no gate Full de cada task de UI e ao fim; registrado |

---

## Tech Decisions (only non-obvious ones)

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Marcador de origem | `app_metadata.criado_por_admin` (não `force_password_change`) | `force_password_change` é limpo em `trocar-senha/route.ts:62`; não é durável |
| Sem backfill | Nenhuma conta atual é excluível | Decisão do usuário 2026-10-08 (todos os atuais = padrão do sistema) |
| Ordem das guardas | 404 → self → SUPER_ADMIN → sistema → vínculos | Determinismo nos testes quando mais de uma condição ocorre |
| Checagem de vínculos no serviço | 4 `select ... limit 1` via service-role antes do delete | Mapear 409 explícito; preserva auditoria; evita depender do erro de FK |
| Delete via service-role | `admin.auth.admin.deleteUser` | Espelha `excluirMembro`; o client de sessão não pode |
| Botão só na UI para `deletable` | Guard de UI + guard de servidor | UI orienta; o servidor é a autoridade (403 real) |

> **Project-level decisions:** o marcador de origem e a política "apenas contas
> novas são excluíveis" são convenção de projeto — registrado em `.specs/STATE.md`
> como **AD-026** (já escrito nesta sessão). Decisões locais ficam nas Assumptions da spec.

---

## Tips

- Os dois erros novos são a única adição de API do serviço; o resto é extensão.
- `excluirUsuario` não recebe `deps` injetadas — segue o padrão do módulo (sem DI).
- A coluna "Ações" só é renderizada quando `administrador`; sem botão para o próprio usuário (comparar `claims.sub`).
