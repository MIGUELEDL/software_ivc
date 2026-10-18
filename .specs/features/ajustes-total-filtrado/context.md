# ajustes-total-filtrado — Contexto (decisões do operador)

Pedido do operador (2026-10-18, pós-fechamento do lote4):

> "o bloco TOTAL, tem que se atualizar de acordo com as filtragens, caso uma filtragem retornar determinada quantidade de linhas, em 'total', tem que aparecer quantos itens está, e melhore o design dele, tá bem estranho, faça todos no mesmo padrão do módulo 'usuários', da mesma forma, ficou legal."

## Decisões

- **D1 — Semântica do TOTAL**: reflete o resultado do filtro ativo. **Reverte a decisão B do lote4** (total geral ignorando filtro/busca/paginação), que o operador havia aprovado na discussão do lote e agora rejeita na prática. Registrada como AD-034.
- **D2 — Design**: padrão do módulo usuários — faixa `p-4 border-b border-white/10 flex items-center justify-between` dentro do card da tabela, TotalBloco à esquerda. O operador validou esse layout em produção de teste ("ficou legal").
- **D3 — Estado vazio**: TOTAL 0 na faixa do cabeçalho + mensagem de vazio no mesmo card (como usuários), substituindo o card de vazio separado.
- **D4 — Auditoria paginada**: TOTAL = total filtrado (todas as páginas), consistente com o rodapé "N registros" já existente.
- **D5 — Limpeza**: remover `contarMembros`, `contarLancamentos`, `contarAuditoria`, `contarDocumentos`, `totalGeral` e `contar.test.ts` — ficam sem uso após a reversão.
