# Barcode Membro — Código de barras real (Code 128) da matrícula

## Problem Statement

O código de barras do cartão de membro (`MemberCard`, exibido em `/painel/cartao`
e `/admin/membros/[id]/cartao`, impresso em ID-1 85,6×53,98 mm) é apenas
decorativo: um gradiente fixo (`repeating-linear-gradient`) acompanhado de
dígitos de um hash. Ele não é legível por scanner, então a portaria não consegue
usar a matrícula impressa para localizar o membro. Este trabalho substitui o
bloco decorativo por um **Code 128 funcional** cujo payload é a matrícula
(ex.: `IVC-0001`), sem adicionar dependências — encoder puro, determinístico, que
produz a sequência binária de módulos e a UI a converte em barras proporcionais.

## Goals

- [ ] Encoder puro Code 128 (Code Set B, ASCII 32–126) em `src/lib/barcode/code128.ts`
- [ ] Checksum **módulo 103** (start B = 104, pesos posicionais 1-based, dígito antes do stop)
- [ ] Renderização vetorial/proporcional das barras no `MemberCard` (bloco inferior direito)
- [ ] Matrícula legível (texto humano) imediatamente abaixo das barras
- [ ] Probe determinístico `scripts/probe-barcode.sh` validando tabela, sequência e invariantes
- [ ] Degradação segura: `RangeError` fora de ASCII 32–126 → sem barras, texto humano mantido

## Out of Scope

| Feature | Reason |
|---------|--------|
| QR code de validação | Decisão posterior (qrcode.react já é dependência; nova feature separada) |
| Mudança no visual do cartão | Visual corrigido pelo usuário (modelo Canva); só o barcode muda |
| Auto-checksum na leitura | Scanner externo valida; sem leitura no app |
| Multi-tenant | Escopo single church (AD-001) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|----------------------|----------------|-----------|------------|
| Payload do barcode | Matrícula (`member.matricula`) | Felicita leitura na portaria; Code Set B cobre `IVC-NNNN` | Sim (decisão do usuário) |
| Biblioteca de encoder | Nenhuma (encoder puro próprio) | Sem nova dependência; tabela canônica conferida (crifan.com, barcodesinc.com) | Sim (decisão técnica) |
| Checksum | Módulo 103, peso posicional 1-based, start B = 104 | Padrão Code 128 (ISO/IEC 15417) | Sim (autoridade técnica) |
| Render | Vetorial/proporcional por módulo (flex) | Sem distorção por DPI, pronto para impressão ID-1 | Sim (padrão existente) |
| Quiet zone | ~8 módulos de cada lado | Mínimo recomendado p/ leitura | Sim (padrão) |
| Caractere fora de ASCII 32–126 | `RangeError` no encoder; UI degrada sem barras mantendo o texto | Defensivo; matrícula é `NOT NULL` string | Sim (decisão técnica) |

**Open questions:** none.

---

## User Stories

### P1: Cartão com barcode legível ⭐ MVP

**User Story**: As a member, I want my card's barcode to encode my registration
number (matrícula) so security at the door can scan it to identify me.

**Acceptance Criteria**:

1. WHEN the member card renders in `/painel/cartao` or `/admin/membros/[id]/cartao` THEN the bottom-right area SHALL display a Code 128 barcode whose payload is the member's matrícula (not the former fixed decorative gradient)
2. WHEN the Code 128 encoder generates a sequence for a matrícula THEN the sequence SHALL contain, in order: start (Start B, 104), the data symbols, the check digit (checksum mod 103 with 1-based positional weights), the stop, and the 2-module termination bar
3. WHEN the encoder outputs any symbol THEN every data symbol SHALL have 11 modules, the stop SHALL have 11 modules plus a 2-module termination bar, bars SHALL be in even numbers, spaces SHALL be in odd numbers, and no width SHALL exceed 4 modules
4. WHEN the card renders THEN the matrícula SHALL appear as readable text immediately below the bars (human data, not the checksum digit)
5. WHEN the encoder is invoked twice with the same matrícula THEN the sequence SHALL be identical (determinism), and the bars SHALL render proportionally (vector-like, print-ready at any DPI)

**Independent Test**: `scripts/probe-barcode.sh` all green; print the card via
`@media print` (ID-1) and scan `IVC-0001` with a Code 128 reader.

---

## Edge Cases

- IF the matrícula contains a character outside ASCII 32–126 THEN the encoder SHALL throw `RangeError` and the barcode area SHALL render empty while the human-readable matrícula stays visible
- IF `member.matricula` is missing THEN the barcode area SHALL degrade gracefully (no bars) without crashing the card

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---------------|-------|-------|--------|
| BRC-01 | P1: Barcode no MemberCard | Execute | Verified |
| BRC-02 | P1: Sequência Code 128 (checksum mod 103) | Execute | Verified |
| BRC-03 | P1: Invariantes estruturais dos símbolos | Execute | Verified |
| BRC-04 | P1: Matrícula legível sob as barras | Execute | Verified |
| BRC-05 | P1: Determinismo + render proporcional | Execute | Verified |

**Coverage:** 5 total, 5 mapped to `scripts/probe-barcode.sh`, 0 unmapped

---

## Success Criteria

- [ ] `scripts/probe-barcode.sh` verde (tabela 107 símbolos, sequência exata `IVC-0001`, determinismo, invariantes estruturais, RangeError)
- [ ] `npm run typecheck` e `npm run lint` sem erros
- [ ] Barcode Code 128 real renderizado no cartão, com matrícula legível abaixo