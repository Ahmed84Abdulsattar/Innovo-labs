-- 045: Harden assign_idea_ref() search_path (Supabase Security Advisor)
--
-- Migration 028 pinned search_path on update_updated_at() and assign_startup_id(),
-- but assign_idea_ref() was added later (039) and was missed — so the advisor
-- still flags it as "Function Search Path Mutable". Same fix: pin an empty
-- search_path and fully-qualify the sequence. Idempotent (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION public.assign_idea_ref()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.idea_ref IS NULL THEN
    NEW.idea_ref := 'IDEA-' || LPAD(nextval('public.idea_ref_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;
