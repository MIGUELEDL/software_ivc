-- 0016_settings.sql
-- Tabela de configuracoes do sistema (RF-029)

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE settings IS 'Configuracoes globais do sistema (chave-valor JSONB)';
COMMENT ON COLUMN settings.key IS 'Chave da configuracao (ex: church.name, whatsapp.number)';
COMMENT ON COLUMN settings.value IS 'Valor JSON da configuracao';

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- SELECT: todos os authenticated podem ler
CREATE POLICY settings_select ON settings
  FOR SELECT TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: apenas quem tem configuracoes:administrar
CREATE POLICY settings_admin ON settings
  FOR ALL TO authenticated
  USING (can_access('configuracoes', 'administrar'))
  WITH CHECK (can_access('configuracoes', 'administrar'));

-- Seed idempotente: configuracoes padrao derivadas de constants.ts
INSERT INTO settings (key, value) VALUES
  ('church.name', '"Igreja Virtude Crista"'),
  ('church.shortName', '"IVC"'),
  ('church.slogan', '"Proclamando o evangelho de Cristo com fe e amor, e ensinando a Palavra que transforma vidas."'),
  ('church.foundedDate', '"07/09/2025"'),
  ('church.cnpj', '"68.683.917/0001-71"'),
  ('church.address', '"Rua Quiezinho Fernandes, 213 - Nossa Senhora de Fatima, Santa Luzia - PB"'),
  ('church.city', '"Santa Luzia - PB"'),
  ('church.leader', '"Pastor Ernandes Nogueira de Lucena"'),
  ('church.about', '"Fundada com o proposito de levar a mensagem de esperanca e salvacao a todos os coracoes, a Igreja Virtude Crista nasceu do mover de Deus no coracao de seus lideres e membros."'),
  ('church.mission', '"Proclamar o evangelho de Cristo a toda criatura com fe e ousadia."'),
  ('church.vision', '"Ser uma igreja que transforma vidas atraves do poder da Palavra e do amor de Deus."'),
  ('church.values', '[{"title":"Proclamar","description":"Levar o evangelho a toda criatura com fe e ousadia.","color":"primary"},{"title":"Ensinar","description":"Fundamentar vidas na Palavra que transforma e edifica.","color":"accent"},{"title":"Transformar","description":"Ver vidas restauradas pelo poder do Espirito Santo.","color":"dark"}]'),
  ('whatsapp.number', '"83999450781"'),
  ('whatsapp.display', '"(83) 99945-0781"'),
  ('pix.key', '"68683917000171"'),
  ('schedule.items', '[{"day":"TER","time":"19:30","title":"Oracao e Ensino"},{"day":"QUI","time":"19:30","title":"Evangelismo"},{"day":"DOM","time":"19:00","title":"Culto"}]'),
  ('social.instagram', '"https://instagram.com/igrejavirtudecrista"'),
  ('social.youtube', '"https://www.youtube.com/@IgrejaVirtudeCrista"')
ON CONFLICT (key) DO NOTHING;
