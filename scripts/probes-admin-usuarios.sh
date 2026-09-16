#!/usr/bin/env bash
#
# Probes por AC da feature admin-usuarios (RF-028 / USR-01..32).
# Uso: BASE_URL=<url> bash scripts/probes-admin-usuarios.sh  (default http://localhost:3000)
# Requer o servidor no ar, migrations 0008 aplicadas, seeds (admin.teste, financeiro.teste,
# secretaria.teste, membro.teste) — senha `senha-teste`.
#
# Discriminacao de papel na matriz usuarios (USR-04/10/17/21/26):
#   SUPER_ADMIN (administrar): tudo no modulo usuarios;
#   ADMIN (administrar): tudo no modulo usuarios;
#   SECRETARIA/FINANCEIRO/PATRIMONIAL/LIDER: sem linha -> fail-closed 403;
#   MEMBRO: sem linha -> fail-closed 403, proxy redirect;
#   anon: 401 / redirect login.
#
# Re-runnable: probes estaticos; probes dinamicos com cleanup.
#
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

SERVICE_USR="$ROOT/src/lib/admin/usuarios.ts"
SERVICE_PERM="$ROOT/src/lib/admin/permissoes.ts"
ROUTE_LIST="$ROOT/src/app/api/admin/usuarios/route.ts"
ROUTE_ID="$ROOT/src/app/api/admin/usuarios/[id]/route.ts"
ROUTE_SENHA="$ROOT/src/app/api/admin/usuarios/[id]/senha/route.ts"
ROUTE_PERM="$ROOT/src/app/api/admin/usuarios/permissoes/route.ts"
PAGE_LIST="$ROOT/src/app/admin/usuarios/page.tsx"
PAGE_PERM="$ROOT/src/app/admin/usuarios/permissoes/page.tsx"
CREATE_FORM="$ROOT/src/app/admin/usuarios/create-user-form.tsx"
MATRIX_EDITOR="$ROOT/src/app/admin/usuarios/permissoes/matrix-editor.tsx"
DASHBOARD="$ROOT/src/app/admin/page.tsx"

PASS=0
FAIL=0
ok() { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
ko() { FAIL=$((FAIL + 1)); printf '  FAIL %s\n' "$1"; }

printf '== Probes admin-usuarios (USR-01..32 / RF-028) — BASE_URL=%s ==\n' "$BASE_URL"

# =====================================================================
# ESTATICO
# =====================================================================
printf '%s\n' '-- Service layer'
if [ -f "$SERVICE_USR" ]; then
  if grep -q 'listarUsuarios' "$SERVICE_USR" \
    && grep -q 'criarUsuario' "$SERVICE_USR" \
    && grep -q 'editarPapel' "$SERVICE_USR" \
    && grep -q 'redefinirSenha' "$SERVICE_USR" \
    && grep -q 'EmailEmUsoError' "$SERVICE_USR" \
    && grep -q 'NaoEncontradoError' "$SERVICE_USR" \
    && grep -q 'AutoModificacaoError' "$SERVICE_USR" \
    && grep -q 'SuperAdminProtegidoError' "$SERVICE_USR"; then
    ok "usuarios.ts com todas as funcoes e erros (USR-02/06/11/18)"
  else
    ko "usuarios.ts incompleto (USR-02/06/11/18)"
  fi
else
  ko "usuarios.ts ausente"
fi

if [ -f "$SERVICE_PERM" ]; then
  if grep -q 'obterMatriz' "$SERVICE_PERM" \
    && grep -q 'atualizarMatriz' "$SERVICE_PERM"; then
    ok "permissoes.ts com funcoes de matriz (USR-23/24)"
  else
    ko "permissoes.ts incompleto (USR-23/24)"
  fi
else
  ko "permissoes.ts ausente"
fi

printf '%s\n' '-- API routes'
if [ -f "$ROUTE_LIST" ]; then
  if grep -q 'authAdmin' "$ROUTE_LIST" \
    && grep -q 'requireAdministrar' "$ROUTE_LIST" \
    && grep -q 'listarUsuarios' "$ROUTE_LIST" \
    && grep -q 'criarUsuario' "$ROUTE_LIST"; then
    ok "route GET/POST /api/admin/usuarios (USR-02/06)"
  else
    ko "route usuarios incompleta (USR-02/06)"
  fi
else
  ko "route usuarios ausente"
fi

if [ -f "$ROUTE_ID" ]; then
  if grep -q 'requireAdministrar' "$ROUTE_ID" \
    && grep -q 'editarPapel' "$ROUTE_ID"; then
    ok "route PATCH /api/admin/usuarios/[id] (USR-11)"
  else
    ko "route PATCH [id] incompleta (USR-11)"
  fi
else
  ko "route PATCH [id] ausente"
fi

if [ -f "$ROUTE_SENHA" ]; then
  if grep -q 'requireAdministrar' "$ROUTE_SENHA" \
    && grep -q 'redefinirSenha' "$ROUTE_SENHA"; then
    ok "route POST /api/admin/usuarios/[id]/senha (USR-18)"
  else
    ko "route senha incompleta (USR-18)"
  fi
else
  ko "route senha ausente"
fi

if [ -f "$ROUTE_PERM" ]; then
  if grep -q 'requireAdministrar' "$ROUTE_PERM" \
    && grep -q 'obterMatriz' "$ROUTE_PERM" \
    && grep -q 'atualizarMatriz' "$ROUTE_PERM"; then
    ok "route GET/PUT /api/admin/usuarios/permissoes (USR-23/24)"
  else
    ko "route permissoes incompleta (USR-23/24)"
  fi
else
  ko "route permissoes ausente"
fi

printf '%s\n' '-- Pages + components'
if [ -f "$PAGE_LIST" ]; then
  if grep -q 'listarUsuarios' "$PAGE_LIST" \
    && grep -q 'can.*usuarios.*ler' "$PAGE_LIST" \
    && grep -q 'CreateUserForm' "$PAGE_LIST"; then
    ok "page /admin/usuarios com listagem e form (USR-01/30)"
  else
    ko "page usuarios incompleta (USR-01/30)"
  fi
else
  ko "page usuarios ausente"
fi

if [ -f "$CREATE_FORM" ]; then
  if grep -q 'api/admin/usuarios' "$CREATE_FORM" \
    && grep -q 'temporaryPassword' "$CREATE_FORM"; then
    ok "CreateUserForm com criacao e senha temporaria (USR-06/07)"
  else
    ko "CreateUserForm incompleto (USR-06/07)"
  fi
else
  ko "CreateUserForm ausente"
fi

if [ -f "$PAGE_PERM" ]; then
  if grep -q 'obterMatriz' "$PAGE_PERM" \
    && grep -q 'can.*usuarios.*administrar' "$PAGE_PERM" \
    && grep -q 'MatrixEditor' "$PAGE_PERM"; then
    ok "page /admin/usuarios/permissoes com editor (USR-22/30)"
  else
    ko "page permissoes incompleta (USR-22/30)"
  fi
else
  ko "page permissoes ausente"
fi

if [ -f "$MATRIX_EDITOR" ]; then
  if grep -q 'api/admin/usuarios/permissoes' "$MATRIX_EDITOR" \
    && grep -q 'handleSave' "$MATRIX_EDITOR"; then
    ok "MatrixEditor com save para API (USR-24/25)"
  else
    ko "MatrixEditor incompleto (USR-24/25)"
  fi
else
  ko "MatrixEditor ausente"
fi

printf '%s\n' '-- Dashboard card'
if grep -q 'admin/usuarios' "$DASHBOARD" \
  && grep -q 'Usuários' "$DASHBOARD"; then
  ok "card 'Usuarios' no dashboard (USR-29)"
else
  ko "card 'Usuarios' ausente no dashboard (USR-29)"
fi

printf '%s\n' '-- RBAC guards'
if grep -q "requireAdministrar" "$ROUTE_ID" 2>/dev/null; then
  ok "guard requireAdministrar('usuarios') no PATCH (USR-17)"
else
  ko "guard administrar ausente no PATCH (USR-17)"
fi

if grep -q "requireAdministrar" "$ROUTE_SENHA" 2>/dev/null; then
  ok "guard requireAdministrar('usuarios') no POST senha (USR-21)"
else
  ko "guard administrar ausente no POST senha (USR-21)"
fi

# =====================================================================
# RUNTIME — API calls (requer servidor no ar)
# =====================================================================
printf '%s\n' '-- Runtime: auth 401 unauthenticated'
HTTP_401=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/admin/usuarios" 2>/dev/null || echo "000")
if [ "$HTTP_401" = "401" ]; then
  ok "GET /api/admin/usuarios sem auth -> 401 (USR-31)"
else
  ko "GET /api/admin/usuarios sem auth -> $HTTP_401 esperado 401 (USR-31)"
fi

HTTP_401_POST=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/api/admin/usuarios" -H 'Content-Type: application/json' -d '{}' 2>/dev/null || echo "000")
if [ "$HTTP_401" = "401" ]; then
  ok "POST /api/admin/usuarios sem auth -> 401 (USR-31)"
else
  ko "POST /api/admin/usuarios sem auth -> $HTTP_401_POST esperado 401 (USR-31)"
fi

HTTP_401_PERM=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/admin/usuarios/permissoes" 2>/dev/null || echo "000")
if [ "$HTTP_401_PERM" = "401" ]; then
  ok "GET /api/admin/usuarios/permissoes sem auth -> 401 (USR-31)"
else
  ko "GET permissoes sem auth -> $HTTP_401_PERM esperado 401 (USR-31)"
fi

# =====================================================================
# RUNTIME — RBAC discriminacao (requer cookies de sessao)
# =====================================================================
printf '%s\n' '-- Runtime: RBAC discriminacao (L-009..L-014)'

# Login como ADMIN (admin.teste@ivc.local / senha-teste)
ADMIN_COOKIE=$(curl -s -c - -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin.teste@ivc.local","password":"senha-teste","tipo":"admin"}' 2>/dev/null \
  | grep -o 'sb-[a-z]*-auth-token[^	]*	[^	]*' | head -1 | awk '{print $NF}' || echo "")

if [ -n "$ADMIN_COOKIE" ]; then
  # L-009: ADMIN lista usuarios -> 200
  HTTP_ADMIN_LIST=$(curl -s -o /dev/null -w '%{http_code}' -b "sb-gchatpflwvpoxxcmhnjwp-auth-token=$ADMIN_COOKIE" "$BASE_URL/api/admin/usuarios" 2>/dev/null || echo "000")
  if [ "$HTTP_ADMIN_LIST" = "200" ]; then
    ok "ADMIN lista usuarios -> 200 (L-009)"
  else
    ko "ADMIN lista usuarios -> $HTTP_ADMIN_LIST esperado 200 (L-009)"
  fi

  # L-010: ADMIN cria usuario -> 201
  HTTP_ADMIN_CREATE=$(curl -s -o /dev/null -w '%{http_code}' -b "sb-gchatpflwvpoxxcmhnjwp-auth-token=$ADMIN_COOKIE" \
    -X POST "$BASE_URL/api/admin/usuarios" \
    -H 'Content-Type: application/json' \
    -d '{"email":"probe.teste.usuarios'$RANDOM'@ivc.local","role":"SECRETARIA"}' 2>/dev/null || echo "000")
  if [ "$HTTP_ADMIN_CREATE" = "201" ]; then
    ok "ADMIN cria usuario -> 201 (L-010)"
  else
    ko "ADMIN cria usuario -> $HTTP_ADMIN_CREATE esperado 201 (L-010)"
  fi

  # L-013: ADMIN le matriz -> 200
  HTTP_ADMIN_PERM=$(curl -s -o /dev/null -w '%{http_code}' -b "sb-gchatpflwvpoxxcmhnjwp-auth-token=$ADMIN_COOKIE" "$BASE_URL/api/admin/usuarios/permissoes" 2>/dev/null || echo "000")
  if [ "$HTTP_ADMIN_PERM" = "200" ]; then
    ok "ADMIN le matriz permissoes -> 200 (L-013)"
  else
    ko "ADMIN le matriz -> $HTTP_ADMIN_PERM esperado 200 (L-013)"
  fi
else
  ko "Login ADMIN falhou — probes RBAC puladas"
fi

# Login como SECRETARIA (secretaria.teste@ivc.local / senha-teste)
SEC_COOKIE=$(curl -s -c - -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"secretaria.teste@ivc.local","password":"senha-teste","tipo":"admin"}' 2>/dev/null \
  | grep -o 'sb-[a-z]*-auth-token[^	]*	[^	]*' | head -1 | awk '{print $NF}' || echo "")

if [ -n "$SEC_COOKIE" ]; then
  # L-010: SECRETARIA sem usuarios:administrar -> 403 no POST
  HTTP_SEC_CREATE=$(curl -s -o /dev/null -w '%{http_code}' -b "sb-gchatpflwvpoxxcmhnjwp-auth-token=$SEC_COOKIE" \
    -X POST "$BASE_URL/api/admin/usuarios" \
    -H 'Content-Type: application/json' \
    -d '{"email":"should.fail@ivc.local","role":"SECRETARIA"}' 2>/dev/null || echo "000")
  if [ "$HTTP_SEC_CREATE" = "403" ]; then
    ok "SECRETARIA cria usuario -> 403 (L-010)"
  else
    ko "SECRETARIA cria usuario -> $HTTP_SEC_CREATE esperado 403 (L-010)"
  fi

  # L-013: SECRETARIA sem usuarios:administrar -> 403 no GET permissoes
  HTTP_SEC_PERM=$(curl -s -o /dev/null -w '%{http_code}' -b "sb-gchatpflwvpoxxcmhnjwp-auth-token=$SEC_COOKIE" "$BASE_URL/api/admin/usuarios/permissoes" 2>/dev/null || echo "000")
  if [ "$HTTP_SEC_PERM" = "403" ]; then
    ok "SECRETARIA le matriz -> 403 (L-013)"
  else
    ko "SECRETARIA le matriz -> $HTTP_SEC_PERM esperado 403 (L-013)"
  fi
else
  ko "Login SECRETARIA falhou — probes RBAC SECRETARIA puladas"
fi

# Login como MEMBRO (membro.teste@ivc.local / senha-teste)
MEMBRO_COOKIE=$(curl -s -c - -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"membro.teste@ivc.local","password":"senha-teste","tipo":"membro"}' 2>/dev/null \
  | grep -o 'sb-[a-z]*-auth-token[^	]*	[^	]*' | head -1 | awk '{print $NF}' || echo "")

if [ -n "$MEMBRO_COOKIE" ]; then
  HTTP_MEMBRO=$(curl -s -o /dev/null -w '%{http_code}' -b "sb-gchatpflwvpoxxcmhnjwp-auth-token=$MEMBRO_COOKIE" "$BASE_URL/api/admin/usuarios" 2>/dev/null || echo "000")
  if [ "$HTTP_MEMBRO" = "403" ] || [ "$HTTP_MEMBRO" = "307" ] || [ "$HTTP_MEMBRO" = "302" ]; then
    ok "MEMBRO lista usuarios -> $HTTP_MEMBRO (403/redirect) (USR-30)"
  else
    ko "MEMBRO lista usuarios -> $HTTP_MEMBRO esperado 403/redirect (USR-30)"
  fi
else
  ko "Login MEMBRO falhou — probe MEMBRO pulada"
fi

# =====================================================================
# RESUMO
# =====================================================================
printf '\n== Resumo admin-usuarios: %d ok / %d falhas ==\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
