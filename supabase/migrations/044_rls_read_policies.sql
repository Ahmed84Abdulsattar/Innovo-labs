-- 044: Row-Level Security — Phase 1 (defense-in-depth READ enforcement)
-- ============================================================================
-- Adds database-side access control ON TOP OF the existing app-layer checks,
-- for the `users` and `ideas` tables. The policies MIRROR the application rules
-- exactly, so enabling this locks out no one who is already allowed — it only
-- makes the database independently refuse anything the app would also refuse.
--
-- HOW IT WORKS
--   * The app's normal/system queries keep running as the connection's owner
--     role, which BYPASSES RLS — so authentication, the rate limiter, audit
--     writes, user creation, etc. are unaffected.
--   * User-FACING reads run via queryAsUser() in the app, which (when
--     RLS_ENFORCED=true) opens a transaction, sets the caller's identity as
--     local GUCs, and SET LOCAL ROLE app_rls — a restricted role that IS
--     subject to RLS. The policies below then apply.
--   * If identity is not set, the policies deny everything (fail closed).
--
-- ROLLOUT (see docs/RLS.md):
--   1. Apply this migration.   2. Keep RLS_ENFORCED unset/false → no change.
--   3. Test.   4. Set RLS_ENFORCED=true.   5. Roll back instantly by unsetting it.
-- ============================================================================

-- 1) Restricted role the app switches into per request (subject to RLS).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rls') THEN
    CREATE ROLE app_rls NOLOGIN;
  END IF;
END $$;

-- Allow the app's own connection role (whatever runs this migration / the app)
-- to SET ROLE app_rls. current_user = the role in DATABASE_URL.
DO $$ BEGIN EXECUTE format('GRANT app_rls TO %I', current_user); END $$;

-- Table privileges (RLS then narrows WHICH rows are visible).
GRANT USAGE ON SCHEMA public TO app_rls;
GRANT SELECT ON users TO app_rls;
GRANT SELECT ON ideas TO app_rls;

-- 2) Policies — evaluated only when connected as app_rls, using the identity
--    injected via set_config('app.user_id' / 'app.user_role').

-- users: readable only by innovation_admin + super_admin (mirrors GET /api/users).
DROP POLICY IF EXISTS rls_users_select ON users;
CREATE POLICY rls_users_select ON users
  FOR SELECT
  USING (current_setting('app.user_role', true) IN ('innovation_admin', 'super_admin'));

-- ideas: the submitter sees their own; admins see all
--        (mirrors GET /api/ideas and GET /api/ideas/[id]).
DROP POLICY IF EXISTS rls_ideas_select ON ideas;
CREATE POLICY rls_ideas_select ON ideas
  FOR SELECT
  USING (
    submitted_by = nullif(current_setting('app.user_id', true), '')::uuid
    OR current_setting('app.user_role', true) IN ('innovation_admin', 'super_admin')
  );

-- ── Verify (run manually in the Supabase SQL editor) ────────────────────────
-- As a NON-admin, this should return 0 rows; as an admin, it returns rows:
--   BEGIN;
--     SELECT set_config('app.user_id','<some-user-uuid>',true),
--            set_config('app.user_role','viewer',true);
--     SET LOCAL ROLE app_rls;
--     SELECT count(*) FROM users;   -- expect 0 for viewer, >0 for admin roles
--     SELECT count(*) FROM ideas;   -- expect only the viewer's own ideas
--   ROLLBACK;
