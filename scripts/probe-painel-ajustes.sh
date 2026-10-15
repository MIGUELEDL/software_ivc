#!/usr/bin/env bash
#
# Regressão estática do lote AJ-01..10 (painel-ajustes-lote2).
# Cada tier amarra comportamento a texto de código: reverter a implementação
# derruba a tier (discriminação provada no sensor R1).
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

PASS=0
FAIL=0
ok() { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
ko() { FAIL=$((FAIL + 1)); printf '  FAIL %s\n' "$1"; }

printf '== Regressão painel-ajustes-lote2 (AJ) ==\n'

NOVA="$ROOT/src/app/admin/financeiro/nova/page.tsx"
ACOES="$ROOT/src/app/admin/financeiro/[id]/lancamento-acoes.tsx"
if grep -q 'STATUS_LANCAMENTO' "$NOVA" \
   && grep -q 'status: String(dados.get("status")' "$NOVA" \
   && grep -q 'STATUS_LANCAMENTO' "$ACOES" \
   && grep -q 'status: String(dados.get("status")' "$ACOES"; then
  ok "AJ-01/02 status selecionável ao criar e editar (select + JSON)"
else
  ko "AJ-01/02 select/JSON de status ausente nos forms"
fi

DASH="$ROOT/src/lib/admin/dashboard.ts"
DASHPAGE="$ROOT/src/app/admin/page.tsx"
if grep -q '!== "CANCELADO"' "$DASH" \
   && grep -q 'Este mês' "$DASHPAGE"; then
  ok "AJ-03/04 resumo exclui CANCELADO e rotula o período"
else
  ko "AJ-03/04 filtro CANCELADO ou rótulo ausente"
fi

FOTOROUTE="$ROOT/src/app/api/admin/membros/[id]/foto/route.ts"
NOVOFORM="$ROOT/src/app/admin/membros/novo/membro-novo-form.tsx"
EDITFORMS="$ROOT/src/app/admin/membros/[id]/membro-editar-forms.tsx"
if grep -q 'foto_tipo_invalido' "$FOTOROUTE" \
  && grep -q 'foto_tamanho_invalido' "$FOTOROUTE" \
  && grep -q 'membro_nao_encontrado' "$FOTOROUTE" \
  && grep -q '{ status: 404 }' "$FOTOROUTE" \
  && grep -q '{ status: 400 }' "$FOTOROUTE" \
  && grep -q '{ status: 413 }' "$FOTOROUTE" \
   && grep -q '/foto' "$NOVOFORM" \
  && grep -q '/foto' "$EDITFORMS"; then
  ok "AJ-05/06/07 rota foto (404/400/413 + códigos) + UIs de cadastro e edição"
else
  ko "AJ-05/06/07 rota foto ou UIs ausentes"
fi

HOME="$ROOT/src/app/page.tsx"
if grep -q 'settings\["church.about"\]' "$HOME" \
  && grep -q 'settings\["church.proposito"\]' "$HOME" \
  && grep -q 'settings\["church.values"\]' "$HOME" \
  && grep -q '?? CHURCH' "$ROOT/src/components/About.tsx" \
  && grep -q '?? CHURCH' "$ROOT/src/components/Values.tsx" \
  && grep -q '?? SOCIAL' "$ROOT/src/components/SocialLinks.tsx" \
  && grep -q '?? SOCIAL' "$ROOT/src/components/Footer.tsx" \
  && grep -q '?? CHURCH' "$ROOT/src/components/Footer.tsx"; then
  ok "AJ-08/09 landing lê settings com fallback constants"
else
  ko "AJ-08/09 props settings ou fallbacks ausentes"
fi

MEMBROS="$ROOT/src/lib/admin/membros.ts"
if grep -q 'getMonth() + 1 === mes' "$MEMBROS" \
  && ! grep -q 'filter("nascimento", "like"' "$MEMBROS"; then
  ok "AJ-10 mês filtra em JS (sem LIKE em DATE)"
else
  ko "AJ-10 filtro de mês fora do padrão"
fi

MIG26="$ROOT/supabase/migrations/0026_settings_select_public.sql"
if grep -q 'settings_select_public' "$MIG26" \
  && grep -q 'TO anon, authenticated' "$MIG26"; then
  ok "AJ-08 migration 0026 libera leitura anon de settings"
else
  ko "AJ-08 migration 0026 ausente/incompleta"
fi

printf '== Resumo: %s ok / %s falhas ==\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
