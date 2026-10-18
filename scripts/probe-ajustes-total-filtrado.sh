#!/usr/bin/env bash
# Probe ajustes-total-filtrado — TAB-05 (total filtrado) + TAB-06 (faixa no card)
set -u
cd "$(dirname "$0")/.."

ok=0
fail=0

check() {
  local desc="$1"; shift
  if "$@" >/dev/null 2>&1; then
    echo "PASS $desc"; ok=$((ok+1))
  else
    echo "FAIL $desc"; fail=$((fail+1))
  fi
}

check_absent() {
  local desc="$1"; shift
  if "$@" >/dev/null 2>&1; then
    echo "FAIL $desc (padrão ainda presente)"; fail=$((fail+1))
  else
    echo "PASS $desc"; ok=$((ok+1))
  fi
}

grepq() { grep -qE "$1" $2; }

echo "=== TAB-05: total = contagem do filtro ==="
check_absent "libs sem contarMembros"        grepq 'contarMembros' src/lib/admin/membros.ts
check_absent "libs sem contarLancamentos"    grepq 'contarLancamentos' src/lib/admin/financeiro.ts
check_absent "libs sem contarAuditoria"      grepq 'contarAuditoria' src/lib/admin/auditoria.ts
check_absent "libs sem contarDocumentos"     grepq 'contarDocumentos' src/lib/admin/relatorios.ts
check_absent "usuarios sem totalGeral"       grepq 'totalGeral' src/lib/admin/usuarios.ts
check "membros total filtrado"              grepq 'total=\{membros\.length\}' src/app/admin/membros/page.tsx
check "financeiro total filtrado"           grepq 'total=\{lancamentos\.length\}' src/app/admin/financeiro/page.tsx
check "auditoria total filtrado"            grepq 'total=\{total\}' src/app/admin/auditoria/page.tsx
check "usuarios total filtrado"             grepq 'total=\{result\.total\}' src/app/admin/usuarios/page.tsx
check "relatorios total filtrado"           grepq 'total=\{documentos\.length\}' src/app/admin/relatorios/page.tsx

echo ""
echo "=== TAB-06: faixa embutida no card (padrão usuários) ==="
FAIXA='p-4 border-b border-white/10 flex items-center justify-between'
for f in \
  src/app/admin/eventos/page.tsx \
  src/app/admin/patrimonio/page.tsx \
  src/app/admin/lideranca/page.tsx \
  src/app/admin/financeiro/page.tsx \
  src/app/admin/auditoria/page.tsx \
  src/app/admin/membros/membros-lista-client.tsx \
  src/app/admin/relatorios/page.tsx
do
  check "faixa no card: $f" grepq "$FAIXA" "$f"
done
check "faixa no card (tema claro): fechamento" grepq 'p-4 border-b border-text-dark/10 flex items-center justify-between' src/app/admin/financeiro/fechamento/page.tsx
check "usuarios (referência do padrão)"        grepq "$FAIXA" src/app/admin/usuarios/page.tsx

echo ""
echo "=== Resultado: $ok PASS / $fail FAIL ==="
exit $(( fail > 0 ? 1 : 0 ))
