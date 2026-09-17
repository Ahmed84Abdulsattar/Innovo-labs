-- Migration 025: New framework fields from the Innovo Lab framework sheet
-- Visibility (Internal/Global) and Project Complexity (Simple/Challenging/
-- Complex) apply to both startups and initiatives.

ALTER TABLE startups    ADD COLUMN IF NOT EXISTS visibility          TEXT;
ALTER TABLE startups    ADD COLUMN IF NOT EXISTS project_complexity  TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS visibility          TEXT;
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS project_complexity  TEXT;
