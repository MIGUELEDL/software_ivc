# Doação PIX Context

## O que é o contexto

Decisões de contexto que modelam os requisitos e os critérios de aceitação
(ACs) da feature `doacao-pix`, extraídas do trabalho com o administrador.

## Features e decisões relacionadas

| Referência | Contexto |
| ---------- | -------- |
| `eventos` (concluído, `bc3e769`) | PRIMEIRO exemplo de rota própria + item no navbar/footer — `doacao-pix` segue o mesmo padrão (rota própria `/doacao` + item "Doação" no `NAV_ITEMS`) |
| `portal-home` (concluído, `ef2b5d1`) | Fonte única institucional em `src/lib/constants.ts` — a chave PIX entra junto (campo `PIX`) |
| AD-008 (fonte única) | Todas as constantes institucionais vivem em `src/lib/constants.ts`; componentes não têm literais institucionais |
| AD-009 (PIX no MVP) | Portal público doa por **QR PIX apenas**; cartão/webhook Mercado Pago ficam na onda 3 (financeiro RF-026) |
| ADR-011 | CNPJ da igreja: **68.683.917/0001-71** — a chave PIX informada pelo administrador é o próprio CNPJ |
| RF-007 / RN-001 | Árvore: `/doacao` (GET) "QR PIX público"; portal sem dados de cartão |

## Contexto que gerou as decisões

### Decisões de produto (admin, 2026-09-08)

1. **Chave PIX = CNPJ `68.683.917/0001-71`** — o administrador confirmou que essa é a
   chave PIX oficial (mesmo CNPJ de ADR-011). Entra em `src/lib/constants.ts` (fonte única).
2. **QR gerado no app** — dada a chave, o app monta o payload BR Code (copia-e-cola)
   e renderiza o QR a partir dele. Assim a chave pode mudar sem trocar imagem estática.
   Implica nova dependência: **`qrcode.react`** (renderização SVG/Canvas em componente React,
   client-side). Nenhuma lib de QR existe no repo hoje.
3. **QR estático sem valor** — a árvore prevê apenas "Doação/Oferta (QR PIX público)".
   Sem campo de valor, sem QR dinâmico por visita; o app bancário do doador define o
   valor ao escanear. Menos código, sem formulário.
4. **Copia-e-cola + botão "Copiar"** — além do QR, mostra o payload BR Code como texto
   e um botão que copia para o clipboard (via `navigator.clipboard.writeText`),
   com confirmação acessível.
5. **Acesso via navbar/footer** — item "Doação" → `/doacao`, mesmo padrão de `eventos`.

### Drivers técnicos

- **`src/lib/pix.ts`** (novo): funções puras de domínio PIX — `buildBrCode(key, name, city)`
  produz o payload EMV/BR Code (payload format, MAI com `BR.GOV.BCB.PIX01`, MCC `0000`,
  moeda `986`, país `BR`, nome/cidade do recebedor, `***` reference label, CRC16-CCITT).
  Componentes apenas consomem o payload montado — lógica de PIX isolada/testável.
- **`qrcode.react`**: componente `<QRCodeSVG>` client p/ renderizar o payload.
- **Client component**: o botão "Copiar" precisa de `"use client"` (clipboard reativo).
- **Mobile-first**: grid/`sm:`/`md:`/`lg:` como nas demais páginas; QR centralizado.
- **A11y (WCAG 2.1 AA)**: botão "Copiar" com nome acessível, feedback com `aria-live`,
  `aria-label` no QR; navegação por teclado (elemento nativo `<button>`/`<Link>`).
- Next 16: rotas novas usam Server Components; página estática (SSG) — sem streaming/ISR.
- Instalação da dependência exige PATH do Node via nvm (`export PATH="$HOME/.nvm/versions/node/v$(cat .nvmrc).0/bin:$PATH"`).

## Modelo de contexto (eventos → doação)

O modelo que guia a implementação:

- **Dimensão de produto**: public website com seção de pagamento mínima (PIX/QR).
- **Dimensão de pagamento**: MVP é **recebimento estático** — sem webhook, sem
  conciliação, sem credenciais MP (tudo isso é onda 3 / RF-026).
- **Dimensão externa**: nenhuma chamada externa em runtime; QR é renderização local.

## Glossary

| Item | Definição |
| ---- | --------- |
| BR Code | Payload "copia-e-cola" EMV QR format padrão BCB que codifica a chave e metadados do recebedor; começa `000201` e termina com CRC16 (`6304`) |
| MAI | Merchant Account Information — bloco EMV com a GUI `BR.GOV.BCB.PIX` e a chave |
| Chave PIX | Identificador do recebedor PIX (aqui: CNPJ `68.683.917/0001-71`) |
| copia-e-cola | String BR Code que o doador pode inserir no app bancário em vez de escanear |
| QR PIX | QR com o payload BR Code — escaneado, abre transferência PIX no app bancário |

---

## Proof of Value / ROI (evidence)

| Evidence | Point of Proof / Start |
| -------- | ---------------------- |
| RF-007 aprovado na árvore + rota listada no API.md (`/doacao` GET) | `docs/REQUIREMENTS.md:71`, `docs/API.md:24` |
| RN-001: doação é QR PIX público, sem cartão no portal | `docs/REQUIREMENTS.md:137` |
| AD-009: MVP PIX apenas | `.specs/STATE.md` AD-009, `docs/ARCHITECTURE.md:43` |
| CNPJ 68.683.917/0001-71 como chave PIX oficial | ADR-011 + confirmação do admin 2026-09-08 |
| Padrão de rota própria + nav para replicar | feature `eventos` concluída (`bc3e769`) |