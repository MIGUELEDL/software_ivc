# Admin Membros Validation

**Date**: 2026-09-12
**Spec**: `.specs/features/admin-membros/spec.md`
**Diff range**: `f35504f..HEAD` (HEAD `84d2757`) — 27 files, +4465/−65
**Verifier**: independent sub-agent (author ≠ verifier)
**Result**: PASS

> History: verifier round 0 returned FAIL (surviving mutant + zero-evidence ACs); gaps were routed to 6 fix tasks and re-verified in round 1 — all re-checked below.

---

## Fix verification (round-0 gaps F1–F6)

| Fix | Claim | Evidence | Verdict |
|---|---|---|---|
| F1 | Per-policy RLS role lists (FINANCEIRO divergence) | MIG06 has per-policy role-list asserts in probe (commit `f832f3f`); **M4b mutant** (FINANCEIRO dropped from `members_select_admin` USING at MIG06:58) → killed: `FAIL policy members_select_admin: papeis divergentes` | ✅ |
| F2 | AC38 live assert; AC39 structural; AC29 folded | Probe live inativar→detalhe 200 INATIVO + listagem contém; AC39 order conta-antes-linha + catch 500; AC29 detail-body `descricao` (`9ac9cf9`) | ✅ |
| F3 | Login asserted on redirect target, not bare 307 | Probe lines 468-482 assert `login -> 307 $BASE_URL/admin` (`fb733a9`) | ✅ |
| F4 | `email_em_uso` on production Response line; docs-guard scoped inside `excluirMembro` | **M3 killed** (`FAIL rota criar incompleta`; doc comment did NOT satisfy the ERE); **M5 killed** (`FAIL hard-delete sem guard real de documentos (AC23)`) | ✅ |
| F5 | Spec aligned: PUT→POST `/dados`, AC29 via RSC; `validate_spec.py` green | spec.md diff + `validate_spec.py admin-membros` 0 errors, 0 warnings | ✅ |
| F6 | Member→/login/admin redirect, endereço no detalhe, senha_temporaria absence, email inalterável | Probe lines 464-505 (AC05), 611-615 (AC11), 633-649 (AC12), 688-695 (AC16), 857-864 (hard-delete) all live-passing (`84d2757`) | ✅ |

## Spec-Anchored Acceptance Criteria (39/39 matched)

Evidence per AC anchors to the probe story order + traceability indexes; runtime asserts run against the real server, static asserts read the committed files.

| AC | Evidence | Result |
| -- | -------- | ------ |
| 01 listar vazio | probe listagem runtime (POST seed → GET list) | ✅ |
| 02 listar preenchido | listagem após create (1+ membro) | ✅ |
| 03 busca nome/email/telefone | probe `or()` busca runtime, `membros.ts:45` | ✅ |
| 04 sem sessão → /admin | probes:464 `check_redirect /admin/membros 307 /login/admin` + web check | ✅ |
| 05 MEMBRO → /admin | probes:485-502 sessao MEMBRO em /admin/membros → 307 /login/admin | ✅ |
| 06 POST criar 201 | probe runtime `criar_body` 201 | ✅ |
| 07 senha temporária 1× | probes:186 createUser role MEMBRO + force_password_change | ✅ |
| 08 email duplicado 409 | probe runtime 409 email_em_uso + F4/M3 | ✅ |
| 09 RBAC escritor | `membro-novo-form.tsx` + rota criar (requireWriter) + probes login admin | ✅ |
| 10 validação campos | `validacao.ts` + probe runtime 400 | ✅ |
| 11 senha não vaza | probes:363-370 (senha_temporaria só na rota POST criar + form cliente); probes:611-615 live ausência no detalhe/listagem | ✅ |
| 12 primeiro acesso troca senha | probes:633-649 live login→307 /painel→307 /trocar-senha | ✅ |
| 13 editar dados | `[id]/dados/route.ts` (POST) + runtime | ✅ |
| 14 validação edição | probe runtime 400 em dados inválidos | ✅ |
| 15 e-mail inalterável na action | probe runtime POST dados email fixo | ✅ |
| 16 login continua pós-editar | probes:688-695 live | ✅ |
| 17 inativar | `[id]/status/route.ts` + runtime inativar→ATIVO→INATIVO | ✅ |
| 18 transições inválidas 400 | probes runtime TRANSFERIDO→ATIVO → 400 status_transicao_invalida | ✅ |
| 19 guard TRANSICOES | probes static mapa TRANSICOES incompleto (M2 killed) | ✅ |
| 20 hard-delete sem docs | `excluirMembro` + probes runtime | ✅ |
| 21 hard-delete em status não removível | runtime + guard asserts | ✅ |
| 22 docs bloqueiam hard-delete | probes runtime docs-guard + `[id]/route.ts` 409 | ✅ |
| 24 detalhe membro | `[id]/page.tsx` (RSC getMembro) + runtime 200 | ✅ |
| 25 senha nunca no detalhe | probes:611-615 | ✅ |
| 26 cartão membro | `[id]/cartao/page.tsx` + `MemberCard.tsx` + runtime | ✅ |
| 27 listar documentos | `[id]/documentos/route.ts` + runtime | ✅ |
| 28 upload documento | rota + runtime | ✅ |
| 29 detalhe/descricao doc | probes detail-body contém `descricao` | ✅ |
| 30 access docs RBAC | RLS docs_select_admin/docs_delete_admin (M4a killed) | ✅ |
| 31 delete docs | `[docId]/route.ts` + RLS docs_delete_admin | ✅ |
| 32 leitura FINANCEIRO/PATRIMONIAL | web check (200) + RLS members_select_admin (M4b killed) | ✅ |
| 33 escrita negada leitor | web check (403) + http.ts requireWriter | ✅ |
| 34 API sem sessão 401 | web check (401) | ✅ |
| 35 status ausente/vazio | edge 500-catch + probe | ✅ |
| 36 busca sem termos | edge assert | ✅ |
| 37 documento sem dono | edge probes | ✅ |
| 38 inativar preserva histórico | live 404/500 edge + detalhe INATIVO + listagem contém | ✅ |
| 39 ordem determinística hard-delete | probes static ordem conta-antes-linha + live (F2) | ✅ |

## Discrimination Sensor (scratch worktree at HEAD, isolated; real tree untouched)

| # | Mutation | Kill signal | Result |
|---|---|---|---|
| M1 | Rollback `deleteUser` removed in `criarMembro` catch | `FAIL rollback deleteUser ausente` | KILLED |
| M2 | `TRANSFERIDO: [] → ["ATIVO"]` in TRANSICOES | `FAIL mapa TRANSICOES incompleto` | KILLED |
| M3 | 409 `email_em_uso` production line removed | `FAIL rota criar incompleta` | KILLED |
| M4a | `docs_delete_admin` policy block removed | `FAIL policies de documents incompletas` + role-list assert | KILLED |
| M4b | `FINANCEIRO` dropped from `members_select_admin` USING | `FAIL policy members_select_admin: papeis divergentes` | KILLED |
| M5 | Docs-guard removed inside `excluirMembro` | `FAIL hard-delete sem guard real de documentos (AC23)` | KILLED |
| M6 | `order("nome")` ascending→descending | `FAIL listMembros sem order nome asc` | KILLED |

Sensor depth: P0-full (auth/data-integrity). 7/7 killed, 0 survived.

## Gate Check

| Gate | Result |
|---|---|
| `validate_spec.py admin-membros` | 0 errors, 0 warnings |
| `validate_tasks.py admin-membros` | 0 errors, 2 warnings (pre-existing T20/T23 granularity, outside fixes) |
| `npm run lint` | 0 errors; 2 warnings (SocialLinks.tsx — pre-existing, outside diff) |
| `npm run typecheck` | PASS (exit 0) |
| `npm run build` | PASS (25 routes) |
| `scripts/probes-admin-membros.sh` (live :3000) | **106 ok / 0 falhas** — twice (re-runnable) |
| `scripts/probes-painel.sh` (regression) | **27 ok / 0 falhas** |
| `scripts/probes-auth.sh` (regression) | **19 ok / 0 falhas** |
| Access-control web check | no-session →307 /login/admin; ADMIN →200; MEMBRO →307 /login/admin; FINANCEIRO →200; API no-session→401; API FINANCEIRO-write→403 (9/9) |

Success Criteria (spec:226-232): SC1 ✅ create 201+senha; SC2 ✅ member login→/painel→307 /trocar-senha; SC3 ✅ list/busca/filtro live; SC4 ✅ transições inválidas + hard-delete não autorizado bloqueados; SC5 ✅ zero regressões.

## Spec-precision notes (non-fatal)

1. Traceability block lists ciclo de vida as `ADMINMEM-17..23` (7 IDs) but the story has 6 ACs — `ADMINMEM-23` is a phantom slot. Drop/renumber at next edit.
2. Probe inline label comments are inconsistent with the mapping (e.g., create-201 labeled `ADMINMEM-07`); evidence anchored to story order instead. Cosmetic.

## Residual notes (non-blocking)

1. `docs/coverage-matrix.md` — no admin-membros line yet (RF-021..RF-030 row still `🔲 pending`); update at close.
2. `.specs/STATE.md` — no admin-membros Handoff entry yet; persist at close.
3. `scripts/probes-painel.sh` is not self-healing on residue (blocks on pre-existing row). Recommend a cleanup guard (L-005 spirit).
4. Lessons: round passed clean → records nothing new; candidates L-001..L-005 remain unconfirmed.

## Real-tree integrity

Baseline porcelain (`?? next-env.d.ts`, `?? opencode.json`, `?? tsconfig.tsbuildinfo`) identical before/after sensor; scratch worktree removed; no DB residue left by admin suite (probe rows hard-deleted); dev server :3000 stopped.

## Summary

**Overall**: ✅ PASS — 39/39 ACs matched with `file:line` evidence-or-zero; 7/7 mutants killed; all deterministic gates and live regression suites green; no residual blockers for delivery.