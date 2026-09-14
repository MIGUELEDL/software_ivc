# Eventos (RF-024) Design

**Spec**: `.specs/features/admin-eventos/spec.md`
**Feature**: module `eventos` da matriz (RF-032) — CRUD + visibilidade + portal DB-driven.

---

## 1. Visão de componentes

```
Portal (público)                        Admin (/admin/eventos*)
  /eventos/page.tsx (server, RSC)        page.tsx / nova / [id] (RSC + client forms)
  /eventos/[id]/page.tsx (server, RSC)   └─ guards can('eventos', ler/escrever) + forms
    └─ listarEventosPublicos()               └─ POST/PATCH via fetch()
             │                                    │
             ▼                                    ▼
  src/lib/admin/eventos.ts  (service layer — RLS enforça, guards na rota)
             │                                    │
  /api/admin/eventos (POST/GET)  ──PATCH──>  /api/admin/eventos/[id]
             │
  Supabase: events (RLS can_access('eventos',...))
```

- **Leitura pública no portal** via server-supabase com RLS `anon` (SELECT liberado
  em `events`); **escrita** somente por rotas protegidas por guardas.
- **Decisão de acesso em 3 camadas** (AD-015 + L-006): RLS `can_access('eventos',
  nivel)` no banco; guardas `can(papel,'eventos',nivel)` nas rotas; gate grosseiro
  `isAdminRole` no proxy.
- **Dono da visibilidade**: o app filtra `visivel=true AND status='ATIVO'` no portal
  (RLS não filtra conteúdo — mesmo padrão `leaders`), e ocultos devolvem `404` no
  detalhe (EVT-14).

## 2. Dados — migration `0012_events.sql`

### `events`
| coluna | tipo | regra |
| ------ | ---- | ----- |
| id | uuid pk | default gen_random_uuid() |
| title | text not null | título (ex.: "Clamor 12h") |
| description | text null | descrição opcional |
| date | date not null | data do evento |
| time | text not null | hora (ex.: "19:30") |
| location | text not null | local |
| visivel | boolean not null default true | visibilidade manual no portal |
| status | text not null default 'ATIVO' | check in ('ATIVO','INATIVO') |
| created_at / updated_at | timestamptz | defaults now() |

> `time` como `text` (ex.: "19:30") espelha o formato do portal RF-006
> (`Evento.time`), evitando fuso/timezone de `time with time zone`.

### RLS
| tabela | op | policy |
| ------ | -- | ------ |
| events | SELECT | `anon` e `authenticated` (público) |
| events | INSERT/UPDATE | `authenticated` com `can_access('eventos','escrever')` |
| events | DELETE | **nenhuma** (só soft-delete por `status`, EVT-03/10/11) |

### Seed (idempotente, `on conflict do nothing`)
- 1 evento real: **"Clamor 12h"** (âncora já existente na home), `title='Clamor 12h'`,
  `description` curta, `date` futura (ex.: 2026-10-01), `time='12:00'`,
  `location='Santa Luzia - PB'`, `visivel=true`, `status='ATIVO'` — para o portal
  exibir conteúdo e os probes discriminarem (padrão da IVC no 0002/0011).
- Sem novos usuários (probes reutilizam admin.teste/sec/leitor/superadmin de 0007/0009;
  `MEMBRO` = membro.teste de 0010).

## 3. Service layer `src/lib/admin/eventos.ts`

Padrão `src/lib/admin/lideranca.ts`: lista/detalhe via session client (RLS), escrita
via session client (RLS enforça `can_access`). Exceções de domínio
(`EventoNaoEncontrado`). Funções:

- `listarEventos(): Promise<Evento[]>` — todos (incl. ocultos/INATIVO), `date` desc (admin)
- `listarEventosPublicos(): Promise<Evento[]>` — `visivel=true & status='ATIVO'`, `date` asc (portal)
- `buscarEventoPublico(id): Promise<Evento | null>` — só visivel+ATIVO (404 se oculto/existir INATIVO)
- `criarEvento(dados): Promise<Evento>`
- `atualizarEvento(id, dados): Promise<Evento>` — 404 se não existir; aceita `visivel` e `status`

Tipos: `Evento` (linha completa) + `EventoDados` (title, description?, date, time,
location, visivel?) + `EventoPatch` (parciais + status/visivel).

Validação por campo em `src/lib/admin/validacao.ts`: ganha `validarEvento` —
`title`, `date`, `time`, `location` obrigatórios não vazios; `date` no formato
`YYYY-MM-DD`; `time` `HH:MM`; `visivel` booleano quando enviado; `status` em
`ATIVO`/`INATIVO` quando enviado. Alvos de payload: `POST` valida todos os
obrigatórios; `PATCH` valida apenas campos enviados (parcial, como `IgrejaPatch`).

## 4. API routes

| Rota | Métodos | Guarda | ACs |
| ---- | ------- | ------ | --- |
| `/api/admin/eventos` | POST, GET | criar: `requireEscrita('eventos')`; listar: `authAdmin('eventos')` | EVT-04/05/06/07 |
| `/api/admin/eventos/[id]` | PATCH | `requireEscrita('eventos')` | EVT-08/09/10/11 |

Formato de erro herdado: 401/403/400 `{error, campos}` / 404 `{error:"nao_encontrado"}`
(padrão admin-membros); negativa logada por `negarPermissao`.

## 5. Páginas admin (`/admin/eventos*`)

- `page.tsx` (RSC): lista eventos (título, data, local, badges `visivel`/`status`)
  com ações (editar) e link "Novo evento". Renderiza guarda por `can('eventos','ler')`
  (redirect 403 se não ler). Ações de escrita conforme nível.
- `nova/page.tsx`: formulário de criação (título, descrição, data, hora, local,
  visibilidade) → `POST /api/admin/eventos`; 400 por campo; redirect ao `[id]`.
- `[id]/page.tsx`: detalhe/edição (PATCH) com toggle `visivel` e toggle
  `status` `ATIVO`/`INATIVO` (soft-delete) — sem DELETE (EVT-03). Papéis leitores
  veem detalhe sem ações de escrita (servidor revalida 403).

## 6. Portal — migração das páginas de eventos

- `src/app/eventos/page.tsx` vira **async RSC**: `listarEventosPublicos()` → grid
  (título, data, hora, local) com link a `/eventos/[id]`; **estado vazio** quando não
  houver eventos (EVT-15).
- `src/app/eventos/[id]/page.tsx` vira **async RSC**: `buscarEventoPublico(id)` —
  evento inexistente/oculto/INATIVO → `notFound()` (EVT-14); mantém
  "Inscrever-se via WhatsApp" (RN-003/EVT-13). Remove `generateStaticParams`
  (falha com DB incidental; a página passa a ser dinâmica).
- **Regressão RF-006**: navegação "Eventos" em `NAV_ITEMS` preservada (EVT-16);
  mensagem e layout de estado vazio mantidos.

## 7. Probes `scripts/probes-admin-eventos.sh`

- **Estático**: migration 0012 (tabela, RLS can_access, sem policy DELETE, seed),
  guards nas rotas, service (validação, filtros de visibilidade), páginas admin,
  portal (RSC DB-driven, ausência de literal `EVENTS`/`EVENTS.length` nas páginas).
- **Runtime** (sessões reais — L-007/008):
  - ADMIN (`admin.teste`): POST 201; PATCH 200 (incl. `visivel=false` e
    `status=INATIVO`); GET lista 200 (inclui ocultos/inativos).
  - SECRETARIA (`secretaria.teste`, `eventos=escrever`): POST 201; PATCH 200.
  - FINANCEIRO/leitor (`leitor.teste`, `eventos=ler`): GET 200; POST/PATCH 403 —
    discriminando leitor de escritor.
  - LIDER (papel sem `escrever` em eventos): POST/PATCH 403 (se usário existir; senão
    coberto por FINANCEIRO/PATRIMONIAL — decidir no T-role).
  - MEMBRO (`membro.teste`): GET admin 403/redirect; POST 403 (guard).
  - Portal: `/eventos` contém evento ATIVO+visivel seed (título) e não contém
    `Clamor 12h` quando ocultado; `/eventos/[id]` oculto → 404; empty state quando
    todos ocultos/inativos.
- Regressões: `probes-admin-lideranca.sh` (102/0), `probes-admin-membros.sh` (139/0),
  `probes-painel.sh` (27/0), `probes-auth.sh` (19/0) verdes; gates lint/typecheck/build.

## 8. Decisões de design

- Feature folder: `.specs/features/admin-eventos/`; commits Conventional, 1/task.
- Módulo `eventos` reutiliza guards `can()`/`can_access` — **nenhuma** alteração na
  ontologia `rbac.ts` nem no seed 0008 (linhas de `eventos` já existem).
- Migration `0012_events.sql` isolada (próxima numeração — 0012; nenhuma relação com
  outros módulos).
- Sem storage neste módulo (campos mínimos — decisão do usuário) e sem DELETE de
  evento (soft-delete por `status` — decisão do usuário).
- `time` como `text` "HH:MM" sem fuso (formato visual RF-006); validação por regex.
- Visibilidade decidida somente manual (`visivel`); nenhuma regra por data (decisão
  do usuário) — o portal exibe eventos passados que sigam `visivel`+`ATIVO`.