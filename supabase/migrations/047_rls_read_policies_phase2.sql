-- 047: RLS read policies — Phase 2 (high-value reads)
-- ============================================================================
-- Adds database-side read enforcement for the tables that actually restrict
-- reads, each MIRRORING the app-layer rule. Applied via queryAsUser() in the
-- matching routes; the owner/system path still bypasses RLS, so caching,
-- notifications feed, etc. are unaffected. No behaviour change until
-- RLS_ENFORCED=true.
--
--   initiatives         — Internal ones: admins, creator, or assigned contributor
--   audit_entries       — innovation_admin + super_admin only
--   idea_status_history — super_admin only
--
-- NOTE: notifications are NOT a table — they are derived from audit_entries and
-- served (name-stripped) via the privileged path, so they are intentionally
-- unaffected by the audit policy.
-- ============================================================================

-- RLS is already enabled on initiatives + audit_entries (migration 013).
-- idea_status_history was added later (036); make sure it is enabled too.
ALTER TABLE idea_status_history ENABLE ROW LEVEL SECURITY;

-- Read privileges (RLS then narrows WHICH rows).
GRANT USAGE ON SCHEMA public TO app_rls;
GRANT SELECT ON initiatives         TO app_rls;
GRANT SELECT ON audit_entries       TO app_rls;
GRANT SELECT ON idea_status_history TO app_rls;

-- ── initiatives — mirrors canViewInitiative() ───────────────────────────────
-- Non-Internal initiatives are visible to all; Internal ones only to admins,
-- the creator, and assigned contributors.
DROP POLICY IF EXISTS rls_initiatives_select ON initiatives;
CREATE POLICY rls_initiatives_select ON initiatives
  FOR SELECT
  USING (
    coalesce(visibility, '') <> 'Internal'
    OR current_setting('app.user_role', true) IN ('innovation_admin', 'super_admin')
    OR created_by = nullif(current_setting('app.user_id', true), '')::uuid
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(contributors) AS c
      WHERE c->>'id' = current_setting('app.user_id', true)
    )
  );

-- ── audit_entries — admins only (mirrors GET /api/audit) ─────────────────────
DROP POLICY IF EXISTS rls_audit_select ON audit_entries;
CREATE POLICY rls_audit_select ON audit_entries
  FOR SELECT
  USING (current_setting('app.user_role', true) IN ('innovation_admin', 'super_admin'));

-- ── idea_status_history — super admins only (mirrors GET /api/ideas/[id]/history) ─
DROP POLICY IF EXISTS rls_idea_history_select ON idea_status_history;
CREATE POLICY rls_idea_history_select ON idea_status_history
  FOR SELECT
  USING (current_setting('app.user_role', true) = 'super_admin');
