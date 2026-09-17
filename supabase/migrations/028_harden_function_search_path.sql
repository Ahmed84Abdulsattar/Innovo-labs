-- Migration 028: Harden trigger functions flagged by Supabase's Security Advisor
-- ("Function Search Path Mutable").
--
-- A function without a pinned search_path resolves unqualified names through the
-- caller's search_path, which (for SECURITY DEFINER functions especially) can be
-- redirected to attacker-controlled objects. Both functions below are
-- SECURITY INVOKER and trivial, so the real risk is low — but pinning an explicit
-- search_path is the recommended hardening and clears the advisor warnings.
--
-- Idempotent: ALTER / CREATE OR REPLACE are safe to re-run.

-- update_updated_at() only calls NOW() (pg_catalog, always resolvable), so an
-- empty search_path is safe and nothing needs qualifying.
ALTER FUNCTION public.update_updated_at() SET search_path = '';

-- assign_startup_id() references the sequence by name, so qualify it as
-- public.startup_id_seq and pin the path. LPAD / nextval / ::text live in
-- pg_catalog and resolve regardless of search_path.
CREATE OR REPLACE FUNCTION public.assign_startup_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.startup_id IS NULL THEN
    NEW.startup_id := 'STU-' || LPAD(nextval('public.startup_id_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;
