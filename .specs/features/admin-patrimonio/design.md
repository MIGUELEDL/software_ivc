# Patrimônio (RF-025) Design

**Spec**: `.specs/features/admin-patrimonio/spec.md`
**Feature**: module `patrimonio` da matriz (RF-032) — `assets` no admin.

---

## 1. Visão de componentes

```
Admin (/admin/patrimonio*)              API
  page.tsx / nova / [id] (RSC + client)   /api/admin/assets (POST/GET)
    └─ guards can('patrimonio', N)       /api/admin/assets/[id] (PATCH)
    └─ listarAssets()/criar/atualizar          │
             │                            service src/lib/admin/assets.ts
             ▼                                    │
  Supabase: assets (RLS can_access('patrimonio',...)) — SEM role anon
```

- **Decisão de acesso em 3 camadas** (AD-015 + L-006): RLS `can_access('patrimonio',
  nivel)` no banco — com **SELECT restrito a `authenticated`** (sem `anon`); guardas
  `can(papel,'patrimonio',nivel)` nas rotas; gate grosseiro `isAdminRole` no proxy.
- Ao contrário de igrejas/eventos (leitura pública), **o inventário é interno**: o
  SELECT policy usa `using (can_access('patrimonio','ler'))` sem role `anon`.

## 2. Dados — migration `0013_assets.sql`

### `assets`
| coluna | tipo | regra |
| ------ | ---- | ----- |
| id | uuid pk | default gen_random_uuid() |
| name | text not null | nome do bem |
| category | text not null | CHECK in ('AUDIO','VIDEO','INSTRUMENTO','MOBILIA','EQUIPAMENTO','RELIGIOSO','OUTRO') |
| numero_patrimonio | text null | tombo; **índice único parcial** `where numero_patrimonio is not null` |
| location | text null | localização (ex.: "Templo", "Secretaria") |
| acquisition_value | numeric null | valor de aquisição (limit 12,2) |
| acquisition_date | date null | data de aquisição |
| responsible | text null | responsável (texto livre) |
| status | text not null default 'ATIVO' | check in ('ATIVO','INATIVO') |
| observations | text null | observações |
| created_at / updated_at | timestamptz | defaults now() |

### RLS
| tabela | op | policy |
| ------ | -- | ------ |
| assets | SELECT | `authenticated` com `can_access('patrimonio','ler')` — **sem `anon`** |
| assets | INSERT/UPDATE | `authenticated` com `can_access('patrimonio','escrever')` |
| assets | DELETE | **nenhuma** (só soft-delete por `status`, PAT-03/10) |

### Seed (idempotente, `on conflict do nothing`)
- 1 bem real: **"Kit de Som"** (`category='AUDIO'`, `numero_patrimonio='PAT-0001'`,
  `location='Templo'`, `acquisition_value=2500.00`, `acquisition_date='2024-03-15'`,
  `responsible='Equipe de Som'`, `status='ATIVO'`) — dá conteúdo à lista e âncora aos probes.
- Usuário `patrimonial.teste@ivc.local` (papel **`PATRIMONIAL`**, senha `senha-teste`,
  `force_password_change=false`) — discrimina o ramo `escrever` do `can()` no módulo
  patrimônio (padrão `0007`/`0009`; id `00000000-0000-4000-8000-000000000007`).

## 3. Service layer `src/lib/admin/assets.ts`

Padrão `src/lib/admin/eventos.ts`: lista/detalhe via session client (RLS), escrita
via session client (RLS enforça `can_access`). Exceção `BemNaoEncontradoError`.
Funções:

- `listarAssets(): Promise<Asset[]>` — todos (incl. INATIVO), `name` asc (admin)
- `criarAsset(dados): Promise<Asset>`
- `atualizarAsset(id, dados): Promise<Asset>` — 404 se não existir; aceita `status`

Tipos: `Asset` (linha completa) + `AssetDados` (name, category, numero_patrimonio?,
location?, acquisition_value?, acquisition_date?, responsible?, observations?) +
`AssetPatch` (parciais + status).

Validação em `src/lib/admin/validacao.ts`: ganha `validateAsset` — `name` obrigatório
não-vazio; `category` em `['AUDIO','VIDEO','INSTRUMENTO','MOBILIA','EQUIPAMENTO',
'RELIGIOSO','OUTRO']`; `numero_patrimonio` string não-vazia quando presente (única no
DB — 409, ver T3); `acquisition_value` numeric >= 0 quando presente; `acquisition_date`
`YYYY-MM-DD`; `status` `ATIVO`/`INATIVO` quando enviado. Alvos de payload: `POST`
valida obrigatórios; `PATCH` valida apenas campos enviados (parcial).

> **409 em tombo duplicado**: índice único parcial falha o INSERT/UPDATE com code
> `23505`; a rota converte para 409 `{error:"numero_patrimonio_duplicado"}`.

## 4. API routes

| Rota | Métodos | Guarda | ACs |
| ---- | ------- | ------ | --- |
| `/api/admin/assets` | POST, GET | criar: `requireEscrita('patrimonio')`; listar: `authAdmin('patrimonio')` | PAT-04/05/06/07 |
| `/api/admin/assets/[id]` | PATCH | `requireEscrita('patrimonio')` | PAT-08/09/10 |

Formato de erro herdado: 401/403/400 `{error, campos}` / 404 `{error:"nao_encontrado"}`
/ 409 `{error:"numero_patrimonio_duplicado"}`; negativa logada por `negarPermissao`.

## 5. Páginas admin (`/admin/patrimonio*`)

- `page.tsx` (RSC): lista bens (nome, categoria, tombo, localização, status, valor)
  com ações (editar/baixar) e link "Novo bem". Guarda por `can('patrimonio','ler')`
  (redirect 403 se não ler). Ações de escrita conforme nível.
- `nova/page.tsx`: formulário de criação (nome, categoria select do enum, tombo,
  localização, valor/data de aquisição, responsável, observações) → `POST
  /api/admin/assets`; 400 por campo, 409 tombo duplicado; redirect ao `[id]`.
- `[id]/page.tsx`: detalhe/edição (PATCH) com toggle `status` `ATIVO`/`INATIVO`
  (baixa) — sem DELETE. Papéis leitores veem detalhe sem ações (servidor revalida 403).

## 6. Dashboard admin (`/admin/page.tsx`)

- Adicionar os cards "Eventos" (`/admin/eventos`, ícone `CalendarDays`) e
  "Patrimônio" (`/admin/patrimonio`, ícone `Package`) mantendo os padrões visuais
  existentes (Membros `Users`, Igrejas & Liderança `Church`). Regressão: cards
  existentes intactos (PAT-12 + lacuna RF-024 corrigida).

## 7. Probes `scripts/probes-admin-patrimonio.sh`

- **Estático**: migration 0013 (tabela/colunas/CHECK categoria/índice único parcial,
  RLS `can_access('patrimonio',...)`, **ausência de `anon`**, sem DELETE, seed
  `Kit de Som` + `patrimonial.teste`), guards de rota, serviço (filtros/validação,
  409), páginas admin, dashboard (cards Eventos+Patrimônio).
- **Runtime** (sessões reais — L-007/008):
  - PATRIMONIAL (`patrimonial.teste`, `patrimonio=escrever`): POST 201; PATCH 200
    (incl. `status=INATIVO` baixa); GET 200.
  - ADMIN (`admin.teste`, `administrar`): GET 200; POST 201 (prova hierarquia
    administrar > escrever); PATCH 200.
  - Leitor (`leitor.teste` FINANCEIRO, `` ) — `patrimonio=ler`: GET 200; POST/PATCH 403.
  - SECRETARIA (`secretaria.teste`, `patrimonio=ler`): GET 200; POST 403 (discriminador:
    escreve igrejas mas NÃO patrimônio).
  - MEMBRO (`membro.teste`): admin GET 403/redirect; POST 403; `anon` assets vazio.
  - Portal/detalhe inexistente → 404;
- Regressões: `probes-admin-eventos.sh` (71/0), `probes-admin-lideranca.sh` (102/0),
  `probes-admin-membros.sh` (139/0), `probes-painel.sh` (27/0), `probes-auth.sh` (19/0)
  + gates.

## 8. Decisões de design

- Feature folder: `.specs/features/admin-patrimonio/`; commits Conventional, 1/task.
- Módulo `patrimonio` reutiliza guards `can()`/`can_access` — **nenhuma** alteração na
  ontologia `rbac.ts` nem no seed 0008 (linhas de `patrimonio` já existem).
- Migration `0013_assets.sql` isolada; **sem storage** (sem fotos); **sem DELETE**.
- RLS administrativa atípica: SELECT **sem `anon`** (inventário interno — PAT-02/11),
  diferentemente de `churches`/`leaders`/`events`.
- Tombo (`numero_patrimonio`) opcional mas único quando preenchido (índice único
  parcial + 409 na rota).
- Ordenação da lista administrativa por `name` asc (inventário alfabético).