# Patrimônio (RF-025) — User Decisions

Decisões do usuário capturadas na fase Discuss (14/09/2026), refletidas na spec
(`.specs/features/admin-patrimonio/spec.md` → Assumptions & Open Questions).

## Campos do bem

- **Inventário completo**: `name`, `category`, `numero_patrimonio` (tombo, opcional
  mas único), `location`, `acquisition_value` (opcional), `acquisition_date`
  (opcional), `responsible` (texto livre), `status`, `observations`.

## Ciclo de vida

- **Soft-delete por `status` `ATIVO`/`INATIVO`** — INATIVO = baixa; histórico
  preservado, sem hard-delete.

## Acesso

- **Admin-only** — inventário interno; RLS SELECT sem `anon`; MEMBRO/leitor sem a
  permissão não vê nada.

## Categoria

- **Enum fixo no app**: `AUDIO`, `VIDEO`, `INSTRUMENTO`, `MOBILIA`, `EQUIPAMENTO`,
  `RELIGIOSO`, `OUTRO` — CHECK no SQL + validação no app. Sem tabela de categorias.

## Responsável / valor

- `responsible` como **texto livre** (sem FK membro); valor/data ambos opcionais.

## Radar do dashboard

- Adicionar no `/admin`: card **"Eventos"** (lacuna da RF-024) + card **"Patrimônio"**.

---
## Deferred Ideas (capturados durante o fluxo)

- Foto/imagem do bem — fora do escopo RF-025.
- Depreciação / valor contábil — RF-025 é inventário.
- Categorias com CRUD próprio — decisão: enum fixo.