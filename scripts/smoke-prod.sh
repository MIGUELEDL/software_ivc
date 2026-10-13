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

# --- DEP-07 (estático): service-role só server-side ---
# (a) nenhum "use client" referencia a chave exata; (b) nenhuma var NEXT_PUBLIC
# carrega a chave exata (o fallback legítimo usa outro nome: SERVICE_ROLE_URL).
SR_FILES="$(grep -rln "SUPABASE_SERVICE_ROLE_KEY" "$ROOT/src" --include='*.ts' --include='*.tsx' || true)"
SR_LEAK=""
for f in $SR_FILES; do
  if grep -q '"use client"' "$f"; then
    SR_LEAK="$SR_LEAK $f"
  fi
done
SR_PUB="$(grep -rh "SUPABASE_SERVICE_ROLE_KEY" "$ROOT/src" --include='*.ts' --include='*.tsx' | grep "NEXT_PUBLIC" | grep -vE '^\s*(\*|//)' || true)"
if [ -z "$SR_LEAK" ] && [ -z "$SR_PUB" ]; then
  ok "DEP-07 service-role só server-side (nenhum client, nenhum NEXT_PUBLIC)"
else
  ko "DEP-07 vazamento de service-role:${SR_LEAK} ${SR_PUB}"
fi

if [ "${1:-}" = "--static-only" ]; then
  printf '== Resumo (estático): %s ok / %s falhas ==\n' "$PASS" "$FAIL"
  [ "$FAIL" -eq 0 ]
  exit $?
fi

# --- Tiers runtime (T6) ---
# BASE_URL obrigatória aqui; creds de admin via env (nunca commitadas):
# SMOKE_ADMIN_EMAIL + SMOKE_ADMIN_PASSWORD. Sem elas, tiers de login pulam.
BASE_URL="${BASE_URL:-${1:-}}"
if [ -z "$BASE_URL" ]; then
  ko "smoke: informe BASE_URL (env ou arg)"
  printf '== Resumo: %s ok / %s falhas ==\n' "$PASS" "$FAIL"
  exit 1
fi

# --- DEP-10: health com SHA real (nunca "unknown") ---
EXPECT_SHA="${EXPECT_SHA:-$(git -C "$ROOT" rev-parse origin/main 2>/dev/null || true)}"
HEALTH_BODY="$(curl -s --max-time 15 "$BASE_URL/api/health" || true)"
HEALTH_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$BASE_URL/api/health" || true)"
RELEASE="$(printf '%s' "$HEALTH_BODY" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("release",""))' 2>/dev/null || true)"
if [ "$HEALTH_CODE" = "200" ] && printf '%s' "$RELEASE" | grep -qE '^[0-9a-f]{40}$'; then
  ok "DEP-10 health 200 com release SHA ($RELEASE)"
else
  ko "DEP-10 health retornou $HEALTH_CODE / $HEALTH_BODY"
fi
if [ -n "$EXPECT_SHA" ] && [ "$RELEASE" = "$EXPECT_SHA" ]; then
  ok "DEP-10 release == deploy atual ($EXPECT_SHA)"
elif [ -n "$EXPECT_SHA" ]; then
  ko "DEP-10 release $RELEASE difere do deploy atual $EXPECT_SHA"
else
  ok "DEP-10 release SHA válido (sem EXPECT_SHA p/ comparar)"
fi

# --- DEP-11: login admin contra o Supabase novo ---
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT
if [ -z "${SMOKE_ADMIN_EMAIL:-}" ] || [ -z "${SMOKE_ADMIN_PASSWORD:-}" ]; then
  ok "DEP-11 login admin PULADO (sem SMOKE_ADMIN_EMAIL/PASSWORD)"
else
  LOGIN_URL="$(curl -s -c "$JAR" -o /dev/null -w '%{redirect_url}' --max-time 20 \
    -F "email=$SMOKE_ADMIN_EMAIL" -F "password=$SMOKE_ADMIN_PASSWORD" \
    "$BASE_URL/api/auth/login/admin" || true)"
  if printf '%s' "$LOGIN_URL" | grep -q '/admin$'; then
    ok "DEP-11 login admin redireciona a /admin (sessão criada)"
  else
    ko "DEP-11 login admin redirecionou a $LOGIN_URL"
  fi
  # --- DEP-05 (via API): zero demo legível pelo admin ---
  EV_JSON="$(curl -s -b "$JAR" --max-time 15 "$BASE_URL/api/admin/eventos" || true)"
  if printf '%s' "$EV_JSON" | grep -q '"eventos":\[\]'; then
    ok "DEP-05 admin lê zero eventos (sem demo)"
  else
    ko "DEP-05 eventos em prod: $EV_JSON"
  fi
fi

# --- DEP-12 (wiring): componente Analytics na árvore + portal sem demo ---
HOME_HTML="$(curl -s --max-time 15 "$BASE_URL/" || true)"
EVENTOS_HTML="$(curl -s --max-time 15 "$BASE_URL/eventos" || true)"
# O HTML serve o payload Flight com escaping: \"Analytics\"] — casa o literal.
if printf '%s' "$HOME_HTML" | grep -qF 'Analytics\"]'; then
  ok "DEP-12 Analytics na árvore (coleta provada no dashboard)"
else
  ko "DEP-12 Analytics ausente no HTML"
fi
if printf '%s' "$EVENTOS_HTML" | grep -q 'Em breve avisaremos os próximos eventos'; then
  ok "DEP-05 portal sem demo (empty state)"
else
  ko "DEP-05 portal sem empty state"
fi

printf '== Resumo: %s ok / %s falhas ==\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
