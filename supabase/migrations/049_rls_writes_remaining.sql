-- 049: RLS write policies — remaining tables
-- ============================================================================
-- Completes DB-side write enforcement, each policy MIRRORING the app route rule.
-- Scope (startups / timeline) uses app.user_department, injected by queryAsUser.
--
--   content (challenges/news/collaborations) — writes: innovation_admin+
--   comments      — INSERT self · UPDATE author · DELETE author or super_admin
--   user_ratings  — INSERT/UPDATE self
--   timeline_events — INSERT: contributor+ in the startup's scope · DELETE: super_admin
--   startups      — INSERT: admin · UPDATE: super_admin / in-scope admin or contributor
--                   · DELETE: super_admin / in-scope admin
--
-- ⚠ RLS_ENFORCED is live — TEST each write after applying (see docs/RLS.md).
-- ============================================================================

-- Helper expressions (inlined): admin role, and startup business-unit scope.
--   admin:  current_setting('app.user_role', true) IN ('innovation_admin','super_admin')
--   scope:  department_id = current_setting('app.user_department', true)
--           OR current_setting('app.user_department', true) = ANY(business_units)

-- ── Content tables — writes are innovation_admin+ ────────────────────────────
GRANT INSERT, UPDATE, DELETE ON challenges, news_articles, collaborations TO app_rls;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['challenges','news_articles','collaborations'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS rls_%s_write ON %I', t, t);
    EXECUTE format($f$
      CREATE POLICY rls_%s_write ON %I
        FOR ALL
        USING      (current_setting('app.user_role', true) IN ('innovation_admin','super_admin'))
        WITH CHECK (current_setting('app.user_role', true) IN ('innovation_admin','super_admin'))
    $f$, t, t);
  END LOOP;
END $$;

-- ── comments ─────────────────────────────────────────────────────────────────
GRANT INSERT, UPDATE, DELETE ON comments TO app_rls;

DROP POLICY IF EXISTS rls_comments_insert ON comments;
CREATE POLICY rls_comments_insert ON comments
  FOR INSERT WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

DROP POLICY IF EXISTS rls_comments_update ON comments;      -- author only
CREATE POLICY rls_comments_update ON comments
  FOR UPDATE USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

DROP POLICY IF EXISTS rls_comments_delete ON comments;      -- author or super admin
CREATE POLICY rls_comments_delete ON comments
  FOR DELETE USING (
    user_id = nullif(current_setting('app.user_id', true), '')::uuid
    OR current_setting('app.user_role', true) = 'super_admin'
  );

-- ── user_ratings — a user manages only their own rating ──────────────────────
GRANT INSERT, UPDATE ON user_ratings TO app_rls;

DROP POLICY IF EXISTS rls_ratings_insert ON user_ratings;
CREATE POLICY rls_ratings_insert ON user_ratings
  FOR INSERT WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

DROP POLICY IF EXISTS rls_ratings_update ON user_ratings;
CREATE POLICY rls_ratings_update ON user_ratings
  FOR UPDATE
  USING      (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

-- ── timeline_events ──────────────────────────────────────────────────────────
GRANT INSERT, DELETE ON timeline_events TO app_rls;

-- INSERT: super_admin, or contributor/innovation_admin acting on a startup in
-- their scope. (The Onboarded/Rejected lock stays enforced in the app.)
DROP POLICY IF EXISTS rls_timeline_insert ON timeline_events;
CREATE POLICY rls_timeline_insert ON timeline_events
  FOR INSERT
  WITH CHECK (
    current_setting('app.user_role', true) = 'super_admin'
    OR (
      current_setting('app.user_role', true) IN ('innovation_admin','contributor')
      AND EXISTS (
        -- Qualify the outer column: startups also has a column named startup_id
        -- (the TEXT human id), so an unqualified startup_id would bind to that
        -- and compare uuid = text. timeline_events.startup_id is the uuid FK.
        SELECT 1 FROM startups s
        WHERE s.id = timeline_events.startup_id
          AND (s.department_id = current_setting('app.user_department', true)
               OR current_setting('app.user_department', true) = ANY(s.business_units))
      )
    )
  );

DROP POLICY IF EXISTS rls_timeline_delete ON timeline_events;   -- super admin only
CREATE POLICY rls_timeline_delete ON timeline_events
  FOR DELETE USING (current_setting('app.user_role', true) = 'super_admin');

-- ── startups ─────────────────────────────────────────────────────────────────
GRANT INSERT, UPDATE, DELETE ON startups TO app_rls;
GRANT USAGE ON SEQUENCE startup_id_seq TO app_rls;   -- for the assign_startup_id trigger

-- INSERT: innovation_admin+.
DROP POLICY IF EXISTS rls_startups_insert ON startups;
CREATE POLICY rls_startups_insert ON startups
  FOR INSERT WITH CHECK (current_setting('app.user_role', true) IN ('innovation_admin','super_admin'));

-- UPDATE: super_admin (any), or an in-scope innovation_admin/contributor.
-- WITH CHECK(true) so an admin may re-assign a startup's department/BUs without
-- the new row being re-scoped against the editor.
DROP POLICY IF EXISTS rls_startups_update ON startups;
CREATE POLICY rls_startups_update ON startups
  FOR UPDATE
  USING (
    current_setting('app.user_role', true) = 'super_admin'
    OR (
      current_setting('app.user_role', true) IN ('innovation_admin','contributor')
      AND (department_id = current_setting('app.user_department', true)
           OR current_setting('app.user_department', true) = ANY(business_units))
    )
  )
  WITH CHECK (true);

-- DELETE: super_admin (any), or an in-scope innovation_admin.
DROP POLICY IF EXISTS rls_startups_delete ON startups;
CREATE POLICY rls_startups_delete ON startups
  FOR DELETE
  USING (
    current_setting('app.user_role', true) = 'super_admin'
    OR (
      current_setting('app.user_role', true) = 'innovation_admin'
      AND (department_id = current_setting('app.user_department', true)
           OR current_setting('app.user_department', true) = ANY(business_units))
    )
  );
