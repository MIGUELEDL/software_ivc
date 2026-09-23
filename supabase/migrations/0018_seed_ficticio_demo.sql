-- 0018_seed_ficticio_demo.sql
-- Dados fictícios realistas para demonstração do painel admin.
-- Dados antigos de teste são preservados (não há DELETE neste script).
-- Nomes, CPFs e CNPJs são 100% fictícios.

-- ===================== MEMBROS (8 fictícios) =====================
-- Primeiro criamos os usuários auth para poder vincular os membros
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) VALUES
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'maria.santos@ivc.local', crypt('senha-teste', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"MEMBRO"}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'jose.oliveira@ivc.local', crypt('senha-teste', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"MEMBRO"}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'ana.ferreira@ivc.local', crypt('senha-teste', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"MEMBRO"}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'pedro.costa@ivc.local', crypt('senha-teste', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"MEMBRO"}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'luciana.araujo@ivc.local', crypt('senha-teste', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"MEMBRO"}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'francisco.sousa@ivc.local', crypt('senha-teste', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"MEMBRO"}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'rutebeatriz.nascimento@ivc.local', crypt('senha-teste', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"MEMBRO"}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'marcos.ribeiro@ivc.local', crypt('senha-teste', gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"MEMBRO"}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.members (auth_user_id, nome, nascimento, whatsapp, matricula, status, logradouro, numero, bairro, cidade, uf)
VALUES
  ('a1000000-0000-4000-8000-000000000001', 'Maria Silva Santos', '1985-03-15', '(83) 99876-5432', 'IVC-0002', 'ATIVO', 'Rua das Flores', '120', 'Centro', 'Santa Luzia', 'PB'),
  ('a1000000-0000-4000-8000-000000000002', 'José Carlos Oliveira', '1978-07-22', '(83) 99765-4321', 'IVC-0003', 'ATIVO', 'Av. Brasil', '455', 'Jardim Sergipe', 'Santa Luzia', 'PB'),
  ('a1000000-0000-4000-8000-000000000003', 'Ana Paula Ferreira', '1992-11-08', '(83) 99654-3210', 'IVC-0004', 'ATIVO', 'Rua São José', '78', 'Nossa Senhora de Fátima', 'Santa Luzia', 'PB'),
  ('a1000000-0000-4000-8000-000000000004', 'Pedro Henrique Costa', '1988-01-30', '(83) 99543-2109', 'IVC-0005', 'INATIVO', 'Rua do Sol', '312', 'Alto da Boa Vista', 'Santa Luzia', 'PB'),
  ('a1000000-0000-4000-8000-000000000005', 'Luciana Mendes Araújo', '1995-06-18', '(83) 99432-1098', 'IVC-0006', 'ATIVO', 'Travessa da Paz', '45', 'Santo Antônio', 'Santa Luzia', 'PB'),
  ('a1000000-0000-4000-8000-000000000006', 'Francisco Alves de Sousa', '1970-09-03', '(83) 99321-0987', 'IVC-0007', 'TRANSFERIDO', 'Rua Marechal Deodoro', '890', 'Centro', 'Santa Luzia', 'PB'),
  ('a1000000-0000-4000-8000-000000000007', 'Rutebeatriz Lima Nascimento', '2000-04-12', '(83) 99210-9876', 'IVC-0008', 'ATIVO', 'Av. Presidente Vargas', '234', 'Novo Horizonte', 'Santa Luzia', 'PB'),
  ('a1000000-0000-4000-8000-000000000008', 'Marcos Tavares Ribeiro', '1983-12-25', '(83) 99109-8765', 'IVC-0009', 'ATIVO', 'Rua XV de Novembro', '67', 'Vila Nova', 'Santa Luzia', 'PB')
ON CONFLICT (id) DO NOTHING;

-- ===================== EVENTOS (6 fictícios) =====================
INSERT INTO public.events (title, description, date, time, location, visivel, status)
VALUES
  ('Culto de Ação de Graças', 'Culto especial com ação de graças por mais um ano de ministério.', '2026-09-21', '19:00', 'Templo Principal IVC', true, 'ATIVO'),
  ('Encontro de Casais', 'Encontro para casais da igreja com workshops e dinâmicas.', '2026-10-05', '08:00', 'Salão de Eventos IVC', true, 'ATIVO'),
  ('Culto ao Ar Livre', 'Culto evangelístico ao ar livre na praça central.', '2026-10-12', '17:00', 'Praça da Matriz - Centro', true, 'ATIVO'),
  ('Retiro de Jovens', 'Retiro anual dos jovens da igreja.', '2026-11-15', '07:00', 'Sítio Recanto da Paz - Campina Grande', true, 'ATIVO'),
  ('Reunião de Oração', 'Reunião semanal de oração e intercessão.', '2026-09-18', '19:30', 'Templo Principal IVC', true, 'ATIVO'),
  ('Campanha de Batismos', 'Campanha evangelística com batismos nas águas.', '2026-09-07', '16:00', 'Piscina Comunitária', true, 'INATIVO')
ON CONFLICT DO NOTHING;

-- ===================== PATRIMÔNIO (7 itens) =====================
INSERT INTO public.assets (name, category, numero_patrimonio, location, acquisition_value, acquisition_date, responsible, status, observations)
VALUES
  ('Notebook Dell Inspiron 15', 'EQUIPAMENTO', 'PAT-001', 'Escritório Pastoral', 3200.00, '2025-01-15', 'Marcos Tavares', 'ATIVO', 'Usado para administracao da igreja'),
  ('Projetor Epson EB-X51', 'VIDEO', 'PAT-002', 'Templo Principal', 4500.00, '2025-03-20', 'José Carlos', 'ATIVO', 'Projetor para apresentacoes e cultos'),
  ('Mesa de Som Behringer X1222USB', 'AUDIO', 'PAT-003', 'Templo Principal', 2800.00, '2024-06-10', 'Marcos Tavares', 'ATIVO', 'Mesa de som 16 canais'),
  ('Teclado Yamaha PSR-E463', 'INSTRUMENTO', 'PAT-004', 'Salão de Ensaios', 1900.00, '2025-02-28', 'Luciana Araújo', 'ATIVO', 'Teclado para louvor e ensaios'),
  ('Ar Condicionado Split 60.000 BTUs', 'EQUIPAMENTO', 'PAT-005', 'Templo Principal', 5200.00, '2024-11-05', 'Pedro Costa', 'INATIVO', 'Desnecessário - manutenção pendente'),
  ('Cadeiras Empilháveis (50 un.)', 'MOBILIA', 'PAT-006', 'Salão de Eventos', 3750.00, '2025-04-12', 'José Carlos', 'ATIVO', 'Lote de 50 cadeiras plásticas brancas'),
  ('Bíblia Ampliada (Púlpito)', 'RELIGIOSO', 'PAT-007', 'Templo Principal', 280.00, '2023-08-01', 'Pastor Ernandes', 'ATIVO', 'Bíblia de estudo para pregação')
ON CONFLICT DO NOTHING;

-- ===================== FINANCEIRO (10 lançamentos) =====================
-- Receitas
INSERT INTO public.transactions (descricao, valor, tipo, metodo, status, categoria, data, observacoes)
VALUES
  ('Dízimo - Maria Santos', 350.00, 'RECEITA', 'PIX', 'CONCILIADO', 'Dízimos', '2026-09-01', 'Dízimo mensal'),
  ('Dízimo - José Oliveira', 500.00, 'RECEITA', 'PIX', 'CONCILIADO', 'Dízimos', '2026-09-03', 'Dízimo mensal'),
  ('Oferta Culto Domingo', 1200.00, 'RECEITA', 'DINHEIRO', 'CONCILIADO', 'Ofertas', '2026-09-07', 'Oferta do culto de domingo'),
  ('Doação - Empresa Construtora', 2000.00, 'RECEITA', 'TRANSFERENCIA', 'PENDENTE', 'Doações', '2026-09-10', 'Doação para reforma do templo'),
  ('Dízimo - Ana Ferreira', 280.00, 'RECEITA', 'PIX', 'CONCILIADO', 'Dízimos', '2026-09-12', 'Dízimo mensal'),
  ('Venda Livros Bíblicos', 150.00, 'RECEITA', 'DINHEIRO', 'PENDENTE', 'Vendas', '2026-09-14', 'Venda de material bíblico');

-- Despesas
INSERT INTO public.transactions (descricao, valor, tipo, metodo, status, categoria, data, observacoes)
VALUES
  ('Conta de Energia Elétrica', 420.00, 'DESPESA', 'PIX', 'CONCILIADO', 'Utilidades', '2026-09-05', 'Energia agosto/2026'),
  ('Manutenção Ar Condicionado', 350.00, 'DESPESA', 'DINHEIRO', 'PENDENTE', 'Manutenção', '2026-09-08', 'Limpeza e reparo do split'),
  ('Material de Limpeza', 85.00, 'DESPESA', 'DINHEIRO', 'CONCILIADO', 'Utilidades', '2026-09-10', 'Produtos de limpeza mensal'),
  ('Internet Fibra Óptica', 120.00, 'DESPESA', 'CARTAO', 'CONCILIADO', 'Utilidades', '2026-09-15', 'Internet 300 Mega');
