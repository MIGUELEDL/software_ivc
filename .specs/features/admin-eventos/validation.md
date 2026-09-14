# Eventos (RF-024) Validation — PROVISIONAL

**Date**: 2026-09-14
**Spec**: `.specs/features/admin-eventos/spec.md`
**Diff range**: `883f673..7667298` (commits do RF-024; batch 1 `883f673`…T7 `7667298`, T8 `4ea42ec`)
**Verifier**: sub-agente independente `tlc-verifier` (autor ≠ verifier) — **PASS pendente** (este relatório é provisório; o Verifier assina a versão final)
**Real runs**: probes executados contra `next start` :3000 (produção, dev `[REDACTED_PROJECT_REF]`, migrations 0001..0012 aplicadas)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1..T4 | ✅ Done | schema + CRUD admin + validação (batches 1) |
| T5..T8 | ✅ Done | `scripts/probes-admin-eventos.sh` 69 ok / 0 falhas (T8) |
| T9   | 🔄 Em fechamento | Persistência deste relatório é dependência; `validate_state.py` roda após Verifier PASS |

---

## Spec-Anchored Acceptance Criteria (EVT-01..16)

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| EVT-01 | tabela `events` com colunas | `supabase/migrations/0012_events.sql:9-22` (title, description nullable, date, time, location, visivel default true, status ATIVO/INATIVO); probe `scripts/probes-admin-eventos.sh:59-71` | ✅ PASS |
| EVT-02 | SELECT anon+authenticated em events | migration:25-31 (`to anon, authenticated`); probe:131-141 | ✅ PASS |
| EVT-03 | escrita `can_access('eventos','escrever')`; sem DELETE | migration:32-45 (insert/update com `with check can_access`), ausência de policy delete (probe:151-160); rotas sem DELETE `src/app/api/admin/eventos/route.ts`, `[id]/route.ts`; probe:199-200 | ✅ PASS |
| EVT-04 | POST válido → 201 `status='ATIVO'` | `src/app/api/admin/eventos/route.ts:12-41` (201 em :40); `src/lib/admin/eventos.ts:146-158` (defaults :157-158); probe runtime:473-489 | ✅ PASS |
| EVT-05 | POST inválido → 400 `{error,dados_invalidos,campos}` | `src/lib/admin/validacao.ts:125-170` (validarEvento :125, data :97, time HH:MM :165); route:20-38; probe:491-500 | ✅ PASS |
| EVT-06 | sem sessão/papel sem escrita → 401/403 | route:13 (`requireEscrita("eventos")`); probe:442 (401), 511-512 (leitor 403), 522-526 (MEMBRO 403) | ✅ PASS |
| EVT-07 | GET lista `date` desc, `ler` → 200, inclui ocultos | route:52-58; service:75-85 (`order("date", { ascending: false })`); probe:503-510, 549-551, 578-580 | ✅ PASS |
| EVT-08 | PATCH parcial campos (incl. visivel/status) → 200 | `src/app/api/admin/eventos/[id]/route.ts:17-51`; service:175-193 (`patch.visivel` :192, `patch.status` :193); probe:493-497, 609-615 | ✅ PASS |
| EVT-09 | PATCH id inexistente → 404 | route:45-48 (404); service:180 (`EventoNaoEncontradoError` :42-45); probe:498-499 | ✅ PASS |
| EVT-10 | status INATIVO oculta do portal | service:116-128 (`buscarEventoPublico` filtra ATIVO :127); probe runtime:620-624 | ✅ PASS |
| EVT-11 | visivel=false oculta do portal | service:103-104 (`listarEventosPublicos` .eq visivel true); probe:552-558 | ✅ PASS |
| EVT-12 | portal lista `visivel=true`+`ATIVO`, `date` asc, do banco | `src/app/eventos/page.tsx:2,15` (`listarEventosPublicos`); service:97-105 (filtros :103-104, asc :105); probe:214-216, 556-575 | ✅ PASS |
| EVT-13 | detalhe `/eventos/[id]` + WhatsApp oficial | `src/app/eventos/[id]/page.tsx:30,39-41,87` (`buscarEventoPublico`, `SOCIAL.whatsapp` + `encodeURIComponent`, botão :87); probe:241-247 + runtime 541-547 | ✅ PASS |
| EVT-14 | `/eventos/[id]` inexistente/oculto → 404 | page:30-36 (`notFound()`); service:119-128; probe:243, 559-564, 621-624 | ✅ PASS |
| EVT-15 | estado vazio "Em breve avisaremos os próximos eventos" | `src/app/eventos/page.tsx:36`; probe runtime:632-643 (todos ocultos → empty, sem seed/A) | ✅ PASS |
| EVT-16 | nav "Eventos" `/eventos` preservado | `src/lib/constants.ts:65`; probe:210-213 | ✅ PASS |

**Status**: ✅ 16/16 ACs com evidência `file:line` e asserção de valor/estado (provisório — Verifier assina).

**Notas de verificação (não são gaps)**:
1. EVT-15 (estado vazio) verificado por runtime real: todos os eventos ocultos (A/B `visivel=false`, seed `INATIVO`) → portal exibe empty e não contém seed nem evento A (probe:632-643).
2. EVT-13 WhatsApp verificado no HTML renderizado: `href="https://wa.me/5583999450781?text=Gostaria%20de%20me%20inscrever%20no%20evento …"` (URL-encoded, número oficial AD-010).

---

## Discrimination Sensor (scratch isolado `/tmp/opencode/sensor-*`)

Baseline mirror: 69 ok/0 falhas. Mutações em cópias (never na árvore real).
**Status**: pendente — o Verifier executa e registra as mutações mortas aqui.

---

## Regression & Gates

| Check | Result |
| ----- | ------ |
| `scripts/probes-admin-eventos.sh` | ✅ 69 ok / 0 falhas (2 runs live) |
| `scripts/probes-admin-lideranca.sh` | ✅ 102 ok / 0 falhas |
| `scripts/probes-admin-membros.sh` | ✅ 139 ok / 0 falhas |
| `scripts/probes-painel.sh` | ✅ 27 ok / 0 falhas |
| `scripts/probes-auth.sh` | ✅ 19 ok / 0 falhas |
| lint / typecheck / build | ✅ 0 errors (4 warnings pré-existentes) / 0 errors / compiled; `/eventos` e `/eventos/[id]` `ƒ Dynamic` |

**Resíduo**: probes com trap EXIT (seed restaurado, A/B ocultos); remoção hard via MCP após runs (dev limpo — apenas seed `Clamor 12h` em `public.events`).

---

## Residual Risks / Process Notes

1. `src/lib/constants.ts` mantém `EVENTS: readonly Evento[] = []` (literal morto, fora do escopo T7) — portal ignora; deixado para limpeza futura.
2. Eventos de probes A/B ficam `INATIVO`+`visivel=false` após trap (não hard-deletados pela app — por design, sem DELETE); limpeza hard = MCP entre runs (padrão `reset-probe-residue.sql`).