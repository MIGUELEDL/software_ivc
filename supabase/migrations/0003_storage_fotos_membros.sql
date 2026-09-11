-- 0003_storage_fotos_membros.sql
-- Storage do painel-membro (RF-015): bucket público `fotos-membros` + RLS de
-- upload próprio (via path members/{memberId}/... ligado a members.auth_user_id).
-- Idempotente: replica o estado aplicado manualmente via MCP no projeto dev.

-- Bucket público com limite de 2MB e tipos permitidos (jpeg/png/webp).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos-membros',
  'fotos-membros',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public              = excluded.public,
    file_size_limit     = excluded.file_size_limit,
    allowed_mime_types  = excluded.allowed_mime_types;

-- Só o próprio membro pode subir foto no seu path.
-- Path: members/{memberId}/foto-4x4.{ext} — o 2º segmento do path casa com
-- members.id e auth_user_id com auth.uid().
drop policy if exists "fotos_membros_insert_own" on storage.objects;
create policy "fotos_membros_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'fotos-membros'
    and (storage.foldername(name))[1] = 'members'
    and exists (
      select 1
      from public.members m
      where m.id::text = (storage.foldername(objects.name))[2]
        and m.auth_user_id = auth.uid()
    )
  );

drop policy if exists "fotos_membros_update_own" on storage.objects;
create policy "fotos_membros_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'fotos-membros'
    and (storage.foldername(name))[1] = 'members'
    and exists (
      select 1
      from public.members m
      where m.id::text = (storage.foldername(objects.name))[2]
        and m.auth_user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'fotos-membros'
    and (storage.foldername(name))[1] = 'members'
    and exists (
      select 1
      from public.members m
      where m.id::text = (storage.foldername(objects.name))[2]
        and m.auth_user_id = auth.uid()
    )
  );