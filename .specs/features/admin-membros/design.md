# Admin Membros Design

**Spec**: `.specs/features/admin-membros/spec.md`
**Status**: Draft

---

## Architecture Overview

Abordagem **A confirmada** (RSC + Route Handlers + service-role helper). Camadas
(AD-002/AD-014): RSC leem `/admin/membros*` direto do banco (mesmo padrão dos
avisos do painel-membro); Route Handlers em `/api/admin/*` fazem toda escrita com
validação e guard próprio (401/403); um helper **service-role exclusivo de
servidor** (`src/lib/supabase/admin.ts`) faz as operações de Auth admin
(`createUser`, `deleteUser`) — nunca importado em client. Proxy já blinda
`/admin/:path*` (sessão + papel + troca de senha).

```mermaid
graph TD
    S[Session via cookie] --> CL[getClaims]
    CL --> L[/admin/membros/]
    L -->|searchParams q/status| SB[(Supabase members + RLS admin)]
    CL --> D[/admin/membros/id/]
    D --> SB
    D --> DOC[(member_documents + RLS admin)]
    D --> C[/admin/membros/id/cartao/]
    C --> MC[MemberCard extraido]
    N[/admin/membros/novo/] -->|POST fetch| CR[Rota POST /api/admin/membros]
    CR --> ADM[(createUser service-role)]
    CR --> SB[(insert members + matricula RPC)]
    N -->|201| SENHA[senha temporaria 1x]
    ED[forms POST dados/status/docs] --> RH[Route Handlers]
    RH --> SB
    RH --> DOC
    HD[hard-delete DELETE] --> RH2
    RH2 --> ADM[(deleteUser)] + SB
```

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --------- | -------- | ---------- |
| `getClaims()` | `src/lib/auth/claims.ts` | Guard de sessão/papel nas RSC e nos handlers |
| `isAdminRole` | `src/lib/auth/rbac.ts` | Gate de área já no proxy; adicionar `isAdminWriterRole` |
| `createServerClient` | `src/lib/supabase/server.ts` | Leituras/Escritas sob a sessão (RLS admin) |
| `generateMatricula` | `src/lib/painel/members.ts:54` | RPC `proxima_matricula` (0005, security definer) |
| Card do membro | `src/app/painel/cartao/page.tsx:78-132` | Extrair p/ `MemberCard` (props member) e reusar nos 2 cartões |
| `PrintButton` | `src/app/painel/cartao/print-button.tsx` | Reusado no cartão admin |
| Padrão validação `{error, campos}` | `src/app/api/painel/perfil/route.ts` | Mesmo shape de 400 por campo |
| Pattern forms server + fetch client | perfil (F4, `perfil-form.tsx`) | Form de criação (senha 1×) segue o padrão F4 já aceito |
| `validarNascimento` | `src/app/api/painel/perfil/route.ts:13-31` | Mesmos bounds (≤120, não futura) |
| Seed auth.users sintético | `supabase/migrations/0002/0004` | Mesmo padrão p/ users admin de teste |
| `createClient` service-role | `src/app/api/auth/trocar-senha/route.ts:53-56` | Novo `src/lib/supabase/admin.ts` centraliza |

### Integration Points

| System | Integration Method |
| ------ | ------------------ |
| Postgres (members, member_documents) | `supabase/migrations/0006_admin_membros.sql` via CLI/MCP; DML server-side com RLS |
| Supabase Auth admin | Service-role client (`createUser`/`updateUserById`/`deleteUser`) em `src/lib/supabase/admin.ts` |
| Supabase Auth session | `getClaims()` (apenas decisões server-side) |

---

## Components

### Páginas (RSC, protegidas pelo proxy `/admin/:path*`)

#### Lista — `/admin/membros`

- **Purpose**: Lista todos os membros com busca (`q`) e filtro de status; ordena `nome asc`.
- **Location**: `src/app/admin/membros/page.tsx`
- **Interfaces**: lê `searchParams` (`q`, `status`); consulta `listMembros({ q, status })`.
- **Dependencies**: `getClaims()` (para exibir papel/links e autorizar), server client.
- **Reuses**: `listMembros` da lib; layout section/max-w-4xl do padrão; `lucide-react`.

#### Novo membro — `/admin/membros/novo`

- **Purpose**: Form de criação (nome, nascimento, whatsapp, email, endereço opcional).
- **Location**: `src/app/admin/membros/novo/page.tsx`
- **Interfaces**: server page renderiza `MembroNovoForm` (client, padrão F4) que faz
  `POST /api/admin/membros` via fetch; em 201 exibe a **senha temporária 1×** (nunca
  em URL) com botão "copiar" e navega para `/admin/membros/[id]`.
- **Dependencies**: papel escritor (guard no handler e na rota de UI — se leitor, link escondido).
- **Reuses**: campos de form do perfil (mesmos estilos tailwind).

#### Detalhe — `/admin/membros/[id]`

- **Purpose**: Mostra dados completos do membro (situação, contatos, endereço),
  metadados de documentos, e forms de edição/ciclo de vida.
- **Location**: `src/app/admin/membros/[id]/page.tsx`
- **Interfaces**:
  - `GET` via RSC: `getMembro(id)` + `listDocumentos(id)`; 404 se não existir.
  - Forms (server `action` POST): editar dados → `/api/admin/membros/[id]/dados`;
    transição → `/api/admin/membros/[id]/status`; remover (inativar) →
    `/api/admin/membros/[id]/remover`; novo documento →
    `/api/admin/membros/[id]/documentos`; hard-delete → client confirm + `DELETE`.
- **Dependencies**: `await params` (Next 16), guards de papel para forms.

#### Cartão — `/admin/membros/[id]/cartao`

- **Purpose**: Renderiza o cartão (nome, matrícula, igreja, foto/placeholder) + imprimir.
- **Location**: `src/app/admin/membros/[id]/cartao/page.tsx`
- **Interfaces**: `getMembro(id)`; `MemberCard` + `PrintButton`.
- **Reuses**: `MemberCard` (extraído), `PrintButton`.

### Lib de dados

#### `src/lib/admin/membros.ts`

- **Purpose**: CRUD/ciclo-de-vida/documentos de membros sob a sessão admin (RLS backstop).
- **Interfaces**:
  - `listMembros(filtros: { q?: string; status?: string }): Promise<MembroAdmin[]>`
  - `getMembro(id: string): Promise<MembroAdmin | null>` (não-lança em not-found)
  - `criarMembro(dados): Promise<{ membro, senhaTemporaria }>` — cria auth user
    (service-role) → matrícula RPC → insert `members`; **rollback** (deleteUser) se o
    insert falhar; retorna a senha **1×**
  - `atualizarDadosMembro(id, dados): Promise<MembroAdmin>`
  - `transicionarStatus(id, novoStatus): Promise<MembroAdmin>` — valida transição
  - `inativarMembro(id): Promise<MembroAdmin>`
  - `excluirMembro(id): Promise<void>` — check docs → delete auth user (service-role) → delete row
  - `listDocumentos(memberId): Promise<Documento[]>`
  - `criarDocumento(memberId, tipo, descricao): Promise<Documento>`
  - `removerDocumento(memberId, docId): Promise<void>`
- **Dependencies**: `createServerClient`, `createAdminClient`, `generateMatricula`.
- **Reuses**: tipo `Member` de `members.ts` (estendido com status/endereço).

#### `src/lib/supabase/admin.ts`

- **Purpose**: Client supabase com a service-role (exclusivo servidor).
- **Interfaces**: `createAdminClient()` → `createClient(URL, SERVICE_ROLE_KEY)`.
- **Reuses**: padrão do `trocar-senha/route.ts`.

### Route Handlers (`/api/admin/*`, guard próprio — proxy não cobre `/api`)

| Rota | Verbo | Papel | Comportamento |
| ---- | ----- | ----- | ------------- |
| `/api/admin/membros` | POST | escritor | cria (201 + senha 1×) / 400 / 409 `email_em_uso` |
| `/api/admin/membros/[id]/dados` | POST | escritor | atualiza dados (200/400/404) |
| `/api/admin/membros/[id]/status` | POST | escritor | transição válida (200/400/404) |
| `/api/admin/membros/[id]/remover` | POST | escritor | inativa (soft, 200) |
| `/api/admin/membros/[id]` | DELETE | ADMIN/SUPER_ADMIN | hard-delete (204/409/404) |
| `/api/admin/membros/[id]/documentos` | POST | escritor | cria metadado (201/400/404) |
| `/api/admin/membros/[id]/documentos/[docId]` | DELETE | escritor | remove metadado (204/404) |

- Todos: sem sessão → 401; papel leitor/não-admin em escrita → 403.
- Formato de erro: `{ error }` ou `{ error, campos }` (padrão painel-membro).

### RBAC (`src/lib/auth/rbac.ts`)

- Add `ADMIN_WRITER_ROLES = { SECRETARIA, ADMIN, SUPER_ADMIN }` e
  `isAdminWriterRole(role)`, `isHardDeleteRole(role)` (ADMIN/SUPER_ADMIN).

### `MemberCard` (extração)

- **Location**: `src/components/MemberCard.tsx` (presentacional, `id="cartao-membro"`).
- Extrair o bloco `cartao/page.tsx:78-132`; `cartao/page.tsx` e o cartão admin o usam.
- Sem mudança de comportamento (gates/probes atuais re-rodam).

---

## Data Models

### members (alter — migration 0006)

```sql
alter table public.members
  add column if not exists status text not null default 'ATIVO'
    check (status in ('ATIVO','INATIVO','TRANSFERIDO')),
  add column if not exists logradouro text,
  add column if not exists numero text,
  add column if not exists bairro text,
  add column if not exists cidade text,
  add column if not exists uf text check (uf is null or char_length(uf) = 2),
  add column if not exists cep text;
```

```typescript
type MembroAdmin = Member & {
  status: "ATIVO" | "INATIVO" | "TRANSFERIDO";
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
};
```

### member_documents (nova — migration 0006)

```sql
create table if not exists public.member_documents (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.members(id) on delete cascade,
  tipo       text not null check (tipo in ('RG','CPF','comprovante_endereco','outro')),
  descricao  text,
  criado_em  timestamptz not null default now()
);
```

### RLS (migration 0006) — helper `public.auth_role()`

`create or replace function public.auth_role() returns text language sql stable security definer as $$ select coalesce(nullif(auth.jwt() -> 'app_metadata' ->> 'role',''),'') $$;`

| Tabela | Policy | Condição |
| ------ | ------ | -------- |
| members | `members_select_admin` | `auth_role()` IN (todas as roles admin) |
| members | `members_insert_admin` | writer roles (§ context) |
| members | `members_update_admin` | writer roles |
| members | `members_delete_admin` | ADMIN/SUPER_ADMIN (hard-delete) |
| member_documents | `docs_select_admin` | todas as roles admin |
| member_documents | `docs_insert_admin` / `docs_delete_admin` | writer roles |

Políticas `members_select/insert/update_own` (0001) permanecem — um MEMBRO ainda vê/edita o próprio registro.

### Seed (migration 0007) — users admin de teste

- `admin.teste@ivc.local` — role `ADMIN` (escritor + hard-delete), sem `force_password_change`.
- `leitor.teste@ivc.local` — role `FINANCEIRO` (leitor), sem `force_password_change`.
- Idempotente (padrão 0002/0004).

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| -------------- | -------- | ----------- |
| Sem sessão em `/api/admin/*` | 401 | Mensagem genérica |
| Papel leitor/não-admin em escrita | 403 | Ação negada |
| Campos inválidos no POST create | 400 `{error, campos}` | Erro inline no form |
| E-mail em uso | 409 `email_em_uso` | Aviso: pessoa provavelmente já tem conta |
| Transição de status inválida | 400 `status_transicao_invalida` | Mensagem no form |
| Hard-delete com documentos | 409 | Ação negada |
| Membros/documento não existe | 404 | Página/form com erro |
| Falha no insert após criar auth user | Rollback `deleteUser` + 500 | Nenhum estado parcial |
| Falha de banco na leitura | try/catch → página amigável (padrão cartão) | Sem quebra |
| Senha-ID | Exibida 1× em estado cliente (F4), nunca em URL | Entrega manual |

---

## Risks & Concerns

| Concern | Location (file:line) | Impact | Mitigation |
| ------- | -------------------- | ------ | ---------- |
| Service-role em bundle client | client components novos | Exfiltração de segredo se vazada | `createAdminClient` só importado em rotas server/`src/lib/admin/*` (node runtime); nada em client |
| Sequência de matrícula e RPC | `members.ts:54` | Já provada imune a RLS | Reusar `generateMatricula` sem re-impl |
| Rollback de criação parcial | create com 2 passos | Órfão em auth.users se members falhar | `try/catch` → `deleteUser` no catch; log; guarda documentada |
| `auth_role()` depende de `app_metadata.role` | seed insere em `raw_app_meta_data` | Role ausente → sem acesso | Probes live validam writer e leitor reais; seed com `role` explícito |
| `params` Promise no Next 16 | rotas `[id]` | Bug de tipagem se esquecer `await` | Docs lidas; `await params` em todas as rotas dinâmicas |
| Duplicação do cartão | `cartao/page.tsx:78-132` | Duas cópias divergem | Extrair `MemberCard` (1 fonte) |
| RLS delete restrito mas service-role bypasseia | hard-delete usa user-session client | RLS vira backstop real | DML members via sessão (policy delete admin); service-role só p/ auth ops |
| Probes com email único | criação por separação | Resíduo entre runs | Nome/email com `$RANDOM` + limpza no fim (hard-delete do criado) |

---

## Tech Decisions (only non-obvious ones)

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Abordagem | RSC + Route Handlers + service-role helper | Consistência com painel-membro/auth (confirmada A) |
| Escrita por rotas POST/DELETE explícitas | POST p/ forms; DELETE p/ hard-delete/doc-remove | Verbo real = AC da spec; forms server = padrão |
| Senha 1× | Client fetch no form de criação (padrão F4) | Nunca via URL/redirect; some ao navegar |
| Service-role helper novo | `src/lib/supabase/admin.ts` | Centraliza; não duplicar em cada handler |
| Membro editável | `MembroAdmin` estende `Member` | 1 tipo, reuso do painel-membro |
| RLS função `auth_role()` | SQL function security definer | Policies legíveis; reuso nas duas tabelas |
| Seed users admin | Migração 0007 (SQL) | Mesmo padrão provado (0002/0004) |

> **Project-level decision candidate:** helper de cliente service-role centralizado em
> `src/lib/supabase/admin.ts` como padrão p/ operações admin do projeto (já existe o
> padrão no `trocar-senha/route.ts`, agora formalizado). Não é nova ADR — formaliza AD-013.

---

## Tips

- **Reuso total**: `generateMatricula`, `isAdminRole`, `createServerClient`, `MemberCard` extraído, `PrintButton`, shape de erro — quase nada é novo.
- **Não aumentar cargo do client**: só 2 client components novos (form de criação e confirm de hard-delete).
- **Migrations**: 0006 (schema+RLS) e 0007 (seed admin) — aplicar via MCP no projeto dev antes dos probes live.
- **Probes**: `scripts/probes-admin-membros.sh`, re-runnable (email `$RANDOM`, cleanup no final).