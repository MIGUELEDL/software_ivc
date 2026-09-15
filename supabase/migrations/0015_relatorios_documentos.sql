-- 0015_relatorios_documentos.sql
-- RF-027 (Relatórios/Documentos): tabela `public.documents` com RLS via
-- `can_access('relatorios', ...)` — SELECT somente `authenticated` com
-- `can_access('relatorios','ler')` — SEM role `anon`; escrita (INSERT/UPDATE/
-- DELETE) com `can_access('relatorios','escrever')` (matriz 0008: FINANCEIRO
-- escreve; SECRETARIA/PATRIMONIAL/LIDER lêem; ADMIN/SUPER_ADMIN administram).
-- Bucket de storage PRIVADO `documentos` (10MB, whitelist de mime) para
-- arquivos restritos a papéis com permissão (SECURITY.md), com policy SELECT
-- p/ `autenticados com can_access('relatorios','ler')` (necessária para
-- signed URL/upload — lição do bug da foto de liderança, commit `2737ca0`).

-- ============================================================ tabela =======

create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(trim(title)) > 0),
  description text,
  category    text not null check (category in
                ('FINANCEIRO','MEMBROS','EVENTOS','PATRIMONIO','IGREJAS','GERAL')),
  file_path   text not null unique,
  file_name   text not null,
  mime_type   text not null,
  file_size   integer not null check (file_size >= 0),
  uploaded_by uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

comment on table public.documents is 'Documentos do painel admin (RF-027): metadados de arquivos subidos, categorizados por módulo';
comment on column public.documents.category is 'Categoria por módulo (enum fixo — relatorios-constants.ts + CHECK); filtro da listagem';
comment on column public.documents.file_path is 'Path no bucket privado `documentos` (sempre `documentos/{uuid}.{ext}` — nunca o nome do usuário)';
comment on column public.documents.uploaded_by is 'Autor (auditoria RN-004)';

-- ============================================================ índices ======

create index if not exists idx_documents_category
  on public.documents (category);

create index if not exists idx_documents_created_at
  on public.documents (created_at desc);

-- ============================================================ RLS ==========

alter table public.documents enable row level security;

-- Leitura: qualquer papel com `ler` no módulo relatorios (SECRETARIA,
-- PATRIMONIAL, LIDER, FINANCEIRO administram/escrevem que concedem ler).
drop policy if exists "documents_select_admin" on public.documents;
create policy "documents_select_admin"
  on public.documents for select to authenticated
  using (public.can_access('relatorios', 'ler'));

-- Escrita (upload/update/delete): papel com `escrever` no módulo relatorios
-- (FINANCEIRO/ADMIN/SUPER_ADMIN). Sem menção a roles — decisão via matriz
-- (AD-015, lição L-006).
drop policy if exists "documents_insert_admin" on public.documents;
create policy "documents_insert_admin"
  on public.documents for insert to authenticated
  with check (public.can_access('relatorios', 'escrever'));

drop policy if exists "documents_update_admin" on public.documents;
create policy "documents_update_admin"
  on public.documents for update to authenticated
  using (public.can_access('relatorios', 'escrever'))
  with check (public.can_access('relatorios', 'escrever'));

drop policy if exists "documents_delete_admin" on public.documents;
create policy "documents_delete_admin"
  on public.documents for delete to authenticated
  using (public.can_access('relatorios', 'escrever'));

-- ====================================================== storage bucket =====
-- Bucket PRIVADO (`public=false`): download só via signed URL de 60s, pela
-- rota autenticada `/api/admin/relatorios/documentos/[id]/download` (REL-14).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos',
  'documentos',
  false,
  10485760,
  array[
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.text'
  ]
)
on conflict (id) do update
set public             = excluded.public,
    file_size_limit    = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Upload/overwrite de documento: papel com escrita em `relatorios`.
drop policy if exists "documentos_fotos_insert_admin" on storage.objects;
create policy "documentos_fotos_insert_admin"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'documentos'
    and public.can_access('relatorios', 'escrever')
  );

drop policy if exists "documentos_fotos_update_admin" on storage.objects;
create policy "documentos_fotos_update_admin"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'documentos'
    and public.can_access('relatorios', 'escrever')
  )
  with check (
    bucket_id = 'documentos'
    and public.can_access('relatorios', 'escrever')
  );

drop policy if exists "documentos_delete_admin" on storage.objects;
create policy "documentos_delete_admin"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'documentos'
    and public.can_access('relatorios', 'escrever')
  );

-- SELECT de objetos requerido pelas operações de storage (signed URL, upload/
-- upsert — o motor consulta a existência do objeto; lição do bug da foto de
-- liderança). Restrita a `ler` no módulo relatorios — NUNCA `anon`.
drop policy if exists "documentos_select_admin" on storage.objects;
create policy "documentos_select_admin"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'documentos'
    and public.can_access('relatorios', 'ler')
  );