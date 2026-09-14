# Igrejas & Liderança (RF-023) Validation

**Date**: 2026-09-14
**Spec**: `.specs/features/admin-lideranca/spec.md`
**Diff range**: `2930aa2..HEAD` (14 commits `a6588c0`..`fcdffcd`)
**Verifier**: sub-agente independente `tlc-verifier` (autor ≠ verifier)
**Real runs**: probes executados contra `next start` :3000 (dev `[REDACTED_PROJECT_REF]`, migrations 0001..0011 aplicadas)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1..T10 | ✅ Done | confirmado por código + probes reais (102 ok/0) |
| T11   | 🔄 Em fechamento | Persistência deste relatório é dependência; `validate_state.py` roda após |

---

## Spec-Anchored Acceptance Criteria (IGR-01..25)

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| IGR-01 | tabela `churches` com colunas | `supabase/migrations/0011_igrejas_lideranca.sql:10-20`; probe `scripts/probes-admin-lideranca.sh:59-65` | ✅ PASS |
| IGR-02 | SELECT anon+authenticated em churches | migration:24-29; probe:132-141 | ✅ PASS |
| IGR-03 | INSERT/UPDATE só `can_access('igrejas','escrever')` | migration:31-44; probe:142-143 | ✅ PASS |
| IGR-04 | DELETE churches só SUPER_ADMIN | migration:46-51; probe:148-153 | ✅ PASS |
| IGR-05 | POST válido → 201 | `src/app/api/admin/igrejas/route.ts:28-87` (201 em :82); probe runtime:520-531 | ✅ PASS |
| IGR-06 | POST inválido → 400 `{error,dados_invalidos,campos}` | route:48-70 + `src/lib/admin/http.ts:22-27`; probe:534-543 (`400` + `"campos"`) | ✅ PASS |
| IGR-07 | sem sessão → 401; leitor → 403 + negativa logada | route:29-32 (`requireEscrita`); http.ts:34-43; probe:460, 492-493, 513 | ✅ PASS |
| IGR-08 | GET lista 200 por `created_at` asc | route:93-105; `src/lib/admin/lideranca.ts:104-117`; probe:491, 484-490 | ✅ PASS |
| IGR-09 | PATCH parcial válido → 200 | `src/app/api/admin/igrejas/[id]/route.ts:24-93`; probe:545-553 | ✅ PASS |
| IGR-10 | PATCH id inexistente → 404 | route:84-89; probe:554 | ✅ PASS |
| IGR-11 | DELETE SUPER_ADMIN → 204 cascata | route:101-131 (204 :121); service:208-218; FK cascade migration:56; probe:667-673, 674-679 | ✅ PASS |
| IGR-12 | DELETE ADMIN (administrar) → 403 | route:110-115; probe:555, 294-301 | ✅ PASS |
| IGR-13 | tabela `leaders` com FK cascade | migration:54-65 (FK :56); probe:66-78 | ✅ PASS |
| IGR-14 | SELECT leaders anon+authenticated | migration:69-74; probe:132-141 | ✅ PASS |
| IGR-15 | escrita leaders `can_access`; sem DELETE | migration:76-92; probe:144-145, 155-159 | ✅ PASS |
| IGR-16 | POST líder → 201 `status='ATIVO'` | `src/app/api/admin/igrejas/[id]/lideres/route.ts:15-72` (201 :62); service:304; probe:558-568 | ✅ PASS |
| IGR-17 | POST líder igreja inexistente → 404 | service:292-293; route:64-69; probe:578 | ✅ PASS |
| IGR-18 | PATCH líder campos → 200 | `src/app/api/admin/lideres/[id]/route.ts:17-92`; service:321-358; probe:581-590 (200 + valor) | ✅ PASS |
| IGR-19 | status INATIVO oculta do portal | route:65-71; service:328-334; probe runtime:628-640 | ✅ PASS |
| IGR-20 | foto válida → 200 `{photo_url}` | `src/app/api/admin/lideres/[id]/foto/route.ts:16-58`; service `subirFotoLider`:367-406; probe:594-603 | ✅ PASS |
| IGR-21 | tipo inválido → 400; >2MB → 413; sem persistir | `src/lib/admin/validacao.ts:61-67`; route:44-55; service:374-378; probe:604-617 | ✅ PASS |
| IGR-22 | portal `#lideranca` ATIVO por `order`, banco | `src/app/page.tsx:19-45`; `src/components/Leadership.tsx:12-88`; service:268-282; probe:621-626 + static 373-399 | ✅ PASS |
| IGR-23 | sem líderes ATIVO → estado vazio | `Leadership.tsx:37-49`; probe:388-392 | ✅ PASS |
| IGR-24 | âncora `#lideranca` + nav | `Leadership.tsx:20`; `src/lib/constants.ts:62`; probe:378-382 | ✅ PASS |
| IGR-25 | `photo_url` persistida; sem expor caminho não-público | service:397-400; bucket público migration:95-106; probe:242-249 + runtime:651-657 | ✅ PASS |

**Status**: ✅ 25/25 ACs com evidência `file:line` e asserção de valor/estado.

**Notas de verificação (não são gaps)**:
1. IGR-23 (estado vazio) e ordenação visual de IGR-22 (2+ líderes) verificados por código/estática (`Leadership.tsx:37-49`, `lideranca.ts:275`); runtime do portal só tem 1 líder ATIVO seed.
2. IGR-21 "não persistir" garantido por caminho de código (exceção antes da persistência, `lideranca.ts:374-378`).

---

## Discrimination Sensor (scratch isolado `/tmp/opencode/sensor-*`)

Baseline mirror: 102 ok/0 falhas. Mutações em cópias (never na árvore real).

| # | Origem | Mutation | Probes matam? |
| - | ------ | -------- | ------------- |
| 1 | `igrejas/[id]/route.ts:110` | flip `!==` → `===` (ADMIN passaria a 204) | ✅ Killed — `FAIL DELETE igreja sem checagem SUPER_ADMIN explicita (IGR-12)` |
| 2 | `lideres/[id]/foto/route.ts:44-49` | bloco FotoTipoInvalido→400 removido | ✅ Killed — `FAIL POST foto incompleto` (IGR-21) |
| 3 | `lideranca.ts:274` | filtro `.eq("status","ATIVO")` removido | ✅ Killed — `FAIL listarLideresAtivos sem filtro/ordem` (IGR-22) |

**Result**: 3/3 killed — ✅ PASS. Scratch descartado; `git status --porcelain` real-tree idêntico ao baseline.

---

## Gate Check

| Suite | Run real | Result |
| ----- | -------- | ------ |
| `bash scripts/probes-admin-lideranca.sh` | `102 ok, 0 falhas` | ✅ |
| `bash scripts/probes-admin-membros.sh` | `139 ok, 0 falhas` | ✅ |
| `bash scripts/probes-painel.sh` | `27 ok, 0 falhas` (após limpeza de resíduo `membro.semcadastro`) | ✅ |
| `bash scripts/probes-auth.sh` | `19 ok, 0 falhas` | ✅ |
| `npm run lint` | 0 erros (4 warnings pré-existentes) | ✅ |
| `npm run typecheck` | 0 erros | ✅ |
| `npm run build` | 0 erros | ✅ |

---

## Edge Cases

- [x] DELETE igreja ADMIN com `administrar` → 403 (IGR-12)
- [x] PATCH igreja/líder inexistente → 404
- [x] Foto `text/plain` → 400; >2MB → 413 (sem persistência)
- [x] Líder INATIVO some do portal e re-ATIVO volta
- [x] Sem sessão → 307 login/401 API
- [x] MEMBRO fail-closed → 307 portal + 403 API

---

## Summary

**Overall**: ✅ PASS
**Spec-anchored**: 25/25 ACs | 0 gaps de precisão de outcome
**Sensor**: 3/3 killed
**Gate**: 287 probes ok (102+139+27+19), 0 falhas; lint/typecheck/build 0 erros
**Diff range**: `2930aa2..HEAD` (14 commits) — confere
**Fix Plans**: nenhum — PASS sem gaps.