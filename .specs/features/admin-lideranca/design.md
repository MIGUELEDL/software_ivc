# Igrejas & Liderança (RF-023) Design

**Spec**: `.specs/features/admin-lideranca/spec.md`
**Feature**: module `igrejas` da matriz (RF-032) — `churches` + `leaders` no admin e portal.

---

## 1. Visão de componentes

```
Portal (público)                        Admin (/admin/lideranca*)
  page.tsx (server, RSC)                  page.tsx / nova / [id] (RSC + client forms)
    └─ listarLideresAtivos()              └─ guards can('igrejas', ler/escrever) + forms
    └─ <Leadership leaders church/>          └─ PATCH/DELETE/POST via busca fetch()
                                                       │
             ┌───────────────┬──────────────────────────┘
             ▼               ▼
  src/lib/admin/lideranca.ts  (service layer — RLS enforça, guards na rota)
             │               │
   /api/admin/igrejas         └──POST/GET──> POST/PATCH/DELETE
   /api/admin/lideres            por [id] + [id]/foto (bucket fotos-lideranca)
             │
  Supabase: churches / leaders (RLS can_access('igrejas',...)) + storage
```

- **Leitura pública no portal** via client servant com RLS `anon` (SELECT liberado em
  `churches`/`leaders`); **escrita** somente por rotas protegidas por guardas.
- **Decisão de acesso em 3 camadas** (AD-015 + L-006): RLS `can_access('igrejas',
  nivel)` no banco; guardas `can(papel,'igrejas',nivel)` nas rotas; gate grosseiro
  `isAdminRole` no proxy.

## 2. Dados — migration `0011_igrejas_lideranca.sql`

### `churches`
| coluna | tipo | regra |
| ------ | ---- | ----- |
| id | uuid pk | default gen_random_uuid() |
| name | text not null | nome da igreja |
| short_name | text not null | sigla (IVC) |
| cnpj | text not null | sem máscara (14 dígitos) |
| address | text not null | endereço completo |
| city | text not null | cidade/UF (ex.: Santa Luzia - PB) |
| founded_date | date null | data de fundação |
| created_at / updated_at | timestamptz | defaults now() |

### `leaders`
| coluna | tipo | regra |
| ------ | ---- | ----- |
| id | uuid pk | default gen_random_uuid() |
| church_id | uuid not null | FK `churches.id` ON DELETE CASCADE |
| name | text not null | nome |
| role | text not null | cargo (ex.: "Pastor Presidente") |
| photo_url | text null | caminho público no bucket |
| order | int not null default 0 | ordem na listagem do portal |
| status | text not null default 'ATIVO' | check in ('ATIVO','INATIVO') |
| created_at / updated_at | timestamptz | defaults now() |

### RLS
| tabela | op | policy |
| ------ | -- | ------ |
| churches | SELECT | `anon` e `authenticated` (público) |
| churches | INSERT/UPDATE | `authenticated` com `can_access('igrejas','escrever')` |
| churches | DELETE | `authenticated` com `public.auth_role()='SUPER_ADMIN'` |
| leaders | SELECT | `anon` e `authenticated` (público) |
| leaders | INSERT/UPDATE | `authenticated` com `can_access('igrejas','escrever')` |
| leaders | DELETE | **nenhuma** (sem hard-delete; só cascata de churches) |

- A cascade de `churches` remove líderes independentemente de RLS (ação de
  integridade referencial não passa por policies do filho).

### Storage `fotos-lideranca`
Bucket público, `file_size_limit` 2MB, mime `image/jpeg|png|webp` (padrão 0003).
Policies de INSERT/UPDATE em `storage.objects`: `bucket_id='fotos-lideranca'` AND
`public.can_access('igrejas','escrever')`. Path `lideranca/{leaderId}/foto.{ext}`.

### Seed (idempotente, `on conflict do nothing`)
- 1 igreja (IVC — dados de `constants.ts`).
- 1 líder: **Pastor Ernandes Nogueira de Lucena**, `role='Pastor Presidente'`,
  `order=0`, `status='ATIVO'` (vinculado `church_id` da IVC).
- Usuário `superadmin.teste@ivc.local` (papel `SUPER_ADMIN`, senha `senha-teste`,
  `force_password_change=false`) — para probes do ramo `administrar`/DELETE 204
  (padrão `0007`/`0009`).

## 3. Service layer `src/lib/admin/lideranca.ts`

Padrão `src/lib/admin/membros.ts`: lista/detalhe via session client (RLS), escrita
via session client (RLS enforça `can_access`). Exceções de domínio com nome próprio
(`IgrejaNaoEncontrada`, `LiderNaoEncontrado`). Funções:

- `listarIgrejas(): Promise<Igreja[]>`
- `criarIgreja(dados): Promise<Igreja>`
- `atualizarIgreja(id, dados): Promise<Igreja>` — 404 se não existir
- `excluirIgreja(id): Promise<void>`
- `listarLideres(igrejaId): Promise<Lider[]>`
- `listarLideresAtivos(): Promise<Lider[]>` — `status='ATIVO'` ordenado por `order` (portal)
- `criarLider(igrejaId, dados): Promise<Lider>`
- `atualizarLider(id, dados): Promise<Lider>` — aceita `status` (soft-delete)
- `subirFotoLider(id, file): Promise<{photo_url}>`

Validação por campo: `src/lib/admin/validacao.ts` ganha `validarCnpj`
(14 dígitos numeric) e `validarFoto` (extensões/mime permitidos). `name`, `role`,
`address`, `city`, `short_name` obrigatórios (não vazios).

## 4. API routes

| Rota | Métodos | Guarda | ACs |
| ---- | ------- | ------ | --- |
| `/api/admin/igrejas` | POST, GET | criar: `requireEscrita('igrejas')`; listar: `authAdmin('igrejas')` | IGR-05/06/07/08 |
| `/api/admin/igrejas/[id]` | PATCH, DELETE | PATCH: `requireEscrita('igrejas')`; DELETE: `authAdmin('igrejas')` + `claims.role==='SUPER_ADMIN'` | IGR-09/10/11/12 |
| `/api/admin/igrejas/[id]/lideres` | POST | `requireEscrita('igrejas')` | IGR-16/17 |
| `/api/admin/lideres/[id]` | PATCH | `requireEscrita('igrejas')` | IGR-18/19 |
| `/api/admin/lideres/[id]/foto` | POST | `requireEscrita('igrejas')` | IGR-20/21 |

Formato de erro herdado: 401/403/400 `{error, campos}` / 404 `{error:"nao_encontrado"}`
(padrão admin-membros); negativa logada por `negarPermissao`.

## 5. Páginas admin (`/admin/lideranca*`)

- `page.tsx` (RSC): lista igrejas (nome, cidade, nº líderes, criada_em) com ações
  (editar/excluir) e link "Nova igreja". Renderiza a guarda por `can('igrejas','ler')`
  (redirect 403 se não ler). Ações de escrita/delete aparecem conforme nível.
- `nova/page.tsx`: formulário de criação (nome, sigla, CNPJ, endereço, cidade,
  fundada_em) → `POST /api/admin/igrejas`; 400 por campo; redirect ao `[id]`.
- `[id]/page.tsx`: detalhe/edição da igreja (PATCH) + gestão de líderes
  (listar, adicionar, editar cargo/ordem, inativar/ativar, upload de foto)
  pelos endpoints acima. `DELETE` igreja dentro do detalhe (confirmação) — só
  `SUPER_ADMIN` vê o botão e o servidor revalida.
- Papéis leitores (`SECRETARIA`/`FINANCEIRO`/`PATRIMONIAL`/`LIDER`) leem a lista;
  ações de escrita ocultas + 403 garantido pelos guards.

## 6. Portal — migração da seção Liderança

- `src/app/page.tsx` vira **async RSC**: busca `listarLideresAtivos()` +
  primeira igreja (`listarIgrejas()` → `[0]`), passa para `<Leadership leaders church>`.
- `src/components/Leadership.tsx` (client): mantém `id="lideranca"` + framer-motion;
  renders grid de cards (foto `photo_url` com fallback para avatar/ícone, nome,
  cargo) ordenado por `order`; **estado vazio** quando não há líderes ATIVO.
- **Regressão portal-home**: HOME-04/HOME-08 preservados (âncora/nav intactas); o
  conteúdo passa a ser DB-driven (migração prevista no `context.md` do portal-home).

## 7. Probes `scripts/probes-admin-lideranca.sh`

- **Estático**: migrations (tabelas, RLS can_access, policy DELETE SUPER_ADMIN,
  seed 48+igreja+líder), guards nas rotas, ausência de literais de líder em
  `Leadership.tsx`, string de cargo/ordem na UI, storage bucket/policies.
- **Runtime** (sessões reais — L-007/008):
  - ADMIN (`admin.teste`): POST igreja 201; PATCH 200; POST líder 201; PATCH líder
    (incl. INATIVO) 200; POST foto 200; DELETE igreja 204 (cascade).
  - SECRETARIA/FINANCEIRO (`secretaria.teste`/`leitor.teste`): GET lista 200; POST
    403; PATCH 403; DELETE 403 — discriminando papel leitor de igrejas.
  - ADMIN tenta DELETE igreja → **403** (não é SUPER_ADMIN) — discriminator IGR-12.
  - SUPER_ADMIN (`superadmin.teste`): DELETE igreja 204.
  - MEMBRO (`membro.teste`): POST/PATCH 403 (via guard), GET admin 403/redirect.
  - Portal: HTML da home contém líder ATIVO (nome) e não contém INATIVO.
- Regressões: `probes-admin-membros.sh`, `probes-painel.sh`, `probes-auth.sh` verdes;
  gates lint/typecheck/build.

## 8. Decisões de design

- Feature folder: `.specs/features/admin-lideranca/`; commits Conventional, 1/task.
- Módulo `igrejas` reutiliza guards `can()`/`can_access` — **nenhuma** alteração na
  ontologia `rbac.ts` nem no seed 0008 (linhas de `igrejas` já existem).
- Sem migration para memebros/outros módulos; migration 0011 isolada.
- Fotos: `upsert: true` no upload (re-upload substitui); `photo_url` gravado no líder;
  DELETE de igreja não tenta apagar objetos do bucket (garbage collection fica para
  feature de storage — de risco baixo, documentado; **decisão**: manter simples).