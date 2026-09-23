#!/usr/bin/env bash
#
# Probes por AC da feature barcode-membro (BRC-01..05).
# Uso: bash scripts/probe-barcode.sh   (node + npx via nvm — PATH ativado)
#
# Estático: MemberCard usa o encoder real e não mais o gradiente decorativo;
# texto humano sob as barras = matrícula.
# Runtime (node): valida a tabela Code 128 (107 símbolos) por invariantes
# estruturais, amostras da fonte, sequência exata hardcoded para "IVC-0001"
# (checksum 10), determinismo e RangeError.
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LIB="$ROOT/src/lib/barcode/code128.ts"
CARD="$ROOT/src/components/MemberCard.tsx"

if ! command -v node >/dev/null 2>&1; then
  export PATH="$HOME/.nvm/versions/node/v$(cat "$ROOT/.nvmrc").0/bin:$PATH"
fi

PASS=0
FAIL=0
ok() { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
ko() { FAIL=$((FAIL + 1)); printf '  FAIL %s\n' "$1"; }

printf '== Probes barcode-membro (BRC) ==\n'

# --- BRC-01: render usa o encoder real ---
if grep -q 'code128(\|code128Runs(' "$CARD" && grep -q 'barcode/code128' "$CARD"; then
  ok "BRC-01 MemberCard usa o encoder Code 128"
else
  ko "BRC-01 MemberCard nao importa/usa o encoder"
fi
if grep -q '#111 0px' "$CARD"; then
  ko "BRC-01 gradiente decorativo do barcode ainda presente no MemberCard"
else
  ok "BRC-01 gradiente decorativo do barcode removido do MemberCard"
fi

# --- BRC-04: matrícula legível sob as barras ---
if grep -q 'campos.id' "$CARD" && grep -q 'mt-\[0.8mm\]' "$CARD"; then
  ok "BRC-04 texto humano (matricula) abaixo das barras"
else
  ko "BRC-04 falhou ao localizar texto humano da matricula"
fi

# --- BRC-02/03/05: compila o encoder puro e valida via node ---
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
npx tsc "$LIB" --outDir "$TMP" --module commonjs --target es2020 --moduleResolution node --esModuleInterop --skipLibCheck >/dev/null 2>&1 || ko "compilacao do encoder p/ teste falhou"
JS="$(find "$TMP" -name 'code128.js' -print -quit)"

if [ ! -f "$JS" ]; then
  ko "encoder compilado não encontrado"
else
  if LIB_J="$JS" node -e '
const assert = require("assert");
const T = require(process.env.LIB_J).CODE128_TABLE;

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
assert.strictEqual(require(process.env.LIB_J).code128("IVC-0001"), expected, "BRC-02 IVC-0001");

// BRC-05: determinismo + distinção entre matrículas
assert.strictEqual(require(process.env.LIB_J).code128("IVC-0001"), require(process.env.LIB_J).code128("IVC-0001"));
assert.notStrictEqual(require(process.env.LIB_J).code128("IVC-0001"), require(process.env.LIB_J).code128("IVC-0002"));

// BRC-03: code128Runs — quiet zone nas bordas e total de módulos preservado
const runs = require(process.env.LIB_J).code128Runs(expected, 8);
const total = runs.reduce((s, r) => s + r.modules, 0);
assert.strictEqual(runs[0].bar, false);
assert.strictEqual(runs[runs.length - 1].bar, false);
assert.strictEqual(total, expected.length + 16);

// RangeError fora do intervalo ASCII 32-126
assert.throws(() => require(process.env.LIB_J).code128("IVC-\u00e7"), RangeError);
console.log("ok");
'; then
    ok "BRC-02/03/05 runtime node: tabela, checksum 10 de IVC-0001, determinismo, invariantes"
  else
    ko "BRC-02/03/05 runtime node falhou (detalhes acima)"
  fi
fi

printf '== Resumo: %s ok / %s falhas ==\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]