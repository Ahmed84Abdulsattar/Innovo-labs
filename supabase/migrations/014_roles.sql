-- Migration 014: Update role hierarchy
-- Renames admin → innovation_admin and adds reviewer role.

-- Drop the existing check constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Migrate all legacy role values BEFORE re-adding the constraint,
-- otherwise existing rows violate the new check immediately.
UPDATE users SET role = 'innovation_admin' WHERE role = 'admin';
UPDATE users SET role = 'viewer'           WHERE role = 'reviewer';

-- Add updated constraint with new roles
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin', 'innovation_admin', 'contributor', 'viewer'));
