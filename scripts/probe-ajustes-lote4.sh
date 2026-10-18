#!/usr/bin/env bash
# probe-ajustes-lote4.sh — tiers estáticos discriminantes de ajustes-lote4.
# Cada tier é acrescentado conforme as tasks da feature são concluídas.
set -u

ok=0
fail=0

check() {
  local nome="$1"
  local cmd="$2"
  if eval "$cmd" >/dev/null 2>&1; then
    echo "ok   $nome"
    ok=$((ok + 1))
  else
    echo "FAIL $nome"
    fail=$((fail + 1))
  fi
}

# TOT-01: TotalBloco referenciado em cada uma das 9 listagens do admin
for pagina in eventos patrimonio lideranca relatorios financeiro/fechamento financeiro auditoria usuarios membros; do
  arquivo="src/app/admin/${pagina}/page.tsx"
  check "TOT-01 ${pagina}" "grep -q 'TotalBloco' '${arquivo}'"
done

# TAB-02: contagens globais (head+count) nas libs filtradas
check "TAB-02 contarMembros" "grep -q 'contarMembros' src/lib/admin/membros.ts"
check "TAB-02 contarLancamentos" "grep -q 'contarLancamentos' src/lib/admin/financeiro.ts"
check "TAB-02 contarAuditoria" "grep -q 'contarAuditoria' src/lib/admin/auditoria.ts"
check "TAB-02 contarDocumentos" "grep -q 'contarDocumentos' src/lib/admin/relatorios.ts"
check "TAB-02 totalGeral" "grep -q 'totalGeral' src/lib/admin/usuarios.ts"

# EMAIL-01/02: e-mail no detalhe via getUserById + fallback
check "EMAIL-01 getUserById" "grep -q 'getUserById' 'src/app/admin/membros/[id]/page.tsx'"
check "EMAIL-02 fallback" "grep -q 'email ?? \"—\"' 'src/app/admin/membros/[id]/page.tsx'"

# CART-17: truncate na barra ID/NOME do cartão
check "CART-17 truncate" "grep -q 'truncate' src/components/MemberCard.tsx"

echo "---"
echo "probe-ajustes-lote4: ${ok} ok, ${fail} fail"
test "${fail}" -eq 0
