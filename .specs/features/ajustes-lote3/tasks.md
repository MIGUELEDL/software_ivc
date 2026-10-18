# Ajustes Lote 3 Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/ajustes-lote3/design.md`
**Status**: Draft

---

## Test Coverage Matrix

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Migration/RPC | probe estática | tier script grep | `supabase/migrations/002[78]_*.sql` | `bash scripts/probe-ajustes-lote3.sh` |
| API Routes | probe estática | tier script grep | `src/app/api/admin/membros/[id]/redefinir-senha/route.ts` | `bash scripts/probe-ajustes-lote3.sh` |
| Pages / Components | probe estática + vitest existente | tier script + 243 verdes | `src/app/**`, `src/components/**` | `npm run test:ci && bash scripts/probe-ajustes-lote3.sh` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Após migration/service | `export PATH="$HOME/.nvm/versions/node/v22.0/bin:$PATH" && npm run typecheck && bash scripts/probe-ajustes-lote3.sh` |
| Full | Após pages/integração | `export PATH="$HOME/.nvm/versions/node/v22.0/bin:$PATH" && npm run lint && npm run typecheck && npm run test:ci && bash scripts/probe-ajustes-lote3.sh` |
| Build | Antes do fechamento | `export PATH="$HOME/.nvm/versions/node/v22.0/bin:$PATH" && npm run build` |

---

## Execution Plan

### Phase A: Hotfix eventos + RPC aniversário (independentes)

```
T1, T4
```

### Phase B: Impressão multi-cartão

```
T2, T3
```

Depends on: T3 ← T2.

### Phase C: Banner aniversário

```
T5
```

Depends on: T5 ← T4.

### Phase D: Senhas

```
T6, T8, T7
```

Depends on: T7 ← T6. T8 independente.

### Phase E: Fechamento

```
T9
```

Depends on: T9 ← T1..T8.

---

## Task Breakdown

### T1: Migration parity status eventos

**Depends on**: None

- [x] `supabase/migrations/0027_event_status_parity.sql`: UPDATE ATIVO→EM ABERTO, INATIVO→CONCLUIDO; DROP CONSTRAINT events_status_check; ADD CONSTRAINT check `('EM ABERTO','CONCLUIDO')`
- [x] Aplicada em dev `[REDACTED_PROJECT_REF]` e prod `[REDACTED_PROJECT_REF]` via MCP
- [x] Probe manual: POST /api/admin/eventos em prod → 201 (2026-10-17: POST local 201 status EM ABERTO + INSERT SQL aceito e removido em prod e dev)

**Tests**: tier `scripts/probe-ajustes-lote3.sh` (grep constraint + status)
**Gate**: probe tier + POST 201 em prod

### T2: Seleção de até 4 na lista admin

**Depends on**: None

- [x] Componente client de seleção com checkbox por linha na página `/admin/membros`
- [ ] Máximo 4 marcações (5ª bloqueada com aviso)
- [ ] Botão "Imprimir cartões (N)" → `/admin/membros/imprimir?ids=`

**Tests**: tier estática CART-01 (checkbox, limite 4, rota)
**Gate**: `npm run test:ci` + typecheck + probe

### T3: Página de impressão multi-cartão + CSS A4

**Depends on**: T2

- [x] `/admin/membros/imprimir/page.tsx` (server, ≤4 ids, 404/aviso)
- [ ] Pares frente+verso empilhados (flex-column)
- [ ] `MultiCardPrintStyles`: A4 portrait, faces ~86,7×55,0mm (+2px/lado), labels/botão escondidos no print

**Tests**: tier estática CART-02..05
**Gate**: `npm run test:ci` + typecheck + build

### T4: RPC aniversariantes do dia

**Depends on**: None

- [x] `supabase/migrations/0028_aniversariantes_rpc.sql`: `aniversariantes_do_dia()` SECURITY DEFINER retorna `text[]`, ATIVO, fuso America/Fortaleza, GRANT EXECUTE anon
- [ ] Aplicada em dev e prod

**Tests**: tier estática ANI-06
**Gate**: probe tier + query REST anon em prod

### T5: Banner aniversário na home

**Depends on**: T4

- [x] `src/components/BirthdayBanner.tsx` (client): recebe nomes via prop (fetch RPC anon no RSC `page.tsx`), dismiss X em memória, tema landing, ícone Cake, responsivo 360px, animação sutil
- [x] Integrado no topo de `src/app/page.tsx` (escondido no print)

**Tests**: tier estática ANI-01..05
**Gate**: `npm run test:ci` + typecheck + build

### T6: PasswordInput com ver senha

**Depends on**: None

- [x] `src/components/PasswordInput.tsx` (olho Eye/EyeOff, aria-label)
- [x] Aplicado em login admin, login membro, trocar-senha

**Tests**: tier estática SEN-06
**Gate**: `npm run test:ci` + typecheck

### T7: Fluxo trocar senha por e-mail

**Depends on**: T6

- [x] `/alterar-senha`: botão enviar link → resetPasswordForEmail → estado "confira seu e-mail"
- [x] `/atualizar-senha`: form nova senha+confirmação, detecção recovery, updateUser + limpa force flag, redirect login; sem session → erro + novo link
- [x] Links nos navbars painel e admin
- [x] Instruções redirect URL Auth em docs/DEPLOYMENT.md

**Tests**: tier estática SEN-01..03
**Gate**: `npm run test:ci` + typecheck + build

### T8: Redefinir senha membro (admin)

**Depends on**: None

- [x] `POST /api/admin/membros/[id]/redefinir-senha`: requireAdministrar, gera temporária, updateUserById password+force flag, retorna senha 1x, auditoria `redefinir_senha`
- [x] Botão no detalhe do membro visível só ADMIN/SUPER_ADMIN
- [x] Modal exibe senha + copiar + aviso

**Tests**: tier estática SEN-04..05
**Gate**: `npm run test:ci` + typecheck + probe manual em dev

### T9: STATE.md + coverage + fechamento

**Depends on**: T1..T8

- [ ] STATE.md Handoff lote3
- [ ] coverage-matrix
- [ ] Verifier PASS

**Tests**: —
**Gate**: validate_state + Verifier PASS
