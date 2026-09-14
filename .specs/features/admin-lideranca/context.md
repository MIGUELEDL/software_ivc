# Admin-Liderança Context

**Gathered:** 2026-09-14
**Spec:** `.specs/features/admin-lideranca/spec.md`
**Status:** Ready for design

---

## Feature Boundary

RF-023 (**Igrejas/Liderança**) no painel administrativo, módulo `igrejas` da matriz
de permissões (RF-032): CRUD de igrejas (`churches`) e liderança (`leaders`),
fotos de líder no Supabase Storage, e migração da seção Liderança do portal
(hoje lida de `constants.ts`) para ler da tabela `leaders`. O portal continua
público (leitores anônimos veem a seção); o painel administrativo segue a
matriz `permissions`.

---

## Implementation Decisions

### Igrejas (`churches`) — Full CRUD

- **Decisão**: Full CRUD — criar, editar, listar e excluir igrejas (não só editar
  a única igreja semeada). RN-005 (1 templo hoje) não bloqueia múltiplas igrejas
  no banco; a topologia atual segue 1 (seed), mas o sistema já aceita a evolução.
- **Exclusão**: hard-delete **restrito a `SUPER_ADMIN`** (decisão explícita,
  mais restritivo que `igrejas/administrar` da matriz que incluiria `ADMIN`).
  Sem soft-delete/ciclo de vida para igrejas. Em cascata, excluir igreja remove
  seus líderes vinculados (FK `on delete cascade`).
- **Autoridade**: leitura pública (portal) + leitura restrita no painel;
  escrita no painel via `can('igrejas','escrever')` (matriz: só `ADMIN`/
  `SUPER_ADMIN` têm escrever/administrar em `igrejas`).
- **Seed**: a única igreja atual (Igreja Virtude Cristã, dados de `constants.ts`).

### Liderança (`leaders`) — Completo + soft-delete

- **Campos**: `name`, `role` (cargo), `photo_url` (nullable), `order` (ordem na
  listagem), `status` (`ATIVO`/`INATIVO`), FK `church_id`.
- **Ciclo de vida**: soft-delete por status — inativar (`INATIVO`) é a única
  forma de "remover" um líder; **sem hard-delete** (dados institucionais,
  histórico preservado).
- **Foto**: upload real no bucket Supabase Storage (`fotos-lideranca`), padrão
  do painel-membro (AD-014): path `lideranca/{leaderId}/foto.{ext}`.

### Portal — integrar nesta feature

- **Decisão**: a seção Liderança do portal (hoje `Leadership.tsx` lendo
  `CHURCH.leader` de `constants.ts`) migra para ler do banco nesta feature.
- **Comportamento**: renderiza apenas líderes `ATIVO`, ordenados por `order`,
  com foto (quando houver), nome e cargo; a igreja exibida é a primeira
  encontrada (seed atual). Regressão controlada dos ACs do `portal-home` que
  referenciam `Leadership.tsx`.
- **Leitura pública**: RLS de SELECT para `anon` (portal público); escrita via
  `can_access('igrejas', ...)` para `authenticated`.

### Restrição de exclusão de igreja — nível de aplicação

- O guarda `requireAdministrar('igrejas')` liberaria `ADMIN` e `SUPER_ADMIN` (a
  matriz dá `administrar` a ambos). Para o hard-delete de igreja ser só
  `SUPER_ADMIN`, a rota combina `authAdmin('igrejas')` + checagem explícita
  `claims.role === 'SUPER_ADMIN'` (403 para `ADMIN`). O mesmo no nível RLS
  (policy DELETE só `SUPER_ADMIN`).

### Agent's Discretion

- API de edição de líderes e igrejas: PATCH por `[id]` (integração membros).
- Formato de erro reusando `erroCampos`/401/403/409 padrão admin.
- Sem novo módulo matriz (usa `igrejas` já presente no seed 0008).

### Declined / Undiscussed Gray Areas → Assumptions

- **Soft-delete de igrejas**: não discutido; assumido **sem** (igrejas são dados
  institucionais pontuais; exclusão é `SUPER_ADMIN`). Registrado no spec.
- **Múltiplas igrejas no portal**: com `churches` Full CRUD e >1 igreja, o portal
  continua exibindo a primeira/única (ordem por `created_at`); selecionar igreja
  ativa no portal fica para RF-029 (configurações).

---

## Specific References

- Padrão de storage: `supabase/migrations/0003_storage_fotos_membros.sql`
  (bucket público, limites em `file_size_limit`, `allowed_mime_types`).
- Padrão de RLS por módulo: `0008_permissions_matriz.sql` (`can_access`).
- Padrão de guardas/APIs: `src/lib/admin/http.ts`, `src/app/api/admin/membros/*`.
- Dado institucional de origem: `src/lib/constants.ts` (`CHURCH`).

---

## Deferred Ideas

- **Editor de MVV/CMS institucional** (nome, slogan, mission, vision, valores,
  WhatsApp, PIX): pertence à RF-029 (configurações), não a esta feature.
- **Seleção de igreja "ativa" para o portal**: RF-029.
- **Hard-delete de líderes**: deliberadamente fora (só soft-delete foi aprovado).