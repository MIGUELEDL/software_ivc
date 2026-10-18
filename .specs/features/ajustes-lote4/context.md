# ajustes-lote4 Context

**Gathered:** 2026-10-18
**Spec:** `.specs/features/ajustes-lote4/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Lote de 4 ajustes aprovados pelo usuário após revisão visual do Lote 3: (1) barra ID/NOME do cartão de membro responsiva a nomes longos, (2) bloco "TOTAL" com contagem exata em cada listagem do painel admin, (3) exibição do e-mail do membro na página de detalhe, (4) caixa de sucesso + redirect ao portal no fluxo de troca de senha do membro.

---

## Implementation Decisions

### A — Escopo do contador "TOTAL"

- Bloco em **todas as listagens do painel admin**: membros, eventos, financeiro (lançamentos), fechamento, auditoria, usuários, liderança, patrimônio, relatórios (9 tabelas).
- **Matriz de permissões fica de fora** (não é listagem de registros).

### B — Semântica do total com filtro/pesquisa ativos

- Total **geral de registros registrados** — não reflete busca, filtros de status/tipo/período nem paginação (ex.: membros com busca ativa continua mostrando o total de membros registrados).

### C — Posição do bloco

- Bloco **acima da tabela, alinhado à esquerda**: rótulo "TOTAL" em cima, número embaixo.

### D — Caixa de sucesso (trocar senha)

- Modal/caixa de confirmação com **botão explícito** ("Ir para o painel") — ao acionar, redireciona: papel MEMBRO → `/painel`, papel admin → `/admin` (alvos já existentes na rota).
- Inclui a correção do rebote: a flag `force_password_change` precisa sair também da sessão (hoje é limpa só no banco → `proxy.ts` devolve o usuário ao form).

### E — Nome longo na barra do cartão

- **Truncar com reticências (`ellipsis`)** mantendo o tamanho de fonte fixo — garante que nada estoure as dimensões do cartão.

### Agent's Discretion

- Mecanismo da caixa de sucesso (redirect com parâmetro `?success` vs. submissão via `fetch` + modal client-side) — decisão técnica.
- Estilo/dimensões exatas do bloco TOTAL e da caixa de sucesso (a posição e o conteúdo estão definidos).
- Como obter a contagem global nas páginas com filtro (query `count` separada vs. parâmetro no serviço existente).

### Declined / Undiscussed Gray Areas → Assumptions

- Posição do e-mail na página de detalhe e fallback quando ausente — default do agente registrado na spec (Assumptions #6).
- Tratamento de falha de consulta para o bloco TOTAL — default do agente (Assumptions #7).
- Convivência com contadores já existentes (texto "N usuário(s)" em usuários, paginação da auditoria) — default do agente (Assumptions #8).

---

## Specific References

- Usuário: "na tabela de membros, no lado esquerdo antes das colunas, ter um 'total' e em baixo o número exato do total de membros registrados".
- Usuário: "se o nome for grande, ele deve se adaptar dentro da barra sem passar as dimensões do cartão".
- Usuário: "apareça uma caixinha dizendo que foi sucesso ... assim que fechar a caixinha, já redirecione direto pro portal de membro já logado".
- Causa-raiz do bug do redirect: `proxy.ts:29` lê `app_metadata` da sessão em cookie; a rota `/api/auth/trocar-senha` limpa a flag só no banco (`updateUserById`), nunca na sessão.

---

## Deferred Ideas

- None — discussion stayed within feature scope.
