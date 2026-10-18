# Ajustes Lote 4 Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: skipped (Medium scope — design inline)
**Status**: In Progress

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec. Guidelines found: `AGENTS.md` (SDD obrigatório, gates lint/typecheck/test/build via nvm), `vitest.config.ts`, `package.json` scripts.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| API Route (trocar-senha) | unit | happy + edge + error paths 1:1 aos ACs AUTH | `src/app/api/auth/trocar-senha/route.test.ts` | `npm run test:ci` |
| Page RSC | unit (`renderToStaticMarkup`) | happy + edge de cada página tocada | `src/app/**/page.test.ts` | `npm run test:ci` |
| Component (client) | unit (RTL jsdom) | happy + edge; classes/labels discriminantes (L-015) | `src/**/*.test.tsx` | `npm run test:ci` |
| Lib/service (contagens) | unit | queries de contagem global sem filtro | `src/lib/admin/*.test.ts` | `npm run test:ci` |
| Estrutura das 9 páginas | probe estática | grep de `TotalBloco` em cada listagem | `scripts/probe-ajustes-lote4.sh` | `bash scripts/probe-ajustes-lote4.sh` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Após tarefas com unit tests | `export PATH="$HOME/.nvm/versions/node/v22.0/bin:$PATH" && npm run test:ci` |
| Full | Após integração de páginas | `export PATH="$HOME/.nvm/versions/node/v22.0/bin:$PATH" && npm run lint && npm run typecheck && npm run test:ci && bash scripts/probe-ajustes-lote4.sh` |
| Build | Última tarefa / fechamento | `export PATH="$HOME/.nvm/versions/node/v22.0/bin:$PATH" && npm run build` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase A: Trocar senha (AUTH)

```
T1 → T2
```

### Phase B: Bloco TOTAL nas listagens (TAB)

```
T3 → T4
T3 → T5
```

### Phase C: E-mail no detalhe + cartão (ADMINMEM / CART)

```
T6, T7
```

---

## Task Breakdown

### T1: Rota trocar-senha — refresh da sessão + redirect com `?success=1`

**What**: Após limpar `force_password_change` via service role, atualizar a sessão no cookie (refresh) e redirecionar para `/trocar-senha?success=1` em vez de direto para `/painel` (hoje o proxy devolve ao form por flag stale na sessão).
**Where**: `src/app/api/auth/trocar-senha/route.ts`
**Depends on**: None
**Reuses**: `src/app/api/auth/atualizar-senha/route.test.ts` (padrão de teste), `createServerClient`
**Requirement**: AUTH-22 (e preservação AUTH-23/24 nos testes)

**Done when**:

- [x] Sucesso → `307` para `/trocar-senha?success=1`
- [x] Sessão atualizada após limpeza da flag (`refreshSession` no client da sessão)
- [x] `weak_password` e `auth_required` inalterados
- [x] Testes novos em `route.test.ts` cobrem happy + 2 erros + refresh chamado

**Tests**: unit
**Gate**: quick
**Commit**: `fix(auth): refresh session after clearing force password change flag`

### T2: Página trocar-senha — caixa de sucesso com destino por papel

**What**: Em `/trocar-senha?success=1`, trocar o form pela caixa de sucesso com link/botão "Ir para o painel" (`/painel` para MEMBRO, `/admin` para admin, papel lido via `getClaims`); sem o parâmetro, form e mensagens de erro continuam iguais.
**Where**: `src/app/trocar-senha/page.tsx`
**Depends on**: T1
**Reuses**: `src/lib/auth/claims.ts`, padrão RSC `renderToStaticMarkup` (`src/app/admin/membros/imprimir/page.test.ts`)
**Requirement**: AUTH-20, AUTH-21 (+ AUTH-23/24 preservados)

**Done when**:

- [x] `?success=1` → caixa visível, form ausente, link com href conforme papel
- [x] sem parâmetro → form renderiza como hoje; erros `error=weak_password`/`auth_required` mantidos
- [x] Testes RSC cobrem: sucesso MEMBRO, sucesso admin, ausência do parâmetro

**Tests**: unit
**Gate**: quick
**Commit**: `feat(auth): show success box and redirect after password change`

### T3: Componente TotalBloco

**What**: Componente server "TOTAL" + número (rótulo em cima, valor embaixo, alinhado à esquerda) para uso acima das tabelas do admin.
**Where**: `src/components/admin/total-bloco.tsx`
**Depends on**: None
**Reuses**: classes visuais das tabelas admin (`hero-background-admin`, font-sans)
**Requirement**: TAB-01 (apresentação), TAB-03 (0 exibido)

**Done when**:

- [x] Renderiza rótulo `TOTAL` e o número passado em `total`
- [x] `total={0}` exibe `0`
- [x] Testes RTL cobrem ambos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(admin): add total block component for listing tables`

### T4: TotalBloco nas 4 listagens sem filtro + probe das 9 páginas

**What**: Aplicar `TotalBloco` (total = `array.length`) em eventos, patrimônio, liderança e fechamento; ocultar o bloco quando a consulta falhar (padrão `falhaConsulta`); criar `scripts/probe-ajustes-lote4.sh` com tier que grepa `TotalBloco` nas 9 listagens. (Relatórios tem filtro `?categoria=` → movido para T5.)
**Where**: `src/app/admin/eventos/page.tsx`, `src/app/admin/patrimonio/page.tsx`, `src/app/admin/lideranca/page.tsx`, `src/app/admin/financeiro/fechamento/page.tsx`, `scripts/probe-ajustes-lote4.sh` (tarefa coesa: mesmo componente aplicado a 4 páginas — WARN de granularidade aceito)
**Depends on**: T3
**Reuses**: T3, padrões de `falhaConsulta` das páginas
**Requirement**: TAB-01 (+ TAB-04 via omissão em falha)

**Done when**:

- [x] 4 páginas exibem o bloco com a contagem da listagem
- [x] Bloco ausente no ramo `falhaConsulta`
- [x] Probe tier 1 (4 greps das páginas desta task) verde; testes RSC de 2 páginas representativas (eventos + patrimônio). Tier estende para as 9 páginas na T5.

**Tests**: unit + probe estática
**Gate**: full
**Commit**: `feat(admin): show total block on unfiltered listing pages`

### T5: Contagens globais + TotalBloco nas 5 listagens com filtro

**What**: Contagem global independente de filtros: `contarMembros` (lib membros), `contarLancamentos` (lib financeiro), `contarAuditoria` (lib auditoria), `totalGeral` em `listarUsuarios` (antes do filtro de papel), `contarDocumentos` (lib relatorios, antes do filtro de categoria); aplicar `TotalBloco` em membros, financeiro, auditoria, usuários e relatórios (em usuários substituir o texto "N usuário(s)"; em relatorios capturar falha para omitir o bloco).
**Where**: `src/lib/admin/membros.ts`, `src/lib/admin/financeiro.ts`, `src/lib/admin/auditoria.ts`, `src/lib/admin/usuarios.ts`, `src/lib/admin/relatorios.ts` + 5 `page.tsx` correspondentes (tarefa coesa: mesmo padrão de contagem global em 5 páginas filtradas — WARN de granularidade aceito)
**Depends on**: T3
**Reuses**: T3, `select("id", { count: "exact", head: true })`
**Requirement**: TAB-02 (+ TAB-01, TAB-03, TAB-04)

**Done when**:

- [ ] 5 funções/campos de contagem global testadas (mock do client; query sem filtros)
- [ ] 5 páginas exibem o bloco; membros com `q` ativo mantém o total geral (testado)
- [ ] Usuários sem duplicar contagem (bloco substitui o texto)

**Tests**: unit
**Gate**: full
**Commit**: `feat(admin): show global total on filtered listing pages`

### T6: E-mail do membro na página de detalhe

**What**: Buscar o e-mail em `auth.users` via `membro.auth_user_id` (`admin.auth.admin.getUserById`, try/catch) e exibir no bloco de dados de contato; `—` quando indisponível.
**Where**: `src/app/admin/membros/[id]/page.tsx`
**Depends on**: None
**Reuses**: `createAdminClient` (`src/lib/supabase/admin.ts`), padrão de `redefinir-senha/route.ts`
**Requirement**: ADMINMEM-36, ADMINMEM-37

**Done when**:

- [ ] E-mail renderizado no bloco (junto a WhatsApp/nascimento)
- [ ] Falha/ausência → `—`, página renderiza
- [ ] Testes RSC cobrem happy + fallback

**Tests**: unit
**Gate**: quick
**Commit**: `feat(admin): show member email on detail page`

### T7: Barra ID/NOME do cartão com nome longo

**What**: Tornar a barra de identificação resistente a nome longo (flex `min-w-0` + `truncate` no valor do nome) sem alterar as dimensões ISO ID-1; base = alterações visuais aprovadas do usuário no arquivo.
**Where**: `src/components/MemberCard.tsx`
**Depends on**: None
**Reuses**: `src/lib/painel/cartao.ts` (`camposCartao`)
**Requirement**: CART-17, CART-18, CART-19

**Done when**:

- [ ] Nome de 80+ caracteres truncado com elipsis dentro da barra (classes discriminantes)
- [ ] Nome curto exibido integralmente
- [ ] Aspecto `aspect-[85.6/53.98]` inalterado
- [ ] Testes RTL cobrem os 3 ACs

**Tests**: unit
**Gate**: build
**Commit**: `fix(cart): truncate long names in member card id bar`

---

## Phase Execution Map

```
Phase A:  T1 → T2
Phase B:  T3 → T4
          T3 → T5
Phase C:  T6,  T7
```

Execution is strictly sequential within the flow above; T6 e T7 são independentes entre si e do resto (executados em ordem).

---

## Preamble (não é task)

- Commit `style` das alterações visuais aprovadas do usuário: `src/components/BirthdayBanner.tsx` + `file:cursor-pointer` em `src/app/admin/membros/[id]/membro-editar-forms.tsx`.
- Reverter `next-env.d.ts` (churn do `next dev`, quebraria typecheck no CI) e descartar ruído de `tsconfig.tsbuildinfo`.
- A base visual de `MemberCard.tsx` entra no commit da T7.
