# Auth Design

**Spec**: `.specs/features/auth/spec.md`
**Status**: Implemented (fix loop in progress, see `validation.md`)

---

## Architecture Overview

Autenticação server-side com Supabase Auth via `@supabase/ssr`. Sessão gerenciada por cookies httpOnly; papel em `app_metadata.role` (não-editável pelo cliente); flag `force_password_change` em `app_metadata` controla o fluxo de primeiro acesso. `proxy.ts` (Next 16) faz refresh de sessão + redirect de rotas protegidas. Route Handlers em `/api/auth/*` processam login/logout/troca de senha. DAL em `src/lib/auth/` centraliza `getClaims()` para decisões server-side.

```mermaid
sequenceDiagram
    participant U as Browser
    participant P as proxy.ts
    participant RH as Route Handler
    participant SB as Supabase Auth
    participant DAL as getClaims()

    U->>P: GET /painel (cookie sb-*-auth-token)
    P->>DAL: getClaims()
    alt sem sessão ou token expirado
        DAL-->>P: null
        P-->>U: 302 → /login
    alt force_password_change = true
        DAL-->>P: {role, force_password_change: true}
        P-->>U: 302 → /trocar-senha
    alt sessão válida + papel correto
        DAL-->>P: {role, force_password_change: false}
        P-->>U: 200 (renderiza página)
    end

    U->>RH: POST /api/auth/login
    RH->>SB: signInWithPassword()
    SB-->>RH: session + user
    RH-->>U: 302 → /painel ou /admin
```

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| ----------- | ------------------- | ------------------------- |
| Root layout (Montserrat font, Tailwind) | `src/app/layout.tsx` | Wraps all new pages; no changes needed |
| Tailwind config / globals.css | `src/app/globals.css` | Use existing design tokens (`primary`, `accent`, `bg-gray`, `text-dark`) |
| Path alias `@/*` | `tsconfig.json` | Import via `@/lib/auth/claims`, `@/lib/supabase/server` |
| Page patterns (section + max-w-7xl + px) | `src/app/eventos/page.tsx` | Follow same layout for `/painel`, `/admin`, `/trocar-senha` |
| Constants | `src/lib/constants.ts` | Reference for CHURCH.name in landing pages |

### New Dependencies

| Package | Purpose | Install |
| ----------- | ------------------- | ------- |
| `@supabase/ssr` | Server/client Supabase helpers (createServerClient, createBrowserClient) | `npm i @supabase/ssr` |
| `@supabase/supabase-js` | Supabase client SDK (signInWithPassword, admin, etc.) | `npm i @supabase/supabase-js` |

### Integration Points

| System | Integration Method |
| -------------- | --------------------------------------- |
| Supabase Auth (GoTrue) | `@supabase/ssr` server/browser clients; cookies managed automatically |
| Supabase Admin API | Service-role key in `scripts/seed-admin.mjs` and `/api/auth/trocar-senha` |
| Next.js 16 proxy | `src/proxy.ts` intercepts requests, refreshes session, enforces RBAC |

---

## Components

### Supabase Server Client

- **Purpose**: Create a Supabase client for server-side use with cookie-based session
- **Location**: `src/lib/supabase/server.ts`
- **Interfaces**:
  - `createServerClient(): SupabaseClient` — reads session from request cookies, writes updated cookies via `cookies()`
- **Dependencies**: `@supabase/ssr`, `@supabase/supabase-js`, env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- **Reuses**: None (new pattern)

### Auth Claims DAL

- **Purpose**: Extract user claims (role, force_password_change) from JWT server-side
- **Location**: `src/lib/auth/claims.ts`
- **Interfaces**:
  - `getClaims(request: NextRequest): Promise<AuthClaims | null>` — validates JWT, returns `{ role, forcePasswordChange, email }` or null
  - `type AuthClaims` — `{ role: string; forcePasswordChange: boolean; email: string }`
- **Dependencies**: Supabase server client
- **Reuses**: Supabase server client
- **Notes**: Reads `app_metadata.role` and `app_metadata.force_password_change` from JWT claims. Never trusts client-side data.

### RBAC Helper

- **Purpose**: Check if a role belongs to admin area or member area
- **Location**: `src/lib/auth/rbac.ts`
- **Interfaces**:
  - `isAdminRole(role: string): boolean` — checks against admin role set
  - `isMemberRole(role: string): boolean` — checks if role is MEMBRO
  - `ADMIN_ROLES: Set<string>` — `{SECRETARIA, LIDER, FINANCEIRO, PATRIMONIAL, ADMIN, SUPER_ADMIN}`
- **Dependencies**: None
- **Reuses**: None (pure utility)

### proxy.ts (Route Protection)

- **Purpose**: Session refresh on every request + redirect unauthorized users to correct login + redirect forced-password-change users to `/trocar-senha`
- **Location**: `src/proxy.ts`
- **Interfaces**:
  - `proxy(request: NextRequest): Promise<NextResponse>` — standard Next 16 proxy export
- **Dependencies**: `getClaims()`, `isAdminRole()`, `isMemberRole()`
- **Reuses**: `src/lib/auth/claims.ts`, `src/lib/auth/rbac.ts`
- **Matcher**: `/painel/:path*`, `/admin/:path*`, `/trocar-senha`
- **Logic**:
  1. For `/trocar-senha`: allow if authenticated (any role); redirect to login if not
  2. For `/painel/:path*`: if no session → `/login`; if `force_password_change` → `/trocar-senha`; if admin role → `/admin`
  3. For `/admin/:path*`: if no session → `/login/admin`; if `force_password_change` → `/trocar-senha`; if MEMBRO → `/login/admin`

### Login Route Handlers

- **Purpose**: Process login form submissions, create session, redirect
- **Location**:
  - `src/app/api/auth/login/route.ts` (membro)
  - `src/app/api/auth/login/admin/route.ts` (admin)
- **Interfaces**:
  - `POST(request: Request): Response` — reads form data (email, password), calls `signInWithPassword()`, sets cookies, redirects
- **Dependencies**: Supabase server client
- **Reuses**: Supabase server client
- **Notes**: Both handlers use the same Supabase auth — difference is only the redirect destination (`/painel` vs `/admin`). Error responses render inline via `NextResponse.redirect` with error query param.

### Logout Route Handler

- **Purpose**: Destroy session and redirect to login
- **Location**: `src/app/api/auth/logout/route.ts`
- **Interfaces**:
  - `POST(request: Request): Response` — calls `signOut()`, redirects to `/login` or `/login/admin`
- **Dependencies**: Supabase server client
- **Reuses**: Supabase server client

### Trocar Senha Route Handler

- **Purpose**: Change password and clear `force_password_change` flag
- **Location**: `src/app/api/auth/trocar-senha/route.ts`
- **Interfaces**:
  - `POST(request: Request): Response` — validates new password, calls `updateUser()` (self-update) then `admin.updateUserById()` (clears flag), redirects to area
- **Dependencies**: Supabase server client, `SUPABASE_SERVICE_ROLE_KEY`
- **Reuses**: Supabase server client, `isAdminRole()` for redirect destination
- **Notes**: Requires service-role key to clear `app_metadata.force_password_change` (users cannot self-modify `app_metadata`). **BLOCKED** until `SUPABASE_SERVICE_ROLE_KEY` is provided.

### Login Pages

- **Purpose**: Render login forms for member and admin
- **Location**:
  - `src/app/login/page.tsx` (membro)
  - `src/app/login/admin/page.tsx` (admin)
- **Interfaces**: Standard Next.js page component
- **Dependencies**: Tailwind, existing design tokens
- **Reuses**: `src/app/globals.css` tokens, layout patterns from `eventos/page.tsx`
- **Notes**: Forms POST to `/api/auth/login` or `/api/auth/login/admin`. Display error via search params.

### Trocar Senha Page

- **Purpose**: Render forced password change form
- **Location**: `src/app/trocar-senha/page.tsx`
- **Interfaces**: Standard Next.js page component
- **Dependencies**: Tailwind, existing design tokens
- **Reuses**: Same page patterns
- **Notes**: Form POSTs to `/api/auth/trocar-senha`. Validates client-side (min 8 chars, letter+number). Shows success before redirect.

### Landing Pages

- **Purpose**: Minimal post-login pages showing session info + logout button
- **Location**:
  - `src/app/painel/page.tsx` (membro)
  - `src/app/admin/page.tsx` (admin)
- **Interfaces**: Server component that calls `getClaims()` to display email + role
- **Dependencies**: `getClaims()`, logout form
- **Reuses**: `src/lib/auth/claims.ts`, Tailwind tokens
- **Notes**: Minimal placeholders — real dashboard content enters in following features.

### Seed Script

- **Purpose**: Create initial SUPER_ADMIN user via Supabase Admin API
- **Location**: `scripts/seed-admin.mjs`
- **Interfaces**:
  - `node scripts/seed-admin.mjs` — reads env, creates user with `admin.createUser({ email, password, email_confirm: true, user_metadata: {}, app_metadata: { role: "SUPER_ADMIN", force_password_change: true } })`
- **Dependencies**: `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`
- **Reuses**: None (standalone script)
- **npm script**: Add `"seed:admin": "node scripts/seed-admin.mjs"` to `package.json`
- **BLOCKED** until `SUPABASE_SERVICE_ROLE_KEY` is provided.

---

## Data Models

### Supabase User (app_metadata)

```typescript
interface AppMetadata {
  role: "MEMBRO" | "SECRETARIA" | "LIDER" | "FINANCEIRO" | "PATRIMONIAL" | "ADMIN" | "SUPER_ADMIN"
  force_password_change: boolean
}
```

**Notes**: `app_metadata` is server-managed in Supabase — users cannot modify it via the client SDK. This is the security foundation (AD-013, SECURITY.md).

### AuthClaims (internal)

```typescript
interface AuthClaims {
  role: string
  forcePasswordChange: boolean
  email: string
}
```

**Notes**: Derived from JWT by `getClaims()`. Used by `proxy.ts` and page components.

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| -------------- | ------------- | ---------------- |
| Credenciais inválidas no login | Route handler retorna redirect com `?error=invalid_credentials` na URL | Mensagem de erro inline no form de login |
| Token expirado/inválido em rota protegida | `proxy.ts` redireciona para login da área | Transição transparente para login |
| E-mail não existe | Supabase retorna erro genérico; handler mostra "Credenciais inválidas" (sem revelar existência) | Mensagem genérica igual a credencial errada |
| Nova senha inválida (< 8 chars, sem letra/número) | Handler retorna redirect com `?error=weak_password` | Mensagem de erro no form de troca |
| Service-role key ausente (seed/troca) | Script aborta com mensagem claro; handler retorna 500 | Usuário vê erro; precisa configurar .env.local |
| Usuário sem `app_metadata.role` | `getClaims()` retorna `role: null`; `proxy.ts` redireciona para login | Sem área liberada |

---

## Risks & Concerns

| Concern | Location | Impact | Mitigation |
| ------- | -------------------- | ------ | ---------- |
| `SUPABASE_SERVICE_ROLE_KEY` ausente | `.env.local` | `seed:admin` e handler de troca de senha não funcionam | Handoff bloqueia; usuário deve copiar do Dashboard antes da implementação |
| `proxy.ts` é novo (Next 16) | `src/proxy.ts` | Sem padrão existente no repo para referenciar | Seguir docs Next 16 em `node_modules/next/dist/docs/` antes de implementar |
| Nenhum padrão de auth existente | Global | Não há como "herdar" convenções | Este design ESTABELECE o padrão; features futuras referenciam `src/lib/auth/` |
| `app_metadata` editável via Admin API | Supabase | Se service-role key vazar, attacker pode trocar papéis | Service-role só em servidor (.env.local); nunca no bundle; seed único |

---

## Tech Decisions

| Decision | Choice | Rationale |
| ----------------- | --------------- | ------------- |
| Cookie-based session | `@supabase/ssr` gerencia cookies httpOnly automaticamente | Sessão server-side sem JavaScript; refresh transparente |
| DAL centralizado | `getClaims()` em `src/lib/auth/claims.ts` | Ponto único de decisão de permissão; facilita audit |
| Route Handlers para forms | `/api/auth/*` em vez de Server Actions | Testável via curl sem browser; padrão REST claro |
| Login pages são Client Components | Form state (loading, error) requer interatividade | Pages em `/login` usam `"use client"` para controlled form |
| Landing pages são Server Components | Exibem dados da sessão sem interatividade | `getClaims()` roda server-side; sem JS desnecessário no cliente |
| Senha polícia | Mínimo 8 caracteres, com letra e número | Definido na spec (AUTH-11); validação client + server |
| Admin roles como Set | `ADMIN_ROLES` constante em `rbac.ts` | Facilita checagem `isAdminRole()` e extensão futura |

> **Project-level decisions:** Nenhuma decisão aqui é novo projeto-level — AD-013 já cobre auth/rbac. Decisões são feature-local apenas.
