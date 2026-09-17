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

echo "=== Probes Admin Configuracoes ==="
echo ""

check "configuracoes.ts existe" test -f src/lib/admin/configuracoes.ts
check "page.tsx existe" test -f src/app/admin/configuracoes/page.tsx
check "configuracoes-form.tsx existe" test -f src/app/admin/configuracoes/configuracoes-form.tsx
check "route.ts existe" test -f src/app/api/admin/configuracoes/route.ts
check "migration existe" test -f supabase/migrations/0016_settings.sql
check "configuracoes.ts exporta obterConfiguracoes" grep -q "export async function obterConfiguracoes" src/lib/admin/configuracoes.ts
check "configuracoes.ts exporta atualizarConfiguracoes" grep -q "export async function atualizarConfiguracoes" src/lib/admin/configuracoes.ts
check "configuracoes.ts tem SETTINGS_KEYS" grep -q "SETTINGS_KEYS" src/lib/admin/configuracoes.ts
check "route.ts tem GET" grep -q "export async function GET" src/app/api/admin/configuracoes/route.ts
check "route.ts tem PATCH" grep -q "export async function PATCH" src/app/api/admin/configuracoes/route.ts
check "route.ts usa authAdmin" grep -q "authAdmin" src/app/api/admin/configuracoes/route.ts
check "route.ts usa requireAdministrar" grep -q "requireAdministrar" src/app/api/admin/configuracoes/route.ts
check "page.tsx tem guard leitor" grep -q "configuracoes.*ler" src/app/admin/configuracoes/page.tsx
check "page.tsx tem guard admin" grep -q "configuracoes.*administrar" src/app/admin/configuracoes/page.tsx
check "page.tsx importa ConfiguracoesForm" grep -q "ConfiguracoesForm" src/app/admin/configuracoes/page.tsx
check "form tem 5 secoes" grep -q "Dados da Igreja" src/app/admin/configuracoes/configuracoes-form.tsx
check "form tem WhatsApp section" grep -q "WhatsApp" src/app/admin/configuracoes/configuracoes-form.tsx
check "form tem PIX section" grep -q "PIX" src/app/admin/configuracoes/configuracoes-form.tsx
check "form tem Horarios section" grep -q "Horarios de Culto" src/app/admin/configuracoes/configuracoes-form.tsx
check "form tem Redes section" grep -q "Redes Sociais" src/app/admin/configuracoes/configuracoes-form.tsx
check "form tem save button" grep -q "Salvar" src/app/admin/configuracoes/configuracoes-form.tsx
check "form tem cancel button" grep -q "Cancelar" src/app/admin/configuracoes/configuracoes-form.tsx
check "form tem edit button" grep -q "Editar" src/app/admin/configuracoes/configuracoes-form.tsx
check "dashboard tem card configuracoes" grep -q "Configuracoes" src/app/admin/page.tsx
check "dashboard tem Settings icon" grep -q "Settings" src/app/admin/page.tsx
check "dashboard tem podeConfiguracoes" grep -q "podeConfiguracoes" src/app/admin/page.tsx
check "migration tem settings table" grep -q "CREATE TABLE settings" supabase/migrations/0016_settings.sql
check "migration tem RLS" grep -q "ENABLE ROW LEVEL SECURITY" supabase/migrations/0016_settings.sql
check "page.tsx tem fromDb flag" grep -q "fromDb" src/app/admin/configuracoes/page.tsx
check "page.tsx tem badge padrao" grep -q "padrao" src/app/admin/configuracoes/page.tsx
check "form tem wa.me link" grep -q "wa.me" src/app/admin/configuracoes/configuracoes-form.tsx
check "form tem instrucoes PIX" grep -q "copia-e-cola" src/app/admin/configuracoes/configuracoes-form.tsx
check "service retorna fromDb" grep -q "fromDb" src/lib/admin/configuracoes.ts

echo ""
echo "=== Resultado ==="
echo "ok: $OK | falha: $FALHA"
