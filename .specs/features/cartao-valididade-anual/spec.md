# Cartão de Membro — Sincronização de dados e validade anual automática

## Problem Statement

O cartão de membro (`MemberCard`, exibido em `/painel/cartao` e
`/admin/membros/[id]/cartao`) já sabe *ler* RG, CPF, data de batismo e validade,
mas **nenhum código do projeto jamais escreve esses campos**: as colunas foram
criadas pela migration `0020_member_card_columns.sql` e permanecem `NULL` em
11/11 membros no banco. Não existe campo de entrada para eles em nenhum cadastro —
`atualizarDadosMembro` (`src/lib/admin/membros.ts:220`) e o perfil do painel
gravam apenas nome/nascimento/whatsapp/endereço. O resultado é um cartão
permanentemente com `—` em quatro campos. Além disso, a validade não pode ser
digitada (não há UI, não há cálculo): precisa ser derivada da data de registro
(`criado_em`) e renovada sozinha a cada ano, sem intervenção manual.

## Goals

- [ ] RG, CPF e data de batismo preenchíveis e editáveis no **cadastro admin** e no **perfil do membro**, persistidos de fato
- [ ] Cartão exibindo esses três valores sempre a partir da linha atual do banco, sem cópia local
- [ ] Validade anual automática: nasce na data de registro, vale 1 ano e **rola para o próximo aniversário** sozinha
- [ ] Coluna `validade_cartao` mantida e populada (ciclo-base) por trigger, com backfill dos registros existentes
- [ ] Migration idempotente que não quebra nem apaga nenhum registro existente

## Out of Scope

| Feature | Reason |
|---------|--------|
| Alterar o layout/visual do cartão | Modelo ID-1 aprovado pelo usuário (barcode-membro, AD-018); só o conteúdo muda |
| Foto, assinatura, matrícula | Já funcionais e corretos |
| QR code / consulta pública de validade | Feature separada; não pedida |
| Botão manual de "renovar" cartão | Requisito é renovação **automática**, sem controle manual |
| Alterar identidade visual do painel/admin | Escopo da feature `landing-visual-hero` cobre só a Landing |
| Integração com emissão fiscal/CAC | Não existe no projeto |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|----------------------|----------------|-----------|------------|
| Data canônica de registro | `members.criado_em` (`timestamptz NOT NULL DEFAULT now()`) | Única data de cadastro existente e imutável; verificado no schema | Sim (decisão do usuário + schema) |
| Semântica da renovação | **Rolante**: validade = próximo aniversário ≥ hoje | Usuário escolheu "sempre o próximo aniversário"; cartão nunca vence | Sim (decisão do usuário) |
| Onde editar RG/CPF/batismo | Admin **e** painel do membro | Ambos os caminhos foram escolhidos pelo usuário | Sim (decisão do usuário) |
| Destino da coluna `validade_cartao` | Mantida, populada por trigger com o **ciclo-base** (`criado_em + 1 ano`) | Usuário escolheu manter via trigger; relatório/CSV passam a ter o dado | Sim (decisão do usuário) |
| Por que a coluna não rola sozinha | Trigger só dispara em escrita; um gatilho **não** avança com a passagem do tempo | `pg_cron` existe mas não está instalado e seria superfície operacional nova; a data que o membro vê é calculada no render, então a coluna não precisa rolar | Sim (decisão técnica) |
| Fronteira do aniversário | Se hoje **for** o aniversário, a validade é o próprio dia do aniversário (limite inclusivo) | Evita considerar o cartão vencido no próprio dia de vencimento | Sim (decisão técnica) |
| 29 de fevereiro | Aniversário em 29/02 é ajustado para **28/02** do ano-alvo | 29/02 não existe em ano não bissexto; clamp determinístico | Sim (decisão técnica) |
| Normalização de CPF | Aceita apenas dígitos; persiste **somente dígitos** (11) | Cartão em ID-1 não comporta máscara; evita duas representações do mesmo CPF | Sim (decisão técnica) |
| RG | Texto livre, até 20 caracteres, sem máscara | RG varia por estado (SSP); normalizar seria arbitrário | Sim (decisão técnica) |
| Validação de CPF por dígitos verificadores | **Não** implementada nesta feature | Seria uma feature própria (regra de negócio com alcance próprio) | Sim (decisão técnica) |
| `data_batismo` futura | Rejeitada com mensagem de erro | Um batismo no futuro é erro de entrada, não dado válido | Sim (decisão técnica) |
| Campo vazio no formulário | Persistido como `NULL`, nunca `""` | `""` e `NULL` são estados distintos; hoje a coluna é nullable e nunca foi usada | Sim (decisão técnica) |
| Fuso horário do cálculo | Calendário civil fixo `America/Sao_Paulo`, tanto no TypeScript quanto no SQL | Cartão é documento civil em papel; o dia tem de ser o do calendário da igreja, não o da máquina. Um servidor em UTC (Vercel) leria `2026-09-13T02:01Z` como 13/09, mas no Brasil esse instante é 12/09 — o cartão impresso erraria o dia. Fixar o fuso torna a regra igual em qualquer ambiente, e teste e banco passam a concordar por construção | Sim (decisão técnica, AD-020) |

**Open questions:** none — todas as decisões acima foram confirmadas pelo usuário
ou derivadas do schema verificado.

---

## User Stories

### P1: Cadastro que realmente alimenta o cartão ⭐ MVP

**User Story**: As a secretary (admin), I want to register and edit a member's
RG, CPF and baptism date so the member's card shows real data instead of `—`.

**Why P1**: É a causa raiz da dessincronização — sem caminho de escrita, nenhuma
das outras Story funciona.

**Acceptance Criteria**:

1. WHEN an admin creates a member supplying `rg`, `cpf` and `data_batismo` THEN the system SHALL persist all three values on the created `members` row
2. WHEN an admin edits a member's `rg`, `cpf` or `data_batismo` THEN the system SHALL persist the new value so the card reflects it on the next render
3. WHEN the member edits their own `rg`, `cpf` or `data_batismo` in `/painel/perfil` THEN the system SHALL persist the new value on their own row
4. IF `rg`, `cpf` or `data_batismo` are left blank in a form THEN the system SHALL persist `NULL` for that field (never an empty string)
5. IF `cpf` is supplied with non-digit characters THEN the system SHALL persist the digit-only form when exactly 11 digits remain and SHALL reject the input otherwise
6. IF `data_batismo` is later than the current date THEN the system SHALL reject the save and SHALL NOT write the row
7. IF `rg` exceeds 20 characters THEN the system SHALL reject the save and SHALL NOT write the row
8. WHEN the member card renders THEN the system SHALL display `rg`, `cpf` and `data_batismo` read from the current member row, with `—` shown for each `NULL` field

**Independent Test**: criar um membro pelo admin com RG `123456789`, CPF
`12345678909` e batismo `2020-05-10`; abrir `/admin/membros/<id>/cartao` e ver os
três valores no cartão.

---

### P2: Validade anual automática, sem intervenção manual

**User Story**: As a member, I want my card to always show a valid expiry date
that renews itself every year so I never have to ask the church to reissue it.

**Why P2**: É a regra de negócio pedida; independente da P1 (funciona mesmo sem
RG/CPF preenchidos).

**Acceptance Criteria**:

1. WHEN the card validity is computed THEN the system SHALL use the earliest anniversary of the member's registration date plus 1 year that is not earlier than the current date
2. WHEN the current date equals a computed anniversary THEN the system SHALL use that same date (inclusive boundary)
3. WHEN an anniversary has already passed THEN the system SHALL roll the validity forward to the next anniversary with no manual action, no database write and no administrator intervention
4. IF the registration date falls on February 29 THEN the system SHALL clamp the anniversary to February 28 of the target year
5. WHEN any row in `members` is inserted or updated THEN a trigger SHALL set `validade_cartao` to the registration date plus 1 year
6. WHEN the migration runs against existing rows THEN it SHALL backfill `validade_cartao` for every row whose value is `NULL`, leaving all other columns and all non-`NULL` values untouched
7. IF the member's registration date is missing or unparseable THEN the card SHALL render `—` for validity and SHALL NOT crash
8. WHEN the validity is computed in the application or in the database THEN the system SHALL interpret the registration timestamp on the `America/Sao_Paulo` civil calendar, so that the same `criado_em` yields the same validity regardless of the runtime `TZ` and regardless of whether the calculation runs in TypeScript or in SQL

**Independent Test**: `scripts/probe-cartao-validade.sh` verde. O IVC-0001 tem
`criado_em = 2026-09-13T02:01:52+00:00`, que em `America/Sao_Paulo` é 12/09 às
23:01 — dia civil **12/09**. Com `hoje = 2026-10-01` o cartão mostra
`12/09/2027`; com `hoje = 2027-09-13` mostra `12/09/2028`; com `hoje =
2027-09-12` ainda mostra `12/09/2027` (limite inclusivo). O mesmo
`criado_em` reescrito como `2026-09-13T12:00:00-03:00` mostra `13/09/2027`,
o que prova que o dia vem do calendário civil e não de UTC.

---

## Edge Cases

- IF `criado_em` is February 29 and the target year is not a leap year THEN the anniversary SHALL be February 28 of that year (never an invalid date, never March 1)
- IF the registration date is today THEN the first validity SHALL be one year ahead, never today
- IF the member row has `criado_em` in the future THEN the anniversary SHALL be computed from that date and SHALL NOT be clamped to today
- IF `cpf` contains spaces, dots or dashes THEN the system SHALL persist only the 11 digits
- IF `rg` or `cpf` contains a newline or control character THEN the system SHALL reject the save
- IF a save fails partway THEN the row SHALL remain with its previous values (no partial write)

---

## Requirement Traceability

| Requirement ID | AC | Story | Tasks | Status |
|---------------|----|-------|-------|--------|
| CART-01 | P1/1 — admin cria com os três campos | P1: Cadastro alimenta o cartão | T5, T7 | Implemented |
| CART-02 | P1/2 — admin edita e persiste | P1: Cadastro alimenta o cartão | T5, T7b | Implemented |
| CART-03 | P1/3 — autoedição persiste na própria linha | P1: Cadastro alimenta o cartão | T4, T6 | Implemented |
| CART-04 | P1/4 — campo vazio persiste `NULL`, nunca `""` | P1: Cadastro alimenta o cartão | T1, T4, T5 | Implemented |
| CART-05 | P1/5 — CPF só com não dígitos = 11 dígitos, senão rejeita | P1: Cadastro alimenta o cartão | T1, T4, T5 | Implemented |
| CART-06 | P1/6 — batismo no futuro rejeita sem escrever | P1: Cadastro alimenta o cartão | T1, T4, T5 | Implemented |
| CART-07 | P1/7 — RG > 20 caracteres rejeita sem escrever | P1: Cadastro alimenta o cartão | T1, T4, T5 | Implemented |
| CART-08 | P1/8 — cartão lê o row atual; `NULL` vira `—` | P1: Cadastro alimenta o cartão | T8 | Implemented |
| CART-09 | P2/1 — menor aniversário `>= hoje` | P2: Validade anual automática | T2, T8 | Implemented |
| CART-10 | P2/2 — limite inclusivo | P2: Validade anual automática | T2, T8 | Implemented |
| CART-11 | P2/3 — rolagem sem escrita no banco nem intervenção | P2: Validade anual automática | T8 | Implemented |
| CART-12 | P2/4 — 29/02 clampado para 28/02 | P2: Validade anual automática | T2, T9 | Implemented |
| CART-13 | P2/5 — trigger em INSERT/UPDATE grava ciclo-base | P2: Validade anual automática | T9 | Verified |
| CART-14 | P2/6 — backfill só em `NULL`, sem tocar o resto | P2: Validade anual automática | T9 | Verified |
| CART-15 | P2/7 — `criado_em` ausente/inválido vira `—`, sem crash | P2: Validade anual automática | T2, T8 | Implemented |
| CART-16 | P2/8 — calendário civil `America/Sao_Paulo` em TS e SQL | P2: Validade anual automática | T2, T9 | Implemented |

**Coverage:** 16 requirements, 16 mapped to tasks, 0 unmapped
(CART-15 e CART-16 foram acrescentados depois do primeiro Verifier apontar que
os ACs de "data ilegível" e de fuso não tinham requirement rastreável).

---

------------|-------|-------|--------|
| CART-01 | P1: Cadastro alimenta o cartão | Design | Pending |
| CART-02 | P1: Cadastro alimenta o cartão | Design | Pending |
| CART-03 | P1: Cadastro alimenta o cartão | Design | Pending |
| CART-04 | P1: Cadastro alimenta o cartão | Design | Pending |
| CART-05 | P1: Cadastro alimenta o cartão | Design | Pending |
| CART-06 | P1: Cadastro alimenta o cartão | Design | Pending |
| CART-07 | P1: Cadastro alimenta o cartão | Design | Pending |
| CART-08 | P1: Cadastro alimenta o cartão | Design | Pending |
| CART-09 | P2: Validade anual automática | Design | Pending |
| CART-10 | P2: Validade anual automática | Design | Pending |
| CART-11 | P2: Validade anual automática | Design | Pending |
| CART-12 | P2: Validade anual automática | Design | Pending |
| CART-13 | P2: Validade anual automática | Design | Pending |
| CART-14 | P2: Validade anual automática | Design | Pending |

**Coverage:** 14 total, 0 mapped to tasks, 14 unmapped ⚠️

---

## Success Criteria

- [ ] `scripts/probe-cartao-validade.sh` verde (persistência admin/painel, normalização, regras de rejeição, cálculo rolante, clamp 29/02, limite inclusivo, backfill)
- [ ] `npm run typecheck` e `npm run lint` sem erros
- [ ] Migration aplicada sem perda: contagem de `members` antes = depois, e `rg`/`cpf`/`data_batismo`/`criado_em`/`matricula` inalterados nos 11 registros existentes
- [ ] Membro com RG/CPF/batismo preenchidos vê os três valores no cartão, e a alteração aparece sem reiniciar a aplicação
