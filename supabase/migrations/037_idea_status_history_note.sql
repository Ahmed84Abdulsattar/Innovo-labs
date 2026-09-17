-- 037: Attach the reviewer's feedback to each status change.
-- The note typed when a status is changed is stored on the history row so the
-- super-admin timeline can show the feedback alongside each transition.

ALTER TABLE idea_status_history
  ADD COLUMN IF NOT EXISTS note text;
