# Cartão de Membro — Sincronização e Validade Anual — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

**Design**: `.specs/features/cartao-valididade-anual/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: none - strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| `src/lib/painel/documento.ts` (domain: normalização/validação) | unit | All branches; 1:1 a CART-04..07; edge cases: máscara, vazio, futuro, caractere de controle, >20 chars | `scripts/probe-cartao-validade.sh` | `npm run typecheck && npm run lint && bash scripts/probe-cartao-validade.sh` |
| `src/lib/painel/validade.ts` (domain: aniversário + rolagem) | unit | All branches; CART-09..12; 29/02 clamp, limite inclusivo, criado_em futuro, inválido | `scripts/probe-cartao-validade.sh` | idem acima |
| Payload de insert/update (`colunasCriarMembro`, `colunasPerfil`, `colunasEditarMembro` em `documento.ts`) | integration | Colunas exatas do `.insert()`/`.update()`; `status`/`matricula`/`criado_em` nunca entram; vazio vira `NULL`; CART-01..04 | `scripts/probe-cartao-validade.sh` | idem acima |
| Mesclagem da rota (`comporDadosDocumento`) | integration | Dados e erros por campo mesclados no payload da rota; sem mutar os argumentos; CART-01..05 | `scripts/probe-cartao-validade.sh` | idem acima |
| Wiring (services, rotas, formulários, `MemberCard`) | integration | Só o caminho que o runtime não alcança: input presente, payload helper é o argumento de `.insert(`/`.update(`, retorno do mapper ligado ao JSX | `scripts/probe-cartao-validade.sh` | idem acima |
| `MemberCard` (render) | integration | Validade calculada no mapper puro `camposCartao(member, hoje)` com `hoje` injetado no teste; demais campos lidos do row | `scripts/probe-cartao-validade.sh` | idem acima |
| Migration `0024_validade_cartao.sql` | integration | Executada num Postgres efêmero: ciclo-base, clamp, trigger de insert/update, validade forjada, backfill derivado de `criado_em`, idempotência, e acordo TS x SQL em 8 instantes de fronteira; CART-12..14, CART-16 | `scripts/probe-cartao-db.sh` | `bash scripts/probe-cartao-validade.sh --com-db` (tier faz SKIP com exit 2 sem Docker) |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | T1-T3 (domínio puro) | `npm run typecheck && npm run lint && bash scripts/probe-cartao-validade.sh` |
| Full | T4-T7b (services, rotas, card) | `npm run typecheck && npm run lint && bash scripts/probe-cartao-validade.sh` |
| Build | T8-T9 (migration + final) | `npm run typecheck && npm run lint && npm run build && bash scripts/probe-cartao-validade.sh` |

---

## Execution Plan

Fases sequenciais; dentro de cada fase as tarefas rodam em ordem.

**Fase 1 — Núcleo puro (domain).** T1 e T2 são raiz e independentes; ambas alimentam o probe.

```
T1 → T3
T2 → T3
```

**Fase 2 — Services e rotas.** Duas cadeias independentes: perfil do membro e cadastro admin.

```
T4 → T6
T5 → T7 → T7b
```

**Fase 3 — Integração e migration.**

```
T8 → T9
```

Dependências entre fases: T4,T5 dependem de T1; T6 de T4; T7,T7b de T5; T8 de T2; T9 de T3 e T8.

---

## Task Breakdown

### Phase 1: Núcleo puro (domain)

#### T1: Criar `src/lib/painel/documento.ts`

**What**: Módulo puro com `normalizarCpf` (strip não-dígitos, exige exatamente 11), `normalizarRg` (trim, ≤20 chars, rejeita `\r\n\t` e controles), `normalizarDataBatismo` (YYYY-MM-DD, data real, não posterior a `hoje`) e `dadosDocumento` (agrega os três e monta `campos` por erro). Vazio → `""` (o caller converte para `null`).
**Where**: `src/lib/painel/documento.ts`
**Depends on**: None
**Reuses**: Padrão de módulo puro de `src/lib/barcode/code128.ts`; regras de `validarNascimento` (`src/app/api/painel/perfil/route.ts:11`)
**Requirement**: CART-04, CART-05, CART-06, CART-07

**Tools**
- MCP: filesystem
- Skill: NONE

**Done when**
- [x] `hoje` é parâmetro injetado (nunca `new Date()` interno)
- [x] Retorno discriminado `{ ok: true, ... } | { ok: false, erro }`
- [x] `npm run typecheck` e `npm run lint` sem erros
- [x] Gate quick passa

**Tests**: unit
**Gate**: quick

---

#### T2: Criar `src/lib/painel/validade.ts`

**What**: `aniversario(criadoIso, anos)` soma `anos` clampando 29/02 → 28/02; `calcularValidadeCartao(criadoEm, hoje)` devolve o menor `aniversario(base, k) >= hoje` para `k >= 1` (limite inclusivo), e `null` para data não parseável.
**Where**: `src/lib/painel/validade.ts`
**Depends on**: None
**Reuses**: Padrão de módulo puro de `src/lib/barcode/code128.ts`
**Requirement**: CART-09, CART-10, CART-11, CART-12, CART-15, CART-16

**Tools**
- MCP: filesystem
- Skill: NONE

**Done when**
- [x] Clamp 29/02 em ano não bissexto correto
- [x] Limite inclusivo: `hoje` igual ao aniversário devolve o mesmo dia
- [x] `criadoEm` futuro devolve aniversário a partir dele
- [x] `null` para entrada inválida
- [x] Calendário civil fixo `America/Sao_Paulo` (AD-020): mesma entrada, mesmo
      dia em `TZ=UTC`, `Asia/Tokyo`, `Pacific/Kiritimati` e `Europe/Lisbon`
- [x] `2026-09-13T02:01Z` lido como dia civil 12/09, não 13/09
- [x] Gate quick passa

**Tests**: unit
**Gate**: quick

---

#### T3: Criar `scripts/probe-cartao-validade.sh`

**What**: Probe determinístico com asserções `node` inline sobre os módulos compilados via `npx tsc`, cobrindo todos os ramos de `documento.ts`, `validade.ts` e `cartao.ts`, os payloads gravados e a mesclagem das rotas. As asserções estáticas ficam só no que o runtime não alcança (inputs dos formulários, símbolo como argumento de `.insert(`/`.update(`, retorno do mapper ligado ao JSX) — guard textual por token não prova comportamento, e é o que o sensor de mutação já reprovou duas vezes. A camada de banco mora em `scripts/probe-cartao-db.sh`, acionada por `--com-db`.
**Where**: `scripts/probe-cartao-validade.sh`
**Depends on**: T1, T2
**Reuses**: `scripts/probe-barcode.sh` (formato, `mktemp -d`, `trap`, exit code)
**Requirement**: CART-01..CART-16

**Tools**
- MCP: filesystem
- Skill: NONE

**Done when**
- [x] `chmod +x` e executável via `bash scripts/probe-cartao-validade.sh`
- [x] Cobre todos os ACs de domínio
- [x] Gate quick passa com 0 falhas

**Tests**: unit
**Gate**: quick

---

### Phase 2: Services e rotas

#### T4: Estender `src/lib/painel/members.ts`

**What**: `MemberDados` ganha `rg`/`cpf`/`data_batismo` opcionais (`string | null`); `createMember` e `updateMember` passam a gravá-los mantendo a **whitelist explícita** de colunas (nunca `...body`).
**Where**: `src/lib/painel/members.ts`
**Depends on**: T1
**Reuses**: Whitelist existente em `updateMember` (`src/lib/painel/members.ts:104`)
**Requirement**: CART-01, CART-02, CART-03, CART-04

**Tools**
- MCP: filesystem
- Skill: NONE

**Done when**
- [x] Tipos atualizados e consistentes
- [x] Whitelist preservada (nenhum campo sensível alcançável)
- [x] Gate full passa

**Tests**: integration
**Gate**: full

---

#### T5: Estender `src/lib/admin/membros.ts`

**What**: `CriarMembroDados` e `MembroDadosAdmin` ganham o trio; `criarMembro` e `atualizarDadosMembro` gravam via whitelist explícita.
**Where**: `src/lib/admin/membros.ts`
**Depends on**: T1
**Reuses**: Padrão de whitelist de `atualizarDadosMembro` (`src/lib/admin/membros.ts:229`)
**Requirement**: CART-01, CART-02, CART-04

**Tools**
- MCP: filesystem
- Skill: NONE

**Done when**
- [x] Normalização aplicada antes do insert/update
- [x] Whitelist explícita preservada
- [x] Gate full passa

**Tests**: integration
**Gate**: full

---

#### T6: Atualizar rota do perfil do membro

**What**: `POST /api/painel/perfil` lê `rg`/`cpf`/`dataBatismo` do FormData, valida via `dadosDocumento` e inclui no `dados`. Mantém 409 (`23505`) e 500 existentes.
**Where**: `src/app/api/painel/perfil/route.ts`
**Depends on**: T4
**Reuses**: `validarFormulario` existente (mesma forma `{ dados, campos }`)
**Requirement**: CART-03, CART-04, CART-05, CART-06, CART-07

**Tools**
- MCP: filesystem
- Skill: NONE

**Done when**
- [x] Campo vazio persiste `NULL`, nunca `""`
- [x] Rejeições devolvem 400 com `campos` por campo
- [x] Gate full passa

**Tests**: integration
**Gate**: full

---

#### T7: Atualizar rota de criação de membro (admin)

**What**: `POST /api/admin/membros` lê e valida o trio antes de `criarMembro`, repassando ao service.
**Where**: `src/app/api/admin/membros/route.ts`
**Depends on**: T5
**Reuses**: Padrões de validação admin
**Requirement**: CART-01, CART-04, CART-05, CART-06, CART-07

**Tools**
- MCP: filesystem
- Skill: NONE

**Done when**
- [x] Validação idêntica à do painel
- [x] Matrícula e status fora do escopo desta rota
- [x] Gate full passa

**Tests**: integration
**Gate**: full

---

#### T7b: Atualizar rota de edição de membro (admin)

**What**: `POST /api/admin/membros/[id]/dados` valida o trio antes de `atualizarDadosMembro`, devolvendo 400 com `campos` por campo inválido.
**Where**: `src/app/api/admin/membros/[id]/dados/route.ts`
**Depends on**: T5
**Reuses**: Padrões de validação admin
**Requirement**: CART-02, CART-04, CART-05, CART-06, CART-07

**Tools**
- MCP: filesystem
- Skill: NONE

**Done when**
- [x] Validação idêntica à da rota T7
- [x] Matrícula e status fora do escopo desta rota
- [x] Gate full passa

**Tests**: integration
**Gate**: full

---

### Phase 3: Integração e migration

#### T8: Modificar `MemberCard` para calcular a validade corrente

**What**: o conteúdo do cartão passa a vir de `camposCartao(member, hoje)` (módulo puro em `lib/painel/cartao.ts`), que usa `calcularValidadeCartao(member.criado_em, hoje)` no lugar da coluna crua. RG, CPF e data de batismo seguem lidos do row atual. `MemberCard` não ganha prop de data: a injeção de `hoje` fica no mapper, que é o ponto testado, e nenhum call site passa `hoje`.
**Where**: `src/components/MemberCard.tsx`
**Depends on**: T2
**Reuses**: `fmtData` (`src/components/MemberCard.tsx:6`)
**Requirement**: CART-08, CART-09, CART-10, CART-11, CART-15

**Tools**
- MCP: filesystem
- Skill: NONE

**Done when**
- [x] Validade exibida é o ciclo corrente rolante, calculada de `criado_em`
- [x] `NULL`/inválido em rg, cpf ou batismo vira `—`; `fmtData` rejeita
      `2026-02-30` (data inexistente) em vez de imprimir "30/02/2026"
- [x] Componente não lê mais a coluna `validade_cartao`
- [x] `hoje` injetável no mapper `camposCartao`; `MemberCard` mantém a assinatura de um único campo, compatível com os dois call sites
- [x] Barcode (AD-018) e layout ID-1 intocados
- [x] Gate full passa

**Tests**: integration
**Gate**: full

---

#### T9: Migration `0024_validade_cartao.sql`

**What**: Função `members_ciclo_base` (data + 1 ano, clamp 29/02), trigger `BEFORE INSERT OR UPDATE` que deriva `validade_cartao` de `criado_em`, e backfill idempotente apenas de `NULL`. Comentário explicando ciclo-base vs ciclo corrente.
**Where**: `supabase/migrations/0024_validade_cartao.sql`
**Depends on**: T3, T8
**Reuses**: Estilo idempotente de `0020_member_card_columns.sql`
**Requirement**: CART-13, CART-14, CART-16

**Tools**
- MCP: filesystem
- Skill: NONE

**Done when**
- [x] `CREATE OR REPLACE` + `DROP TRIGGER IF EXISTS` (idempotente)
- [x] Backfill não sobrescreve valor não-`NULL`
- [x] Trigger ignora `validade_cartao` vindo do cliente
- [x] `npm run build` sem erros
- [x] Gate build passa
- [x] Roda de verdade num Postgres efêmero: `+ 0` anos, `at time zone 'UTC'`,
      backfill com data arbitrária e o clamp de 29/02 removido falham a probe

**Tests**: integration (a migration é executada, não lida)
**Gate**: full (`--com-db`)

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | 1 módulo puro | ✅ |
| T2 | 1 módulo puro | ✅ |
| T3 | 1 script probe | ✅ |
| T4 | 1 service | ✅ |
| T5 | 1 service admin | ✅ |
| T6 | 1 rota | ✅ |
| T7 | 1 rota | ✅ |
| T7b | 1 rota | ✅ |
| T8 | 1 componente | ✅ |
| T9 | 1 migration | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On | Diagram | Status |
| ---- | ---------- | ------- | ------ |
| T1 | None | raiz (fase 1) | ✅ |
| T2 | None | raiz (fase 1) | ✅ |
| T3 | T1, T2 | T1 → T3, T2 → T3 | ✅ |
| T4 | T1 | cross-phase | ✅ |
| T5 | T1 | cross-phase | ✅ |
| T6 | T4 | T4 → T6 | ✅ |
| T7 | T5 | T5 → T7 | ✅ |
| T7b | T5 | T5 → T7b | ✅ |
| T8 | T2 | cross-phase | ✅ |
| T9 | T3, T8 | T8 → T9 | ✅ |

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| ---- | ---------- | --------------- | --------- | ------ |
| T1 | `documento.ts` | unit | unit | ✅ |
| T2 | `validade.ts` | unit | unit | ✅ |
| T3 | probe | unit | unit | ✅ |
| T4 | `painel/members.ts` | integration | integration | ✅ |
| T5 | `admin/membros.ts` | integration | integration | ✅ |
| T6 | rota perfil | integration | integration | ✅ |
| T7 | rota admin create | integration | integration | ✅ |
| T7b | rota admin dados | integration | integration | ✅ |
| T8 | `MemberCard` | integration | integration | ✅ |
| T9 | migration | none | none | ✅ |

## Commit Messages

| Task | Conventional Commit |
| ---- | ------------------- |
| T1 | `feat(cartao): normalizacao de rg cpf e data de batismo` |
| T2 | `feat(cartao): calculo rolante de validade anual` |
| T3 | `test(cartao): probe de validade e dados do cartao` |
| T4 | `feat(painel): persiste documento do membro no perfil` |
| T5 | `feat(admin): persiste documento do membro no cadastro` |
| T6 | `feat(perfil): campos de rg cpf e batismo no perfil` |
| T7 | `feat(admin): valida documento na criacao de membro` |
| T7b | `feat(admin): valida documento na edicao de membro` |
| T8 | `feat(cartao): validade corrente calculada no card` |
| T9 | `feat(db): trigger de ciclo-base e backfill de validade` |
