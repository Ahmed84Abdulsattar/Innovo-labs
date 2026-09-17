-- Migration 027: Fix broken collaboration UPDATEs.
--
-- The trg_collaborations_updated trigger (declared in migration 009) runs
-- update_updated_at(), which does `NEW.updated_at = NOW()`. The live
-- collaborations table never had an updated_at column, so the trigger raised
--   ERROR: record "new" has no field "updated_at"
-- on every UPDATE — meaning collaboration edits failed in production.
--
-- Add the column the trigger has always expected. Idempotent.

ALTER TABLE collaborations
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
