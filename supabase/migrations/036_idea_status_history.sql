-- 036: Idea status history (super-admin-only timeline)
-- Records every status change on an idea — from/to status, who changed it
-- (name + email), and when — for the review timeline shown only to super admins.

CREATE TABLE IF NOT EXISTS idea_status_history (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id          uuid NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  from_status      text,
  to_status        text NOT NULL,
  changed_by       uuid,
  changed_by_name  text,
  changed_by_email text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_idea_status_history_idea
  ON idea_status_history (idea_id, created_at);
