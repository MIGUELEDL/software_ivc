#!/usr/bin/env bash
#
# Probes por AC da feature igrejas/lideranca (RF-023 / IGR-01..25).
# Uso: BASE_URL=<url> bash scripts/probes-admin-lideranca.sh  (default http://localhost:3000)
# Requer o servidor no ar (produção: `npm run build && npm run start -- -p 3000`),
# migrations 0001..0011 aplicadas no dev e seeds sem force_password_change:
# admin.teste (ADMIN), leitor.teste (FINANCEIRO), secretaria.teste (SECRETARIA),
# membro.teste (MEMBRO) — senha `senha-teste` — e superadmin.teste (SUPER_ADMIN,
# 0011) também `senha-teste`.
#
# Discriminação de papel na matriz igrejas (RF-032/L-008):
#   ADMIN (escrever): cria/edita igreja+líder/foto, MAS não deleta igreja (IGR-12);
#   SUPER_ADMIN (administrar): hard-delete em cascata 204 (IGR-11);
#   FINANCEIRO/SECRETARIA (ler): leem 200, escrita 403;
#   MEMBRO: sem linha -> fail-closed 403 (MATRIZ-10).
#
# Re-runnable (L-005): nomes `Probe ... $RANDOM$RANDOM`; create -> act ->
# cleanup (delete 204 via SUPER_ADMIN). TRAP no EXIT tenta remover uma igreja
# deixada por run abortada (best effort).
#
# Estático: greps de 0011 (tabelas, RLS can_access, DELETE SUPER_ADMIN, leaders
# sem DELETE, storage, seeds), service, validação, guards, rotas, páginas, portal.
# Runtime: sessões reais cobrindo os ACs HTTP por papel.
#
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

MIG11="$ROOT/supabase/migrations/0011_igrejas_lideranca.sql"
SERVICE="$ROOT/src/lib/admin/lideranca.ts"
VALIDACAO="$ROOT/src/lib/admin/validacao.ts"
HTTP="$ROOT/src/lib/admin/http.ts"
IGREJAS_ROUTE="$ROOT/src/app/api/admin/igrejas/route.ts"
IGREJA_ID_ROUTE="$ROOT/src/app/api/admin/igrejas/[id]/route.ts"
LIDERES_ROUTE="$ROOT/src/app/api/admin/igrejas/[id]/lideres/route.ts"
LIDER_ID_ROUTE="$ROOT/src/app/api/admin/lideres/[id]/route.ts"
FOTO_ROUTE="$ROOT/src/app/api/admin/lideres/[id]/foto/route.ts"
LISTA="$ROOT/src/app/admin/lideranca/page.tsx"
NOVA_PAGE="$ROOT/src/app/admin/lideranca/nova/page.tsx"
NOVA_FORM="$ROOT/src/app/admin/lideranca/nova/lideranca-nova-form.tsx"
DETALHE="$ROOT/src/app/admin/lideranca/[id]/page.tsx"
EXCLUIR_BOTAO="$ROOT/src/app/admin/lideranca/excluir-igreja-botao.tsx"
PORTAL="$ROOT/src/app/page.tsx"
LEADERSHIP="$ROOT/src/components/Leadership.tsx"
ADMIN_LANDING="$ROOT/src/app/admin/page.tsx"

PASS=0
FAIL=0
ok() { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
ko() { FAIL=$((FAIL + 1)); printf '  FAIL %s\n' "$1"; }

printf '== Probes admin-lideranca (IGR-01..25 / RF-023) — BASE_URL=%s ==\n' "$BASE_URL"

# =====================================================================
# ESTÁTICO — migration 0011 (tabelas, RLS, storage, seeds)
# =====================================================================
printf '%s\n' '-- 0011_igrejas_lideranca.sql (tabelas)'
if grep -q 'create table if not exists public.churches' "$MIG11" \
  && grep -q 'cnpj text not null' "$MIG11" \
  && grep -q 'founded_date date' "$MIG11"; then
  ok "tabela churches com colunas da spec (IGR-01)"
else
  ko "churches ausente/incompleta (IGR-01)"
fi
if grep -q 'create table if not exists public.leaders' "$MIG11" \
  && grep -q "status text not null default 'ATIVO'" "$MIG11" \
  && grep -q "check (status in ('ATIVO', 'INATIVO'))" "$MIG11" \
  && grep -q '"order" int not null default 0' "$MIG11"; then
  ok "tabela leaders: status ATIVO/INATIVO + order default 0 (IGR-13/16)"
else
  ko "leaders ausente/incompleta (IGR-13)"
fi
if grep -q 'references public.churches(id) on delete cascade' "$MIG11"; then
  ok "FK leaders.church_id -> churches on delete cascade (IGR-11/13)"
else
  ko "FK cascade ausente (IGR-13)"
fi
if grep -q 'alter table public.churches enable row level security' "$MIG11" \
  && grep -q 'alter table public.leaders enable row level security' "$MIG11"; then
  ok "RLS habilitada em churches e leaders"
else
  ko "RLS ausente em churches/leaders"
fi

printf '%s\n' '-- 0011: RLS — leitura publica e escrita via can_access (RF-032)'
bloco_policy() { # arquivo nome_policy
  awk -v pol="create policy \"$2\"" '
    index($0, pol) == 1 { on = 1; next }
    on && /^create policy/ { on = 0 }
    on { print }
  ' "$1"
}
probe_policy_access() { # nome_policy tabela modulo nivel comb qtd
  local nome="$1" tabela="$2" modulo="$3" nivel="$4" comb="$5" qtd="$6"
  local bloco n
  bloco="$(bloco_policy "$MIG11" "$nome")"
  if [ -z "$bloco" ]; then
    ko "policy ${nome}: ausente em 0011"
    return
  fi
  if grep -q "drop policy if exists \"${nome}\" on public.${tabela};" "$MIG11"; then
    ok "0011 dropa e recria ${nome}"
  else
    ko "0011 sem drop de ${nome}"
  fi
  # Tolerancia a espacos pos-virgula (0011 usa 'igrejas', 'escrever').
  local er="public\.can_access\\('${modulo}', ?'${nivel}'\\)"
  if [[ "$comb" == *U* ]]; then
    if printf '%s\n' "$bloco" | grep -Eq "using \\(${er}\\)"; then
      ok "policy ${nome}: using can_access('${modulo}','${nivel}')"
    else
      ko "policy ${nome}: sem using can_access('${modulo}','${nivel}')"
    fi
  fi
  if [[ "$comb" == *C* ]]; then
    if printf '%s\n' "$bloco" | grep -Eq "with check \\(${er}\\)"; then
      ok "policy ${nome}: with check can_access('${modulo}','${nivel}')"
    else
      ko "policy ${nome}: sem with check can_access('${modulo}','${nivel}')"
    fi
  fi
  n="$(printf '%s\n' "$bloco" | grep -cE "public\.can_access\\('${modulo}', ?'" || true)"
  if [ "$n" = "$qtd" ]; then
    ok "policy ${nome}: ${qtd} expressoes can_access('${modulo}') exatas"
  else
    ko "policy ${nome}: ${n} expr can_access (esperado ${qtd})"
  fi
}
# Leitura é pública (anon + authenticated, portal/proxy como leitor anon) —
# presente e com using(true), não can_access.
for par in "churches|churches_select_public" "leaders|leaders_select_public"; do
  tabela="${par%%|*}"; nome="${par##*|}"
  bloco="$(bloco_policy "$MIG11" "$nome")"
  if [ -n "$bloco" ] && printf '%s\n' "$bloco" | grep -q 'using (true);' \
    && grep -q "create policy \"${nome}\"" "$MIG11"; then
    ok "policy ${nome}: leitura publica using (true)"
  else
    ko "policy ${nome}: leitura publica ausente/altered (using true)"
  fi
done
probe_policy_access churches_insert_admin churches igrejas escrever C 1
probe_policy_access churches_update_admin churches igrejas escrever UC 2
probe_policy_access leaders_insert_admin leaders igrejas escrever C 1
probe_policy_access leaders_update_admin leaders igrejas escrever UC 2

# IGR-04/12: DELETE de igreja só SUPER_ADMIN (auth_role) — RLS + app.
if grep -q 'create policy "churches_delete_super_admin"' "$MIG11" \
  && grep -q "public.auth_role() = 'SUPER_ADMIN'" "$MIG11"; then
  ok "churches_delete_super_admin: DELETE so SUPER_ADMIN (IGR-04/12)"
else
  ko "churches_delete_super_admin ausente (IGR-04/12)"
fi
# IGR-15: leaders NÃO tem policy de DELETE (soft-delete por status).
if ! grep -q 'create policy "leaders_delete' "$MIG11"; then
  ok "leaders sem policy de DELETE (soft-delete por status, IGR-15)"
else
  ko "leaders com policy de DELETE (IGR-15)"
fi

printf '%s\n' '-- 0011: storage fotos-lideranca'
if grep -q 'insert into storage.buckets' "$MIG11" \
  && grep -q "'fotos-lideranca'" "$MIG11" \
  && grep -q '2097152' "$MIG11" \
  && grep -q "array\['image/jpeg', 'image/png', 'image/webp'\]" "$MIG11"; then
  ok "bucket fotos-lideranca publico 2MB jpeg/png/webp (IGR-20, padrao 0003)"
else
  ko "bucket fotos-lideranca ausente/incompleto"
fi
n_storage="$(grep -cE "public\.can_access\\('igrejas', ?'escrever'\\)" "$MIG11" || true)"
if [ "$n_storage" -ge 7 ]; then
  ok "policies storage/administrativas via can_access('igrejas','escrever') (${n_storage} expr)"
else
  ko "storage policies sem can_access('igrejas','escrever')"
fi
if grep -q 'lideranca_fotos_select' "$MIG11" \
  && grep -q 'for select' "$MIG11"; then
  ok "policy SELECT fotos-lideranca presente (upsert storage requer SELECT)"
else
  ko "policy SELECT fotos-lideranca ausente (upsert quebraria)"
fi

printf '%s\n' '-- 0011: seeds (igreja IVC + lider + superadmin)'
if grep -q 'Igreja Virtude Cristã' "$MIG11" && grep -q "'IVC'" "$MIG11"; then
  ok "seed igreja IVC (dados de constants.ts)"
else
  ko "seed igreja IVC ausente"
fi
if grep -q 'Pastor Ernandes Nogueira de Lucena' "$MIG11" \
  && grep -q "'Pastor Presidente'" "$MIG11" \
  && grep -q '"order"' "$MIG11" \
  && grep -q "'ATIVO'" "$MIG11"; then
  ok "seed lider Pastor Ernandes (role/cargo/ordem, ATIVO)"
else
  ko "seed lider ausente"
fi
if grep -q 'superadmin.teste@ivc.local' "$MIG11" \
  && grep -q "'SUPER_ADMIN'" "$MIG11"; then
  ok "seed superadmin.teste com role SUPER_ADMIN"
else
  ko "seed superadmin.teste ausente/incompleto"
fi
if [ "$(grep -c 'on conflict (id) do nothing' "$MIG11" || true)" -ge 3 ]; then
  ok "seeds idempotentes (on conflict do nothing)"
else
  ko "seeds sem idempotencia"
fi
if ! grep -q '"force_password_change": true' "$MIG11"; then
  ok "nenhum seed com force_password_change (probes nao travam)"
else
  ko "seed com force_password_change"
fi

# =====================================================================
# ESTÁTICO — service layer + validação
# =====================================================================
printf '%s\n' '-- src/lib/admin/lideranca.ts (service)'
for fn in listarIgrejas criarIgreja atualizarIgreja excluirIgreja \
  listarLideres listarLideresAtivos criarLider atualizarLider subirFotoLider; do
  if grep -q "export async function $fn" "$SERVICE"; then
    ok "service: $fn presente"
  else
    ko "service: $fn ausente"
  fi
done
if grep -q '.eq("status", "ATIVO")' "$SERVICE" \
  && grep -q '.order("order", { ascending: true })' "$SERVICE"; then
  ok "listarLideresAtivos filtra ATIVO e ordena por order (IGR-22)"
else
  ko "listarLideresAtivos sem filtro/ordem"
fi
if grep -q 'status: "ATIVO"' "$SERVICE"; then
  ok "criarLider nasce ATIVO (IGR-16)"
else
  ko "criarLider sem ATIVO default (IGR-16)"
fi
if grep -q 'excluirIgreja' "$SERVICE" && grep -q 'IgrejaNaoEncontradaError' "$SERVICE"; then
  ok "excluirIgreja com 404 de dominio (IGR-10/11)"
else
  ko "excluirIgreja/404 ausentes"
fi
if grep -q '"fotos-lideranca"' "$SERVICE" \
  && grep -q 'upsert: true' "$SERVICE" \
  && grep -q 'getPublicUrl' "$SERVICE" \
  && grep -q '.update({ photo_url' "$SERVICE"; then
  ok "subirFotoLider: upload upsert + publicUrl persistida em photo_url (IGR-20/25)"
else
  ko "subirFotoLider incompleto"
fi
if grep -q 'validarFoto(file)' "$SERVICE" \
  && grep -q 'FotoTipoInvalidoError' "$SERVICE" \
  && grep -q 'FotoTamanhoInvalidoError' "$SERVICE"; then
  ok "subirFotoLider valida tipo/tamanho via validarFoto (IGR-21)"
else
  ko "validacao de foto no service ausente"
fi
printf '%s\n' '-- src/lib/admin/validacao.ts (CNPJ + foto)'
if grep -q 'export function validarCnpj' "$VALIDACAO" \
  && grep -Fq '/^\d{14}$/' "$VALIDACAO"; then
  ok "validarCnpj: 14 digitos numericos (IGR-06)"
else
  ko "validarCnpj ausente"
fi
if grep -q 'export function validarFoto' "$VALIDACAO" \
  && grep -q 'FOTO_MAX_BYTES = 2 \* 1024 \* 1024' "$VALIDACAO"; then
  ok "validarFoto: mime jpeg/png/webp + limite 2MB (IGR-21)"
else
  ko "validarFoto ausente/incompleto"
fi

# =====================================================================
# ESTÁTICO — route handlers (guardas e status codes)
# =====================================================================
printf '%s\n' '-- rotas /api/admin/igrejas* e /api/admin/lideres*'
if grep -q 'requireEscrita("igrejas")' "$IGREJAS_ROUTE" \
  && grep -q 'status: 201' "$IGREJAS_ROUTE" \
  && grep -q 'erroCampos(campos)' "$IGREJAS_ROUTE"; then
  ok "POST igrejas: guard igrejas/escrever + 201 + 400 por campo (IGR-05/06/07)"
else
  ko "POST igrejas incompleto"
fi
if grep -q 'authAdmin("igrejas")' "$IGREJAS_ROUTE" && grep -q 'listarIgrejas()' "$IGREJAS_ROUTE"; then
  ok "GET igrejas: guard leitura + lista created_at asc (IGR-08)"
else
  ko "GET igrejas incompleto (IGR-08)"
fi
if grep -q 'requireEscrita("igrejas")' "$IGREJA_ID_ROUTE" \
  && grep -q 'IgrejaNaoEncontradaError' "$IGREJA_ID_ROUTE" \
  && grep -q 'igreja_nao_encontrada' "$IGREJA_ID_ROUTE"; then
  ok "PATCH [id] igreja: guard escrita + 404 inexistente (IGR-09/10)"
else
  ko "PATCH igreja incompleto"
fi
if grep -q 'authAdmin("igrejas")' "$IGREJA_ID_ROUTE" \
  && grep -q 'auth.role !== "SUPER_ADMIN"' "$IGREJA_ID_ROUTE" \
  && grep -q 'nao_autorizado' "$IGREJA_ID_ROUTE" \
  && grep -q 'status: 204' "$IGREJA_ID_ROUTE"; then
  ok "DELETE [id] igreja: guard leitura + SUPER_ADMIN explicito no app (IGR-12)"
else
  ko "DELETE igreja sem checagem SUPER_ADMIN explicita (IGR-12)"
fi
if grep -q 'requireEscrita("igrejas")' "$LIDERES_ROUTE" \
  && grep -q 'status: 201' "$LIDERES_ROUTE" \
  && grep -q 'igreja_nao_encontrada' "$LIDERES_ROUTE"; then
  ok "POST lideres: guard + 201 ATIVO default + 404 igreja (IGR-16/17)"
else
  ko "POST lideres incompleto"
fi
if grep -q 'requireEscrita("igrejas")' "$LIDER_ID_ROUTE" \
  && grep -q 'dados.status' "$LIDER_ID_ROUTE" \
  && grep -q 'lider_nao_encontrado' "$LIDER_ID_ROUTE"; then
  ok "PATCH lider: guard + status soft-delete + 404 (IGR-18/19)"
else
  ko "PATCH lider incompleto"
fi
if grep -q 'requireEscrita("igrejas")' "$FOTO_ROUTE" \
  && grep -q 'foto_tipo_invalido' "$FOTO_ROUTE" \
  && grep -q 'status: 413' "$FOTO_ROUTE"; then
  ok "POST foto: guard + 400 tipo + 413 tamanho (IGR-20/21)"
else
  ko "POST foto incompleto"
fi

# =====================================================================
# ESTÁTICO — páginas admin e RBAC de UI
# =====================================================================
printf '%s\n' '-- páginas /admin/lideranca*'
if grep -q 'await can(claims?.role ?? "", "igrejas", "ler")' "$LISTA" \
  && grep -q 'Nenhuma igreja cadastrada' "$LISTA"; then
  ok "lista: guard leitura + estado vazio (IGR-08)"
else
  ko "lista incompleta"
fi
if grep -q '"igrejas", "escrever"' "$LISTA" \
  && grep -q 'href="/admin/lideranca/nova"' "$LISTA"; then
  ok "lista: link Nova igreja so para escritor (RBAC UI)"
else
  ko "RBAC de UI na lista ausente"
fi
if grep -q 'superAdmin' "$LISTA" && grep -q '<ExcluirIgrejaBotao' "$LISTA"; then
  ok "lista: botao excluir so SUPER_ADMIN (IGR-12 UI)"
else
  ko "botao excluir nao restrito a SUPER_ADMIN"
fi
if grep -q '"igrejas", "escrever"' "$NOVA_PAGE" \
  && grep -q 'fetch("/api/admin/igrejas"' "$NOVA_FORM"; then
  ok "nova: pagina server guarda escrita + form POST"
else
  ko "nova page/form incompleto"
fi
if grep -q 'listarLideres(id)' "$DETALHE" \
  && grep -q '"igrejas", "escrever"' "$DETALHE" \
  && grep -q 'superAdmin' "$DETALHE"; then
  ok "detalhe: le igreja+lideres, guard escrita, delete so SUPER_ADMIN"
else
  ko "detalhe incompleto"
fi
if grep -q 'redirecionar' "$EXCLUIR_BOTAO" && grep -q 'window.confirm' "$EXCLUIR_BOTAO"; then
  ok "excluir botao: confirma client + redirect pos-delete"
else
  ko "excluir botao incompleto"
fi
if grep -q 'href="/admin/lideranca"' "$ADMIN_LANDING"; then
  ok "landing admin lista Igrejas & Lideranca (navegacao)"
else
  ko "link do modulo ausente no landing"
fi

# =====================================================================
# ESTÁTICO — portal (Leadership DB-driven, HOME-04/HOME-08, IGR-22/23/24)
# =====================================================================
printf '%s\n' '-- portal: Leadership.tsx / page.tsx'
if grep -q 'listarLideresAtivos()' "$PORTAL" && grep -q 'listarIgrejas()' "$PORTAL"; then
  ok "page.tsx async RSC busca lideres ATIVO + primeira igreja (IGR-22)"
else
  ko "page.tsx nao busca do banco (IGR-22)"
fi
if grep -q 'id="lideranca"' "$LEADERSHIP"; then
  ok "Leadership preserva ancora #lideranca (HOME-04, IGR-24)"
else
  ko "ancora #lideranca removida (IGR-24)"
fi
if ! grep -q 'CHURCH.leader' "$LEADERSHIP"; then
  ok "Leadership sem literal CHURCH.leader (DB-driven)"
else
  ko "Leadership ainda usa literal CHURCH.leader"
fi
if grep -q 'leaders.length === 0' "$LEADERSHIP" && grep -q 'Em breve' "$LEADERSHIP"; then
  ok "estado vazio sem lideres ATIVO (IGR-23)"
else
  ko "estado vazio ausente (IGR-23)"
fi
if grep -q '.map((lider)' "$LEADERSHIP" \
  && grep -q 'lider.photo_url' "$LEADERSHIP" \
  && grep -q 'lider.role' "$LEADERSHIP"; then
  ok "Leadership renderiza foto/nome/cargo por lider (IGR-22)"
else
  ko "renderizacao de lider incompleta"
fi

# =====================================================================
# RUNTIME — sessões reais por papel (L-008)
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
JAR_SUPER="$(mktemp)"
JAR_LEITOR="$(mktemp)"
JAR_SEC="$(mktemp)"
JAR_MEMBRO="$(mktemp)"
LEFTOVER="$(mktemp)"
FOTO_OK="$(mktemp --suffix=.png)"
FOTO_TXT="$(mktemp --suffix=.txt)"
FOTO_GRANDE="$(mktemp --suffix=.png)"
trap 'if [ -s "$LEFTOVER" ]; then idi="$(cat "$LEFTOVER")"; curl -s -b "$JAR_SUPER" -X DELETE "$BASE_URL/api/admin/igrejas/$idi" -o /dev/null 2>/dev/null || true; fi; rm -f "$JAR_ADMIN" "$JAR_SUPER" "$JAR_LEITOR" "$JAR_SEC" "$JAR_MEMBRO" "$LEFTOVER" "$FOTO_OK" "$FOTO_TXT" "$FOTO_GRANDE"' EXIT

# Mini PNG 1x1 valido (upload correto: content-type image/png dentro do limite).
printf 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' | base64 -d > "$FOTO_OK" 2>/dev/null || printf '\x89PNG\r\n\x1a\n' > "$FOTO_OK"
printf 'nao sou imagem' > "$FOTO_TXT"
head -c 3000000 /dev/zero > "$FOTO_GRANDE"

login_admin() { # jar email -> status|redirect
  curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' -c "$1" -X POST "$BASE_URL/api/auth/login/admin" \
    --data-urlencode "email=$2" --data-urlencode "password=senha-teste" || true
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
check_api_status() { # nome, esperado, metodo, caminho, [jar], [extra curl args...]
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

check_redirect "/admin/lideranca" "307" "$BASE_URL/login/admin"
check_api_status "POST /api/admin/igrejas sem sessao" "401" "POST" "/api/admin/igrejas"

admin_login="$(login_admin "$JAR_ADMIN" "admin.teste@ivc.local")"
super_login="$(login_admin "$JAR_SUPER" "superadmin.teste@ivc.local")"
leitor_login="$(login_admin "$JAR_LEITOR" "leitor.teste@ivc.local")"
sec_login="$(login_admin "$JAR_SEC" "secretaria.teste@ivc.local")"

for entrada in "admin|${admin_login}|admin.teste" "super|${super_login}|superadmin.teste" "leitor|${leitor_login}|leitor.teste" "sec|${sec_login}|secretaria.teste"; do
  resto="${entrada#*|}"
  status="${resto%%|*}"
  rotulo_email="${resto#*|}"
  target="${rotulo_email%%|*}"
  email="${rotulo_email#*|}"
  if [ "$status" = "307" ] && [ "$target" = "$BASE_URL/admin" ]; then
    ok "login ${email} -> 307 $BASE_URL/admin (sessao real ${rotulo_email%%|*})"
  else
    ko "login ${email} -> $status->$target (esperado 307->$BASE_URL/admin)"
  fi
done

printf '%s\n' '-- runtime: leitor de igrejas (FINANCEIRO/SECRETARIA) le, escrita 403'
for entrar in "leitor.teste;$JAR_LEITOR" "secretaria.teste;$JAR_SEC"; do
  email="${entrar%%;*}"
  jar="${entrar##*;}"
  leitura="$(curl -s -o /dev/null -w '%{http_code}' -b "$jar" "$BASE_URL/admin/lideranca" || true)"
  if [ "$leitura" = "200" ]; then
    ok "${email} le /admin/lideranca -> 200 (matriz igrejas=ler)"
  else
    ko "${email} le /admin/lideranca -> $leitura (esperado 200)"
  fi
done
check_api_status "leitor GET /api/admin/igrejas -> 200 (IGR-08)" "200" "GET" "/api/admin/igrejas" "$JAR_LEITOR"
check_api_status "leitor POST igrejas -> 403 (IGR-07)" "403" "POST" "/api/admin/igrejas" "$JAR_LEITOR" "-H Content-Type:application/json -d {}"
check_api_status "SECRETARIA PATCH lider -> 403 (igrejas=ler)" "403" "PATCH" "/api/admin/lideres/00000000-0000-4000-8000-0000000000ff" "$JAR_SEC" "-H Content-Type:application/json -d {}"
check_api_status "leitor DELETE igreja -> 403" "403" "DELETE" "/api/admin/igrejas/00000000-0000-4000-8000-0000000000ff" "$JAR_LEITOR"

printf '%s\n' '-- runtime: sessao MEMBRO (fail-closed MATRIZ-10)'
membro_login="$(curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' -c "$JAR_MEMBRO" \
  -X POST "$BASE_URL/api/auth/login" --data-urlencode 'email=membro.teste@ivc.local' \
  --data-urlencode 'password=senha-teste' || true)"
membro_status="${membro_login%%|*}"
membro_target="${membro_login#*|}"
if [ "$membro_status" = "307" ] && [ "$membro_target" = "$BASE_URL/painel" ]; then
  ok "login membro.teste -> 307 $BASE_URL/painel"
else
  ko "login membro.teste -> $membro_login (esperado 307 $BASE_URL/painel)"
fi
membro_admin="$(curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' -b "$JAR_MEMBRO" "$BASE_URL/admin/lideranca" || true)"
if [ "${membro_admin%%|*}" = "307" ] && [ "${membro_admin#*|}" = "$BASE_URL/login/admin" ]; then
  ok "sessao MEMBRO em /admin/lideranca -> 307 $BASE_URL/login/admin (proxy AUTH-14)"
else
  ko "sessao MEMBRO em /admin/lideranca -> $membro_admin (esperado 307 login/admin)"
fi
check_api_status "MEMBRO POST igrejas -> 403 (sem linha, MATRIZ-10)" "403" "POST" "/api/admin/igrejas" "$JAR_MEMBRO" "-H Content-Type:application/json -d {}"

# ---------------------------------------------------------------
printf '%s\n' '-- runtime: CRUD igreja + lideres + foto (ADMIN, escritor)'
RAND_SUFIXO="$RANDOM$RANDOM"
IGREJA_NOME="Probe Igreja ${RAND_SUFIXO}"

igreja_out="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/igrejas" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"$IGREJA_NOME\",\"short_name\":\"PROBE$RAND_SUFIXO\",\"cnpj\":\"12345678000199\",\"address\":\"Rua dos Probes, 1 - Centro\",\"city\":\"Santa Luzia - PB\",\"founded_date\":\"2025-01-01\"}" || true)"
igreja_body="${igreja_out%$'\n'*}"
igreja_http="${igreja_out##*$'\n'}"
IGREJA_ID="$(printf '%s' "$igreja_body" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"
if [ "$igreja_http" = "201" ] && [ -n "$IGREJA_ID" ]; then
  ok "ADMIN POST igreja valida -> 201 (IGR-05)"
  printf '%s' "$IGREJA_ID" > "$LEFTOVER"
else
  ko "ADMIN POST igreja -> $igreja_http (esperado 201)"
fi

if [ -n "$IGREJA_ID" ]; then
  invalida_out="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/igrejas" \
    -H 'Content-Type: application/json' \
    -d '{"name":"","short_name":"","cnpj":"12","address":"","city":""}' || true)"
  invalida_http="${invalida_out##*$'\n'}"
  invalida_body="${invalida_out%$'\n'*}"
  if [ "$invalida_http" = "400" ] && printf '%s' "$invalida_body" | grep -q '"campos"'; then
    ok "ADMIN POST igreja invalida -> 400 com mapeamento por campo (IGR-06)"
  else
    ko "ADMIN POST igreja invalida -> $invalida_http (esperado 400 campos)"
  fi

  patch_igreja_out="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/igrejas/$IGREJA_ID" \
    -H 'Content-Type: application/json' \
    -d '{"city":"Santa Luzia - PB (editada)"}' || true)"
  patch_igreja_http="${patch_igreja_out##*$'\n'}"
  if [ "$patch_igreja_http" = "200" ]; then
    ok "PATCH igreja valido -> 200 (IGR-09)"
  else
    ko "PATCH igreja valido -> $patch_igreja_http (esperado 200 IGR-09)"
  fi
  check_api_status "PATCH igreja inexistente -> 404 (IGR-10)" "404" "PATCH" "/api/admin/igrejas/00000000-0000-4000-8000-0000000000ff" "$JAR_ADMIN" "-H Content-Type:application/json -d {\"city\":\"X\"}"
  check_api_status "DELETE igreja por ADMIN -> 403 (IGR-12)" "403" "DELETE" "/api/admin/igrejas/$IGREJA_ID" "$JAR_ADMIN"

  LID_NOME="Probe Lideranca ${RAND_SUFIXO}"
  lider_out="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/igrejas/$IGREJA_ID/lideres" \
    -H 'Content-Type: application/json' \
    -d "{\"name\":\"$LID_NOME\",\"role\":\"Probe Cargo\",\"order\":1}" || true)"
  lider_body="${lider_out%$'\n'*}"
  lider_http="${lider_out##*$'\n'}"
  LIDER_ID="$(printf '%s' "$lider_body" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"
  if [ "$lider_http" = "201" ] && [ -n "$LIDER_ID" ]; then
    ok "ADMIN POST lider -> 201 (ATIVO default, IGR-16)"
  else
    ko "ADMIN POST lider -> $lider_http (esperado 201 IGR-16)"
  fi

  if [ -n "$LIDER_ID" ]; then
    lider_inv="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/igrejas/$IGREJA_ID/lideres" \
      -H 'Content-Type: application/json' -d '{"name":"","role":""}' || true)"
    if [ "$lider_inv" = "400" ]; then
      ok "POST lider invalido -> 400 por campo"
    else
      ko "POST lider invalido -> $lider_inv (esperado 400)"
    fi
    check_api_status "POST lider igreja inexistente -> 404 (IGR-17)" "404" "POST" "/api/admin/igrejas/00000000-0000-4000-8000-0000000000ff/lideres" "$JAR_ADMIN" "-H Content-Type:application/json -d {\"name\":\"X\",\"role\":\"Y\"}"
    check_api_status "PATCH lider inexistente -> 404" "404" "PATCH" "/api/admin/lideres/00000000-0000-4000-8000-0000000000ff" "$JAR_ADMIN" "-H Content-Type:application/json -d {\"role\":\"X\"}"

    patch_lider="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/lideres/$LIDER_ID" \
      -H 'Content-Type: application/json' \
      -d '{"role":"Probe Cargo Editado","order":2}' || true)"
    patch_lider_body="${patch_lider%$'\n'*}"
    patch_lider_http="${patch_lider##*$'\n'}"
    if [ "$patch_lider_http" = "200" ] && printf '%s' "$patch_lider_body" | grep -q 'Probe Cargo Editado'; then
      ok "ADMIN PATCH lider -> 200 campos atualizados (IGR-18)"
    else
      ko "ADMIN PATCH lider -> $patch_lider_http (esperado 200)"
    fi
    check_api_status "PATCH status invalido -> 400" "400" "PATCH" "/api/admin/lideres/$LIDER_ID" "$JAR_ADMIN" "-H Content-Type:application/json -d {\"status\":\"X\"}"

    # Foto: upload ok -> 200 photo_url; rejeicoes tipo (400) e tamanho (413).
    foto_out="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/lideres/$LIDER_ID/foto" \
      -F "foto=@$FOTO_OK;type=image/png" || true)"
    foto_http="${foto_out##*$'\n'}"
    foto_body="${foto_out%$'\n'*}"
    FOTO_URL="$(printf '%s' "$foto_body" | sed -n 's/.*"photo_url":"\([^"]*\)".*/\1/p')"
    if [ "$foto_http" = "200" ] && [ -n "$FOTO_URL" ]; then
      ok "ADMIN POST foto -> 200 com photo_url (IGR-20)"
    else
      ko "ADMIN POST foto -> $foto_http (esperado 200 IGR-20)"
    fi
    foto_txt_http="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/lideres/$LIDER_ID/foto" \
      -F "foto=@$FOTO_TXT;type=text/plain" || true)"
    if [ "$foto_txt_http" = "400" ]; then
      ok "POST foto texto -> 400 tipo (IGR-21)"
    else
      ko "POST foto texto -> $foto_txt_http (esperado 400 IGR-21)"
    fi
    foto_gra_http="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/lideres/$LIDER_ID/foto" \
      -F "foto=@$FOTO_GRANDE;type=image/png" || true)"
    if [ "$foto_gra_http" = "413" ]; then
      ok "POST foto>2MB -> 413 tamanho (IGR-21)"
    else
      ko "POST foto>2MB -> $foto_gra_http (esperado 413 IGR-21)"
    fi

    # Portal (IGR-19/22/23): home contém o líder ATIVO e NÃO quando INATIVO.
    printf '%s\n' '-- runtime: portal reflete status do lider (IGR-19/22/23)'
    home_ativo="$(curl -s "$BASE_URL/" || true)"
    if printf '%s' "$home_ativo" | grep -q "$LID_NOME"; then
      ok "portal home contem lider ATIVO (IGR-22)"
    else
      ko "portal home NAO contem lider ATIVO (IGR-22)"
    fi

    status_inativo="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/lideres/$LIDER_ID" \
      -H 'Content-Type: application/json' -d '{"status":"INATIVO"}' || true)"
    if [ "$status_inativo" = "200" ]; then
      ok "PATCH status INATIVO -> 200 (soft-delete IGR-19)"
    else
      ko "PATCH status INATIVO -> $status_inativo (esperado 200)"
    fi
    home_inativo="$(curl -s "$BASE_URL/" || true)"
    if printf '%s' "$home_inativo" | grep -q "$LID_NOME"; then
      ko "portal home ainda contem lider INATIVO (IGR-19 quebrado)"
    else
      ok "portal home NAO contem lider INATIVO (IGR-19)"
    fi

    status_ativo_2="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/lideres/$LIDER_ID" \
      -H 'Content-Type: application/json' -d '{"status":"ATIVO"}' || true)"
    if [ "$status_ativo_2" = "200" ]; then
      ok "PATCH status ATIVO -> 200 (reativacao)"
    else
      ko "PATCH status ATIVO -> $status_ativo_2 (esperado 200)"
    fi

    # Detalhe (RSC) mostra o lider e a foto persistida (photo_url em leaders).
    detalhe="$(curl -s -b "$JAR_ADMIN" "$BASE_URL/admin/lideranca/$IGREJA_ID" || true)"
    if printf '%s' "$detalhe" | grep -q "$LID_NOME" \
      && printf '%s' "$detalhe" | grep -q 'fotos-lideranca'; then
      ok "detalhe RSC exibe lider + foto persistida (IGR-25)"
    else
      ko "detalhe RSC sem lider/foto persistida (IGR-25)"
    fi

    # Catastrofe: hard-delete em cascata so SUPER_ADMIN (204) e fundo 404.
    printf '%s\n' '-- runtime: delete igreja SUPER_ADMIN -> 204 (cascata IGR-11)'
    sec_delete="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_SEC" -X DELETE "$BASE_URL/api/admin/igrejas/$IGREJA_ID" || true)"
    if [ "$sec_delete" = "403" ]; then
      ok "SECRETARIA DELETE igreja real -> 403 (igrejas=ler)"
    else
      ko "SECRETARIA DELETE igreja real -> $sec_delete (esperado 403)"
    fi
    super_delete="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_SUPER" -X DELETE "$BASE_URL/api/admin/igrejas/$IGREJA_ID" || true)"
    if [ "$super_delete" = "204" ]; then
      ok "SUPER_ADMIN DELETE igreja -> 204 (cascata, IGR-11)"
      : > "$LEFTOVER"
    else
      ko "SUPER_ADMIN DELETE igreja -> $super_delete (esperado 204)"
    fi
    igreja_apos="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" "$BASE_URL/admin/lideranca/$IGREJA_ID" || true)"
    if [ "$igreja_apos" = "404" ]; then
      ok "igreja removida -> detalhe 404"
    else
      ko "igreja apos delete -> $igreja_apos (esperado 404)"
    fi
  fi
fi

printf '\nProbes admin-lideranca: %d ok, %d falhas\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]