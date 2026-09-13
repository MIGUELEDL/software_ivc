-- 0010_seed_membro.sql
-- Re-seed de desenvolvimento do membro sintético membro.teste@ivc.local
-- (idempotente, on conflict do nothing). O seed original 0002 foi removido do
-- projeto dev (drift — hard-delete manual/regressões); o probes-admin-membros
-- (RF-032) e o probes-painel (PANO) dependem DELE para os testes de sessão
-- MEMBRO. Restaura também a linha `members` (IVC-0001): sem ela, o proxy do
-- painel desvia /painel → /painel/perfil?primeiro=1 (membro sem cadastro).
-- Sem `force_password_change` (probes não podem parar em /trocar-senha).
-- Mesma coluna/shape do 0002.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated',
  'membro.teste@ivc.local',
  crypt('senha-teste', gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', 'MEMBRO'),
  '{}'::jsonb,
  now(), now(),
  '', '', '', ''
)
on conflict (id) do nothing;

-- Linha members do membro de teste (IVC-0001) — sem cadastro preenchido.
insert into public.members (id, auth_user_id, nome, nascimento, whatsapp, matricula, foto_url)
values (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'Membro Teste',
  '1990-01-15',
  '(83) 99999-0000',
  'IVC-0001',
  null
)
on conflict (id) do nothing;

-- Sincroniza a sequência com a matrícula semeada (IVC-0001).
select setval('members_matricula_seq', 1, true);