-- Migration 022: Allow password-less accounts
-- Users created via Azure AD SSO have no local password. The NOT NULL
-- constraint made the SSO callback's INSERT fail for first-time SSO users.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
