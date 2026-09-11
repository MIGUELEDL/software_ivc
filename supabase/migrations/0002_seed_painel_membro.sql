-- 0002_seed_painel_membro.sql
-- Seed de desenvolvimento (projeto [REDACTED_PROJECT_NAME]): 1 membro de teste + 2 avisos.
-- DML aplicado via MCP (supabase_execute_sql) no projeto dev; idempotente.

-- Usuário de teste sintético (determinístico; substituído por usuário real
-- quando a service-role estiver disponível). Necessário para a FK
-- members.auth_user_id -> auth.users(id).
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

-- Membro de teste (auth_user_id do usuário sintético acima).
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

-- Avisos: um passado e um futuro, ambos visíveis.
insert into public.event_notices (id, titulo, data_hora, conteudo, visivel)
values (
  '00000000-0000-4000-8000-000000000010',
  'Culto de Gratidão',
  '2026-09-05 19:00:00-03',
  'Culto de gratidão pelos 1 ano de fundação da igreja.',
  true
),
(
  '00000000-0000-4000-8000-000000000011',
  'Campanha de Missões',
  '2026-10-02 19:00:00-03',
  'Início da campanha missionária anual com encontro de intercessão.',
  true
)
on conflict (id) do nothing;