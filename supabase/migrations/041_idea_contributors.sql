-- 041: Contributors on ideas
-- Mirrors initiatives.contributors — a JSONB array of {id,name,email,role}.
-- Super admins assign users as contributors to a specific idea.

ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS contributors JSONB NOT NULL DEFAULT '[]'::jsonb;
