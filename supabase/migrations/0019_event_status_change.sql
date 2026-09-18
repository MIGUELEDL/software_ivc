-- Migration: Change event status from ATIVO/INATIVO to EM ABERTO/CONCLUIDO
-- Idempotent: safe to re-run

-- 1. Drop old CHECK constraint first (so UPDATE can use new values)
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;

-- 2. Update existing data
UPDATE events SET status = 'EM ABERTO' WHERE status = 'ATIVO';
UPDATE events SET status = 'CONCLUIDO' WHERE status = 'INATIVO';

-- 3. Add new CHECK constraint
ALTER TABLE events ADD CONSTRAINT events_status_check CHECK (status in ('EM ABERTO', 'CONCLUIDO'));
