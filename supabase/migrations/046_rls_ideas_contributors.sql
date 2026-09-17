-- 046: Extend the ideas RLS read policy to include assigned contributors
--
-- Idea contributors (users in ideas.contributors) may now review an idea, so
-- they must also be able to READ it. Without this, the RLS policy from 044 would
-- return the row as invisible to a non-owner, non-admin contributor. Mirrors the
-- app-layer access check in GET /api/ideas/[id].

DROP POLICY IF EXISTS rls_ideas_select ON ideas;
CREATE POLICY rls_ideas_select ON ideas
  FOR SELECT
  USING (
    submitted_by = nullif(current_setting('app.user_id', true), '')::uuid
    OR current_setting('app.user_role', true) IN ('innovation_admin', 'super_admin')
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements(contributors) AS c
      WHERE c->>'id' = current_setting('app.user_id', true)
    )
  );
