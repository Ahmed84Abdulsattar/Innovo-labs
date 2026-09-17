-- Migration 008: Fix foreign key ON DELETE actions and add missing indexes
-- All user FK references previously defaulted to RESTRICT, blocking user deletion.
-- Replaced with SET NULL to preserve historical records when a user is removed.
-- user_ratings uses CASCADE since a rating with no user is meaningless.

-- ── Fix audit_entries FKs ────────────────────────────────────────────────────
ALTER TABLE audit_entries
  DROP CONSTRAINT IF EXISTS audit_entries_user_id_fkey,
  DROP CONSTRAINT IF EXISTS audit_entries_initiative_id_fkey;

ALTER TABLE audit_entries
  ADD CONSTRAINT audit_entries_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT audit_entries_initiative_id_fkey
    FOREIGN KEY (initiative_id) REFERENCES initiatives(id) ON DELETE SET NULL;

-- ── Fix initiatives FK ───────────────────────────────────────────────────────
ALTER TABLE initiatives
  DROP CONSTRAINT IF EXISTS initiatives_created_by_fkey;

ALTER TABLE initiatives
  ADD CONSTRAINT initiatives_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- ── Fix timeline_events FK ───────────────────────────────────────────────────
ALTER TABLE timeline_events
  DROP CONSTRAINT IF EXISTS timeline_events_created_by_fkey;

ALTER TABLE timeline_events
  ADD CONSTRAINT timeline_events_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- ── Fix comments FK ──────────────────────────────────────────────────────────
ALTER TABLE comments
  DROP CONSTRAINT IF EXISTS comments_user_id_fkey;

ALTER TABLE comments
  ADD CONSTRAINT comments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ── Fix ideas FK ─────────────────────────────────────────────────────────────
ALTER TABLE ideas
  DROP CONSTRAINT IF EXISTS ideas_submitted_by_fkey;

ALTER TABLE ideas
  ADD CONSTRAINT ideas_submitted_by_fkey
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL;

-- ── Fix investments FK ───────────────────────────────────────────────────────
ALTER TABLE investments
  DROP CONSTRAINT IF EXISTS investments_created_by_fkey;

ALTER TABLE investments
  ADD CONSTRAINT investments_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- ── Fix user_ratings FK (CASCADE — rating without a user is meaningless) ─────
ALTER TABLE user_ratings
  DROP CONSTRAINT IF EXISTS user_ratings_user_id_fkey;

ALTER TABLE user_ratings
  ADD CONSTRAINT user_ratings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ── Add missing indexes ───────────────────────────────────────────────────────

-- OTP lookup: verify query filters on email + type + used + expires_at
CREATE INDEX IF NOT EXISTS idx_otp_lookup
  ON otp_codes (email, type, used, expires_at);

-- Common status filters
CREATE INDEX IF NOT EXISTS idx_ideas_status
  ON ideas (status);

CREATE INDEX IF NOT EXISTS idx_investments_status
  ON investments (status);
