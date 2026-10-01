# Landing Visual — Sistema de Efeitos Unificado — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

**Design**: `.specs/features/landing-visual-hero/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: none - strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| `src/components/visual/*` (primitives) | unit | Props e classes corretas; camadas `pointer-events-none`; conteúdo em `relative z-10`; 3 efeitos distintos; VIS-02, VIS-08..13 | `scripts/probe-landing-visual.sh` | `npm run typecheck && npm run lint && bash scripts/probe-landing-visual.sh` |
| `src/app/globals.css` (tokens) | unit | 4 tokens presentes e consumíveis; nenhum token existente alterado; VIS-02, VIS-04, VIS-17 | `scripts/probe-landing-visual.sh` | idem acima |
| Landing sections migradas | unit | Cada seção no shell com o efeito mapeado; sem `bg-white`/`bg-bg-gray`; sem hex de paleta cru; VIS-03..07, VIS-14, VIS-16, VIS-18 | `scripts/probe-landing-visual.sh` | idem acima |
| `Navbar` | unit | Estado scrolled marinho, não-scrolled inalterado; VIS-06 | `scripts/probe-landing-visual.sh` | idem acima |
| Rotas públicas wrappers | unit | Shell aplicado; nenhuma mudança de dados; VIS-03, VIS-04, VIS-07 | `scripts/probe-landing-visual.sh` | idem acima |
| `PixDonation` | none | — (troca de hex por token; verificado por asserção estática no probe) | — | build gate only |
| Build / smoke final | none | — | — | build gate only |
| `Hero` | none | — (deve permanecer **inalterado**; verificado por probe estático, VIS-05) | — | build gate only |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | T1-T2 (tokens + primitives) | `npm run typecheck && npm run lint && bash scripts/probe-landing-visual.sh` |
| Full | T3-T6 (probe + seções + rotas + navbar) | `npm run typecheck && npm run lint && bash scripts/probe-landing-visual.sh` |
| Build | T7-T8 (PixDonation + final) | `npm run typecheck && npm run lint && npm run build && bash scripts/probe-landing-visual.sh` |

---

## Execution Plan

Fases sequenciais; dentro de cada fase as tarefas rodam em ordem.

**Fase 1 — Tokens e primitives.** T1 cria os tokens; T2 depende deles; T3 fecha o gate.

```
T1 → T2 → T3
```

**Fase 2 — Migração da Landing.** T4 e as três rotas partem de T2; nenhuma
dependência intra-fase.

```
sem arestas intra-fase
```

**Fase 3 — Navbar, PixDonation e verificação final.**

```
T6 → T8
T7 → T8
```

Dependências entre fases: T5a,T5b,T5c de T2; T6 de T1; T7 de T1 e T4; T8 de T3, T4, T5a, T5b, T5c, T6, T7.

---

## Task Breakdown

### Phase 1: Tokens e primitives

#### T1: Tokens visuais em `src/app/globals.css`

**What**: Adicionar no bloco `@theme inline`: `--color-hero-glow: rgb(26 58 107 / 0.19)`, `--color-surface-deep: #0d1f3c`, `--color-glass: rgb(255 255 255 / 0.05)`, `--color-glass-border: rgb(255 255 255 / 0.10)`. Nenhum token existente alterado ou removido.
**Where**: `src/app/globals.css`
**Depends on**: None
**Reuses**: Bloco `@theme inline` existente (linhas 6-33)
**Requirement**: VIS-02, VIS-04, VIS-17

**Tools**
- MCP: filesystem
- Skill: NONE

**Done when**
- [ ] Os 4 tokens presentes como `--color-*` (Tailwind v4 gera a utility)
- [ ] Nenhum token pré-existente modificado
- [ ] Gate quick passa

**Tests**: unit
**Gate**: quick

---

#### T2: Criar `src/components/visual/`

**What**: `SectionShell.tsx` (replica a pilha de 3 camadas do Hero: base `from-bg-dark via-primary/90 to-primary`, glow por token, camada de efeito opcional; `id`, `effect: "aurora" | "feixe" | "vitral"`, padding e container), `SurfaceCard.tsx` (vidro translúcido + borda + `backdrop-blur-sm` + `hover:-translate-y-2`) e `SectionHeader.tsx` (`text-center mb-16` com `whileInView`).
**Where**: `src/components/visual/`
**Depends on**: T1
**Reuses**: Classes de `Hero.tsx:14,16,18,20`; `motion` já usado nas seções
**Requirement**: VIS-01, VIS-02, VIS-08, VIS-09, VIS-10, VIS-11, VIS-12, VIS-13

**Tools**
- MCP: filesystem
- Skill: NONE

**Done when**
- [ ] Camadas decorativas com `pointer-events-none`
- [ ] Conteúdo sempre em `relative z-10`
- [ ] `Hero` **não** passou a usar `SectionShell` (VIS-05)
- [ ] Efeitos só com CSS estático (nenhum `motion` em fundo)
- [ ] Gate quick passa

**Tests**: unit
**Gate**: quick

---

### Phase 2: Migração da Landing

#### T3: Criar `scripts/probe-landing-visual.sh`

**What**: Probe estático que verifica: glow único (nenhum `#1a3a6b30`/`#C9A227` literal em componentes da landing), presença dos 3 efeitos, ausência de `bg-white`/`bg-bg-gray` nas seções migradas, ausência de hex de paleta cru (`#132744`, `#0d1f3c`), `Hero` com suas 3 camadas originais intactas, `pointer-events-none` nas camadas e `z-10` no conteúdo, e presença dos 4 tokens.
**Where**: `scripts/probe-landing-visual.sh`
**Depends on**: T2
**Reuses**: `scripts/probe-barcode.sh` (formato `ok`/`ko`, exit code)
**Requirement**: VIS-01..VIS-19

**Tools**
- MCP: filesystem
- Skill: NONE

**Done when**
- [ ] `chmod +x`
- [ ] Cobre todos os ACs estáticos da spec
- [ ] Gate quick passa com 0 falhas

**Tests**: unit
**Gate**: quick

---

#### T4: Migrar seções da Landing

**What**: `About.tsx`, `Leadership.tsx`, `Schedule.tsx`, `Values.tsx`, `LiveBanner.tsx`, `SocialLinks.tsx`, `Footer.tsx` passam a usar `SectionShell` + `SurfaceCard` + `SectionHeader` conforme o mapeamento de efeitos do design. Corrigir `text-1xl` → `text-xl` em `Leadership.tsx:76`; secundários → `text-white/70`.
**Where**: `src/components/`
**Depends on**: T2
**Reuses**: Primitives de T2; `rounded-2xl`/`shadow-xl`/hover existentes
**Requirement**: VIS-03, VIS-04, VIS-05, VIS-14, VIS-16, VIS-18

**Tools**
- MCP: filesystem
- Skill: NONE

**Done when**
- [ ] Efeito correto por seção (aurora/feixe/vitral conforme design)
- [ ] Sem `bg-white`/`bg-bg-gray` nessas seções
- [ ] Sem hex de paleta institucional cru
- [ ] Textos, ordem, âncoras (`#sobre`, `#lideranca`, `#cultos`, `#valores`, `#clamor`, `#redes`) e CTAs inalterados
- [ ] Gate full passa

**Tests**: unit
**Gate**: full

---

#### T5a: Migrar wrapper da rota `/doacao`

**What**: `SectionShell` + `SurfaceCard` no wrapper de `/doacao`, preservando `min-h-screen`, container, header e o consumo de `PixDonation`.
**Where**: `src/app/doacao/page.tsx`
**Depends on**: T2
**Reuses**: Primitives de T2
**Requirement**: VIS-03, VIS-04, VIS-14

**Tools**
- MCP: filesystem
- Skill: NONE

**Done when**
- [ ] Fundo marinho unificado
- [ ] Nenhuma alteração em queries, props ou lógica
- [ ] Gate full passa

**Tests**: unit
**Gate**: full

---

#### T5b: Migrar wrapper da rota `/eventos`

**What**: `SectionShell` + `SurfaceCard` na listagem de eventos (wrapper e card `<article>`), preservando grid, `min-h-screen`, ordenação e o link de detalhe.
**Where**: `src/app/eventos/page.tsx`
**Depends on**: T2
**Reuses**: Primitives de T2
**Requirement**: VIS-03, VIS-04, VIS-14

**Tools**
- MCP: filesystem
- Skill: NONE

**Done when**
- [ ] Card de evento mantém `article` e o link por evento
- [ ] Nenhuma alteração em queries ou ordenação
- [ ] Gate full passa

**Tests**: unit
**Gate**: full

---

#### T5c: Migrar wrapper da rota `/eventos/[id]`

**What**: `SectionShell` + `SurfaceCard` no detalhe do evento, preservando `max-w-3xl`, metadados e o CTA de WhatsApp.
**Where**: `src/app/eventos/[id]/page.tsx`
**Depends on**: T2
**Reuses**: Primitives de T2
**Requirement**: VIS-03, VIS-04, VIS-07

**Tools**
- MCP: filesystem
- Skill: NONE

**Done when**
- [ ] CTA de WhatsApp e metadados inalterados
- [ ] Nenhuma alteração em queries ou 404
- [ ] Gate full passa

**Tests**: unit
**Gate**: full

---

### Phase 3: Navbar, PixDonation e verificação final

#### T6: Navbar — estado scrolled marinho

**What**: Em `Navbar.tsx`, quando `scrolled`, trocar `bg-white/90 backdrop-blur-md shadow-lg` por `bg-bg-dark/80 backdrop-blur-md shadow-lg` e ajustar links/ícones para `text-white/90 hover:text-accent`. Estado não-scrolled inalterado.
**Where**: `src/components/Navbar.tsx`
**Depends on**: T1
**Reuses**: Tokens de T1; lógica de `scrolled` existente
**Requirement**: VIS-06, VIS-18

**Tools**
- MCP: filesystem
- Skill: NONE

**Done when**
- [ ] Estado scrolled legível sobre fundo marinho
- [ ] Estado não-scrolled e drawer mobile inalterados
- [ ] Gate full passa

**Tests**: unit
**Gate**: full

---

#### T7: Tokenizar `PixDonation`

**What**: Trocar `bg-[#132744]` → `bg-admin-surface` e `bg-[#0d1f3c]` → `bg-surface-deep`, sem alterar props, lógica ou a cor percebida (compatível com o uso em `/painel/dizimo`).
**Where**: `src/components/PixDonation.tsx`
**Depends on**: T1, T4
**Reuses**: Tokens `bg-admin-surface` e `bg-surface-deep`
**Requirement**: VIS-07, VIS-17

**Tools**
- MCP: filesystem
- Skill: NONE

**Done when**
- [ ] Zero hex cru de paleta no arquivo
- [ ] Visual e comportamento idênticos
- [ ] Gate build passa

**Tests**: none
**Gate**: build

---

#### T8: Verificação final e build

**What**: Rodar `npm run typecheck`, `npm run lint`, `npm run build` e `bash scripts/probe-landing-visual.sh`. Confirmar que `package.json` está sem dependência nova e que `Hero.tsx` não sofreu alteração estrutural.
**Where**: repo
**Depends on**: T3, T4, T5a, T5b, T5c, T6, T7
**Reuses**: Gates existentes (AD-006)
**Requirement**: VIS-15, VIS-19

**Tools**
- MCP: filesystem
- Skill: NONE

**Done when**
- [ ] Build sem erros
- [ ] Probe com 0 falhas
- [ ] Nenhuma dependência nova em `package.json`
- [ ] `Hero.tsx` sem alteração estrutural

**Tests**: none
**Gate**: build

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | 1 arquivo CSS (tokens) | ✅ |
| T2 | 3 primitives coesos | ✅ |
| T3 | 1 script probe | ✅ |
| T4 | 7 seções (mesma migração, coesas) | ✅ |
| T5a | 1 wrapper de rota | ✅ |
| T5b | 1 wrapper de rota | ✅ |
| T5c | 1 wrapper de rota | ✅ |
| T6 | 1 componente | ✅ |
| T7 | 1 componente | ✅ |
| T8 | verificação + build | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On | Diagram | Status |
| ---- | ---------- | ------- | ------ |
| T1 | None | raiz (fase 1) | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | T2 | T4 → T5 | ✅ |
| T5a | T2 | raiz (fase 2) | ✅ |
| T5b | T2 | raiz (fase 2) | ✅ |
| T5c | T2 | raiz (fase 2) | ✅ |
| T6 | T1 | T6 → T8 | ✅ |
| T7 | T1, T4 | raiz (fase 3) | ✅ |
| T8 | T3, T4, T5a, T5b, T5c, T6, T7 | T7 → T8 | ✅ |

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| ---- | ---------- | --------------- | --------- | ------ |
| T1 | `globals.css` | unit | unit | ✅ |
| T2 | `visual/*` | unit | unit | ✅ |
| T3 | probe | unit | unit | ✅ |
| T4 | seções | unit | unit | ✅ |
| T5a | rota `/doacao` | unit | unit | ✅ |
| T5b | rota `/eventos` | unit | unit | ✅ |
| T5c | rota `/eventos/[id]` | unit | unit | ✅ |
| T6 | `Navbar` | unit | unit | ✅ |
| T8 | build/smoke | none | none | ✅ |

## Commit Messages

| Task | Conventional Commit |
| ---- | ------------------- |
| T1 | `feat(portal): tokens de glow e superficies de vidro` |
| T2 | `feat(portal): primitives SectionShell SurfaceCard e SectionHeader` |
| T3 | `test(portal): probe do sistema visual da landing` |
| T4 | `feat(portal): unifica secoes da landing aos efeitos do hero` |
| T5a | `feat(portal): unifica doacao ao sistema visual` |
| T5b | `feat(portal): unifica listagem de eventos ao sistema visual` |
| T5c | `feat(portal): unifica detalhe de evento ao sistema visual` |
| T6 | `feat(portal): navbar marinho ao rolar` |
| T7 | `refactor(portal): tokeniza cores do PixDonation` |
| T8 | `chore(portal): build e smoke do sistema visual` |
