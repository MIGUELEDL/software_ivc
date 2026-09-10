# Validation — auth

**Result**: PASS

- **Data**: 2026-09-10
- **Verifier**: tlc-verifier (independente, autor ≠ implementador) — re-verify it-4 (após it-1 FAIL, it-2 FAIL, it-3 FAIL)
- **Range**: `444949f^..78d3832` (22 commits)
- **Reconciliação AC**: 19/19 AUTH-01..19 com evidência `file:line` (evidence-or-zero)
- **Gates**: `validate_spec.py auth` 0 errors/0 warnings · `validate_tasks.py auth` 0 errors (15 warnings `Tests: none` consistentes com TCM, AD-006/F10) · `npm run lint` 0 errors (2 warnings pré-existentes SocialLinks.tsx) · `npm run typecheck` 0 errors · `npm run build` 0 errors
- **Probes live**: `scripts/probes-auth.sh` (executável, 100755) → **19 ok / 0 falhas** (dev server real)
- **Sensor de mutação**: 6 mutantes injetados, 5 killed, 1 equivalente (M6 — guard dupla produz mesmo observável; documentado, sem fix task)

## Spec-anchored AC reconciliation

| AC | Evidência (`file:line`) | Resultado |
|---|---|---|
| AUTH-01 | `src/app/api/auth/login/route.ts:10-13,21` | ✅ code |
| AUTH-02 | `scripts/probes-auth.sh:65` + `src/proxy.ts:15-18` | ✅ runtime |
| AUTH-03 | `src/app/api/auth/login/route.ts:15-19`, `src/app/login/page.tsx:23-27` | ✅ code |
| AUTH-04 | `src/app/painel/page.tsx:26,35` | ✅ code |
| AUTH-05 | `src/app/api/auth/login/admin/route.ts:10-13,21` | ✅ code |
| AUTH-06 | `scripts/probes-auth.sh:66` + `src/proxy.ts:19-21` | ✅ runtime |
| AUTH-07 | `src/proxy.ts:44-47`, `src/lib/auth/rbac.ts:10-12` | ✅ code |
| AUTH-08 | `src/app/admin/page.tsx:26,35` | ✅ code |
| AUTH-09 | `src/proxy.ts:29-31`, `src/lib/auth/claims.ts:46,91` | ✅ code |
| AUTH-10 | `src/app/api/auth/trocar-senha/route.ts:35-37,59-64,78-80` | ✅ code (runtime exige SERVICE_ROLE_KEY) |
| AUTH-11 | `scripts/probes-auth.sh:100-115` + `route.ts:11-19` + pages | ✅ runtime |
| AUTH-12 | `spec.md:104` (plataforma-guarantee Supabase; probe runtime pós SERVICE_ROLE_KEY) | ⚠️ gap anotado, não-bloco |
| AUTH-13 | `src/proxy.ts:34-36`, set `probes-auth.sh:27-33` + `rbac.ts:1-8` | ✅ code + runtime (set) |
| AUTH-14 | `src/proxy.ts:45-47`, `rbac.ts:14-16`, `probes-auth.sh:39-43` | ✅ code + runtime (helper) |
| AUTH-15 | `probes-auth.sh:71-78` (public 200) + `:65-67` (protected 307), `proxy.ts:52-53` | ✅ runtime |
| AUTH-16 | `src/proxy.ts:14-26`, `trocar-senha/route.ts:29-33,39-43` | ✅ runtime (no-session) + code |
| AUTH-17 | `login/route.ts:15-19`, `login/admin/route.ts:15-19` | ✅ code |
| AUTH-18 | `scripts/probes-auth.sh:82-96` + `logout/route.ts:20-22` | ✅ runtime (membro) + code (admin) |
| AUTH-19 | `src/lib/auth/claims.ts:45,90`, `src/proxy.ts:40-42,45-47` | ✅ code |

## Sensor de discriminação

| Mutante | Local | Resultado |
|---|---|---|
| M1 proxy `/painel` → `/login/admin` | `proxy.ts:17` | ✅ killed |
| M2 proxy `/admin` → `/login` | `proxy.ts:20` | ✅ killed |
| M3 proxy `/trocar-senha` → `/login/admin` | `proxy.ts:23` | ✅ killed |
| M8 logout flip → `/login/admin` | `logout/route.ts:21` | ✅ killed |
| M5 bloco política AUTH-11 removido | `trocar-senha/route.ts:11-19` | ✅ killed |
| M6 guard `if(false)` (equivalente) | `trocar-senha/route.ts:29` | ❌ equivalente (mesmo observável AUTH-16) |

## Histórico do loop fix→re-verify

- **it-1 FAIL**: (1) nenhum teste executável discriminava behavior (3/3 mutantes); (2) AUTH-15 `/trocar-senha` listado público vs design; (3) AUTH-18 logout sempre `/login`.
  - Fixes: `6856d00` fix logout área-consciente; `5f50cac` align AUTH-15; `e0feecb` probe commitado `scripts/probes-auth.sh` + `npm run probe:auth`.
- **it-2 FAIL**: M5 sobreviveu — POST fraco sem sessão convergia para o mesmo 307 `weak_password` (sem política ≠ sem sessão indistinguíveis).
  - Fix: `8612778` session guard distinto `?error=auth_required` (política primeiro) + assert `Str0ngPass123` no probe + chmod 100755.
- **it-3 FAIL**: AUTH-18 sem assert (M8 sobreviveu) e metade pública do AUTH-15 sem probe.
  - Fix: `78d3832` probe `POST /api/auth/logout` → 307 `/login` (mata M8) + rotas públicas 200.
- **it-4 PASS**: ambos fechados; 19/19 ACs; sensor exceto mutante equivalente.

## Gaps registrados (não bloqueiam)

1. **AUTH-12** — plataforma-guarantee (Supabase invalida senha antiga ao `updateUser`); probe runtime pendente de `SUPABASE_SERVICE_ROLE_KEY` + usuário seed.
2. **ACs sessão-dependentes** (AUTH-01, 03, 04, 05, 07, 08, 09, 10, 13/14 redirect, 17, 19) — evidência de código `file:line`; assert executável exige seed + sessão real + SERVICE_ROLE_KEY (TCM `none` até F10, AD-006).
3. **M6** — mutante equivalente (dupla guarda produz mesmo observável AUTH-16).

## Blocker externo

- `SUPABASE_SERVICE_ROLE_KEY` **pendente** (`.env.local` comentada): bloqueia `npm run seed:admin` (T5), probe runtime AUTH-10/AUTH-12 e gtests com sessão. Chave anterior fornecida decodifica ref `[REDACTED_PROJECT_REF]` ≠ projeto `[REDACTED_PROJECT_NAME]` (`[REDACTED_PROJECT_REF]`) — rejeitada.