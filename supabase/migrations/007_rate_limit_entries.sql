-- Rate limiting table for distributed serverless rate limiting.
-- Replaces the in-memory store so limits persist across cold starts and instances.

CREATE TABLE IF NOT EXISTS rate_limit_entries (
  key      TEXT        PRIMARY KEY,
  count    INTEGER     NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_reset_at ON rate_limit_entries (reset_at);

-- Scheduled cleanup: delete expired entries.
-- Run this periodically (e.g. via pg_cron or a Supabase scheduled function):
--   DELETE FROM rate_limit_entries WHERE reset_at < NOW();
