-- 0025_settings_proposito.sql
-- Renomeia a chave `church.mission` para `church.proposito` (landing adotou
-- "Proposito" no lugar de "Missao"). Preserva o valor existente (segunda
-- execucao e no-op: nenhuma linha mais casa o WHERE).
UPDATE settings
SET key = 'church.proposito',
    updated_at = now()
WHERE key = 'church.mission';
