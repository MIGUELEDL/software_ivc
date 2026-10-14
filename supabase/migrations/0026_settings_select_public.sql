-- 0026_settings_select_public.sql
-- Portal público lê `settings` sem sessão (landing reflete o admin): leitura
-- liberada a anon + authenticated. Escrita segue só `configuracoes:administrar`
-- (policy settings_admin, 0016). Dado já público (WhatsApp/PIX no portal).
CREATE POLICY settings_select_public ON settings
  FOR SELECT TO anon, authenticated
  USING (true);
