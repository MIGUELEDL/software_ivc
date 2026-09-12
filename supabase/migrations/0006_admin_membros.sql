-- 0006_admin_membros.sql
-- Admin membros (RF-022): members ganha status + endereço; tabela
-- member_documents (metadados P2); função auth_role() e políticas RLS admin.
-- Sem alteração nas policies existentes de 0001 (members_*_own,
-- event_notices_select_visible) — políticas novas são aditivas.

-- members: ciclo de vida (ATIVO/INATIVO/TRANSFERIDO) + endereço opcional.
alter table public.members
  add column if not exists status text not null default 'ATIVO'
    check (status in ('ATIVO','INATIVO','TRANSFERIDO')),
  add column if not exists logradouro text,
  add column if not exists numero text,
  add column if not exists bairro text,
  add column if not exists cidade text,
  add column if not exists uf text check (uf is null or char_length(uf) = 2),
  add column if not exists cep text;

-- Metadados de documentos do membro (P2 desta feature; upload em iteração futura).
create table if not exists public.member_documents (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.members(id) on delete cascade,
  tipo       text not null check (tipo in ('RG','CPF','comprovante_endereco','outro')),
  descricao  text,
  criado_em  timestamptz not null default now()
);

comment on table public.member_documents is 'Metadados de documentos entregues pelo membro (RG/CPF/comprovante/outro)';

alter table public.member_documents enable row level security;

-- Índice para a listagem por membro (criado_em desc — ADMINMEM-30).
create index if not exists member_documents_member_criado_idx
  on public.member_documents (member_id, criado_em desc);

-- Helper de papel para as policies admin: lê `app_metadata.role` do JWT
-- (AD-013: papel não-editável, decisão exclusiva no servidor). `security
-- definer` + `set search_path` seguem o padrão da RPC proxima_matricula (0005).
-- `auth.jwt()` é schema-qualified, então funciona com search_path = public.
create or replace function public.auth_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nullif(auth.jwt() -> 'app_metadata' ->> 'role',''),'')
$$;

-- EXECUTE limitada à role autenticada (as policies admin são `to authenticated`);
-- revoga do público como no 0005.
revoke all on function public.auth_role() from public;
grant execute on function public.auth_role() to authenticated;

-- members: leitura para todo papel admin; escrita (insert/update) para writers
-- (SECRETARIA/ADMIN/SUPER_ADMIN); delete só ADMIN/SUPER_ADMIN (hard-delete).
create policy "members_select_admin"
  on public.members for select to authenticated
  using (public.auth_role() in ('SECRETARIA','LIDER','FINANCEIRO','PATRIMONIAL','ADMIN','SUPER_ADMIN'));

create policy "members_insert_admin"
  on public.members for insert to authenticated
  with check (public.auth_role() in ('SECRETARIA','ADMIN','SUPER_ADMIN'));

create policy "members_update_admin"
  on public.members for update to authenticated
  using (public.auth_role() in ('SECRETARIA','ADMIN','SUPER_ADMIN'))
  with check (public.auth_role() in ('SECRETARIA','ADMIN','SUPER_ADMIN'));

create policy "members_delete_admin"
  on public.members for delete to authenticated
  using (public.auth_role() in ('ADMIN','SUPER_ADMIN'));

-- member_documents: leitura para todo papel admin; escrita/remoção writers.
create policy "docs_select_admin"
  on public.member_documents for select to authenticated
  using (public.auth_role() in ('SECRETARIA','LIDER','FINANCEIRO','PATRIMONIAL','ADMIN','SUPER_ADMIN'));

create policy "docs_insert_admin"
  on public.member_documents for insert to authenticated
  with check (public.auth_role() in ('SECRETARIA','ADMIN','SUPER_ADMIN'));

create policy "docs_delete_admin"
  on public.member_documents for delete to authenticated
  using (public.auth_role() in ('SECRETARIA','ADMIN','SUPER_ADMIN'));