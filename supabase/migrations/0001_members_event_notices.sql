-- 0001_members_event_notices.sql
-- Painel membro: tabelas members e event_notices (RF-012, RF-013, RF-014, RF-015).

-- Sequência de matrículas (formato IVC-####).
create sequence if not exists members_matricula_seq start 1;

-- Membros: autocadastro e edição via painel; RLS por propriedade via auth.uid().
create table if not exists public.members (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid not null unique references auth.users(id) on delete cascade,
  nome          text not null check (char_length(trim(nome)) > 0),
  nascimento    date not null,
  whatsapp      text not null check (char_length(trim(whatsapp)) > 0),
  matricula     text not null unique,
  foto_url      text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.members is 'Membro do templo (autocadastro + edicao via painel)';
comment on column public.members.auth_user_id is 'Referencia ao usuario Supabase Auth (auth.users)';

-- Avisos de eventos exibidos no painel do membro (RF-012).
create table if not exists public.event_notices (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null check (char_length(trim(titulo)) > 0),
  data_hora  timestamptz not null,
  conteudo   text not null,
  visivel    boolean not null default true,
  criado_em  timestamptz not null default now()
);

comment on table public.event_notices is 'Avisos/eventos exibidos no painel do membro';

-- Índices de consulta (uniques de auth_user_id e matricula já criam índice próprio).
create index if not exists event_notices_visivel_data_hora_idx
  on public.event_notices (visivel, data_hora desc);

-- RLS habilitado nas duas tabelas.
alter table public.members enable row level security;
alter table public.event_notices enable row level security;

-- members: o proprietário (auth.uid()) lê, cria e atualiza apenas o próprio registro.
create policy "members_select_own"
  on public.members for select to authenticated
  using (auth.uid() = auth_user_id);

create policy "members_insert_own"
  on public.members for insert to authenticated
  with check (auth.uid() = auth_user_id);

create policy "members_update_own"
  on public.members for update to authenticated
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

-- event_notices: leitura apenas de avisos visíveis; escrita via service-role
-- (policy de escrita entra com a gestão admin de avisos, RF-024).
create policy "event_notices_select_visible"
  on public.event_notices for select to authenticated
  using (visivel = true);