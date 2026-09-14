-- reset-probe-residue.sql
-- Idempotente: limpa registros deixados por probes entre sessoes/rodadas.
-- Uso: psql $DATABASE_URL -f scripts/reset-probe-residue.sql
-- Nao toca em seeds oficiais (0001..0010) -- so emails de teste.

-- 1) members row do membro.semcadastro@ivc.local (painel probe happy-path)
delete from public.members
where auth_user_id = (
  select id from auth.users where email = 'membro.semcadastro@ivc.local'
);

-- 2) auth user do membro.semcadastro@ivc.local
delete from auth.users
where email = 'membro.semcadastro@ivc.local';

-- 3) auth users residuais de runs abortadas dos probes (emails @teste.com, exceto seeds oficiais)
delete from auth.users
where email like '%@teste.com'
  and email not in ('admin.teste@ivc.local', 'leitor.teste@ivc.local', 'secretaria.teste@ivc.local', 'membro.teste@ivc.local')
  and email not like 'membro.semcadastro@ivc.local';
