-- 0012_events.sql
-- RF-024 (Eventos), módulo `eventos` da matriz de permissões (0008).
-- Tabela `events` com RLS via `can_access('eventos', ...)`: SELECT público
-- (anon + authenticated), escrita somente com `can_access('eventos','escrever')`
-- e NENHUMA policy de DELETE (soft-delete por `status`, EVT-03/10/11).
-- Seed idempotente: evento "Clamor 12h" (âncora da home).
-- Sem storage: eventos não têm foto (decisão do usuário — campos mínimos).

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  date date not null,
  time text not null,
  location text not null,
  visivel boolean not null default true,
  status text not null default 'ATIVO'
    check (status in ('ATIVO', 'INATIVO')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events enable row level security;

drop policy if exists "events_select_public" on public.events;
create policy "events_select_public"
  on public.events
  for select
  to anon, authenticated
  using (true);

drop policy if exists "events_insert_admin" on public.events;
create policy "events_insert_admin"
  on public.events
  for insert
  to authenticated
  with check (public.can_access('eventos', 'escrever'));

drop policy if exists "events_update_admin" on public.events;
create policy "events_update_admin"
  on public.events
  for update
  to authenticated
  using (public.can_access('eventos', 'escrever'))
  with check (public.can_access('eventos', 'escrever'));

-- Sem policy de DELETE em `events`: soft-delete por `status='INATIVO'`
-- (EVT-03/10/11) — histórico institucional preservado, mesmo padrão de
-- `leaders` (RF-023).

-- -------------------------------------------------------------- seeds -------
-- Evento âncora "Clamor 12h" (também na home), visível no portal por padrão.
insert into public.events (
  id, title, description, date, time, location, visivel, status
) values (
  '00000000-0000-4000-8000-00000000000f',
  'Clamor 12h',
  'Momento de oração e clamor reunindo a igreja ao meio-dia.',
  '2026-10-01',
  '12:00',
  'Santa Luzia - PB',
  true,
  'ATIVO'
)
on conflict (id) do nothing;