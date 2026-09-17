-- 039: Auto-generated idea reference IDs (IDEA-000, IDEA-001, ...)
-- Every submitted idea gets a human-friendly reference the submitter can see
-- and search by.

ALTER TABLE ideas ADD COLUMN IF NOT EXISTS idea_ref TEXT UNIQUE;

CREATE SEQUENCE IF NOT EXISTS idea_ref_seq START 0 MINVALUE 0 INCREMENT 1;

-- Backfill existing rows in created_at order
WITH numbered AS (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1) AS rn
  FROM ideas
  WHERE idea_ref IS NULL
)
UPDATE ideas i
SET idea_ref = 'IDEA-' || LPAD(n.rn::text, 3, '0')
FROM numbered n
WHERE i.id = n.id;

-- Advance the sequence past existing rows
SELECT setval('idea_ref_seq',
  (SELECT COUNT(*) FROM ideas WHERE idea_ref IS NOT NULL),
  false
);

-- Assign on insert
CREATE OR REPLACE FUNCTION assign_idea_ref()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.idea_ref IS NULL THEN
    NEW.idea_ref := 'IDEA-' || LPAD(nextval('idea_ref_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_assign_idea_ref
    BEFORE INSERT ON ideas
    FOR EACH ROW EXECUTE FUNCTION assign_idea_ref();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
