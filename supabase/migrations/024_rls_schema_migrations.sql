-- Migration 024: Enable RLS on schema_migrations table.
--
-- This table was missed in 013_enable_rls.sql. The service role bypasses RLS,
-- so application behaviour is unchanged. Enabling RLS blocks direct anon/public
-- REST access, which is the desired posture for an internal tracking table.

ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;
