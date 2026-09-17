-- 050: RLS write policies for initiatives (completes write coverage)
-- Mirrors the app: create/delete = innovation_admin+, update = admins OR a user
-- assigned to this initiative as a contributor (framework-field restriction is
-- enforced in the route). WITH CHECK(true) on UPDATE so an admin may re-assign
-- fields without the new row being re-checked.

GRANT INSERT, UPDATE, DELETE ON initiatives TO app_rls;

DROP POLICY IF EXISTS rls_initiatives_insert ON initiatives;
CREATE POLICY rls_initiatives_insert ON initiatives
  FOR INSERT
  WITH CHECK (current_setting('app.user_role', true) IN ('innovation_admin', 'super_admin'));

DROP POLICY IF EXISTS rls_initiatives_update ON initiatives;
CREATE POLICY rls_initiatives_update ON initiatives
  FOR UPDATE
  USING (
    current_setting('app.user_role', true) IN ('innovation_admin', 'super_admin')
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(contributors) AS c
      WHERE c->>'id' = current_setting('app.user_id', true)
    )
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS rls_initiatives_delete ON initiatives;
CREATE POLICY rls_initiatives_delete ON initiatives
  FOR DELETE
  USING (current_setting('app.user_role', true) IN ('innovation_admin', 'super_admin'));
