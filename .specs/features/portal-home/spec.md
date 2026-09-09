# Portal Home Specification

## Problem Statement

A landing page atual (rota `/`) cobre parte da árvore oficial da Home, mas **não
apresenta** as seções institucionais completas: faltam a seção de **Liderança**
(RF-002) e a exibição de **Missão e Visão** (RF-001 — hoje só os val.ores são
renderizados). Além disso, os dados devem vir **exclusivamente** da fonte única
`src/lib/constants.ts` (AD-008/RNF-011), sem duplicar literais nos componentes. A
estrutura seguida é **one-page com âncoras** (decisão registrada em `context.md`),
conforme a árvore oficial que lista os itens sob "Home".

## Goals

- [ ] Home one-page exibe todas as seções da árvore: Sobre/História, Missão/Visão/Valores, Liderança, Localização + contato, Cultos, Redes sociais
- [ ] Seção **Liderança** nova (RF-002) consumindo `CHURCH.leader`
- [ ] **Missão e Visão** renderizadas consumindo `CHURCH.mission` / `CHURCH.vision`
- [ ] Navegação por âncoras cobrindo as seções (RF-001..005)
- [ ] Nenhum literal institucional duplicado nos componentes (fonte única AD-008)
- [ ] Interações e imagens acessíveis (RNF-012 WCAG 2.1 AA) e layout mobile-first (RNF-001)
- [ ] **Imagens reestruturadas**: `public/img1..10.jpg` (obsoletas) removidas; só `public/logo.png` permanece; Hero/About usam **placeholders** de gradiente até as novas imagens chegarem
- [ ] **Gallery removida** da home (não consta na árvore oficial e depende de imagens) — reabre como feature própria quando as novas imagens forem fornecidas
- [ ] Nenhuma regressão de build/typecheck/lint (gate verde)

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Eventos (listagem/detalhe/inscrição → WhatsApp) | Feature própria **F2** (RF-006, RN-003) — rota separada |
| Doação/Oferta (QR PIX) | Feature própria **F3** (RF-007, RN-001) — rota separada |
| Login (admin/membro) | Feature própria **F4** (RF-008/011, RN-002) |
| Rotas separadas por seção (`/sobre`, `/lideranca`…) | Decidido `context.md`: manter one-page + âncoras no MVP |
| Painel membro e painel admin | Features das ondas 2 e 3 |
| CMS/edição via painel admin | Nova ADR quando o painel admin exigir |
| **Galeria de fotos** | Removida da home: não consta na árvore oficial e depende das imagens novas (a fornecer) — reabrir como feature própria depois |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Formato da Home | One-page com âncoras (nav = `#hero #sobre #valores #lideranca #clamor #cultos #redes`) | Árvore oficial lista as seções sob "Home"; já é o padrão atual; Eventos/Doação ficam em rotas próprias (F2/F3) | y |
| Liderança pública | Seção exibe `CHURCH.leader` (Pastor Ernandes Nogueira de Lucena) | Dado oficial confirmado; painel admin poderá ampliar a listagem (RF-023) em feature futura | y |
| Missão/Visão/Valores | Seção "Nossos Valores" passa a exibir Missão + Visão + cards de Valores | RF-001 cobre "História/Missão-Valores"; hoje só os valores aparecem | y |
| Origem de dados | `src/lib/constants.ts` é a única fonte (sem literal inline nos componentes) | AD-008 / RNF-011; reforçado pelo verifier anterior | y |
| Imagens da home | `public/img1..10.jpg` **excluídas**; mantém **apenas** `public/logo.png`; Hero/About usam **placeholders** (gradiente) até as novas imagens chegarem | Decisão do administrador: fotos atuais obsoletas; "placeholders agora, imagens depois" | y |
| Galeria de momentos | **Removida** da home e o componente deixou de ser montado | Não consta na árvore oficial e depende das imagens; reabre como feature própria | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### US-01: Home institucional completa ⭐ MVP

**User Story**: As a visitante da plataforma, I want a home one-page que apresente a
história, missão, visão, valores, liderança, endereço/contato, cultos e redes sociais
oficiais so that eu confie na igreja e saiba como participar.

**Why MVP**: A home é a vitrine pública (RF-001..005) e a porta de entrada para
Eventos/Doação (F2/F3); seções ausentes quebram a árvore oficial.

**Acceptance Criteria** (cada linha é um padrão EARS):

1. The system SHALL render, at the route `/`, a hero section displaying `CHURCH.name` and `CHURCH.slogan`
2. The system SHALL render a "Sobre/História" section displaying `CHURCH.about`, `CHURCH.foundedDate`, `CHURCH.foundedLocation` and `CHURCH.cnpj`
3. The system SHALL render a "Missão/Visão/Valores" section displaying `CHURCH.mission`, `CHURCH.vision` and every entry of `CHURCH.values`
4. The system SHALL render a "Liderança" section with `id="lideranca"` displaying `CHURCH.leader`
5. The system SHALL render a "Cultos" section with `id="cultos"` displaying every entry of `SCHEDULE` (day, time, title)
6. The system SHALL render a "Localização + contato" display with `SOCIAL.address` and `SOCIAL.email`
7. The system SHALL render a "Redes sociais" section with `id="redes"` displaying links to `SOCIAL.instagram`, `SOCIAL.youtube` and `SOCIAL.whatsapp`
8. The system SHALL provide navigation anchors that link to `#sobre`, `#valores`, `#lideranca`, `#cultos` and `#redes`
9. The system SHALL source every institutional value from `src/lib/constants.ts` with no duplicated literals in components
10. WHILE an image or link is rendered THEN the system SHALL include an accessible alternative text or label (WCAG 2.1 AA — RNF-012)
11. The system SHALL NOT depend on `public/img1..10.jpg` minus: only `public/logo.png` SHALL be referenced by home components, and Hero/About SHALL use gradient placeholders until new photos are provided
12. The home page SHALL NOT render the gallery of photos section (deferred: removed from the official tree pending the new images)

**Independent Test**: `npm run lint && npm run typecheck && npm run build` + inspeção
estática: cada AC localizado com `file:line` (constante → consumidor na UI); conferir
que `#lideranca` e as renderizações de `CHURCH.mission`/`CHURCH.vision` existem; que
nenhum literal institucional está duplicado nos componentes; e que nenhum componente
da home referencia `img1..10.jpg`.

---

## Edge Cases

- IF a nova seção Liderança for adicionada THEN a navegação `NAV_ITEMS` SHALL incluir
  `#lideranca` (anchor consistente com as demais seções)
- IF uma constante institucional for consumida por mais de um componente THEN todos os
  pontos SHALL referenciar `src/lib/constants.ts` (fonte única, AD-008)

---

## Requirement Traceability

| Requirement ID | Story | Requirement(s) | Status |
| -------------- | ----- | -------------- | ------ |
| HOME-01 | US-01 | RF-008, RNF-001 | Pending |
| HOME-02 | US-01 | RF-001, RNF-011 | Pending |
| HOME-03 | US-01 | RF-001, RNF-011 | Pending |
| HOME-04 | US-01 | RF-002, RNF-011 | Pending |
| HOME-05 | US-01 | RF-004, RNF-011 | Pending |
| HOME-06 | US-01 | RF-003, RNF-001 | Pending |
| HOME-07 | US-01 | RF-005, RNF-011 | Pending |
| HOME-08 | US-01 | RF-001..005, RNF-012 | Pending |
| HOME-09 | US-01 | RNF-011 (fonte única) | Pending |
| HOME-10 | US-01 | RNF-012 (WCAG AA) | Pending |
| HOME-11 | US-01 | RNF-001, RNF-011 (imagens/placeholders) | Pending |
| HOME-12 | US-01 | RNF-001 (galeria fora do escopo) | Pending |

**ID format:** `[CATEGORY]-[NUMBER]` — `HOME-NN`.

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 12 total, 0 verified, 12 pending

---

## Success Criteria

- [ ] As 12 ACs (HOME-01..12) passam com evidência `file:line` e valor exato
- [ ] `npm run lint`, `npm run typecheck` e `npm run build` verdes
- [ ] Seção Liderança renderiza `CHURCH.leader`; Missão/Visão aparecem na UI
- [ ] Nenhuma constante institucional duplicada nos componentes
- [ ] `public/img1..10.jpg` removidos; só `public/logo.png` permanece; home sem referências às fotos antigas (placeholders em Hero/About)