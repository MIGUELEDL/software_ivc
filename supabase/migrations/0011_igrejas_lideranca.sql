-- 0011_igrejas_lideranca.sql
-- RF-023 (Igrejas/Liderança), módulo `igrejas` da matriz de permissões (0008).
-- Tabelas `churches` (Full CRUD, delete só SUPER_ADMIN) e `leaders` (soft-delete
-- por status, sem DELETE direto), RLS via `can_access('igrejas', ...)` +
-- `auth_role()='SUPER_ADMIN'` para exclusão de igreja, storage `fotos-lideranca`
-- e seeds (igreja IVC + Pastor Ernandes + usuário superadmin.teste).
-- Idempotente: re-aplicável sem duplicar (on conflict do nothing).

-- ---------------------------------------------------------------- churches --
create table if not exists public.churches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text not null,
  cnpj text not null,
  address text not null,
  city text not null,
  founded_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.churches enable row level security;

drop policy if exists "churches_select_public" on public.churches;
create policy "churches_select_public"
  on public.churches
  for select
  to anon, authenticated
  using (true);

drop policy if exists "churches_insert_admin" on public.churches;
create policy "churches_insert_admin"
  on public.churches
  for insert
  to authenticated
  with check (public.can_access('igrejas', 'escrever'));

drop policy if exists "churches_update_admin" on public.churches;
create policy "churches_update_admin"
  on public.churches
  for update
  to authenticated
  using (public.can_access('igrejas', 'escrever'))
  with check (public.can_access('igrejas', 'escrever'));

drop policy if exists "churches_delete_super_admin" on public.churches;
create policy "churches_delete_super_admin"
  on public.churches
  for delete
  to authenticated
  using (public.auth_role() = 'SUPER_ADMIN');

-- ---------------------------------------------------------------- leaders --
create table if not exists public.leaders (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  name text not null,
  role text not null,
  photo_url text,
  "order" int not null default 0,
  status text not null default 'ATIVO'
    check (status in ('ATIVO', 'INATIVO')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leaders enable row level security;

drop policy if exists "leaders_select_public" on public.leaders;
create policy "leaders_select_public"
  on public.leaders
  for select
  to anon, authenticated
  using (true);

drop policy if exists "leaders_insert_admin" on public.leaders;
create policy "leaders_insert_admin"
  on public.leaders
  for insert
  to authenticated
  with check (public.can_access('igrejas', 'escrever'));

drop policy if exists "leaders_update_admin" on public.leaders;
create policy "leaders_update_admin"
  on public.leaders
  for update
  to authenticated
  using (public.can_access('igrejas', 'escrever'))
  with check (public.can_access('igrejas', 'escrever'));

-- Sem policy de DELETE em `leaders`: soft-delete por status (IGR-15); a única
-- remoção física é a cascata via `churches` (integridade referencial, imune a RLS).

-- ------------------------------------------------------- storage fotos -----
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos-lideranca',
  'fotos-lideranca',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public             = excluded.public,
    file_size_limit    = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Upload/overwrite de foto de líder: qualquer papel com escrita em `igrejas`.
drop policy if exists "lideranca_fotos_insert_admin" on storage.objects;
create policy "lideranca_fotos_insert_admin"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'fotos-lideranca'
    and public.can_access('igrejas', 'escrever')
  );

drop policy if exists "lideranca_fotos_update_admin" on storage.objects;
create policy "lideranca_fotos_update_admin"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'fotos-lideranca'
    and public.can_access('igrejas', 'escrever')
  )
  with check (
    bucket_id = 'fotos-lideranca'
    and public.can_access('igrejas', 'escrever')
  );

-- -------------------------------------------------------------- seeds -------
-- Usuário de desenvolvimento superadmin.teste (papel SUPER_ADMIN) para os
-- probes do ramo `administrar`/DELETE de igreja (padrão 0007/0009).
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-00000000000c',
  'authenticated', 'authenticated',
  'superadmin.teste@ivc.local',
  crypt('senha-teste', gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', 'SUPER_ADMIN'),
  '{}'::jsonb,
  now(), now(),
  '', '', '', ''
)
on conflict (id) do nothing;

-- Igreja atual (Igreja Virtude Cristã) — Full CRUD idempotente.
insert into public.churches (id, name, short_name, cnpj, address, city, founded_date)
values (
  '00000000-0000-4000-8000-00000000000d',
  'Igreja Virtude Cristã',
  'IVC',
  '68683917000171',
  'Rua Quiezinho Fernandes, 213 - Nossa Senhora de Fátima, Santa Luzia - PB',
  'Santa Luzia - PB',
  '2025-09-07'
)
on conflict (id) do nothing;

-- Líder atual (Pastor Ernandes), vinculado à igreja IVC, visível no portal.
insert into public.leaders (id, church_id, name, role, "order", status)
values (
  '00000000-0000-4000-8000-00000000000e',
  '00000000-0000-4000-8000-00000000000d',
  'Pastor Ernandes Nogueira de Lucena',
  'Pastor Presidente',
  0,
  'ATIVO'
)
on conflict (id) do nothing;