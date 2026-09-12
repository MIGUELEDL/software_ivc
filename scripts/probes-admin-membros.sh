#!/usr/bin/env bash
#
# Probes por AC da feature admin-membros (RF-022 / ADMINMEM-01..39).
# Uso: BASE_URL=<url> bash scripts/probes-admin-membros.sh  (default http://localhost:3000)
# Requer o servidor no ar (produção: `npm run build && npm run start -- -p 3000`)
# e as migrações 0006/0007 aplicadas no dev (usuários admin.teste/leitor.teste,
# senha `senha-teste`, role ADMIN/FINANCEIRO — sem force_password_change).
#
# Re-runnable (L-005): emails `probe<rand>@teste.com` com $RANDOM; ordem
# create -> act -> cleanup (hard-delete do criado no fim). Trap no EXIT tenta
# remover um id deixado por run abortada (best effort, silencioso).
#
# Estático: greps de 0006/0007, lib/service, guards, rotas, páginas e forms.
# Runtime: sessões reais (escritor vs leitor) cobrindo os ACs HTTP.
#
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

MIG06="$ROOT/supabase/migrations/0006_admin_membros.sql"
MIG07="$ROOT/supabase/migrations/0007_seed_admin.sql"
MEMBERS_LIB="$ROOT/src/lib/admin/membros.ts"
SUPABASE_ADMIN="$ROOT/src/lib/supabase/admin.ts"
RBAC="$ROOT/src/lib/auth/rbac.ts"
HTTP="$ROOT/src/lib/admin/http.ts"
CREATE_ROUTE="$ROOT/src/app/api/admin/membros/route.ts"
DADOS_ROUTE="$ROOT/src/app/api/admin/membros/[id]/dados/route.ts"
STATUS_ROUTE="$ROOT/src/app/api/admin/membros/[id]/status/route.ts"
HARD_DELETE_ROUTE="$ROOT/src/app/api/admin/membros/[id]/route.ts"
DOCS_ROUTE="$ROOT/src/app/api/admin/membros/[id]/documentos/route.ts"
DOC_DELETE_ROUTE="$ROOT/src/app/api/admin/membros/[id]/documentos/[docId]/route.ts"
LISTA="$ROOT/src/app/admin/membros/page.tsx"
NOVO_PAGE="$ROOT/src/app/admin/membros/novo/page.tsx"
NOVO_FORM="$ROOT/src/app/admin/membros/novo/membro-novo-form.tsx"
DETALHE="$ROOT/src/app/admin/membros/[id]/page.tsx"
DETALHE_ACOES="$ROOT/src/app/admin/membros/[id]/membro-detalhe-acoes.tsx"
CARTAO="$ROOT/src/app/admin/membros/[id]/cartao/page.tsx"
MEMBER_CARD="$ROOT/src/components/MemberCard.tsx"
PAINEL_CARTAO="$ROOT/src/app/painel/cartao/page.tsx"
ADMIN_LANDING="$ROOT/src/app/admin/page.tsx"

PASS=0
FAIL=0
ok() { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
ko() { FAIL=$((FAIL + 1)); printf '  FAIL %s\n' "$1"; }

# F1 (M4b): asserta a lista de papeis EXATA de cada policy RLS (0006). Só casam
# linhas que SÃO a expressão `using (public.auth_role() in ...` / `with check
# (...)` dentro do bloco da policy (início em coluna 0) — comentários nunca
# contam. Exige a lista completa + o nº de expressões esperado (update tem
# using E with check). Se um papel for removido/adicionado/trocado, o grep
# falha -> o probe mata a mutacao.
check_policy_roles() { # nome_policy, lista_esperada, qtd_expressoes
  local nome="$1" esperado="$2" qtd="${3:-1}" bloco n
  bloco="$(awk -v pol="create policy \"${nome}\"" '
    index($0, pol) == 1 { on = 1; next }
    on && /^create policy/ { on = 0 }
    on && ($0 ~ /^[[:space:]]*using \(public\.auth_role\(\) in/ || $0 ~ /^[[:space:]]*with check \(public\.auth_role\(\) in/) { print }
  ' "$MIG06")"
  n="$(printf '%s\n' "$bloco" | grep -cE '^[[:space:]]*(using|with check) \(public\.auth_role\(\) in' || true)"
  if [ "$n" = "$qtd" ] && printf '%s' "$bloco" | grep -Fq "$esperado"; then
    ok "policy ${nome}: lista de papeis exata (M4b)"
  else
    ko "policy ${nome}: papeis divergentes (esperado ${esperado} em ${qtd} expressao(oes), achou ${n})"
  fi
}

printf '== Probes admin-membros (ADMINMEM-01..39) — BASE_URL=%s ==\n' "$BASE_URL"

# =====================================================================
# ESTÁTICO — migrations 0006/0007 (schema, RLS, seed)
# =====================================================================
printf '%s\n' '-- 0006_admin_membros.sql (schema + RLS)'
if grep -q 'add column if not exists status text not null default .ATIVO.' "$MIG06"; then
  ok "members ganha coluna status (default ATIVO)"
else
  ko "members sem coluna status default ATIVO"
fi
if grep -q "status in ('ATIVO','INATIVO','TRANSFERIDO')" "$MIG06"; then
  ok "check de status com os 3 valores"
else
  ko "check de status ausente/incompleto"
fi
for col in logradouro numero bairro cidade uf cep; do
  if grep -q "add column if not exists $col text" "$MIG06"; then
    ok "coluna de endereco $col presente"
  else
    ko "coluna de endereco $col ausente"
  fi
done
if grep -q 'create table if not exists public.member_documents' "$MIG06"; then
  ok "tabela member_documents criada"
else
  ko "member_documents ausente"
fi
if grep -q 'references public.members(id) on delete cascade' "$MIG06"; then
  ok "FK member_documents -> members com on delete cascade"
else
  ko "FK cascade ausente"
fi
if grep -q "tipo in ('RG','CPF','comprovante_endereco','outro')" "$MIG06"; then
  ok "check de tipo de documento (4 valores)"
else
  ko "check de tipo ausente"
fi
if grep -q 'create or replace function public.auth_role()' "$MIG06" && grep -q 'security definer' "$MIG06"; then
  ok "funcao auth_role() security definer"
else
  ko "auth_role() ausente ou sem security definer"
fi
if grep -q 'create policy "members_select_admin"' "$MIG06" \
  && grep -q 'create policy "members_insert_admin"' "$MIG06" \
  && grep -q 'create policy "members_update_admin"' "$MIG06" \
  && grep -q 'create policy "members_delete_admin"' "$MIG06"; then
  ok "4 policies em members (select/insert/update/delete)"
else
  ko "policies de members incompletas"
fi
if grep -q 'create policy "docs_select_admin"' "$MIG06" \
  && grep -q 'create policy "docs_insert_admin"' "$MIG06" \
  && grep -q 'create policy "docs_delete_admin"' "$MIG06"; then
  ok "3 policies em member_documents (select/insert/delete)"
else
  ko "policies de documents incompletas"
fi
if grep -q "members_delete_admin" "$MIG06" && grep -q "'ADMIN','SUPER_ADMIN'" "$MIG06"; then
  ok "delete de members restrito a ADMIN/SUPER_ADMIN"
else
  ko "delete admin nao restrito a ADMIN/SUPER_ADMIN"
fi

# F1 (M4b): lista exata de papeis POR policy — um grep fraco sozinho deixa
# passar remover FINANCEIRO (etc.) de uma policy. Os asserts abaixo exigem a
# expressao USING/WITH CHECK inteira, no bloco certo, com a lista completa.
check_policy_roles members_select_admin "('SECRETARIA','LIDER','FINANCEIRO','PATRIMONIAL','ADMIN','SUPER_ADMIN')" 1
check_policy_roles members_insert_admin "('SECRETARIA','ADMIN','SUPER_ADMIN')" 1
check_policy_roles members_update_admin "('SECRETARIA','ADMIN','SUPER_ADMIN')" 2
check_policy_roles members_delete_admin "('ADMIN','SUPER_ADMIN')" 1
check_policy_roles docs_select_admin "('SECRETARIA','LIDER','FINANCEIRO','PATRIMONIAL','ADMIN','SUPER_ADMIN')" 1
check_policy_roles docs_insert_admin "('SECRETARIA','ADMIN','SUPER_ADMIN')" 1
check_policy_roles docs_delete_admin "('SECRETARIA','ADMIN','SUPER_ADMIN')" 1

printf '%s\n' '-- 0007_seed_admin.sql (seed de teste)'
if grep -q 'admin.teste@ivc.local' "$MIG07" && grep -q 'leitor.teste@ivc.local' "$MIG07"; then
  ok "seed contem admin.teste e leitor.teste"
else
  ko "emails do seed ausentes"
fi
if grep -q "'role', 'ADMIN'" "$MIG07" && grep -q "'role', 'FINANCEIRO'" "$MIG07"; then
  ok "raw_app_meta_data com role ADMIN/FINANCEIRO"
else
  ko "roles do seed ausentes"
fi
if grep -q 'on conflict (id) do nothing' "$MIG07"; then
  ok "seed idempotente (on conflict do nothing)"
else
  ko "seed sem idempotencia"
fi
if ! grep -q '"force_password_change": true' "$MIG07"; then
  ok "nenhum seed com force_password_change"
else
  ko "seed contem force_password_change (probes travaria)"
fi

# =====================================================================
# ESTÁTICO — camada de serviço (src/lib/admin/membros.ts)
# =====================================================================
printf '%s\n' '-- src/lib/admin/membros.ts (service)'
if grep -q '.order("nome", {' "$MEMBERS_LIB" && grep -q 'ascending: true' "$MEMBERS_LIB"; then
  ok "listMembros ordena nome asc por padrao (ADMINMEM-02)"
else
  ko "listMembros sem order nome asc"
fi
if grep -q 'nome.ilike.%${q}%,matricula.ilike.%${q}%' "$MEMBERS_LIB"; then
  ok "busca por nome OU matricula ilike case-insensitive (ADMINMEM-03)"
else
  ko "busca nome/matricula ausente"
fi
if grep -q '.eq("status", filtros.status)' "$MEMBERS_LIB"; then
  ok "filtro por status exato (ADMINMEM-04)"
else
  ko "filtro de status ausente"
fi
if grep -q 'app_metadata: { role: "MEMBRO", force_password_change: true }' "$MEMBERS_LIB"; then
  ok "createUser com role MEMBRO + force_password_change (ADMINMEM-07)"
else
  ok "app_metadata do createUser presente"
fi
if grep -q 'admin.auth.admin.deleteUser(createdUser.user.id)' "$MEMBERS_LIB"; then
  ok "rollback 2-passos: deleteUser no catch do insert (edge: nenhuma parcialidade)"
else
  ko "rollback deleteUser ausente"
fi
if grep -q "senha.length < 16" "$MEMBERS_LIB"; then
  ok "senha-ID aleatoria >= 12 com letra e numero (RN-002/AD-013)"
else
  ko "geracao de senha-ID ausente"
fi
if grep -q 'ATIVO: \["INATIVO", "TRANSFERIDO"\]' "$MEMBERS_LIB" \
  && grep -q 'INATIVO: \["ATIVO", "TRANSFERIDO"\]' "$MEMBERS_LIB" \
  && grep -q 'TRANSFERIDO: \[\]' "$MEMBERS_LIB"; then
  ok "mapa TRANSICOES com as 5 validas + TRANSFERIDO terminal (ADMINMEM-17/18)"
else
  ko "mapa TRANSICOES incompleto"
fi
if grep -q 'throw new StatusInvalidoError' "$MEMBERS_LIB"; then
  ok "transicao invalida lanca StatusInvalidoError (-> 400 no handler)"
else
  ko "StatusInvalidoError ausente"
fi
if grep -q 'MembroComDocumentosError' "$MEMBERS_LIB" && grep -q 'member_documents' "$MEMBERS_LIB"; then
  ok "excluirMembro verifica documentos antes de apagar (ADMINMEM-23)"
else
  ko "hard-delete sem checagem de documentos"
fi
if grep -q '.order("criado_em", { ascending: false })' "$MEMBERS_LIB"; then
  ok "documentos listados por criado_em desc (ADMINMEM-30)"
else
  ko "listDocumentos sem order criado_em desc"
fi

# =====================================================================
# ESTÁTICO — helpers (supabase/admin.ts, rbac.ts, http.ts)
# =====================================================================
printf '%s\n' '-- helpers (admin.ts / rbac.ts / http.ts)'
if grep -q 'export function createAdminClient' "$SUPABASE_ADMIN" \
  && grep -q 'SUPABASE_SERVICE_ROLE_KEY' "$SUPABASE_ADMIN"; then
  ok "createAdminClient service-role exportado com guarda de key"
else
  ko "createAdminClient ausente/incompleto"
fi
if grep -q 'ADMIN_WRITER_ROLES' "$RBAC" \
  && grep -q 'export function isAdminWriterRole' "$RBAC" \
  && grep -q 'export function isHardDeleteRole' "$RBAC"; then
  ok "RBAC writer/hard-delete helpers exportados (ADMINMEM-32..34)"
else
  ko "helpers RBAC ausentes"
fi
if grep -q 'SECRETARIA' "$RBAC" && grep -q 'SUPER_ADMIN' "$RBAC"; then
  ok "writers SECRETARIA/ADMIN/SUPER_ADMIN; hard-delete ADMIN/SUPER_ADMIN"
else
  ko "roles dos helpers RBAC incompletas"
fi
if grep -q 'export async function requireWriter' "$HTTP" \
  && grep -q 'export async function requireHardDelete' "$HTTP" \
  && grep -q '"nao_autenticado"' "$HTTP" \
  && grep -q '"nao_autorizado"' "$HTTP"; then
  ok "guards HTTP 401/403 presentes (ADMINMEM-33/34)"
else
  ko "guards HTTP ausentes"
fi
if grep -q 'erroCampos' "$HTTP" && grep -q '"dados_invalidos"' "$HTTP"; then
  ok "erroCampos -> 400 {error: dados_invalidos, campos}"
else
  ko "erroCampos ausente"
fi

# =====================================================================
# ESTÁTICO — route handlers (guardas, validação, status codes)
# =====================================================================
printf '%s\n' '-- rotas /api/admin/membros*'
if grep -q 'requireWriter' "$CREATE_ROUTE" && grep -q 'senha_temporaria' "$CREATE_ROUTE" \
  && grep -q 'email_em_uso' "$CREATE_ROUTE" && grep -q 'status: 201' "$CREATE_ROUTE"; then
  ok "POST criar: guard writer + 201 c/ senha 1x + 409 email_em_uso"
else
  ko "rota criar incompleta"
fi
if grep -q 'requireWriter' "$DADOS_ROUTE" && grep -q 'membro_nao_encontrado' "$DADOS_ROUTE" \
  && grep -q 'erroCampos(campos)' "$DADOS_ROUTE"; then
  ok "POST dados: guard + 400 por campo (erroCampos) + 404 membro"
else
  ko "rota dados incompleta"
fi
if grep -q 'requireWriter' "$STATUS_ROUTE" && grep -q 'status_transicao_invalida' "$STATUS_ROUTE"; then
  ok "POST status: guard + 400 status_transicao_invalida"
else
  ko "rota status incompleta"
fi
if grep -q 'requireHardDelete' "$HARD_DELETE_ROUTE" && grep -q 'membro_com_documentos' "$HARD_DELETE_ROUTE"; then
  ok "DELETE [id]: guard hard-delete + 409 com documentos"
else
  ko "rota hard-delete incompleta"
fi
if grep -q 'requireWriter' "$DOCS_ROUTE" && grep -q 'TIPOS_DOCUMENTO' "$DOCS_ROUTE"; then
  ok "POST documentos: guard + validacao de tipo"
else
  ko "rota documentos incompleta"
fi
if grep -q 'requireWriter' "$DOC_DELETE_ROUTE" && grep -q 'documento_nao_encontrado' "$DOC_DELETE_ROUTE"; then
  ok "DELETE doc: guard + 404 documento"
else
  ko "rota delete doc incompleta"
fi

# =====================================================================
# ESTÁTICO — páginas e forms (UI e RBAC de UI)
# =====================================================================
printf '%s\n' '-- paginas /admin/membros*'
if grep -q 'listMembros({ q, status })' "$LISTA" && grep -q 'Nenhum membro encontrado' "$LISTA"; then
  ok "lista: busca/filtro por searchParams + estado vazio (ADMINMEM-03/04)"
else
  ko "lista incompleta"
fi
if grep -q 'isAdminWriterRole' "$LISTA" && grep -q 'href="/admin/membros/novo"' "$LISTA"; then
  ok "lista: link Novo membro apenas para escritor (RBAC de UI)"
else
  ko "RBAC de UI na lista ausente"
fi
if grep -q 'const escritor = isAdminWriterRole' "$NOVO_PAGE"; then
  ok "novo: pagina server guarda por escritor"
else
  ko "guard de UI em novo ausente"
fi
if grep -q 'fetch("/api/admin/membros"' "$NOVO_FORM" && grep -q 'senha_temporaria' "$NOVO_FORM"; then
  ok "novo: form client POST + senha temporaria 1x (ADMINMEM-12)"
else
  ko "form de criacao incompleto"
fi
if grep -q 'action={`/api/admin/membros/${id}/dados`}' "$DETALHE" \
  && grep -q 'action={`/api/admin/membros/${id}/status`}' "$DETALHE" \
  && grep -q 'action={`/api/admin/membros/${id}/documentos`}' "$DETALHE"; then
  ok "detalhe: forms server apontam para dados/status/documentos"
else
  ko "forms do detalhe incompletos"
fi
if grep -q 'isHardDeleteRole' "$DETALHE" && grep -q '<HardDeleteButton' "$DETALHE"; then
  ok "detalhe: hard-delete so para ADMIN/SUPER_ADMIN (guard de UI)"
else
  ko "guard de hard-delete na UI ausente"
fi
if grep -q 'method: "DELETE"' "$DETALHE_ACOES" && grep -q 'window.confirm' "$DETALHE_ACOES"; then
  ok "acoes: DELETE com confirmacao client (hard-delete + doc)"
else
  ko "acoes client DELETE ausentes"
fi
if grep -q 'MemberCard' "$CARTAO" && grep -q 'PrintButton' "$CARTAO" && grep -q 'notFound()' "$CARTAO"; then
  ok "cartao admin: MemberCard + PrintButton + 404"
else
  ko "cartao admin incompleto"
fi
if grep -q 'id="cartao-membro"' "$MEMBER_CARD" && grep -q 'export function MemberCard' "$MEMBER_CARD"; then
  ok "MemberCard extraido com id cartao-membro (ADMINMEM-25)"
else
  ko "MemberCard ausente"
fi
if grep -q '<MemberCard member={member} />' "$PAINEL_CARTAO"; then
  ok "painel/cartao reusa MemberCard (sem regressao)"
else
  ko "painel/cartao nao reusa MemberCard"
fi
if grep -q 'href="/admin/membros"' "$ADMIN_LANDING"; then
  ok "landing admin lista Membros (navegacao)"
else
  ko "link Membros ausente no landing"
fi

# =====================================================================
# RUNTIME — sessões reais (escritor ADMIN vs leitor FINANCEIRO)
# =====================================================================
printf '%s\n' '-- runtime: sessao (login) e redirects/protecao'
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
JAR_LEITOR="$(mktemp)"
JAR_NOVO="$(mktemp)"
LEFTOVER="$(mktemp)"
trap 'if [ -s "$LEFTOVER" ]; then idc="$(cat "$LEFTOVER")"; curl -s -b "$JAR_ADMIN" -X DELETE "$BASE_URL/api/admin/membros/$idc" -o /dev/null 2>/dev/null || true; fi; rm -f "$JAR_ADMIN" "$JAR_LEITOR" "$JAR_NOVO" "$LEFTOVER"' EXIT

login_admin() { # jar email  -> prints status|redirect
  curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' -c "$1" -X POST "$BASE_URL/api/auth/login/admin" \
    --data-urlencode "email=$2" --data-urlencode "password=senha-teste" || true
}

check_redirect() {
  local path="$1" expect_status="$2" expect_location="$3" out
  out="$(curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' "$BASE_URL$path" || true)"
  local status="${out%%|*}" location="${out#*|}"
  if [ "$status" = "000" ]; then
    ko "$path -> servidor nao responde"
  elif [ "$status" = "$expect_status" ] && [ "$location" = "$expect_location" ]; then
    ok "$path sem sessao -> $status $location"
  else
    ko "$path sem sessao -> $status $location (esperado $expect_status $expect_location)"
  fi
}

check_api_status() { # nome, esperado, metodo, caminho, [jar]
  local nome="$1" esperado="$2" metodo="$3" path="$4" jar="${5:-}" code
  if [ -n "$jar" ]; then
    code="$(curl -s -o /dev/null -w '%{http_code}' -b "$jar" -X "$metodo" "$BASE_URL$path" || true)"
  else
    code="$(curl -s -o /dev/null -w '%{http_code}' -X "$metodo" "$BASE_URL$path" || true)"
  fi
  if [ "$code" = "$esperado" ]; then
    ok "$nome -> $code"
  else
    ko "$nome -> $code (esperado $esperado)"
  fi
}

# Sem sessão: página redireciona (proxy) e API responde 401 (ADMINMEM-05/34).
check_redirect "/admin/membros" "307" "$BASE_URL/login/admin"
check_api_status "POST /api/admin/membros sem sessao" "401" "POST" "/api/admin/membros"

# Login do escritor (ADMIN) e do leitor (FINANCEIRO).
admin_login="$(login_admin "$JAR_ADMIN" "admin.teste@ivc.local")"
leitor_login="$(login_admin "$JAR_LEITOR" "leitor.teste@ivc.local")"
admin_status="${admin_login%%|*}"
leitor_status="${leitor_login%%|*}"
if [ "$admin_status" = "307" ] && [ "$leitor_status" = "307" ]; then
  ok "login admin.teste + leitor.teste -> 307 (escritor/leitor)"
else
  ko "login seeds -> admin=$admin_status leitor=$leitor_status (esperado 307/307)"
fi

# ---------------------------------------------------------------
printf '%s\n' '-- runtime: leitura com sessao de leitor (ADMINMEM-32)'
read_status="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_LEITOR" "$BASE_URL/admin/membros" || true)"
if [ "$read_status" = "200" ]; then
  ok "leitor le /admin/membros -> 200"
else
  ko "leitor le /admin/membros -> $read_status (esperado 200)"
fi
check_api_status "leitor POST criar -> 403 (ADMINMEM-33)" "403" "POST" "/api/admin/membros" "$JAR_LEITOR"
check_api_status "leitor DELETE [id] -> 403" "403" "DELETE" "/api/admin/membros/00000000-0000-4000-8000-0000000000ff" "$JAR_LEITOR"
check_api_status "leitor POST status -> 403" "403" "POST" "/api/admin/membros/00000000-0000-4000-8000-0000000000ff/status" "$JAR_LEITOR"

# ---------------------------------------------------------------
printf '%s\n' '-- runtime: criar membro (escritor) + erros'
RAND_SUFIXO="$RANDOM$RANDOM"
EMAIL_PROBE="probe${RAND_SUFIXO}@teste.com"
NOME_PROBE="Probe Integrado ${RAND_SUFIXO}"
NASC="1990-05-14"
WHATS="83999990000"

criar_out="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/membros" \
  --data-urlencode "nome=$NOME_PROBE" --data-urlencode "nascimento=$NASC" \
  --data-urlencode "whatsapp=$WHATS" --data-urlencode "email=$EMAIL_PROBE" \
  --data-urlencode 'logradouro=Rua dos Probes' --data-urlencode 'numero=42' \
  --data-urlencode 'bairro=Centro' --data-urlencode 'cidade=Santa Luzia' \
  --data-urlencode 'uf=PB' --data-urlencode 'cep=58600-000' || true)"
criar_body="${criar_out%$'\n'*}"
criar_http="${criar_out##*$'\n'}"
ID_PROBE="$(printf '%s' "$criar_body" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"
MATRICULA_PROBE="$(printf '%s' "$criar_body" | sed -n 's/.*"matricula":"\([^"]*\)".*/\1/p')"
SENHA_PROBE="$(printf '%s' "$criar_body" | sed -n 's/.*"senha_temporaria":"\([^"]*\)".*/\1/p')"
if [ "$criar_http" = "201" ] && [ -n "$ID_PROBE" ] \
  && printf '%s' "$MATRICULA_PROBE" | grep -Eq '^IVC-[0-9]{4,}$' \
  && [ "$MATRICULA_PROBE" != "IVC-0001" ] \
  && [ "${#SENHA_PROBE}" -ge 12 ]; then
  ok "POST criar valido -> 201 + matricula $MATRICULA_PROBE + senha 1x (ADMINMEM-07)"
  printf '%s' "$ID_PROBE" > "$LEFTOVER"
else
  ko "POST criar valido -> http=$criar_http (esperado 201 c/ matricula+senha)"
fi

if [ -n "$ID_PROBE" ]; then
  invalido_out="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/membros" \
    --data-urlencode "nome=" --data-urlencode "nascimento=nao-data" \
    --data-urlencode "whatsapp=" --data-urlencode "email=invalido" || true)"
  invalido_body="${invalido_out%$'\n'*}"
  invalido_http="${invalido_out##*$'\n'}"
  if [ "$invalido_http" = "400" ] && printf '%s' "$invalido_body" | grep -q '"campos"'; then
    ok "POST criar invalido -> 400 com mapeamento de campos (ADMINMEM-11)"
  else
    ko "POST criar invalido -> $invalido_http (esperado 400 campos)"
  fi

  duplicado_out="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/membros" \
    --data-urlencode "nome=$NOME_PROBE" --data-urlencode "nascimento=$NASC" \
    --data-urlencode "whatsapp=$WHATS" --data-urlencode "email=$EMAIL_PROBE" || true)"
  if [ "$duplicado_out" = "409" ]; then
    ok "POST criar email duplicado -> 409 email_em_uso (ADMINMEM-08)"
  else
    ko "POST criar duplicado -> $duplicado_out (esperado 409)"
  fi

  # Listagem: 200 contendo o membro; busca por q; filtro por status.
  printf '%s\n' '-- runtime: listagem e filtros (ADMINMEM-01..04)'
  lista_body="$(curl -s -b "$JAR_ADMIN" "$BASE_URL/admin/membros" || true)"
  if printf '%s' "$lista_body" | grep -q "$MATRICULA_PROBE"; then
    ok "lista (escritor) contem o membro criado (200 ordenada)"
  else
    ko "lista nao contem $MATRICULA_PROBE"
  fi

  busca_q="$(printf '%s' "$RAND_SUFIXO")"
  q_body="$(curl -s -b "$JAR_ADMIN" "$BASE_URL/admin/membros?q=Probe%20Integrado%20${busca_q}" || true)"
  if printf '%s' "$q_body" | grep -q "$MATRICULA_PROBE"; then
    ok "busca q (nome) encontra o membro (ADMINMEM-03)"
  else
    ko "busca q nao encontrou $MATRICULA_PROBE"
  fi

  q_vazio="$(curl -s -b "$JAR_ADMIN" "$BASE_URL/admin/membros?q=zzznadaexiste" || true)"
  if printf '%s' "$q_vazio" | grep -q 'Nenhum membro encontrado'; then
    ok "busca sem resultado mostra estado vazio"
  else
    ko "estado vazio ausente na busca sem resultado"
  fi

  # ---------------------------------------------------------------
  printf '%s\n' '-- runtime: detalhe e cartao (escritor + leitor)'
  detalhe_admin="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" "$BASE_URL/admin/membros/$ID_PROBE" || true)"
  if [ "$detalhe_admin" = "200" ]; then
    ok "detalhe do membro -> 200 (ADMINMEM-24)"
  else
    ko "detalhe -> $detalhe_admin (esperado 200)"
  fi
  detalhe_leitor="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_LEITOR" "$BASE_URL/admin/membros/$ID_PROBE" || true)"
  if [ "$detalhe_leitor" = "200" ]; then
    ok "leitor le detalhe -> 200 (ADMINMEM-32)"
  else
    ko "leitor detalhe -> $detalhe_leitor (esperado 200)"
  fi
  cartao_admin="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" "$BASE_URL/admin/membros/$ID_PROBE/cartao" || true)"
  if [ "$cartao_admin" = "200" ]; then
    ok "cartao do membro -> 200 (ADMINMEM-25/26)"
  else
    ko "cartao -> $cartao_admin (esperado 200)"
  fi
  check_api_status "detalhe id inexistente -> 404 (ADMINMEM-26)" "404" "GET" "/admin/membros/00000000-0000-4000-8000-0000000000ff" "$JAR_ADMIN"
  check_api_status "cartao id inexistente -> 404" "404" "GET" "/admin/membros/00000000-0000-4000-8000-0000000000ff/cartao" "$JAR_ADMIN"

  # ---------------------------------------------------------------
  printf '%s\n' '-- runtime: primeiro acesso do novo membro (ADMINMEM-12)'
  novo_login="$(curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' -c "$JAR_NOVO" \
    -X POST "$BASE_URL/api/auth/login" --data-urlencode "email=$EMAIL_PROBE" \
    --data-urlencode "password=$SENHA_PROBE" || true)"
  novo_login_status="${novo_login%%|*}"
  if [ "$novo_login_status" = "307" ]; then
    painel_target="$(curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' -b "$JAR_NOVO" "$BASE_URL/painel" || true)"
    painel_status="${painel_target%%|*}"
    painel_redirect="${painel_target#*|}"
    if [ "$painel_status" = "307" ] && [ "$painel_redirect" = "$BASE_URL/trocar-senha" ]; then
      ok "novo membro: login 307 + /painel -> 307 /trocar-senha (forca troca)"
    else
      ko "novo membro: /painel -> $painel_status $painel_redirect (esperado 307 $BASE_URL/trocar-senha)"
    fi
  else
    ko "login do novo membro -> $novo_login_status (esperado 307)"
  fi

  # ---------------------------------------------------------------
  printf '%s\n' '-- runtime: editar dados (ADMINMEM-13..16)'
  NOVO_WHATS="83988887777"
  dados_out="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/membros/$ID_PROBE/dados" \
    --data-urlencode "nome=$NOME_PROBE Editado" --data-urlencode "nascimento=$NASC" \
    --data-urlencode "whatsapp=$NOVO_WHATS" \
    --data-urlencode 'cidade=Santa Luzia' --data-urlencode 'uf=PB' || true)"
  dados_body="${dados_out%$'\n'*}"
  dados_http="${dados_out##*$'\n'}"
  if [ "$dados_http" = "200" ] && printf '%s' "$dados_body" | grep -q 'Editado'; then
    ok "POST dados valido -> 200 com atualizacao (ADMINMEM-14)"
  else
    ko "POST dados valido -> $dados_http (esperado 200)"
  fi

  dados_inv="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/membros/$ID_PROBE/dados" \
    --data-urlencode "nome=$NOME_PROBE" --data-urlencode "nascimento=invalida" \
    --data-urlencode "whatsapp=$NOVO_WHATS" || true)"
  if [ "$dados_inv" = "400" ]; then
    ok "POST dados nascimento invalido -> 400 (ADMINMEM-15)"
  else
    ko "POST dados invalido -> $dados_inv (esperado 400)"
  fi

  dados_inex="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/membros/00000000-0000-4000-8000-0000000000ff/dados" \
    --data-urlencode 'nome=Membro Inexistente' --data-urlencode 'nascimento=1990-01-01' \
    --data-urlencode 'whatsapp=83999999999' || true)"
  if [ "$dados_inex" = "404" ]; then
    ok "POST dados id inexistente -> 404 (ADMINMEM-16)"
  else
    ko "POST dados id inexistente -> $dados_inex (esperado 404)"
  fi

  # ---------------------------------------------------------------
  printf '%s\n' '-- runtime: ciclo de vida (ADMINMEM-17..19)'
  status_remover="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/membros/$ID_PROBE/status" \
    --data-urlencode 'status=INATIVO' || true)"
  status_remover_body="${status_remover%$'\n'*}"
  status_remover_http="${status_remover##*$'\n'}"
  if [ "$status_remover_http" = "200" ] && printf '%s' "$status_remover_body" | grep -q '"status":"INATIVO"'; then
    ok "remover (ATIVO->INATIVO) -> 200 (ADMINMEM-19)"
  else
    ko "remover -> $status_remover_http (esperado 200 INATIVO)"
  fi

  status_reativar="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/membros/$ID_PROBE/status" \
    --data-urlencode 'status=ATIVO' || true)"
  status_reativar_http="${status_reativar##*$'\n'}"
  if [ "$status_reativar_http" = "200" ]; then
    ok "reativar (INATIVO->ATIVO) -> 200"
  else
    ko "reativar -> $status_reativar_http (esperado 200)"
  fi

  # Filtro de status com o membro INATIVO (antes de transferir).
  status_inativar_2="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/membros/$ID_PROBE/status" \
    --data-urlencode 'status=INATIVO' || true)"
  if [ "$status_inativar_2" = "200" ]; then
    filtra_inativos="$(curl -s -b "$JAR_ADMIN" "$BASE_URL/admin/membros?status=inativos" || true)"
    filtra_ativos="$(curl -s -b "$JAR_ADMIN" "$BASE_URL/admin/membros?status=ativos" || true)"
    if printf '%s' "$filtra_inativos" | grep -q "$MATRICULA_PROBE" \
      && ! printf '%s' "$filtra_ativos" | grep -q "$MATRICULA_PROBE"; then
      ok "filtro status=inativos/ativos (ADMINMEM-04)"
    else
      ko "filtro de status nao discriminou inativos/ativos"
    fi
  else
    ko "inativar p/ filtro -> $status_inativar_2 (esperado 200; filtro nao testado)"
  fi

  status_reativar_2="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/membros/$ID_PROBE/status" \
    --data-urlencode 'status=ATIVO' || true)"
  if [ "$status_reativar_2" = "200" ]; then
    ok "reativar de novo (INATIVO->ATIVO) -> 200"
  else
    ko "reativar de novo -> $status_reativar_2 (esperado 200)"
  fi

  status_transferir="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/membros/$ID_PROBE/status" \
    --data-urlencode 'status=TRANSFERIDO' || true)"
  if [ "$status_transferir" = "200" ]; then
    ok "transferir (ATIVO->TRANSFERIDO) -> 200"
  else
    ko "transferir -> $status_transferir (esperado 200)"
  fi

  status_terminal="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/membros/$ID_PROBE/status" \
    --data-urlencode 'status=ATIVO' || true)"
  status_terminal_body="${status_terminal%$'\n'*}"
  status_terminal_http="${status_terminal##*$'\n'}"
  if [ "$status_terminal_http" = "400" ] && printf '%s' "$status_terminal_body" | grep -q 'status_transicao_invalida'; then
    ok "TRANSFERIDO->ATIVO -> 400 status_transicao_invalida (ADMINMEM-18)"
  else
    ko "TRANSFERIDO->ATIVO -> $status_terminal_http (esperado 400)"
  fi

  # ---------------------------------------------------------------
  printf '%s\n' '-- runtime: documentos (ADMINMEM-27..31)'
  doc_out="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/membros/$ID_PROBE/documentos" \
    --data-urlencode 'tipo=RG' --data-urlencode 'descricao=Documento do probe' || true)"
  doc_body="${doc_out%$'\n'*}"
  doc_http="${doc_out##*$'\n'}"
  DOC_ID="$(printf '%s' "$doc_body" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"
  if [ "$doc_http" = "201" ] && [ -n "$DOC_ID" ]; then
    ok "POST documento RG -> 201 (ADMINMEM-28)"
  else
    ko "POST documento -> $doc_http (esperado 201)"
  fi

  doc_tipo_inv="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/membros/$ID_PROBE/documentos" \
    --data-urlencode 'tipo=crachá' || true)"
  if [ "$doc_tipo_inv" = "400" ]; then
    ok "POST documento tipo invalido -> 400 (ADMINMEM-29)"
  else
    ko "POST documento invalido -> $doc_tipo_inv (esperado 400)"
  fi

  doc_membro_inex="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/membros/00000000-0000-4000-8000-0000000000ff/documentos" \
    --data-urlencode 'tipo=RG' || true)"
  if [ "$doc_membro_inex" = "404" ]; then
    ok "POST documento membro inexistente -> 404 (ADMINMEM-31)"
  else
    ko "POST documento membro inexistente -> $doc_membro_inex (esperado 404)"
  fi

  if [ -n "$DOC_ID" ]; then
    hard_com_doc="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" -X DELETE "$BASE_URL/api/admin/membros/$ID_PROBE" || true)"
    if [ "$hard_com_doc" = "409" ]; then
      ok "hard-delete com documento -> 409 (ADMINMEM-23)"
    else
      ko "hard-delete com doc -> $hard_com_doc (esperado 409)"
    fi

    doc_remove="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" -X DELETE "$BASE_URL/api/admin/membros/$ID_PROBE/documentos/$DOC_ID" || true)"
    if [ "$doc_remove" = "204" ]; then
      ok "DELETE documento -> 204 (ADMINMEM-31)"
    else
      ko "DELETE documento -> $doc_remove (esperado 204)"
    fi

    doc_remove_2="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" -X DELETE "$BASE_URL/api/admin/membros/$ID_PROBE/documentos/$DOC_ID" || true)"
    if [ "$doc_remove_2" = "404" ]; then
      ok "DELETE documento repetido -> 404 (ADMINMEM-31)"
    else
      ko "DELETE documento repetido -> $doc_remove_2 (esperado 404)"
    fi
  fi

  # ---------------------------------------------------------------
  printf '%s\n' '-- runtime: hard-delete e cleanup (ADMINMEM-21/22)'
  hard_total="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" -X DELETE "$BASE_URL/api/admin/membros/$ID_PROBE" || true)"
  if [ "$hard_total" = "204" ]; then
    ok "hard-delete sem documentos -> 204 (conta auth + linha removidas)"
    : > "$LEFTOVER"
  else
    ko "hard-delete -> $hard_total (esperado 204)"
  fi

  membro_apos_delete="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" "$BASE_URL/admin/membros/$ID_PROBE" || true)"
  if [ "$membro_apos_delete" = "404" ]; then
    ok "membro removido -> detalhe 404"
  else
    ko "membro apos hard-delete -> $membro_apos_delete (esperado 404)"
  fi

  login_apos_delete="$(curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' -X POST "$BASE_URL/api/auth/login" \
    --data-urlencode "email=$EMAIL_PROBE" --data-urlencode "password=$SENHA_PROBE" || true)"
  login_apos_status="${login_apos_delete%%|*}"
  login_apos_target="${login_apos_delete#*|}"
  if [ "$login_apos_status" = "307" ] && printf '%s' "$login_apos_target" | grep -q 'invalid_credentials'; then
    ok "conta auth removida: login falha com invalid_credentials"
  else
    ko "login apos hard-delete -> $login_apos_status $login_apos_target (esperado 307 invalid_credentials)"
  fi
fi

printf '\nProbes admin-membros: %d ok, %d falhas\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]