#!/usr/bin/env bash
#
# Probes por AC da feature observabilidade (OBS-01..13).
# Uso: bash scripts/probe-observabilidade.sh   (node + npx via nvm — PATH ativado)
#
# Tiers: estático (wiring presente nos fontes) + runtime (SSR do boundary,
# rotas contra `next start` efêmero). Contagem de asserts é gate (fonte do
# Verifier); tiers novas entram por tarefa (T4: boundary; T5: health).
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BOUNDARY="$ROOT/src/app/global-error.tsx"

if ! command -v node >/dev/null 2>&1; then
  export PATH="$HOME/.nvm/versions/node/v$(cat "$ROOT/.nvmrc").0/bin:$PATH"
fi

PASS=0
FAIL=0
ok() { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
ko() { FAIL=$((FAIL + 1)); printf '  FAIL %s\n' "$1"; }

printf '== Probes observabilidade (OBS) ==\n'

# --- OBS-04: boundary global-error captura sem expor stack ---
if grep -q '"use client"' "$BOUNDARY" \
   && grep -q 'Sentry.captureException(error)' "$BOUNDARY" \
   && grep -q 'useEffect' "$BOUNDARY"; then
  ok "OBS-04 boundary captura a excecao via Sentry no efeito"
else
  ko "OBS-04 boundary nao captura via Sentry no efeito"
fi
if grep -q 'Algo não saiu como esperado' "$BOUNDARY" \
   && grep -q 'erro-inesperado' "$BOUNDARY" \
   && grep -q 'Tentar novamente' "$BOUNDARY"; then
  ok "OBS-04 fallback com texto orientador e acao de retry (classe erro-inesperado)"
else
  ko "OBS-04 fallback sem texto/classe/acao esperados"
fi
if grep -q 'error.message' "$BOUNDARY" || grep -q 'String(error)' "$BOUNDARY"; then
  ko "OBS-04 fallback vaza mensagem interna do erro"
else
  ok "OBS-04 fallback nao expoe mensagem interna nem stack"
fi

# --- OBS-04 (render): o fallback EXECUTADO contém o texto e não a mensagem ---
# renderToStaticMarkup não roda efeitos: a captura é atestada acima; aqui o
# alvo é o markup (mutante que some com o fallback ou vaza a mensagem morre).
TMP_R="$(mktemp -d)"
trap 'rm -rf "$TMP_R"' EXIT
cat > "$TMP_R/stub-sentry.js" <<'JS'
module.exports = { captureException: function () {} };
JS
npx tsc "$BOUNDARY" \
  --outDir "$TMP_R/out" --module commonjs --target es2020 --jsx react-jsx \
  --moduleResolution node --esModuleInterop --skipLibCheck >/dev/null 2>&1 || true
BOUNDARY_JS="$(find "$TMP_R/out" -name 'global-error.js' -print -quit 2>/dev/null || true)"
if [ ! -f "$BOUNDARY_JS" ]; then
  ko "OBS-04 render: compilacao do boundary falhou"
else
  if TMP_R="$TMP_R" NODE_PATH="$ROOT/node_modules" BOUNDARY_J="$BOUNDARY_JS" node -e '
const Module = require("module");
const path = require("path");
const assert = require("assert");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const TMP = process.env.TMP_R;
const orig = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request === "@sentry/nextjs") return path.join(TMP, "stub-sentry.js");
  return orig.call(this, request, parent, ...rest);
};
const Boundary = require(process.env.BOUNDARY_J).default;
const html = renderToStaticMarkup(
  React.createElement(Boundary, { error: new Error("SEGREDO-INTERNO-123"), reset: () => {} }),
);
assert.ok(html.includes("Algo não saiu como esperado"), "render: fallback com texto orientador");
assert.ok(html.includes("erro-inesperado"), "render: fallback com a classe");
assert.ok(html.includes("Tentar novamente"), "render: fallback com retry");
assert.ok(!html.includes("SEGREDO-INTERNO-123"), "render: mensagem interna nao vaza");
console.log("ok");
'; then
    ok "OBS-04 render: fallback executado com texto/classe/retry e sem vazamento"
  else
    ko "OBS-04 render: SSR do boundary falhou (detalhes acima)"
  fi
fi

printf '== Resumo: %s ok / %s falhas ==\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
