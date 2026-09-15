-- 0014_financeiro.sql
-- RF-026 (Financeiro), modulo `financeiro` da matriz de permissoes (0008).
-- Tabelas: transactions, webhook_events, cash_closes com RLS via
-- can_access('financeiro', ...): SELECT somente `authenticated` com
-- `can_access('financeiro','ler')` — SEM role `anon`; escrita (INSERT/UPDATE)
-- com `can_access('financeiro','escrever')` e NENHUMA policy de DELETE em
-- transactions (soft-delete por `status='CANCELADO'`, FIN-05) ou cash_closes
-- (snapshot imutavel, FIN-10). webhook_events SEM RLS (escrita via service-role
-- no webhook; leitura restrita fica para auditoria futura).
-- Seed idempotente: 1 RECEITA + 1 DESPESA + usuario `financeiro.teste@ivc.local`
-- (papel FINANCEIRO — discrimina o ramo `escrever` do can() no modulo).

-- ============================================================ tables =======

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

-- webhook_events: sem RLS — escrita feita por service-role no endpoint de
-- webhook (FIN-06); leitura restrita fica para pagina de auditoria futura.

create table if not exists public.cash_closes (
  id uuid primary key default gen_random_uuid(),
  data_fechamento date not null default current_date,
  total_receitas numeric(12,2) not null default 0,
  total_despesas numeric(12,2) not null default 0,
  saldo numeric(12,2) generated always as (total_receitas - total_despesas) stored,
  qtd_transacoes integer not null default 0,
  observacoes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  valor numeric(12,2) not null check (valor >= 0),
  tipo text not null check (tipo in ('RECEITA', 'DESPESA')),
  metodo text not null check (metodo in ('PIX', 'CARTAO', 'DINHEIRO', 'TRANSFERENCIA')),
  status text not null default 'PENDENTE'
    check (status in ('PENDENTE', 'CONCILIADO', 'CANCELADO')),
  categoria text,
  observacoes text,
  data date not null default current_date,
  external_reference text,
  webhook_event_id uuid references webhook_events(id),
  cash_close_id uuid references cash_closes(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================ indexes =====

create index if not exists idx_transactions_status
  on public.transactions (status);

create index if not exists idx_transactions_data
  on public.transactions (data desc);

create index if not exists idx_transactions_external_ref
  on public.transactions (external_reference)
  where external_reference is not null;

-- ============================================================ RLS =========

-- transactions ---------------------------------------------------------------
alter table public.transactions enable row level security;

drop policy if exists "transactions_select_admin" on public.transactions;
create policy "transactions_select_admin"
  on public.transactions
  for select
  to authenticated
  using (public.can_access('financeiro', 'ler'));

drop policy if exists "transactions_insert_admin" on public.transactions;
create policy "transactions_insert_admin"
  on public.transactions
  for insert
  to authenticated
  with check (public.can_access('financeiro', 'escrever'));

drop policy if exists "transactions_update_admin" on public.transactions;
create policy "transactions_update_admin"
  on public.transactions
  for update
  to authenticated
  using (public.can_access('financeiro', 'escrever'))
  with check (public.can_access('financeiro', 'escrever'));

-- Sem policy de DELETE em `transactions`: soft-delete por `status='CANCELADO'`
-- (FIN-05) — historico preservado, mesmo padrao de `assets`/`leaders`.

-- cash_closes ----------------------------------------------------------------
alter table public.cash_closes enable row level security;

drop policy if exists "cash_closes_select_admin" on public.cash_closes;
create policy "cash_closes_select_admin"
  on public.cash_closes
  for select
  to authenticated
  using (public.can_access('financeiro', 'ler'));

drop policy if exists "cash_closes_insert_admin" on public.cash_closes;
create policy "cash_closes_insert_admin"
  on public.cash_closes
  for insert
  to authenticated
  with check (public.can_access('financeiro', 'escrever'));

-- Sem policy de UPDATE/DELETE em `cash_closes`: snapshot imutavel (FIN-10).

-- ============================================================ seeds =======
-- Seed de transacoes: 1 RECEITA seed + 1 DESPESA seed. Idempotencia por
-- `on conflict (id) do nothing` (mesmo padrao do 0013_assets.sql).

-- RECEITA seed — "Dízimo seed" (100.00, PIX, PENDENTE)
insert into public.transactions (
  id, descricao, valor, tipo, metodo, status, data
) values (
  '00000000-0000-4000-8000-000000000011',
  'Dízimo seed', 100.00, 'RECEITA', 'PIX', 'PENDENTE', current_date
)
on conflict (id) do nothing;

-- DESPESA seed — "Aluguel seed" (500.00, PIX, PENDENTE)
insert into public.transactions (
  id, descricao, valor, tipo, metodo, status, data
) values (
  '00000000-0000-4000-8000-000000000012',
  'Aluguel seed', 500.00, 'DESPESA', 'PIX', 'PENDENTE', current_date
)
on conflict (id) do nothing;

-- Seed de desenvolvimento: 1 usuario com papel FINANCEIRO (RF-026) para
-- os probes live da matriz de permissoes (escritor do ramo `escrever` do
-- financeiro):
--   financeiro.teste@ivc.local -> role FINANCEIRO (escreve financeiro)
-- Mesmo padrao idempotente do 0013; sem `force_password_change` no
-- app_metadata (claims.ts:47 le `=== true` -> false), probes nao param em
-- /trocar-senha.
-- NAO cria usuario em members (financeiro e papel administrativo, nao membro).
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-000000000013',
  'authenticated', 'authenticated',
  'financeiro.teste@ivc.local',
  crypt('senha-teste', gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', 'FINANCEIRO'),
  '{}'::jsonb,
  now(), now(),
  '', '', '', ''
)
on conflict (id) do nothing;
