-- 0004_seed_membro_sem_cadastro.sql
-- Seed de desenvolvimento: 2º usuário de teste SEM registro em `members`
-- (autocadastro pendente). Usado pelos probes para PAINEL-07 (redirect para
-- `/painel/perfil`) e PAINEL-16 (validação de perfil com dados inválidos).
-- Idempotente.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-000000000003',
  'authenticated', 'authenticated',
  'membro.semcadastro@ivc.local',
  crypt('senha-teste', gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', 'MEMBRO'),
  '{}'::jsonb,
  now(), now(),
  '', '', '', ''
)
on conflict (id) do nothing;

-- Nenhum insert em public.members: o usuário permanece SEM cadastro,
-- exatamente o estado que PAINEL-07/PAINEL-13 exigem.