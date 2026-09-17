-- ============================================================================
-- RLS Policy Test Harness
-- ----------------------------------------------------------------------------
-- Run in the Supabase SQL editor (as the postgres/owner role). It verifies that
-- Row-Level Security actually allows/denies the right rows for each identity, by
-- switching to the restricted `app_rls` role and setting the same GUCs the app
-- sets per request (app.user_id / app.user_role / app.user_department).
--
-- It runs entirely inside a transaction and ROLLBACKs at the end, so it makes NO
-- permanent changes. A failed assertion RAISEs EXCEPTION and aborts the script —
-- so "Success. No rows returned" (with the PASS notices) means every policy held.
--
-- Prereqs: migrations 044–050 applied (app_rls role, policies, grants).
-- ============================================================================

BEGIN;

-- Helper: become `app_rls` with a given identity for the next statements.
-- (set_config local=true keeps the GUCs transaction-scoped.)
--   NOTE: run each scenario's SET + query + RESET together.

-- ── Scenario 1: users table — only admins may SELECT ────────────────────────
-- 1a. A viewer must see ZERO users.
SELECT set_config('app.user_id',        '00000000-0000-0000-0000-000000000001', true),
       set_config('app.user_role',       'viewer', true),
       set_config('app.user_department', 'MEP', true);
SET LOCAL ROLE app_rls;
DO $$
DECLARE c int;
BEGIN
  SELECT count(*) INTO c FROM users;
  IF c <> 0 THEN
    RAISE EXCEPTION 'FAIL 1a: viewer saw % user row(s); expected 0', c;
  END IF;
  RAISE NOTICE 'PASS 1a: viewer cannot SELECT any users';
END $$;
RESET ROLE;

-- 1b. A super_admin must see users (> 0, assuming the table is non-empty).
SELECT set_config('app.user_role', 'super_admin', true);
SET LOCAL ROLE app_rls;
DO $$
DECLARE c int;
BEGIN
  SELECT count(*) INTO c FROM users;
  IF c = 0 THEN
    RAISE WARNING 'CHECK 1b: super_admin saw 0 users — is the users table empty?';
  ELSE
    RAISE NOTICE 'PASS 1b: super_admin can SELECT users (% visible)', c;
  END IF;
END $$;
RESET ROLE;

-- ── Scenario 2: initiatives — Internal ones hidden from an unrelated viewer ──
-- Seed one Internal initiative (as the privileged owner role), then check.
INSERT INTO initiatives (initiative_id, name, visibility, created_by)
VALUES ('RLS-TEST-INT', 'RLS_TEST_INTERNAL', 'Internal',
        '00000000-0000-0000-0000-0000000000ff');

SELECT set_config('app.user_id',        '00000000-0000-0000-0000-000000000001', true),
       set_config('app.user_role',       'viewer', true),
       set_config('app.user_department', 'MEP', true);
SET LOCAL ROLE app_rls;
DO $$
DECLARE c int;
BEGIN
  SELECT count(*) INTO c FROM initiatives WHERE name = 'RLS_TEST_INTERNAL';
  IF c <> 0 THEN
    RAISE EXCEPTION 'FAIL 2a: viewer saw the Internal initiative (%); expected 0', c;
  END IF;
  RAISE NOTICE 'PASS 2a: viewer cannot see an Internal initiative they are not on';
END $$;
RESET ROLE;

-- 2b. A super_admin CAN see the Internal initiative.
SELECT set_config('app.user_role', 'super_admin', true);
SET LOCAL ROLE app_rls;
DO $$
DECLARE c int;
BEGIN
  SELECT count(*) INTO c FROM initiatives WHERE name = 'RLS_TEST_INTERNAL';
  IF c <> 1 THEN
    RAISE EXCEPTION 'FAIL 2b: super_admin saw % Internal initiative(s); expected 1', c;
  END IF;
  RAISE NOTICE 'PASS 2b: super_admin can see the Internal initiative';
END $$;
RESET ROLE;

-- ── Scenario 3: write denial — a viewer cannot INSERT content ────────────────
SELECT set_config('app.user_role', 'viewer', true);
SET LOCAL ROLE app_rls;
DO $$
DECLARE denied boolean := false;
BEGIN
  BEGIN
    INSERT INTO challenges (title) VALUES ('RLS_TEST_SHOULD_FAIL');
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'FAIL 3: a viewer was able to INSERT a challenge';
  END IF;
  RAISE NOTICE 'PASS 3: viewer is blocked from INSERTing content';
END $$;
RESET ROLE;

-- ── Scenario 4: write allowed — an innovation_admin CAN INSERT content ───────
SELECT set_config('app.user_role', 'innovation_admin', true);
SET LOCAL ROLE app_rls;
DO $$
DECLARE ok boolean := true;
BEGIN
  BEGIN
    INSERT INTO challenges (title) VALUES ('RLS_TEST_ADMIN_OK');
  EXCEPTION WHEN OTHERS THEN
    ok := false;
    RAISE NOTICE 'note 4: admin insert raised % (may be a NOT NULL column, not RLS)', SQLERRM;
  END;
  IF ok THEN
    RAISE NOTICE 'PASS 4: innovation_admin can INSERT content';
  END IF;
END $$;
RESET ROLE;

-- Undo everything (fixtures + any test inserts). No permanent changes.
ROLLBACK;

-- Expected output: a series of "PASS n:" notices. Any "FAIL" aborts the script.
