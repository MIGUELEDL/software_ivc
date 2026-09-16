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

echo "=== Probes Admin Dashboard ==="
echo ""

check "dashboard.ts existe" test -f src/lib/admin/dashboard.ts
check "page.tsx existe" test -f src/app/admin/page.tsx
check "dashboard.ts exporta obterMetricas" grep -q "export async function obterMetricas" src/lib/admin/dashboard.ts
check "dashboard.ts exporta obterAtividadeRecente" grep -q "export async function obterAtividadeRecente" src/lib/admin/dashboard.ts
check "dashboard.ts exporta obterResumoFinanceiro" grep -q "export async function obterResumoFinanceiro" src/lib/admin/dashboard.ts
check "page.tsx importa obterMetricas" grep -q "obterMetricas" src/app/admin/page.tsx
check "page.tsx importa obterAtividadeRecente" grep -q "obterAtividadeRecente" src/app/admin/page.tsx
check "page.tsx importa obterResumoFinanceiro" grep -q "obterResumoFinanceiro" src/app/admin/page.tsx
check "page.tsx contem grid metricas" grep -q "grid grid-cols-2 sm:grid-cols-3" src/app/admin/page.tsx
check "page.tsx contem atividade recente" grep -q "Atividade Recente" src/app/admin/page.tsx
check "page.tsx contem resumo financeiro" grep -q "Resumo Financeiro" src/app/admin/page.tsx
check "page.tsx contem top categorias" grep -q "Top Categorias" src/app/admin/page.tsx
check "page.tsx contem link modulos" grep -q "Modulos administrativos" src/app/admin/page.tsx
check "page.tsx usa max-w-6xl" grep -q "max-w-6xl" src/app/admin/page.tsx
check "page.tsx contem access denied block" grep -q "Acesso Negado" src/app/admin/page.tsx
check "page.tsx usa podeDashboard" grep -q "podeDashboard" src/app/admin/page.tsx
check "page.tsx contem StatusBadge" grep -q "StatusBadge" src/app/admin/page.tsx
check "page.tsx usa STATUS_COLORS" grep -q "STATUS_COLORS" src/app/admin/page.tsx
check "page.tsx contem podeDashboard check" grep -q "can(papel" src/app/admin/page.tsx
check "dashboard.ts contem temporizar" grep -q "function temporizar" src/lib/admin/dashboard.ts
check "page.tsx usa obterMetricas()" grep -q "obterMetricas()" src/app/admin/page.tsx
check "page.tsx usa obterAtividadeRecente()" grep -q "obterAtividadeRecente()" src/app/admin/page.tsx
check "page.tsx usa obterResumoFinanceiro()" grep -q "obterResumoFinanceiro()" src/app/admin/page.tsx

echo ""
echo "=== Resultado ==="
echo "ok: $OK | falha: $FALHA"
