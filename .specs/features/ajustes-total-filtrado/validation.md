# ajustes-total-filtrado — Relatório do Verifier

## Validation: ajustes-total-filtrado - PASS

**Spec-anchored check**: 7/7 critérios (6 ACs + 1 goal) com evidência `file:line` | 0 blocking gaps; 7 non-blocking findings (ver Descobertas)

**Gate** (todos no worktree scratch @ `ff0b527`): lint exit 0 (0 errors / 5 warnings baseline); typecheck exit 0; `test:ci` **309/309 (30 files)** — baseline `7dda317` também 309/309 → **delta 0** (−6 `contar.test.ts`, +6 novos: auditoria 2, membros +2, patrimonio +1, membros-lista-client +1); build exit 0; `probe-ajustes-total-filtrado.sh` **19 PASS / 0 FAIL**; `probe-ajustes-lote4.sh` **12 ok / 0 fail** (tier TAB-02 aposentado de propósito).

**Sensor**: 4 mutações injetadas, **4 mortas, 0 sobreviventes**. Worktree temporário removido; `git status --porcelain` real = baseline (` M tsconfig.tsbuildinfo`); 0 commits, 0 stashes.

**Diff range**: `7dda317..HEAD` — commits `7ac4955` (T1), `ff0b527` (T2).

**Evidence (file:line)**:

- **TAB-05** filtro ativo → contagem do filtro: membros `src/app/admin/membros/page.tsx:185` (`total={membros.length}`) + `membros/page.test.tsx:49` (`>1<`) / `:52` (`not >7<`; q=ana → 1 de 7) · auditoria `auditoria/page.tsx:98` (`total={total}`) + `page.test.tsx:52` (`>45<`) / `:55` (`not >20<`) · usuarios `usuarios/page.tsx:112` (`total={result.total}`) + `usuarios.test.ts:40` (papel FINANCEIRO → 2 de 3) · financeiro `financeiro/page.tsx:341` + probe `:36` · relatorios `relatorios/page.tsx:180` + probe `:39`
- **TAB-05** auditoria paginada → total filtrado global: `auditoria/page.test.tsx:52,55` (45 ≠ 20) + mesmo `total` do rodapé `page.tsx:98,167`
- **TAB-05** sem filtro → contagem completa: `auditoria/page.test.tsx:41-52`; `membros/page.test.tsx:56,67`; `usuarios.test.ts:49`
- **Goal** `contar*`/`totalGeral` removidos: grep `src/` → 0; probe `:30-34` (5 `check_absent`); `contar.test.ts` deletado; `usuarios.ts:66`
- **TAB-06** faixa embutida no card (9 listagens): posicionais `eventos/page.test.tsx:50-57`, `patrimonio/page.test.tsx:49-55`, `auditoria/page.test.tsx:57-62`, `membros-lista-client.test.tsx:42-43` · implementação eventos:81, patrimonio:91, lideranca:89, financeiro:340, auditoria:97, membros-lista-client:101, relatorios:179, fechamento:130/151 (`border-text-dark/10`), usuarios:110 · probe `:50-56` (9 arquivos)
- **TAB-06** vazio = TOTAL 0 + mensagem no mesmo card: `eventos/page.test.tsx:69-81`, `patrimonio/page.test.tsx:66-74`, `membros/page.test.tsx:70-83`; implementação nas 9 (eventos:84-89, patrimonio:94-99, financeiro:343-348, relatorios:208-216, lideranca:92-95, auditoria:100-105, usuarios:124-130, membros:164-174, fechamento:127-136)
- **TAB-07** falha → card de erro sem TOTAL: `eventos/page.test.tsx:60-66`, `patrimonio/page.test.tsx:57-63`, `membros/page.test.tsx:85-92`; estrutura `falhaConsulta ? erro : card-com-faixa` em eventos:72, patrimonio:81, membros:178, financeiro:330, relatorios:169, lideranca:80, fechamento:141

**Sensor — matriz mutação → teste**:

| # | Mutação (scratch) | Teste que matou | Resultado |
|---|-------------------|-----------------|-----------|
| A | membros `total={7}` fixo | `membros/page.test.tsx:52` `not >7<` | KILLED |
| B | auditoria `total={logs.length}` | `auditoria/page.test.tsx:52` `>45<` | KILLED |
| C | eventos: faixa sai do card (bloco solto `mb-4`) | `eventos/page.test.tsx:55` (posição) e `:77` (faixa no vazio) | KILLED |
| D | eventos: vazio volta a card separado sem faixa | `eventos/page.test.tsx:74-75` (`total-bloco` / `>0<`) | KILLED |

**Descobertas** (nenhuma bloqueante):

1. Doc do `total-bloco.tsx:2-6` contradizia a spec (referências TAB-01/02/04 e "exibido acima da tabela") — **corrigido no commit de fecho**.
2. `membros/page.test.tsx:67` `>3<` casa também com o mock (`lista-membros">3<`) — não-discriminante, mas o teste irmão cobre o AC.
3. financeiro/relatorios sem teste de render do TOTAL (evidência estrutural: `page.tsx:341`/`:180` + probe).
4. TAB-07 literal só em 3/9: auditoria:46 e usuarios:66 chamam a query sem try/catch (pré-existente; falha cai no error boundary — nenhum TOTAL renderiza).
5. "Bloco à esquerda" (TAB-06) coberto estruturalmente (`items-start` + primeiro filho do flex), sem assertion própria.
6. Worktrees órfãos de execuções anteriores: `/home/leugim/projects/.verifier-tf-scratch` e `/tmp/opencode/verifier-total-filtrado` (prunable) — limpeza opcional.
7. `npm run build` falha em worktree com `node_modules` symlinkado (Turbopack); lint/typecheck/testes/probes funcionam com symlink.
