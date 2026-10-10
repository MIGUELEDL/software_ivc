#!/usr/bin/env bash
#
# Probes por AC da feature barcode-membro (BRC-01..05 + edge cases).
# Uso: bash scripts/probe-barcode.sh   (node + npx via nvm — PATH ativado)
#
# Estático: MemberCard monta as barras a partir do encoder real (não um
# gradiente decorativo), o payload do barcode é a matrícula, e o componente
# degrada sem barras (RangeError / matrícula ausente).
# Runtime (node): valida a tabela Code 128 (107 símbolos) por invariantes
# estruturais, amostras da fonte, sequência exata hardcoded para "IVC-0001"
# (checksum 10), determinismo, orientação barra/espaço, o mapper do cartão
# (campos.id <- matrícula) e RangeError.
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LIB="$ROOT/src/lib/barcode/code128.ts"
CART="$ROOT/src/lib/painel/cartao.ts"
VAL="$ROOT/src/lib/painel/validade.ts"
CARD="$ROOT/src/components/MemberCard.tsx"

if ! command -v node >/dev/null 2>&1; then
  export PATH="$HOME/.nvm/versions/node/v$(cat "$ROOT/.nvmrc").0/bin:$PATH"
fi

PASS=0
FAIL=0
ok() { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
ko() { FAIL=$((FAIL + 1)); printf '  FAIL %s\n' "$1"; }

printf '== Probes barcode-membro (BRC) ==\n'

# --- BRC-01: render usa o encoder real e o payload é a matrícula ---
# O componente do código de barras tem de montar as barras a partir do encoder
# real (code128Runs sobre code128) e NÃO ser um gradiente decorativo. A checagem
# anterior grevava um literal de layout que nunca existiu no componente, então um
# gradiente reintroduzido passava. Aqui o alvo é o corpo de Code128Barcode.
BC_BODY="$(awk '/^function Code128Barcode/{f=1} f{print} f && /^}/{exit}' "$CARD")"
if grep -q 'code128Runs(code128(value)' "$CARD" && grep -q 'r.bar' "$CARD"; then
  ok "BRC-01 MemberCard monta as barras via code128Runs(code128(value))"
else
  ko "BRC-01 MemberCard nao monta as barras a partir do encoder"
fi
if printf '%s' "$BC_BODY" | grep -qi 'gradient'; then
  ko "BRC-01 gradiente decorativo no componente do barcode"
else
  ok "BRC-01 componente do barcode sem gradiente decorativo"
fi
# Conjunção de payload: o barcode consome `campos.id` e `campos.id` projeta a
# matrícula do membro. Sem os dois, um valor fixo (ou o nome) passaria.
if grep -qF 'Code128Barcode value={campos.id}' "$CARD" \
   && grep -qE 'id:[[:space:]]*member\.matricula' "$CART"; then
  ok "BRC-01 payload do barcode e a matricula (campos.id <- member.matricula)"
else
  ko "BRC-01 payload do barcode nao esta amarrado a matricula"
fi

# --- BRC-04: matrícula legível sob as barras ---
# A matrícula deve aparecer como texto humano logo após o bloco do barcode
# (não o dígito de checksum). A verificação é estrutural: um nó de texto
# `{campos.id}` imediatamente após `<Code128Barcode`, independente das
# unidades de layout (cqw/mm) usadas pelo refactor responsivo do cartão.
if awk 'f && /\{campos\.id\}/{found=1} /<Code128Barcode/{f=1} END{exit !found}' "$CARD"; then
  ok "BRC-04 matricula legivel logo abaixo das barras"
else
  ko "BRC-04 falhou ao localizar texto humano da matricula abaixo das barras"
fi

# --- Edge cases (spec): erro/ausência degrada sem barras, sem crashar ---
# RangeError (caractere fora de ASCII) e matrícula ausente caem no mesmo
# caminho: o componente captura e renderiza um placeholder sem barras mantendo o
# texto humano. Falha se o try/catch, o ramo vazio ou o rótulo sumirem.
if printf '%s' "$BC_BODY" | grep -q 'catch' \
   && printf '%s' "$BC_BODY" | grep -qF 'runs.length === 0' \
   && printf '%s' "$BC_BODY" | grep -qF 'Código de barras indisponível'; then
  ok "BRC-EDGE encoder protegido: erro/matricula ausente degrada sem barras"
else
  ko "BRC-EDGE componente do barcode nao trata erro (RangeError / matricula ausente)"
fi

# --- BRC-02/03/05: compila o encoder puro e valida via node ---
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
npx tsc "$LIB" "$CART" "$VAL" --outDir "$TMP" --module commonjs --target es2020 --moduleResolution node --esModuleInterop --skipLibCheck >/dev/null 2>&1 || ko "compilacao dos modulos p/ teste falhou"
JS="$(find "$TMP" -name 'code128.js' -print -quit)"
CART_JS="$(find "$TMP" -name 'cartao.js' -print -quit)"

if [ ! -f "$JS" ] || [ ! -f "$CART_JS" ]; then
  ko "modulos compilados nao encontrados"
else
  if LIB_J="$JS" CART_J="$CART_JS" node -e '
const assert = require("assert");
const P = require(process.env.LIB_J);
const T = P.CODE128_TABLE;

// BRC-03: invariantes estruturais de TODA a tabela (107 símbolos)
let bad = 0;
for (let v = 0; v <= 106; v++) {
  const pat = T[v];
  if (!/^[01]{11}$/.test(pat)) { bad++; continue; }
  const ones = (pat.match(/1/g) || []).length;
  if (ones % 2 !== 0) bad++;
  if ((11 - ones) % 2 !== 1) bad++;
  if ((pat.match(/1+|0+/g) || []).some((r) => r.length > 4)) bad++;
}
assert.strictEqual(bad, 0, "BRC-03 estrutura da tabela");

// BRC-02: amostras da fonte (start, stop, checksum, dígitos)
const anchors = [
  [103, "11010000100"], [104, "11010010000"], [105, "11010011100"], [106, "11000111010"],
  [40, "11000101000"], [41, "11000100010"], [54, "11101011000"], [35, "10001000110"],
  [13, "10011011100"], [16, "10011101100"], [17, "10011100110"], [24, "11101001100"],
  [25, "11100101100"], [34, "10001011000"], [56, "11100010110"], [67, "10000101100"],
  [78, "11000010100"], [87, "11110010100"],
];
for (const [v, exp] of anchors) assert.strictEqual(T[v], exp, `BRC-02 ancoragem valor ${v}`);

// BRC-02: sequência exata para IVC-0001 (8 símbolos, checksum 10)
const expected =
  "11010010000" + // START B (104)
  "11000100010" + "11101011000" + "10001000110" + "10011011100" + // IVC-
  "10011101100" + "10011101100" + "10011101100" + "10011100110" + // 0001
  "11001000100" + // checksum 10
  "11000111010" + "11"; // STOP + terminação
assert.strictEqual(P.code128("IVC-0001"), expected, "BRC-02 IVC-0001");

// BRC-05: determinismo + distinção entre matrículas
assert.strictEqual(P.code128("IVC-0001"), P.code128("IVC-0001"));
assert.notStrictEqual(P.code128("IVC-0001"), P.code128("IVC-0002"));

// BRC-03: code128Runs — quiet zone nas bordas e total de módulos preservado
const runs = P.code128Runs(expected, 8);
const total = runs.reduce((s, r) => s + r.modules, 0);
assert.strictEqual(runs[0].bar, false);
assert.strictEqual(runs[runs.length - 1].bar, false);
assert.strictEqual(total, expected.length + 16);

// BRC-05: reconstruir os módulos a partir dos runs preserva a orientação
// barra/espaço. Inverter o teste de bit (bar = bit === "1" -> "0") gera um
// código de barras ilegível e aqui é detectado.
let rebuilt = "";
for (let i = 1; i < runs.length - 1; i += 1) {
  rebuilt += (runs[i].bar ? "1" : "0").repeat(runs[i].modules);
}
assert.strictEqual(rebuilt, expected, "BRC-05 orientacao barra/espaco preservada");
assert.strictEqual(runs[1].bar, true, "BRC-05 primeiro segmento apos a quiet zone e barra");

// BRC-01: o payload renderizado é a MATRÍCULA. Executa o mapper do cartão e
// exige que ele projete a matrícula e que o barcode a codifique. Um payload
// fixo ou o nome do membro morrem aqui.
const CART = require(process.env.CART_J);
const campos = CART.camposCartao({
  matricula: "IVC-0001", nome: "Maria", nascimento: "1990-01-01",
  whatsapp: "83", rg: null, cpf: null, data_batismo: null,
  criado_em: "2026-01-01T12:00:00Z", foto_url: null,
}, new Date("2026-06-01T12:00:00-03:00"));
assert.strictEqual(campos.id, "IVC-0001", "BRC-01 campos.id projeta a matricula");
assert.strictEqual(P.code128(campos.id), expected, "BRC-01 o barcode codifica a matricula do membro");

// RangeError fora do intervalo ASCII 32-126
assert.throws(() => P.code128("IVC-\u00e7"), RangeError);
console.log("ok");
'; then
    ok "BRC-01/02/03/05 runtime node: tabela, checksum, matricula, orientacao, determinismo"
  else
    ko "BRC-01/02/03/05 runtime node falhou (detalhes acima)"
  fi
fi

printf '== Resumo: %s ok / %s falhas ==\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
