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

echo "=== Probes Admin Auditoria ==="
echo ""

# Estáticos
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

# Page
check "page.tsx tem guard leitor" grep -q "auditoria.*ler" src/app/admin/auditoria/page.tsx
check "page.tsx importa AuditoriaFiltros" grep -q "AuditoriaFiltros" src/app/admin/auditoria/page.tsx
check "page.tsx tem tabela" grep -q "<table" src/app/admin/auditoria/page.tsx
check "page.tsx tem coluna Data/Hora" grep -q "Data/Hora" src/app/admin/auditoria/page.tsx
check "page.tsx tem coluna Autor" grep -q "Autor" src/app/admin/auditoria/page.tsx
check "page.tsx tem coluna Ação" grep -q "Ação" src/app/admin/auditoria/page.tsx
check "page.tsx tem coluna Entidade" grep -q "Entidade" src/app/admin/auditoria/page.tsx
check "page.tsx tem coluna ID" grep -q "ID" src/app/admin/auditoria/page.tsx
check "page.tsx tem coluna IP" grep -q "IP" src/app/admin/auditoria/page.tsx
check "page.tsx tem empty state" grep -q "Nenhum log de auditoria encontrado" src/app/admin/auditoria/page.tsx
check "page.tsx tem paginacao" grep -q "Anterior" src/app/admin/auditoria/page.tsx
check "page.tsx tem paginacao Próximo" grep -q "Próximo" src/app/admin/auditoria/page.tsx

# Filtros
check "filtros tem campo data_inicio" grep -q "Data Inicio" src/app/admin/auditoria/auditoria-filtros.tsx
check "filtros tem campo data_fim" grep -q "Data Fim" src/app/admin/auditoria/auditoria-filtros.tsx
check "filtros tem select acao" grep -q "Acao" src/app/admin/auditoria/auditoria-filtros.tsx
check "filtros tem select entidade" grep -q "Entidade" src/app/admin/auditoria/auditoria-filtros.tsx
check "filtros tem botao Aplicar" grep -q "Aplicar" src/app/admin/auditoria/auditoria-filtros.tsx
check "filtros tem botao Limpar" grep -q "Limpar" src/app/admin/auditoria/auditoria-filtros.tsx

# Migration
check "migration tem audit_logs table" grep -qi "create table.*audit_logs" supabase/migrations/0017_audit_logs.sql
check "migration tem RLS" grep -qi "enable row level security" supabase/migrations/0017_audit_logs.sql
check "migration tem policy select" grep -q "audit_logs_select_authenticated" supabase/migrations/0017_audit_logs.sql
check "migration tem policy insert" grep -q "audit_logs_insert_authenticated" supabase/migrations/0017_audit_logs.sql
check "migration tem index timestamp" grep -q "idx_audit_logs_timestamp" supabase/migrations/0017_audit_logs.sql
check "migration tem index entidade" grep -q "idx_audit_logs_entidade" supabase/migrations/0017_audit_logs.sql
check "migration tem index acao" grep -q "idx_audit_logs_acao" supabase/migrations/0017_audit_logs.sql

# Dashboard
check "dashboard tem card auditoria" grep -q "Auditoria" src/app/admin/page.tsx
check "dashboard tem FileText icon" grep -q "FileText" src/app/admin/page.tsx
check "dashboard tem link auditoria" grep -q "/admin/auditoria" src/app/admin/page.tsx

# Instrumentação
check "membros route importa registrarAuditoria" grep -q "registrarAuditoria" src/app/api/admin/membros/route.ts
check "membros [id] importa registrarAuditoria" grep -q "registrarAuditoria" src/app/api/admin/membros/[id]/route.ts
check "eventos route importa registrarAuditoria" grep -q "registrarAuditoria" src/app/api/admin/eventos/route.ts
check "eventos [id] importa registrarAuditoria" grep -q "registrarAuditoria" src/app/api/admin/eventos/[id]/route.ts
check "assets route importa registrarAuditoria" grep -q "registrarAuditoria" src/app/api/admin/assets/route.ts
check "assets [id] importa registrarAuditoria" grep -q "registrarAuditoria" src/app/api/admin/assets/[id]/route.ts
check "financeiro route importa registrarAuditoria" grep -q "registrarAuditoria" src/app/api/admin/financeiro/route.ts
check "financeiro [id] importa registrarAuditoria" grep -q "registrarAuditoria" src/app/api/admin/financeiro/[id]/route.ts
check "financeiro cancelar importa registrarAuditoria" grep -q "registrarAuditoria" src/app/api/admin/financeiro/[id]/cancelar/route.ts
check "usuarios route importa registrarAuditoria" grep -q "registrarAuditoria" src/app/api/admin/usuarios/route.ts
check "usuarios [id] importa registrarAuditoria" grep -q "registrarAuditoria" src/app/api/admin/usuarios/[id]/route.ts
check "configuracoes route importa registrarAuditoria" grep -q "registrarAuditoria" src/app/api/admin/configuracoes/route.ts

echo ""
echo "=== Resultado ==="
echo "ok: $OK | falha: $FALHA"
