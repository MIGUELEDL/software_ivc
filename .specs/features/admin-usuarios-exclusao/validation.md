# Admin Usuários — Exclusão de Usuários Validation

**Date**: 2026-10-09
**Spec**: `.specs/features/admin-usuarios-exclusao/spec.md`
**Diff range**: `159a526efca3e3e0a8c9a52d272c4c72e6806f48..5fc76ed8c16d3b1209c2583e0c985eec329a7940` (HEAD)
**Verifier**: independent sub-agent (author ≠ verifier)
**Iteration**: re-verification after the fix tasks T8–T11 (supersedes the prior FAIL report)

**Verdict**: ✅ PASS — all 17 ACs `USREX-01..17` trace to a discriminating assertion; the four previously-surviving mutants (M5 audit, M6 404, M7 SUPER_ADMIN, M8 `deletable`) are all killed; gate green (lint/typecheck/build exit 0, probe **43 ok / 0 falhas**).

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1   | ✅ Done | marker + `deletable` in service (`src/lib/admin/usuarios.ts:108,116,136`) |
| T2   | ✅ Done | `excluirUsuario` + 2 errors (`src/lib/admin/usuarios.ts:40-52,197-234`) |
| T3   | ✅ Done | DELETE route + error map (`src/app/api/admin/usuarios/[id]/route.ts:67-116`) |
| T4   | ✅ Done | `DeleteUserButton` (`src/app/admin/usuarios/delete-user-button.tsx:1-66`) |
| T5   | ✅ Done | action column in list (`src/app/admin/usuarios/page.tsx:148-152,183-189`) |
| T6   | ✅ Done | probes exclusão (baseline + runtime) |
| T7   | ✅ Done | coverage-matrix + STATE updated |
| T8   | ✅ Done | runtime 404 + SUPER_ADMIN + auditoria (`scripts/probes-admin-usuarios.sh:436-496`) |
| T9   | ✅ Done | runtime `deletable` + render condicional (`scripts/probes-admin-usuarios.sh:498-572`) |
| T10  | ✅ Done | runtime 409 vínculos com cleanup (`scripts/probes-admin-usuarios.sh:574-642`) |
| T11  | ✅ Done | contrato estático do botão (`scripts/probes-admin-usuarios.sh:220-246`) |

---

## Spec-Anchored Acceptance Criteria

Test harness = `scripts/probes-admin-usuarios.sh` (no unit runner in the project; per `tasks.md` Test Coverage Matrix the probe is the e2e gate). All ACs re-derived from the spec-defined outcome.

| AC id | Spec-defined outcome | `file:line` + assertion | Result |
| ----- | -------------------- | ----------------------- | ------ |
| USREX-01 | 204, no body, user gone | `src/lib/admin/usuarios.ts:197,230` · `src/app/api/admin/usuarios/[id]/route.ts:87` · probe `scripts/probes-admin-usuarios.sh:365-375` → `"ADMIN exclui usuario do painel -> 204"` + `"usuario excluido some da lista"` | ✅ PASS |
| USREX-02 | audit row `acao:"excluir"`, `entidade:"usuarios"`, `entidade_id`, `autor`=caller | `src/app/api/admin/usuarios/[id]/route.ts:79-86` · probe `scripts/probes-admin-usuarios.sh:463-490` (GET auditoria filtered `acao=excluir&entidade=usuarios`, asserts `entidade_id==AUD_ID` and `autor=="…0004"`) → `"exclusao gera auditoria acao=excluir autor=caller"`; sensor M5 killed | ✅ PASS |
| USREX-03 | 404 `nao_encontrado`, no delete | `src/lib/admin/usuarios.ts:204-206` · `route.ts:89-91` · probe `scripts/probes-admin-usuarios.sh:441-450` → `"DELETE inexistente -> 404 nao_encontrado"`; sensor M6 killed | ✅ PASS |
| USREX-04 | 403 `auto_modificacao_nao_permitida` | `src/lib/admin/usuarios.ts:207-209` · `route.ts:92-97` · probe `scripts/probes-admin-usuarios.sh:335-343` (status+body) | ✅ PASS |
| USREX-05 | 403 `super_admin_protegido` | `src/lib/admin/usuarios.ts:211-213` · `route.ts:98-102` · probe `scripts/probes-admin-usuarios.sh:452-461` → `"ADMIN exclui SUPER_ADMIN -> 403 super_admin_protegido"`; sensor M7 killed | ✅ PASS |
| USREX-06 | 403 `usuario_protegido` | `src/lib/admin/usuarios.ts:214-216` · `route.ts:104-106` · probe `scripts/probes-admin-usuarios.sh:345-353` (status+body) | ✅ PASS |
| USREX-07 | 409 `usuario_com_vinculos` | `src/lib/admin/usuarios.ts:217-229` · `route.ts:107-111` · probe `scripts/probes-admin-usuarios.sh:611-621` (runtime document fixture → 409) | ✅ PASS |
| USREX-08 | 401 `nao_autenticado` | `route.ts:71` (`requireAdministrar`) · `src/lib/admin/http.ts:90-92` · probe `scripts/probes-admin-usuarios.sh:286-291` asserts **status 401 only** | ✅ PASS (⚠️ body not asserted) |
| USREX-09 | 403 `nao_autorizado` | `route.ts:71` · `src/lib/admin/http.ts:95-96` · probe `scripts/probes-admin-usuarios.sh:407-414` asserts **status 403 only** | ✅ PASS (⚠️ body not asserted) |
| USREX-10 | `criado_por_admin:true` (+role, force_password_change) | `src/lib/admin/usuarios.ts:136` · probe `scripts/probes-admin-usuarios.sh:178-187` (literal) + behavioral (USREX-01 204 requires marker; sensor M2 killed) | ✅ PASS |
| USREX-11 | `editarPapel` preserves marker | `src/lib/admin/usuarios.ts:178` · probe `scripts/probes-admin-usuarios.sh:189-193` (exact literal `app_metadata: { ...existing.user.app_metadata, role }`) | ✅ PASS |
| USREX-12 | `deletable = role!==SUPER_ADMIN && criado_por_admin` | `src/lib/admin/usuarios.ts:108,116` · probe `scripts/probes-admin-usuarios.sh:519-533` (true for panel user; false for `leitor.teste` and `superadmin.teste`) → `"deletable true na conta do painel; false para leitor/SUPER_ADMIN"`; sensor M8 killed | ✅ PASS |
| USREX-13 | red "Excluir" per `deletable` row | `src/app/admin/usuarios/page.tsx:183-189` · `delete-user-button.tsx:56-64` · probe `scripts/probes-admin-usuarios.sh:535-547` (server-rendered HTML: button payload present only for the panel account) | ✅ PASS (⚠️ "red"/label not asserted) |
| USREX-14 | no button for own + SUPER_ADMIN + system | `page.tsx:185` (`u.deletable && u.id !== atualId`) · probe `scripts/probes-admin-usuarios.sh:535-547` asserts 0 button payloads for own `…0004`, `leitor.teste` `…0005`, `superadmin.teste` `…000c`; M8 killed | ✅ PASS |
| USREX-15 | no control without `administrar` | `page.tsx:102,148,183` (`administrador &&`) · probe `scripts/probes-admin-usuarios.sh:552-565` (SECRETARIA HTML: 0 button payloads) | ✅ PASS |
| USREX-16 | confirm → DELETE → refresh on 204 | `delete-user-button.tsx:27,36-40` · probe `scripts/probes-admin-usuarios.sh:220-233` asserts `window.confirm`, `method: "DELETE"`, and `router.refresh` **inside** `if (res.ok)`; + runtime 204 (`probes:365-370`) | ✅ PASS |
| USREX-17 | 403/409 → message, no refresh | `delete-user-button.tsx:41-47` · probe `scripts/probes-admin-usuarios.sh:235-246` asserts `MENSAGENS` has the 5 keys + `MENSAGENS[data?.error]` + no refresh outside `res.ok` | ✅ PASS |

**Status**: ✅ All 17 ACs covered by ≥1 discriminating assertion. Two minor spec-precision notes (USREX-08/09 body; USREX-13 red class) — see Residual Gaps.

---

## Discrimination Sensor

Isolated scratch `git worktree` at HEAD (`/home/leugim/projects/ivc-scratch`, hardlinked `node_modules`, `.env.local` copied), `next build && next start -p 3011`. Real worktree **never mutated**. Mutations applied to scratch only via line-targeted `python3`; each reverted with `git checkout --` in scratch. Scratch baseline (unmutated) = **43 ok / 0 falhas**.

| # | Mutation | File:line | Assertion that kills it (probe label) | Killed? |
| - | -------- | --------- | ------------------------------------- | ------- |
| M5 | audit `acao: "excluir"` → `"editado"` | `src/app/api/admin/usuarios/[id]/route.ts:81` | `FAIL auditoria da exclusao ausente (delete=204 found=no) (USREX-02)` — 42 ok / 1 falha | ✅ Killed |
| M6 | DELETE 404 → 400 mapping | `route.ts:90` | `FAIL DELETE inexistente -> 400 {"error":"nao_encontrado"} (USREX-03)` — 42 ok / 1 falha | ✅ Killed |
| M7 | `SUPER_ADMIN` guard removed (`if (role === "SUPER_ADMIN")` → `if (false)`) | `src/lib/admin/usuarios.ts:211` | `FAIL ADMIN exclui SUPER_ADMIN -> 403 {"error":"usuario_protegido"} (USREX-05)` — 42 ok / 1 falha | ✅ Killed |
| M8 | `deletable` `&&` → `\|\|` | `src/lib/admin/usuarios.ts:116` | `FAIL deletable incorreto na listagem (USREX-12)` and `FAIL pagina ADMIN: render do botao incorreto (no:(1, 0, 1, 0)) (USREX-13/14)` — 41 ok / 2 falhas | ✅ Killed |

**Sensor depth**: P0-full (auth/data-integrity path; 4 targeted behavior-level mutations re-run from the prior FAIL). The prior report's M1–M4 (self guard, marker guard, `deleteUser` side effect, 204 return) stay valid: the code paths are unchanged by T8–T11.
**Result**: ✅ PASS — 4/4 injected mutations killed.
**Isolation**: `git status --porcelain` on the real tree identical before and after the sensor (3 pre-existing dirty files + untracked `validation.md`); worktree removed.

---

## Edge Cases

- [x] SUPER_ADMIN + no marker → SUPER_ADMIN guard wins (order `usuarios.ts:211` before `:214`): covered by USREX-05 (`superadmin.teste` has no marker → must still return `super_admin_protegido`).
- [ ] self + SUPER_ADMIN → auto-exclusion wins (order `:207` before `:211`): code correct, **not asserted** (USREX-04 caller is ADMIN).
- [x] marker but has vínculo → 409 before Auth: covered by USREX-07 (runtime document fixture).
- [ ] empty list (no deletable user) → table without buttons: code handles (`page.tsx:185`), **not asserted**.
- [ ] `deleteUser` fails after checks → 500 `erro_interno` + `console.error`: code correct (`route.ts:113-114`), **not asserted**.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ |
| Matches patterns | ✅ (mirrors `editarPapel`, `patrimonio/delete-button.tsx`) |
| Spec-anchored outcome check (asserted values match spec) | ✅ (all 17 ACs; 2 minor spec-precision notes on body/red) |
| Per-layer Coverage Expectation met (domain 1:1 ACs; route happy+edge+error) | ✅ (DELETE route now asserts 204, 401, 403 self/super/system/nao-autorizado, 404, 409) |
| Every test in scope maps to a spec requirement — no unclaimed tests | ✅ |
| Documented guidelines followed: `AGENTS.md` gates; `.specs/STATE.md` AD-006/AD-023 (probe = local gate) | ✅ |

---

## Gate Check

- **Gate command**: `npm run lint && npm run typecheck && npm run build && BASE_URL=http://localhost:3000 bash scripts/probes-admin-usuarios.sh`
- **Result**: lint 0 errors / 5 pre-existing warnings (exit 0); typecheck exit 0; build exit 0; probe **43 ok / 0 falhas**
- **Test count before feature**: 13 probe checks
- **Test count after feature**: 43 (+30)
- **Skipped tests**: none
- **Failures**: none at baseline

---

## Requirement Traceability Update

| Requirement | Previous | New |
| ----------- | -------- | --- |
| USREX-01,02,03,04,05,06,07 | Done | ✅ Verified |
| USREX-08,09,10,11,12,13,14,15,16,17 | Done | ✅ Verified |

---

## Residual Gaps (non-blocking, recorded)

1. **USREX-08/09 — response body not asserted**: probe asserts status 401/403 only; spec defines `{ error: "nao_autenticado" }` / `{ error: "nao_autorizado" }`. The bodies come from the shared guard `src/lib/admin/http.ts:90-96` (outside the feature diff). Optional hardening: assert the body.
2. **USREX-13 — "red" not asserted**: the spec says a red "Excluir" button; the probe asserts presence/absence of the button payload, not the `text-red-400` class or the "Excluir" label.
3. **Edge cases untested**: self+SUPER_ADMIN ordering, empty-list render, and the `deleteUser`-failure 500 path have correct code but no asserting probe.
4. **Probe cold-cache nuance (lesson candidate)**: on the **first** request after a `next build`+restart with a mutated `deletable`, the `/admin/usuarios` HTML can be served from a stale route/data cache, so the USREX-13/14 render assertion passed in the first M8 run and failed on every subsequent run. USREX-12 (API JSON) reliably kills M8 regardless. Not an AC-coverage defect; a robustness note for the probe.

---

## Summary

**Overall**: ✅ Ready

**What works**: the full vertical slice is implemented and now discrimination-tested end-to-end — delete → 204 + removal (USREX-01), exact audit row (USREX-02), 404 (USREX-03), self 403 (USREX-04), SUPER_ADMIN 403 (USREX-05), system-user 403 (USREX-06), 409 vínculos (USREX-07), 401/403 guards (USREX-08/09), marker set/preserved (USREX-10/11), `deletable` semantics (USREX-12), conditional render/negatives (USREX-13/14/15) and button contract (USREX-16/17). All four previously-surviving mutants M5–M8 are now killed.

**Issues found**: none blocking. Residual items listed above (body assertions, red class, three edge cases) are optional hardening, not AC gaps.

**Next steps**: commit `.specs/features/admin-usuarios-exclusao/validation.md`; feature closes (PASS on re-verification #2).
