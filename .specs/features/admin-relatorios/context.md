# Relatórios/Documentos Context

**Gathered:** 2026-09-15
**Spec:** `.specs/features/admin-relatorios/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Módulo administrativo **Relatórios/Documentos** (RF-027): tela `/admin/relatorios` para
(i) **exportar relatórios** — financeiro (receitas/despesas/caixa) e de gestão
(membros/eventos/patrimônio) — em CSV; e (ii) **gerir documentos** — upload manual
de arquivos (PDF/planilhas) com categoria por módulo, lista com download e exclusão.
Módulo RBAC `relatorios` (FINANCEIRO=escrever, SECRETARIA/PATRIMONIAL/LIDER=ler,
ADMIN/SUPER_ADMIN=administrar).

---

## Implementation Decisions

### Escopo dos relatórios (Financeiro + gestão)

- Relatório **financeiro**: lançamentos de receitas/despesas por período e por
  categoria, com totais (receitas, despesas, saldo) e controle do caixa.
- Relatórios de **gestão**: listas de membros, eventos e patrimônio.

### Período

- Financeiro: filtro por data início/fim, **padrão = último mês**.
- Gestão: lista completa com filtro opcional de período.

### Formato de exportação

- **CSV** separado por `;` com UTF-8 BOM (abre corretamente no Excel PT-BR).
- Geração sob demanda (botão "Exportar"), sem cron/agendamento no MVP.

### Documentos = arquivos subidos

- Upload manual de arquivos (PDF/planilhas) restrito a papéis com permissão
  (escrever no módulo `relatorios`).
- **Categorias por módulo** (financeiro, membros, eventos, patrimônio, ...) com
  filtro por categoria na listagem.
- Lista cronológica com download e exclusão.
- Armazenamento em bucket de storage; RLS por papel (mesma postura dos demais
  módulos).

### Agent's Discretion

- Nomes das categorias por módulo (padrão: mesmos nomes dos módulos RBAC).
- Limites de tamanho/tipos de arquivo aceitos no upload.
- Estrutura visual da página (segue padrão das páginas admin existentes).

### Declined / Undiscussed Gray Areas → Assumptions

- (nenhuma — todas as áreas cinzentas foram resolvidas na discussão)

---

## Specific References

- Spec financeiro deferiu "relatórios financeiros exportáveis" para RF-027.
- DATABASE.md previa `reports/documents` e bucket de documentos restrito a
  papéis com permissão.

---

## Deferred Ideas

- Relatórios mensais **agendados automaticamente** (cron/Edge Function) — iteração futura.
- Exportação em **PDF** — iteração futura.
- Relatórios de **auditoria/usuários** — RF-029/RF-030 tratam esses módulos.