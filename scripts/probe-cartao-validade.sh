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
CARD="$ROOT/src/components/MemberCard.tsx"
PERFIL="$ROOT/src/app/api/painel/perfil/route.ts"
ADMIN_LIB="$ROOT/src/lib/admin/membros.ts"

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
# --- CART-04/05/06/07: rotas e services usam a normalização ---
if ! grep -q 'dadosDocumento' "$PERFIL"; then
  ko "CART-04 rota do perfil nao usa dadosDocumento"
fi
if ! grep -q 'rg\?: string | null' "$ROOT/src/lib/painel/members.ts"; then
  ko "CART-04 MemberDados nao declara rg opcional"
fi

# --- CART-09/11: MemberCard usa o cálculo rolante, não a coluna crua ---
if ! grep -q 'calcularValidadeCartao' "$CARD"; then
  ko "CART-09 MemberCard nao usa calcularValidadeCartao"
fi
if grep -q 'member.validade_cartao' "$CARD"; then
  ko "CART-09 MemberCard ainda exibe a coluna bruta validade_cartao"
fi
if ! grep -q 'criado_em' "$CARD"; then
  ko "CART-11 MemberCard nao deriva a validade de criado_em"
fi

# --- CART-13/14: migration com trigger e backfill idempotente ---
MIG="$ROOT/supabase/migrations/0024_validade_cartao.sql"
if [ ! -f "$MIG" ]; then
  ko "CART-13/14 migration 0024 ausente"
elif ! grep -qi 'create or replace function' "$MIG" \
  || ! grep -qi 'drop trigger if exists' "$MIG" \
  || ! grep -qi 'where validade_cartao is null' "$MIG"; then
  ko "CART-13/14 migration 0024 sem trigger/backfill idempotente"
fi

fi # fim do bloco de integração (--domain pula)

# --- CART-04..07 + CART-09..12: runtime node sobre os módulos puros ---
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
npx tsc "$DOC" "$VAL" --outDir "$TMP" --module commonjs --target es2020 \
  --moduleResolution node --esModuleInterop --skipLibCheck >/dev/null 2>&1 \
  || ko "compilacao dos modulos p/ teste falhou"

DOC_JS="$(find "$TMP" -name 'documento.js' -print -quit)"
VAL_JS="$(find "$TMP" -name 'validade.js' -print -quit)"

if [ ! -f "$DOC_JS" ] || [ ! -f "$VAL_JS" ]; then
  ko "modulos compilados nao encontrados"
else
  if DOC_J="$DOC_JS" VAL_J="$VAL_JS" node -e '
const assert = require("assert");
const D = require(process.env.DOC_J);
const V = require(process.env.VAL_J);

const HOJE = new Date(2026, 9, 1); // 2026-10-01, calendário local

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
assert.strictEqual(V.calcularValidadeCartao("2026-09-13", new Date(2026, 9, 1)), "2027-09-13", "mesmo ano -> +1 ano");
assert.strictEqual(V.calcularValidadeCartao("2026-09-13", new Date(2027, 8, 13)), "2027-09-13", "1 dia antes -> ainda +1");
assert.strictEqual(V.calcularValidadeCartao("2026-09-13", new Date(2027, 8, 14)), "2028-09-13", "1 dia depois -> +2 (renovou)");
assert.strictEqual(V.calcularValidadeCartao("2026-09-13", new Date(2027, 8, 13)), "2027-09-13", "limite inclusivo no próprio dia");
assert.strictEqual(V.calcularValidadeCartao("2026-09-13", new Date(2031, 0, 1)), "2031-09-13", "ciclo ainda corrente em 2031 -> 2031-09-13");
assert.strictEqual(V.calcularValidadeCartao("2026-09-13", new Date(2031, 8, 14)), "2032-09-13", "5 anos depois -> +6 (renovou)");
assert.strictEqual(V.calcularValidadeCartao("2026-01-01", new Date(2026, 0, 1)), "2027-01-01", "registro hoje -> +1 ano");

// created_at futuro: não é "corrigido" para hoje
assert.strictEqual(V.calcularValidadeCartao("2030-06-15", new Date(2026, 9, 1)), "2031-06-15", "criado_em futuro conta a partir dele");

// rollover de ano bissexto em member real
assert.strictEqual(V.calcularValidadeCartao("2024-02-29", new Date(2025, 2, 1)), "2026-02-28", "29/02/2024 com hoje 01/03/2025 -> 28/02/2026");

// ── CART-11: criado_em chega como timestamptz ISO, não como data civil
assert.strictEqual(V.calcularValidadeCartao("2026-09-13T14:22:31.123Z", HOJE), "2027-09-13", "ISO com Z aceito");
assert.strictEqual(V.calcularValidadeCartao("2026-09-13T00:30:00-03:00", HOJE), "2027-09-13", "ISO com offset aceito");
assert.strictEqual(V.calcularValidadeCartao("2026-09-13T23:30:00-03:00", HOJE), "2027-09-13", "ISO 23:30 -03:00 aceito");
assert.strictEqual(V.dataCivil("2026-09-13T00:30:00-03:00"), "2026-09-13", "dataCivil com offset");
assert.strictEqual(V.dataCivil("lixo"), null, "dataCivil lixo -> null");
assert.strictEqual(V.dataCivil(null), null, "dataCivil null -> null");

// ── CART-12: entrada inválida -> null
assert.strictEqual(V.calcularValidadeCartao(null, HOJE), null, "null -> null");
assert.strictEqual(V.calcularValidadeCartao(undefined, HOJE), null, "undefined -> null");
assert.strictEqual(V.calcularValidadeCartao("", HOJE), null, "vazio -> null");
assert.strictEqual(V.calcularValidadeCartao("13/09/2026", HOJE), null, "formato inválido -> null");
assert.strictEqual(V.calcularValidadeCartao("2026-13-01", HOJE), null, "mês inválido -> null");
assert.strictEqual(V.aniversario("nao-data", 1), null, "aniversario inválido -> null");

// determinismo
assert.strictEqual(
  V.calcularValidadeCartao("2026-09-13", new Date(2026, 9, 1)),
  V.calcularValidadeCartao("2026-09-13", new Date(2026, 9, 1)),
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
