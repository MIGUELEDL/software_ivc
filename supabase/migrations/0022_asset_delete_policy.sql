-- Migration: Add DELETE policy for assets table (ADMIN/SUPER_ADMIN only)
-- Uses can_access('patrimonio', 'administrar') for hard-delete

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'assets_delete_admin' AND tablename = 'assets'
  ) THEN
    CREATE POLICY assets_delete_admin ON assets
      FOR DELETE
      TO authenticated
      USING (can_access('patrimonio', 'administrar'));
  END IF;
END
$$;
