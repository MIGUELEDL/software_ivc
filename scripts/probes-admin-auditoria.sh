#!/usr/bin/env bash
set -euo pipefail

OK=0
FALHA=0

check() {
  local desc="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo "ok   $desc"
    OK=$((OK + 1))
  else
    echo "falha $desc"
    FALHA=$((FALHA + 1))
  fi
}

# Passa quando o comando FALHA (guard negativo: ex. ausencia de behavior).
check_not() {
  local desc="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo "falha $desc"
    FALHA=$((FALHA + 1))
  else
    echo "ok   $desc"
    OK=$((OK + 1))
  fi
}

# Remove comentarios (// e /* */) para que um token comentado nao satisfaca um
# guard de comportamento.
sem_comentarios() {
  perl -0777 -pe 's{/\*.*?\*/}{}gs; s{^[ \t]*//[^\n]*}{}gm; s{[ \t]+//[^\n]*}{}g' "$1"
}

# Exige o simbolo em POSICAO DE USO (fora de imports e de comentarios).
# Mata mutantes que apenas importam o simbolo sem o invocar.
usa_simbolo() {
  local f="$1" sym="$2"
  sem_comentarios "$f" \
    | grep -Ev '^[[:space:]]*import([[:space:]]|.* from )' \
    | grep -qF "$sym("
}

echo "=== Probes Admin Auditoria ==="
echo ""

# ---------------------------------------------------------------- estaticos --
check "auditoria.ts existe" test -f src/lib/admin/auditoria.ts
check "page.tsx existe" test -f src/app/admin/auditoria/page.tsx
check "auditoria-filtros.tsx existe" test -f src/app/admin/auditoria/auditoria-filtros.tsx
check "route.ts existe" test -f src/app/api/admin/auditoria/route.ts
check "migration existe" test -f supabase/migrations/0017_audit_logs.sql

# Service layer
check "auditoria.ts exporta registrarAuditoria" grep -q "export async function registrarAuditoria" src/lib/admin/auditoria.ts
check "auditoria.ts exporta listarAuditoria" grep -q "export async function listarAuditoria" src/lib/admin/auditoria.ts
check "auditoria.ts exporta extrairInfoRequest" grep -q "export function extrairInfoRequest" src/lib/admin/auditoria.ts
check "auditoria.ts tem tipo AuditLog" grep -q "type AuditLog" src/lib/admin/auditoria.ts
check "auditoria.ts tem tipo AuditoriaFiltros" grep -q "type AuditoriaFiltros" src/lib/admin/auditoria.ts

# Routes
check "route.ts tem GET" grep -q "export async function GET" src/app/api/admin/auditoria/route.ts
check "route.ts tem POST" grep -q "export async function POST" src/app/api/admin/auditoria/route.ts
check "route.ts GET usa authAdmin" grep -q "authAdmin" src/app/api/admin/auditoria/route.ts
check "route.ts POST usa requireAdministrar" grep -q "requireAdministrar" src/app/api/admin/auditoria/route.ts
check "route.ts tem filtro data_inicio" grep -q "data_inicio" src/app/api/admin/auditoria/route.ts
check "route.ts tem filtro data_fim" grep -q "data_fim" src/app/api/admin/auditoria/route.ts
check "route.ts tem filtro acao" grep -q "acao" src/app/api/admin/auditoria/route.ts
check "route.ts tem filtro entidade" grep -q "entidade" src/app/api/admin/auditoria/route.ts
check "route.ts tem validacao datas" grep -q "datas_invalidas" src/app/api/admin/auditoria/route.ts
check "route.ts GET clampa limit (Math.min/Math.max)" grep -qE "Math\.(min|max)" src/app/api/admin/auditoria/route.ts

# Page
check "page.tsx guard: leitor = await can(papel, auditoria, ler)" grep -qF 'await can(papel, "auditoria", "ler")' src/app/admin/auditoria/page.tsx
check "page.tsx guard: if (!leitor) nega acesso" grep -qF 'if (!leitor)' src/app/admin/auditoria/page.tsx
check "page.tsx importa AuditoriaFiltros" grep -q "AuditoriaFiltros" src/app/admin/auditoria/page.tsx
check "page.tsx tem tabela" grep -q "<table" src/app/admin/auditoria/page.tsx
check "page.tsx tem coluna Data/Hora" grep -q "Data/Hora" src/app/admin/auditoria/page.tsx
check "page.tsx tem coluna Autor" grep -q "Autor" src/app/admin/auditoria/page.tsx
check "page.tsx tem coluna Ação" grep -q "Ação" src/app/admin/auditoria/page.tsx
check "page.tsx tem coluna Entidade" grep -q "Entidade" src/app/admin/auditoria/page.tsx
check "page.tsx tem coluna ID" grep -q "ID" src/app/admin/auditoria/page.tsx
check "page.tsx tem coluna IP" grep -q "IP" src/app/admin/auditoria/page.tsx
check "page.tsx tem empty state" grep -q "Nenhum log de auditoria encontrado" src/app/admin/auditoria/page.tsx
check "page.tsx tem paginacao Anterior" grep -q "Anterior" src/app/admin/auditoria/page.tsx
check "page.tsx tem paginacao Próximo" grep -q "Próximo" src/app/admin/auditoria/page.tsx
check "page.tsx limit = 20" grep -qF 'const limit = 20' src/app/admin/auditoria/page.tsx

# Filtros (AUD-15: aplicar/limpar refletem nos query params)
check "filtros tem campo data_inicio" grep -q "Data Inicio" src/app/admin/auditoria/auditoria-filtros.tsx
check "filtros tem campo data_fim" grep -q "Data Fim" src/app/admin/auditoria/auditoria-filtros.tsx
check "filtros tem select acao" grep -q "Acao" src/app/admin/auditoria/auditoria-filtros.tsx
check "filtros tem select entidade" grep -q "Entidade" src/app/admin/auditoria/auditoria-filtros.tsx
check "filtros tem botao Aplicar" grep -q "Aplicar" src/app/admin/auditoria/auditoria-filtros.tsx
check "filtros tem botao Limpar" grep -q "Limpar" src/app/admin/auditoria/auditoria-filtros.tsx
check "filtros aplicarFiltros seta data_inicio" grep -qF 'sp.set("data_inicio", inicio)' src/app/admin/auditoria/auditoria-filtros.tsx
check "filtros aplicarFiltros seta data_fim" grep -qF 'sp.set("data_fim", fim)' src/app/admin/auditoria/auditoria-filtros.tsx
check "filtros aplicarFiltros seta acao" grep -qF 'sp.set("acao", acaoFiltro)' src/app/admin/auditoria/auditoria-filtros.tsx
check "filtros aplicarFiltros seta entidade" grep -qF 'sp.set("entidade", entidadeFiltro)' src/app/admin/auditoria/auditoria-filtros.tsx
check "filtros aplicarFiltros faz router.push com query" grep -qF 'router.push(`/admin/auditoria?${sp.toString()}`)' src/app/admin/auditoria/auditoria-filtros.tsx
check "filtros limparFiltros faz router.push base" grep -qF 'router.push("/admin/auditoria")' src/app/admin/auditoria/auditoria-filtros.tsx

# Migration
check "migration tem audit_logs table" grep -qi "create table.*audit_logs" supabase/migrations/0017_audit_logs.sql
check "migration tem RLS" grep -qi "enable row level security" supabase/migrations/0017_audit_logs.sql
check "migration tem policy select" grep -q "audit_logs_select_authenticated" supabase/migrations/0017_audit_logs.sql
check "migration policy SELECT exige can_access(auditoria, ler)" grep -qF "using (public.can_access('auditoria', 'ler'))" supabase/migrations/0017_audit_logs.sql
check "migration tem policy insert" grep -q "audit_logs_insert_authenticated" supabase/migrations/0017_audit_logs.sql
check_not "migration sem policy UPDATE/DELETE (imutavel)" grep -Eqi "for[[:space:]]+(update|delete)" supabase/migrations/0017_audit_logs.sql
check "migration tem index timestamp" grep -q "idx_audit_logs_timestamp" supabase/migrations/0017_audit_logs.sql
check "migration tem index entidade" grep -q "idx_audit_logs_entidade" supabase/migrations/0017_audit_logs.sql
check "migration tem index acao" grep -q "idx_audit_logs_acao" supabase/migrations/0017_audit_logs.sql

# Dashboard
check "dashboard tem card auditoria" grep -q "Auditoria" src/app/admin/page.tsx
check "dashboard tem FileText icon" grep -q "FileText" src/app/admin/page.tsx
check "dashboard tem link auditoria" grep -q "/admin/auditoria" src/app/admin/page.tsx

# Instrumentacao (AUD-18: cada route handler CHAMA registrarAuditoria,
# nao apenas importa — o grep roda sobre o arquivo sem comentarios e sem
# linhas de import).
check "membros route chama registrarAuditoria" usa_simbolo src/app/api/admin/membros/route.ts registrarAuditoria
check "membros [id] chama registrarAuditoria" usa_simbolo "src/app/api/admin/membros/[id]/route.ts" registrarAuditoria
check "eventos route chama registrarAuditoria" usa_simbolo src/app/api/admin/eventos/route.ts registrarAuditoria
check "eventos [id] chama registrarAuditoria" usa_simbolo "src/app/api/admin/eventos/[id]/route.ts" registrarAuditoria
check "assets route chama registrarAuditoria" usa_simbolo src/app/api/admin/assets/route.ts registrarAuditoria
check "assets [id] chama registrarAuditoria" usa_simbolo "src/app/api/admin/assets/[id]/route.ts" registrarAuditoria
check "financeiro route chama registrarAuditoria" usa_simbolo src/app/api/admin/financeiro/route.ts registrarAuditoria
check "financeiro [id] chama registrarAuditoria" usa_simbolo "src/app/api/admin/financeiro/[id]/route.ts" registrarAuditoria
check "financeiro cancelar chama registrarAuditoria" usa_simbolo "src/app/api/admin/financeiro/[id]/cancelar/route.ts" registrarAuditoria
check "usuarios route chama registrarAuditoria" usa_simbolo src/app/api/admin/usuarios/route.ts registrarAuditoria
check "usuarios [id] chama registrarAuditoria" usa_simbolo "src/app/api/admin/usuarios/[id]/route.ts" registrarAuditoria
check "configuracoes route chama registrarAuditoria" usa_simbolo src/app/api/admin/configuracoes/route.ts registrarAuditoria

# ---------------------------------------------------- runtime (AUD-01/02/03) --
# Compila o service layer e o executa com um stub de @/lib/supabase/server que
# grava as operacoes do query builder. Verifica PAYLOAD do insert (por valor,
# nao por presenca) e os fallbacks NULL; mata mutantes que removem o insert,
# fixam os meta-campos ou trocam o autor.
echo ""
echo "--- runtime: service layer (supabase stub) ---"

TMPDIR_AUD="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_AUD"' EXIT

cat > "$TMPDIR_AUD/supabase-stub.js" <<'JS'
'use strict';
const state = {
  calls: [],
  insertError: null,
  listError: null,
  rows: [],
  count: 0,
};
function makeBuilder(rec) {
  const b = {};
  b.insert = (payload) => {
    rec.ops.insert = payload;
    return Promise.resolve({ error: state.insertError });
  };
  b.select = (...a) => { rec.ops.select = a; return b; };
  b.order = (...a) => { rec.ops.order = a; return b; };
  b.gte = (...a) => { rec.ops.gte = a; return b; };
  b.lte = (...a) => { rec.ops.lte = a; return b; };
  b.eq = (...a) => { (rec.ops.eq = rec.ops.eq || []).push(a); return b; };
  b.range = (...a) => { rec.ops.range = a; return b; };
  b.then = (res, rej) =>
    Promise.resolve({ data: state.rows, count: state.count, error: state.listError }).then(res, rej);
  return b;
}
function createServerClient() {
  return Promise.resolve({
    from(table) {
      const rec = { table, ops: {} };
      state.calls.push(rec);
      return makeBuilder(rec);
    },
  });
}
module.exports = { createServerClient, __state: state };
JS

npx tsc src/lib/admin/auditoria.ts \
  --outDir "$TMPDIR_AUD/out" \
  --module commonjs --target es2020 --moduleResolution node \
  --esModuleInterop --skipLibCheck --rootDir src/lib/admin >/dev/null 2>&1 || true

AUD_JS="$(find "$TMPDIR_AUD/out" -name 'auditoria.js' -print -quit 2>/dev/null || true)"
if [ -z "$AUD_JS" ]; then
  echo "falha runtime: auditoria.ts nao compilou"
  FALHA=$((FALHA + 1))
else
  if TMPDIR_AUD="$TMPDIR_AUD" AUD_J="$AUD_JS" node -e '
    const Module = require("module");
    const path = require("path");
    const assert = require("assert");
    const STUB = path.join(process.env.TMPDIR_AUD, "supabase-stub.js");
    const orig = Module._resolveFilename;
    Module._resolveFilename = function (request, parent, ...rest) {
      if (request === "@/lib/supabase/server") return STUB;
      return orig.call(this, request, parent, ...rest);
    };
    const AUD = require(process.env.AUD_J);
    const state = require(STUB).__state;
    const reset = () => { state.calls.length = 0; state.insertError = null; state.listError = null; };

    (async () => {
      // AUD-02/03 extrairInfoRequest: x-forwarded-for (1o valor), fallback x-real-ip, ambos null
      let r = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8", "user-agent": "UA/1" } });
      assert.deepStrictEqual(AUD.extrairInfoRequest(r), { ip: "1.2.3.4", user_agent: "UA/1" });
      r = new Request("http://x", { headers: { "x-real-ip": "9.9.9.9" } });
      assert.deepStrictEqual(AUD.extrairInfoRequest(r), { ip: "9.9.9.9", user_agent: null });
      r = new Request("http://x");
      assert.deepStrictEqual(AUD.extrairInfoRequest(r), { ip: null, user_agent: null });

      // AUD-01 registrarAuditoria: insert em audit_logs com payload EXATO por valor
      reset();
      await AUD.registrarAuditoria({
        autor: "u1", acao: "criar", entidade: "membros", entidade_id: "m1",
        ip: "1.2.3.4", user_agent: "UA/1", payload: { a: 1 },
      });
      assert.strictEqual(state.calls.length, 1, "deve haver 1 insert");
      assert.strictEqual(state.calls[0].table, "audit_logs");
      assert.deepStrictEqual(state.calls[0].ops.insert, {
        autor: "u1", acao: "criar", entidade: "membros", entidade_id: "m1",
        ip: "1.2.3.4", user_agent: "UA/1", payload: { a: 1 },
      });

      // AUD-02/03 campos opcionais ausentes => NULL (nao string vazia/fixo)
      reset();
      await AUD.registrarAuditoria({ acao: "sistema", entidade: "x" });
      const p = state.calls[0].ops.insert;
      assert.strictEqual(p.autor, null);
      assert.strictEqual(p.entidade_id, null);
      assert.strictEqual(p.ip, null);
      assert.strictEqual(p.user_agent, null);
      assert.strictEqual(p.payload, null);

      // Edge: payload gigante e truncado para ~10KB (fica abaixo do original)
      reset();
      await AUD.registrarAuditoria({ acao: "x", entidade: "y", payload: { msg: "z".repeat(20000) } });
      const t = state.calls[0].ops.insert.payload;
      assert.strictEqual(typeof t, "object");
      assert.ok(t && typeof t.msg === "string" && t.msg.length < 20000, "payload deve ser truncado");

      // Edge: falha no insert NAO lanca (best-effort)
      reset();
      const realErr = console.error; console.error = () => {};
      state.insertError = { message: "boom" };
      await AUD.registrarAuditoria({ acao: "x", entidade: "y" });
      console.error = realErr;

      // AUD-08/09/10/11 listarAuditoria: operadores por valor + range [offset, offset+limit-1]
      reset();
      state.rows = [{ id: "a" }];
      state.count = 1;
      const res = await AUD.listarAuditoria({
        data_inicio: "2026-01-01", data_fim: "2026-01-31",
        acao: "criar", entidade: "membros", offset: 20, limit: 20,
      });
      const c = state.calls[0];
      assert.strictEqual(c.table, "audit_logs");
      assert.deepStrictEqual(c.ops.select, ["*", { count: "exact" }]);
      assert.deepStrictEqual(c.ops.order, ["timestamp", { ascending: false }]);
      assert.deepStrictEqual(c.ops.gte, ["timestamp", "2026-01-01"]);
      assert.deepStrictEqual(c.ops.lte, ["timestamp", "2026-01-31T23:59:59.999Z"]);
      assert.deepStrictEqual(c.ops.eq, [["acao", "criar"], ["entidade", "membros"]]);
      assert.deepStrictEqual(c.ops.range, [20, 39]);
      assert.deepStrictEqual(res, { logs: [{ id: "a" }], total: 1 });

      // Defaults: offset 0, limit 20 (AUD-11), sem filtros => sem .eq
      reset();
      await AUD.listarAuditoria({});
      assert.deepStrictEqual(state.calls[0].ops.range, [0, 19], "default offset=0 limit=20");
      assert.strictEqual(state.calls[0].ops.eq, undefined, "sem filtros => sem .eq");
      assert.strictEqual(state.calls[0].ops.gte, undefined, "sem data_inicio => sem .gte");
      assert.strictEqual(state.calls[0].ops.lte, undefined, "sem data_fim => sem .lte");

      // Erro na leitura => { logs: [], total: 0 }
      reset();
      state.listError = { message: "x" };
      const r2 = await AUD.listarAuditoria({});
      assert.deepStrictEqual(r2, { logs: [], total: 0 });
    })().catch((e) => { console.error(e); process.exit(1); });
  ' >/dev/null 2>&1; then
    echo "ok   runtime AUD-01/02/03/08/09/10/11 + edges (insert, NULLs, filtros, range, truncamento)"
    OK=$((OK + 1))
  else
    echo "falha runtime AUD-01/02/03/08/09/10/11 (rodar node manualmente para ver o assert)"
    FALHA=$((FALHA + 1))
  fi
fi

echo ""
echo "=== Resultado ==="
echo "ok: $OK | falha: $FALHA"
exit "$FALHA"
