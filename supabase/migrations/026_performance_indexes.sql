-- Migration 026: Performance indexes for the actual query patterns.
--
-- Cross-referencing the route handlers against the existing indexes revealed
-- several hot-path queries doing sequential scans / full sorts:
--
--   * startups list filters on business_units / departments (TEXT[]) via
--     containment — no GIN index existed, so every filtered list was a seq scan.
--   * startups + initiatives lists ORDER BY created_at DESC — no index, so the
--     planner sorted the whole table on every page load.
--   * startups create de-dupes with LOWER(company) — no expression index.
--   * initiatives + users search with ILIKE '%q%' — leading-wildcard LIKE can't
--     use a btree index; needs pg_trgm.
--   * notifications (every app boot) + audit log ORDER BY created_at DESC on
--     audit_entries — no index, and that table grows on every mutation.
--
-- All indexes use IF NOT EXISTS so this migration is safe to re-run.
--
-- NOTE: these run inside the migration runner's transaction, which means a
-- brief write lock while each index builds. That is fine at the current data
-- size. If any of these tables is already large in production, create that
-- index manually with CREATE INDEX CONCURRENTLY (which cannot run inside a
-- transaction) instead of relying on this migration for it.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── startups ─────────────────────────────────────────────────────────────────
-- Array membership filters: `business_units @> ARRAY[$1]` / `departments @> …`.
CREATE INDEX IF NOT EXISTS idx_startups_business_units
  ON startups USING GIN (business_units);
CREATE INDEX IF NOT EXISTS idx_startups_departments
  ON startups USING GIN (departments);

-- Default list ordering.
CREATE INDEX IF NOT EXISTS idx_startups_created_at
  ON startups (created_at DESC);

-- Case-insensitive uniqueness check on create (WHERE LOWER(company)=LOWER($1)).
CREATE INDEX IF NOT EXISTS idx_startups_lower_company
  ON startups (LOWER(company));

-- ── initiatives ──────────────────────────────────────────────────────────────
-- Default list ordering.
CREATE INDEX IF NOT EXISTS idx_initiatives_created_at
  ON initiatives (created_at DESC);

-- ILIKE '%q%' search across name / description / initiative_id.
CREATE INDEX IF NOT EXISTS idx_initiatives_name_trgm
  ON initiatives USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_initiatives_description_trgm
  ON initiatives USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_initiatives_initiative_id_trgm
  ON initiatives USING GIN (initiative_id gin_trgm_ops);

-- ── audit_entries (powers notifications + audit log) ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_created_at
  ON audit_entries (created_at DESC);

-- ── users (admin search) ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_name_trgm
  ON users USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_email_trgm
  ON users USING GIN (email gin_trgm_ops);

-- ── ideas (per-user listing, newest first) ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ideas_submitted_created
  ON ideas (submitted_by, created_at DESC);

-- ── news / collaborations (list ordering) ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_news_published_at
  ON news_articles (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_collaborations_created_at
  ON collaborations (created_at DESC);
