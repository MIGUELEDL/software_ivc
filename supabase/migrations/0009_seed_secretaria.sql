-- 0009_seed_secretaria.sql
-- Seed de desenvolvimento: 1 usuário admin com papel SECRETARIA (RF-032/MATRIZ-14)
-- para os probes live da matriz de permissões (escritor de nível `escrever` —
-- ADMIN/hrrecisa a hierarquia administrar>escrever, então não discrimina o ramo
-- `escrever` do can()):
--   secretaria.teste@ivc.local -> role SECRETARIA (escreve membros/eventos)
-- Mesmo padrão idempotente do 0002/0007; sem `force_password_change`.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-000000000006',
  'authenticated', 'authenticated',
  'secretaria.teste@ivc.local',
  crypt('senha-teste', gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', 'SECRETARIA'),
  '{}'::jsonb,
  now(), now(),
  '', '', '', ''
)
on conflict (id) do nothing;