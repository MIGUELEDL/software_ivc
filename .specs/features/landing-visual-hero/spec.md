# Landing Visual — Sistema de efeitos unificado a partir do Hero

## Problem Statement

A Landing Page tem nove seções construídas uma a uma, sem nenhum primitive
compartilhado: cada uma repete `py-20 sm:py-32`, `max-w-7xl mx-auto px-4 sm:px-6
lg:px-8`, `text-center mb-16` e `rounded-2xl bg-admin-surface shadow-xl`. O
resultado é a inconsistência visível: o Hero usa três camadas de gradiente
empilhadas, mas o mesmo glow foi copiado e **divergido** —
`LiveBanner.tsx:10` usa alpha `20` contra `30` do Hero, e `About.tsx:64` inventa
uma variante dourada `#C9A227` com outro stop (`65%`); `PixDonation.tsx:29,47`
usa hex `#132744` cru em vez do token `bg-admin-surface`; `Leadership.tsx:76` usa
`text-1xl`, classe inexistente no Tailwind v4 que renderiza o nome do líder no
tamanho herdado. A página não tem uma linguagem visual própria: tem nove
decisões locais.

## Goals

- [ ] Um primitive único de fundo (`SectionShell`) que carrega a estrutura do Hero
- [ ] **Três** estilos de efeito distintos, todos pertencentes à mesma identidade
- [ ] Glow do Hero definido **uma vez** — sem hex divergente nem alpha divergente
- [ ] Todas as seções da Landing migradas para o fundo marinho do Hero
- [ ] Cores institucionais aplicadas por token (zero hex de paleta cru)
- [ ] Responsivo em 320/768/1440 px e sem custo de performance por frame
- [ ] Estrutura, âncoras, dados e funcionalidades **inalteradas**

## Out of Scope

| Feature | Reason |
|---------|--------|
| Animações de scroll-parallax ou loop infinito em fundos | Custo de performance e risco de enjoo; forbidden by the perf goal |
| Redesenho do conteúdo, textos ou ordem das seções | Requisito é consistência visual, não reformulação |
| Fonte, tamanho base ou paleta institucional | Mudaria a identidade fora do escopo pedido |
| Cartão de membro e painel/admin | Outra superfície (`cartao-valididade-anual` e restyles anteriores) |
| Nova dependência (biblioteca de animação/gradient) | Framer-motion já cobre o necessário |
| Ilustrações, fotos novas ou imagens geradas | Efeitos são CSS |
| Modo escuro / tema alternativo | Escopo single-theme (AD-001) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|----------------------|----------------|-----------|------------|
| Fundo das seções claras | Migrar **todas** para marinho escuro (`bg-dark`/`primary`) | Usuário escolheu "migrar para marinho escuro"; é a unificação mais fiel ao Hero | Sim (decisão do usuário) |
| Efeito do Hero | **Intocado** — é a referência, não o alvo de mudança | Alterar o Hero invalidaria a referência do pedido | Sim (decisão técnica) |
| Os três efeitos | `aurora`, `feixe`, `vitral` (glow radial / feixe diagonal / vidro com profundidade) | Todos derivados de camadas CSS empilhadas como o Hero; cobre "radiais, blur, shapes, overlays, bordas, transparência, profundidade" | Sim (decisão técnica) |
| Atribuição dos efeitos | `aurora` → Hero, Sobre, Clamor; `feixe` → Cultos, Valores; `vitral` → Líderes, Redes, Eventos, Doações, Footer | Ritmo alternado evita monotonia mantendo a base comum | Sim (decisão técnica) |
| Glow único | Definido no `SectionShell` a partir de tokens, removendo `#1a3a6b` e `#C9A227` literais | Elimina a divergência de alpha e de cor que causa a inconsistência | Sim (decisão técnica) |
| Navbar ao rolar | Passa de `bg-white/90` para superfície marinho translúcida | Uma navbar branca sobre seções marinho é a inconsistência mais visível da página | Sim (decisão técnica) |
| `bg-white` / `bg-bg-gray` restantes | Removidos **apenas** da Landing | Fundo claro sobre cartão de vidro quebra a identidade | Sim (decisão técnica) |
| Cards de conteúdo | Vidro: `bg-white/5`, borda `border-white/10`, `backdrop-blur-sm` | Profundidade sem esconder o gradiente de base | Sim (decisão técnica) |
| Texto secundário | No mínimo `text-white/70` sobre base marinho | Legibilidade preservada após o fundo escuro | Sim (decisão técnica) |
| Animação em hover | Mantida (`transition-*` + `hover:-translate-y-2`), sem loop infinito | Preserva a sensação existente sem custo por frame | Sim (decisão técnica) |
| Fundos | Somente camadas CSS estáticas; nenhum `motion.*` em fundo | Garante zero JS por frame nos efeitos | Sim (decisão técnica) |
| `text-1xl` em Líderes | Corrigido para `text-xl` | Classe inexistente no Tailwind v4: defeito de render, não escolha estética | Sim (decisão técnica) |
| Hex da paleta em `PixDonation` | Trocado por tokens (`bg-admin-surface` e novo equivalente ao `#0d1f3c`) | Consolida a paleta em um único lugar | Sim (decisão técnica) |
| Escopo do `/painel` e `/admin` | Intocados | Suas paletas já foram unificadas em restyles anteriores | Sim (decisão do usuário) |

**Open questions:** none — todas as decisões foram confirmadas pelo usuário ou
derivadas da leitura do código existente.

---

## User Stories

### P1: Uma linguagem visual única na Landing ⭐ MVP

**User Story**: As a visitor, I want the whole landing page to look like one
designed page instead of nine separately styled sections so the church presents
a credible, unified identity.

**Why P1**: É o pedido central; sem a base comum os efeitos não se sustentam.

**Acceptance Criteria**:

1. The system SHALL provide a single shared section primitive that renders the Hero's base gradient structure for every landing section
2. The system SHALL define the Hero's radial glow exactly once, deriving its color and alpha from design tokens, so that no landing file contains a hardcoded `#1a3a6b` or `#C9A227` glow literal
3. WHEN a landing section is migrated THEN its root SHALL use the shared primitive instead of its own `bg-*` background
4. WHEN the landing page is rendered THEN every section background SHALL be the dark navy family (`bg-dark`/`primary`), with no remaining `bg-white` or `bg-bg-gray` on the landing surface
5. WHEN the landing page is rendered THEN the `#hero` section SHALL keep its current three-layer background unchanged
6. WHEN the scrolled navbar is displayed over a navy section THEN it SHALL use a translucent navy surface instead of `bg-white/90`
7. IF a content card is rendered on a landing section THEN its background SHALL come from the design tokens rather than a raw hex literal

**Independent Test**: abrir `/` e percorrer as nove seções — fundo contínuo
marinho, sem faixa branca/cinza entre elas, sem hex de paleta no código.

---

### P2: Três efeitos complementares com profundidade real

**User Story**: As a visitor, I want the sections to have visual depth and
movement of light that feel crafted, so the page feels alive without being
distracting.

**Why P2**: É o segundo pedido explícito; a base comum sozinha ficaria plana.

**Acceptance Criteria**:

1. WHEN the three effect styles are rendered side by side THEN each SHALL be visually distinguishable from the others while sharing the same color family and base gradient
2. The `aurora` effect SHALL use a centered radial glow with a stop at 70% of the ellipse radius, matching the Hero's geometry
3. The `feixe` effect SHALL use a diagonal beam built from a repeating gradient at low opacity plus a blurred overlay
4. The `vitral` effect SHALL use translucent cards with a visible border and backdrop blur over the base gradient
5. WHEN any effect renders THEN its decorative layers SHALL be marked non-interactive so they never intercept clicks on content
6. WHEN an effect is used on a section THEN content SHALL be stacked above all decorative layers
7. IF a visitor prefers reduced motion THEN the effects SHALL render in their static form without motion

**Independent Test**: `/` em 1440px — `Sobre` (aurora), `Cultos` (feixe) e
`Líderes` (vitral) devem ser nitidamente diferentes entre si e iguais em família
de cor; nenhum clique deve ser bloqueado pelos fundos.

---

### P3: Responsivo e sem custo de performance

**User Story**: As a visitor on a phone, I want the landing page to load fast
and not break on a small screen, so I can read it on mobile data.

**Why P3**: O pedido exige preservar desempenho e responsividade ao adicionar
efeitos.

**Acceptance Criteria**:

1. WHEN the landing page renders THEN every effect SHALL be implemented with static CSS layers and SHALL NOT animate per frame in JavaScript
2. The visual system SHALL NOT introduce any new runtime dependency
3. WHEN the viewport is 320px, 768px or 1440px wide THEN the page SHALL NOT produce horizontal overflow
4. WHEN an effect is applied THEN the gradient definitions SHALL reference design tokens instead of literal hex colors
5. IF a section's content is longer than the section's background layers THEN the content SHALL remain fully visible and unclipped
6. WHEN the existing hover transitions run THEN they SHALL be preserved (cards keep `hover:-translate-y-2` and the shadow change)

**Independent Test**: `scripts/probe-landing-visual.sh` verde; Lighthouse/`npm
run build` sem aumento de bundle por dependência; conferir overflow em 320px.

---

## Edge Cases

- IF a section has a long list of items (many leaders, many schedule items) THEN its background SHALL cover the full section height without repeating or leaving gaps
- IF a leader or event has no image THEN its fallback styling SHALL remain visible against the navy background
- IF `backdrop-blur` is unsupported by the browser THEN the card SHALL remain legible via its translucent background color alone
- IF the viewport is very short (landscape phone) THEN the section content SHALL remain reachable without clipping
- IF a section's decorative layer renders before its content in DOM order THEN the content SHALL still receive pointer events
- IF `PixDonation` is rendered inside the dark member panel THEN it SHALL keep its current legibility, since the same component is shared by `/doacao` and `/painel/dizimo`

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---------------|-------|-------|--------|
| VIS-01 | P1: Linguagem única | Design | Pending |
| VIS-02 | P1: Linguagem única | Design | Pending |
| VIS-03 | P1: Linguagem única | Design | Pending |
| VIS-04 | P1: Linguagem única | Design | Pending |
| VIS-05 | P1: Linguagem única | Design | Pending |
| VIS-06 | P1: Linguagem única | Design | Pending |
| VIS-07 | P1: Linguagem única | Design | Pending |
| VIS-08 | P2: Três efeitos | Design | Pending |
| VIS-09 | P2: Três efeitos | Design | Pending |
| VIS-10 | P2: Três efeitos | Design | Pending |
| VIS-11 | P2: Três efeitos | Design | Pending |
| VIS-12 | P2: Três efeitos | Design | Pending |
| VIS-13 | P2: Três efeitos | Design | Pending |
| VIS-14 | P3: Responsivo/perf | Design | Pending |
| VIS-15 | P3: Responsivo/perf | Design | Pending |
| VIS-16 | P3: Responsivo/perf | Design | Pending |
| VIS-17 | P3: Responsivo/perf | Design | Pending |
| VIS-18 | P3: Responsivo/perf | Design | Pending |
| VIS-19 | P3: Responsivo/perf | Design | Pending |

**Coverage:** 19 total, 0 mapped to tasks, 19 unmapped ⚠️

---

## Success Criteria

- [ ] `scripts/probe-landing-visual.sh` verde (glow único, três efeitos presentes e distintos, zero `bg-white`/`bg-bg-gray` na landing, zero hex de paleta cru, Hero intocado, camadas não interativas, content acima dos fundos)
- [ ] `npm run typecheck` e `npm run lint` sem erros; `npm run build` sem erro
- [ ] `package.json` sem dependência nova
- [ ] As nove seções da landing, mais `/doacao`, `/eventos` e `/eventos/[id]`, com fundo marinho contínuo
- [ ] Nenhuma mudança de dado, texto, ordem de seções, âncora ou rota
