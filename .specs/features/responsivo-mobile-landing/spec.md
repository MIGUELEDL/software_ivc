# Responsivo Mobile — Landing (Parte 1) Specification

## Problem Statement

A landing foi composta desktop-first: títulos (`text-4xl/5xl`), cards (`p-8/p-10`)
e seções (`py-20`) fixos fazem o mobile (360px) parecer um site espremido —
elementos grandes demais, ritmo vertical arrastado. O desktop está perfeito e
não pode mudar um pixel; a identidade (cores, fontes, padrões — `@theme` em
`globals.css`) é intocável.

## Goals

- [ ] Zero scroll horizontal em 360px em todas as seções da landing
- [ ] Hierarquia legível no mobile: hero e títulos de seção em escala confortável
- [ ] Cards e espaçamentos compactos no mobile, idênticos no desktop
- [ ] Alvos de toque ≥ 44px nos botões/links principais no mobile
- [ ] Probes e suítes existentes seguem verdes (nenhum texto/classe assertada some)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Painel admin (qualquer módulo) | Slices seguintes, um módulo por vez (decisão do usuário) |
| Mudança visual no desktop | Congelado pixel a pixel; só prefixos `sm:`/`md:` adicionados |
| Cores, fontes, padrões, textos | Identidade intocável; só escala/ritmo |
| Novos componentes ou seções | Refactor de estilização, sem estrutura nova |
| Breakpoints custom | Só os padrão do Tailwind (`sm:640`, `md:768`) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Estratégia | Mobile-first aditivo: base menor + `sm:`/`md:` restaurando o atual | Menor blast radius nos probes (L-015: classes assertadas); desktop intacto por construção | y |
| Escala de títulos | Hero `text-3xl`→`sm:text-5xl`; seções `text-2xl`→`sm:text-4xl` | Redução ~25–30% no mobile pedida pelo usuário | y |
| Calibragem T5 (2026-10-13) | Cards lado a lado no mobile (`grid-cols-2` na base, padrão do PC) + conteúdo menor (p-4, ícones e textos um degrau abaixo) | Pedido do operador: empilhado vertical parecia "grande"; 2 cols só mudam <640px (≥640 intacto) salvo Schedule 640–768 (1→2 cols, aceito) | y |
| Cards/seções | `p-5`→`sm:p-8`, `py-12`→`sm:py-20` (mesma proporção) | Compacta sem reempacotar conteúdo | n |
| Estilos antigos inconsistentes | Atualizar para o padrão vigente quando divergirem (ex.: arbitrários `w-25` fora da escala) | Pedido explícito do usuário (consistência total) | y |
| Verificação visual | Screenshots/frames do operador no localhost + probes locais | Sem device farm; viewport 360px como referência | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Tipografia fluida ⭐ MVP

**User Story**: As a visitante no celular, I want títulos em escala confortável so that a leitura flua sem zoom nem quebra estranha.

**Why P1**: É 80% da queixa ("tudo grande").

**Acceptance Criteria**:

1. WHEN a landing for aberta em 360px THEN the system SHALL exibir o título do hero em `text-3xl` e os títulos de seção em `text-2xl`. <!-- RSP-01, event-driven -->
2. WHEN a viewport for ≥640px THEN the system SHALL exibir os tamanhos atuais (`text-5xl` hero, `text-4xl` seções). <!-- RSP-02, event-driven -->
3. The system SHALL não alterar nenhuma cor, fonte, texto ou ordem de conteúdo. <!-- RSP-03, ubiquitous -->
4. IF qualquer texto assertado por probes sumir ou mudar THEN the system SHALL ser considerado em regressão (gate). <!-- RSP-04, unwanted-behavior -->

**Independent Test**: Frames 360px vs desktop lado a lado; `grep` confirma textos intactos.

---

### P2: Cards e ritmo vertical

**User Story**: As a visitante no celular, I want cards compactos e seções com respiro proporcional so that a página não pareça esticada.

**Why P2**: Segunda metade da queixa (cards altos, seções longas).

**Acceptance Criteria**:

1. WHEN em 360px THEN the system SHALL aplicar padding base menor nos cards (`p-5`) e nas seções (`py-12`). <!-- RSP-05, event-driven -->
2. WHEN em ≥640px THEN the system SHALL manter os paddings atuais (`p-8`/`py-20`). <!-- RSP-06, event-driven -->
3. The botões/links principais SHALL ter altura mínima 44px no mobile. <!-- RSP-07, ubiquitous -->

**Independent Test**: Medir hero e 1 card de cada seção em 360px (altura ≤ 70% da atual).

---

### P3: Navbar e footer no mobile

**User Story**: As a visitante no celular, I want navegação e rodapé confortáveis so that nada quebre no menor viewport.

**Why P3**: Acabamento (menu hamburger e footer já funcionam; é polish).

**Acceptance Criteria**:

1. WHEN o menu mobile abrir THEN the system SHALL exibir links com altura de toque ≥44px sem overflow horizontal. <!-- RSP-08, event-driven -->
2. WHEN em 360px THEN the system SHALL exibir o footer sem overflow e com ícones sociais alinhados. <!-- RSP-09, event-driven -->

**Independent Test**: Abrir menu + rolar até o footer em 360px.

---

## Edge Cases

- IF a viewport for <360px (ex.: 320px) THEN the system SHALL manter zero overflow horizontal (pior caso coberto). <!-- RSP-10 -->
- IF um estilo antigo divergir do padrão (ex.: `w-25`, margem arbitrária) THEN the system SHALL atualizá-lo para a escala vigente na mesma tarefa. <!-- RSP-11 -->
- WHEN probes existentes assertarem classe/texto alterado THEN the system SHALL falhar o gate e a tarefa volta (sem "ajustar o probe" para passar). <!-- RSP-12 -->

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| RSP-01 | P1: Tipografia | Execute | Verified |
| RSP-02 | P1: Tipografia | Execute | Verified |
| RSP-03 | P1: Tipografia | Design | Pending |
| RSP-04 | P1: Tipografia | Design | Pending |
| RSP-05 | P2: Cards | Execute | Verified |
| RSP-06 | P2: Cards | Execute | Verified |
| RSP-07 | P2: Cards | Design | Pending |
| RSP-08 | P3: Nav/footer | Execute | Verified |
| RSP-09 | P3: Nav/footer | Execute | Verified |
| RSP-10 | Edge <360px | Design | Pending |
| RSP-11 | Edge legado | Design | Pending |
| RSP-12 | Edge probes | Design | Pending |

**Coverage:** 12 total, 0 mapped to tasks, 12 unmapped ⚠️

---

## Success Criteria

- [ ] 360px sem scroll horizontal em nenhuma seção (verificado por frames)
- [ ] Desktop idêntico (diff visual por amostragem + probes verdes)
- [ ] `test:ci` + probes afetados verdes; zero texto/classe assertada removida
