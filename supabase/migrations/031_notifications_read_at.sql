-- Migration 031: Per-user "notifications read" marker.
--
-- Notification read-state used to live only in client memory, so opening the
-- panel and then logging out/in showed the same unread count again. This column
-- records when each user last opened their notifications; the API marks unread
-- anything created after it, so "read" now persists across sessions.

ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_read_at TIMESTAMPTZ;
