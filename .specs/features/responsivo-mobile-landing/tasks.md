# Responsivo Mobile — Landing (Parte 1) — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: inline (estratégia mobile-first aditiva aprovada na spec; sem Design formal)
**Status**: In Progress

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `AGENTS.md` (gates SDD), AD-030 (Vitest), LESSONS L-014 (corpo exato) e L-015 (assert de classe/texto de render — razão central do gate de regressão aqui). Sem suite Vitest para landing; `probes-admin-lideranca.sh` referencia `Leadership` (única cobertura automatizada da área); resto é verificado por probes de regressão + frames do operador em 360px.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Componentes landing (só classes) | integration (regressão) | Nenhum texto/classe assertada some; desktop idêntico | `src/components/*.tsx` | probes afetados + `test:ci` |
| Leadership (com probe) | integration | `probes-admin-lideranca.sh` verde | `scripts/probes-admin-lideranca.sh` | `bash scripts/probes-admin-lideranca.sh` |
| Docs | none | build gate only | — | lint/typecheck/build |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Após cada tarefa | `npm run test:ci` |
| Full | T3 (Leadership tem probe) | `test:ci` + `bash scripts/probes-admin-lideranca.sh` (servidor + DB dev) |
| Build | Todas (tsx no bundle) | `npm run lint && npm run typecheck && npm run build` |

---

## Execution Plan

Sequencial, uma tarefa por vez (componentes vizinhos dividem padrões).

### Phase 1: Landing mobile

```
T1 → T2 → T3 → T4
```

---

## Task Breakdown

### T1: Hero + Navbar (mobile-first) ✅

**What**: Escala mobile do hero (título 3xl→5xl, CTAs, respiro) e polish do menu mobile (toque ≥44px, sem overflow).
**Where**: `src/components/Hero.tsx`, `src/components/Navbar.tsx`
**Depends on**: None
**Reuses**: Tokens `@theme` (cores/fontes intactas); padrão `sm:` aditivo
**Requirement**: RSP-01, RSP-02, RSP-03, RSP-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] 360px: hero legível sem zoom; menu abre com links ≥44px e zero overflow
- [ ] Desktop pixel-idêntico (amostragem + build)
- [ ] Gate check passes: `test:ci` + Build; frames do operador em 360px

**Tests**: integration
**Gate**: build

**Commit**: `style(landing): hero e navbar mobile-first`

---

### T2: Seções About + Values ✅

**What**: Títulos `2xl→4xl`, cards `p-5→p-8`, ritmo `py-12→py-20`; atualiza estilos legados divergentes.
**Where**: `src/components/About.tsx`, `src/components/Values.tsx`
**Depends on**: T1
**Reuses**: Escala decidida na T1
**Requirement**: RSP-01, RSP-02, RSP-05, RSP-06, RSP-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] 360px: seção cabe em ~1 dobra e meia; cards compactos sem perda de conteúdo
- [ ] Desktop pixel-idêntico; zero texto alterado (`grep` confirma)
- [ ] Gate check passes: `test:ci` + Build; frames do operador

**Tests**: integration
**Gate**: build

**Commit**: `style(landing): secoes about e values mobile-first`

---

### T3: Leadership + Schedule + LiveBanner ✅

**Nota (2026-10-13)**: `probes-admin-lideranca.sh` 101 ok / 1 falha; a falha é staleness pré-existente (tier grepa `href="/admin/lideranca"` JSX, a página usa sintaxe objeto `href: ...`; arquivo fora do diff desta feature).

**What**: Mesma escala nos blocos restantes de conteúdo; roda o probe que cobre Leadership.
**Where**: `src/components/Leadership.tsx`, `src/components/Schedule.tsx`, `src/components/LiveBanner.tsx`
**Depends on**: T2
**Reuses**: Escala T1/T2
**Requirement**: RSP-01, RSP-02, RSP-05, RSP-06, RSP-07, RSP-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] 360px: foto/nome/cargo do líder legíveis; grade de cultos sem overflow; botões ≥44px
- [ ] `bash scripts/probes-admin-lideranca.sh` verde (única cobertura automatizada da área)
- [ ] Gate check passes: Full; frames do operador

**Tests**: integration
**Gate**: full

**Commit**: `style(landing): liderança, cultos e live mobile-first`

---

### T4: PixDonation + SocialLinks + Footer ✅

**What**: Fecha a landing: QR/doação, redes e rodapé sem overflow em 360px.
**Where**: `src/components/PixDonation.tsx`, `src/components/SocialLinks.tsx`, `src/components/Footer.tsx`
**Depends on**: T3
**Reuses**: Escala T1/T2
**Requirement**: RSP-05, RSP-06, RSP-09, RSP-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] 360px e 320px: zero overflow horizontal em todas; QR e ícones proporcionais
- [ ] Desktop pixel-idêntico; payload PIX intacto (não tocar em `pix.ts`)
- [ ] Gate check passes: `test:ci` + Build; frames do operador (aceite final da Parte 1)

**Tests**: integration
**Gate**: build

**Commit**: `style(landing): doacao, redes e rodape mobile-first`

---

### T5: Cards lado a lado no mobile (calibragem do operador) ✅

**What**: Grids de conteúdo com 2 colunas já na base + compactação interna (p-4, ícones/textos menores); desktop ≥640 intacto.
**Where**: `src/components/Values.tsx`, `src/components/Schedule.tsx`, `src/components/Leadership.tsx`, `src/components/SocialLinks.tsx`
**Depends on**: T4
**Reuses**: Escala T1–T4
**Requirement**: RSP-05, RSP-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] 360px: Propósito/Visão, valores, cultos, líderes e redes em 2 colunas, conteúdo proporcional
- [ ] ≥640px idêntico ao atual; zero texto alterado
- [ ] Gate check passes: `test:ci` + Build; frames do operador

**Tests**: integration
**Gate**: build

**Commit**: `style(landing): cards lado a lado no mobile`

---

## Phase Execution Map

```
Phase 1:  T1 ------→ T2 ------→ T3 ------→ T4 ------→ T5
```

Single batch (4 tasks ≤ 8) → execução inline, sem sub-agentes.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Hero + Navbar | 2 componentes coesos (topo) | ✅ Granular |
| T2: About + Values | 2 seções institucionais | ✅ Granular |
| T3: Leadership/Schedule/Live | 3 blocos de conteúdo | ✅ Granular |
| T4: Pix/Social/Footer | 3 blocos finais | ✅ Granular |
| T5: 2-col mobile | 4 grids + compactação | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | início | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Componentes landing | integration | integration | ✅ OK |
| T2 | Componentes landing | integration | integration | ✅ OK |
| T3 | Leadership (com probe) | integration | integration | ✅ OK |
| T4 | Componentes landing | integration | integration | ✅ OK |
| T5 | Componentes landing | integration | integration | ✅ OK |

---

## Task Verification Standards

`Done when` + `Tests` + `Gate` por tarefa. Critério binário por item; frames do operador em 360px como aceite visual; nenhuma classe/texto assertada removida (RSP-12: probe que quebrar volta a tarefa).
