#!/usr/bin/env bash
#
# Runner unificado: roda todas as suites de probes (auth, painel, admin-membros)
# em sequencia, com limpeza de residuo e relatorio consolidado.
# Uso: bash scripts/probes-all.sh  (default http://localhost:3000)
#       BASE_URL=http://localhost:3000 bash scripts/probes-all.sh
#
# Requer: servidor no ar (next start :3000), migrações 0001..0010 no dev.
# O script NAO sobe/fecha o servidor -- assume que ja esta rodando.
#
set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

printf '\n=== probes-all.sh — runner unificado ===\n'
printf 'BASE_URL=%s\n\n' "$BASE_URL"

# Checa se o servidor esta no ar
if ! curl -sf -o /dev/null "$BASE_URL" 2>/dev/null; then
  echo "ERRO: servidor nao responde em $BASE_URL — suba com: npm run start -- -p 3000"
  exit 1
fi

# Limpa residuo de rodadas anteriores
printf '-- limpando residuo de probes --\n'
if [ -f "$ROOT/scripts/reset-probe-residue.sql" ]; then
  printf 'Arquivo de limpeza encontrado: scripts/reset-probe-residue.sql\n'
  printf 'Execute manualmente ou via MCP antes de rodar se houver erro de dados.\n\n'
fi

TOTAL_OK=0
TOTAL_KO=0
RESULTS=()

run_suite() {
  local name="$1"
  local script="$2"
  printf '\n--- %s ---\n' "$name"
  output=$(BASE_URL="$BASE_URL" bash "$script" 2>&1) && rc=0 || rc=$?
  echo "$output"
  ok=$(echo "$output" | grep -oP '\d+(?= ok)' | tail -1)
  ko=$(echo "$output" | grep -oP '\d+(?= falha)' | tail -1)
  ok=${ok:-0}; ko=${ko:-0}
  TOTAL_OK=$((TOTAL_OK + ok))
  TOTAL_KO=$((TOTAL_KO + ko))
  RESULTS+=("$name: ${ok} ok / ${ko} falhas (exit=$rc)")
  return $rc
}

FAIL=0
run_suite "auth"      "$ROOT/scripts/probes-auth.sh"      || FAIL=1
run_suite "painel"    "$ROOT/scripts/probes-painel.sh"    || FAIL=1
run_suite "admin-membros" "$ROOT/scripts/probes-admin-membros.sh" || FAIL=1

printf '\n========================================\n'
printf 'RESUMO CONSOLIDADO\n'
printf '========================================\n'
for r in "${RESULTS[@]}"; do
  printf '  %s\n' "$r"
done
printf '----------------------------------------\n'
printf '  TOTAL: %s ok / %s falhas\n' "$TOTAL_OK" "$TOTAL_KO"
printf '========================================\n\n'

if [ "$TOTAL_KO" -gt 0 ]; then
  echo "FAIL: $TOTAL_KO falha(s) detectada(s)."
  exit 1
else
  echo "PASS: todas as suites verdes."
  exit 0
fi
