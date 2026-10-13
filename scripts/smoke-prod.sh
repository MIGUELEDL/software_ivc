#!/usr/bin/env bash
#
# Fumaça de produção da F12 (DEP-10/11/12 + DEP-05).
# Uso: BASE_URL=https://<app>.vercel.app bash scripts/smoke-prod.sh
#      bash scripts/smoke-prod.sh --static-only   (sem rede: tiers estáticas)
#
# Tiers estáticas (T1): Analytics presente sem eventos custom.
# Tiers runtime (T6): health SHA, logins, tag no HTML, zero demo, Sentry.
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LAYOUT="$ROOT/src/app/layout.tsx"

if ! command -v node >/dev/null 2>&1; then
  export PATH="$HOME/.nvm/versions/node/v$(cat "$ROOT/.nvmrc").0/bin:$PATH"
fi

PASS=0
FAIL=0
ok() { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
ko() { FAIL=$((FAIL + 1)); printf '  FAIL %s\n' "$1"; }

printf '== Smoke producao (DEP) ==\n'

# --- DEP-12/13 (estático): Analytics default, sem eventos custom ---
if grep -q '@vercel/analytics' "$ROOT/package.json" \
   && grep -q '<Analytics />' "$LAYOUT"; then
  ok "DEP-12 <Analytics /> no layout raiz com dep instalada"
else
  ko "DEP-12 Analytics ausente (dep ou tag)"
fi
if grep -rEn '[[:alnum:]_]+\.track\(|[^a-zA-Z]track\(' "$ROOT/src" --include='*.tsx' --include='*.ts' | grep -v test | grep -v node_modules; then
  ko "DEP-13 evento custom de Analytics (risco de PII)"
else
  ok "DEP-13 sem eventos custom (só pageviews padrão)"
fi

if [ "${1:-}" = "--static-only" ]; then
  printf '== Resumo (estático): %s ok / %s falhas ==\n' "$PASS" "$FAIL"
  [ "$FAIL" -eq 0 ]
  exit $?
fi

# --- Tiers runtime (T6) entram aqui ---

printf '== Resumo: %s ok / %s falhas ==\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
