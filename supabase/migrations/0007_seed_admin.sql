-- 0007_seed_admin.sql
-- Seed de desenvolvimento: 2 usuários admin sintéticos (RF-022/ADMINMEM-32..34)
-- para os probes live do admin-membros e testes manuais:
--   admin.teste@ivc.local  -> role ADMIN      (escritor + hard-delete)
--   leitor.teste@ivc.local -> role FINANCEIRO (leitor)
-- Nenhum com `force_password_change`: os probes não podem ser parados na
-- tela /trocar-senha. Padrão idempotente do 0002_seed_painel_membro.sql:8-25.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-000000000004',
  'authenticated', 'authenticated',
  'admin.teste@ivc.local',
  crypt('senha-teste', gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', 'ADMIN'),
  '{}'::jsonb,
  now(), now(),
  '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-000000000005',
  'authenticated', 'authenticated',
  'leitor.teste@ivc.local',
  crypt('senha-teste', gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', 'FINANCEIRO'),
  '{}'::jsonb,
  now(), now(),
  '', '', '', ''
)
on conflict (id) do nothing;