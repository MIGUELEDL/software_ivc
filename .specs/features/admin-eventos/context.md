# Eventos (RF-024) — User Decisions

Decisões do usuário capturadas na fase Discuss (14/09/2026), refletidas na spec
(`.specs/features/admin-eventos/spec.md` → Assumptions & Open Questions).

## Visibilidade do portal

- **Booleano `visivel` (default `true`), controle manual** — o admin decide o que
  publicar. Sem regra automática por data (não é "somente futuros").

## Ciclo de vida

- **Soft-delete por `status` `ATIVO`/`INATIVO`** — histórico preservado; INATIVO
  oculta do portal. Sem hard-delete (sem botão/rota DELETE).

## Campos do evento

- **Mínimos**: `title`, `description` (opcional), `date`, `time`, `location`,
  `visivel`, `status`. Sem imagem/capa.

## Portal (RF-006)

- **Migrar `/eventos` e `/eventos/[id]` para ler de `events` no banco** (padrão da
  Liderança RF-023), mantendo "Inscrever-se via WhatsApp" (RN-003 / WhatsApp
  oficial ADR-010) e o estado vazio.

---
## Deferred Ideas (capturados durante o fluxo)

- Campos adicionais de evento (imagem/capa, link de inscrição) — fora do escopo RF-024.
- Inscrição real com lista de participantes — continua só WhatsApp (RN-003).