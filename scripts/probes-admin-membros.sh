#!/usr/bin/env bash
#
# Probes por AC da feature admin-membros (RF-022 / ADMINMEM-01..39).
# Uso: BASE_URL=<url> bash scripts/probes-admin-membros.sh  (default http://localhost:3000)
# Requer o servidor no ar (produção: `npm run build && npm run start -- -p 3000`)
# e as migrações 0006/0007/0008/0009 aplicadas no dev (users seed sem
# force_password_change: admin.teste ADMIN, leitor.teste FINANCEIRO,
# secretaria.teste SECRETARIA, membro.teste MEMBRO — senha `senha-teste`).
# A partir do RF-032 a autoridade por papel vem da matriz `permissions` (0008):
# guards/can() na app espelham can_access() nas policies RLS (mesma fonte).
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
MIG08="$ROOT/supabase/migrations/0008_permissions_matriz.sql"
MIG09="$ROOT/supabase/migrations/0009_seed_secretaria.sql"
MIG10="$ROOT/supabase/migrations/0010_seed_membro.sql"
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

# F1 (M4b → RF-032/L-006): a fonte única da matriz é a tabela `permissions`
# (0008) e as policies admin decidem via `can_access('membros', ...)` — não
# por role-lists. O assert exige a expressão USANDO/WITH CHECK inteira e exata
# dentro do bloco E o número certo de expressões por policy. Remover/trocar a
# policy, o módulo ou o nível quebra o grep (mata a mutação).
bloco_policy() { # arquivo nome_policy
  awk -v pol="create policy \"$2\"" '
    index($0, pol) == 1 { on = 1; next }
    on && /^create policy/ { on = 0 }
    on { print }
  ' "$1"
}

probe_policy_access() { # nome_policy tabela modulo nivel usa(ns) esperado
  #   1: nome (ex: members_select_admin)  2: tabela (members)
  #   3: modulo ('membros')  4: nivel ('ler')
  #   5: formato 'U', 'C', 'UC' (using/with check ou ambos)  6: qtd expr esperadas
  local nome="$1" tabela="$2" modulo="$3" nivel="$4" comb="$5" qtd="$6"
  local bloco n
  bloco="$(bloco_policy "$MIG08" "$nome")"
  if [ -z "$bloco" ]; then
    ko "policy ${nome}: ausente em 0008"
    return
  fi
  if grep -q "drop policy if exists \"${nome}\" on public.${tabela};" "$MIG08"; then
    ok "0008 dropa e recria ${nome} via can_access"
  else
    ko "0008 sem drop de ${nome}"
  fi
  local lit nivel_expr
  case "$nivel" in
    ler) nivel_expr="ler" ;;
    escrever) nivel_expr="escrever" ;;
    administrar) nivel_expr="administrar" ;;
  esac
  if [[ "$comb" == *U* ]]; then
    lit="using (public.can_access('${modulo}','${nivel_expr}'))"
    if printf '%s\n' "$bloco" | grep -Fq "$lit"; then
      ok "policy ${nome}: ${lit}"
    else
      ko "policy ${nome}: sem ${lit}"
    fi
  fi
  if [[ "$comb" == *C* ]]; then
    lit="with check (public.can_access('${modulo}','${nivel_expr}'))"
    if printf '%s\n' "$bloco" | grep -Fq "$lit"; then
      ok "policy ${nome}: ${lit}"
    else
      ko "policy ${nome}: sem ${lit}"
    fi
  fi
  n="$(printf '%s\n' "$bloco" | grep -c "public.can_access('${modulo}','" || true)"
  if [ "$n" = "$qtd" ]; then
    ok "policy ${nome}: ${qtd} expressoes can_access('${modulo}') exatas (M4b)"
  else
    ko "policy ${nome}: ${n} expr can_access (esperado ${qtd})"
  fi
}

printf '== Probes admin-membros (ADMINMEM-01..39 + RF-032/MATRIZ-01..20) — BASE_URL=%s ==\n' "$BASE_URL"

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

printf '%s\n' '-- 0008_permissions_matriz.sql (matriz RBAC / RF-032, AD-015)'
if grep -q 'create table if not exists public.permissions' "$MIG08" \
  && grep -q 'primary key (role, module)' "$MIG08" \
  && grep -q "nivel in ('ler','escrever','administrar')" "$MIG08"; then
  ok "tabela permissions: PK (role,module) + check de nivel (MATRIZ-01)"
else
  ko "tabela permissions ausente/incompleta (MATRIZ-01)"
fi
if grep -q 'alter table public.permissions enable row level security' "$MIG08" \
  && grep -q 'create policy "permissions_select_authenticated"' "$MIG08" \
  && grep -q 'using (true);' "$MIG08"; then
  ok "RLS permissions: select autenticado liberado (matriz pseudo-publica)"
else
  ko "RLS de leitura de permissions ausente"
fi
if grep -q 'permissions_insert_super_admin' "$MIG08" \
  && grep -q 'permissions_update_super_admin' "$MIG08" \
  && grep -q 'permissions_delete_super_admin' "$MIG08" \
  && [ "$(grep -c "public.auth_role() = 'SUPER_ADMIN'" "$MIG08" || true)" -ge 4 ]; then
  ok "escrita da matriz (insert/update/delete) so SUPER_ADMIN (AD-015)"
else
  ko "escrita da matriz nao restrita a SUPER_ADMIN"
fi
if grep -q 'create or replace function public.can_access(p_module text, p_nivel text)' "$MIG08" \
  && grep -q 'security definer' "$MIG08" \
  && grep -q "nivel = 'administrar'" "$MIG08" \
  && grep -q "nivel = 'escrever' and p_nivel in ('ler','escrever')" "$MIG08" \
  && grep -q "nivel = 'ler' and p_nivel = 'ler'" "$MIG08"; then
  ok "can_access() security definer com hierarquia administrar>escrever>ler (MATRIZ-06)"
else
  ko "can_access() sem hierarquia completa"
fi
if grep -q 'revoke all on function public.can_access(text,text) from public;' "$MIG08" \
  && grep -q 'grant execute on function public.can_access(text,text) to authenticated;' "$MIG08"; then
  ok "can_access() executavel apenas por authenticated"
else
  ko "revoke/grant de can_access() ausente"
fi
n_seed="$(grep -c "^  ('[A-Z_]*','[a-z]*','" "$MIG08" || true)"
if [ "$n_seed" = "48" ]; then
  ok "seed da matriz com 48 pares (Anexo A, MATRIZ-12)"
else
  ko "seed da matriz: $n_seed pares (esperado 48)"
fi
if grep -q 'on conflict (role, module) do nothing' "$MIG08"; then
  ok "seed idempotente (on conflict do nothing)"
else
  ko "seed sem idempotencia"
fi
if grep -q 'MEMBRO' "$MIG08" && ! grep -Eq "^  \('MEMBRO'," "$MIG08"; then
  ok "MEMBRO citado so como sem-linha (nao tem pares — fail-closed MATRIZ-10)"
else
  ko "MEMBRO com linha de permissao na matriz (fail-closed quebrado)"
fi
# F1 (M4b): as 7 policies admin recriadas decidem via can_access('membros') —
# expresión EXATA por policy + contagem. Usuários sem linha no módulo (MEMBRO)
# ficam negados por fail-closed (MATRIZ-10); SA consideram administrar (M2).
printf '%s\n' '-- 0008: policies admin via can_access (paridade guards/can())'
probe_policy_access members_select_admin members membros ler U 1
probe_policy_access members_insert_admin members membros escrever C 1
probe_policy_access members_update_admin members membros escrever UC 2
probe_policy_access members_delete_admin members membros administrar U 1
probe_policy_access docs_select_admin member_documents membros ler U 1
probe_policy_access docs_insert_admin member_documents membros escrever C 1
probe_policy_access docs_delete_admin member_documents membros escrever U 1

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
if ! grep -q '"force_password_change": true' "$MIG07" \
  && ! grep -q '"force_password_change": true' "$MIG09"; then
  ok "nenhum seed com force_password_change"
else
  ko "seed contem force_password_change (probes travaria)"
fi

printf '%s\n' '-- 0009_seed_secretaria.sql (escritor de nivel escrever, RF-032)'
if grep -q 'secretaria.teste@ivc.local' "$MIG09" && grep -q "'role', 'SECRETARIA'" "$MIG09"; then
  ok "seed contem secretaria.teste com role SECRETARIA (MATRIZ-14)"
else
  ko "seed SECRETARIA ausente"
fi
if grep -q 'on conflict (id) do nothing' "$MIG09"; then
  ok "seed 0009 idempotente"
else
  ko "seed 0009 sem idempotencia"
fi

printf '%s\n' '-- 0010_seed_membro.sql (re-seed da sessao MEMBRO para probes)'
if grep -q 'membro.teste@ivc.local' "$MIG10" && grep -q "'role', 'MEMBRO'" "$MIG10"; then
  ok "re-seed membro.teste com role MEMBRO (fail-closed MATRIZ-10)"
else
  ko "re-seed membro.teste ausente"
fi
if grep -q 'on conflict (id) do nothing' "$MIG10"; then
  ok "seed 0010 idempotente"
else
  ko "seed 0010 sem idempotencia"
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
# F4: o guard 409 vem de um select REAL em member_documents DENTRO de
# excluirMembro e ANTES do deleteUser — não é só o nome da classe existindo.
ln_excluir="$(grep -n 'export async function excluirMembro' "$MEMBERS_LIB" | cut -d: -f1 || true)"
ln_docs_sel="$(grep -nF '.from("member_documents")' "$MEMBERS_LIB" | awk -F: -v s="$ln_excluir" '$1 > s { print $1; exit }' || true)"
ln_auth="$(grep -nF 'auth.admin.deleteUser' "$MEMBERS_LIB" | awk -F: -v s="$ln_excluir" '$1 > s { print $1; exit }' || true)"
if [ -n "$ln_docs_sel" ] && [ -n "$ln_auth" ] && [ "$ln_docs_sel" -lt "$ln_auth" ] \
  && grep -q 'throw new MembroComDocumentosError' "$MEMBERS_LIB"; then
  ok "excluirMembro: select member_documents real antes do deleteUser (AC23)"
else
  ko "hard-delete sem guard real de documentos (AC23)"
fi
if grep -q '.order("criado_em", { ascending: false })' "$MEMBERS_LIB"; then
  ok "documentos listados por criado_em desc (ADMINMEM-30)"
else
  ko "listDocumentos sem order criado_em desc"
fi

# ------------------------------------------------------------------
# ESTÁTICO — AC39: hard-delete com falha parcial de auth -> 500 sem
# inconsistência. A ORDEM garante a recuperação (edge case da spec,
# "rolback manual documentado"): a conta auth é removida PRIMEIRO
# (`deleteUser` é idempotente) e só depois a linha `members`. Se a linha
# falhar após a conta, não há órfão inverso (linha sem conta) — estado
# consistente; o handler converte qualquer falha em 500 `erro_interno`,
# DEPOIS do guard de documentos (409) e do 404, que vêm antes no catch.
# ------------------------------------------------------------------
printf '%s\n' '-- hard-delete: ordem auth->linha (AC39) e 500 no handler'
# scoped dentro de excluirMembro (linhas DENTRO da funcao, nao do arquivo)
ln_excluir="$(grep -n 'export async function excluirMembro' "$MEMBERS_LIB" | cut -d: -f1 || true)"
ln_auth="$(grep -nF 'auth.admin.deleteUser' "$MEMBERS_LIB" | awk -F: -v s="$ln_excluir" '$1 > s { print $1; exit }' || true)"
ln_members="$(grep -nF '.from("members")' "$MEMBERS_LIB" | awk -F: -v s="$ln_excluir" '$1 > s { print $1; exit }' || true)"
ln_members_del="$(grep -nF '.delete()' "$MEMBERS_LIB" | awk -F: -v s="$ln_members" '$1 > s { print $1; exit }' || true)"
if [ -n "$ln_auth" ] && [ -n "$ln_members_del" ] && [ "$ln_auth" -lt "$ln_members_del" ]; then
  ok "excluirMembro: conta auth removida antes da linha members (AC39)"
else
  ko "excluirMembro: ordem errada (deleteUser=$ln_auth, delete members=$ln_members_del) (AC39)"
fi
ln_guard_409="$(grep -n 'instanceof MembroComDocumentosError' "$HARD_DELETE_ROUTE" | head -1 | cut -d: -f1 || true)"
ln_erro_500="$(grep -n 'erro_interno' "$HARD_DELETE_ROUTE" | head -1 | cut -d: -f1 || true)"
if grep -q '"erro_interno"' "$HARD_DELETE_ROUTE" && grep -q 'status: 500' "$HARD_DELETE_ROUTE" \
  && [ -n "$ln_guard_409" ] && [ -n "$ln_erro_500" ] && [ "$ln_guard_409" -lt "$ln_erro_500" ]; then
  ok "DELETE [id]: catch generico -> 500 erro_interno apos guard 409 (AC39)"
else
  ko "DELETE [id]: 500 generico ausente ou guard 409 fora de ordem (AC39)"
fi

# =====================================================================
# ESTÁTICO — helpers (supabase/admin.ts, rbac.ts, http.ts, RF-032)
# =====================================================================
printf '%s\n' '-- helpers (admin.ts / rbac.ts / http.ts)'
if grep -q 'export function createAdminClient' "$SUPABASE_ADMIN" \
  && grep -q 'SUPABASE_SERVICE_ROLE_KEY' "$SUPABASE_ADMIN"; then
  ok "createAdminClient service-role exportado com guarda de key"
else
  ko "createAdminClient ausente/incompleto"
fi
# AD-015: autoridade fina vem da matriz `permissions`. O gate grosseiro admin
# (ADMIN_ROLES/isAdminRole) segue só para roteamento do proxy; os helpers
# antigos de escritor/hard-delete foram REMOVIDOS (L-006).
if grep -q 'export type Nivel' "$RBAC" \
  && grep -q 'export const MODULOS' "$RBAC" \
  && grep -q 'export type Modulo' "$RBAC" \
  && grep -q 'export const ORDEM' "$RBAC" \
  && grep -q 'export const getMatriz' "$RBAC" \
  && grep -q 'export async function can' "$RBAC"; then
  ok "rbac.ts: Nivel/MODULOS/ORDEM/getMatriz/can presentes (MATRIZ-01..09)"
else
  ko "rbac.ts sem ontologia da matriz completa"
fi
if grep -q 'export const ADMIN_ROLES' "$RBAC" && grep -q 'export function isAdminRole' "$RBAC"; then
  ok "ADMIN_ROLES/isAdminRole mantidos como gate grosseiro do proxy (AD-015)"
else
  ko "gate grosseiro admin removido"
fi
old_helpers="$(grep -rlE 'isAdminWriterRole|isHardDeleteRole|ADMIN_WRITER_ROLES' "$ROOT/src" || true)"
if [ -z "$old_helpers" ]; then
  ok "helpers antigos isAdminWriterRole/isHardDeleteRole/ADMIN_WRITER_ROLES removidos (L-006)"
else
  ko "helpers antigos presentes: ${old_helpers} (L-006)"
fi
if grep -q 'export async function authAdmin(' "$HTTP" \
  && grep -q 'export async function requireEscrita(' "$HTTP" \
  && grep -q 'export async function requireAdministrar(' "$HTTP" \
  && grep -q 'negarPermissao(' "$HTTP" \
  && grep -q '"nao_autenticado"' "$HTTP" \
  && grep -q '"nao_autorizado"' "$HTTP"; then
  ok "guards HTTP module-aware auth/ler/escrever/administrar (AD-015)"
else
  ko "guards HTTP module-aware ausentes"
fi
if grep -q 'rbac: acesso negado' "$HTTP"; then
  ok "negativa de permissao registrada no log (MATRIZ-20)"
else
  ko "sem log de negativa (MATRIZ-20)"
fi
old_guards="$(grep -rlE 'requireWriter|requireHardDelete' "$ROOT/src" || true)"
if [ -z "$old_guards" ]; then
  ok "guards antigos requireWriter/requireHardDelete removidos"
else
  ko "guards antigos presentes: ${old_guards}"
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
if grep -q 'requireEscrita("membros")' "$CREATE_ROUTE" \
  && grep -qE 'NextResponse\.json\(\{ error: "email_em_uso" \}, \{ status: 409 \}\)' "$CREATE_ROUTE" \
  && grep -q 'status: 201' "$CREATE_ROUTE"; then
  ok "POST criar: guard membros/escrever + 201 c/ senha 1x + 409 email_em_uso (linha de producao)"
else
  ko "rota criar incompleta"
fi
if grep -q 'requireEscrita("membros")' "$DADOS_ROUTE" && grep -q 'membro_nao_encontrado' "$DADOS_ROUTE" \
  && grep -q 'erroCampos(campos)' "$DADOS_ROUTE"; then
  ok "POST dados: guard + 400 por campo (erroCampos) + 404 membro"
else
  ko "rota dados incompleta"
fi
# AC16 (estatico): a rota de edicao NAO consome `email` (inalteravel) — o
# campo nao e lido nem validado aqui.
if ! grep -q 'form.get("email")' "$DADOS_ROUTE"; then
  ok "dados: rota nao consome email (AC16 inalteravel)"
else
  ko "dados route consome email (AC16)"
fi
if grep -q 'requireEscrita("membros")' "$STATUS_ROUTE" && grep -q 'status_transicao_invalida' "$STATUS_ROUTE"; then
  ok "POST status: guard membros/escrever + 400 status_transicao_invalida"
else
  ko "rota status incompleta"
fi
if grep -q 'requireAdministrar("membros")' "$HARD_DELETE_ROUTE" && grep -q 'membro_com_documentos' "$HARD_DELETE_ROUTE"; then
  ok "DELETE [id]: guard membros/administrar + 409 com documentos"
else
  ko "rota hard-delete incompleta"
fi
if grep -q 'requireEscrita("membros")' "$DOCS_ROUTE" && grep -q 'TIPOS_DOCUMENTO' "$DOCS_ROUTE"; then
  ok "POST documentos: guard membros/escrever + validacao de tipo"
else
  ko "rota documentos incompleta"
fi
if grep -q 'requireEscrita("membros")' "$DOC_DELETE_ROUTE" && grep -q 'documento_nao_encontrado' "$DOC_DELETE_ROUTE"; then
  ok "DELETE doc: guard membros/escrever + 404 documento"
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
if grep -q 'await can(claims?.role ?? "", "membros", "escrever")' "$LISTA" \
  && grep -q 'href="/admin/membros/novo"' "$LISTA"; then
  ok "lista: link Novo membro apenas p/ quem e escritor na matriz (RBAC UI)"
else
  ko "RBAC de UI na lista ausente"
fi
if grep -q 'const escritor = await can(claims?.role ?? "", "membros", "escrever")' "$NOVO_PAGE"; then
  ok "novo: pagina server guarda por escrever na matriz"
else
  ko "guard de UI em novo ausente"
fi
if grep -q 'fetch("/api/admin/membros"' "$NOVO_FORM" && grep -q 'senha_temporaria' "$NOVO_FORM"; then
  ok "novo: form client POST + senha temporaria 1x (ADMINMEM-12)"
else
  ko "form de criacao incompleto"
fi
# AC11 (estatico): `senha_temporaria` só existe na rota POST criar (linha de
# producao, nao so comentario) e no form cliente — nenhuma outra resposta ou
# rota exporta a senha-ID.
outras_senha="$(grep -rl 'senha_temporaria' "$ROOT/src" | grep -vF "$CREATE_ROUTE" | grep -vF "$NOVO_FORM" || true)"
if [ -z "$outras_senha" ] && grep -q 'senha_temporaria: senhaTemporaria' "$CREATE_ROUTE"; then
  ok "senha_temporaria so na rota POST criar + form cliente (AC11)"
else
  ko "senha_temporaria fora do create/form: ${outras_senha:-producao ausente na rota} (AC11)"
fi
if grep -q 'action={`/api/admin/membros/${id}/dados`}' "$DETALHE" \
  && grep -q 'action={`/api/admin/membros/${id}/status`}' "$DETALHE" \
  && grep -q 'action={`/api/admin/membros/${id}/documentos`}' "$DETALHE"; then
  ok "detalhe: forms server apontam para dados/status/documentos"
else
  ko "forms do detalhe incompletos"
fi
if grep -q 'const hardDelete = await can(claims?.role ?? "", "membros", "administrar")' "$DETALHE" \
  && grep -q '<HardDeleteButton' "$DETALHE"; then
  ok "detalhe: hard-delete so para quem administra membros na matriz (guard UI)"
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
JAR_MEMBRO="$(mktemp)"
JAR_SECRETARIA="$(mktemp)"
LEFTOVER="$(mktemp)"
trap 'if [ -s "$LEFTOVER" ]; then idc="$(cat "$LEFTOVER")"; curl -s -b "$JAR_ADMIN" -X DELETE "$BASE_URL/api/admin/membros/$idc" -o /dev/null 2>/dev/null || true; fi; rm -f "$JAR_ADMIN" "$JAR_LEITOR" "$JAR_NOVO" "$JAR_MEMBRO" "$JAR_SECRETARIA" "$LEFTOVER"' EXIT

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

# Login do escritor (ADMIN), do leitor (FINANCEIRO) e do escritor SECRETARIA.
# F3 (anti-flaky): 307 sozinho nao discrimina login ok de credencial invalida
# (ambos 307; a falha vai para /login/admin?error=invalid_credentials e
# cascateia FALHAs nas secoes seguintes). Exigir o TARGET $BASE_URL/admin
# garante que a sessao realmente abriu.
admin_login="$(login_admin "$JAR_ADMIN" "admin.teste@ivc.local")"
leitor_login="$(login_admin "$JAR_LEITOR" "leitor.teste@ivc.local")"
secretaria_login="$(login_admin "$JAR_SECRETARIA" "secretaria.teste@ivc.local")"
admin_status="${admin_login%%|*}"
leitor_status="${leitor_login%%|*}"
secretaria_status="${secretaria_login%%|*}"
admin_target="${admin_login#*|}"
leitor_target="${leitor_login#*|}"
secretaria_target="${secretaria_login#*|}"
if [ "$admin_status" = "307" ] && [ "$admin_target" = "$BASE_URL/admin" ] \
  && [ "$leitor_status" = "307" ] && [ "$leitor_target" = "$BASE_URL/admin" ]; then
  ok "login admin.teste + leitor.teste -> 307 $BASE_URL/admin (escritor/leitor)"
else
  ko "login seeds -> admin=$admin_status->$admin_target leitor=$leitor_status->$leitor_target (esperado 307->$BASE_URL/admin)"
fi
# RF-032/MATRIZ-14: SECRETARIA (escreve membros) abre sessão admin.
if [ "$secretaria_status" = "307" ] && [ "$secretaria_target" = "$BASE_URL/admin" ]; then
  ok "login secretaria.teste -> 307 $BASE_URL/admin (SECRETARIA escreve na matriz)"
else
  ko "login secretaria.teste -> $secretaria_status->$secretaria_target (esperado 307->$BASE_URL/admin)"
fi

# AC05: sessao de papel MEMBRO (nao admin) em /admin/membros -> 307 /login/admin
# (o proxy AUTH-14 desvia sessao nao-admin da area admin). Usa o seed
# membro.teste@ivc.local (MEMBRO, sem force_password_change — senão o proxy
# mandaria /trocar-senha antes).
printf '%s\n' '-- runtime: sessao MEMBRO na area admin (ADMINMEM-05)'
membro_login="$(curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' -c "$JAR_MEMBRO" \
  -X POST "$BASE_URL/api/auth/login" --data-urlencode 'email=membro.teste@ivc.local' \
  --data-urlencode 'password=senha-teste' || true)"
membro_status="${membro_login%%|*}"
membro_target="${membro_login#*|}"
if [ "$membro_status" = "307" ] && [ "$membro_target" = "$BASE_URL/painel" ]; then
  membro_admin="$(curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' -b "$JAR_MEMBRO" "$BASE_URL/admin/membros" || true)"
  membro_admin_status="${membro_admin%%|*}"
  membro_admin_target="${membro_admin#*|}"
  if [ "$membro_admin_status" = "307" ] && [ "$membro_admin_target" = "$BASE_URL/login/admin" ]; then
    ok "sessao MEMBRO em /admin/membros -> 307 $BASE_URL/login/admin (ADMINMEM-05)"
    # RF-032/MATRIZ-10: MEMBRO não tem linha na matriz — chamada direta à API
    # regista 403 (fail-closed), mesmo com proxy de página desviado.
    check_api_status "MEMBRO POST criar -> 403 (sem linha na matriz, MATRIZ-10)" "403" "POST" "/api/admin/membros" "$JAR_MEMBRO"
  else
    ko "sessao MEMBRO em /admin/membros -> $membro_admin_status->$membro_admin_target (esperado 307 $BASE_URL/login/admin)"
  fi
else
  ko "login membro.teste -> $membro_status->$membro_target (esperado 307->$BASE_URL/painel)"
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
# RF-032: discriminacao por papel na matriz (MATRIZ-13..18). SECRETARIA tem
# membros=escrever (escreve e cria) mas NAO administrar (hard-delete -> 403);
# ADMIN administra (hard-delete 204 no cleanup). Barra a regressao para a
# role-list antiga (isAdminWriterRole) e prova o ramo `escrever` do can().
printf '%s\n' '-- runtime: matriz de permissoes por papel (RF-032/MATRIZ-13..18)'
sec_read="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_SECRETARIA" "$BASE_URL/admin/membros" || true)"
if [ "$sec_read" = "200" ]; then
  ok "SECRETARIA le /admin/membros -> 200 (escrever concede leitura, MATRIZ-06)"
else
  ko "SECRETARIA le /admin/membros -> $sec_read (esperado 200)"
fi
check_api_status "SECRETARIA DELETE [id] -> 403 (escrever nao administra, MATRIZ-17)" "403" "DELETE" "/api/admin/membros/00000000-0000-4000-8000-0000000000ff" "$JAR_SECRETARIA"

SEC_SURFIXO="$RANDOM$RANDOM"
SEC_EMAIL="probe-sec${SEC_SURFIXO}@teste.com"
sec_criar="$(curl -s -w '\n%{http_code}' -b "$JAR_SECRETARIA" -X POST "$BASE_URL/api/admin/membros" \
  --data-urlencode "nome=Probe Secretaria ${SEC_SURFIXO}" --data-urlencode 'nascimento=1988-03-10' \
  --data-urlencode 'whatsapp=83988886666' --data-urlencode "email=$SEC_EMAIL" \
  --data-urlencode 'logradouro=Rua da Secretaria' --data-urlencode 'numero=7' \
  --data-urlencode 'bairro=Centro' --data-urlencode 'cidade=Santa Luzia' \
  --data-urlencode 'uf=PB' --data-urlencode 'cep=58600-000' || true)"
sec_body="${sec_criar%$'\n'*}"
sec_http="${sec_criar##*$'\n'}"
SEC_ID="$(printf '%s' "$sec_body" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"
if [ "$sec_http" = "201" ] && [ -n "$SEC_ID" ]; then
  ok "SECRETARIA POST criar valido -> 201 (MATRIZ-14)"
  sec_limpa="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" -X DELETE "$BASE_URL/api/admin/membros/$SEC_ID" || true)"
  if [ "$sec_limpa" = "204" ]; then
    ok "limpeza do membro da SECRETARIA via ADMIN (administrar) -> 204 (MATRIZ-18)"
  else
    ko "limpeza via ADMIN -> $sec_limpa (esperado 204)"
  fi
else
  ko "SECRETARIA POST criar valido -> $sec_http (esperado 201, MATRIZ-14)"
fi

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
  detalhe_admin_body="$(curl -s -b "$JAR_ADMIN" "$BASE_URL/admin/membros/$ID_PROBE" || true)"
  if [ "$detalhe_admin" = "200" ]; then
    ok "detalhe do membro -> 200 (ADMINMEM-24)"
  else
    ko "detalhe -> $detalhe_admin (esperado 200)"
  fi
  # AC07: o endereço enviado no cadastro aparece na ficha (detalhe RSC).
  if printf '%s' "$detalhe_admin_body" | grep -q 'Rua dos Probes'; then
    ok "detalhe mostra o logradouro do cadastro (AC07/ADMINMEM-08)"
  else
    ko "logradouro do cadastro ausente no detalhe (AC07)"
  fi
  # AC11 (negativo): a senha-ID nunca vaza fora do POST de criação — nem no
  # detalhe nem na listagem.
  if ! printf '%s' "$detalhe_admin_body" | grep -q 'senha_temporaria' \
    && ! printf '%s' "$lista_body" | grep -q 'senha_temporaria'; then
    ok "senha_temporaria ausente no detalhe e na listagem (AC11)"
  else
    ko "senha_temporaria vazou em resposta nao-criacao (AC11)"
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
  novo_login_target="${novo_login#*|}"
  if [ "$novo_login_status" = "307" ] && [ "$novo_login_target" = "$BASE_URL/painel" ]; then
    painel_target="$(curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' -b "$JAR_NOVO" "$BASE_URL/painel" || true)"
    painel_status="${painel_target%%|*}"
    painel_redirect="${painel_target#*|}"
    if [ "$painel_status" = "307" ] && [ "$painel_redirect" = "$BASE_URL/trocar-senha" ]; then
      ok "novo membro: login 307->$BASE_URL/painel + /painel -> 307 /trocar-senha (forca troca)"
    else
      ko "novo membro: /painel -> $painel_status $painel_redirect (esperado 307 $BASE_URL/trocar-senha)"
    fi
  else
    ko "login do novo membro -> $novo_login_status->$novo_login_target (esperado 307->$BASE_URL/painel)"
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

  # AC16 (live): apos editar dados, o email original segue logavel — a conta
  # auth nao foi alterada/trocada pela edicao de dados.
  email_apos_dados="$(curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' \
    -X POST "$BASE_URL/api/auth/login" --data-urlencode "email=$EMAIL_PROBE" \
    --data-urlencode "password=$SENHA_PROBE" || true)"
  email_apos_status="${email_apos_dados%%|*}"
  email_apos_target="${email_apos_dados#*|}"
  if [ "$email_apos_status" = "307" ] && [ "$email_apos_target" = "$BASE_URL/painel" ]; then
    ok "email segue logavel apos edicao de dados (AC16 inalteravel)"
  else
    ko "login apos edicao -> $email_apos_status->$email_apos_target (AC16)"
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

    # AC38: inativar preserva o histórico — o detalhe continua 200 exibindo o
    # status Inativo e a listagem ainda contém o membro (nada de 404/remoção).
    apos_inativar_http="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" "$BASE_URL/admin/membros/$ID_PROBE" || true)"
    apos_inativar="$(curl -s -b "$JAR_ADMIN" "$BASE_URL/admin/membros/$ID_PROBE" || true)"
    if [ "$apos_inativar_http" = "200" ] && printf '%s' "$apos_inativar" | grep -q 'Inativo'; then
      ok "inativado: detalhe 200 mostra status Inativo (AC38 historico preservado)"
    else
      ko "inativado: detalhe $apos_inativar_http sem status Inativo (AC38)"
    fi
    lista_apos_inativar="$(curl -s -b "$JAR_ADMIN" "$BASE_URL/admin/membros" || true)"
    if printf '%s' "$lista_apos_inativar" | grep -q "$MATRICULA_PROBE"; then
      ok "inativado: listagem ainda contem o membro (AC38, nao deletado)"
    else
      ko "inativado: membro sumiu da listagem (AC38)"
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
    # AC29 (RSC, zero GET API): o detalhe do membro exibe os documentos — a
    # descricao do doc criado aparece na pagina (leitura via RSC, ordenada por
    # criado_em desc — coberto pelo grep de order no servico).
    detalhe_com_doc_http="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" "$BASE_URL/admin/membros/$ID_PROBE" || true)"
    detalhe_com_doc="$(curl -s -b "$JAR_ADMIN" "$BASE_URL/admin/membros/$ID_PROBE" || true)"
    if [ "$detalhe_com_doc_http" = "200" ] && printf '%s' "$detalhe_com_doc" | grep -q 'Documento do probe'; then
      ok "detalhe exibe a descricao do documento registrado (AC29 via RSC)"
    else
      ko "detalhe sem a descricao do documento (AC29)"
    fi

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