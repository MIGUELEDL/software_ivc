#!/usr/bin/env bash
# probe-ajustes-lote4.sh — tiers estáticos discriminantes de ajustes-lote4.
# Cada tier é acrescentado conforme as tasks da feature são concluídas.
set -u

ok=0
fail=0

check() {
  local nome="$1"
  local cmd="$2"
  if eval "$cmd" >/dev/null 2>&1; then
    echo "ok   $nome"
    ok=$((ok + 1))
  else
    echo "FAIL $nome"
    fail=$((fail + 1))
  fi
}

# TOT-01: TotalBloco referenciado em cada listagem do admin entregue
# (T4: páginas sem filtro; T5 acrescenta as filtradas → 9 greps)
for pagina in eventos patrimonio lideranca financeiro/fechamento; do
  arquivo="src/app/admin/${pagina}/page.tsx"
  check "TOT-01 ${pagina}" "grep -q 'TotalBloco' '${arquivo}'"
done

echo "---"
echo "probe-ajustes-lote4: ${ok} ok, ${fail} fail"
test "${fail}" -eq 0
