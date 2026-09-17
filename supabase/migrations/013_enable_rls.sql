-- Migration 013: Enable Row Level Security on all public tables.
--
-- This app uses the Postgres service role key server-side for all DB access.
-- The service role bypasses RLS automatically, so enabling RLS here has zero
-- effect on the application. It does however block anyone who tries to use the
-- public anon key to query the Supabase REST API directly.
--
-- No permissive policies are added — the default is DENY ALL for the anon role.

ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiatives         ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_entries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_articles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges          ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiatives_board   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_entries  ENABLE ROW LEVEL SECURITY;
