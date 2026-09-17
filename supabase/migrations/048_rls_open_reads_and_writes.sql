-- 048: RLS — complete read coverage + first write policies (ideas, users)
-- ============================================================================
-- (a) Open tables get an explicit SELECT policy (USING true) so every table
--     carries a policy. These reads are open to all authenticated staff by
--     design, so the policy documents that rather than restricting anything.
-- (b) Write policies (INSERT/UPDATE/DELETE) for the two sensitive, NON-scoped
--     tables — ideas and users — mirroring the app rules. This is the first
--     write-protection slice; content tables + startups (scope) follow.
--
-- ⚠ RLS_ENFORCED is live, so TEST each write after applying (see docs/RLS.md):
--   submit an idea, review an idea, delete an idea, change a user's role — as
--   the relevant roles. If any write fails, unset RLS_ENFORCED (global rollback).
-- ============================================================================

-- ── (a) Open-table read policies ─────────────────────────────────────────────
GRANT SELECT ON startups, challenges, news_articles, collaborations,
                comments, user_ratings, timeline_events TO app_rls;

DROP POLICY IF EXISTS rls_startups_select       ON startups;
CREATE POLICY rls_startups_select       ON startups       FOR SELECT USING (true);
DROP POLICY IF EXISTS rls_challenges_select     ON challenges;
CREATE POLICY rls_challenges_select     ON challenges     FOR SELECT USING (true);
DROP POLICY IF EXISTS rls_news_select           ON news_articles;
CREATE POLICY rls_news_select           ON news_articles  FOR SELECT USING (true);
DROP POLICY IF EXISTS rls_collabs_select        ON collaborations;
CREATE POLICY rls_collabs_select        ON collaborations FOR SELECT USING (true);
DROP POLICY IF EXISTS rls_comments_select       ON comments;
CREATE POLICY rls_comments_select       ON comments       FOR SELECT USING (true);
DROP POLICY IF EXISTS rls_ratings_select        ON user_ratings;
CREATE POLICY rls_ratings_select        ON user_ratings   FOR SELECT USING (true);
DROP POLICY IF EXISTS rls_timeline_select       ON timeline_events;
CREATE POLICY rls_timeline_select       ON timeline_events FOR SELECT USING (true);

-- ── (b) ideas — write policies (mirror the app) ──────────────────────────────
GRANT INSERT, UPDATE, DELETE ON ideas TO app_rls;
GRANT USAGE ON SEQUENCE idea_ref_seq TO app_rls;   -- for the assign_idea_ref trigger

-- INSERT: any authenticated user, but only as themselves.
DROP POLICY IF EXISTS rls_ideas_insert ON ideas;
CREATE POLICY rls_ideas_insert ON ideas
  FOR INSERT
  WITH CHECK (submitted_by = nullif(current_setting('app.user_id', true), '')::uuid);

-- UPDATE (review): admins, or a user assigned to this idea as a contributor.
DROP POLICY IF EXISTS rls_ideas_update ON ideas;
CREATE POLICY rls_ideas_update ON ideas
  FOR UPDATE
  USING (
    current_setting('app.user_role', true) IN ('innovation_admin', 'super_admin')
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(contributors) AS c
      WHERE c->>'id' = current_setting('app.user_id', true)
    )
  );

-- DELETE: the submitter or an admin.
DROP POLICY IF EXISTS rls_ideas_delete ON ideas;
CREATE POLICY rls_ideas_delete ON ideas
  FOR DELETE
  USING (
    submitted_by = nullif(current_setting('app.user_id', true), '')::uuid
    OR current_setting('app.user_role', true) IN ('innovation_admin', 'super_admin')
  );

-- ── (b) users — write policy (mirror the app) ────────────────────────────────
-- Only super admins may change a user (role/department). Other user writes
-- (last_login, email_verified, notifications_read_at) run on the privileged
-- path and bypass RLS, so they are unaffected.
GRANT UPDATE ON users TO app_rls;
DROP POLICY IF EXISTS rls_users_update ON users;
CREATE POLICY rls_users_update ON users
  FOR UPDATE
  USING      (current_setting('app.user_role', true) = 'super_admin')
  WITH CHECK (current_setting('app.user_role', true) = 'super_admin');
