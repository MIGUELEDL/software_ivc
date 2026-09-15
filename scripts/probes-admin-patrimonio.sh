#!/usr/bin/env bash
#
# Probes por AC da feature admin-patrimonio (RF-025 / PAT-01..12).
# Uso: BASE_URL=<url> bash scripts/probes-admin-patrimonio.sh  (default http://localhost:3000)
# Requer o servidor no ar (producao: `npm run build && npm run start -- -p 3000`),
# migrations 0008/0009/0012/0013 aplicadas no dev e seeds sem force_password_change:
# admin.teste (ADMIN), patrimonial.teste (PATRIMONIAL, patrimonio=escrever),
# leitor.teste (FINANCEIRO, patrimonio=ler), secretaria.teste (SECRETARIA,
# patrimonio=ler — discrimina o ramo escrever: cria em eventos mas NAO em
# patrimonio), membro.teste (MEMBRO) — senha `senha-teste`.
#
# Discriminacao de papel na matriz patrimonio (RF-032/L-008):
#   ADMIN (administrar): cria/edita bens (hierarquia administrar > escrever);
#   PATRIMONIAL (escrever): cria/edita bens (0013 seed patrimonio=escrever);
#   FINANCEIRO/SECRETARIA (ler, leitor.teste/secretaria.teste): le admin 200,
#     escrita 403;
#   MEMBRO: sem linha -> fail-closed 403 (MATRIZ-10), proxy redirect;
#   anon: SEM policy anon em assets -> API 401 / pagina redirect login.
#
# Re-runnable: nomes `Probe Bem $RANDOM$RANDOM`; create -> act -> cleanup
# (PATCH status=INATIVO via sessao admin; tombo unico por run).
# TRAP no EXIT restaura seed e baixa bens criados (best effort).
#
# Nota: sem DELETE route/policy em assets (PAT-03) — bens criados pelos probes
# tornam-se residuos INATIVO (nao hard-delete). Limpeza via MCP entre rodadas
# se necessario.
#
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

MIG13="$ROOT/supabase/migrations/0013_assets.sql"
SERVICE="$ROOT/src/lib/admin/assets.ts"
VALIDACAO="$ROOT/src/lib/admin/validacao.ts"
ASSETS_ROUTE="$ROOT/src/app/api/admin/assets/route.ts"
ASSET_ID_ROUTE="$ROOT/src/app/api/admin/assets/[id]/route.ts"
LISTA="$ROOT/src/app/admin/patrimonio/page.tsx"
NOVA_PAGE="$ROOT/src/app/admin/patrimonio/nova/page.tsx"
NOVA_FORM="$ROOT/src/app/admin/patrimonio/nova/asset-novo-form.tsx"
DETALHE="$ROOT/src/app/admin/patrimonio/[id]/page.tsx"
EDITAR_FORM="$ROOT/src/app/admin/patrimonio/[id]/asset-editar-form.tsx"
DASHBOARD="$ROOT/src/app/admin/page.tsx"

SEED_ID="00000000-0000-4000-8000-000000000010"
SEED_NAME="Kit de Som"
SEED_TOMBO="PAT-0001"

PASS=0
FAIL=0
ok() { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
ko() { FAIL=$((FAIL + 1)); printf '  FAIL %s\n' "$1"; }

printf '== Probes admin-patrimonio (PAT-01..12 / RF-025) — BASE_URL=%s ==\n' "$BASE_URL"

# =====================================================================
# ESTATICO — migration 0013 (tabela checklist + CHECK + indice parcial + RLS sem anon)
# =====================================================================
printf '%s\n' '-- 0013_assets.sql (tabela/checklist do bem, PAT-01)'
if grep -q 'create table if not exists public.assets' "$MIG13" \
  && grep -q 'name text not null' "$MIG13" \
  && grep -q 'category text not null' "$MIG13" \
  && grep -q 'numero_patrimonio text' "$MIG13" \
  && grep -q 'location text' "$MIG13" \
  && grep -q 'acquisition_value numeric' "$MIG13" \
  && grep -q 'acquisition_date date' "$MIG13" \
  && grep -q 'responsible text' "$MIG13" \
  && grep -q 'status text not null default' "$MIG13" \
  && grep -q 'observations text' "$MIG13"; then
  ok "tabela assets com checklist completo do bem (PAT-01)"
else
  ko "assets ausente/incompleta (PAT-01)"
fi
if grep -qF "check (category in ('AUDIO','VIDEO','INSTRUMENTO','MOBILIA','EQUIPAMENTO','RELIGIOSO','OUTRO'))" "$MIG13" \
  && grep -qF "check (status in ('ATIVO', 'INATIVO'))" "$MIG13"; then
  ok "CHECK de categoria (enum fixo) e de status (PAT-01)"
else
  ko "CHECK de categoria/status ausente ou alterado (PAT-01)"
fi
if grep -q 'assets_numero_patrimonio_unique' "$MIG13" \
  && grep -qF 'where numero_patrimonio is not null' "$MIG13"; then
  ok "indice unico PARCIAL no tombo (PAT-01/PAT-06)"
else
  ko "indice unico parcial ausente (PAT-06)"
fi

printf '%s\n' '-- 0013: RLS — SEM anon, leitura can_access ler (PAT-02/11)'
if grep -q 'create policy "assets_select_admin"' "$MIG13" \
  && grep -q 'for select' "$MIG13" \
  && grep -q 'to authenticated' "$MIG13" \
  && grep -qF "using (public.can_access('patrimonio', 'ler'))" "$MIG13" \
  && ! grep -q 'to anon, authenticated' "$MIG13"; then
  ok "policy assets_select_admin: authenticated + can_access ler, SEM anon (PAT-02/11)"
else
  ko "policy assets_select_admin ausente, alterada ou com anon (PAT-02/11)"
fi
if grep -q 'create policy "assets_insert_admin"' "$MIG13" \
  && grep -qF "with check (public.can_access('patrimonio', 'escrever'))" "$MIG13"; then
  ok "policy assets_insert_admin: can_access('patrimonio','escrever') (PAT-04)"
else
  ko "policy assets_insert_admin ausente/alterada (PAT-04)"
fi
n_update="$(grep -c "public.can_access('patrimonio', 'escrever')" "$MIG13" || true)"
if grep -q 'create policy "assets_update_admin"' "$MIG13" \
  && grep -qF "using (public.can_access('patrimonio', 'escrever'))" "$MIG13" \
  && grep -qF "with check (public.can_access('patrimonio', 'escrever'))" "$MIG13" \
  && [ "$n_update" -ge 3 ]; then
  ok "policy assets_update_admin: using+with check can_access (PAT-08/10)"
else
  ko "policy assets_update_admin incompleta (PAT-08/10)"
fi
if ! grep -q 'create policy "assets_delete' "$MIG13"; then
  ok "assets sem policy de DELETE (baixa por status, PAT-03/10)"
else
  ko "assets com policy de DELETE (PAT-03/10)"
fi

printf '%s\n' '-- 0013: seed Kit de Som + patrimonial.teste'
if grep -q "'$SEED_NAME'" "$MIG13" \
  && grep -q "'$SEED_ID'" "$MIG13" \
  && grep -q "'$SEED_TOMBO'" "$MIG13" \
  && grep -q "'Templo'" "$MIG13" \
  && grep -q "'Equipe de Som'" "$MIG13" \
  && grep -q 'on conflict (id) do nothing' "$MIG13"; then
  ok "seed Kit de Som idempotente (PAT-01)"
else
  ko "seed Kit de Som ausente/incompleta"
fi
if grep -q 'patrimonial.teste@ivc.local' "$MIG13" \
  && grep -q "'00000000-0000-4000-8000-000000000007'" "$MIG13" \
  && grep -q "'PATRIMONIAL'" "$MIG13"; then
  ok "seed patrimonial.teste (papel PATRIMONIAL, escrita patrimonio)"
else
  ko "seed patrimonial.teste ausente/incompleta"
fi

# =====================================================================
# ESTATICO — service layer + validacao
# =====================================================================
printf '%s\n' '-- src/lib/admin/assets.ts (service)'
for fn in listarAssets criarAsset atualizarAsset; do
  if grep -q "export async function $fn" "$SERVICE"; then
    ok "service: $fn presente"
  else
    ko "service: $fn ausente"
  fi
done
if grep -q 'BemNaoEncontradoError' "$SERVICE" \
  && grep -q 'bem_nao_encontrado' "$SERVICE"; then
  ok "service: BemNaoEncontradoError (PAT-09)"
else
  ko "service: BemNaoEncontradoError ausente"
fi
if grep -q '.order("name", { ascending: true })' "$SERVICE"; then
  ok "listarAssets: name asc (PAT-07)"
else
  ko "listarAssets: sem order name asc (PAT-07)"
fi
if grep -q 'status: "ATIVO"' "$SERVICE"; then
  ok "criarAsset: nasce ATIVO (PAT-04)"
else
  ko "criarAsset: default ATIVO ausente (PAT-04)"
fi
if grep -q 'ASSET_CATEGORIES' "$SERVICE" \
  && grep -q '"AUDIO"' "$SERVICE" \
  && grep -q '"VIDEO"' "$SERVICE" \
  && grep -q '"INSTRUMENTO"' "$SERVICE" \
  && grep -q '"MOBILIA"' "$SERVICE" \
  && grep -q '"EQUIPAMENTO"' "$SERVICE" \
  && grep -q '"RELIGIOSO"' "$SERVICE" \
  && grep -q '"OUTRO"' "$SERVICE"; then
  ok "service: ASSET_CATEGORIES enum fixo (PAT-01)"
else
  ko "service: ASSET_CATEGORIES incompleto (PAT-01)"
fi
if grep -q 'if (dados.status !== undefined) patch.status = dados.status' "$SERVICE"; then
  ok "atualizarAsset: aceita status (baixa, PAT-08/10)"
else
  ko "atualizarAsset: status ausente"
fi

printf '%s\n' '-- src/lib/admin/validacao.ts (validateAsset)'
if grep -q 'export function validateAsset' "$VALIDACAO" \
  && grep -q 'modo: "completo" | "parcial"' "$VALIDACAO"; then
  ok "validateAsset + modo completo/parcial (PAT-05/08)"
else
  ko "validateAsset ausente"
fi
if grep -q 'campos.name = "Informe o nome do bem."' "$VALIDACAO" \
  && grep -qF "!(AssetCategoriasFixo as readonly string[]).includes(valor)" "$VALIDACAO"; then
  ok "validateAsset: name obrigatorio + categoria no enum (PAT-05)"
else
  ko "validateAsset: name/categoria incompleto (PAT-05)"
fi
if grep -q 'campos.acquisition_value' "$VALIDACAO" \
  && grep -q 'campos.acquisition_date' "$VALIDACAO" \
  && grep -q 'campos.numero_patrimonio' "$VALIDACAO" \
  && grep -q 'campos.status' "$VALIDACAO"; then
  ok "validateAsset: valor/data/tombo/status por campo (PAT-05)"
else
  ko "validateAsset: validacoes por campo ausentes (PAT-05)"
fi

# =====================================================================
# ESTATICO — route handlers (guardas, status codes, sem DELETE)
# =====================================================================
printf '%s\n' '-- rotas /api/admin/assets*'
if grep -q 'requireEscrita("patrimonio")' "$ASSETS_ROUTE" \
  && grep -q 'status: 201' "$ASSETS_ROUTE" \
  && grep -q 'erroCampos(resultado.campos)' "$ASSETS_ROUTE" \
  && grep -q 'authAdmin("patrimonio")' "$ASSETS_ROUTE" \
  && grep -q 'listarAssets()' "$ASSETS_ROUTE"; then
  ok "POST+GET assets: guards patrimonio + 201 + 400 por campo + listar (PAT-04/05/07)"
else
  ko "POST+GET assets incompleto"
fi
if grep -q '"code" in error' "$ASSETS_ROUTE" \
  && grep -q '"23505"' "$ASSETS_ROUTE" \
  && grep -q 'numero_patrimonio_duplicado' "$ASSETS_ROUTE" \
  && grep -q 'status: 409' "$ASSETS_ROUTE"; then
  ok "POST assets: 23505 -> 409 tombo duplicado (PAT-06)"
else
  ko "POST assets: 409 tombo duplicado ausente (PAT-06)"
fi
if grep -q 'requireEscrita("patrimonio")' "$ASSET_ID_ROUTE" \
  && grep -q 'validateAsset(body, "parcial")' "$ASSET_ID_ROUTE" \
  && grep -q 'BemNaoEncontradoError' "$ASSET_ID_ROUTE" \
  && grep -q 'nao_encontrado' "$ASSET_ID_ROUTE" \
  && grep -q 'status: 404' "$ASSET_ID_ROUTE"; then
  ok "PATCH [id]: guard escrita + parcial + 404 (PAT-08/09)"
else
  ko "PATCH [id] incompleto"
fi
if grep -q '_INATIVO_ via status' "$ASSET_ID_ROUTE" \
  || grep -q 'soft-delete/baixa' "$ASSET_ID_ROUTE"; then
  ok "PATCH [id]: baixa documentada (PAT-10)"
else
  ko "PATCH [id]: nota de baixa ausente"
fi
if ! grep -q 'DELETE' "$ASSET_ID_ROUTE"; then
  ok "sem DELETE em [id]/route.ts (PAT-03)"
else
  ko "[id]/route.ts contem DELETE (PAT-03)"
fi
if ! grep -q 'DELETE' "$ASSETS_ROUTE"; then
  ok "sem DELETE em assets/route.ts (PAT-03)"
else
  ko "assets/route.ts contem DELETE (PAT-03)"
fi

# =====================================================================
# ESTATICO — paginas admin
# =====================================================================
printf '%s\n' '-- paginas /admin/patrimonio*'
if grep -q 'await can(claims?.role ?? "", "patrimonio", "ler")' "$LISTA" \
  && grep -q '"patrimonio", "escrever"' "$LISTA" \
  && grep -q 'href="/admin/patrimonio/nova"' "$LISTA"; then
  ok "lista: guard leitura + link novo + escritor (PAT-04/07)"
else
  ko "lista incompleta"
fi
if grep -q 'asset.status' "$LISTA" \
  && grep -q 'asset.category' "$LISTA" \
  && grep -q 'asset.numero_patrimonio' "$LISTA"; then
  ok "lista: badges status + categoria + tombo (PAT-01)"
else
  ko "lista: badges ausentes"
fi
if grep -q 'fetch("/api/admin/assets"' "$NOVA_FORM" \
  && grep -q 'method: "POST"' "$NOVA_FORM" \
  && grep -q 'corpo?.campos' "$NOVA_FORM" \
  && grep -q 'corpo?.asset?.id' "$NOVA_FORM"; then
  ok "nova form: POST + validacao por campo + redirect (PAT-04/05)"
else
  ko "nova form incompleta"
fi
if grep -q 'ASSET_CATEGORIES' "$NOVA_FORM" \
  && grep -q 'name="category"' "$NOVA_FORM"; then
  ok "nova form: select de categoria do enum fixo (PAT-05)"
else
  ko "nova form: select de categoria ausente"
fi
if grep -q 'resposta.status === 409' "$NOVA_FORM" \
  && grep -q 'já está cadastrado' "$NOVA_FORM"; then
  ok "nova form: mensagem de tombo duplicado (PAT-06)"
else
  ko "nova form: 409 sem mensagem (PAT-06)"
fi
if grep -q 'listarAssets()' "$DETALHE" \
  && grep -q 'notFound()' "$DETALHE" \
  && grep -q '<AssetEditarForm' "$DETALHE"; then
  ok "detalhe: ler assets + notFound + form de edicao (PAT-08/09)"
else
  ko "detalhe incompleto"
fi
if grep -q '"patrimonio", "escrever"' "$DETALHE"; then
  ok "detalhe: guard escrita para form"
else
  ko "detalhe sem guard escrita"
fi
if grep -q 'method: "PATCH"' "$EDITAR_FORM" \
  && grep -q 'name="status"' "$EDITAR_FORM" \
  && grep -q 'setStatus("INATIVO")' "$EDITAR_FORM" \
  && ! grep -q 'method: "DELETE"' "$EDITAR_FORM"; then
  ok "editar form: PATCH + toggle status ATIVO/INATIVO sem DELETE (PAT-08/10/03)"
else
  ko "editar form incompleta (PAT-08/10/03)"
fi
if grep -q 'INATIVO registra a baixa do bem' "$EDITAR_FORM"; then
  ok "editar form: texto de baixa visivel (PAT-10)"
else
  ko "editar form: texto de baixa ausente"
fi
if grep -q 'resposta.status === 409' "$EDITAR_FORM" \
  && grep -q 'resposta.status === 404' "$EDITAR_FORM"; then
  ok "editar form: trata 409 e 404 (PAT-06/09)"
else
  ko "editar form: 409/404 nao tratados"
fi

# =====================================================================
# ESTATICO — dashboard admin: cards Eventos + Patrimonio (PAT-12)
# =====================================================================
printf '%s\n' '-- /admin (dashboard, PAT-12)'
if grep -q 'href="/admin/eventos"' "$DASHBOARD" \
  && grep -q 'CalendarDays' "$DASHBOARD" \
  && grep -q 'Gestão dos eventos e agenda da igreja' "$DASHBOARD"; then
  ok "card Eventos no dashboard (PAT-12)"
else
  ko "card Eventos ausente no dashboard (PAT-12)"
fi
if grep -q 'href="/admin/patrimonio"' "$DASHBOARD" \
  && grep -q 'Package' "$DASHBOARD" \
  && grep -q 'Inventário dos bens da igreja' "$DASHBOARD"; then
  ok "card Patrimonio no dashboard (PAT-12)"
else
  ko "card Patrimonio ausente no dashboard (PAT-12)"
fi
if grep -q 'href="/admin/membros"' "$DASHBOARD" \
  && grep -q 'href="/admin/lideranca"' "$DASHBOARD"; then
  ok "cards Membros e Igrejas & Lideranca preservados (regressao PAT-12)"
else
  ko "cards pre-existentes removidos (regressao PAT-12)"
fi

# =====================================================================
# RUNTIME — sessoes reais por papel (L-007/L-008)
# =====================================================================
printf '%s\n' '-- runtime: sessao (login) e protecao'
need_server() {
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/login" || true)"
  if [ "$code" = "000" ]; then
    printf '\nFATAL: servidor ausente em %s (npm run build && npm run start -- -p 3000)\n' "$BASE_URL"
    exit 2
  fi
}
need_server

JAR_ADMIN="$(mktemp)"
JAR_PAT="$(mktemp)"
JAR_LEITOR="$(mktemp)"
JAR_SEC="$(mktemp)"
JAR_MEMBRO="$(mktemp)"
LEFTOVER_A="$(mktemp)"
LEFTOVER_B="$(mktemp)"
TRAP_TOMBOS="$(mktemp)"
trap '
  # restore seed + best-effort baixar bens criados (INATIVO)
  curl -s -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/assets/${SEED_ID}" \
    -H "Content-Type: application/json" -d '{"status":"ATIVO"}' -o /dev/null 2>/dev/null || true
  if [ -s "$LEFTOVER_A" ]; then
    AID="$(cat "$LEFTOVER_A")"
    curl -s -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/assets/$AID" \
      -H "Content-Type: application/json" -d '{"status":"INATIVO"}' -o /dev/null 2>/dev/null || true
  fi
  if [ -s "$LEFTOVER_B" ]; then
    BID="$(cat "$LEFTOVER_B")"
    curl -s -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/assets/$BID" \
      -H "Content-Type: application/json" -d '{"status":"INATIVO"}' -o /dev/null 2>/dev/null || true
  fi
  rm -f "$JAR_ADMIN" "$JAR_PAT" "$JAR_LEITOR" "$JAR_SEC" "$JAR_MEMBRO" \
    "$LEFTOVER_A" "$LEFTOVER_B" "$TRAP_TOMBOS"
' EXIT

login_admin() { # jar email -> status|redirect
  curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' -c "$1" -X POST "$BASE_URL/api/auth/login/admin" \
    --data-urlencode "email=$2" --data-urlencode "password=senha-teste" || true
}
login_membro() {
  curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' -c "$1" -X POST "$BASE_URL/api/auth/login" \
    --data-urlencode "email=$2" --data-urlencode "password=senha-teste" || true
}

# -- logins + redirect targets (L-007) --
admin_login="$(login_admin "$JAR_ADMIN" "admin.teste@ivc.local")"
pat_login="$(login_admin "$JAR_PAT" "patrimonial.teste@ivc.local")"
leitor_login="$(login_admin "$JAR_LEITOR" "leitor.teste@ivc.local")"
sec_login="$(login_admin "$JAR_SEC" "secretaria.teste@ivc.local")"
membro_login="$(login_membro "$JAR_MEMBRO" "membro.teste@ivc.local")"

# Clean login asserts (L-007)
for entrada in "admin|${admin_login}|admin.teste" "pat|${pat_login}|patrimonial.teste" "sec|${sec_login}|secretaria.teste" "leitor|${leitor_login}|leitor.teste"; do
  rotulo_email="${entrada#*|}"
  status="${rotulo_email%%|*}"
  rest="${rotulo_email#*|}"
  target="${rest%%|*}"
  email="${rest#*|}"
  if [ "$status" = "307" ] && [ "$target" = "$BASE_URL/admin" ]; then
    ok "login ${email} -> 307 $BASE_URL/admin (sessao real)"
  else
    ko "login ${email} -> $status->$target (esperado 307->$BASE_URL/admin)"
  fi
done
membro_status="${membro_login%%|*}"
membro_target="${membro_login#*|}"
if [ "$membro_status" = "307" ] && [ "$membro_target" = "$BASE_URL/painel" ]; then
  ok "login membro.teste -> 307 $BASE_URL/painel"
else
  ko "login membro.teste -> $membro_status->$membro_target (esperado 307->$BASE_URL/painel)"
fi

# -- no-session checks --
check_redirect() {
  local path="$1" expect_status="$2" expect_location="$3" out
  out="$(curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' "$BASE_URL$path" || true)"
  local status="${out%%|*}" location="${out#*|}"
  if [ "$status" = "$expect_status" ] && [ "$location" = "$expect_location" ]; then
    ok "$path sem sessao -> $status $location"
  else
    ko "$path sem sessao -> $status $location (esperado $expect_status $expect_location)"
  fi
}
check_api_status() {
  local nome="$1" esperado="$2" metodo="$3" path="$4" jar="${5:-}" extra="${6:-}" code
  if [ -n "$jar" ]; then
    code="$(curl -s -o /dev/null -w '%{http_code}' -b "$jar" -X "$metodo" "$BASE_URL$path" $extra || true)"
  else
    code="$(curl -s -o /dev/null -w '%{http_code}' -X "$metodo" "$BASE_URL$path" $extra || true)"
  fi
  if [ "$code" = "$esperado" ]; then
    ok "$nome -> $code"
  else
    ko "$nome -> $code (esperado $esperado)"
  fi
}

check_api_status "POST /api/admin/assets sem sessao (anon) -> 401 (PAT-11)" "401" "POST" "/api/admin/assets" "" "-H Content-Type:application/json -d {}"
check_api_status "GET /api/admin/assets sem sessao (anon) -> 401 (PAT-11)" "401" "GET" "/api/admin/assets" ""
check_redirect "/admin/patrimonio" "307" "$BASE_URL/login/admin"

printf '%s\n' '-- runtime: leitor (FINANCEIRO, patrimonio=ler) — le, escrita 403'
leitor_page="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_LEITOR" "$BASE_URL/admin/patrimonio" || true)"
if [ "$leitor_page" = "200" ]; then
  ok "leitor GET /admin/patrimonio -> 200 (patrimonio=ler)"
else
  ko "leitor GET /admin/patrimonio -> $leitor_page (esperado 200)"
fi
check_api_status "leitor GET /api/admin/assets -> 200 (PAT-02/07)" "200" "GET" "/api/admin/assets" "$JAR_LEITOR"
check_api_status "leitor POST /api/admin/assets -> 403 (PAT-02)" "403" "POST" "/api/admin/assets" "$JAR_LEITOR" "-H Content-Type:application/json -d {}"
check_api_status "leitor PATCH /api/admin/assets/seed -> 403 (PAT-02)" "403" "PATCH" "/api/admin/assets/$SEED_ID" "$JAR_LEITOR" "-H Content-Type:application/json -d {}"

printf '%s\n' '-- runtime: SECRETARIA (patrimonio=ler) — le, escrita 403 (discriminador L-008)'
sec_page="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_SEC" "$BASE_URL/admin/patrimonio" || true)"
if [ "$sec_page" = "200" ]; then
  ok "secretaria GET /admin/patrimonio -> 200 (patrimonio=ler)"
else
  ko "secretaria GET /admin/patrimonio -> $sec_page (esperado 200)"
fi
check_api_status "secretaria POST /api/admin/assets -> 403 (secretaria NAO escreve patrimonio)" "403" "POST" "/api/admin/assets" "$JAR_SEC" "-H Content-Type:application/json -d {}"

printf '%s\n' '-- runtime: MEMBRO — fail-closed 403 + proxy redirect (MATRIZ-10)'
membro_page="$(curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' -b "$JAR_MEMBRO" "$BASE_URL/admin/patrimonio" || true)"
membro_page_status="${membro_page%%|*}"
membro_page_target="${membro_page#*|}"
if [ "$membro_page_status" = "307" ] && [ "$membro_page_target" = "$BASE_URL/login/admin" ]; then
  ok "sessao MEMBRO em /admin/patrimonio -> 307 $BASE_URL/login/admin (proxy AUTH-14 / PAT-11)"
else
  ko "sessao MEMBRO em /admin/patrimonio -> $membro_page_status->$membro_page_target (esperado 307 login/admin)"
fi
check_api_status "MEMBRO POST /api/admin/assets -> 403 (MATRIZ-10 / PAT-11)" "403" "POST" "/api/admin/assets" "$JAR_MEMBRO" "-H Content-Type:application/json -d {}"

# =====================================================================
# RUNTIME — seed Kit de Som visivel na lista admin (PAT-07)
# =====================================================================
printf '%s\n' '-- runtime: seed Kit de Som na lista admin'
admin_list="$(curl -s -b "$JAR_LEITOR" "$BASE_URL/api/admin/assets" || true)"
if printf '%s' "$admin_list" | grep -q "$SEED_NAME" \
  && printf '%s' "$admin_list" | grep -q "$SEED_TOMBO"; then
  ok "lista admin contem seed Kit de Som + tombo PAT-0001 (PAT-07)"
else
  ko "lista admin sem seed Kit de Som"
fi

# =====================================================================
# RUNTIME — ADMIN: criar bem A + CRUD + baixa
# =====================================================================
printf '%s\n' '-- runtime: CRUD bem A (ADMIN)'
RAND_SUFIXO="$RANDOM$RANDOM"
A_NAME="Probe Bem ${RAND_SUFIXO}"
A_TOMBO="PAT-$RAND_SUFIXO"
A_LOCATION="Deposito"
A_VALUE="1250.50"
A_DATE="2025-08-10"
A_RESP="Equipe de som"

a_out="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/assets" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"$A_NAME\",\"category\":\"AUDIO\",\"numero_patrimonio\":\"$A_TOMBO\",\"location\":\"$A_LOCATION\",\"acquisition_value\":$A_VALUE,\"acquisition_date\":\"$A_DATE\",\"responsible\":\"$A_RESP\"}" || true)"
a_body="${a_out%$'\n'*}"
a_http="${a_out##*$'\n'}"
A_ID="$(printf '%s' "$a_body" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"
if [ "$a_http" = "201" ] && [ -n "$A_ID" ]; then
  ok "ADMIN POST bem A -> 201 (PAT-04)"
  printf '%s' "$A_ID" > "$LEFTOVER_A"
  printf '%s' "$A_TOMBO" > "$TRAP_TOMBOS"
else
  ko "ADMIN POST bem A -> $a_http (esperado 201)"
fi

# --- POST invalido -> 400 com campos discriminados (PAT-05) ---
printf '%s\n' '-- runtime: POST invalido -> 400 campos (PAT-05)'
bad_out="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/assets" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"\",\"category\":\"PAPELARIA\",\"acquisition_value\":-5,\"acquisition_date\":\"10/02/2025\",\"status\":\"ATIVADO\"}" || true)"
bad_http="${bad_out##*$'\n'}"
bad_body="${bad_out%$'\n'*}"
if [ "$bad_http" = "400" ] \
  && printf '%s' "$bad_body" | grep -q 'dados_invalidos' \
  && printf '%s' "$bad_body" | grep -q '"campos"' \
  && printf '%s' "$bad_body" | grep -q '"name"' \
  && printf '%s' "$bad_body" | grep -q '"category"' \
  && printf '%s' "$bad_body" | grep -q '"acquisition_value"'; then
  ok "POST invalido -> 400 + {error, campos} discriminado nome/categoria/valor (PAT-05)"
else
  ko "POST invalido -> $bad_http sem {error:dados_invalidos, campos} (PAT-05)"
fi

# --- POST tombo duplicado -> 409 (PAT-06) ---
printf '%s\n' '-- runtime: tombo duplicado -> 409 (PAT-06)'
dup_out="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/assets" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Probe Duplicado ${RAND_SUFIXO}\",\"category\":\"VIDEO\",\"numero_patrimonio\":\"$A_TOMBO\"}" || true)"
dup_http="${dup_out##*$'\n'}"
dup_body="${dup_out%$'\n'*}"
if [ "$dup_http" = "409" ] && printf '%s' "$dup_body" | grep -q 'numero_patrimonio_duplicado'; then
  ok "POST tombo duplicado -> 409 numero_patrimonio_duplicado (PAT-06)"
else
  ko "POST tombo duplicado -> $dup_http (esperado 409) (PAT-06)"
fi

# --- PATCH id inexistente -> 404 (PAT-09) ---
printf '%s\n' '-- runtime: PATCH asset inexistente -> 404 (PAT-09)'
nope_id="99999999-9999-4000-8000-000000000099"
nope_out="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/assets/$nope_id" \
  -H 'Content-Type: application/json' \
  -d '{"location":"Nao existe"}' || true)"
nope_http="${nope_out##*$'\n'}"
nope_body="${nope_out%$'\n'*}"
if [ "$nope_http" = "404" ] && printf '%s' "$nope_body" | grep -q 'nao_encontrado'; then
  ok "PATCH asset inexistente -> 404 nao_encontrado (PAT-09)"
else
  ko "PATCH asset inexistente -> $nope_http sem nao_encontrado (PAT-09)"
fi

# Edit fields
if [ -n "$A_ID" ]; then
  A_NAME_EDITED="Probe Editado ${RAND_SUFIXO}"
  patch_a="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/assets/$A_ID" \
    -H 'Content-Type: application/json' \
    -d "{\"name\":\"$A_NAME_EDITED\",\"location\":\"Deposito (editado)\"}" || true)"
  patch_a_http="${patch_a##*$'\n'}"
  patch_a_body="${patch_a%$'\n'*}"
  if [ "$patch_a_http" = "200" ] && printf '%s' "$patch_a_body" | grep -q "$A_NAME_EDITED"; then
    ok "PATCH A campos -> 200 nome atualizado (PAT-08)"
  else
    ko "PATCH A campos -> $patch_a_http (esperado 200)"
  fi
  # restore name
  curl -s -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/assets/$A_ID" \
    -H 'Content-Type: application/json' -d "{\"name\":\"$A_NAME\"}" -o /dev/null 2>/dev/null || true

  admin_list_after="$(curl -s -b "$JAR_ADMIN" "$BASE_URL/api/admin/assets" || true)"
  if printf '%s' "$admin_list_after" | grep -q "\"$A_ID\""; then
    ok "GET /api/admin/assets inclui bem A (PAT-07)"
  else
    ko "GET /api/admin/assets nao inclui bem A"
  fi
fi

# --- baixa: status INATIVO cycle (PAT-10) ---
if [ -n "$A_ID" ]; then
  printf '%s\n' '-- runtime: baixa A (status INATIVO, PAT-10)'
  curl -s -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/assets/$A_ID" \
    -H 'Content-Type: application/json' -d '{"status":"INATIVO"}' -o /dev/null 2>/dev/null || true
  list_inativo="$(curl -s -b "$JAR_ADMIN" "$BASE_URL/api/admin/assets" || true)"
  if printf '%s' "$list_inativo" | grep -q "\"$A_ID\"" \
    && printf '%s' "$list_inativo" | grep -q '"status":"INATIVO"'; then
    ok "lista admin contem A INATIVO (historico preservado, PAT-03/10)"
  else
    ko "lista admin perdeu A INATIVO (baixa dura, PAT-10 quebrado)"
  fi
  # restore ATIVO
  curl -s -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/assets/$A_ID" \
    -H 'Content-Type: application/json' -d '{"status":"ATIVO"}' -o /dev/null 2>/dev/null || true
fi

# =====================================================================
# RUNTIME — PATRIMONIAL: criar bem B (ramo escrever) + PATCH (L-008)
# =====================================================================
printf '%s\n' '-- runtime: PATRIMONIAL criar/editar bem B (escrever)'
B_NAME="Probe Pat ${RAND_SUFIXO}"
B_TOMBO="PATB-$RAND_SUFIXO"
b_out="$(curl -s -w '\n%{http_code}' -b "$JAR_PAT" -X POST "$BASE_URL/api/admin/assets" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"$B_NAME\",\"category\":\"EQUIPAMENTO\",\"numero_patrimonio\":\"$B_TOMBO\"}" || true)"
b_body="${b_out%$'\n'*}"
b_http="${b_out##*$'\n'}"
B_ID="$(printf '%s' "$b_body" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"
if [ "$b_http" = "201" ] && [ -n "$B_ID" ]; then
  ok "PATRIMONIAL POST bem B -> 201 (patrimonio=escrever, PAT-04)"
  printf '%s' "$B_ID" > "$LEFTOVER_B"
else
  ko "PATRIMONIAL POST bem B -> $b_http (esperado 201)"
fi
if [ -n "$B_ID" ]; then
  b_patch="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_PAT" -X PATCH "$BASE_URL/api/admin/assets/$B_ID" \
    -H 'Content-Type: application/json' -d '{"location":"Probe Local Editado"}' || true)"
  if [ "$b_patch" = "200" ]; then
    ok "PATRIMONIAL PATCH B -> 200 (patrimonio=escrever, PAT-08)"
  else
    ko "PATRIMONIAL PATCH B -> $b_patch (esperado 200)"
  fi
fi

# =====================================================================
# RUNTIME — dashboard admin: cards Eventos + Patrimonio (PAT-12)
# =====================================================================
printf '%s\n' '-- runtime: dashboard /admin (PAT-12)'
dash="$(curl -s -b "$JAR_ADMIN" "$BASE_URL/admin" || true)"
if printf '%s' "$dash" | grep -q 'Eventos' \
  && printf '%s' "$dash" | grep -q '/admin/eventos' \
  && printf '%s' "$dash" | grep -q 'Patrimônio' \
  && printf '%s' "$dash" | grep -q '/admin/patrimonio'; then
  ok "dashboard admin contem cards Eventos e Patrimônio (PAT-12)"
else
  ko "dashboard admin sem cards Eventos/Patrimônio (PAT-12)"
fi
if printf '%s' "$dash" | grep -q 'Membros' \
  && printf '%s' "$dash" | grep -q 'Igrejas' ; then
  ok "dashboard admin preserva cards pre-existentes (regressao PAT-12)"
else
  ko "dashboard admin perdeu cards pre-existentes"
fi

# cleanup final best-effort (trap tambem faz)
[ -n "${A_ID:-}" ] && curl -s -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/assets/$A_ID" \
  -H 'Content-Type: application/json' -d '{"status":"INATIVO"}' -o /dev/null 2>/dev/null || true
[ -n "${B_ID:-}" ] && curl -s -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/assets/$B_ID" \
  -H 'Content-Type: application/json' -d '{"status":"INATIVO"}' -o /dev/null 2>/dev/null || true

printf '\nProbes admin-patrimonio: %d ok, %d falhas\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]