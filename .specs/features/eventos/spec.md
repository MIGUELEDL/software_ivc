# Eventos Specification

## Problem Statement

A árvore oficial prevê **Eventos (listagem + detalhe → "inscrever-se" → WhatsApp)** no
portal público (RF-006, RN-003), mas a rota ainda não existe — a home é one-page e o
navbar só usa âncoras. No MVP a liderança ainda não forneceu eventos reais, então o
comportamento deve ser definido com **estado vazio sem dados fabricados** (mesmo
princípio dos dados institucionais). Sem autenticação (portal público); CRUD admin
(RF-024) fica na onda 3.

## Goals

- [ ] Rotas públicas `/eventos` (listagem) e `/eventos/[id]` (detalhe) — RF-006
- [ ] Fonte única de dados `EVENTS` em `src/lib/constants.ts` (AD-008/RNF-011), começando **vazia**
- [ ] Estado vazio amigável quando não houver eventos (sem dados fabricados)
- [ ] Botão **"Inscrever-se"** abrindo WhatsApp oficial com **mensagem pré-preenchida** (RN-003, (83) 99945-0781)
- [ ] Acesso à rota via **navbar** (`/eventos`)
- [ ] Detalhe de evento inexistente → 404
- [ ] Layout mobile-first (RNF-001), acessibilidade WCAG 2.1 AA (RNF-012), fontes únicas (RNF-011)
- [ ] Nenhuma regressão de build/typecheck/lint (gate verde)

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| CRUD de eventos no painel admin (RF-024, RF-030 auditoria) | Onda 3 — painel administrativo ainda não existe |
| Persistência em banco (Supabase) | Onda 2/3 — no MVP a fonte é `constants.ts` (AD-008); nova ADR quando passar a DB |
| Inscrição com dados do visitante (nome/telefone) | Árvore prevê apenas redirecionamento → WhatsApp (RN-003) — sem formulário no MVP |
| Eventos agendados/cron de visibilidade | CRUD/visibilidade chega com RF-024 na onda 3 |
| Doação/Oferta (QR PIX) | Feature própria F3 (RF-007, RN-001) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Fonte de dados dos eventos | `EVENTS` em `src/lib/constants.ts` (estático, atualizado via deploy quando a liderança informar novos eventos) | Banco e painel admin só chegam nas ondas 2/3; consistente com AD-008/fonte única | y |
| Estado inicial | `EVENTS` **vazio**; rota `/eventos` mostra estado vazio amigável ("Em breve avisaremos os próximos eventos") | Liderança ainda não forneceu eventos; não fabricar dados | y |
| Botão "Inscrever-se" | Abre `https://wa.me/5583999450781?text=<msg pré-preenchida>` com o título do evento | RN-003; reduz fricção e padroniza o contato | y |
| Acesso à rota | Item "Eventos" no navbar (NAV_ITEMS passa a suportar rotas além de âncoras) | Árvore coloca Eventos sob Home, mas rota própria é necessária; decisão do admin | y |
| Detalhe: ID inexistente | `notFound()` (404) ao acessar `/eventos/[id]` sem evento correspondente | Comportamento padrão de rota dinâmica; estado vazio também cobre listagem | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### US-01: Listagem de eventos ⭐ MVP

**User Story**: As a visitante, I want to see a listing of upcoming events on the
`/eventos` page, so that eu saiba o que está acontecendo na igreja.

**Why MVP**: RF-006 exige listagem pública; sem ela a árvore oficial fica incompleta.

**Acceptance Criteria** (cada linha é um padrão EARS):

1. The system SHALL render the route `/eventos` listing every entry of `EVENTS` from `src/lib/constants.ts` as a card with its title
2. WHILE `EVENTS` is empty THEN the system SHALL render an empty state with an accessible message and no fabricated events
3. The system SHALL render each event card linking to `/eventos/<id>` (detail route)
4. WHILE an event exists THEN the system SHALL render, on `/eventos/[id]`, its `title`, `date`, `time`, `location` and `description`
5. WHILE `EVENTS` contains no entry matching the requested id THEN the system SHALL respond with a not-found (404) result

### US-02: Inscrever-se via WhatsApp ⭐ MVP

**User Story**: As a visitante interessado em um evento, I want an "Inscrever-se" button
that opens the church WhatsApp with a prefilled message, so that eu possa confirmar
minha participação falando com a igreja (RN-003).

**Why MVP**: RN-003 é regra de negócio aprovada; o botão é o único caminho de inscrição previsto.

**Acceptance Criteria** (cada linha é um padrão EARS):

6. WHILE a visitor activates the "Inscrever-se" call-to-action THEN the system SHALL open `https://wa.me/5583999450781` with a `text` query prefilled by `"Gostaria de me inscrever no evento [event title]"` (URL-encoded)
7. The system SHALL source the WhatsApp number from `SOCIAL.whatsapp` (single source) and the event title from `EVENTS`, with no hardcoded institutional literals in components

### US-03: Acesso e navegação

**User Story**: As a visitante, I want to reach the events page from the navigation, so
that não precise digitar a URL.

**Why MVP**: Árvore oficial lista Eventos sob Home; rota precisa de entrada visível.

**Acceptance Criteria** (cada linha é um padrão EARS):

8. The system SHALL render an "Eventos" navigation item linking to `/eventos` in the navbar and footer
9. The system SHALL keep every interactive element on `/eventos` and `/eventos/[id]` accessible via keyboard with an accessible name (WCAG 2.1 AA — RNF-012)
10. The system SHALL render both routes responsively for small screens (mobile-first — RNF-001)

**Independent Test**: `npm run lint && npm run typecheck && npm run build` + inspeção
estática por AC com `file:line` (constante → consumidor); conferir que o estado vazio
aparece com `EVENTS = []`; que o botão gera `wa.me/5583999450781?text=...` com o título
interpolado e URL-encoded; que `/eventos/nonexistent` responde 404; nenhum literal
institucional nos componentes.

---

## Edge Cases

- IF `EVENTS` is empty THEN `/eventos` SHALL show the empty state and `/eventos/[id]` SHALL 404 for any id
- IF the `text` query contains accents or spaces THEN the system SHALL encode it correctly in the WhatsApp URL

---

## Requirement Traceability

| Requirement ID | Story | Requirement(s) | Status |
| -------------- | ----- | -------------- | ------ |
| EVENTOS-01 | US-01 | RF-006, RNF-011 | Pending |
| EVENTOS-02 | US-01 | RF-006 | Pending |
| EVENTOS-03 | US-01 | RF-006 | Pending |
| EVENTOS-04 | US-01 | RF-006, RNF-011 | Pending |
| EVENTOS-05 | US-01 | RF-006 | Pending |
| EVENTOS-06 | US-02 | RN-003 | Pending |
| EVENTOS-07 | US-02 | RNF-011 | Pending |
| EVENTOS-08 | US-03 | RF-001..005 (nav compartilhada) | Pending |
| EVENTOS-09 | US-03 | RNF-012 | Pending |
| EVENTOS-10 | US-03 | RNF-001 | Pending |

**ID format:** `[CATEGORY]-[NUMBER]` — `EVENTOS-NN`.

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 10 total, 0 verified, 10 pending

---

## Success Criteria

- [ ] As 10 ACs (EVENTOS-01..10) passam com evidência `file:line` e valor exato
- [ ] `npm run lint`, `npm run typecheck` e `npm run build` verdes
- [ ] Rotas `/eventos` e `/eventos/[id]` renderizam conforme o esperado com `EVENTS` vazio e com eventos
- [ ] Botão "Inscrever-se" abre WhatsApp com mensagem pré-preenchida (valor exato do `text`)
- [ ] Nenhuma constante institucional duplicada nos componentes