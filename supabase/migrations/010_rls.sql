-- ============================================================
-- 010_rls.sql
-- Prototype placeholder.
--
-- The current prototype is intentionally usable without login and
-- without RLS or auth-based route guards. Keep this migration as a
-- no-op on the prototype branch so the schema chain remains runnable.
-- Replace it with a real policy set only when moving to an authenticated
-- build.
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'Prototype mode: skipping RLS setup in 010_rls.sql';
END;
$$;
