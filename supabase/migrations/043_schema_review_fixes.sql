-- 043: Schema review fixes (indexes + drop dead column)
--
-- Safe, non-destructive except for the DROP COLUMN, which targets a column that
-- no application code references (verified).

-- 1) Ideas list search hits ILIKE '%q%' on problem_title, submitted_by_name and
--    idea_ref (see app/api/ideas/route.ts) with no supporting index, forcing a
--    sequential scan. Trigram GIN indexes make these substring searches indexable.
--    pg_trgm was enabled in migration 026.
CREATE INDEX IF NOT EXISTS idx_ideas_problem_title_trgm
  ON ideas USING GIN (problem_title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ideas_submitted_by_name_trgm
  ON ideas USING GIN (submitted_by_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ideas_idea_ref_trgm
  ON ideas USING GIN (idea_ref gin_trgm_ops);

-- 2) ideas.linked_startup_id is a FK to startups(id) but was unindexed; index it
--    so idea→startup joins/filters don't scan.
CREATE INDEX IF NOT EXISTS idx_ideas_linked_startup
  ON ideas (linked_startup_id);

-- 3) users.can_view_executive is dead — no application code reads or writes it
--    (the executive view was removed). Drop it.
ALTER TABLE users DROP COLUMN IF EXISTS can_view_executive;
