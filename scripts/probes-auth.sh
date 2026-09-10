#!/usr/bin/env bash
#
# Probes por AC da feature auth (substituem runner até F10 — AD-006).
# Uso: BASE_URL=<url> bash scripts/probes-auth.sh   (default http://localhost:3000)
#
# Estático:
#   - ADMIN_ROLES membership set (AUTH-13/14, RF-031)
# HTTP (servidor dev/start deve estar no ar):
#   - redirects do proxy nas rotas protegidas (AUTH-02, AUTH-06, AUTH-15, AUTH-16)
#   - rejeição server-side da política de senha (AUTH-11) via POST direto
#
set -u

BASE_URL="${BASE_URL:-http://localhost:3000}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

PASS=0
FAIL=0
ok() { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
ko() { FAIL=$((FAIL + 1)); printf '  FAIL %s\n' "$1"; }

printf '== Probes auth (AC) — BASE_URL=%s ==\n' "$BASE_URL"

# --- AUTH-13/14 | ADMIN_ROLES membership set ---
printf '%s\n' '-- ADMIN_ROLES membership (rf-031)'
RBAC="$ROOT/src/lib/auth/rbac.ts"
for role in SECRETARIA LIDER FINANCEIRO PATRIMONIAL ADMIN SUPER_ADMIN; do
  if grep -q "\"$role\"" "$RBAC"; then
    ok "ADMIN_ROLES contem $role"
  else
    ko "ADMIN_ROLES nao contem $role"
  fi
done
if grep -q "ADMIN_ROLES.has(role)" "$RBAC"; then
  ok "isAdminRole usa ADMIN_ROLES.has(role)"
else
  ko "isAdminRole nao usa ADMIN_ROLES.has(role)"
fi
if grep -q 'role === "MEMBRO"' "$RBAC"; then
  ok "isMemberRole compara com MEMBRO"
else
  ko "isMemberRole nao compara com MEMBRO"
fi

# --- AUTH-02/06/15/16 | proxy redirects (sem cookie) ---
printf '%s\n' '-- proxy redirects (sem sessao)'

redirect_target() {
  curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' "$BASE_URL$1"
}

check_redirect() {
  local path="$1" expect_status="$2" expect_location="$3" out
  out="$(redirect_target "$path")"
  local status="${out%%|*}" location="${out#*|}"
  if [ "$status" = "000" ]; then
    ko "$path -> servidor nao responde em $BASE_URL (subir npm run dev/start)"
  elif [ "$status" = "$expect_status" ] && [ -n "$location" ] && [ "$location" = "$expect_location" ]; then
    ok "$path -> $status $location"
  else
    ko "$path -> $status $location (esperado $expect_status $expect_location)"
  fi
}

check_redirect "/painel" "307" "$BASE_URL/login"
check_redirect "/admin" "307" "$BASE_URL/login/admin"
check_redirect "/trocar-senha" "307" "$BASE_URL/login"

# --- AUTH-11 | rejeição server-side via POST direto (sem sessão) ---
printf '%s\n' '-- AUTH-11 politica de senha (POST direto)'
out="$(curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' \
  -X POST "$BASE_URL/api/auth/trocar-senha" \
  --data-urlencode 'new_password=abc')"
status="${out%%|*}"
location="${out#*|}"
case "$status:$location" in
  000:*)
    ko "POST trocar-senha -> servidor nao responde"
    ;;
  "307:${BASE_URL}/trocar-senha?error=weak_password")
    ok "senha fraca rejeitada com 307 -> /trocar-senha?error=weak_password"
    ;;
  *)
    ko "POST trocar-senha -> $status $location (esperado 307 $BASE_URL/trocar-senha?error=weak_password)"
    ;;
esac

# --- AUTH-16 | sessão ausente: observável distinto de weak_password ---
# Senha FORTE sem sessão NÃO pode passar pela política; deve cair no session
# guard (auth_required), distinto de weak_password (discrimina o guard).
out="$(curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' \
  -X POST "$BASE_URL/api/auth/trocar-senha" \
  --data-urlencode 'new_password=Str0ngPass123')"
status="${out%%|*}"
location="${out#*|}"
case "$status:$location" in
  000:*)
    ko "POST trocar-senha (forte, sem sessao) -> servidor nao responde"
    ;;
  "307:${BASE_URL}/trocar-senha?error=auth_required")
    ok "senha forte sem sessao -> 307 /trocar-senha?error=auth_required"
    ;;
  *)
    ko "POST trocar-senha (forte, sem sessao) -> $status $location (esperado 307 $BASE_URL/trocar-senha?error=auth_required)"
    ;;
esac

printf '\nProbes auth: %d ok, %d falhas\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]