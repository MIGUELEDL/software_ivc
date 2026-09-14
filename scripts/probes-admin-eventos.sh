#!/usr/bin/env bash
#
# Probes por AC da feature admin-eventos (RF-024 / EVT-01..16).
# Uso: BASE_URL=<url> bash scripts/probes-admin-eventos.sh  (default http://localhost:3000)
# Requer o servidor no ar (produção: `npm run build && npm run start -- -p 3000`),
# migrations 0008/0009/0010/0012 aplicadas no dev e seeds sem force_password_change:
# admin.teste (ADMIN), leitor.teste (FINANCEIRO, eventos=ler),
# secretaria.teste (SECRETARIA, eventos=escrever), membro.teste (MEMBRO) —
# senha `senha-teste`.
#
# Discriminação de papel na matriz eventos (RF-032/L-008):
#   ADMIN (administrar): cria/edita eventos, visível/status toggle;
#   SECRETARIA (escrever): cria/edita eventos (0009 seed eventos=escrever);
#   FINANCEIRO/PATRIMONIAL (ler, leitor.teste): le admin 200, escrita 403;
#   MEMBRO: sem linha -> fail-closed 403 (MATRIZ-10), proxy redirect.
#
# Re-runnable: nomes `Probe Evento $RANDOM$RANDOM`; create -> act ->
# cleanup (PATCH visivel=false/status=INATIVO via sessao admin).
# TRAP no EXIT restaura seed e oculta eventos criados (best effort).
#
# Nota: sem DELETE route/policy em events (EVT-03) — eventos criados
# pelos probes tornam-se residuos INATIVO + visivel=false (não hard-delete).
# Limpeza via MCP entre rodadas se necessário.
#
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

MIG12="$ROOT/supabase/migrations/0012_events.sql"
SERVICE="$ROOT/src/lib/admin/eventos.ts"
VALIDACAO="$ROOT/src/lib/admin/validacao.ts"
EVENTOS_ROUTE="$ROOT/src/app/api/admin/eventos/route.ts"
EVENTO_ID_ROUTE="$ROOT/src/app/api/admin/eventos/[id]/route.ts"
LISTA="$ROOT/src/app/admin/eventos/page.tsx"
NOVA_PAGE="$ROOT/src/app/admin/eventos/nova/page.tsx"
NOVA_FORM="$ROOT/src/app/admin/eventos/nova/evento-novo-form.tsx"
DETALHE="$ROOT/src/app/admin/eventos/[id]/page.tsx"
EDITAR_FORM="$ROOT/src/app/admin/eventos/[id]/evento-editar-form.tsx"
PORTAL_LISTA="$ROOT/src/app/eventos/page.tsx"
PORTAL_DETALHE="$ROOT/src/app/eventos/[id]/page.tsx"
CONSTANTS="$ROOT/src/lib/constants.ts"

SEED_ID="00000000-0000-4000-8000-00000000000f"
SEED_TITLE="Clamor 12h"
SEED_DATE="2026-10-01"

PASS=0
FAIL=0
ok() { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
ko() { FAIL=$((FAIL + 1)); printf '  FAIL %s\n' "$1"; }

printf '== Probes admin-eventos (EVT-01..16 / RF-024) — BASE_URL=%s ==\n' "$BASE_URL"

# =====================================================================
# ESTÁTICO — migration 0012 (tabela, RLS, seed)
# =====================================================================
printf '%s\n' '-- 0012_events.sql (tabelas)'
if grep -q 'create table if not exists public.events' "$MIG12" \
  && grep -q 'title text not null' "$MIG12" \
  && grep -q 'date date not null' "$MIG12" \
  && grep -q 'time text not null' "$MIG12" \
  && grep -q 'location text not null' "$MIG12" \
  && grep -q 'visivel boolean not null default true' "$MIG12" \
  && grep -q "status text not null default 'ATIVO'" "$MIG12" \
  && grep -q "check (status in ('ATIVO', 'INATIVO'))" "$MIG12"; then
  ok "tabela events com colunas e check da spec (EVT-01)"
else
  ko "events ausente/incompleta (EVT-01)"
fi
if grep -q 'alter table public.events enable row level security' "$MIG12"; then
  ok "RLS habilitada em events"
else
  ko "RLS ausente em events"
fi

printf '%s\n' '-- 0012: RLS — leitura publica e escrita via can_access (RF-032)'
# SELECT público (anon + authenticated) — L-006: assertar role list
if grep -q 'create policy "events_select_public"' "$MIG12" \
  && grep -q 'for select' "$MIG12" \
  && grep -q 'to anon, authenticated' "$MIG12" \
  && grep -q 'using (true)' "$MIG12"; then
  ok "policy events_select_public: leitura publica anon+authenticated (EVT-02)"
else
  ko "policy events_select_public ausente/alterada (EVT-02)"
fi
# INSERT com can_access
if grep -q 'create policy "events_insert_admin"' "$MIG12" \
  && grep -qF "with check (public.can_access('eventos', 'escrever'))" "$MIG12"; then
  ok "policy events_insert_admin: can_access('eventos','escrever') (EVT-03)"
else
  ko "policy events_insert_admin ausente/alterada (EVT-03)"
fi
# UPDATE com can_access (using + with check)
n_update="$(grep -c "public.can_access('eventos', 'escrever')" "$MIG12" || true)"
if grep -q 'create policy "events_update_admin"' "$MIG12" \
  && grep -qF "using (public.can_access('eventos', 'escrever'))" "$MIG12" \
  && grep -qF "with check (public.can_access('eventos', 'escrever'))" "$MIG12" \
  && [ "$n_update" -ge 3 ]; then
  ok "policy events_update_admin: using+with check can_access (EVT-03)"
else
  ko "policy events_update_admin incompleta (EVT-03)"
fi
# Sem policy de DELETE
if ! grep -q 'create policy "events_delete' "$MIG12"; then
  ok "events sem policy de DELETE (soft-delete por status, EVT-03)"
else
  ko "events com policy de DELETE (EVT-03)"
fi

printf '%s\n' '-- 0012: seed Clamor 12h'
if grep -q "'Clamor 12h'" "$MIG12" \
  && grep -q "'${SEED_ID}'" "$MIG12" \
  && grep -q "'${SEED_DATE}'" "$MIG12" \
  && grep -q "'12:00'" "$MIG12" \
  && grep -q "'Santa Luzia - PB'" "$MIG12" \
  && grep -q "on conflict (id) do nothing" "$MIG12"; then
  ok "seed Clamor 12h idempotente (EVT-01/12)"
else
  ko "seed Clamor 12h ausente/incompleta"
fi

# =====================================================================
# ESTÁTICO — service layer + validação
# =====================================================================
printf '%s\n' '-- src/lib/admin/eventos.ts (service)'
for fn in listarEventos listarEventosPublicos buscarEventoPublico criarEvento atualizarEvento; do
  if grep -q "export async function $fn" "$SERVICE"; then
    ok "service: $fn presente"
  else
    ko "service: $fn ausente"
  fi
done
if grep -q 'EventoNaoEncontradoError' "$SERVICE" \
  && grep -q 'evento_nao_encontrado' "$SERVICE"; then
  ok "service: EventoNaoEncontradoError (EVT-09)"
else
  ko "service: EventoNaoEncontradoError ausente"
fi
if grep -q '.eq("visivel", true)' "$SERVICE" \
  && grep -q '.eq("status", "ATIVO")' "$SERVICE" \
  && grep -q '.order("date", { ascending: true })' "$SERVICE"; then
  ok "listarEventosPublicos: filtra visivel+ATIVO, date asc (EVT-12)"
else
  ko "listarEventosPublicos: filtro/ordem incompleta"
fi
if grep -q '.eq("visivel", true)' "$SERVICE" \
  && grep -q '.eq("status", "ATIVO")' "$SERVICE" \
  && grep -q '.maybeSingle()' "$SERVICE"; then
  ok "buscarEventoPublico: filtra visivel+ATIVO (EVT-13/14)"
else
  ko "buscarEventoPublico: filtro incompleto"
fi
if grep -q '.order("date", { ascending: false })' "$SERVICE"; then
  ok "listarEventos: date desc admin (EVT-07)"
else
  ko "listarEventos: sem date desc"
fi
if grep -q 'status: "ATIVO"' "$SERVICE" \
  && grep -q 'visivel: dados.visivel ?? true' "$SERVICE"; then
  ok "criarEvento: nasce ATIVO, visivel default true (EVT-04)"
else
  ko "criarEvento: defaults ausentes"
fi
if grep -q 'dados.visivel' "$SERVICE" \
  && grep -q 'dados.status' "$SERVICE" \
  && grep -q 'EventoNaoEncontradoError' "$SERVICE"; then
  ok "atualizarEvento: aceita visivel/status + 404 (EVT-08/09/10/11)"
else
  ko "atualizarEvento: campos ou 404 ausentes"
fi

printf '%s\n' '-- src/lib/admin/validacao.ts (validarEvento)'
if grep -q 'export function validarEvento' "$VALIDACAO" \
  && grep -q 'export function validarDataEvento' "$VALIDACAO" \
  && grep -qF '/^\d{2}:\d{2}$/' "$VALIDACAO"; then
  ok "validarEvento + validarDataEvento + time HH:MM (EVT-05)"
else
  ko "validarEvento/validarDataEvento ausentes"
fi
if grep -q '"ATIVO" && body.status !== "INATIVO"' "$VALIDACAO" \
  && grep -q 'typeof body.visivel !== "boolean"' "$VALIDACAO"; then
  ok "validarEvento: status ATIVO/INATIVO + visivel booleano (EVT-05)"
else
  ko "validarEvento: validação de status/visivel incompleta"
fi

# =====================================================================
# ESTÁTICO — route handlers (guardas, status codes, sem DELETE)
# =====================================================================
printf '%s\n' '-- rotas /api/admin/eventos*'
if grep -q 'requireEscrita("eventos")' "$EVENTOS_ROUTE" \
  && grep -q 'status: 201' "$EVENTOS_ROUTE" \
  && grep -q 'erroCampos(resultado.campos)' "$EVENTOS_ROUTE" \
  && grep -q 'authAdmin("eventos")' "$EVENTOS_ROUTE" \
  && grep -q 'listarEventos()' "$EVENTOS_ROUTE"; then
  ok "POST+GET eventos: guards eventos + 201 + 400 por campo + listar (EVT-04/05/07)"
else
  ko "POST+GET eventos incompleto"
fi
if grep -q 'requireEscrita("eventos")' "$EVENTO_ID_ROUTE" \
  && grep -q 'validarEvento(body, "parcial")' "$EVENTO_ID_ROUTE" \
  && grep -q 'EventoNaoEncontradoError' "$EVENTO_ID_ROUTE" \
  && grep -q 'nao_encontrado' "$EVENTO_ID_ROUTE" \
  && grep -q 'status: 404' "$EVENTO_ID_ROUTE"; then
  ok "PATCH [id]: guard escrita + parcial + 404 (EVT-08/09)"
else
  ko "PATCH [id] incompleto"
fi
if ! grep -q 'DELETE' "$EVENTO_ID_ROUTE"; then
  ok "sem DELETE em [id]/route.ts (soft-delete, EVT-03)"
else
  ko "[id]/route.ts contém DELETE (EVT-03)"
fi
if ! grep -q 'DELETE' "$EVENTOS_ROUTE"; then
  ok "sem DELETE em eventos/route.ts"
else
  ko "eventos/route.ts contém DELETE"
fi

# =====================================================================
# ESTÁTICO — páginas admin
# =====================================================================
printf '%s\n' '-- páginas /admin/eventos*'
if grep -q 'await can(claims?.role ?? "", "eventos", "ler")' "$LISTA" \
  && grep -q '"eventos", "escrever"' "$LISTA" \
  && grep -q 'href="/admin/eventos/nova"' "$LISTA"; then
  ok "lista: guard leitura + link novo + escritor (EVT-04/07)"
else
  ko "lista incompleta"
fi
if grep -q 'evento.visivel' "$LISTA" \
  && grep -q '"Visível"' "$LISTA" \
  && grep -q '"Oculto"' "$LISTA" \
  && grep -q 'evento.status' "$LISTA"; then
  ok "lista: badges visivel/status (EVT-08)"
else
  ko "lista: badges ausentes"
fi
if grep -q '"eventos", "escrever"' "$NOVA_PAGE"; then
  ok "nova: guard escrita server-side"
else
  ko "nova page sem guard"
fi
if grep -q 'fetch("/api/admin/eventos"' "$NOVA_FORM" \
  && grep -q 'method: "POST"' "$NOVA_FORM" \
  && grep -q 'corpo?.campos' "$NOVA_FORM"; then
  ok "nova form: POST + validacao por campo (EVT-04/05)"
else
  ko "nova form incompleta"
fi
if grep -q 'listarEventos()' "$DETALHE" \
  && grep -q 'notFound()' "$DETALHE" \
  && grep -q '<EventoEditarForm' "$DETALHE"; then
  ok "detalhe: ler eventos + notFound + form de edicao"
else
  ko "detalhe incompleto"
fi
if grep -q '"eventos", "escrever"' "$DETALHE"; then
  ok "detalhe: guard escrita para form"
else
  ko "detalhe sem guard escrita"
fi
if grep -q 'method: "PATCH"' "$EDITAR_FORM" \
  && grep -q 'name="visivel"' "$EDITAR_FORM" \
  && grep -q 'visivel: dados.get("visivel") === "on"' "$EDITAR_FORM" \
  && grep -q 'status,' "$EDITAR_FORM" \
  && ! grep -q 'method: "DELETE"' "$EDITAR_FORM"; then
  ok "editar form: PATCH + toggle visivel/status sem DELETE (EVT-08/10/11)"
else
  ko "editar form incompleta"
fi

# =====================================================================
# ESTÁTICO — portal (DB-driven, sem EVENTS literal, sem generateStaticParams)
# =====================================================================
printf '%s\n' '-- portal /eventos (DB-driven, EVT-12..16)'
if grep -q 'listarEventosPublicos()' "$PORTAL_LISTA"; then
  ok "portal lista: busca do banco (EVT-12)"
else
  ko "portal lista: nao busca do banco"
fi
if ! grep -q 'EVENTS' "$PORTAL_LISTA"; then
  ok "portal lista: sem literal EVENTS (DB-driven)"
else
  ko "portal lista: ainda usa literal EVENTS"
fi
if grep -q 'Em breve avisaremos os próximos eventos' "$PORTAL_LISTA"; then
  ok "portal lista: estado vazio preservado (EVT-15)"
else
  ko "portal lista: estado vazio ausente"
fi

if grep -q 'buscarEventoPublico' "$PORTAL_DETALHE" \
  && grep -q 'notFound()' "$PORTAL_DETALHE" \
  && grep -q 'SOCIAL.whatsapp' "$PORTAL_DETALHE" \
  && grep -q 'Gostaria de me inscrever no evento' "$PORTAL_DETALHE"; then
  ok "portal detalhe: buscarEventoPublico + notFound + WhatsApp (EVT-13/14)"
else
  ko "portal detalhe incompleto"
fi
if ! grep -q 'function generateStaticParams' "$PORTAL_DETALHE"; then
  ok "portal detalhe: sem generateStaticParams (pagina dinamica, EVT-14)"
else
  ko "portal detalhe: ainda usa generateStaticParams"
fi
if ! grep -q 'EVENTS' "$PORTAL_DETALHE"; then
  ok "portal detalhe: sem literal EVENTS (DB-driven)"
else
  ko "portal detalhe: ainda usa literal EVENTS"
fi

printf '%s\n' '-- constants: NAV_ITEMS preserva Eventos'
if grep -q 'label: "Eventos"' "$CONSTANTS" \
  && grep -q 'href: "/eventos"' "$CONSTANTS"; then
  ok "NAV_ITEMS mantem item Eventos (EVT-16)"
else
  ko "NAV_ITEMS sem item Eventos"
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
JAR_SEC="$(mktemp)"
JAR_LEITOR="$(mktemp)"
JAR_MEMBRO="$(mktemp)"
LEFTOVER_A="$(mktemp)"
LEFTOVER_B="$(mktemp)"
trap '
  # restore seed + best-effort ocultar eventos criados
  curl -s -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/eventos/${SEED_ID}" \
    -H "Content-Type: application/json" -d "{\"visivel\":true,\"status\":\"ATIVO\"}" -o /dev/null 2>/dev/null || true
  if [ -s "$LEFTOVER_A" ]; then
    AID="$(cat "$LEFTOVER_A")"
    curl -s -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/eventos/$AID" \
      -H "Content-Type: application/json" -d "{\"visivel\":false,\"status\":\"INATIVO\"}" -o /dev/null 2>/dev/null || true
  fi
  if [ -s "$LEFTOVER_B" ]; then
    BID="$(cat "$LEFTOVER_B")"
    curl -s -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/eventos/$BID" \
      -H "Content-Type: application/json" -d "{\"visivel\":false,\"status\":\"INATIVO\"}" -o /dev/null 2>/dev/null || true
  fi
  rm -f "$JAR_ADMIN" "$JAR_SEC" "$JAR_LEITOR" "$JAR_MEMBRO" "$LEFTOVER_A" "$LEFTOVER_B"
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
sec_login="$(login_admin "$JAR_SEC" "secretaria.teste@ivc.local")"
leitor_login="$(login_admin "$JAR_LEITOR" "leitor.teste@ivc.local")"
membro_login="$(login_membro "$JAR_MEMBRO" "membro.teste@ivc.local")"

# Clean login asserts (L-007)
for entrada in "admin|${admin_login}|admin.teste" "sec|${sec_login}|secretaria.teste" "leitor|${leitor_login}|leitor.teste"; do
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

check_redirect "/admin/eventos" "307" "$BASE_URL/login/admin"
check_api_status "POST /api/admin/eventos sem sessao" "401" "POST" "/api/admin/eventos"

printf '%s\n' '-- runtime: leitor (FINANCEIRO, eventos=ler) — le, escrita 403'
leitor_page="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_LEITOR" "$BASE_URL/admin/eventos" || true)"
if [ "$leitor_page" = "200" ]; then
  ok "leitor GET /admin/eventos -> 200 (eventos=ler)"
else
  ko "leitor GET /admin/eventos -> $leitor_page (esperado 200)"
fi
check_api_status "leitor GET /api/admin/eventos -> 200 (EVT-07)" "200" "GET" "/api/admin/eventos" "$JAR_LEITOR"
check_api_status "leitor POST /api/admin/eventos -> 403 (EVT-06)" "403" "POST" "/api/admin/eventos" "$JAR_LEITOR" "-H Content-Type:application/json -d {}"
check_api_status "leitor PATCH /api/admin/eventos/seed -> 403 (EVT-06)" "403" "PATCH" "/api/admin/eventos/$SEED_ID" "$JAR_LEITOR" "-H Content-Type:application/json -d {}"

printf '%s\n' '-- runtime: MEMBRO — fail-closed 403 + proxy redirect (MATRIZ-10)'
membro_page="$(curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' -b "$JAR_MEMBRO" "$BASE_URL/admin/eventos" || true)"
membro_page_status="${membro_page%%|*}"
membro_page_target="${membro_page#*|}"
if [ "$membro_page_status" = "307" ] && [ "$membro_page_target" = "$BASE_URL/login/admin" ]; then
  ok "sessao MEMBRO em /admin/eventos -> 307 $BASE_URL/login/admin (proxy AUTH-14)"
else
  ko "sessao MEMBRO em /admin/eventos -> $membro_page_status->$membro_page_target (esperado 307 login/admin)"
fi
check_api_status "MEMBRO POST /api/admin/eventos -> 403 (MATRIZ-10)" "403" "POST" "/api/admin/eventos" "$JAR_MEMBRO" "-H Content-Type:application/json -d {}"

# =====================================================================
# RUNTIME — seed visible no portal (EVT-12)
# =====================================================================
printf '%s\n' '-- runtime: seed Clamor 12h no portal'
portal="$(curl -s "$BASE_URL/eventos" || true)"
if printf '%s' "$portal" | grep -q "$SEED_TITLE" \
  && printf '%s' "$portal" | grep -q "$SEED_DATE"; then
  ok "portal /eventos contem seed ${SEED_TITLE} + data ${SEED_DATE} (EVT-12)"
else
  ko "portal /eventos sem seed ${SEED_TITLE} ou data ${SEED_DATE}"
fi
# Seed detail page: contains WhatsApp button + prefilled message (EVT-13)
seed_detail="$(curl -s -L "$BASE_URL/eventos/$SEED_ID" || true)"
if printf '%s' "$seed_detail" | grep -q 'Inscrever-se via WhatsApp' \
  && printf '%s' "$seed_detail" | grep -q 'wa.me/5583999450781?text=Gostaria%20de%20me%20inscrever'; then
  ok "seed detalhe /eventos/$SEED_ID: WhatsApp preservado (EVT-13)"
else
  ko "seed detalhe: WhatsApp ausente (EVT-13)"
fi

# =====================================================================
# RUNTIME — ADMIN: criar evento A + CRUD + visibilidade
# =====================================================================
printf '%s\n' '-- runtime: CRUD evento A (ADMIN)'
RAND_SUFIXO="$RANDOM$RANDOM"
A_TITLE="Probe Evento ${RAND_SUFIXO}"
A_DATE="2027-06-15"
A_TIME="19:30"
A_LOCATION="Santa Luzia - PB"
A_DESCRIPTION="Descricao do probe evento"

a_out="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/eventos" \
  -H 'Content-Type: application/json' \
  -d "{\"title\":\"$A_TITLE\",\"description\":\"$A_DESCRIPTION\",\"date\":\"$A_DATE\",\"time\":\"$A_TIME\",\"location\":\"$A_LOCATION\"}" || true)"
a_body="${a_out%$'\n'*}"
a_http="${a_out##*$'\n'}"
A_ID="$(printf '%s' "$a_body" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"
if [ "$a_http" = "201" ] && [ -n "$A_ID" ]; then
  ok "ADMIN POST evento A -> 201 (EVT-04)"
  printf '%s' "$A_ID" > "$LEFTOVER_A"
else
  ko "ADMIN POST evento A -> $a_http (esperado 201)"
fi

# --- POST invalido -> 400 com campos discriminados (EVT-05) ---
printf '%s\n' '-- runtime: POST invalido -> 400 campos (EVT-05)'
bad_out="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/eventos" \
  -H 'Content-Type: application/json' \
  -d "{\"title\":\"\",\"date\":\"06/15/2027\",\"time\":\"99:99\",\"location\":\"\",\"visivel\":\"nao\",\"status\":\"ATIVADO\"}" || true)"
bad_http="${bad_out##*$'\n'}"
bad_body="${bad_out%$'\n'*}"
if [ "$bad_http" = "400" ] \
  && printf '%s' "$bad_body" | grep -q 'dados_invalidos' \
  && printf '%s' "$bad_body" | grep -q '"campos"' \
  && printf '%s' "$bad_body" | grep -q '"title"'; then
  ok "POST invalido -> 400 + {error, campos} title (EVT-05)"
else
  ko "POST invalido -> $bad_http sem {error:dados_invalidos, campos} (EVT-05)"
fi

# --- PATCH id inexistente -> 404 (EVT-09) ---
printf '%s\n' '-- runtime: PATCH evento inexistente -> 404 (EVT-09)'
nope_id="99999999-9999-4000-8000-000000000099"
nope_out="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/eventos/$nope_id" \
  -H 'Content-Type: application/json' \
  -d '{"location":"Nao existe"}' || true)"
nope_http="${nope_out##*$'\n'}"
nope_body="${nope_out%$'\n'*}"
if [ "$nope_http" = "404" ] && printf '%s' "$nope_body" | grep -q 'nao_encontrado'; then
  ok "PATCH evento inexistente -> 404 nao_encontrado (EVT-09)"
else
  ko "PATCH evento inexistente -> $nope_http sem nao_encontrado (EVT-09)"
fi

# Edit fields
if [ -n "$A_ID" ]; then
  A_TITLE_EDITED="Probe Editado ${RAND_SUFIXO}"
  patch_a="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/eventos/$A_ID" \
    -H 'Content-Type: application/json' \
    -d "{\"title\":\"$A_TITLE_EDITED\",\"location\":\"Santa Luzia - PB (editada)\"}" || true)"
  patch_a_http="${patch_a##*$'\n'}"
  patch_a_body="${patch_a%$'\n'*}"
  if [ "$patch_a_http" = "200" ] && printf '%s' "$patch_a_body" | grep -q "$A_TITLE_EDITED"; then
    ok "PATCH A campos -> 200 titulo atualizado (EVT-08)"
  else
    ko "PATCH A campos -> $patch_a_http (esperado 200)"
  fi
  # restore title for clean asserts
  curl -s -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/eventos/$A_ID" \
    -H 'Content-Type: application/json' -d "{\"title\":\"$A_TITLE\"}" -o /dev/null 2>/dev/null || true

  # GET list includes A even hidden (admin sees all)
  admin_list="$(curl -s -b "$JAR_ADMIN" "$BASE_URL/api/admin/eventos" || true)"
  if printf '%s' "$admin_list" | grep -q "\"$A_ID\""; then
    ok "GET /api/admin/eventos inclui evento A (EVT-07)"
  else
    ko "GET /api/admin/eventos nao inclui evento A"
  fi
fi

# --- visivel toggle cycle (EVT-11/14) ---
if [ -n "$A_ID" ]; then
  printf '%s\n' '-- runtime: visibilidade A (visivel toggle, EVT-11/14)'
  curl -s -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/eventos/$A_ID" \
    -H 'Content-Type: application/json' -d '{"visivel":false}' -o /dev/null 2>/dev/null || true
  # portal should not contain A
  portal_hidden="$(curl -s "$BASE_URL/eventos" || true)"
  if printf '%s' "$portal_hidden" | grep -q "$A_TITLE"; then
    ko "portal contem A com visivel=false (EVT-11 quebrado)"
  else
    ok "portal NAO contem A com visivel=false (EVT-11)"
  fi
  # detail should 404
  hidden_http="$(curl -s -L -o /dev/null -w '%{http_code}' "$BASE_URL/eventos/$A_ID" || true)"
  if [ "$hidden_http" -ge 400 ]; then
    ok "/eventos/A oculto -> $hidden_http (EVT-14)"
  else
    ko "/eventos/A oculto -> $hidden_http (esperado >=404)"
  fi
  # admin list still shows A
  admin_list_hidden="$(curl -s -b "$JAR_ADMIN" "$BASE_URL/api/admin/eventos" || true)"
  if printf '%s' "$admin_list_hidden" | grep -q "\"$A_ID\""; then
    ok "admin lista contem A oculto (EVT-07)"
  else
    ko "admin lista NAO contem A oculto"
  fi

  # restore visivel=true
  curl -s -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/eventos/$A_ID" \
    -H 'Content-Type: application/json' -d '{"visivel":true}' -o /dev/null 2>/dev/null || true
  portal_visible="$(curl -s "$BASE_URL/eventos" || true)"
  if printf '%s' "$portal_visible" | grep -q "$A_TITLE"; then
    ok "portal contem A com visivel=true (EVT-12)"
  else
    ko "portal NAO contem A com visivel=true"
  fi
  detail_ok="$(curl -s -L -o /dev/null -w '%{http_code}' "$BASE_URL/eventos/$A_ID" || true)"
  if [ "$detail_ok" = "200" ]; then
    ok "/eventos/A visivel -> 200"
  else
    ko "/eventos/A visivel -> $detail_ok (esperado 200)"
  fi
  # WhatsApp on A detail
  detail_a="$(curl -s "$BASE_URL/eventos/$A_ID" || true)"
  if printf '%s' "$detail_a" | grep -q 'Inscrever-se via WhatsApp' \
    && printf '%s' "$detail_a" | grep -q 'wa.me/5583999450781?text=Gostaria%20de%20me%20inscrever'; then
    ok "detalhe A: WhatsApp preservado (EVT-13)"
  else
    ko "detalhe A: WhatsApp ausente (EVT-13)"
  fi

  # --- status INATIVO cycle (EVT-10/14) ---
  printf '%s\n' '-- runtime: soft-delete A (status INATIVO, EVT-10/14)'
  curl -s -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/eventos/$A_ID" \
    -H 'Content-Type: application/json' -d '{"status":"INATIVO"}' -o /dev/null 2>/dev/null || true
  portal_inativo="$(curl -s "$BASE_URL/eventos" || true)"
  if printf '%s' "$portal_inativo" | grep -q "$A_TITLE"; then
    ko "portal contem A com status=INATIVO (EVT-10 quebrado)"
  else
    ok "portal NAO contem A com status=INATIVO (EVT-10)"
  fi
  inactive_http="$(curl -s -L -o /dev/null -w '%{http_code}' "$BASE_URL/eventos/$A_ID" || true)"
  if [ "$inactive_http" -ge 400 ]; then
    ok "/eventos/A INATIVO -> $inactive_http (EVT-14)"
  else
    ko "/eventos/A INATIVO -> $inactive_http (esperado >=404)"
  fi

  # restore ATIVO
  curl -s -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/eventos/$A_ID" \
    -H 'Content-Type: application/json' -d '{"status":"ATIVO"}' -o /dev/null 2>/dev/null || true
fi

# =====================================================================
# RUNTIME — SECRETARIA (escrever): criar B + editar
# =====================================================================
printf '%s\n' '-- runtime: SECRETARIA criar/editar evento B'
B_TITLE="Probe Sec ${RAND_SUFIXO}"
b_out="$(curl -s -w '\n%{http_code}' -b "$JAR_SEC" -X POST "$BASE_URL/api/admin/eventos" \
  -H 'Content-Type: application/json' \
  -d "{\"title\":\"$B_TITLE\",\"date\":\"2027-07-01\",\"time\":\"10:00\",\"location\":\"Santa Luzia - PB\"}" || true)"
b_body="${b_out%$'\n'*}"
b_http="${b_out##*$'\n'}"
B_ID="$(printf '%s' "$b_body" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"
if [ "$b_http" = "201" ] && [ -n "$B_ID" ]; then
  ok "SECRETARIA POST evento B -> 201 (eventos=escrever, EVT-04)"
  printf '%s' "$B_ID" > "$LEFTOVER_B"
else
  ko "SECRETARIA POST evento B -> $b_http (esperado 201)"
fi
if [ -n "$B_ID" ]; then
  b_patch="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_SEC" -X PATCH "$BASE_URL/api/admin/eventos/$B_ID" \
    -H 'Content-Type: application/json' -d '{"location":"Probe Local Editado"}' || true)"
  if [ "$b_patch" = "200" ]; then
    ok "SECRETARIA PATCH B -> 200 (eventos=escrever, EVT-08)"
  else
    ko "SECRETARIA PATCH B -> $b_patch (esperado 200)"
  fi
fi

# =====================================================================
# RUNTIME — empty state (EVT-15): todos eventos ocultos/inativos
# =====================================================================
printf '%s\n' '-- runtime: empty state (EVT-15)'
# hide A, B and seed — all events hidden -> empty state (B foi criado visivel)
[ -n "${A_ID:-}" ] && curl -s -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/eventos/$A_ID" \
  -H 'Content-Type: application/json' -d '{"visivel":false}' -o /dev/null 2>/dev/null || true
if [ -n "${B_ID:-}" ]; then
  curl -s -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/eventos/$B_ID" \
    -H 'Content-Type: application/json' -d '{"visivel":false}' -o /dev/null 2>/dev/null || true
fi
curl -s -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/eventos/$SEED_ID" \
  -H 'Content-Type: application/json' -d '{"status":"INATIVO"}' -o /dev/null 2>/dev/null || true

portal_empty="$(curl -s "$BASE_URL/eventos" || true)"
if printf '%s' "$portal_empty" | grep -q 'Em breve avisaremos os próximos eventos'; then
  ok "portal empty state vazio (EVT-15)"
else
  ko "portal empty state ausente (EVT-15)"
fi
if printf '%s' "$portal_empty" | grep -q "$SEED_DATE"; then
  ko "portal empty state ainda contem data do seed (EVT-15 quebrado)"
else
  ok "portal empty state: sem data do seed"
fi
if [ -n "${A_ID:-}" ] && printf '%s' "$portal_empty" | grep -q "$A_TITLE"; then
  ko "portal empty state ainda contem evento A"
else
  ok "portal empty state: sem evento A"
fi

# restore seed + A + B for clean final state
curl -s -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/eventos/$SEED_ID" \
  -H 'Content-Type: application/json' -d '{"status":"ATIVO","visivel":true}' -o /dev/null 2>/dev/null || true
[ -n "${A_ID:-}" ] && curl -s -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/eventos/$A_ID" \
  -H 'Content-Type: application/json' -d '{"visivel":true}' -o /dev/null 2>/dev/null || true
[ -n "${B_ID:-}" ] && curl -s -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/eventos/$B_ID" \
  -H 'Content-Type: application/json' -d '{"visivel":true,"status":"ATIVO"}' -o /dev/null 2>/dev/null || true

# confirm seed restored
portal_restored="$(curl -s "$BASE_URL/eventos" || true)"
if printf '%s' "$portal_restored" | grep -q "$SEED_TITLE" \
  && printf '%s' "$portal_restored" | grep -q "$SEED_DATE"; then
  ok "seed restaurado: portal contem Clamor 12h apos restore"
else
  ko "seed restaurado: portal NAO contem Clamor 12h"
fi

printf '\nProbes admin-eventos: %d ok, %d falhas\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]