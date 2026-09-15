-- 0013_assets.sql
-- RF-025 (Patrimônio), módulo `patrimonio` da matriz de permissões (0008).
-- Tabela `assets` com RLS via `can_access('patrimonio', ...)`: SELECT somente
-- `authenticated` com `can_access('patrimonio','ler')` — SEM role `anon`
-- (inventário interno, PAT-02/11); escrita (INSERT/UPDATE) com
-- `can_access('patrimonio','escrever')` e NENHUMA policy de DELETE (baixa por
-- soft-delete `status='INATIVO'`, PAT-03/10).
-- Seed idempotente: bem "Kit de Som" (âncora da lista) + usuário
-- `patrimonial.teste@ivc.local` (papel PATRIMONIAL — discrimina o ramo
-- `escrever` do can() no módulo).
-- Sem storage: patrimônio não tem fotos (decisão do usuário — campos mínimos).

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null
    check (category in ('AUDIO','VIDEO','INSTRUMENTO','MOBILIA','EQUIPAMENTO','RELIGIOSO','OUTRO')),
  numero_patrimonio text,
  location text,
  acquisition_value numeric(12,2) check (acquisition_value >= 0),
  acquisition_date date,
  responsible text,
  status text not null default 'ATIVO'
    check (status in ('ATIVO', 'INATIVO')),
  observations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tombo (`numero_patrimonio`) opcional mas único quando preenchido: índice
-- único PARCIAL (vários bens podem ter tombo nulo; PAT-01). A rota converte o
-- code 23505 → 409 `numero_patrimonio_duplicado`.
create unique index if not exists assets_numero_patrimonio_unique
  on public.assets (numero_patrimonio)
  where numero_patrimonio is not null;

alter table public.assets enable row level security;

drop policy if exists "assets_select_admin" on public.assets;
create policy "assets_select_admin"
  on public.assets
  for select
  to authenticated
  using (public.can_access('patrimonio', 'ler'));

drop policy if exists "assets_insert_admin" on public.assets;
create policy "assets_insert_admin"
  on public.assets
  for insert
  to authenticated
  with check (public.can_access('patrimonio', 'escrever'));

drop policy if exists "assets_update_admin" on public.assets;
create policy "assets_update_admin"
  on public.assets
  for update
  to authenticated
  using (public.can_access('patrimonio', 'escrever'))
  with check (public.can_access('patrimonio', 'escrever'));

-- Sem policy de DELETE em `assets`: baixa por `status='INATIVO'`
-- (PAT-03/10) — histórico preservado, mesmo padrão de `leaders`/`events`.

-- -------------------------------------------------------------- seeds -------
-- Bem âncora "Kit de Som" (AUDIO, tombo PAT-0001) — dá conteúdo à lista e
-- âncora aos probes.
insert into public.assets (
  id, name, category, numero_patrimonio, location, acquisition_value,
  acquisition_date, responsible, status
) values (
  '00000000-0000-4000-8000-000000000010',
  'Kit de Som', 'AUDIO', 'PAT-0001', 'Templo', 2500.00,
  '2024-03-15', 'Equipe de Som', 'ATIVO'
)
on conflict (id) do nothing;

-- Seed de desenvolvimento: 1 usuário admin com papel PATRIMONIAL (RF-032) para
-- os probes live da matriz de permissões (escritor do ramo `escrever` do
-- patrimonio):
--   patrimonial.teste@ivc.local -> role PATRIMONIAL (escreve patrimonio)
-- Mesmo padrão idempotente do 0007/0009; sem `force_password_change` no
-- app_metadata (claims.ts:47 lê `=== true` → false), probes não param em
-- /trocar-senha.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-000000000007',
  'authenticated', 'authenticated',
  'patrimonial.teste@ivc.local',
  crypt('senha-teste', gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', 'PATRIMONIAL'),
  '{}'::jsonb,
  now(), now(),
  '', '', '', ''
)
on conflict (id) do nothing;