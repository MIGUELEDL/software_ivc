# Contexto — Matriz de Permissões (RF-032)

## Sabores atuais do RBAC

O controle de acesso está **duplicado e espalhado em literais de papel** em três
camadas:

- **Aplicação**: `src/lib/auth/rbac.ts` — sets hard-coded `ADMIN_ROLES`,
  `ADMIN_WRITER_ROLES`, `isHardDeleteRole`, lidos por `src/lib/admin/http.ts`
  (`authAdmin`, `requireWriter`, `requireHardDelete`).
- **Banco (RLS)**: migração `0006` lista papéis dentro das policies
  `members_*_admin` e `docs_*_admin` (`auth_role() in ('SECRETARIA',...)`).
- **Proxy**: `src/proxy.ts` usa `isAdminRole` como gate grosseiro de área.

## Dor

Mudar "quem pode escrever financeiro" hoje exige tocar código TS **e** SQL em
synch. Isso se provou frágil: o sensor de mutação da RF-022 pegou uma regressão
de role-list (M4b) que o teste de comportamento não notava. A RF-032 cria uma
fonte única, editável sem deploy, derivada do banco, e enraíza a mesma decisão
nos dois lados.

## Decisões já fechadas (Discuss)

| Decisão | Escolha |
| ------- | ------- |
| Onde vive a matriz | **Banco** (tabela `permissions`), não constante TS |
| Matriz-default | Confirmada (níveis por papel × módulo, 48 pares) |
| Enforcement no MVP | Piloto no módulo **membros**: guards + policies via `can()`/`can_access()` |
| UI de gestão da matriz | Fica na **RF-028**; aqui escrita só SUPER_ADMIN |

## Enforcement em duas pontas do mesmo dado

```
       ┌──────────────────────┐
       │  permissions (PK role+module, level) │  ← fonte única no banco
       └───────────┬──────────┘
                   │
        app layer (TS can())          DB layer (can_access() security definer)
        guards dos route handlers      policies RLS de members/member_documents
                   │                          │
                   └────────── mesma tabela ──┘
```

- **App**: `can(role, mod, nivel)` lê `permissions` (RO-session/RLS) e decide
  nos route handlers `/api/admin/membros*`.
- **Banco**: `can_access(mod, nivel)` (SECURITY DEFINER, papel do JWT via
  `auth_role()`) decide nas policies RLS — backstop real contra bypass.
- **Proxy**: continua gate grosseiro de área (`isAdminRole`); a decisão fina
  acontece por RLS/guardas na matriz.

## Níveis hierárquicos

`ler < escrever < administrar` — `can(X, mod, 'ler')` vale para `ler/escrever/
administrar`; `can(X, mod, 'escrever')` vale para `escrever/administrar`;
`can(X, mod, 'administrar')` só com nível `administrar`.