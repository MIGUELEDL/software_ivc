-- 0027_event_status_parity.sql
-- Paridade dev/prod do constraint de status de eventos. A migration 0019
-- (dev) mudou o enum para EM ABERTO/CONCLUIDO, mas nunca foi aplicada em
-- produção — lá o check antigo (ATIVO/INATIVO) rejeitava o INSERT do código
-- (status='EM ABERTO') com 500. Converte linhas existentes e recria o check.
UPDATE events SET status = 'EM ABERTO' WHERE status = 'ATIVO';
UPDATE events SET status = 'CONCLUIDO' WHERE status = 'INATIVO';

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE events ADD CONSTRAINT events_status_check
  CHECK (status IN ('EM ABERTO', 'CONCLUIDO'));
