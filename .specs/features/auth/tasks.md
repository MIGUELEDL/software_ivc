# Auth Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/auth/design.md`
**Status**: In Progress

---

## Test Coverage Matrix

> Generated from codebase analysis. No test runner configured yet (F10, AD-006). Strong defaults applied: all layers = `none` (build gate only), verified via lint/typecheck/build gates + curl probes against running dev server.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Config / deps / scripts | none | - (build gate only) | `package.json`, `scripts/` | `npm run lint && npm run typecheck && npm run build` |
| Supabase client wrapper | none | - (build gate only) | `src/lib/supabase/*.ts` | build gate only |
| Auth DAL (claims/rbac) | none | - (build gate only) | `src/lib/auth/*.ts` | build gate only |
| Route Handlers (API) | none | - (build gate only) | `src/app/api/**/*.ts` | build gate only; curl probes at runtime |
| Pages (SSR/Client) | none | - (build gate only) | `src/app/**/page.tsx` | build gate only |
| proxy.ts (middleware) | none | - (build gate only) | `src/proxy.ts` | build gate only |

**Note**: Curl probes against running dev server serve as manual verification for HTTP behavior (redirects, cookies, error responses). They replace automated tests until a test runner is added in F10.

## Gate Check Commands

> Generated from project conventions (AD-006).

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Build | After every task | `npm run lint && npm run typecheck && npm run build` |
| Probe | After Route Handler tasks (T6-T9) + proxy (T15) | Start dev server (`npm run dev`), run curl probes per task |

---

## Execution Plan

Phases are ordered and run sequentially — each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Foundation

Install deps, create Supabase clients and auth DAL.

```
T1 -> T2
T1 -> T3
T2 -> T4
T3 -> T4
T1 -> T5
```

### Phase 2: Auth API

Route handlers for login, logout, and password change. No intra-phase dependencies — all depend on Phase 1 (T2, T3).

```
T6, T7, T8, T9 — independent (cross-phase deps only)
```

### Phase 3: Pages + Route Protection

Login pages, trocar-senha, landings, and proxy. No intra-phase dependencies — all depend on Phase 1 (T4) or Phase 2 (T6, T7, T9).

```
T10, T11, T12, T13, T14, T15 — independent (cross-phase deps only)
```

---

## Task Breakdown

### Phase 1: Foundation

#### T1: Install Supabase dependencies + add npm scripts ✅ Complete

**What**: Add `@supabase/ssr` and `@supabase/supabase-js` as dependencies; add `seed:admin` npm script to `package.json`.
**Where**: `package.json`
**Depends on**: None
**Reuses**: None
**Requirement**: AUTH-01 (foundation for all auth)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `npm install @supabase/ssr @supabase/supabase-js` succeeds
- [ ] `"seed:admin": "node scripts/seed-admin.mjs"` appears in package.json scripts
- [ ] Gate check passes: `npm run lint && npm run typecheck && npm run build`

**Tests**: none
**Gate**: build

---

#### T2: Create Supabase server client ✅ Complete

**What**: Create `src/lib/supabase/server.ts` exporting `createServerClient()` — initializes a Supabase client with `@supabase/ssr` `createServerClient` that reads/writes auth cookies via Next.js `cookies()`.
**Where**: `src/lib/supabase/server.ts`
**Depends on**: T1
**Reuses**: None (new pattern)
**Requirement**: AUTH-01, AUTH-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `createServerClient()` function exported, reads env vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- [ ] Uses `@supabase/ssr` `createServerClient` with Next.js `cookies()` adapter
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] Gate check passes: `npm run lint && npm run typecheck && npm run build`

**Tests**: none
**Gate**: build

---

#### T3: Create RBAC helper ✅ Complete

**What**: Create `src/lib/auth/rbac.ts` exporting `ADMIN_ROLES` set, `isAdminRole()`, and `isMemberRole()` pure functions.
**Where**: `src/lib/auth/rbac.ts`
**Depends on**: T1
**Reuses**: None (pure utility)
**Requirement**: AUTH-13, AUTH-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `ADMIN_ROLES` exported as `Set<string>` containing `{SECRETARIA, LIDER, FINANCEIRO, PATRIMONIAL, ADMIN, SUPER_ADMIN}`
- [ ] `isAdminRole(role: string): boolean` — returns true if role ∈ ADMIN_ROLES
- [ ] `isMemberRole(role: string): boolean` — returns true if role === "MEMBRO"
- [ ] Gate check passes: `npm run lint && npm run typecheck && npm run build`

**Tests**: none
**Gate**: build

---

#### T4: Create Auth Claims DAL ✅ Complete

**What**: Create `src/lib/auth/claims.ts` exporting `getClaims(request)` and `AuthClaims` type — extracts role, force_password_change, and email from JWT server-side.
**Where**: `src/lib/auth/claims.ts`
**Depends on**: T2, T3
**Reuses**: `src/lib/supabase/server.ts` (T2), `src/lib/auth/rbac.ts` (T3)
**Requirement**: AUTH-01, AUTH-02, AUTH-05, AUTH-06, AUTH-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `AuthClaims` type exported: `{ role: string | null; forcePasswordChange: boolean; email: string }`
- [ ] `getClaims(request: NextRequest): Promise<AuthClaims | null>` — creates server client, gets session, extracts `app_metadata.role`, `app_metadata.force_password_change`, `user.email`
- [ ] Returns `null` when no session or token invalid
- [ ] Role defaults to `null` when `app_metadata.role` is absent (edge case AUTH-19)
- [ ] Gate check passes: `npm run lint && npm run typecheck && npm run build`

**Tests**: none
**Gate**: build

---

#### T5: Create seed-admin script ✅ Complete

**What**: Create `scripts/seed-admin.mjs` that uses Supabase Admin API to create the initial SUPER_ADMIN user with `force_password_change: true`.
**Where**: `scripts/seed-admin.mjs`
**Depends on**: T1
**Reuses**: None (standalone script using `@supabase/supabase-js` admin client)
**Requirement**: AUTH-05 (1º admin via D5)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Script reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from env; aborts with clear message if missing
- [ ] Creates user via `admin.createUser({ email, password, email_confirm: true, app_metadata: { role: "SUPER_ADMIN", force_password_change: true } })`
- [ ] Default email/password configurable via env vars `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` (fallback: `admin@ivc.com` / `Temp1234`)
- [ ] Prints success (user ID) or error to stdout
- [ ] Gate check passes: `npm run lint && npm run typecheck && npm run build` (script is .mjs, not linted by eslint, but build must not break)

**Tests**: none
**Gate**: build

---

### Phase 2: Auth API

#### T6: Create member login route handler ✅ Complete

**What**: Create `src/app/api/auth/login/route.ts` — POST handler that authenticates member via `signInWithPassword`, sets session cookies, and redirects to `/painel`.
**Where**: `src/app/api/auth/login/route.ts`
**Depends on**: T2, T3
**Reuses**: `src/lib/supabase/server.ts` (T2)
**Requirement**: AUTH-01, AUTH-02, AUTH-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `POST(request: Request)` exported; reads form data (email, password)
- [x] Calls `signInWithPassword({ email, password })` via Supabase server client
- [x] On success: returns redirect to `/painel` with session cookies set
- [x] On failure: returns redirect to `/login?error=invalid_credentials` (no session set)
- [x] Does not reveal whether email exists (generic error per AUTH-17)
- [x] Gate check passes: `npm run lint && npm run typecheck && npm run build`

**Tests**: none
**Gate**: build

---

#### T7: Create admin login route handler ✅ Complete

**What**: Create `src/app/api/auth/login/admin/route.ts` — POST handler for admin login, same as T6 but redirects to `/admin`.
**Where**: `src/app/api/auth/login/admin/route.ts`
**Depends on**: T2, T3
**Reuses**: `src/lib/supabase/server.ts` (T2)
**Requirement**: AUTH-05, AUTH-06, AUTH-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `POST(request: Request)` exported; reads form data (email, password)
- [x] Calls `signInWithPassword({ email, password })` via Supabase server client
- [x] On success: returns redirect to `/admin` with session cookies set
- [x] On failure: returns redirect to `/login/admin?error=invalid_credentials`
- [x] Does not reveal whether email exists (generic error per AUTH-17)
- [x] Gate check passes: `npm run lint && npm run typecheck && npm run build`

**Tests**: none
**Gate**: build

---

#### T8: Create logout route handler ✅ Complete

**What**: Create `src/app/api/auth/logout/route.ts` — POST handler that signs out and redirects to `/login`.
**Where**: `src/app/api/auth/logout/route.ts`
**Depends on**: T2
**Reuses**: `src/lib/supabase/server.ts` (T2)
**Requirement**: AUTH-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `POST(request: Request)` exported
- [x] Calls `signOut()` via Supabase server client (clears cookies)
- [x] Returns redirect to `/login`
- [x] Gate check passes: `npm run lint && npm run typecheck && npm run build`

**Tests**: none
**Gate**: build

---

#### T9: Create trocar-senha route handler ✅ Complete

**What**: Create `src/app/api/auth/trocar-senha/route.ts` — POST handler that validates new password, updates it via Supabase, and clears `force_password_change` flag via admin API.
**Where**: `src/app/api/auth/trocar-senha/route.ts`
**Depends on**: T2, T3
**Reuses**: `src/lib/supabase/server.ts` (T2), `src/lib/auth/rbac.ts` (T3)
**Requirement**: AUTH-09, AUTH-10, AUTH-11, AUTH-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `POST(request: Request)` exported; reads form data (new_password)
- [x] Validates password server-side: min 8 chars, at least one letter and one number (AUTH-11)
- [x] On validation failure: redirect to `/trocar-senha?error=weak_password`
- [x] Calls `supabase.auth.updateUser({ password: newPassword })` to set new password
- [x] Calls `admin.updateUserById(userId, { app_metadata: { ...existing, force_password_change: false } })` to clear flag — **requires `SUPABASE_SERVICE_ROLE_KEY`** (creates admin client); reads existing app_metadata before update to preserve `role`; missing key → 500 JSON
- [x] On success: redirect to `/painel` or `/admin` based on user's role (via `isAdminRole()`)
- [x] Gate check passes: `npm run lint && npm run typecheck && npm run build`
- [x] **BLOCKER NOTE**: Full runtime probe of flag clearing requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (provided by user). Code complete and build-clean; runtime probe pending env key.

**Tests**: none
**Gate**: build

---

### Phase 3: Pages + Route Protection

#### T10: Create member login page ✅ Complete

**What**: Create `src/app/login/page.tsx` — server-rendered login form that POSTs to `/api/auth/login` and displays error messages from query params.
**Where**: `src/app/login/page.tsx`
**Depends on**: T6
**Reuses**: Tailwind tokens from `src/app/globals.css`, page patterns from `src/app/eventos/page.tsx`
**Requirement**: AUTH-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Page renders a form with email and password inputs
- [x] Form uses `action="/api/auth/login"` with method POST (server component, no client JS needed)
- [x] Reads `searchParams.error` to display "Credenciais inválidas" when `error=invalid_credentials`
- [x] Follows IVC design tokens and layout (max-w, padding, Montserrat font)
- [x] Gate check passes: `npm run lint && npm run typecheck && npm run build`

**Tests**: none
**Gate**: build

---

#### T11: Create admin login page ✅ Complete

**What**: Create `src/app/login/admin/page.tsx` — admin login form, same pattern as T10 but POSTs to `/api/auth/login/admin`.
**Where**: `src/app/login/admin/page.tsx`
**Depends on**: T7
**Reuses**: `src/app/login/page.tsx` (T10) patterns, Tailwind tokens
**Requirement**: AUTH-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Page renders a form with email and password inputs
- [x] Form uses `action="/api/auth/login/admin"` with method POST
- [x] Reads `searchParams.error` to display error message
- [x] Visual difference from T10: title/header indicates "Área Administrativa" (D4 — separation of context)
- [x] Gate check passes: `npm run lint && npm run typecheck && npm run build`

**Tests**: none
**Gate**: build

---

#### T12: Create trocar-senha page ✅ Complete

**What**: Create `src/app/trocar-senha/page.tsx` — password change form that POSTs to `/api/auth/trocar-senha` with client-side validation (min 8 chars, letter+number).
**Where**: `src/app/trocar-senha/page.tsx`
**Depends on**: T9
**Reuses**: Tailwind tokens, page patterns
**Requirement**: AUTH-09, AUTH-10, AUTH-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Page renders a form with new password + confirm password inputs
- [x] Form uses `action="/api/auth/trocar-senha"` with method POST
- [x] Client-side validation: min 8 chars, at least one letter, at least one number (AUTH-11)
- [x] Shows `searchParams.error` message when present (`weak_password`)
- [x] Gate check passes: `npm run lint && npm run typecheck && npm run build`

**Tests**: none
**Gate**: build

---

#### T13: Create member landing (painel)

**What**: Create `src/app/painel/page.tsx` — minimal server component that calls `getClaims()` and displays email + role + logout button.
**Where**: `src/app/painel/page.tsx`
**Depends on**: T4
**Reuses**: `src/lib/auth/claims.ts` (T4), Tailwind tokens, page patterns
**Requirement**: AUTH-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Server component calls `getClaims()` to extract email and role
- [ ] Displays user email and role ("MEMBRO") in the page
- [ ] Includes a logout form (POST to `/api/auth/logout`)
- [ ] Gate check passes: `npm run lint && npm run typecheck && npm run build`

**Tests**: none
**Gate**: build

---

#### T14: Create admin landing

**What**: Create `src/app/admin/page.tsx` — minimal server component that calls `getClaims()` and displays email + role + logout button (admin context).
**Where**: `src/app/admin/page.tsx`
**Depends on**: T4
**Reuses**: `src/lib/auth/claims.ts` (T4), Tailwind tokens, `src/app/painel/page.tsx` (T13) patterns
**Requirement**: AUTH-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Server component calls `getClaims()` to extract email and role
- [ ] Displays user email and role in the page (header: "Área Administrativa")
- [ ] Includes a logout form (POST to `/api/auth/logout`)
- [ ] Gate check passes: `npm run lint && npm run typecheck && npm run build`

**Tests**: none
**Gate**: build

---

#### T15: Create proxy.ts for route protection

**What**: Create `src/proxy.ts` — Next 16 proxy that refreshes session on each request, enforces RBAC redirects, and forces password change redirect.
**Where**: `src/proxy.ts`
**Depends on**: T4
**Reuses**: `src/lib/auth/claims.ts` (T4), `src/lib/auth/rbac.ts` (T3)
**Requirement**: AUTH-02, AUTH-06, AUTH-07, AUTH-13, AUTH-14, AUTH-15, AUTH-16

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Exports default function `proxy(request: NextRequest): Promise<NextResponse>` (Next 16 convention)
- [ ] Matcher configured for: `/painel/:path*`, `/admin/:path*`, `/trocar-senha`
- [ ] `/trocar-senha`: if no session → redirect to `/login`; if session → allow (200)
- [ ] `/painel/:path*`: no session → `/login`; `force_password_change` → `/trocar-senha`; admin role → `/admin` (redirect loop prevention)
- [ ] `/admin/:path*`: no session → `/login/admin`; `force_password_change` → `/trocar-senha`; MEMBRO role → `/login/admin`
- [ ] Session refresh: calls `getClaims()` which internally refreshes expired tokens via `@supabase/ssr`
- [ ] Gate check passes: `npm run lint && npm run typecheck && npm run build`

**Tests**: none
**Gate**: build

---

## Phase Execution Map

Execution is strictly sequential phase by phase: Phase 1 completes before Phase 2, Phase 2 before Phase 3. Within a phase, tasks run in task-number order; cross-phase dependencies (all pointing backward) are listed in each task body. No intra-phase parallelism.

- **Phase 1 (Foundation)**: T1 → T2 → T4, T1 → T3 → T4, T1 → T5
- **Phase 2 (Auth API)**: T6, T7, T8, T9 — independent (deps on Phase 1 only)
- **Phase 3 (Pages + Protection)**: T10, T11, T12, T13, T14, T15 — independent (deps on Phases 1-2 only)

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Install deps + npm scripts | 2 files (package.json + node_modules) | ⚠️ Cohesive config — acceptable |
| T2: Supabase server client | 1 file | ✅ Granular |
| T3: RBAC helper | 1 file | ✅ Granular |
| T4: Auth claims DAL | 1 file | ✅ Granular |
| T5: Seed admin script | 1 file | ✅ Granular |
| T6: Login route handler | 1 file | ✅ Granular |
| T7: Admin login route handler | 1 file | ✅ Granular |
| T8: Logout route handler | 1 file | ✅ Granular |
| T9: Trocar-senha route handler | 1 file | ✅ Granular |
| T10: Login page | 1 file | ✅ Granular |
| T11: Admin login page | 1 file | ✅ Granular |
| T12: Trocar-senha page | 1 file | ✅ Granular |
| T13: Painel landing | 1 file | ✅ Granular |
| T14: Admin landing | 1 file | ✅ Granular |
| T15: proxy.ts | 1 file | ✅ Granular |

---

## Diagram-Definition Cross-Check

Intra-phase dependencies are checked. Cross-phase deps are not diagram-checked (validated separately by forward-phase check — none detected).

**Phase 1 (T1-T5):**

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | — | ✅ Match |
| T2 | T1 | T1 -> T2 | ✅ Match |
| T3 | T1 | T1 -> T3 | ✅ Match |
| T4 | T2, T3 | T2 -> T4, T3 -> T4 | ✅ Match |
| T5 | T1 | T1 -> T5 | ✅ Match |

**Phase 2 (T6-T9):** No intra-phase dependencies — diagram shows no arrows.

| Task | Depends On (task body) | Intra-Phase? | Status |
| ---- | ---------------------- | ------------ | ------ |
| T6 | T2, T3 | No (Phase 1) | ✅ N/A |
| T7 | T2, T3 | No (Phase 1) | ✅ N/A |
| T8 | T2 | No (Phase 1) | ✅ N/A |
| T9 | T2, T3 | No (Phase 1) | ✅ N/A |

**Phase 3 (T10-T15):** No intra-phase dependencies — diagram shows no arrows.

| Task | Depends On (task body) | Intra-Phase? | Status |
| ---- | ---------------------- | ------------ | ------ |
| T10 | T6 | No (Phase 2) | ✅ N/A |
| T11 | T7 | No (Phase 2) | ✅ N/A |
| T12 | T9 | No (Phase 2) | ✅ N/A |
| T13 | T4 | No (Phase 1) | ✅ N/A |
| T14 | T4 | No (Phase 1) | ✅ N/A |
| T15 | T4 | No (Phase 1) | ✅ N/A |

---

## Test Co-location Validation

Since all code layers have `Required Test Type: none` (no test runner until F10), all tasks' `Tests: none` are consistent with the matrix.

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Config / deps | none | none | ✅ OK |
| T2 | Supabase client wrapper | none | none | ✅ OK |
| T3 | Auth DAL (rbac) | none | none | ✅ OK |
| T4 | Auth DAL (claims) | none | none | ✅ OK |
| T5 | Config / scripts | none | none | ✅ OK |
| T6 | Route Handler | none | none | ✅ OK |
| T7 | Route Handler | none | none | ✅ OK |
| T8 | Route Handler | none | none | ✅ OK |
| T9 | Route Handler | none | none | ✅ OK |
| T10 | Page | none | none | ✅ OK |
| T11 | Page | none | none | ✅ OK |
| T12 | Page | none | none | ✅ OK |
| T13 | Page | none | none | ✅ OK |
| T14 | Page | none | none | ✅ OK |
| T15 | proxy.ts | none | none | ✅ OK |
