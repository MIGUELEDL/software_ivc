# Sobre — Dados Institucionais Specification

## Problem Statement

A landing page atual usa placeholders e dados aproximados em `src/lib/constants.ts`
("Sua Cidade", "Em breve", "contato@igrejavirtudecrista.com", endereço "próx. ao INSS").
Os dados reais da igreja já foram coletados e confirmados nas descobertas (F0–F2), mas
não são a fonte única. Placeholders em tela prejudicam a credibilidade institucional e
dificultam o consumo correto dos dados pelos componentes.

## Goals

- [ ] Fonte única de dados institucionais em `src/lib/constants.ts` com os valores reais confirmados (endereço, cidade, pastor, e-mail, redes sociais, horários de culto)
- [ ] Nenhuma regressão de build/typecheck/lint na landing page (gate verde)

## Out of Scope

| Feature     | Reason         |
| ----------- | -------------- |
| Persistência em banco / edição via painel admin | Dados estáticos no bundle para o portal (F9); edição dinâmica será nova ADR quando o painel admin exigir |
| Número de WhatsApp da igreja | Decisão D4 em aberto (aguardando liderança) — permanece placeholder |
| Conteúdo litúrgico não confirmado ("Clamor do Meio-Dia") | Não coletado nas descobertas; fora do escopo deste piloto |
| Testes automatizados de unidade | Framework de testes entra na F10; gate atual = lint + typecheck + build |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default  | Rationale | Confirmed? |
| --------------------- | --------------- | --------- | ---------- |
| Número de WhatsApp (decisão D4) ainda não informado | `SOCIAL.whatsapp` permanece com valor `"#"` | Valor não pode ser inventado; AC-09 captura a regra do placeholder até a liderança informar | n |
| Dados de "Clamor do Meio-Dia" (`liveTime`/`liveLabel`/`liveDescription`) não foram confirmados nas descobertas | Mantidos inalterados como estão | Mudá-los seria fabricar conteúdo; fora do escopo do piloto | n |
| A rua "Rua Quiezinho Fernandes" e o bairro "Nossa Senhora de Fátima" correspondem a um único endereço físico da igreja | Compõem o campo de endereço completo com número 213 e cidade "Santa Luzia - PB" | Confirmado nas descobertas F0–F2: Bairro Nossa Senhora de Fátima, Rua Quiezinho Fernandes, nº 213 | y |
| Formato dos horários de culto | Tuplas `(dia, hora, título)` com os valores exatos confirmados (Ter 19:30 Oração e Ensino; Qui 19:30 Evangelismo; Dom 19:00 Culto) | Facilita renderização e testes de igualdade exata | y |

**Open questions:** none - all resolved or logged above (requerido antes da confirmação).

---

## User Stories

### P1: Dados institucionais reais como fonte única ⭐ MVP

**User Story**: As a visitante da landing page, I want os dados institucionais reais (endereço, cidade, pastor, contato, redes sociais e horários de culto) apresentados corretamente so that a informação da igreja seja fidedigna e confiável.

**Why P1**: A landing one-page é a vitrine da igreja na F9; dados errados ou placeholders erodem confiança e colocam em risco a administração (LGPD/informações).

**Acceptance Criteria** (cada linha é um padrão EARS):

1. The system SHALL expose the constant `CHURCH.city` with the exact value "Santa Luzia - PB"
2. The system SHALL expose the constant `CHURCH.foundedLocation` with the exact value "Rua Quiezinho Fernandes, 213 - Nossa Senhora de Fátima, Santa Luzia - PB"
3. The system SHALL expose the constant `CHURCH.leader` with the exact value "Pastor Ernandes Nogueira de Lucena"
4. The system SHALL expose the constant `SOCIAL.email` with the exact value "ivcvirtudecrista@gmail.com"
5. The system SHALL expose the constant `SOCIAL.youtube` with the exact value "https://www.youtube.com/@IgrejaVirtudeCrista"
6. The system SHALL expose the constant `SOCIAL.instagram` with the exact value "https://instagram.com/igrejavirtudecrista"
7. The system SHALL expose the constant `SOCIAL.address` with the exact value "Rua Quiezinho Fernandes, 213 - Nossa Senhora de Fátima, Santa Luzia - PB"
8. The system SHALL expose the exported constant `SCHEDULE` as an array containing exactly the tuples ("TER", "19:30", "Oração e Ensino"), ("QUI", "19:30", "Evangelismo") and ("DOM", "19:00", "Culto")
9. WHILE o número de WhatsApp da igreja não estiver confirmado (decisão D4) THEN the system SHALL keep `SOCIAL.whatsapp` equal to the placeholder "#"

**Independent Test**: Usando os gates do projeto (`npm run lint`, `npm run typecheck`, `npm run build`) + inspeção estática: conferir que `src/lib/constants.ts` contém exatamente os valores dos critérios 1–8 e que `SOCIAL.whatsapp` permanece `"#"` (critério 9). Sucesso = gate verde + todos os valores conferidos.

---

## Edge Cases

- IF o endereço real contiver uf/bairro em campos separados THEN a constante SHALL manter uma única string canônica por campo (sem duplicação de dados em `CHURCH` e `SOCIAL`)

---

## Requirement Traceability

| Requirement ID | Story       | Phase  | Status  |
| -------------- | ----------- | ------ | ------- |
| DADOS-01       | P1: Dados reais | Implementing | Implementing |
| DADOS-02       | P1: Dados reais | Implementing | Implementing |
| DADOS-03       | P1: Dados reais | Implementing | Implementing |
| DADOS-04       | P1: Dados reais | Implementing | Implementing |
| DADOS-05       | P1: Dados reais | Implementing | Implementing |
| DADOS-06       | P1: Dados reais | Implementing | Implementing |
| DADOS-07       | P1: Dados reais | Implementing | Implementing |
| DADOS-08       | P1: Dados reais | Implementing | Implementing |
| DADOS-09       | P1: Dados reais | Implementing | Implementing |

**ID format:** `[CATEGORY]-[NUMBER]` — `DADOS-NN`.

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 9 total, 0 mapped to tasks, 9 unmapped ⚠️

---

## Success Criteria

- [ ] `src/lib/constants.ts` expõe os 9 valores especificados exatamente como definidos nas ACs
- [ ] `npm run lint`, `npm run typecheck` e `npm run build` passam sem erro
- [ ] Nenhum dado fabricado inserido (WhatsApp, Clamor, fundação permanecem como estavam ou como placeholder)