-- 040: Allow comments on ideas (not only startups)
-- A comment now belongs to EITHER a startup or an idea, so startup_id becomes
-- nullable and a nullable idea_id is added (cascades on idea delete).

ALTER TABLE comments ALTER COLUMN startup_id DROP NOT NULL;

ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_comments_idea ON comments (idea_id);
