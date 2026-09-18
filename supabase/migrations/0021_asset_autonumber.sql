-- Migration: Create RPC proximo_patrimonio() for sequential PAT-NNNN numbering
-- Follows same pattern as proxima_matricula() (0005)

-- Sequence for asset patrimony numbers
CREATE SEQUENCE IF NOT EXISTS public.assets_patrimonio_seq;

-- RPC: generates next PAT-XXXX number
CREATE OR REPLACE FUNCTION public.proximo_patrimonio()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'PAT-' || lpad(nextval('public.assets_patrimonio_seq')::text, 4, '0');
$$;

-- Grant execute to authenticated role
REVOKE ALL ON FUNCTION public.proximo_patrimonio() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.proximo_patrimonio() TO authenticated;

-- Sync sequence with existing data (find max PAT-XXXX from assets table)
DO $$
  DECLARE
    max_num INTEGER;
  BEGIN
    SELECT COALESCE(
      MAX(CAST(SUBSTRING(numero_patrimonio FROM 5) AS INTEGER)),
      0
    ) INTO max_num
    FROM assets
    WHERE numero_patrimonio LIKE 'PAT-%';

    PERFORM setval('public.assets_patrimonio_seq', GREATEST(max_num, 0), true);
  END
$$;
