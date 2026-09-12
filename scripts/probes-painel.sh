#!/usr/bin/env bash
#
# Probes por AC da feature painel-membro (substituem runner até F10 — AD-006).
# Uso: BASE_URL=<url> bash scripts/probes-painel.sh   (default http://localhost:3000)
# Requer o servidor no ar: `npm run dev` (ou `npm run start` após build).
#
# Estático:
#   - seed versionado em supabase/migrations/0002_seed_painel_membro.sql
#     (1 membro IVC-0001 + 2 avisos visíveis; estado do dev verificado via MCP)
#   - buildBrCodePessoal em src/lib/pix.ts (txid = matrícula, chave institucional)
# HTTP (servidor dev/start deve estar no ar):
#   - redirects do proxy nas rotas do painel sem sessão (PAINEL-03)
#   - 401 nos POSTs de /api/painel/* sem sessão
#   - /painel com sessão real (seed membro.teste@ivc.local) -> 200
#
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SEED="$ROOT/supabase/migrations/0002_seed_painel_membro.sql"
STORAGE="$ROOT/supabase/migrations/0003_storage_fotos_membros.sql"
SEED2="$ROOT/supabase/migrations/0004_seed_membro_sem_cadastro.sql"
PIXLIB="$ROOT/src/lib/pix.ts"
AVISOSLIB="$ROOT/src/lib/painel/avisos.ts"
DIZIMO="$ROOT/src/app/painel/dizimo/page.tsx"
CARTAO="$ROOT/src/app/painel/cartao/page.tsx"
PERFILROUTE="$ROOT/src/app/api/painel/perfil/route.ts"

PASS=0
FAIL=0
ok() { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
ko() { FAIL=$((FAIL + 1)); printf '  FAIL %s\n' "$1"; }

printf '== Probes painel-membro (AC) — BASE_URL=%s ==\n' "$BASE_URL"

# --- Seed (fonte versionada; estado real do dev verificado via MCP) ---
printf '%s\n' '-- seed (0002_seed_painel_membro.sql)'
if grep -q "membro.teste@ivc.local" "$SEED"; then
  ok "seed contem usuario auth de teste"
else
  ko "seed nao contem membro.teste@ivc.local"
fi
if grep -q "IVC-0001" "$SEED"; then
  ok "seed contem membro com matricula IVC-0001"
else
  ko "seed nao contem matricula IVC-0001"
fi
if grep -q "Culto de Gratidão" "$SEED"; then
  ok "seed contem aviso visivel passado (Culto de Gratidao)"
else
  ko "seed nao contem aviso Culto de Gratidao"
fi
if grep -q "Campanha de Missões" "$SEED"; then
  ok "seed contem aviso visivel futuro (Campanha de Missoes)"
else
  ko "seed nao contem aviso Campanha de Missoes"
fi

# --- PAINEL-01 | avisos no painel: filtro visibilidade + ordenacao desc por data_hora ---
printf '%s\n' '-- avisos (src/lib/painel/avisos.ts)'
if grep -q '.eq("visivel", true)' "$AVISOSLIB"; then
  ok "avisos filtrados por visivel=true (nao mostra ocultos)"
else
  ko "avisos nao filtram visivel=true"
fi
if grep -q '.order("data_hora", { ascending: false })' "$AVISOSLIB"; then
  ok "avisos ordenados por data_hora desc (mais recente primeiro)"
else
    ko "avisos nao ordenam por data_hora desc"
fi

# --- PAINEL-07 | membro sem cadastro (sem linha em members): redirect ?primeiro=1 ---
printf '%s\n' '-- dizimo/cartao p/ membro sem cadastro (PAINEL-07)'
if grep -Fq 'redirect("/painel/perfil?primeiro=1")' "$DIZIMO"; then
  ok "dizimo redireciona p/ /painel/perfil?primeiro=1 quando membro sem cadastro"
else
  ko "dizimo nao redireciona p/ ?primeiro=1 (sem cadastro)"
fi
if grep -Fq 'redirect("/painel/perfil?primeiro=1")' "$CARTAO"; then
  ok "cartao redireciona p/ /painel/perfil?primeiro=1 quando membro sem cadastro"
else
  ko "cartao nao redireciona p/ ?primeiro=1 (sem cadastro)"
fi

# --- PAINEL-16 | perfil: valida payload (nome/nascimento/whatsapp) e responde 400 ---
printf '%s\n' '-- perfil route valida campos (PAINEL-16)'
if grep -q 'campos.nome' "$PERFILROUTE"; then
  ok "route valida campo nome"
else
  ko "route nao valida campo nome"
fi
if grep -q 'campos.whatsapp' "$PERFILROUTE"; then
  ok "route valida campo whatsapp"
else
  ko "route nao valida campo whatsapp"
fi
if grep -q 'campos\.nascimento' "$PERFILROUTE"; then
  ok "route valida campo nascimento (campos.nascimento -> 400)"
else
  ko "route nao valida campo nascimento via campos.nascimento"
fi
if grep -q 'status: 400' "$PERFILROUTE"; then
  ok "route responde 400 em dados invalidos"
else
  ko "route nao responde 400"
fi

# --- PAINEL-05/06/08 | buildBrCodePessoal: txid = matrícula, chave institucional ---
printf '%s\n' '-- buildBrCodePessoal (src/lib/pix.ts)'
if grep -q "export function buildBrCodePessoal" "$PIXLIB"; then
  ok "buildBrCodePessoal exportada"
else
  ko "buildBrCodePessoal nao exportada"
fi
if grep -q "txid: matricula" "$PIXLIB"; then
  ok "txtid recebe a matricula do membro"
else
  ko "txid nao recebe matricula"
fi
if grep -q "key: PIX.key" "$PIXLIB"; then
  ok "chave PIX permanece institucional (PIX.key / CNPJ)"
else
  ko "chave PIX nao usa PIX.key"
fi
if grep -Fq 'emv("62", referenceLabel)' "$PIXLIB"; then
  ok "payload contem campo 62 (referencia)"
else
  ko "campo 62 ausente no payload"
fi
if grep -Fq 'emv("05", txid ?? "***")' "$PIXLIB"; then
  ok "campo 62/05 usa txid (matricula) no payload pessoal"
else
  ko "campo 62/05 nao usa txid"
fi

# --- PAINEL-03 | redirects do proxy nas rotas do painel (sem sessão) ---
printf '%s\n' '-- proxy redirects (sem sessao)'

redirect_target() {
  curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' "$BASE_URL$1" || true
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
check_redirect "/painel/dizimo" "307" "$BASE_URL/login"
check_redirect "/painel/cartao" "307" "$BASE_URL/login"
check_redirect "/painel/perfil" "307" "$BASE_URL/login"

# --- API sem sessão: 401 (rotas fora do proxy, guard próprio) ---
printf '%s\n' '-- POST /api/painel/* sem sessao'

check_api_401() {
  local path="$1" code
  code="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE_URL$path" || true)"
  if [ "$code" = "000" ]; then
    ko "POST $path -> servidor nao responde em $BASE_URL"
  elif [ "$code" = "401" ]; then
    ok "POST $path -> 401"
  else
    ko "POST $path -> $code (esperado 401)"
  fi
}

check_api_401 "/api/painel/perfil"
check_api_401 "/api/painel/perfil/foto"

# --- PAINEL-03/13 | sessão real via seed: login + /painel -> 200 ---
printf '%s\n' '-- /painel com sessao (seed membro.teste@ivc.local)'
jar="$(mktemp)"
login_out="$(curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' -c "$jar" \
  -X POST "$BASE_URL/api/auth/login" \
  --data-urlencode 'email=membro.teste@ivc.local' \
  --data-urlencode 'password=senha-teste' || true)"
login_status="${login_out%%|*}"
login_target="${login_out#*|}"
if [ "$login_status" = "307" ] && [ "$login_target" = "$BASE_URL/painel" ]; then
  code="$(curl -s -o /dev/null -w '%{http_code}' -b "$jar" "$BASE_URL/painel" || true)"
  if [ "$code" = "200" ]; then
    ok "login seed + /painel -> 200"
  else
    ko "/painel com sessao -> $code (esperado 200)"
  fi
else
  ko "login seed -> $login_status $login_target (esperado 307 $BASE_URL/painel)"
fi
rm -f "$jar"

# --- PAINEL-07/16 | runtime: 2º seed (sem cadastro) + dados inválidos no perfil ---
printf '\n%s\n' '-- PAINEL-07/16 runtime (seed membro.semcadastro@ivc.local)'
jar2="$(mktemp)"
login2_out="$(curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' -c "$jar2" \
  -X POST "$BASE_URL/api/auth/login" \
  --data-urlencode 'email=membro.semcadastro@ivc.local' \
  --data-urlencode 'password=senha-teste' || true)"
login2_status="${login2_out%%|*}"
login2_target="${login2_out#*|}"
if [ "$login2_status" = "307" ] && [ "$login2_target" = "$BASE_URL/painel" ]; then
  dizimo2="$(curl -s -o /dev/null -w '%{http_code}|%{redirect_url}' -b "$jar2" "$BASE_URL/painel/dizimo" || true)"
  dizimo2_code="${dizimo2%%|*}"
  dizimo2_target="${dizimo2#*|}"
  if [ "$dizimo2_code" = "307" ] && [ "$dizimo2_target" = "$BASE_URL/painel/perfil?primeiro=1" ]; then
    ok "sem cadastro: /painel/dizimo -> 307 /painel/perfil?primeiro=1"
  else
    ko "sem cadastro: /painel/dizimo -> $dizimo2_code $dizimo2_target (esperado 307 $BASE_URL/painel/perfil?primeiro=1)"
  fi
  invalido="$(curl -s -o /dev/null -w '%{http_code}' -b "$jar2" -X POST "$BASE_URL/api/painel/perfil" \
    --data-urlencode 'nome=Maria da Silva' --data-urlencode 'whatsapp=83988887777' \
    --data-urlencode 'nascimento=nao-data' || true)"
  if [ "$invalido" = "400" ]; then
    ok "POST perfil campos invalidos -> 400 (PAINEL-16)"
  else
    ko "POST perfil invalido -> $invalido (esperado 400)"
  fi
  # PAINEL-13/15/19 caminho feliz: autocadastro válido deve gerar 201 com
  # matrícula IVC-0002 (sequence versionada + RPC security definer, imune a
  # RLS). Cenário real: user sem row em members (seed 0004) faz POST válido —
  # se o fix regredir (ex.: RPC removida), o transform vira 409 repetido.
  feliz_body="$(curl -s -b "$jar2" -X POST "$BASE_URL/api/painel/perfil" \
    --data-urlencode 'nome=Maria da Silva' \
    --data-urlencode 'whatsapp=83988887777' \
    --data-urlencode 'nascimento=1995-03-14' || true)"
  feliz_code="$(printf '%s' "$feliz_body" | sed -n 's/.*"matricula":"\([^"]*\)".*/\1/p')"
  if printf '%s' "$feliz_body" | grep -q 'IVC-0002' && printf '%s' "$feliz_body" | grep -q '"id"'; then
    ok "autocadastro valido -> 201 + matricula IVC-0002 (PAINEL-13/15/19)"
  else
    ko "autocadastro valido -> NÃO gerou IVC-0002 (resposta: $(printf '%s' "$feliz_body" | head -c 120))"
  fi
else
  ko "login 2o seed -> $login2_status $login2_target (esperado 307 $BASE_URL/painel)"
fi
rm -f "$jar2"

printf '\nProbes painel-membro: %d ok, %d falhas\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]