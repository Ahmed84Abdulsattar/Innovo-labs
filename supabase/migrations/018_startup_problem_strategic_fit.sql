-- Migration 018: Add problem_statement and strategic_fit to initiatives.
-- Removes nothing from the DB (old columns kept for safety / existing data),
-- but the app no longer writes or reads founder, founded_year, hq_country,
-- funding_received, and innovo_engagement_type.

ALTER TABLE initiatives
  ADD COLUMN IF NOT EXISTS problem_statement TEXT,
  ADD COLUMN IF NOT EXISTS strategic_fit     TEXT;
  