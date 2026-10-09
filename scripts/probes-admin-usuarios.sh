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
DELETE_BUTTON="$ROOT/src/app/admin/usuarios/delete-user-button.tsx"
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
  && grep -qE 'Usu[áa]rios' "$DASHBOARD"; then
  ok "card 'Usuarios' no dashboard (USR-29)"
else
  ko "card 'Usuarios' ausente no dashboard (USR-29)"
fi

printf '%s\n' '-- Exclusao de usuarios (USREX)'
if grep -q 'criado_por_admin: true' "$SERVICE_USR" \
  && grep -q 'criadoPorAdmin' "$SERVICE_USR" \
  && grep -q 'deletable' "$SERVICE_USR" \
  && grep -q 'excluirUsuario' "$SERVICE_USR" \
  && grep -q 'UsuarioProtegidoError' "$SERVICE_USR" \
  && grep -q 'UsuarioComVinculosError' "$SERVICE_USR"; then
  ok "servico marca origem, expoe deletable e excluirUsuario (USREX-10/12)"
else
  ko "servico sem marcador/deletable/excluirUsuario (USREX-10/12)"
fi

if grep -F -q 'app_metadata: { ...existing.user.app_metadata, role }' "$SERVICE_USR"; then
  ok "editarPapel preserva app_metadata/criado_por_admin (USREX-11)"
else
  ko "editarPapel nao preserva app_metadata (USREX-11)"
fi

if grep -q 'export async function DELETE' "$ROUTE_ID" \
  && grep -q 'excluirUsuario' "$ROUTE_ID" \
  && grep -q 'usuario_protegido' "$ROUTE_ID" \
  && grep -q 'usuario_com_vinculos' "$ROUTE_ID"; then
  ok "route DELETE com excluirUsuario e mapa de erros (USREX-01/06/07)"
else
  ko "route DELETE incompleta (USREX-01/06/07)"
fi

if [ -f "$DELETE_BUTTON" ] \
  && grep -q 'window.confirm' "$DELETE_BUTTON" \
  && grep -q 'method: "DELETE"' "$DELETE_BUTTON" \
  && grep -q 'router.refresh' "$DELETE_BUTTON"; then
  ok "DeleteUserButton com confirm+DELETE+refresh (USREX-16/17)"
else
  ko "DeleteUserButton ausente/incompleto (USREX-16/17)"
fi

if grep -q 'DeleteUserButton' "$PAGE_LIST" \
  && grep -q 'deletable' "$PAGE_LIST"; then
  ok "listagem renderiza DeleteUserButton por deletable (USREX-13/14/15)"
else
  ko "listagem sem DeleteUserButton/deletable (USREX-13/14/15)"
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

HTTP_401_DELETE=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$BASE_URL/api/admin/usuarios/00000000-0000-4000-8000-000000000004" 2>/dev/null || echo "000")
if [ "$HTTP_401_DELETE" = "401" ]; then
  ok "DELETE /api/admin/usuarios/[id] sem auth -> 401 (USREX-08)"
else
  ko "DELETE usuarios sem auth -> $HTTP_401_DELETE esperado 401 (USREX-08)"
fi

# =====================================================================
# RUNTIME — RBAC discriminacao (requer cookies de sessao)
# =====================================================================
printf '%s\n' '-- Runtime: RBAC discriminacao (L-009..L-014)'

JAR_ADMIN=$(mktemp)
JAR_SEC=$(mktemp)
JAR_MEMBRO=$(mktemp)
trap 'rm -f "$JAR_ADMIN" "$JAR_SEC" "$JAR_MEMBRO"' EXIT

# Login como ADMIN (admin.teste@ivc.local / senha-teste)
curl -s -c "$JAR_ADMIN" -o /dev/null -X POST "$BASE_URL/api/auth/login/admin" \
  --data-urlencode 'email=admin.teste@ivc.local' \
  --data-urlencode 'password=senha-teste' 2>/dev/null || true

if grep -q 'auth-token' "$JAR_ADMIN" 2>/dev/null; then
  # L-009: ADMIN lista usuarios -> 200
  HTTP_ADMIN_LIST=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" "$BASE_URL/api/admin/usuarios" 2>/dev/null || echo "000")
  if [ "$HTTP_ADMIN_LIST" = "200" ]; then
    ok "ADMIN lista usuarios -> 200 (L-009)"
  else
    ko "ADMIN lista usuarios -> $HTTP_ADMIN_LIST esperado 200 (L-009)"
  fi

  # L-010: ADMIN cria usuario -> 201
  HTTP_ADMIN_CREATE=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" \
    -X POST "$BASE_URL/api/admin/usuarios" \
    -H 'Content-Type: application/json' \
    -d '{"email":"probe.teste.usuarios'$RANDOM'@ivc.local","role":"SECRETARIA"}' 2>/dev/null || echo "000")
  if [ "$HTTP_ADMIN_CREATE" = "201" ]; then
    ok "ADMIN cria usuario -> 201 (L-010)"
  else
    ko "ADMIN cria usuario -> $HTTP_ADMIN_CREATE esperado 201 (L-010)"
  fi

  # L-013: ADMIN le matriz -> 200
  HTTP_ADMIN_PERM=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" "$BASE_URL/api/admin/usuarios/permissoes" 2>/dev/null || echo "000")
  if [ "$HTTP_ADMIN_PERM" = "200" ]; then
    ok "ADMIN le matriz permissoes -> 200 (L-013)"
  else
    ko "ADMIN le matriz -> $HTTP_ADMIN_PERM esperado 200 (L-013)"
  fi
  # USREX-04: ADMIN exclui a si mesmo -> 403 auto_modificacao_nao_permitida
  RESP_SELF=$(curl -s -w '\n%{http_code}' -X DELETE -b "$JAR_ADMIN" "$BASE_URL/api/admin/usuarios/00000000-0000-4000-8000-000000000004" 2>/dev/null || printf '\n000')
  HTTP_SELF=$(printf '%s' "$RESP_SELF" | tail -n1)
  BODY_SELF=$(printf '%s' "$RESP_SELF" | sed '$d')
  if [ "$HTTP_SELF" = "403" ] && printf '%s' "$BODY_SELF" | grep -q 'auto_modificacao_nao_permitida'; then
    ok "ADMIN auto-exclusao -> 403 auto_modificacao (USREX-04)"
  else
    ko "ADMIN auto-exclusao -> $HTTP_SELF $BODY_SELF (USREX-04)"
  fi

  # USREX-06: ADMIN exclui conta de sistema (sem marcador) -> 403 usuario_protegido
  RESP_PROT=$(curl -s -w '\n%{http_code}' -X DELETE -b "$JAR_ADMIN" "$BASE_URL/api/admin/usuarios/00000000-0000-4000-8000-000000000005" 2>/dev/null || printf '\n000')
  HTTP_PROT=$(printf '%s' "$RESP_PROT" | tail -n1)
  BODY_PROT=$(printf '%s' "$RESP_PROT" | sed '$d')
  if [ "$HTTP_PROT" = "403" ] && printf '%s' "$BODY_PROT" | grep -q 'usuario_protegido'; then
    ok "ADMIN exclui conta de sistema -> 403 usuario_protegido (USREX-06)"
  else
    ko "ADMIN exclui conta de sistema -> $HTTP_PROT $BODY_PROT (USREX-06)"
  fi

  # USREX-01: ADMIN cria e exclui usuario do painel -> 204 e some da lista
  PROBE_EXCL_EMAIL="probe.exclusao.$RANDOM@ivc.local"
  RESP_CREATE=$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" \
    -X POST "$BASE_URL/api/admin/usuarios" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$PROBE_EXCL_EMAIL\",\"role\":\"SECRETARIA\"}" 2>/dev/null || printf '\n000')
  HTTP_CREATE=$(printf '%s' "$RESP_CREATE" | tail -n1)
  BODY_CREATE=$(printf '%s' "$RESP_CREATE" | sed '$d')
  CREATE_ID=$(printf '%s' "$BODY_CREATE" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"$//' || echo "")
  if [ "$HTTP_CREATE" = "201" ] && [ -n "$CREATE_ID" ]; then
    HTTP_DEL=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE -b "$JAR_ADMIN" "$BASE_URL/api/admin/usuarios/$CREATE_ID" 2>/dev/null || echo "000")
    if [ "$HTTP_DEL" = "204" ]; then
      ok "ADMIN exclui usuario do painel -> 204 (USREX-01)"
    else
      ko "ADMIN exclui usuario do painel -> $HTTP_DEL esperado 204 (USREX-01)"
    fi
    if curl -s -b "$JAR_ADMIN" "$BASE_URL/api/admin/usuarios" 2>/dev/null | grep -q "$PROBE_EXCL_EMAIL"; then
      ko "usuario excluido ainda aparece na lista (USREX-01)"
    else
      ok "usuario excluido some da lista (USREX-01)"
    fi
  else
    ko "criacao para probe de exclusao falhou ($HTTP_CREATE $BODY_CREATE)"
  fi
else
  ko "Login ADMIN falhou — probes RBAC puladas"
fi

# Login como SECRETARIA (secretaria.teste@ivc.local / senha-teste)
curl -s -c "$JAR_SEC" -o /dev/null -X POST "$BASE_URL/api/auth/login/admin" \
  --data-urlencode 'email=secretaria.teste@ivc.local' \
  --data-urlencode 'password=senha-teste' 2>/dev/null || true

if grep -q 'auth-token' "$JAR_SEC" 2>/dev/null; then
  # L-010: SECRETARIA sem usuarios:administrar -> 403 no POST
  HTTP_SEC_CREATE=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_SEC" \
    -X POST "$BASE_URL/api/admin/usuarios" \
    -H 'Content-Type: application/json' \
    -d '{"email":"should.fail@ivc.local","role":"SECRETARIA"}' 2>/dev/null || echo "000")
  if [ "$HTTP_SEC_CREATE" = "403" ]; then
    ok "SECRETARIA cria usuario -> 403 (L-010)"
  else
    ko "SECRETARIA cria usuario -> $HTTP_SEC_CREATE esperado 403 (L-010)"
  fi

  # L-013: SECRETARIA sem usuarios:administrar -> 403 no GET permissoes
  HTTP_SEC_PERM=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_SEC" "$BASE_URL/api/admin/usuarios/permissoes" 2>/dev/null || echo "000")
  if [ "$HTTP_SEC_PERM" = "403" ]; then
    ok "SECRETARIA le matriz -> 403 (L-013)"
  else
    ko "SECRETARIA le matriz -> $HTTP_SEC_PERM esperado 403 (L-013)"
  fi
  # USREX-09: SECRETARIA sem usuarios:administrar -> 403 no DELETE
  HTTP_SEC_DELETE=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_SEC" \
    -X DELETE "$BASE_URL/api/admin/usuarios/00000000-0000-4000-8000-000000000005" 2>/dev/null || echo "000")
  if [ "$HTTP_SEC_DELETE" = "403" ]; then
    ok "SECRETARIA exclui usuario -> 403 (USREX-09)"
  else
    ko "SECRETARIA exclui usuario -> $HTTP_SEC_DELETE esperado 403 (USREX-09)"
  fi
else
  ko "Login SECRETARIA falhou — probes RBAC SECRETARIA puladas"
fi

# Login como MEMBRO (membro.teste@ivc.local / senha-teste)
curl -s -c "$JAR_MEMBRO" -o /dev/null -X POST "$BASE_URL/api/auth/login" \
  --data-urlencode 'email=membro.teste@ivc.local' \
  --data-urlencode 'password=senha-teste' 2>/dev/null || true

if grep -q 'auth-token' "$JAR_MEMBRO" 2>/dev/null; then
  HTTP_MEMBRO=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_MEMBRO" "$BASE_URL/api/admin/usuarios" 2>/dev/null || echo "000")
  if [ "$HTTP_MEMBRO" = "403" ] || [ "$HTTP_MEMBRO" = "307" ] || [ "$HTTP_MEMBRO" = "302" ]; then
    ok "MEMBRO lista usuarios -> $HTTP_MEMBRO (403/redirect) (USR-30)"
  else
    ko "MEMBRO lista usuarios -> $HTTP_MEMBRO esperado 403/redirect (USR-30)"
  fi
else
  ko "Login MEMBRO falhou — probe MEMBRO pulada"
fi

# =====================================================================
# RUNTIME — Exclusao: erros e auditoria (T8 / USREX-02/03/05)
# =====================================================================
if grep -q 'auth-token' "$JAR_ADMIN" 2>/dev/null; then
  printf '%s\n' '-- Runtime: exclusao — erros e auditoria'

  # USREX-03: DELETE UUID inexistente -> 404 nao_encontrado
  RESP_404=$(curl -s -w '\n%{http_code}' -X DELETE -b "$JAR_ADMIN" \
    "$BASE_URL/api/admin/usuarios/11111111-1111-4111-8111-111111111111" 2>/dev/null || printf '\n000')
  HTTP_404=$(printf '%s' "$RESP_404" | tail -n1)
  BODY_404=$(printf '%s' "$RESP_404" | sed '$d')
  if [ "$HTTP_404" = "404" ] && printf '%s' "$BODY_404" | grep -q 'nao_encontrado'; then
    ok "DELETE inexistente -> 404 nao_encontrado (USREX-03)"
  else
    ko "DELETE inexistente -> $HTTP_404 $BODY_404 (USREX-03)"
  fi

  # USREX-05: DELETE SUPER_ADMIN seed (...000c, sem marcador) -> 403 super_admin_protegido
  RESP_SUPER=$(curl -s -w '\n%{http_code}' -X DELETE -b "$JAR_ADMIN" \
    "$BASE_URL/api/admin/usuarios/00000000-0000-4000-8000-00000000000c" 2>/dev/null || printf '\n000')
  HTTP_SUPER=$(printf '%s' "$RESP_SUPER" | tail -n1)
  BODY_SUPER=$(printf '%s' "$RESP_SUPER" | sed '$d')
  if [ "$HTTP_SUPER" = "403" ] && printf '%s' "$BODY_SUPER" | grep -q 'super_admin_protegido'; then
    ok "ADMIN exclui SUPER_ADMIN -> 403 super_admin_protegido (USREX-05)"
  else
    ko "ADMIN exclui SUPER_ADMIN -> $HTTP_SUPER $BODY_SUPER (USREX-05)"
  fi

  # USREX-02: excluir conta do painel gera auditoria acao=excluir/entidade=usuarios/entidade_id/autor=caller
  AUD_EMAIL="probe.audit.$RANDOM@ivc.local"
  RESP_AUD=$(curl -s -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/usuarios" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$AUD_EMAIL\",\"role\":\"SECRETARIA\"}" 2>/dev/null || echo "")
  AUD_ID=$(printf '%s' "$RESP_AUD" | python3 -c 'import sys, json
try:
    print(json.load(sys.stdin).get("id", ""))
except Exception:
    print("")' 2>/dev/null || echo "")
  if [ -n "$AUD_ID" ]; then
    HTTP_AUD_DEL=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE -b "$JAR_ADMIN" \
      "$BASE_URL/api/admin/usuarios/$AUD_ID" 2>/dev/null || echo "000")
    AUD_JSON=$(curl -s -b "$JAR_ADMIN" \
      "$BASE_URL/api/admin/auditoria?acao=excluir&entidade=usuarios&limit=100" 2>/dev/null || echo '{}')
    AUD_FOUND=$(printf '%s' "$AUD_JSON" | python3 -c 'import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    d = {}
logs = d.get("logs", [])
hit = any(l.get("entidade_id") == sys.argv[1] and l.get("autor") == "00000000-0000-4000-8000-000000000004" for l in logs)
print("yes" if hit else "no")' "$AUD_ID" 2>/dev/null || echo "no")
    if [ "$HTTP_AUD_DEL" = "204" ] && [ "$AUD_FOUND" = "yes" ]; then
      ok "exclusao gera auditoria acao=excluir autor=caller (USREX-02)"
    else
      ko "auditoria da exclusao ausente (delete=$HTTP_AUD_DEL found=$AUD_FOUND) (USREX-02)"
    fi
  else
    ko "criacao para probe de auditoria falhou (USREX-02)"
  fi
else
  ko "Login ADMIN ausente — probes de erro/auditoria puladas (USREX-02/03/05)"
fi

# =====================================================================
# RUNTIME — Exclusao: deletable e render condicional (T9 / USREX-12/13/14/15)
# =====================================================================
if grep -q 'auth-token' "$JAR_ADMIN" 2>/dev/null; then
  printf '%s\n' '-- Runtime: deletable e render condicional'

  OWN_ID="00000000-0000-4000-8000-000000000004"
  LEITOR_ID="00000000-0000-4000-8000-000000000005"
  SUPER_ID="00000000-0000-4000-8000-00000000000c"

  UI_EMAIL="probe.ui.$RANDOM@ivc.local"
  RESP_UI=$(curl -s -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/usuarios" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$UI_EMAIL\",\"role\":\"SECRETARIA\"}" 2>/dev/null || echo "")
  UI_ID=$(printf '%s' "$RESP_UI" | python3 -c 'import sys, json
try:
    print(json.load(sys.stdin).get("id", ""))
except Exception:
    print("")' 2>/dev/null || echo "")

  if [ -n "$UI_ID" ]; then
    # USREX-12: GET lista expoe deletable=true p/ conta do painel; false p/ leitor e SUPER_ADMIN
    LIST_JSON=$(curl -s -b "$JAR_ADMIN" "$BASE_URL/api/admin/usuarios" 2>/dev/null || echo '{}')
    LIST_OK=$(printf '%s' "$LIST_JSON" | python3 -c 'import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    d = {}
m = {u.get("id"): u.get("deletable") for u in d.get("users", [])}
ok = m.get(sys.argv[1]) is True and m.get(sys.argv[2]) is False and m.get(sys.argv[3]) is False
print("yes" if ok else "no")' "$UI_ID" "$LEITOR_ID" "$SUPER_ID" 2>/dev/null || echo "no")
    if [ "$LIST_OK" = "yes" ]; then
      ok "deletable true na conta do painel; false para leitor/SUPER_ADMIN (USREX-12)"
    else
      ko "deletable incorreto na listagem (USREX-12)"
    fi

    # USREX-13/14: pagina ADMIN renderiza o botao so p/ conta excluivel (nao p/ proprio/sistema/SUPER_ADMIN)
    ADM_HTML=$(curl -s -b "$JAR_ADMIN" "$BASE_URL/admin/usuarios" 2>/dev/null || echo "")
    HTML_OK=$(printf '%s' "$ADM_HTML" | python3 -c 'import sys
h = sys.stdin.read()
def c(i):
    return h.count("\\\"userId\\\":\\\"" + i + "\\\"")
w = c(sys.argv[1]); own = c(sys.argv[2]); le = c(sys.argv[3]); su = c(sys.argv[4])
print("yes" if w >= 1 and own == 0 and le == 0 and su == 0 else "no:" + str((w, own, le, su)))' "$UI_ID" "$OWN_ID" "$LEITOR_ID" "$SUPER_ID" 2>/dev/null || echo "no")
    if [ "$HTML_OK" = "yes" ]; then
      ok "pagina ADMIN: botao so na linha excluivel (USREX-13/14)"
    else
      ko "pagina ADMIN: render do botao incorreto ($HTML_OK) (USREX-13/14)"
    fi
  else
    ko "criacao para probe de render falhou (USREX-12/13/14)"
  fi

  # USREX-15: SECRETARIA sem administrar -> nenhum controle de exclusao na pagina
  if grep -q 'auth-token' "$JAR_SEC" 2>/dev/null; then
    SEC_HTML=$(curl -s -b "$JAR_SEC" "$BASE_URL/admin/usuarios" 2>/dev/null || echo "")
    SEC_OK=$(printf '%s' "$SEC_HTML" | python3 -c 'import sys
h = sys.stdin.read()
print("yes" if h.count("\\\"userId\\\":\\\"") == 0 else "no")' 2>/dev/null || echo "no")
    if [ "$SEC_OK" = "yes" ]; then
      ok "pagina SECRETARIA: sem controle de exclusao (USREX-15)"
    else
      ko "pagina SECRETARIA: controle de exclusao presente (USREX-15)"
    fi
  else
    ko "Login SECRETARIA ausente — probe de render SECRETARIA pulada (USREX-15)"
  fi

  if [ -n "$UI_ID" ]; then
    curl -s -o /dev/null -X DELETE -b "$JAR_ADMIN" "$BASE_URL/api/admin/usuarios/$UI_ID" 2>/dev/null || true
  fi
else
  ko "Login ADMIN ausente — probes de deletable/render puladas (USREX-12/13/14/15)"
fi

# =====================================================================
# RESUMO
# =====================================================================
printf '\n== Resumo admin-usuarios: %d ok / %d falhas ==\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
