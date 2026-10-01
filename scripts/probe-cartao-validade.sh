#!/usr/bin/env bash
#
# Probes por AC da feature cartao-valididade-anual (CART-01..CART-14).
# Uso: bash scripts/probe-cartao-validade.sh   (node + npx via nvm — PATH ativado)
#
# Estático: services/rotas/card usam as regras de documento e o cálculo rolante.
# Runtime (node): valida os módulos puros compilados — normalização/rejeição de
# RG, CPF e data de batismo (CART-04..07) e o cálculo de validade com clamp
# 29/02, limite inclusivo e created_at futuro (CART-09..12).
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOC="$ROOT/src/lib/painel/documento.ts"
VAL="$ROOT/src/lib/painel/validade.ts"
CART="$ROOT/src/lib/painel/cartao.ts"
UI_CARD="$ROOT/src/components/MemberCard.tsx"
PERFIL="$ROOT/src/app/api/painel/perfil/route.ts"
ADMIN_LIB="$ROOT/src/lib/admin/membros.ts"
ADMIN_CREATE="$ROOT/src/app/api/admin/membros/route.ts"
ADMIN_EDIT="$ROOT/src/app/api/admin/membros/[id]/dados/route.ts"
PERFIL_FORM="$ROOT/src/app/painel/perfil/perfil-form.tsx"
ADMIN_NOVO="$ROOT/src/app/admin/membros/novo/membro-novo-form.tsx"
ADMIN_EDICAO="$ROOT/src/app/admin/membros/[id]/page.tsx"

if ! command -v node >/dev/null 2>&1; then
  export PATH="$HOME/.nvm/versions/node/v$(cat "$ROOT/.nvmrc").0/bin:$PATH"
fi

# `--domain` roda somente as asserções de domínio puro (gate quick da fase 1,
# tasks T1-T3). Sem o flag, roda o probe completo — o gate full/build das fases
# 2 e 3, que inclui rotas, MemberCard e migration.
SOMENTE_DOMINIO=0
[ "${1:-}" = "--domain" ] && SOMENTE_DOMINIO=1

PASS=0
FAIL=0
ok() { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
ko() { FAIL=$((FAIL + 1)); printf '  FAIL %s\n' "$1"; }

printf '== Probes cartao-valididade-anual (CART)%s ==\n' "$([ "$SOMENTE_DOMINIO" -eq 1 ] && printf ' [dominio]')"

if [ "$SOMENTE_DOMINIO" -eq 0 ]; then
# Os guards estáticos abaixo operam sobre o ARQUIVO COM COMENTÁRIOS REMOVIDOS.
# Sem isso um grep de token é satisfeito pelo import (`import { civilDe }`) ou
# por uma frase no cabeçalho da migration, e o gate passa enquanto o
# comportamento some — foi exatamente o que o sensor de mutação pegou.
sem_comentarios() {
  sed -e 's|--[^\n]*||' "$1" | sed -e '/^[[:space:]]*$/d'
}

# `chama` exige o símbolo em posição de uso, não em import. Captura a saída
# antes de filtrar em vez de encadear `grep -q`: com `pipefail`, o `grep -q`
# fecha o pipe cedo, o `sed` upstream morre por SIGPIPE e o guard fica flaky
# (passava num arquivo e falhava no outro sem mudança no código).
chama() {
  local codigo
  codigo="$(sem_comentarios "$1" | grep -Ev '^[[:space:]]*import([\\{[:space:]]|.* from )')" || true
  printf '%s' "$codigo" | grep -cE '(^|[^[:alnum:]_])'"$2"'[[:space:]]*\(' >/dev/null
}

# Mesmo cuidado de `chama` para busca literal: captura antes de casar.
contem() {
  local codigo
  codigo="$(sem_comentarios "$1")" || true
  printf '%s' "$codigo" | grep -qF "$2"
}

# --- CART-04: rota e services produzem as colunas de documento
for rota in "$PERFIL" "$ADMIN_CREATE" "$ADMIN_EDIT"; do
  case "$rota" in
    *painel/perfil*) nome="painel/perfil/route.ts" ;;
    *membros/\[id\]*) nome="admin/membros/[id]/dados/route.ts" ;;
    *) nome="admin/membros/route.ts" ;;
  esac
  if chama "$rota" 'lerDocumentoForm'; then
    ok "CART-04 $nome le o documento do form"
  else
    ko "CART-04 $nome sem chamada a lerDocumentoForm"
  fi
done
for svc in "$ROOT/src/lib/painel/members.ts" "$ADMIN_LIB"; do
  if chama "$svc" 'colunasDocumento'; then
    ok "CART-04 $(basename "$svc") monta as colunas via whitelist"
  else
    ko "CART-04 $(basename "$svc") sem chamada a colunasDocumento"
  fi
done

# --- CART-01/02/03: cada formulario aceita os tres campos e envia o trio
# Rótulo do AC conforme o formulário: criação/edição no admin (CART-01/02) e
# autoedição do membro no painel (CART-03).
rotular() {
  case "$1" in
    *perfil-form*) printf 'CART-03' ;;
    *membro-novo-form*) printf 'CART-01' ;;
    *) printf 'CART-02' ;;
  esac
}
for alvo in "$PERFIL_FORM" "$ADMIN_NOVO" "$ADMIN_EDICAO"; do
  nome="$(basename "$alvo")"
  ac="$(rotular "$alvo")"
  for campo in rg cpf data_batismo; do
    if contem "$alvo" "name=\"$campo\""; then
      ok "$ac $nome tem input $campo"
    else
      ko "$ac $nome sem input $campo"
    fi
  done
  # O limite do input é `max={civilDe(new Date())}`; exigir a chamada evita que
  # o simples import satisfaça o gate.
  if contem "$alvo" 'civilDe(new Date())'; then
    ok "CART-06 $nome limita a data de batismo no calendario civil"
  else
    ko "CART-06 $nome sem limite de data de batismo"
  fi
done

# --- CART-09/11: MemberCard consome o mapa testavel, não a coluna crua
if chama "$UI_CARD" 'camposCartao'; then
  ok "CART-09 MemberCard monta os campos via camposCartao"
else
  ko "CART-09 MemberCard sem chamada a camposCartao"
fi
if contem "$UI_CARD" 'validade_cartao'; then
  ko "CART-09 MemberCard ainda le a coluna bruta validade_cartao"
else
  ok "CART-09 MemberCard nao le mais a coluna bruta"
fi

# --- CART-13/14: migration com trigger e backfill idempotente
# Exige a ATRIBUIÇÃO dentro do corpo do trigger (não a palavra "trigger" num
# comentário) e a cláusula `is null` no WHERE do backfill.
MIG="$ROOT/supabase/migrations/0024_validade_cartao.sql"
if [ ! -f "$MIG" ]; then
  ko "CART-13/14 migration 0024 ausente"
else
  sql="$(sem_comentarios "$MIG" | tr 'A-Z' 'a-z' | tr -s '[:space:]' ' ')"
  if printf '%s' "$sql" | grep -q 'create or replace function public.members_ciclo_base' \
    && printf '%s' "$sql" | grep -q 'create or replace function public.members_set_validade_cartao'; then
    ok "CART-13/14 0024 declara as duas funcoes"
  else
    ko "CART-13/14 0024 sem as funcoes de ciclo-base e trigger"
  fi
  if printf '%s' "$sql" | grep -q 'new.validade_cartao := public.members_ciclo_base(new.criado_em)'; then
    ok "CART-13 trigger atribui ciclo-base derivado de criado_em"
  else
    ko "CART-13 trigger nao atribui members_ciclo_base(new.criado_em)"
  fi
  if printf '%s' "$sql" | grep -q 'before insert or update on public.members'; then
    ok "CART-13 trigger e BEFORE INSERT OR UPDATE"
  else
    ko "CART-13 trigger nao cobre insert e update"
  fi
  if printf '%s' "$sql" | grep -q 'drop trigger if exists members_validade_cartao'; then
    ok "CART-13 trigger recreation idempotente"
  else
    ko "CART-13 trigger sem drop if exists"
  fi
  if printf '%s' "$sql" | grep -q 'where validade_cartao is null'; then
    ok "CART-14 backfill restrito a validade_cartao IS NULL"
  else
    ko "CART-14 backfill nao restrito a IS NULL (sobrescreveria valores)"
  fi
  if printf '%s' "$sql" | grep -q 'at time zone' ; then
    ok "CART-11 ciclo-base fixado no fuso civil, nao no da sessao"
  else
    ko "CART-11 ciclo-base depende do TimeZone da sessao"
  fi
fi

fi # fim do bloco de integração (--domain pula)

# --- CART-04..07 + CART-09..12: runtime node sobre os módulos puros ---
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
npx tsc "$DOC" "$VAL" "$CART" --outDir "$TMP" --module commonjs --target es2020 \
  --moduleResolution node --esModuleInterop --skipLibCheck >/dev/null 2>&1 \
  || ko "compilacao dos modulos p/ teste falhou"

DOC_JS="$(find "$TMP" -name 'documento.js' -print -quit)"
VAL_JS="$(find "$TMP" -name 'validade.js' -print -quit)"
CART_JS="$(find "$TMP" -name 'cartao.js' -print -quit)"

if [ ! -f "$DOC_JS" ] || [ ! -f "$VAL_JS" ] || [ ! -f "$CART_JS" ]; then
  ko "modulos compilados nao encontrados"
else
  if DOC_J="$DOC_JS" VAL_J="$VAL_JS" CART_J="$CART_JS" node -e '
const assert = require("assert");
const D = require(process.env.DOC_J);
const V = require(process.env.VAL_J);
const C = require(process.env.CART_J);

// Instantes construídos com deslocamento explícito de -03:00 (fuso civil da
// igreja) para que o dia civil esperado não dependa do TZ da máquina de teste.
const d = (y, m, dia) => new Date(`${y}-${String(m).padStart(2, "0")}-${String(dia).padStart(2, "0")}T12:00:00-03:00`);
const HOJE = d(2026, 10, 1); // 2026-10-01 no calendário civil

// ── CART-05: CPF
assert.strictEqual(D.normalizarCpf("12345678909").valor, "12345678909", "CPF cru");
assert.strictEqual(D.normalizarCpf("  12345678909 ").valor, "12345678909", "CPF com espaço");
assert.strictEqual(D.normalizarCpf("123.456.789-09").valor, "12345678909", "CPF com máscara");
assert.strictEqual(D.normalizarCpf("").ok, true, "CPF vazio é válido");
assert.strictEqual(D.normalizarCpf("   ").valor, "", "CPF só espaços -> vazio");
assert.strictEqual(D.normalizarCpf("1234567890").ok, false, "CPF 10 dígitos rejeitado");
assert.strictEqual(D.normalizarCpf("123456789099").ok, false, "CPF 12 dígitos rejeitado");
assert.strictEqual(D.normalizarCpf("abcdefghijk").ok, false, "CPF só letras rejeitado");
assert.strictEqual(D.normalizarCpf("1234567890a").ok, false, "CPF 11 com letra rejeitado");
assert.strictEqual(D.normalizarCpf("123\n45678909").ok, false, "CPF com newline rejeitado");

// ── CART-07: RG
assert.strictEqual(D.normalizarRg(" 12.345.678-9 ").valor, "12.345.678-9", "RG com máscara preservada");
assert.strictEqual(D.normalizarRg("").valor, "", "RG vazio");
assert.strictEqual(D.normalizarRg("x".repeat(20)).ok, true, "RG 20 chars aceito");
assert.strictEqual(D.normalizarRg("x".repeat(21)).ok, false, "RG 21 chars rejeitado");
assert.strictEqual(D.normalizarRg("123\n456").ok, false, "RG com newline rejeitado");
assert.strictEqual(D.normalizarRg("123\t456").ok, false, "RG com tab rejeitado");

// ── CART-06: data de batismo
assert.strictEqual(D.normalizarDataBatismo("2020-05-10", HOJE).valor, "2020-05-10", "batismo passado");
assert.strictEqual(D.normalizarDataBatismo("", HOJE).valor, "", "batismo vazio");
assert.strictEqual(D.normalizarDataBatismo("2026-10-01", HOJE).ok, true, "batismo hoje aceito");
assert.strictEqual(D.normalizarDataBatismo("2026-10-02", HOJE).ok, false, "batismo futuro rejeitado");
assert.strictEqual(D.normalizarDataBatismo("2026-02-30", HOJE).ok, false, "overflow 02-30 rejeitado");
assert.strictEqual(D.normalizarDataBatismo("2026-13-01", HOJE).ok, false, "mês 13 rejeitado");
assert.strictEqual(D.normalizarDataBatismo("10/05/2020", HOJE).ok, false, "formato DD/MM/YYYY rejeitado");
assert.strictEqual(D.normalizarDataBatismo("2020-5-1", HOJE).ok, false, "sem zero à esquerda rejeitado");

// ── CART-04: agregado converte vazio em NULL, nunca string vazia
const agg = D.dadosDocumento({ rg: "", cpf: "  ", dataBatismo: "" }, HOJE);
assert.deepStrictEqual(agg.campos, {}, "agregado sem erros quando vazio");
assert.strictEqual(agg.dados.rg, null, "rg vazio -> null");
assert.strictEqual(agg.dados.cpf, null, "cpf vazio -> null");
assert.strictEqual(agg.dados.data_batismo, null, "batismo vazio -> null");

const agg2 = D.dadosDocumento({ rg: "12.345.678-9", cpf: "123.456.789-09", dataBatismo: "2020-05-10" }, HOJE);
assert.deepStrictEqual(agg2.campos, {}, "agregado sem erros quando válido");
assert.deepStrictEqual(agg2.dados, { rg: "12.345.678-9", cpf: "12345678909", data_batismo: "2020-05-10" }, "agregado normalizado");

const agg3 = D.dadosDocumento({ rg: "x".repeat(21), cpf: "123", dataBatismo: "2030-01-01" }, HOJE);
assert.deepStrictEqual(Object.keys(agg3.campos).sort(), ["cpf", "data_batismo", "rg"], "agregado reporta os 3 campos");

// ── CART-10: clamp 29/02 -> 28/02
assert.strictEqual(V.aniversario("2024-02-29", 1), "2025-02-28", "29/02 + 1 ano = 28/02");
assert.strictEqual(V.aniversario("2024-02-29", 4), "2028-02-29", "29/02 + 4 anos = 29/02 bissexto");
assert.strictEqual(V.aniversario("2024-02-29", 2), "2026-02-28", "29/02 + 2 anos = 28/02");
assert.strictEqual(V.aniversario("2023-02-28", 1), "2024-02-28", "28/02 + 1 ano = 28/02");

// ── CART-09/11: rolagem com limite inclusivo
assert.strictEqual(V.calcularValidadeCartao("2026-09-13", d(2026,10,1)), "2027-09-13", "mesmo ano -> +1 ano");
assert.strictEqual(V.calcularValidadeCartao("2026-09-13", d(2027,9,13)), "2027-09-13", "1 dia antes -> ainda +1");
assert.strictEqual(V.calcularValidadeCartao("2026-09-13", d(2027,9,14)), "2028-09-13", "1 dia depois -> +2 (renovou)");
assert.strictEqual(V.calcularValidadeCartao("2026-09-13", d(2027,9,13)), "2027-09-13", "limite inclusivo no próprio dia");
assert.strictEqual(V.calcularValidadeCartao("2026-09-13", d(2031,1,1)), "2031-09-13", "ciclo ainda corrente em 2031 -> 2031-09-13");
assert.strictEqual(V.calcularValidadeCartao("2026-09-13", d(2031,9,14)), "2032-09-13", "5 anos depois -> +6 (renovou)");
assert.strictEqual(V.calcularValidadeCartao("2026-01-01", d(2026,1,1)), "2027-01-01", "registro hoje -> +1 ano");

// created_at futuro: não é "corrigido" para hoje
assert.strictEqual(V.calcularValidadeCartao("2030-06-15", d(2026,10,1)), "2031-06-15", "criado_em futuro conta a partir dele");

// rollover de ano bissexto em member real
assert.strictEqual(V.calcularValidadeCartao("2024-02-29", d(2025,3,1)), "2026-02-28", "29/02/2024 com hoje 01/03/2025 -> 28/02/2026");

// ── CART-11: criado_em chega como timestamptz ISO, não como data civil
assert.strictEqual(V.calcularValidadeCartao("2026-09-13T14:22:31.123Z", HOJE), "2027-09-13", "ISO com Z aceito");
assert.strictEqual(V.calcularValidadeCartao("2026-09-13T00:30:00-03:00", HOJE), "2027-09-13", "ISO com offset aceito");
assert.strictEqual(V.calcularValidadeCartao("2026-09-13T23:30:00-03:00", HOJE), "2027-09-13", "ISO 23:30 -03:00 aceito");
assert.strictEqual(V.dataCivil("2026-09-13T00:30:00-03:00"), "2026-09-13", "dataCivil com offset -03:00");
assert.strictEqual(V.dataCivil("2026-09-13T23:30:00-03:00"), "2026-09-13", "dataCivil 23:30 -03:00 não vira dia 14");
assert.strictEqual(V.dataCivil("2026-09-14T00:30:00Z"), "2026-09-13", "dataCivil 00:30Z é dia anterior no Brasil");
// o cálculo NÃO pode variar com o TZ do processo (Vercel roda UTC)
const sobUtc = process.env.TZ; process.env.TZ = "UTC";
assert.strictEqual(V.calcularValidadeCartao("2026-09-13T23:30:00-03:00", new Date("2027-09-14T00:30:00-03:00")), "2028-09-13", "rolagem estável em TZ=UTC");
process.env.TZ = "Asia/Tokyo";
assert.strictEqual(V.calcularValidadeCartao("2026-09-13T23:30:00-03:00", new Date("2027-09-14T00:30:00-03:00")), "2028-09-13", "rolagem estável em TZ=Asia/Tokyo");
process.env.TZ = sobUtc;
assert.strictEqual(V.dataCivil("lixo"), null, "dataCivil lixo -> null");
assert.strictEqual(V.dataCivil(null), null, "dataCivil null -> null");

// ── CART-12: entrada inválida -> null
assert.strictEqual(V.calcularValidadeCartao(null, HOJE), null, "null -> null");
assert.strictEqual(V.calcularValidadeCartao(undefined, HOJE), null, "undefined -> null");
assert.strictEqual(V.calcularValidadeCartao("", HOJE), null, "vazio -> null");
assert.strictEqual(V.calcularValidadeCartao("13/09/2026", HOJE), null, "formato inválido -> null");
assert.strictEqual(V.calcularValidadeCartao("2026-13-01", HOJE), null, "mês inválido -> null");
assert.strictEqual(V.aniversario("nao-data", 1), null, "aniversario inválido -> null");

// ── CART-01/02/03: o que a rota extrai do FormData chega normalizado aos services
const fd = (o) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.append(k, v); return f; };

const viaForm = D.lerDocumentoForm(fd({ rg: " 12.345.678-9 ", cpf: "123.456.789-09", data_batismo: "2020-05-10" }), HOJE);
assert.deepStrictEqual(viaForm.dados, { rg: "12.345.678-9", cpf: "12345678909", data_batismo: "2020-05-10" }, "lerDocumentoForm normaliza");
assert.deepStrictEqual(viaForm.campos, {}, "lerDocumentoForm sem erro");

const viaFormVazio = D.lerDocumentoForm(fd({}), HOJE);
assert.deepStrictEqual(viaFormVazio.dados, { rg: null, cpf: null, data_batismo: null }, "FormData vazio -> 3 NULLs");
assert.deepStrictEqual(Object.keys(viaFormVazio.dados).sort(), ["cpf","data_batismo","rg"], "as 3 chaves presentes");

const viaFormErro = D.lerDocumentoForm(fd({ rg: "x".repeat(21), cpf: "1", data_batismo: "2030-01-01" }), HOJE);
assert.deepStrictEqual(Object.keys(viaFormErro.campos).sort(), ["cpf","data_batismo","rg"], "erros por campo no FormData");

// ── CART-04: a whitelist de colunas e o contrato dos services
// Bug real que a assinatura permite: aceitar `""` como se fosse valor gravaria
// string vazia na coluna, que e estado distinto de NULL.
assert.deepStrictEqual(D.colunasDocumento({}), { rg: null, cpf: null, data_batismo: null }, "payload vazio -> 3 NULLs");
assert.deepStrictEqual(
  D.colunasDocumento({ rg: "12.345.678-9", cpf: "12345678909", data_batismo: "2020-05-10" }),
  { rg: "12.345.678-9", cpf: "12345678909", data_batismo: "2020-05-10" },
  "payload completo preservado"
);
assert.deepStrictEqual(D.colunasDocumento({ rg: "", cpf: "" }), { rg: null, cpf: null, data_batismo: null }, "string vazia -> NULL");
// a funcao nao aceita nem propaga colunas sensiveis: nem status, nem matricula
assert.deepStrictEqual(
  Object.keys(D.colunasDocumento({ rg: "x", cpf: "y", data_batismo: "z", status: "ATIVO", matricula: "IVC-1", criado_em: "2020-01-01" })).sort(),
  ["cpf", "data_batismo", "rg"],
  "whitelist barra colunas sensiveis (status/matricula/criado_em)"
);

// ── CART-08/09/11: o que o cartao EXIBE, com hoje injetado
const base = {
  matricula: "IVC-0001", nome: "Miguel Ernandes", nascimento: "2004-12-28", whatsapp: "84999766852",
  rg: "12.345.678-9", cpf: "12345678909", data_batismo: "2020-05-10",
  criado_em: "2026-09-13T02:01:52.560567+00:00", foto_url: null,
};
const c1 = C.camposCartao(base, d(2026,10,1));
assert.strictEqual(c1.rg, "12.345.678-9", "CART-08 rg lido do row");
assert.strictEqual(c1.cpf, "12345678909", "CART-08 cpf lido do row");
assert.strictEqual(c1.baptismDate, "10/05/2020", "CART-08 batismo formatado pt-BR");
// criado_em 02:01Z do IVC-0001 equivale a 12/09 23:01 no Brasil: o dia civil
// do registro e 12/09, e o cartao tem de mostrar 12/09/2027. Asseverar 13/09
// aqui provaria que o dia esta sendo lido em UTC.
assert.strictEqual(c1.validity, "12/09/2027", "CART-09 ciclo corrente no calendario civil");
assert.strictEqual(
  C.camposCartao({ ...base, criado_em: "2026-09-13T12:00:00-03:00" }, d(2026,10,1)).validity,
  "13/09/2027",
  "CART-09 mesmo dia civil em UTC e -03:00"
);
assert.strictEqual(c1.id, "IVC-0001", "matricula");
assert.strictEqual(c1.name, "Miguel Ernandes", "nome");
assert.strictEqual(c1.photo, undefined, "foto ausente -> undefined");

// NULL em qualquer um dos tres -> "—" (CART-08) e a validade continua calculada
const c2 = C.camposCartao({ ...base, rg: null, cpf: null, data_batismo: null }, d(2026,10,1));
assert.strictEqual(c2.rg, "—", "CART-08 rg NULL -> —");
assert.strictEqual(c2.cpf, "—", "CART-08 cpf NULL -> —");
assert.strictEqual(c2.baptismDate, "—", "CART-08 batismo NULL -> —");
assert.strictEqual(c2.validity, "12/09/2027", "validade independe dos campos de documento");

// a validade EXIBIDA e o ciclo corrente, nao a coluna do banco
// ciclo-base do fixture: 12/09/2027 — o dia seguinte ja renovou
const c3 = C.camposCartao(base, d(2027,9,13));
assert.strictEqual(c3.validity, "12/09/2028", "CART-09 rollover no cartao (1 dia apos)");
const c4 = C.camposCartao(base, d(2027,9,12));
assert.strictEqual(c4.validity, "12/09/2027", "CART-10 limite inclusivo no cartao");
assert.strictEqual(C.camposCartao(base, d(2027,9,11)).validity, "12/09/2027", "CART-10 vespera ainda e o ciclo atual");

// criado_em inutilizavel -> "—" sem crash (CART-12 / P2 AC-7)
const c5 = C.camposCartao({ ...base, criado_em: "" }, d(2026,10,1));
assert.strictEqual(c5.validity, "—", "CART-12 criado_em vazio -> —");
const c6 = C.camposCartao({ ...base, criado_em: "lixo" }, d(2026,10,1));
assert.strictEqual(c6.validity, "—", "CART-12 criado_em invalido -> —");

// fmtData: formato pt-BR e hoje invalido
assert.strictEqual(C.fmtData("2026-09-13"), "13/09/2026", "fmtData pt-BR");
assert.strictEqual(C.fmtData(null), "—", "fmtData null");
assert.strictEqual(C.fmtData("13/09/2026"), "—", "fmtData formato errado -> —");
assert.strictEqual(C.fmtData("2026-02-30"), "—", "fmtData data inexistente -> —");

// determinismo
assert.strictEqual(
  C.camposCartao(base, d(2026,10,1)).validity,
  C.camposCartao(base, d(2026,10,1)).validity,
  "determinismo"
);
console.log("ok");
'; then
    ok "CART-04..07/09..12 runtime node: normalização, rejeições e validade rolante"
  else
    ko "CART-04..07/09..12 runtime node falhou (detalhes acima)"
  fi
fi

printf '== Resumo: %s ok / %s falhas ==\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
