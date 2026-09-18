-- Migration: Add RG, CPF, baptism date, and card validity columns to members
-- Idempotent: safe to re-run

ALTER TABLE members ADD COLUMN IF NOT EXISTS rg TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS data_batismo DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS validade_cartao DATE;
