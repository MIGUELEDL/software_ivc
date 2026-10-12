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
HEALTH="$ROOT/src/app/api/health/route.ts"

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

# --- OBS-05..08: /api/health público, raso e exato ---
# A rota não pode importar Sentry, Supabase nem ler PII: independência por
# construção (o NOOP runtime já é provado pelo smoke Vitest da T3).
if grep -q 'sentry' "$HEALTH"; then
  ko "OBS-08 rota de health importa sentry (acoplamento proibido)"
else
  ok "OBS-08 rota de health sem dependencia do Sentry"
fi
if grep -E '^\s*import' "$HEALTH" | grep -qi 'supabase'; then
  ko "OBS-08 rota de health consulta banco (health deve ser raso)"
else
  ok "OBS-08 rota de health rasa (sem banco/Supabase)"
fi
if grep -qE 'export (async )?function (POST|PUT|DELETE|PATCH)' "$HEALTH"; then
  ko "OBS-06 rota exporta metodo alem de GET"
else
  ok "OBS-06 rota exporta so GET (demais metodos caem em 405)"
fi

# --- OBS-05..07 (runtime): corpo exato, 405 e operação sem DSN ---
# Sobe `next start` efêmero (build uma vez). Env real precede .env.local,
# então DSN vazio no ambiente simula ausência de DSN (OBS-07).
PORT=3101
"$ROOT/node_modules/.bin/next" build "$ROOT" >/dev/null 2>&1 || ko "health: build falhou"
PORT="$PORT" "$ROOT/node_modules/.bin/next" start "$ROOT" --port "$PORT" >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null; rm -rf "$TMP_R"' EXIT
for _ in $(seq 1 30); do
  curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1 && break
  sleep 1
done
BODY="$(curl -s "http://127.0.0.1:$PORT/api/health" || true)"
CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/api/health" || true)"
if [ "$CODE" = "200" ] && [ "$BODY" = '{"status":"ok","release":"unknown"}' ]; then
  ok "OBS-05 GET /api/health sem auth -> 200 corpo exato"
else
  ko "OBS-05 GET /api/health retornou $CODE / $BODY"
fi
CODE_POST="$(curl -s -o /dev/null -w '%{http_code}' -X POST "http://127.0.0.1:$PORT/api/health" || true)"
if [ "$CODE_POST" = "405" ]; then
  ok "OBS-06 POST /api/health -> 405"
else
  ko "OBS-06 POST /api/health retornou $CODE_POST (esperado 405)"
fi
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null || true
SENTRY_DSN= NEXT_PUBLIC_SENTRY_DSN= PORT="$PORT" "$ROOT/node_modules/.bin/next" start "$ROOT" --port "$PORT" >/dev/null 2>&1 &
SERVER_PID=$!
for _ in $(seq 1 30); do
  curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1 && break
  sleep 1
done
BODY_NODSN="$(curl -s "http://127.0.0.1:$PORT/api/health" || true)"
CODE_NODSN="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/api/health" || true)"
if [ "$CODE_NODSN" = "200" ] && [ "$BODY_NODSN" = '{"status":"ok","release":"unknown"}' ]; then
  ok "OBS-07 health 200 sem DSN (Sentry fora nao derruba o check)"
else
  ko "OBS-07 health sem DSN retornou $CODE_NODSN / $BODY_NODSN"
fi
kill $SERVER_PID 2>/dev/null || true

printf '== Resumo: %s ok / %s falhas ==\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
