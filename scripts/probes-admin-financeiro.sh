#!/usr/bin/env bash
#
# Probes por AC da feature admin-financeiro (RF-026 / FIN-01..12, AC-01..31).
# Uso: BASE_URL=<url> bash scripts/probes-admin-financeiro.sh  (default http://localhost:3000)
# Requer o servidor no ar (producao: `npm run build && npm run start -- -p 3000`),
# migrations 0008/0009/0012/0013/0014 aplicadas no dev, seeds sem
# force_password_change e SERVICE-ROLE configurada (para o webhook criar a
# transacao CONCILIADO): admin.teste (ADMIN), financeiro.teste (FINANCEIRO,
# financeiro=escrever), secretaria.teste (SECRETARIA, financeiro=ler —
# discrimina o ramo escrever), membro.teste (MEMBRO) — senha `senha-teste`.
#
# Discriminacao de papel na matriz financeiro (RF-032/L-008):
#   ADMIN (administrar): cria/edita/cancela lancamentos e fecha caixa;
#   FINANCEIRO (escrever, financeiro.teste): igual ao ADMIN no modulo;
#   SECRETARIA (ler): le admin 200, escrita 403;
#   MEMBRO: sem linha -> fail-closed 403 (MATRIZ-10), proxy redirect;
#   anon: SEM policy anon em transactions -> API 401 / pagina redirect login.
#
# Re-runnable: nomes `Probe Lanc $RANDOM$RANDOM`; create -> act -> cleanup
# (cancelar lancamentos PENDENTE criados). TRAP no EXIT restaura seeds
# Dízimo/Aluguel p/ PENDENTE (best effort).
#
# Nota: sem DELETE route/policy em transactions (FIN-05) — lancamentos
# cancelados tornam-se residuos CANCELADO (nao hard-delete). Fechamentos de
# caixa criados pelos probes sao snapshots permanentes (residuo aceito;
# limpeza via MCP entre rodadas se necessario).
#
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

MIG14="$ROOT/supabase/migrations/0014_financeiro.sql"
SERVICE="$ROOT/src/lib/admin/financeiro.ts"
TYPES="$ROOT/src/lib/admin/financeiro-types.ts"
VALIDACAO="$ROOT/src/lib/admin/validacao.ts"
ROUTE="$ROOT/src/app/api/admin/financeiro/route.ts"
ID_ROUTE="$ROOT/src/app/api/admin/financeiro/[id]/route.ts"
CANCEL_ROUTE="$ROOT/src/app/api/admin/financeiro/[id]/cancelar/route.ts"
FECH_ROUTE="$ROOT/src/app/api/admin/financeiro/fechamento/route.ts"
WEBHOOK="$ROOT/src/app/api/webhooks/mercadopago/route.ts"
LISTA="$ROOT/src/app/admin/financeiro/page.tsx"
NOVA_PAGE="$ROOT/src/app/admin/financeiro/nova/page.tsx"
NOVA_FORM="$ROOT/src/app/admin/financeiro/nova/page.tsx"
DETALHE="$ROOT/src/app/admin/financeiro/[id]/page.tsx"
FECH_PAGE="$ROOT/src/app/admin/financeiro/fechamento/page.tsx"
FECH_BTN="$ROOT/src/app/admin/financeiro/fechamento/fechar-caixa-button.tsx"
DASHBOARD="$ROOT/src/app/admin/page.tsx"

SEED_RECEITA_ID="00000000-0000-4000-8000-000000000011"
SEED_RECEITA="Dízimo seed"
SEED_DESPESA_ID="00000000-0000-4000-8000-000000000012"
SEED_DESPESA="Aluguel seed"
SEED_USER="financeiro.teste@ivc.local"

PASS=0
FAIL=0
ok() { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
ko() { FAIL=$((FAIL + 1)); printf '  FAIL %s\n' "$1"; }

printf '== Probes admin-financeiro (FIN-01..12 / RF-026) — BASE_URL=%s ==\n' "$BASE_URL"

# =====================================================================
# ESTATICO — migration 0014 (tabelas + RLS sem anon + sem DELETE + seeds)
# =====================================================================
printf '%s\n' '-- 0014_financeiro.sql (tabelas, FIN-01)'
if grep -q 'create table if not exists public.transactions' "$MIG14" \
  && grep -q 'descricao text not null' "$MIG14" \
  && grep -q 'valor numeric(12,2) not null' "$MIG14" \
  && grep -q 'tipo text not null check' "$MIG14" \
  && grep -q 'metodo text not null check' "$MIG14" \
  && grep -q "status text not null default 'PENDENTE'" "$MIG14"; then
  ok "tabela transactions com schema do lancamento (FIN-01)"
else
  ko "transactions ausente/incompleta (FIN-01)"
fi
if grep -q 'create table if not exists public.webhook_events' "$MIG14" \
  && grep -q 'event_id text not null unique' "$MIG14" \
  && grep -q 'payload jsonb not null' "$MIG14"; then
  ok "tabela webhook_events com idempotencia + payload cru (FIN-07/19)"
else
  ko "webhook_events ausente/incompleta (FIN-07/19)"
fi
if grep -q 'create table if not exists public.cash_closes' "$MIG14" \
  && grep -q 'total_receitas numeric' "$MIG14" \
  && grep -q 'total_despesas numeric' "$MIG14" \
  && grep -q 'saldo numeric' "$MIG14" \
  && grep -q 'qtd_transacoes integer' "$MIG14"; then
  ok "tabela cash_closes com totais + saldo (FIN-09/10)"
else
  ko "cash_closes ausente/incompleta (FIN-09/10)"
fi

printf '%s\n' '-- 0014: RLS — SEM anon, can_access financeiro (FIN-03/12/25, AC-12)'
if grep -q 'create policy "transactions_select_admin"' "$MIG14" \
  && grep -q 'to authenticated' "$MIG14" \
  && grep -qF "using (public.can_access('financeiro', 'ler'))" "$MIG14" \
  && ! grep -q 'to anon, authenticated' "$MIG14"; then
  ok "policy transactions_select_admin: authenticated + ler, SEM anon (FIN-03/12)"
else
  ko "policy transactions_select_admin ausente/alterada/com anon (FIN-12)"
fi
if grep -q 'create policy "transactions_insert_admin"' "$MIG14" \
  && grep -qF "with check (public.can_access('financeiro', 'escrever'))" "$MIG14"; then
  ok "policy transactions_insert_admin: can_access('financeiro','escrever') (AC-5)"
else
  ko "policy transactions_insert_admin ausente/alterada (AC-5)"
fi
if grep -q 'create policy "transactions_update_admin"' "$MIG14" \
  && grep -qF "using (public.can_access('financeiro', 'escrever'))" "$MIG14" \
  && grep -qF "with check (public.can_access('financeiro', 'escrever'))" "$MIG14"; then
  ok "policy transactions_update_admin: using+with check escrever (FIN-05)"
else
  ko "policy transactions_update_admin incompleta (FIN-05)"
fi
if ! grep -q 'create policy "transactions_delete' "$MIG14"; then
  ok "transactions sem policy de DELETE (soft-delete CANCELADO, FIN-05/12)"
else
  ko "transactions com policy de DELETE (FIN-05/12)"
fi
if grep -q 'create policy "cash_closes_select_admin"' "$MIG14" \
  && grep -q 'create policy "cash_closes_insert_admin"' "$MIG14" \
  && ! grep -q 'create policy "cash_closes_update' "$MIG14" \
  && ! grep -q 'create policy "cash_closes_delete' "$MIG14"; then
  ok "cash_closes: select+insert, SEM update/delete (snapshot imutavel, FIN-10/AC-24)"
else
  ko "cash_closes: policies de RLS ausentes ou permitem update/delete (FIN-10)"
fi

printf '%s\n' '-- 0014: seeds idempotentes (Dízimo 100 / Aluguel 500 / financeiro.teste, FIN-12/AC-30/31)'
if grep -q "'$SEED_RECEITA'" "$MIG14" \
  && grep -q "'$SEED_RECEITA_ID'" "$MIG14" \
  && grep -q "100.00" "$MIG14" \
  && grep -q "'RECEITA'" "$MIG14" \
  && grep -q "'PIX'" "$MIG14" \
  && grep -q 'on conflict (id) do nothing' "$MIG14"; then
  ok "seed RECEITA '$SEED_RECEITA' 100.00 PIX idempotente (AC-30)"
else
  ko "seed RECEITA '$SEED_RECEITA' ausente/incompleta (AC-30)"
fi
if grep -q "'$SEED_DESPESA'" "$MIG14" \
  && grep -q "'$SEED_DESPESA_ID'" "$MIG14" \
  && grep -q "500.00" "$MIG14" \
  && grep -q "'DESPESA'" "$MIG14"; then
  ok "seed DESPESA '$SEED_DESPESA' 500.00 idempotente (AC-30)"
else
  ko "seed DESPESA '$SEED_DESPESA' ausente/incompleta (AC-30)"
fi
if grep -q "$SEED_USER" "$MIG14" \
  && grep -q "'00000000-0000-4000-8000-000000000013'" "$MIG14" \
  && grep -q "'FINANCEIRO'" "$MIG14"; then
  ok "seed $SEED_USER (papel FINANCEIRO, escrita financeiro) (AC-31)"
else
  ko "seed $SEED_USER ausente/incompleta (AC-31)"
fi

# =====================================================================
# ESTATICO — service layer + types + validacao
# =====================================================================
printf '%s\n' '-- src/lib/admin/financeiro.ts (service)'
for fn in listarLancamentos criarLancamento atualizarLancamento cancelarLancamento fecharCaixa listarFechamentos; do
  if grep -q "export async function $fn" "$SERVICE"; then
    ok "service: $fn presente"
  else
    ko "service: $fn ausente"
  fi
done
if grep -q 'export async function previewFechamentoCaixa' "$SERVICE"; then
  ok "service: previewFechamentoCaixa presente (AC-21)"
else
  ko "service: previewFechamentoCaixa ausente (AC-21)"
fi
for err in LancamentoNaoEncontradoError LancamentoConciliadoError LancamentoNaoCancelavelError; do
  if grep -q "class $err" "$SERVICE"; then
    ok "service: $err presente"
  else
    ko "service: $err ausente"
  fi
done
if grep -q '.order("data", { ascending: false })' "$SERVICE"; then
  ok "listarLancamentos: data desc (AC-1/27)"
else
  ko "listarLancamentos: sem order data desc (AC-1/27)"
fi
if grep -q 'status: dados.status ?? "PENDENTE"' "$SERVICE"; then
  ok "criarLancamento: default PENDENTE (AC-3)"
else
  ko "criarLancamento: default PENDENTE ausente (AC-3)"
fi
if grep -q 'existente.status === "CONCILIADO"' "$SERVICE" \
  && grep -q 'throw new LancamentoConciliadoError()' "$SERVICE"; then
  ok "atualizarLancamento: CONCILIADO nao editavel (AC-8)"
else
  ko "atualizarLancamento: guarda CONCILIADO ausente (AC-8)"
fi
if grep -q 'existente.status !== "PENDENTE"' "$SERVICE" \
  && grep -q 'throw new LancamentoNaoCancelavelError()' "$SERVICE"; then
  ok "cancelarLancamento: so PENDENTE cancela (AC-10)"
else
  ko "cancelarLancamento: guarda nao-cancelavel ausente (AC-10)"
fi
if grep -q '.eq("status", "CONCILIADO")' "$SERVICE" \
  && grep -q '.is("cash_close_id", null)' "$SERVICE"; then
  ok "fecharCaixa: agrega apenas CONCILIADO sem cash_close_id (AC-22)"
else
  ko "fecharCaixa: filtro CONCILIADO ausente (AC-22)"
fi

printf '%s\n' '-- src/lib/admin/financeiro-types.ts (tipos/constantes puras, FIN-01)'
if grep -q 'TIPOS_LANCAMENTO' "$TYPES" \
  && grep -q '"RECEITA"' "$TYPES" \
  && grep -q '"DESPESA"' "$TYPES"; then
  ok "TIPOS_LANCAMENTO: RECEITA/DESPESA"
else
  ko "TIPOS_LANCAMENTO incompleto"
fi
if grep -q 'STATUS_LANCAMENTO' "$TYPES" \
  && grep -q '"PENDENTE"' "$TYPES" \
  && grep -q '"CONCILIADO"' "$TYPES" \
  && grep -q '"CANCELADO"' "$TYPES"; then
  ok "STATUS_LANCAMENTO: PENDENTE/CONCILIADO/CANCELADO"
else
  ko "STATUS_LANCAMENTO incompleto"
fi
if grep -q 'METODOS_PAGAMENTO' "$TYPES" \
  && grep -q '"PIX"' "$TYPES" \
  && grep -q '"CARTAO"' "$TYPES" \
  && grep -q '"DINHEIRO"' "$TYPES" \
  && grep -q '"TRANSFERENCIA"' "$TYPES"; then
  ok "METODOS_PAGAMENTO: PIX/CARTAO/DINHEIRO/TRANSFERENCIA (AC-2/4)"
else
  ko "METODOS_PAGAMENTO incompleto (AC-2/4)"
fi

printf '%s\n' '-- src/lib/admin/validacao.ts (validarLancamento)'
if grep -q 'export function validarLancamento' "$VALIDACAO" \
  && grep -q 'modo: "completo" | "parcial"' "$VALIDACAO"; then
  ok "validarLancamento + modo completo/parcial (FIN-02/AC-4/7)"
else
  ko "validarLancamento ausente"
fi
if grep -q 'campos.descricao' "$VALIDACAO" \
  && grep -q 'campos.valor' "$VALIDACAO" \
  && grep -q 'campos.tipo' "$VALIDACAO" \
  && grep -q 'campos.metodo' "$VALIDACAO" \
  && grep -q 'campos.data' "$VALIDACAO"; then
  ok "validarLancamento: validacao por campo (descricao/valor/tipo/metodo/data) (FIN-02)"
else
  ko "validarLancamento: campos incompletos (FIN-02)"
fi

# =====================================================================
# ESTATICO — route handlers (guardas, status codes, sem DELETE)
# =====================================================================
printf '%s\n' '-- rotas /api/admin/financeiro*'
if grep -q 'requireEscrita("financeiro")' "$ROUTE" \
  && grep -q 'status: 201' "$ROUTE" \
  && grep -q 'erroCampos(resultado.campos)' "$ROUTE" \
  && grep -q 'validarLancamento(body, "completo")' "$ROUTE"; then
  ok "POST financeiro: guard + 201 + 400 por campo (FIN-01/02, AC-3/4)"
else
  ko "POST financeiro incompleto (FIN-01/02)"
fi
if grep -q '"23505"' "$ROUTE" \
  && grep -q 'status: 409' "$ROUTE"; then
  ok "POST financeiro: 23505 -> 409 cadastro_duplicado"
else
  ko "POST financeiro: 409 ausente"
fi
if grep -q 'authAdmin("financeiro")' "$ROUTE" \
  && grep -q 'listarLancamentos(filtros)' "$ROUTE"; then
  ok "GET financeiro: guard leitura + listarLancamentos (AC-1/26)"
else
  ko "GET financeiro incompleto"
fi
if grep -q 'validarLancamento(body, "parcial")' "$ID_ROUTE" \
  && grep -q 'LancamentoConciliadoError' "$ID_ROUTE" \
  && grep -q 'transacao_conciliada' "$ID_ROUTE" \
  && grep -q 'LancamentoNaoEncontradoError' "$ID_ROUTE" \
  && grep -q 'nao_encontrado' "$ID_ROUTE" \
  && grep -q 'status: 404' "$ID_ROUTE"; then
  ok "PATCH [id]: parcial + 400 conciliada + 404 nao_encontrado (AC-7/8/11)"
else
  ko "PATCH [id] incompleto"
fi
if grep -q 'requireEscrita("financeiro")' "$CANCEL_ROUTE" \
  && grep -q 'cancelarLancamento(id)' "$CANCEL_ROUTE" \
  && grep -q 'LancamentoNaoCancelavelError' "$CANCEL_ROUTE" \
  && grep -q 'transacao_nao_cancelavel' "$CANCEL_ROUTE"; then
  ok "POST [id]/cancelar: guard + 400 transacao_nao_cancelavel (AC-9/10)"
else
  ko "POST [id]/cancelar incompleto (AC-9/10)"
fi
if grep -q 'listarFechamentos()' "$FECH_ROUTE" \
  && grep -q 'fecharCaixa()' "$FECH_ROUTE" \
  && grep -q 'sem_transacoes_para_fechar' "$FECH_ROUTE" \
  && grep -q 'status: 400' "$FECH_ROUTE" \
  && grep -q 'status: 201' "$FECH_ROUTE"; then
  ok "GET+POST fechamento: listar + fechar + 400 sem_conciliadas (FIN-09/10, AC-20/22/23)"
else
  ko "fechamento/route.ts incompleto"
fi
if ! grep -qE 'method: "DELETE"|async function DELETE' "$ROUTE" \
  && ! grep -qE 'method: "DELETE"|async function DELETE' "$ID_ROUTE"; then
  ok "sem DELETE nas rotas financeiro (soft-delete, FIN-05)"
else
  ko "rotas financeiro contem DELETE (FIN-05)"
fi

printf '%s\n' '-- /api/webhooks/mercadopago (FIN-06/07/08, AC-13..19)'
if grep -q 'event_id' "$WEBHOOK" \
  && grep -q 'webhook_events' "$WEBHOOK" \
  && grep -q 'payload' "$WEBHOOK"; then
  ok "webhook: loga evento em webhook_events (AC-13/19)"
else
  ko "webhook: log de evento ausente (AC-13/19)"
fi
if grep -q '23505' "$WEBHOOK" \
  && grep -qF '{ ok: true }' "$WEBHOOK" \
  && grep -q '"payload_invalido"' "$WEBHOOK" \
  && grep -q 'status: 400' "$WEBHOOK"; then
  ok "webhook: idempotente (23505->200) + payload invalido->400 (AC-14/15)"
else
  ko "webhook: idempotencia/400 ausentes (AC-14/15)"
fi
if grep -q '"approved"' "$WEBHOOK" \
  && grep -q 'status: "CONCILIADO"' "$WEBHOOK" \
  && grep -q 'external_reference' "$WEBHOOK"; then
  ok "webhook: approved cria/atualiza transacao CONCILIADO (AC-16)"
else
  ko "webhook: fluxo approved ausente (AC-16)"
fi
if grep -q 'return NextResponse.json({ ok: true })' "$WEBHOOK"; then
  ok "webhook: ok:true nos nao-approved (AC-17)"
else
  ko "webhook: resposta ok ausente (AC-17)"
fi

# =====================================================================
# ESTATICO — paginas admin
# =====================================================================
printf '%s\n' '-- paginas /admin/financeiro*'
if grep -q '"financeiro", "ler"' "$LISTA" \
  && grep -q 'href="/admin/financeiro/nova"' "$LISTA" \
  && grep -q 'lancamento' "$LISTA"; then
  ok "lista: guard leitura + link novo (AC-1/2)"
else
  ko "lista incompleta"
fi
if grep -q 'lancamento.status' "$LISTA" \
  && grep -q 'lancamento.tipo' "$LISTA" \
  && grep -q 'lancamento.metodo' "$LISTA"; then
  ok "lista: badges status/tipo/metodo (AC-1)"
else
  ko "lista: badges ausentes"
fi
if grep -q 'fetch("/api/admin/financeiro"' "$NOVA_FORM" \
  && grep -q 'method: "POST"' "$NOVA_FORM" \
  && grep -q 'corpo?.campos' "$NOVA_FORM"; then
  ok "nova form: POST + validacao por campo (AC-2/3/4)"
else
  ko "nova form incompleta"
fi
if grep -q 'name="metodo"' "$NOVA_FORM" \
  && grep -q 'name="tipo"' "$NOVA_FORM"; then
  ok "nova form: selects tipo/metodo (AC-2)"
else
  ko "nova form: selects tipo/metodo ausentes"
fi
if grep -q 'listarLancamentos' "$DETALHE" \
  || grep -q 'buscarLancamento' "$DETALHE"; then
  ok "detalhe: busca lancamento por id (AC-6)"
else
  ko "detalhe incompleto (AC-6)"
fi
if grep -q 'FecharCaixaButton' "$FECH_PAGE" \
  && grep -q 'listarFechamentos' "$FECH_PAGE" \
  && grep -q 'previewFechamentoCaixa' "$FECH_PAGE"; then
  ok "fechamento page: listar + preview + botao (AC-20/21)"
else
  ko "fechamento page incompleta (AC-20/21)"
fi
if grep -q 'Prévia do período' "$FECH_BTN" \
  && grep -q 'Confirmar fechamento' "$FECH_BTN" \
  && grep -q 'POST' "$FECH_BTN" \
  && grep -q 'preview.receitas' "$FECH_BTN"; then
  ok "fechar-caixa-button: preview (receitas/despesas/saldo/pendentes) antes de confirmar (AC-21)"
else
  ko "fechar-caixa-button sem preview (AC-21)"
fi

printf '%s\n' '-- /admin (dashboard, card Financeiro — RF-021)'
if grep -q 'href="/admin/financeiro"' "$DASHBOARD" \
  && grep -q 'Wallet' "$DASHBOARD" \
  && grep -q 'Controle de receitas, despesas e caixa' "$DASHBOARD"; then
  ok "card Financeiro no dashboard (RF-021)"
else
  ko "card Financeiro ausente no dashboard"
fi
if grep -q 'Resumo financeiro' "$DASHBOARD" \
  && grep -q 'formatarMoeda(receitas)' "$DASHBOARD" \
  && grep -q 'formatarMoeda(saldo)' "$DASHBOARD"; then
  ok "dashboard: resumo receitas/despesas/saldo (RF-021)"
else
  ko "dashboard: resumo financeiro ausente"
fi
if grep -q 'href="/admin/membros"' "$DASHBOARD" \
  && grep -q 'href="/admin/patrimonio"' "$DASHBOARD"; then
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
JAR_MEMBRO="$(mktemp)"
LEFTOVER="$(mktemp)"
trap '
  # restore seeds p/ PENDENTE + cancela lancamentos PENDENTE criados (best effort)
  curl -s -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/financeiro/$SEED_RECEITA_ID" \
    -H "Content-Type: application/json" -d '{"status":"PENDENTE"}' -o /dev/null 2>/dev/null || true
  curl -s -b "$JAR_ADMIN" -X PATCH "$BASE_URL/api/admin/financeiro/$SEED_DESPESA_ID" \
    -H "Content-Type: application/json" -d '{"status":"PENDENTE"}' -o /dev/null 2>/dev/null || true
  while IFS= read -r LID; do
    [ -n "$LID" ] && curl -s -b "$JAR_ADMIN" -X POST "$BASE_URL/api/admin/financeiro/$LID/cancelar" \
      -o /dev/null 2>/dev/null || true
  done < "$LEFTOVER"
  rm -f "$JAR_ADMIN" "$JAR_FIN" "$JAR_SEC" "$JAR_MEMBRO" "$LEFTOVER"
' EXIT

login_admin() { # jar email -> status|redirect
  curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' -c "$1" -X POST "$BASE_URL/api/auth/login/admin" \
    --data-urlencode "email=$2" --data-urlencode "password=senha-teste" || true
}
login_membro() {
  curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' -c "$1" -X POST "$BASE_URL/api/auth/login" \
    --data-urlencode "email=$2" --data-urlencode "password=senha-teste" || true
}

admin_login="$(login_admin "$JAR_ADMIN" "admin.teste@ivc.local")"
fin_login="$(login_admin "$JAR_FIN" "$SEED_USER")"
sec_login="$(login_admin "$JAR_SEC" "secretaria.teste@ivc.local")"
membro_login="$(login_membro "$JAR_MEMBRO" "membro.teste@ivc.local")"

for entrada in "admin|${admin_login}|admin.teste" "fin|${fin_login}|financeiro.teste" "sec|${sec_login}|secretaria.teste"; do
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

check_api_status "POST /api/admin/financeiro sem sessao -> 401 (AC-5/non-auth)" "401" "POST" "/api/admin/financeiro" "" "-H Content-Type:application/json -d {}"
check_api_status "GET /api/admin/financeiro sem sessao -> 401" "401" "GET" "/api/admin/financeiro" ""
check_api_status "POST /api/webhooks/mercadopago sem auth -> 200 (AC-18)" "200" "POST" "/api/webhooks/mercadopago" "" "-H Content-Type:application/json -d {}"
check_redirect "/admin/financeiro" "307" "$BASE_URL/login/admin"

printf '%s\n' '-- runtime: SECRETARIA (financeiro=ler) — le, escrita 403 (discriminador L-008)'
sec_page="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_SEC" "$BASE_URL/admin/financeiro" || true)"
if [ "$sec_page" = "200" ]; then
  ok "secretaria GET /admin/financeiro -> 200 (financeiro=ler)"
else
  ko "secretaria GET /admin/financeiro -> $sec_page (esperado 200)"
fi
check_api_status "secretaria GET /api/admin/financeiro -> 200 (AC-1/ler)" "200" "GET" "/api/admin/financeiro" "$JAR_SEC"
check_api_status "secretaria POST /api/admin/financeiro -> 403 (AC-5)" "403" "POST" "/api/admin/financeiro" "$JAR_SEC" "-H Content-Type:application/json -d {}"
check_api_status "secretaria POST fechamento -> 403" "403" "POST" "/api/admin/financeiro/fechamento" "$JAR_SEC"

printf '%s\n' '-- runtime: MEMBRO — fail-closed 403 + proxy redirect (MATRIZ-10)'
membro_page="$(curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' -b "$JAR_MEMBRO" "$BASE_URL/admin/financeiro" || true)"
membro_page_status="${membro_page%%|*}"
membro_page_target="${membro_page#*|}"
if [ "$membro_page_status" = "307" ] && [ "$membro_page_target" = "$BASE_URL/login/admin" ]; then
  ok "sessao MEMBRO em /admin/financeiro -> 307 $BASE_URL/login/admin (proxy / MATRIZ-10)"
else
  ko "sessao MEMBRO em /admin/financeiro -> $membro_page_status->$membro_page_target (esperado 307 login/admin)"
fi
check_api_status "MEMBRO POST /api/admin/financeiro -> 403 (MATRIZ-10)" "403" "POST" "/api/admin/financeiro" "$JAR_MEMBRO" "-H Content-Type:application/json -d {}"

# =====================================================================
# RUNTIME — seeds visiveis na lista admin (AC-30)
# =====================================================================
printf '%s\n' '-- runtime: seeds na lista admin'
admin_list="$(curl -s -b "$JAR_FIN" "$BASE_URL/api/admin/financeiro" || true)"
if printf '%s' "$admin_list" | grep -q "$SEED_RECEITA" \
  && printf '%s' "$admin_list" | grep -q "$SEED_DESPESA"; then
  ok "lista admin contem seeds '$SEED_RECEITA' e '$SEED_DESPESA' (AC-30)"
else
  ko "lista admin sem seeds"
fi

# =====================================================================
# RUNTIME — FINANCEIRO: criar lancamento A + validar + CRUD + cancelar
# =====================================================================
printf '%s\n' '-- runtime: CRUD lancamento A (FINANCEIRO, ramo escrever)'
RAND_SUFIXO="$RANDOM$RANDOM"
A_NAME="Probe Lanc ${RAND_SUFIXO}"

a_out="$(curl -s -w '\n%{http_code}' -b "$JAR_FIN" -X POST "$BASE_URL/api/admin/financeiro" \
  -H 'Content-Type: application/json' \
  -d "{\"descricao\":\"$A_NAME\",\"valor\":100,\"tipo\":\"RECEITA\",\"metodo\":\"PIX\",\"data\":\"$(date +%F)\"}" || true)"
a_body="${a_out%$'\n'*}"
a_http="${a_out##*$'\n'}"
A_ID="$(printf '%s' "$a_body" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"
if [ "$a_http" = "201" ] && [ -n "$A_ID" ]; then
  ok "FINANCEIRO POST lancamento -> 201 (AC-3)"
  printf '%s\n' "$A_ID" > "$LEFTOVER"
else
  ko "FINANCEIRO POST lancamento -> $a_http (esperado 201)"
fi
if [ "$a_http" = "201" ] && printf '%s' "$a_body" | grep -q '"status":"PENDENTE"'; then
  ok "lancamento nasce PENDENTE (AC-3)"
else
  ko "lancamento sem status PENDENTE (AC-3)"
fi

printf '%s\n' '-- runtime: POST invalido -> 400 campos (AC-4)'
bad_out="$(curl -s -w '\n%{http_code}' -b "$JAR_FIN" -X POST "$BASE_URL/api/admin/financeiro" \
  -H 'Content-Type: application/json' \
  -d "{\"descricao\":\"\",\"valor\":-1,\"tipo\":\"XPTO\",\"metodo\":\"CARNE\",\"data\":\"10/02/2026\"}" || true)"
bad_http="${bad_out##*$'\n'}"
bad_body="${bad_out%$'\n'*}"
if [ "$bad_http" = "400" ] \
  && printf '%s' "$bad_body" | grep -q 'dados_invalidos' \
  && printf '%s' "$bad_body" | grep -q '"campos"' \
  && printf '%s' "$bad_body" | grep -q '"descricao"' \
  && printf '%s' "$bad_body" | grep -q '"valor"' \
  && printf '%s' "$bad_body" | grep -q '"tipo"' \
  && printf '%s' "$bad_body" | grep -q '"metodo"' \
  && printf '%s' "$bad_body" | grep -q '"data"'; then
  ok "POST invalido -> 400 + {error, campos} discriminado (AC-4)"
else
  ko "POST invalido -> $bad_http sem campos (AC-4)"
fi

printf '%s\n' '-- runtime: PATCH id inexistente -> 404 (AC-11)'
nope_id="99999999-9999-4000-8000-000000000099"
nope_out="$(curl -s -w '\n%{http_code}' -b "$JAR_FIN" -X PATCH "$BASE_URL/api/admin/financeiro/$nope_id" \
  -H 'Content-Type: application/json' \
  -d '{"descricao":"X"}' || true)"
nope_http="${nope_out##*$'\n'}"
nope_body="${nope_out%$'\n'*}"
if [ "$nope_http" = "404" ] && printf '%s' "$nope_body" | grep -q 'nao_encontrado'; then
  ok "PATCH inexistente -> 404 nao_encontrado (AC-11)"
else
  ko "PATCH inexistente -> $nope_http sem nao_encontrado (AC-11)"
fi

if [ -n "$A_ID" ]; then
  A_NAME_EDITED="Probe Editado ${RAND_SUFIXO}"
  patch_a="$(curl -s -w '\n%{http_code}' -b "$JAR_FIN" -X PATCH "$BASE_URL/api/admin/financeiro/$A_ID" \
    -H 'Content-Type: application/json' \
    -d "{\"descricao\":\"$A_NAME_EDITED\",\"categoria\":\"Oferta\"}" || true)"
  patch_a_http="${patch_a##*$'\n'}"
  patch_a_body="${patch_a%$'\n'*}"
  if [ "$patch_a_http" = "200" ] && printf '%s' "$patch_a_body" | grep -q "$A_NAME_EDITED"; then
    ok "PATCH A campos -> 200 descricao atualizada (AC-7)"
  else
    ko "PATCH A campos -> $patch_a_http (esperado 200)"
  fi
  curl -s -b "$JAR_FIN" -X PATCH "$BASE_URL/api/admin/financeiro/$A_ID" \
    -H 'Content-Type: application/json' -d "{\"descricao\":\"$A_NAME\"}" -o /dev/null 2>/dev/null || true

  get_a="$(curl -s -w '\n%{http_code}' -b "$JAR_FIN" "$BASE_URL/api/admin/financeiro/$A_ID" || true)"
  get_a_http="${get_a##*$'\n'}"
  get_a_body="${get_a%$'\n'*}"
  if [ "$get_a_http" = "200" ] && printf '%s' "$get_a_body" | grep -q "\"$A_ID\""; then
    ok "GET [id] -> 200 detalhe do lancamento (AC-6)"
  else
    ko "GET [id] -> $get_a_http (esperado 200)"
  fi

  printf '%s\n' '-- runtime: cancelamento (soft-delete, AC-9/10)'
  cancel_out="$(curl -s -w '\n%{http_code}' -b "$JAR_FIN" -X POST "$BASE_URL/api/admin/financeiro/$A_ID/cancelar" || true)"
  cancel_http="${cancel_out##*$'\n'}"
  cancel_body="${cancel_out%$'\n'*}"
  if [ "$cancel_http" = "200" ] && printf '%s' "$cancel_body" | grep -q '"status":"CANCELADO"'; then
    ok "POST cancelar PENDENTE -> 200 CANCELADO (AC-9)"
  else
    ko "POST cancelar -> $cancel_http sem CANCELADO (AC-9)"
  fi

  cancel2="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_FIN" -X POST "$BASE_URL/api/admin/financeiro/$A_ID/cancelar" || true)"
  if [ "$cancel2" = "400" ]; then
    ok "cancelar de novo (CANCELADO) -> 400 (AC-10)"
  else
    ko "cancelar de novo -> $cancel2 (esperado 400)"
  fi
  patch_conciliada_pre="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_FIN" -X PATCH "$BASE_URL/api/admin/financeiro/$A_ID" \
    -H 'Content-Type: application/json' -d '{"categoria":"Oferta"}' || true)"
  if [ "$patch_conciliada_pre" = "200" ]; then
    ok "PATCH CANCELADO permite edicao (sem guarda p/ cancelado, AC-8 cobre CONCILIADO)"
  else
    ko "PATCH CANCELADO -> $patch_conciliada_pre"
  fi
fi

# =====================================================================
# RUNTIME — WRITE-ONLY echo: webhook approved cria + PATCH CONCILIADO (AC-8/16)
# =====================================================================
printf '%s\n' '-- runtime: webhook approved (AC-16) + idempotencia (AC-14)'
WH_REF="pay-${RAND_SUFIXO}000"
wh_out="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/webhooks/mercadopago" \
  -H 'Content-Type: application/json' \
  -d "{\"id\":\"evt-${RAND_SUFIXO}\",\"type\":\"payment\",\"action\":\"payment.created\",\"data\":{\"id\":\"$WH_REF\",\"status\":\"approved\",\"transaction_amount\":42.5,\"description\":\"Doacao webhook probe\"}}" || true)"
wh_http="${wh_out##*$'\n'}"
wh_body="${wh_out%$'\n'*}"
if [ "$wh_http" = "200" ] && printf '%s' "$wh_body" | grep -qF '{"ok":true}'; then
  ok "webhook approved -> 200 ok:true (AC-13/16)"
else
  ko "webhook approved -> $wh_http $wh_body (esperado 200 ok)"
fi
if [ "$wh_http" = "200" ]; then
  admin_lancamentos="$(curl -s -b "$JAR_ADMIN" "$BASE_URL/api/admin/financeiro?busca=webhook+probe" || true)"
  if printf '%s' "$admin_lancamentos" | grep -q "$WH_REF" \
    && printf '%s' "$admin_lancamentos" | grep -q '"status":"CONCILIADO"' \
    && printf '%s' "$admin_lancamentos" | grep -q '"tipo":"RECEITA"' \
    && printf '%s' "$admin_lancamentos" | grep -q '"metodo":"PIX"'; then
    ok "webhook approved criou transacao RECEITA/PIX/CONCILIADO + external_reference (AC-16)"
  else
    ko "webhook approved nao criou transacao CONCILIADO (AC-16)"
  fi
fi
wh_dup="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/webhooks/mercadopago" \
  -H 'Content-Type: application/json' \
  -d "{\"id\":\"evt-${RAND_SUFIXO}\",\"type\":\"payment\",\"action\":\"payment.created\",\"data\":{\"id\":\"$WH_REF\",\"status\":\"approved\"}}" || true)"
if [ "$wh_dup" = "200" ]; then
  ok "webhook evento duplicado -> 200 (idempotente, AC-14)"
else
  ko "webhook duplicado -> $wh_dup (esperado 200)"
fi
admin_lancamentos2="$(curl -s -b "$JAR_ADMIN" "$BASE_URL/api/admin/financeiro?busca=webhook+probe" || true)"
if [ "$(printf '%s' "$admin_lancamentos2" | grep -o "$WH_REF" | wc -l)" = "1" ]; then
  ok "webhook duplicado NAO duplicou transacao (AC-14)"
else
  ko "webhook duplicado criou segunda transacao (AC-14)"
fi

wh_fail_out="$(curl -s -w '\n%{http_code}' -b "$JAR_ADMIN" -X POST "$BASE_URL/api/webhooks/mercadopago" \
  -H 'Content-Type: application/json' \
  -d "{\"id\":\"evt-fail-${RAND_SUFIXO}\",\"type\":\"payment\",\"action\":\"payment.updated\",\"data\":{\"id\":\"pay-fail-${RAND_SUFIXO}\",\"status\":\"rejected\"}}" || true)"
wh_fail_http="${wh_fail_out##*$'\n'}"
if [ "$wh_fail_http" = "200" ]; then
  ok "webhook status != approved -> 200 (apenas log, AC-17)"
else
  ko "webhook nao-approved -> $wh_fail_http (esperado 200)"
fi
# M-H v4: status != approved NAO deve criar transacao (assert negativo determinístico)
fail_lancamentos="$(curl -s -b "$JAR_ADMIN" "$BASE_URL/api/admin/financeiro?busca=webhook+probe" || true)"
if ! printf '%s' "$fail_lancamentos" | grep -q "pay-fail-${RAND_SUFIXO}"; then
  ok "webhook nao-approved NAO criou transacao (assert negativo, AC-17)"
else
  ko "webhook nao-approved criou transacao indevida (AC-17)"
fi
wh_inv="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/api/webhooks/mercadopago" \
  -H 'Content-Type: application/json' -d 'nao-json' || true)"
if [ "$wh_inv" = "400" ]; then
  ok "webhook payload invalido -> 400 (AC-15)"
else
  ko "webhook payload invalido -> $wh_inv (esperado 400)"
fi

# =====================================================================
# RUNTIME — fechamento de caixa: preparar CONCILIADO + preview + POST (AC-20..25)
# =====================================================================
printf '%s\n' '-- runtime: fechamento de caixa (FIN-09/10)'
# cria 2 RECEITA CONCILIADO + 1 DESPESA PENDENTE p/ o snapshot (teste AC-21/22)
c1_out="$(curl -s -w '\n%{http_code}' -b "$JAR_FIN" -X POST "$BASE_URL/api/admin/financeiro" \
  -H 'Content-Type: application/json' \
  -d "{\"descricao\":\"Probe Fecho R1 ${RAND_SUFIXO}\",\"valor\":200,\"tipo\":\"RECEITA\",\"metodo\":\"PIX\",\"data\":\"$(date +%F)\"}" || true)"
C1_ID="$(printf '%s' "${c1_out%$'\n'*}" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"
c2_out="$(curl -s -w '\n%{http_code}' -b "$JAR_FIN" -X POST "$BASE_URL/api/admin/financeiro" \
  -H 'Content-Type: application/json' \
  -d "{\"descricao\":\"Probe Fecho R2 ${RAND_SUFIXO}\",\"valor\":300,\"tipo\":\"RECEITA\",\"metodo\":\"PIX\",\"data\":\"$(date +%F)\"}" || true)"
C2_ID="$(printf '%s' "${c2_out%$'\n'*}" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"
c3_out="$(curl -s -w '\n%{http_code}' -b "$JAR_FIN" -X POST "$BASE_URL/api/admin/financeiro" \
  -H 'Content-Type: application/json' \
  -d "{\"descricao\":\"Probe Fecho D1 ${RAND_SUFIXO}\",\"valor\":50,\"tipo\":\"DESPESA\",\"metodo\":\"PIX\",\"data\":\"$(date +%F)\"}" || true)"
C3_ID="$(printf '%s' "${c3_out%$'\n'*}" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"

# A esta altura o webhook probe pode ja ter criado uma CONCILIADO; marcamos as
# 2 receitas como CONCILIADO via PATCH (permitido em PENDENTE).
for CID in "$C1_ID" "$C2_ID"; do
  [ -n "$CID" ] && curl -s -b "$JAR_FIN" -X PATCH "$BASE_URL/api/admin/financeiro/$CID" \
    -H 'Content-Type: application/json' -d '{"status":"CONCILIADO"}' -o /dev/null 2>/dev/null || true
done

printf '%s\n' '-- runtime: POST fechamento inicial absorve CONCILIADO pendentes (AC-22)'
fech_vazio="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_FIN" -X POST "$BASE_URL/api/admin/financeiro/fechamento" || true)"
# Pode haver CONCILIADO pendente do webhook probe e/ou C1/C2 (marcadas acima);
# este POST absorve tudo e limpa o estado para o snapshot deterministico a seguir.
if [ "$fech_vazio" = "400" ] || [ "$fech_vazio" = "201" ]; then
  ok "POST fechamento inicial -> $fech_vazio (absorve CONCILIADO pendentes; AC-22)"
else
  ko "POST fechamento inicial -> $fech_vazio (esperado 201 ou 400)"
fi

# snapshot deterministico: criar 2 CONCILIADO (R1=150 RECEITA, R2=50 DESPESA)
r1_out="$(curl -s -w '\n%{http_code}' -b "$JAR_FIN" -X POST "$BASE_URL/api/admin/financeiro" \
  -H 'Content-Type: application/json' \
  -d "{\"descricao\":\"Probe Fecho Final1 ${RAND_SUFIXO}\",\"valor\":150,\"tipo\":\"RECEITA\",\"metodo\":\"PIX\",\"data\":\"$(date +%F)\"}" || true)"
R1_ID="$(printf '%s' "${r1_out%$'\n'*}" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"
r2_out="$(curl -s -w '\n%{http_code}' -b "$JAR_FIN" -X POST "$BASE_URL/api/admin/financeiro" \
  -H 'Content-Type: application/json' \
  -d "{\"descricao\":\"Probe Fecho Final2 ${RAND_SUFIXO}\",\"valor\":50,\"tipo\":\"DESPESA\",\"metodo\":\"PIX\",\"data\":\"$(date +%F)\"}" || true)"
R2_ID="$(printf '%s' "${r2_out%$'\n'*}" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"
for RID in "$R1_ID" "$R2_ID"; do
  [ -n "$RID" ] && curl -s -b "$JAR_FIN" -X PATCH "$BASE_URL/api/admin/financeiro/$RID" \
    -H 'Content-Type: application/json' -d '{"status":"CONCILIADO"}' -o /dev/null 2>/dev/null || true
done

printf '%s\n' '-- runtime: PATCH em transacao CONCILIADO -> 400 (AC-8)'
if [ -n "$R1_ID" ]; then
  patch_conc="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_FIN" -X PATCH "$BASE_URL/api/admin/financeiro/$R1_ID" \
    -H 'Content-Type: application/json' -d '{"descricao":"edit conciliada"}' || true)"
  if [ "$patch_conc" = "400" ]; then
    ok "PATCH transacao CONCILIADO -> 400 transacao_conciliada (AC-8)"
  else
    ko "PATCH transacao CONCILIADO -> $patch_conc (esperado 400, AC-8)"
  fi
else
  ko "R1_ID vazio — nao foi possivel testar PATCH em CONCILIADO (AC-8)"
fi

printf '%s\n' '-- runtime: preview page (AC-21) — numeros exatos na DOM admin'
fech_page="$(curl -s -b "$JAR_FIN" "$BASE_URL/admin/financeiro/fechamento" || true)"
if printf '%s' "$fech_page" | grep -q 'data-testid="preview-fechamento"' \
  && printf '%s' "$fech_page" | grep -q 'Prévia do período' \
  && printf '%s' "$fech_page" | grep -qP 'R\$\s*150,00' \
  && printf '%s' "$fech_page" | grep -qP 'R\$\s*50,00' \
  && printf '%s' "$fech_page" | grep -qP 'R\$\s*100,00'; then
  ok "preview fechamento: receitas 150,00 / despesas 50,00 / saldo 100,00 (AC-21)"
else
  ko "preview fechamento sem numeros deterministicos 150/50/100 (AC-21)"
fi
if printf '%s' "$fech_page" | grep -q 'Fechar caixa' \
  && (printf '%s' "$fech_page" | grep -q 'Nenhum fechamento realizado' \
      || printf '%s' "$fech_page" | grep -q 'Receitas'); then
  ok "fechamento page: listagem + botao (AC-20; empty state ou historico de snapshots)"
else
  ko "fechamento page incompleta (AC-20)"
fi

snap_out="$(curl -s -w '\n%{http_code}' -b "$JAR_FIN" -X POST "$BASE_URL/api/admin/financeiro/fechamento" || true)"
snap_http="${snap_out##*$'\n'}"
snap_body="${snap_out%$'\n'*}"
if [ "$snap_http" = "201" ] && printf '%s' "$snap_body" | grep -q '"saldo"'; then
  ok "POST fechamento -> 201 snapshot criado (AC-22)"
else
  ko "POST fechamento -> $snap_http sem snapshot (AC-22)"
fi
if [ "$snap_http" = "201" ]; then
  # Apos o POST inicial acumulsor acima, o snapshot so contem R1(150 RECEITA)+R2(50 DESPESA):
  # assert EXATO mata o sensor que trocava o reduce de tipo (total_receitas somando DESPESA).
  SNAP_TOTAL_REC="$(printf '%s' "$snap_body" | sed -n 's/.*"total_receitas":\([-0-9.]*\).*/\1/p')"
  SNAP_TOTAL_DESP="$(printf '%s' "$snap_body" | sed -n 's/.*"total_despesas":\([-0-9.]*\).*/\1/p')"
  SNAP_QTD="$(printf '%s' "$snap_body" | sed -n 's/.*"qtd_transacoes":\([0-9]*\).*/\1/p')"
  rec_ok="$(awk -v a="$SNAP_TOTAL_REC" -v b=150 'BEGIN{print (a+0==b+0)?"1":"0"}')"
  desp_ok="$(awk -v a="$SNAP_TOTAL_DESP" -v b=50 'BEGIN{print (a+0==b+0)?"1":"0"}')"
  qtd_ok="$(awk -v a="$SNAP_QTD" -v b=2 'BEGIN{print (a+0==b+0)?"1":"0"}')"
  if [ "$rec_ok" = "1" ] && [ "$desp_ok" = "1" ] && [ "$qtd_ok" = "1" ]; then
    ok "snapshot totais exatos: receitas=150 despesas=50 qtd=2 (AC-22)"
  else
    ko "snapshot totais errados: receitas=$SNAP_TOTAL_REC (esperado 150) despesas=$SNAP_TOTAL_DESP (esperado 50) qtd=$SNAP_QTD (esperado 2) — sensor de tipo (AC-22)"
  fi
  fech_list="$(curl -s -b "$JAR_FIN" "$BASE_URL/api/admin/financeiro/fechamento" || true)"
  # confirma snapshot visivel na lista (por criado recente: primeiro item)
  if printf '%s' "$fech_list" | grep -q "$(printf '%s' "$snap_body" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)"; then
    ok "GET /api/admin/financeiro/fechamento lista o snapshot criado (AC-20)"
  else
    ko "lista de fechamentos sem o snapshot criado (AC-20)"
  fi
  # apos o snapshot, nao ha mais CONCILIADO pendentes -> proximo POST deve ser 400
  fech_pos="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR_FIN" -X POST "$BASE_URL/api/admin/financeiro/fechamento" || true)"
  if [ "$fech_pos" = "400" ]; then
    ok "POST fechamento apos snapshot -> 400 sem_transacoes_para_fechar determinístico (AC-23)"
  else
    ko "POST fechamento pos-snapshot -> $fech_pos (esperado 400 determinístico, AC-23)"
  fi
else
  ko "AC-22/23 skipped — snapshot 201 nao obtido (preview/saldo ok acima)"
fi

# =====================================================================
# RUNTIME — dashboard admin: card Financeiro (RF-021)
# =====================================================================
printf '%s\n' '-- runtime: dashboard /admin (RF-021)'
dash="$(curl -s -b "$JAR_ADMIN" "$BASE_URL/admin" || true)"
if printf '%s' "$dash" | grep -q 'Financeiro' \
  && printf '%s' "$dash" | grep -q '/admin/financeiro' \
  && printf '%s' "$dash" | grep -q 'Resumo financeiro'; then
  ok "dashboard admin contem card Financeiro + resumo (RF-021)"
else
  ko "dashboard admin sem card Financeiro"
fi
if printf '%s' "$dash" | grep -q 'Membros' \
  && printf '%s' "$dash" | grep -q 'Patrimônio' \
  && printf '%s' "$dash" | grep -q 'Eventos'; then
  ok "dashboard admin preserva cards pre-existentes (regressao)"
else
  ko "dashboard admin perdeu cards pre-existentes"
fi

# =====================================================================
# RUNTIME — filtros cumulativos (AC-26)
# =====================================================================
printf '%s\n' '-- runtime: filtros tipo/status/data (AC-26)'
f_tipo="$(curl -s -b "$JAR_FIN" "$BASE_URL/api/admin/financeiro?tipo=DESPESA" || true)"
if printf '%s' "$f_tipo" | grep -q '"lancamentos":' && ! printf '%s' "$f_tipo" | grep -q '"tipo":"RECEITA"'; then
  ok "filtro tipo=DESPESA retorna somente despesas (AC-26)"
else
  ko "filtro tipo=DESPESA permitiu RECEITA (AC-26)"
fi
f_status="$(curl -s -b "$JAR_FIN" "$BASE_URL/api/admin/financeiro?status=CANCELADO" || true)"
if printf '%s' "$f_status" | grep -q '"lancamentos":' \
  && ! printf '%s' "$f_status" | grep -q '"status":"PENDENTE"' \
  && ! printf '%s' "$f_status" | grep -q '"status":"CONCILIADO"'; then
  ok "filtro status=CANCELADO retorna somente cancelados (AC-26)"
else
  ko "filtro status=CANCELADO permitiu outro status (AC-26)"
fi
f_pp="$(curl -s -b "$JAR_FIN" "$BASE_URL/api/admin/financeiro?status=PENDENTE,CONCILIADO" || true)"
if printf '%s' "$f_pp" | grep -q '"status":"PENDENTE"' \
  && printf '%s' "$f_pp" | grep -q '"status":"CONCILIADO"' \
  && ! printf '%s' "$f_pp" | grep -q '"status":"CANCELADO"'; then
  ok "filtro status=PENDENTE,CONCILIADO (multi-valor cumulativo, AC-26)"
else
  ko "filtro multi-status falhou (AC-26)"
fi
f_data="$(curl -s -b "$JAR_FIN" "$BASE_URL/api/admin/financeiro?data_inicio=$(date +%F)&data_fim=$(date +%F)" || true)"
if printf '%s' "$f_data" | grep -q '"lancamentos":' \
  && printf '%s' "$f_data" | grep -q '"data":"'"$(date +%F)"'"'; then
  ok "filtro período hoje..hoje traz lançamentos de hoje (AC-26)"
else
  ko "filtro período hoje..hoje vazio/inválido (AC-26)"
fi
f_tipo_status="$(curl -s -b "$JAR_FIN" "$BASE_URL/api/admin/financeiro?tipo=DESPESA&status=PENDENTE&data_inicio=$(date +%F)&data_fim=$(date +%F)" || true)"
if printf '%s' "$f_tipo_status" | grep -q '"tipo":"DESPESA"' \
  && printf '%s' "$f_tipo_status" | grep -q '"status":"PENDENTE"' \
  && ! printf '%s' "$f_tipo_status" | grep -q '"tipo":"RECEITA"' \
  && ! printf '%s' "$f_tipo_status" | grep -q '"status":"CONCILIADO"' \
  && ! printf '%s' "$f_tipo_status" | grep -q '"status":"CANCELADO"'; then
  ok "filtros cumulativos tipo+status+período aplicados juntos (AC-26)"
else
  ko "filtros cumulativos falharam (AC-26)"
fi
f_empty="$(curl -s -b "$JAR_FIN" "$BASE_URL/admin/financeiro?busca=zzz-sem-resultado-probe" || true)"
if printf '%s' "$f_empty" | grep -q 'Nenhum lançamento encontrado'; then
  ok "busca sem resultado exibe empty state 'Nenhum lançamento encontrado' (AC-29)"
else
  ko "empty state nao exibido na busca sem resultado (AC-29)"
fi

# cleanup final best effort (trap tambem faz)
: > "$LEFTOVER"
[ -n "${C1_ID:-}" ] && printf '%s\n' "$C1_ID" >> "$LEFTOVER"
[ -n "${C2_ID:-}" ] && printf '%s\n' "$C2_ID" >> "$LEFTOVER"
[ -n "${C3_ID:-}" ] && printf '%s\n' "$C3_ID" >> "$LEFTOVER"
[ -n "${R1_ID:-}" ] && printf '%s\n' "$R1_ID" >> "$LEFTOVER"
[ -n "${R2_ID:-}" ] && printf '%s\n' "$R2_ID" >> "$LEFTOVER"

printf '\nProbes admin-financeiro: %d ok, %d falhas\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]