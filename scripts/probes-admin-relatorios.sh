#!/usr/bin/env bash
#
# Probes por AC da feature admin-relatorios (RF-027 / REL-01..23).
# Uso: BASE_URL=<url> bash scripts/probes-admin-relatorios.sh  (default http://localhost:3000)
# Requer o servidor no ar (producao: `npm run build && npm run start -- -p 3000`),
# migrations 0008/0015 aplicadas no dev, seeds (admin, financeiro, secretaria,
# patrimonial, membro) — senha `senha-teste`.
#
# Discriminacao de papel na matriz relatorios (RF-032/L-008):
#   ADMIN (administrar): tudo no modulo relatorios;
#   FINANCEIRO (escrever, financeiro.teste): upload/download/delete documentos;
#   SECRETARIA (ler): le listagem/download, upload 403;
#   PATRIMONIAL (ler): le listagem/download, upload/delete 403;
#   MEMBRO: sem linha -> fail-closed 403 (MATRIZ-10), proxy redirect;
#   anon: SEM policy anon em documents -> API 401 / pagina redirect login.
#
# Re-runnable: nomes `Probe Rel $RANDOM$RANDOM`; create -> act -> cleanup
# (DELETE documentos criados). TRAP no EXIT limpa documentos via API.
#
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

MIG15="$ROOT/supabase/migrations/0015_relatorios_documentos.sql"
SERVICE="$ROOT/src/lib/admin/relatorios.ts"
CONSTANTS="$ROOT/src/lib/admin/relatorios-constants.ts"
EXPORT_ROUTE="$ROOT/src/app/api/admin/relatorios/exportar/route.ts"
DOC_ROUTE="$ROOT/src/app/api/admin/relatorios/documentos/route.ts"
DOC_ID_ROUTE="$ROOT/src/app/api/admin/relatorios/documentos/[id]/route.ts"
DOC_DL_ROUTE="$ROOT/src/app/api/admin/relatorios/documentos/[id]/download/route.ts"
PAGE="$ROOT/src/app/admin/relatorios/page.tsx"
UPLOAD_FORM="$ROOT/src/app/admin/relatorios/upload-form.tsx"
DELETE_BTN="$ROOT/src/app/admin/relatorios/delete-button.tsx"
DASHBOARD="$ROOT/src/app/admin/page.tsx"

PASS=0
FAIL=0
ok() { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
ko() { FAIL=$((FAIL + 1)); printf '  FAIL %s\n' "$1"; }

printf '== Probes admin-relatorios (REL-01..23 / RF-027) — BASE_URL=%s ==\n' "$BASE_URL"

# =====================================================================
# ESTATICO — migration 0015 (tabela documents + RLS + bucket + storage)
# =====================================================================
printf '%s\n' '-- 0015_relatorios_documentos.sql (REL-09/13/23)'
if grep -q 'create table if not exists public.documents' "$MIG15" \
  && grep -q 'title' "$MIG15" \
  && grep -q 'category' "$MIG15" \
  && grep -q 'file_path' "$MIG15" \
  && grep -q 'file_name' "$MIG15" \
  && grep -q 'mime_type' "$MIG15" \
  && grep -q 'file_size' "$MIG15" \
  && grep -q 'uploaded_by' "$MIG15"; then
  ok "tabela documents com schema completo (REL-09)"
else
  ko "documents ausente/incompleta (REL-09)"
fi

printf '%s\n' '-- 0015: CHECK categories'
if grep -q "check (" "$MIG15" \
  && grep -q "FINANCEIRO" "$MIG15" \
  && grep -q "MEMBROS" "$MIG15" \
  && grep -q "EVENTOS" "$MIG15" \
  && grep -q "PATRIMONIO" "$MIG15" \
  && grep -q "IGREJAS" "$MIG15" \
  && grep -q "GERAL" "$MIG15"; then
  ok "CHECK categories: FINANCEIRO/MEMBROS/EVENTOS/PATRIMONIO/IGREJAS/GERAL (REL-08)"
else
  ko "CHECK categories incompleto (REL-08)"
fi

printf '%s\n' '-- 0015: RLS — can_access relatorios, SEM anon (REL-13/23)'
if grep -q 'create policy "documents_select_admin"' "$MIG15" \
  && grep -q 'to authenticated' "$MIG15" \
  && grep -qF "using (public.can_access('relatorios', 'ler'))" "$MIG15" \
  && ! grep -q 'to anon, authenticated' "$MIG15"; then
  ok "policy documents_select_admin: authenticated + ler, SEM anon (REL-13)"
else
  ko "policy documents_select_admin ausente/alterada/com anon (REL-13)"
fi
if grep -q 'create policy "documents_insert_admin"' "$MIG15" \
  && grep -qF "with check (public.can_access('relatorios', 'escrever'))" "$MIG15"; then
  ok "policy documents_insert_admin: can_access('relatorios','escrever') (REL-13)"
else
  ko "policy documents_insert_admin ausente/alterada (REL-13)"
fi
if grep -q 'create policy "documents_delete_admin"' "$MIG15" \
  && grep -qF "using (public.can_access('relatorios', 'escrever'))" "$MIG15"; then
  ok "policy documents_delete_admin: can_access('relatorios','escrever') (REL-16)"
else
  ko "policy documents_delete_admin ausente/alterada (REL-16)"
fi

printf '%s\n' '-- 0015: bucket documentos (privado, 10MB, whitelist MIME) (REL-10/13)'
if grep -q "bucket" "$MIG15" \
  && grep -q "'documentos'" "$MIG15" \
  && grep -q "false" "$MIG15" \
  && grep -q "10485760" "$MIG15"; then
  ok "bucket documentos: privado + 10MB (REL-10/13)"
else
  ko "bucket documentos ausente/incompleto (REL-10/13)"
fi
if grep -q 'application/pdf' "$MIG15" \
  && grep -q 'text/csv' "$MIG15" \
  && grep -q 'application/vnd.ms-excel' "$MIG15"; then
  ok "bucket documentos: whitelist MIME (REL-10)"
else
  ko "bucket documentos: whitelist MIME incompleta (REL-10)"
fi

printf '%s\n' '-- 0015: storage policies (INSERT/UPDATE/DELETE escrever, SELECT ler) (REL-13)'
if grep -q 'create policy "documentos_fotos_insert_admin"' "$MIG15" \
  && grep -qF "with check (" "$MIG15" \
  && grep -q "bucket_id = 'documentos'" "$MIG15" \
  && grep -qF "can_access('relatorios', 'escrever')" "$MIG15"; then
  ok "storage documentos_fotos_insert_admin: escrever (REL-13)"
else
  ko "storage documentos_fotos_insert_admin ausente (REL-13)"
fi
if grep -q 'create policy "documentos_select_admin"' "$MIG15" \
  && grep -qF "can_access('relatorios', 'ler')" "$MIG15"; then
  ok "storage documentos_select_admin: ler (REL-14)"
else
  ko "storage documentos_select_admin ausente (REL-14)"
fi

printf '%s\n' '-- 0015: indexes (category + created_at)'
if grep -q 'idx_documents_category' "$MIG15" \
  && grep -q 'idx_documents_created_at' "$MIG15"; then
  ok "indexes documents: category + created_at (REL-11)"
else
  ko "indexes documents incompletos (REL-11)"
fi

# =====================================================================
# ESTATICO — service layer + constants
# =====================================================================
printf '%s\n' '-- src/lib/admin/relatorios.ts (service)'
for fn in escapaCSV gerarCSVFinanceiro gerarCSVMembros gerarCSVEventos gerarCSVPatrimonio listarDocumentos subirDocumento removerDocumento urlDownloadDocumento buscarDocumento; do
  if grep -q "export.*function $fn\|export async function $fn" "$SERVICE"; then
    ok "service: $fn presente"
  else
    ko "service: $fn ausente"
  fi
done
for err in DocumentoTituloInvalidoError DocumentoCategoriaInvalidaError DocumentoTipoInvalidoError DocumentoTamanhoInvalidoError DocumentoNaoEncontradoError; do
  if grep -q "class $err" "$SERVICE"; then
    ok "service: $err presente"
  else
    ko "service: $err ausente"
  fi
done
if grep -q 'documentos/' "$SERVICE" \
  && grep -q 'randomUUID' "$SERVICE"; then
  ok "subirDocumento: path uuid (REL-10/13)"
else
  ko "subirDocumento: path nao usa uuid (REL-10/13)"
fi
if grep -q 'rollback' "$SERVICE" || grep -q 'remove.*storage' "$SERVICE"; then
  ok "subirDocumento: rollback storage no falha insert (REL-13)"
else
  ko "subirDocumento: sem rollback (REL-13)"
fi
if grep -q 'createSignedUrl' "$SERVICE" \
  && grep -q '60' "$SERVICE"; then
  ok "urlDownloadDocumento: signed URL 60s (REL-14)"
else
  ko "urlDownloadDocumento: signed URL ausente/sem 60s (REL-14)"
fi
if grep -q '.order("created_at", { ascending: false })' "$SERVICE"; then
  ok "listarDocumentos: created_at desc (REL-11)"
else
  ko "listarDocumentos: sem order created_at desc (REL-11)"
fi

printf '%s\n' '-- src/lib/admin/relatorios-constants.ts (tipos/constantes)'
if grep -q 'DOCUMENT_CATEGORIES' "$CONSTANTS" \
  && grep -q '"FINANCEIRO"' "$CONSTANTS" \
  && grep -q '"MEMBROS"' "$CONSTANTS" \
  && grep -q '"EVENTOS"' "$CONSTANTS" \
  && grep -q '"PATRIMONIO"' "$CONSTANTS" \
  && grep -q '"IGREJAS"' "$CONSTANTS" \
  && grep -q '"GERAL"' "$CONSTANTS"; then
  ok "DOCUMENT_CATEGORIES: 6 categorias (REL-08)"
else
  ko "DOCUMENT_CATEGORIES incompleto (REL-08)"
fi
if grep -q 'DOCUMENT_MIME_TYPES' "$CONSTANTS" \
  && grep -q 'application/pdf' "$CONSTANTS" \
  && grep -q 'text/csv' "$CONSTANTS"; then
  ok "DOCUMENT_MIME_TYPES presente (REL-10)"
else
  ko "DOCUMENT_MIME_TYPES ausente (REL-10)"
fi
if grep -q 'DOCUMENT_MAX_BYTES' "$CONSTANTS" \
  && grep -q '10485760\|10 \* 1024 \* 1024' "$CONSTANTS"; then
  ok "DOCUMENT_MAX_BYTES = 10MB (REL-10)"
else
  ko "DOCUMENT_MAX_BYTES ausente/incorreto (REL-10)"
fi
if ! grep -q 'server-only\|@supabase' "$CONSTANTS"; then
  ok "constants: client-safe (sem server-only imports)"
else
  ko "constants: contem server-only imports"
fi

# =====================================================================
# ESTATICO — route handlers
# =====================================================================
printf '%s\n' '-- rotas /api/admin/relatorios*'
if grep -q 'authAdmin("relatorios")' "$EXPORT_ROUTE" \
  && grep -q 'tipo_invalido' "$EXPORT_ROUTE" \
  && grep -q 'text/csv' "$EXPORT_ROUTE" \
  && grep -q 'Content-Disposition' "$EXPORT_ROUTE"; then
  ok "GET exportar: guard + tipo_invalido 400 + CSV headers (REL-02/07)"
else
  ko "GET exportar incompleto (REL-02/07)"
fi
if grep -q 'requireEscrita("relatorios")' "$DOC_ROUTE" \
  && grep -q 'formData' "$DOC_ROUTE" \
  && grep -q 'status: 201' "$DOC_ROUTE" \
  && grep -q 'dados_invalidos' "$DOC_ROUTE"; then
  ok "POST documentos: guard + 201 + 400 (REL-09/10)"
else
  ko "POST documentos incompleto (REL-09/10)"
fi
if grep -q 'authAdmin("relatorios")' "$DOC_ROUTE" \
  && grep -q 'listarDocumentos' "$DOC_ROUTE" \
  && grep -q 'categoria' "$DOC_ROUTE"; then
  ok "GET documentos: guard + listarDocumentos + filtro categoria (REL-11)"
else
  ko "GET documentos incompleto (REL-11)"
fi
if grep -q 'requireEscrita("relatorios")' "$DOC_ID_ROUTE" \
  && grep -q 'removerDocumento' "$DOC_ID_ROUTE" \
  && grep -q 'DocumentoNaoEncontradoError' "$DOC_ID_ROUTE" \
  && grep -q 'nao_encontrado' "$DOC_ID_ROUTE" \
  && grep -q 'ok: true' "$DOC_ID_ROUTE"; then
  ok "DELETE [id]: guard + removerDocumento + 404 + 200 ok (REL-15/16)"
else
  ko "DELETE [id] incompleto (REL-15/16)"
fi
if grep -q 'authAdmin("relatorios")' "$DOC_DL_ROUTE" \
  && grep -q 'urlDownloadDocumento' "$DOC_DL_ROUTE" \
  && grep -q 'redirect' "$DOC_DL_ROUTE" \
  && grep -q '307' "$DOC_DL_ROUTE" \
  && grep -q 'DocumentoNaoEncontradoError' "$DOC_DL_ROUTE" \
  && grep -q 'nao_encontrado' "$DOC_DL_ROUTE"; then
  ok "GET [id]/download: guard + redirect 307 + 404 (REL-14/15)"
else
  ko "GET [id]/download incompleto (REL-14/15)"
fi

# =====================================================================
# ESTATICO — paginas admin
# =====================================================================
printf '%s\n' '-- paginas /admin/relatorios'
if grep -q '"relatorios", "ler"' "$PAGE" \
  && grep -q 'denied-block\|Você não tem permissão' "$PAGE" \
  && grep -q 'Voltar ao painel' "$PAGE"; then
  ok "pagina: guard leitura + denied-block (REL-19)"
else
  ko "pagina: guard/denied-block ausente (REL-19)"
fi
if grep -q 'Exportar relatório' "$PAGE" \
  && grep -q 'data_inicio' "$PAGE" \
  && grep -q 'data_fim' "$PAGE" \
  && grep -q 'Financeiro (CSV)' "$PAGE"; then
  ok "pagina: secao Relatorios com form GET periodo (REL-01/02)"
else
  ko "pagina: secao Relatorios incompleta (REL-01/02)"
fi
if grep -q 'Membros' "$PAGE" \
  && grep -q 'Eventos' "$PAGE" \
  && grep -q 'Patrimônio' "$PAGE" \
  && grep -q 'exportar?tipo=membros' "$PAGE" \
  && grep -q 'exportar?tipo=eventos' "$PAGE" \
  && grep -q 'exportar?tipo=patrimonio' "$PAGE"; then
  ok "pagina: links export membros/eventos/patrimonio (REL-04/05/06)"
else
  ko "pagina: links export incompletos (REL-04/05/06)"
fi
if grep -q 'Documentos' "$PAGE" \
  && grep -q 'Todas' "$PAGE" \
  && grep -q 'DOCUMENT_CATEGORIES' "$PAGE" \
  && grep -q 'Link' "$PAGE"; then
  ok "pagina: chips categoria com Link (REL-11/AD-016)"
else
  ko "pagina: chips categoria ausentes (REL-11)"
fi
if grep -q 'Nenhum documento cadastrado' "$PAGE"; then
  ok "pagina: empty state (REL-11)"
else
  ko "pagina: empty state ausente (REL-11)"
fi
if grep -q 'upload-form\|UploadForm' "$PAGE" \
  && grep -q 'escritor' "$PAGE"; then
  ok "pagina: upload form visivel so p/ escritores (REL-09)"
else
  ko "pagina: upload form ausente (REL-09)"
fi
if grep -q 'delete-button\|DeleteButton' "$PAGE" \
  && grep -q 'escritor' "$PAGE"; then
  ok "pagina: delete button p/ escritores (REL-16)"
else
  ko "pagina: delete button ausente (REL-16)"
fi
if grep -q 'download' "$PAGE" \
  && grep -q 'api/admin/relatorios/documentos' "$PAGE"; then
  ok "pagina: download link para documentos (REL-14)"
else
  ko "pagina: download link ausente (REL-14)"
fi

printf '%s\n' '-- upload-form.tsx (client component)'
if grep -q '"use client"' "$UPLOAD_FORM" \
  && grep -q 'fetch("/api/admin/relatorios/documentos"' "$UPLOAD_FORM" \
  && grep -q 'method: "POST"' "$UPLOAD_FORM" \
  && grep -q 'encType="multipart/form-data"' "$UPLOAD_FORM" \
  && grep -q 'router.refresh()' "$UPLOAD_FORM"; then
  ok "upload form: client + POST multipart + refresh (REL-09)"
else
  ko "upload form incompleta (REL-09)"
fi

printf '%s\n' '-- delete-button.tsx (client component)'
if grep -q '"use client"' "$DELETE_BTN" \
  && grep -q 'method: "DELETE"' "$DELETE_BTN" \
  && grep -q 'router.refresh()' "$DELETE_BTN"; then
  ok "delete button: client + DELETE + refresh (REL-16)"
else
  ko "delete button incompleta (REL-16)"
fi

printf '%s\n' '-- /admin (dashboard, card Relatorios — REL-20/21)'
if grep -q 'href="/admin/relatorios"' "$DASHBOARD" \
  && grep -q 'BarChart3' "$DASHBOARD" \
  && grep -q 'Relatórios' "$DASHBOARD" \
  && grep -q 'Exportações e documentos da igreja' "$DASHBOARD"; then
  ok "card Relatorios no dashboard (REL-20)"
else
  ko "card Relatorios ausente no dashboard (REL-20)"
fi
if grep -q 'href="/admin/financeiro"' "$DASHBOARD" \
  && grep -q 'href="/admin/membros"' "$DASHBOARD"; then
  ok "dashboard: cards pre-existentes preservados (regressao)"
else
  ko "dashboard: cards pre-existentes removidos"
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
JAR_FIN="$(mktemp)"
JAR_SEC="$(mktemp)"
JAR_PAT="$(mktemp)"
JAR_MEMBRO="$(mktemp)"
LEFTOVER="$(mktemp)"
: > "$LEFTOVER"
trap '
  while IFS= read -r DID; do
    [ -n "$DID" ] && curl -s -b "$JAR_ADMIN" -X DELETE "$BASE_URL/api/admin/relatorios/documentos/$DID" \
      -o /dev/null 2>/dev/null || true
  done < "$LEFTOVER"
  rm -f "$JAR_ADMIN" "$JAR_FIN" "$JAR_SEC" "$JAR_PAT" "$JAR_MEMBRO" "$LEFTOVER"
' EXIT

login_admin() {
  curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' -c "$1" -X POST "$BASE_URL/api/auth/login/admin" \
    --data-urlencode "email=$2" --data-urlencode "password=senha-teste" || true
}
login_membro() {
  curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' -c "$1" -X POST "$BASE_URL/api/auth/login" \
    --data-urlencode "email=$2" --data-urlencode "password=senha-teste" || true
}

admin_login="$(login_admin "$JAR_ADMIN" "admin.teste@ivc.local")"
fin_login="$(login_admin "$JAR_FIN" "financeiro.teste@ivc.local")"
sec_login="$(login_admin "$JAR_SEC" "secretaria.teste@ivc.local")"
pat_login="$(login_admin "$JAR_PAT" "patrimonial.teste@ivc.local")"
membro_login="$(login_membro "$JAR_MEMBRO" "membro.teste@ivc.local")"

for entrada in "admin|${admin_login}|admin.teste" "fin|${fin_login}|financeiro.teste" "sec|${sec_login}|secretaria.teste" "pat|${pat_login}|patrimonial.teste"; do
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

check_api_status "POST /api/admin/relatorios/documentos sem sessao -> 401 (REL-09/non-auth)" "401" "POST" "/api/admin/relatorios/documentos" "" "-H Content-Type:application/json -d {}"
check_api_status "GET /api/admin/relatorios/documentos sem sessao -> 401" "401" "GET" "/api/admin/relatorios/documentos"
check_api_status "GET /api/admin/relatorios/exportar sem sessao -> 401" "401" "GET" "/api/admin/relatorios/exportar?tipo=financeiro"
check_redirect "/admin/relatorios" "307" "$BASE_URL/login/admin"

# =====================================================================
# RUNTIME — exports (REL-02/03/04/05/06/07)
# =====================================================================
printf '%s\n' '-- runtime: export financeiro com periodo'
csv_fin="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" "$BASE_URL/api/admin/relatorios/exportar?tipo=financeiro&data_inicio=2026-01-01&data_fim=2026-12-31" || true)"
csv_fin_http="${csv_fin##*$'\n'}"
csv_fin_body="${csv_fin%$'\n'*}"
if [ "$csv_fin_http" = "200" ] \
  && printf '%s' "$csv_fin_body" | head -1 | grep -q ';' \
  && printf '%s' "$csv_fin_body" | grep -q 'TOTAIS'; then
  ok "export financeiro -> 200 CSV + ; + totais (REL-02/03/08)"
else
  ko "export financeiro -> $csv_fin_http (esperado 200 CSV com totais)"
fi

for tipo in membros eventos patrimonio; do
  csv_out="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" "$BASE_URL/api/admin/relatorios/exportar?tipo=$tipo" || true)"
  csv_http="${csv_out##*$'\n'}"
  csv_body="${csv_out%$'\n'*}"
  if [ "$csv_http" = "200" ] \
    && printf '%s' "$csv_body" | head -1 | grep -q ';'; then
    ok "export $tipo -> 200 CSV + ; (REL-04/05/06/08)"
  else
    ko "export $tipo -> $csv_http (esperado 200 CSV)"
  fi
done

printf '%s\n' '-- runtime: tipo invalido -> 400'
inv_out="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" "$BASE_URL/api/admin/relatorios/exportar?tipo=invalido" || true)"
inv_http="${inv_out##*$'\n'}"
inv_body="${inv_out%$'\n'*}"
if [ "$inv_http" = "400" ] && printf '%s' "$inv_body" | grep -q 'tipo_invalido'; then
  ok "export tipo_invalido -> 400 tipo_invalido (REL-07)"
else
  ko "export tipo_invalido -> $inv_http (esperado 400)"
fi

# =====================================================================
# RUNTIME — RBAC relatorios (REL-17/18 — L-008 discriminador)
# =====================================================================
printf '%s\n' '-- runtime: FINANCEIRO (escrever) — upload + list + delete'
FIN_rand="$RANDOM$RANDOM"
FIN_TITLE="Probe Doc Fin ${FIN_rand}"
PROBE_FILE="$(mktemp --suffix=.csv)"
echo "probe content" > "$PROBE_FILE"
fin_upload="$(curl -s -w '\n%{http_code}' -b "$JAR_FIN" -X POST "$BASE_URL/api/admin/relatorios/documentos" \
  -F "title=$FIN_TITLE" -F "category=FINANCEIRO" -F "file=@${PROBE_FILE};filename=probe.csv;type=text/csv" || true)"
rm -f "$PROBE_FILE"
fin_upload_http="${fin_upload##*$'\n'}"
fin_upload_body="${fin_upload%$'\n'*}"
FIN_ID="$(printf '%s' "$fin_upload_body" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"
if [ "$fin_upload_http" = "201" ] && [ -n "$FIN_ID" ]; then
  ok "FINANCEIRO POST upload -> 201 (REL-09/10)"
  printf '%s\n' "$FIN_ID" >> "$LEFTOVER"
else
  ko "FINANCEIRO POST upload -> $fin_upload_http (esperado 201)"
fi

check_api_status "FINANCEIRO GET documentos -> 200 (REL-11)" "200" "GET" "/api/admin/relatorios/documentos" "$JAR_FIN"

if [ -n "$FIN_ID" ]; then
  dl_out="$(curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' -b "$JAR_FIN" "$BASE_URL/api/admin/relatorios/documentos/$FIN_ID/download" || true)"
  dl_status="${dl_out%%|*}"
  dl_location="${dl_out#*|}"
  if [ "$dl_status" = "307" ] && [ -n "$dl_location" ]; then
    ok "FINANCEIRO GET download -> 307 redirect signed URL (REL-14)"
  else
    ko "FINANCEIRO GET download -> $dl_status (esperado 307)"
  fi
fi

printf '%s\n' '-- runtime: SECRETARIA (ler) — le 200, upload 403 (discriminador L-008)'
SECRET_FILE="$(mktemp --suffix=.csv)"
echo "secret test" > "$SECRET_FILE"
check_api_status "SECRETARIA GET documentos -> 200 (REL-11)" "200" "GET" "/api/admin/relatorios/documentos" "$JAR_SEC"
check_api_status "SECRETARIA POST upload -> 403 (REL-09)" "403" "POST" "/api/admin/relatorios/documentos" "$JAR_SEC" "-F title=x -F category=GERAL -F file=@${SECRET_FILE};filename=t.csv;type=text/csv"
rm -f "$SECRET_FILE"

printf '%s\n' '-- runtime: PATRIMONIAL (ler) — le 200, delete 403 (discriminador L-008)'
check_api_status "PATRIMONIAL GET documentos -> 200 (REL-11)" "200" "GET" "/api/admin/relatorios/documentos" "$JAR_PAT"
if [ -n "${FIN_ID:-}" ]; then
  check_api_status "PATRIMONIAL DELETE -> 403 (REL-16)" "403" "DELETE" "/api/admin/relatorios/documentos/$FIN_ID" "$JAR_PAT"
fi

printf '%s\n' '-- runtime: MEMBRO — fail-closed 403 + proxy redirect (MATRIZ-10)'
membro_page="$(curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' -b "$JAR_MEMBRO" "$BASE_URL/admin/relatorios" || true)"
membro_page_status="${membro_page%%|*}"
membro_page_target="${membro_page#*|}"
if [ "$membro_page_status" = "307" ] && [ "$membro_page_target" = "$BASE_URL/login/admin" ]; then
  ok "sessao MEMBRO em /admin/relatorios -> 307 $BASE_URL/login/admin (proxy / MATRIZ-10)"
else
  ko "sessao MEMBRO em /admin/relatorios -> $membro_page_status->$membro_page_target (esperado 307 login/admin)"
fi
check_api_status "MEMBRO POST /api/admin/relatorios/documentos -> 403 (MATRIZ-10)" "403" "POST" "/api/admin/relatorios/documentos" "$JAR_MEMBRO" "-H Content-Type:application/json -d {}"

printf '%s\n' '-- runtime: anon -> 401 API / 307 pagina'
check_api_status "anon POST /api/admin/relatorios/documentos -> 401" "401" "POST" "/api/admin/relatorios/documentos"

# =====================================================================
# RUNTIME — upload: 400 por campo (REL-09/10)
# =====================================================================
printf '%s\n' '-- runtime: upload 400 por campo'
PROBE_FILE2="$(mktemp --suffix=.csv)"
echo "probe content" > "$PROBE_FILE2"
no_title="$(curl -s -w '\n%{http_code}' -b "$JAR_FIN" -X POST "$BASE_URL/api/admin/relatorios/documentos" \
  -F "title=" -F "category=FINANCEIRO" -F "file=@${PROBE_FILE2};filename=t.csv;type=text/csv" || true)"
no_title_http="${no_title##*$'\n'}"
no_title_body="${no_title%$'\n'*}"
if [ "$no_title_http" = "400" ] && printf '%s' "$no_title_body" | grep -q 'dados_invalidos' && printf '%s' "$no_title_body" | grep -q '"title"'; then
  ok "upload title vazio -> 400 dados_invalidos (REL-09)"
else
  ko "upload title vazio -> $no_title_http (esperado 400)"
fi

no_cat="$(curl -s -w '\n%{http_code}' -b "$JAR_FIN" -X POST "$BASE_URL/api/admin/relatorios/documentos" \
  -F "title=Test" -F "category=CATEGORIA_invalida" -F "file=@${PROBE_FILE2};filename=t.csv;type=text/csv" || true)"
no_cat_http="${no_cat##*$'\n'}"
no_cat_body="${no_cat%$'\n'*}"
if [ "$no_cat_http" = "400" ] && printf '%s' "$no_cat_body" | grep -q 'dados_invalidos' && printf '%s' "$no_cat_body" | grep -q '"category"'; then
  ok "upload categoria invalida -> 400 dados_invalidos (REL-09)"
else
  ko "upload categoria invalida -> $no_cat_http (esperado 400)"
fi

no_file="$(curl -s -w '\n%{http_code}' -b "$JAR_FIN" -X POST "$BASE_URL/api/admin/relatorios/documentos" \
  -F "title=Test" -F "category=GERAL" || true)"
no_file_http="${no_file##*$'\n'}"
no_file_body="${no_file%$'\n'*}"
if [ "$no_file_http" = "400" ] && printf '%s' "$no_file_body" | grep -q 'dados_invalidos' && printf '%s' "$no_file_body" | grep -q '"file"'; then
  ok "upload arquivo ausente -> 400 dados_invalidos (REL-10)"
else
  ko "upload arquivo ausente -> $no_file_http (esperado 400)"
fi
rm -f "$PROBE_FILE2"

# =====================================================================
# RUNTIME — download 307 follow 200 + delete 200/404
# =====================================================================
printf '%s\n' '-- runtime: CRUD completo download/delete (REL-14/15/16/18)'
DOC_rand="$RANDOM$RANDOM"
DOC_TITLE="Probe Doc Del ${DOC_rand}"
PROBE_FILE3="$(mktemp --suffix=.csv)"
echo "probe content" > "$PROBE_FILE3"
doc_up="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/relatorios/documentos" \
  -F "title=$DOC_TITLE" -F "category=GERAL" -F "file=@${PROBE_FILE3};filename=probe.csv;type=text/csv" || true)"
rm -f "$PROBE_FILE3"
doc_up_http="${doc_up##*$'\n'}"
doc_up_body="${doc_up%$'\n'*}"
DOC_ID="$(printf '%s' "$doc_up_body" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"
if [ "$doc_up_http" = "201" ] && [ -n "$DOC_ID" ]; then
  ok "upload documento -> 201 (REL-09)"
  printf '%s\n' "$DOC_ID" >> "$LEFTOVER"
else
  ko "upload documento -> $doc_up_http (esperado 201)"
fi

if [ -n "$DOC_ID" ]; then
  dl_check="$(curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' -b "$JAR_ADMIN" "$BASE_URL/api/admin/relatorios/documentos/$DOC_ID/download" || true)"
  dl_st="${dl_check%%|*}"
  dl_loc="${dl_check#*|}"
  if [ "$dl_st" = "307" ] && [ -n "$dl_loc" ]; then
    ok "download -> 307 redirect (REL-14)"
    follow="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" "$dl_loc" || true)"
    if [ "$follow" = "200" ]; then
      ok "download follow -> 200 (REL-14)"
    else
      ko "download follow -> $follow (esperado 200)"
    fi
  else
    ko "download -> $dl_st (esperado 307)"
  fi

  dl_404="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" "$BASE_URL/api/admin/relatorios/documentos/99999999-9999-4000-8000-000000000099/download" || true)"
  dl_404_http="${dl_404##*$'\n'}"
  dl_404_body="${dl_404%$'\n'*}"
  if [ "$dl_404_http" = "404" ] && printf '%s' "$dl_404_body" | grep -q 'nao_encontrado'; then
    ok "download inexistente -> 404 nao_encontrado (REL-15)"
  else
    ko "download inexistente -> $dl_404_http (esperado 404)"
  fi

  del_out="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" -X DELETE "$BASE_URL/api/admin/relatorios/documentos/$DOC_ID" || true)"
  del_http="${del_out##*$'\n'}"
  del_body="${del_out%$'\n'*}"
  if [ "$del_http" = "200" ] && printf '%s' "$del_body" | grep -q 'ok.*true\|"ok":true'; then
    ok "DELETE documento -> 200 ok:true (REL-16)"
    # remove do LEFTOVER (ja deletado)
    LEFTOVER_CLEAN="$(mktemp)"
    grep -v "^${DOC_ID}$" "$LEFTOVER" > "$LEFTOVER_CLEAN" 2>/dev/null || true
    mv "$LEFTOVER_CLEAN" "$LEFTOVER"
  else
    ko "DELETE documento -> $del_http (esperado 200)"
  fi

  del_404="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" -X DELETE "$BASE_URL/api/admin/relatorios/documentos/$DOC_ID" || true)"
  del_404_http="${del_404##*$'\n'}"
  del_404_body="${del_404%$'\n'*}"
  if [ "$del_404_http" = "404" ] && printf '%s' "$del_404_body" | grep -q 'nao_encontrado'; then
    ok "DELETE 2x (inexistente) -> 404 nao_encontrado (REL-16)"
  else
    ko "DELETE 2x -> $del_404_http (esperado 404)"
  fi
fi

# =====================================================================
# RUNTIME — listagem + filtro categoria (REL-11)
# =====================================================================
printf '%s\n' '-- runtime: listagem e filtro categoria'
list_all="$(curl -s -b "$JAR_ADMIN" "$BASE_URL/api/admin/relatorios/documentos" || true)"
if printf '%s' "$list_all" | grep -q '"documentos":'; then
  ok "GET documentos retorna lista (REL-11)"
else
  ko "GET documentos sem lista (REL-11)"
fi
list_fin="$(curl -s -b "$JAR_ADMIN" "$BASE_URL/api/admin/relatorios/documentos?categoria=FINANCEIRO" || true)"
if printf '%s' "$list_fin" | grep -q '"documentos":'; then
  ok "GET documentos?categoria=FINANCEIRO filtra (REL-11)"
else
  ko "GET documentos?categoria=FINANCEIRO falhou (REL-11)"
fi
# documento do FINANCEIRO probe esta presente na lista FINANCEIRO?
if [ -n "${FIN_ID:-}" ] && printf '%s' "$list_fin" | grep -q "$FIN_ID"; then
  ok "documento FINANCEIRO probe presente na lista filtrada (REL-11)"
else
  ko "documento FINANCEIRO probe ausente na lista filtrada (REL-11)"
fi

# =====================================================================
# RUNTIME — pagina /admin/relatorios
# =====================================================================
printf '%s\n' '-- runtime: pagina /admin/relatorios'
page_out="$(curl -s -b "$JAR_ADMIN" "$BASE_URL/admin/relatorios" || true)"
if printf '%s' "$page_out" | grep -q 'Relatórios' \
  && printf '%s' "$page_out" | grep -q 'Exportar relatório' \
  && printf '%s' "$page_out" | grep -q 'Documentos'; then
  ok "pagina /admin/relatorios: titulo + secoes (REL-01)"
else
  ko "pagina /admin/relatorios incompleta (REL-01)"
fi
if printf '%s' "$page_out" | grep -q 'Nenhum documento cadastrado' \
  || printf '%s' "$page_out" | grep -q 'titulo\|title'; then
  ok "pagina /admin/relatorios: empty state ou lista de documentos (REL-11)"
else
  ko "pagina /admin/relatorios: empty state e lista ambos ausentes (REL-11)"
fi

printf '%s\n' '-- runtime: pagina /admin — card Relatorios'
dash="$(curl -s -b "$JAR_ADMIN" "$BASE_URL/admin" || true)"
if printf '%s' "$dash" | grep -q 'Relatórios' \
  && printf '%s' "$dash" | grep -q '/admin/relatorios' \
  && printf '%s' "$dash" | grep -q 'Exportações e documentos da igreja'; then
  ok "dashboard admin contem card Relatorios (REL-20)"
else
  ko "dashboard admin sem card Relatorios (REL-20)"
fi

printf '\nProbes admin-relatorios: %d ok, %d falhas\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
