#!/usr/bin/env bash
#
# Regressão estática do lote 3 (CART/EVT/ANI/SEN). Cada tier amarra
# comportamento a texto de código: reverter a implementação derruba a tier.
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

PASS=0
FAIL=0
ok() { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
ko() { FAIL=$((FAIL + 1)); printf '  FAIL %s\n' "$1"; }

printf '== Regressão ajustes-lote3 ==\n'

# ── EVT-01/02: parity de status de eventos ──────────────────────────────────
MIG27="$ROOT/supabase/migrations/0027_event_status_parity.sql"
if [ -f "$MIG27" ] \
  && grep -q "EM ABERTO" "$MIG27" \
  && grep -q "CONCLUIDO" "$MIG27" \
  && grep -q "events_status_check" "$MIG27" \
  && grep -q 'status: "EM ABERTO"' "$ROOT/src/lib/admin/eventos.ts"; then
  ok "EVT-01/02 migration parity + código insere EM ABERTO"
else
  ko "EVT-01/02 migration/código de status de eventos ausente"
fi

# ── CART-01: seleção até 4 na lista ─────────────────────────────────────────
LISTA="$ROOT/src/app/admin/membros/page.tsx"
LISTA_CLIENT="$ROOT/src/app/admin/membros/membros-lista-client.tsx"
if grep -q "MembrosListaClient" "$LISTA" \
  && grep -q "imprimir?ids=" "$LISTA_CLIENT" \
  && grep -q "MAXIMO_CARTOES = 4" "$LISTA_CLIENT"; then
  ok "CART-01 lista admin tem seleção + limite de cartões"
else
  ko "CART-01 seleção/limite de impressão ausente na lista"
fi

# ── CART-02..05: página de impressão + CSS A4 ───────────────────────────────
IMP="$ROOT/src/app/admin/membros/imprimir/page.tsx"
if [ -f "$IMP" ] \
  && grep -q "cartao-print\|cartao-membro" "$IMP" \
  && grep -qE "86[.,]7|86mm|face.*mm" "$IMP" \
  && grep -q "card-face" "$IMP" \
  && grep -q "Frente —" "$IMP" \
  && grep -q "Verso —" "$IMP" \
  && grep -q "PrintButton" "$IMP" \
  && grep -q "parseIdsImpressao" "$IMP"; then
  ok "CART-02..05 página de impressão com faces ampliadas + corte"
else
  ko "CART-02..05 página de impressão ausente ou sem escala"
fi

# ── ANI-01..06: RPC + banner ────────────────────────────────────────────────
MIG28="$ROOT/supabase/migrations/0028_aniversariantes_rpc.sql"
BANNER="$ROOT/src/components/BirthdayBanner.tsx"
if [ -f "$MIG28" ] \
  && grep -q "SECURITY DEFINER" "$MIG28" \
  && grep -q "anon" "$MIG28" \
  && grep -q "America/Fortaleza" "$MIG28" \
  && [ -f "$BANNER" ] \
  && grep -q "aniversariantes" "$BANNER" \
  && grep -q "aniversariantes_do_dia" "$ROOT/src/app/page.tsx" \
  && grep -q "BirthdayBanner" "$ROOT/src/app/page.tsx"; then
  ok "ANI-01..06 RPC (fuso America/Fortaleza) + banner integrado na home"
else
  ko "ANI-01..06 RPC/banner ausente ou fuso errado"
fi

# ── SEN-01..03: fluxo e-mail ────────────────────────────────────────────────
ALT="$ROOT/src/app/alterar-senha/page.tsx"
ATUAL="$ROOT/src/app/atualizar-senha/atualizar-senha-form.tsx"
ATUAL_ROTA="$ROOT/src/app/api/auth/atualizar-senha/route.ts"
if [ -f "$ALT" ] && [ -f "$ATUAL" ] && [ -f "$ATUAL_ROTA" ] \
  && grep -q "resetPasswordForEmail" "$ALT" \
  && grep -q "updateUser" "$ATUAL_ROTA" \
  && grep -q "alterar-senha" "$ROOT/src/app/painel/painel-navbar.tsx" \
  && grep -q "alterar-senha" "$ROOT/src/app/admin/admin-navbar.tsx"; then
  ok "SEN-01..03 fluxo e-mail (alterar + atualizar) integrado"
else
  ko "SEN-01..03 fluxo de troca por e-mail ausente"
fi

# ── SEN-04..05: redefinir senha admin ───────────────────────────────────────
RD="$ROOT/src/app/api/admin/membros/[id]/redefinir-senha/route.ts"
if [ -f "$RD" ] \
  && grep -q "requireAdministrar" "$RD" \
  && grep -q "force_password_change" "$RD" \
  && grep -q "redefinir_senha" "$RD"; then
  ok "SEN-04..05 rota redefinir-senha (guard + force flag + auditoria)"
else
  ko "SEN-04..05 rota redefinir-senha ausente"
fi

# ── SEN-06: ver senha ───────────────────────────────────────────────────────
if [ -f "$ROOT/src/components/PasswordInput.tsx" ] \
  && grep -q "Eye\|eye" "$ROOT/src/components/PasswordInput.tsx" \
  && grep -q "PasswordInput" "$ROOT/src/app/login/admin/page.tsx" \
  && grep -q "PasswordInput" "$ROOT/src/app/trocar-senha/trocar-senha-form.tsx"; then
  ok "SEN-06 PasswordInput com olho nos logins/trocar-senha"
else
  ko "SEN-06 PasswordInput ausente ou não aplicado"
fi

# ── Tier de testes comportamentais (vitest) ─────────────────────────────────
# Literais de asserção: se o teste perder o dente (ex.: asserção trocada por
# presence), a tier cai junto com o mutant no sensor do Verifier.
T_RD="$ROOT/src/app/api/admin/membros/[id]/redefinir-senha/route.test.ts"
T_AT="$ROOT/src/app/api/auth/atualizar-senha/route.test.ts"
T_LISTA="$ROOT/src/app/admin/membros/membros-lista-client.test.tsx"
T_BANNER="$ROOT/src/components/BirthdayBanner.test.tsx"
T_SEN="$ROOT/src/components/PasswordInput.test.tsx"
T_IMP="$ROOT/src/lib/admin/impressao.test.ts"
if [ -f "$T_RD" ] && [ -f "$T_AT" ] && [ -f "$T_LISTA" ] \
  && [ -f "$T_BANNER" ] && [ -f "$T_SEN" ] && [ -f "$T_IMP" ] \
  && grep -q "force_password_change).toBe(true)" "$T_RD" \
  && grep -q "nao_autorizado" "$T_RD" \
  && grep -q "login?ok=password" "$T_AT" \
  && grep -q "force_password_change: false" "$T_AT" \
  && grep -q "4 de 4 cartões selecionados" "$T_LISTA" \
  && grep -q "Ana, Bia e Caio" "$T_BANNER" \
  && grep -q 'input.type).toBe("text")' "$T_SEN" \
  && grep -q 'toEqual(\["a", "b", "c", "d"\])' "$T_IMP"; then
  ok "tier vitest: payload SEN-02/04/05, limite CART-01, ANI-02, SEN-06, corte CART-03"
else
  ko "tier vitest de comportamento ausente ou enfraquecido"
fi

printf '== Resumo: %s ok / %s falhas ==\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
