-- Migration 020: Auto-generated startup IDs (STU-000, STU-001, ...)

ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS startup_id TEXT UNIQUE;

CREATE SEQUENCE IF NOT EXISTS startup_id_seq START 0 MINVALUE 0 INCREMENT 1;

-- Backfill existing rows in created_at order
WITH numbered AS (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1) AS rn
  FROM initiatives
  WHERE startup_id IS NULL
)
UPDATE initiatives i
SET startup_id = 'STU-' || LPAD(n.rn::text, 3, '0')
FROM numbered n
WHERE i.id = n.id;

-- Advance sequence past existing rows so next insert continues cleanly
SELECT setval('startup_id_seq',
  (SELECT COUNT(*) FROM initiatives WHERE startup_id IS NOT NULL),
  false
);

-- Trigger function
CREATE OR REPLACE FUNCTION assign_startup_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.startup_id IS NULL THEN
    NEW.startup_id := 'STU-' || LPAD(nextval('startup_id_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DO $$ BEGIN
  CREATE TRIGGER trg_assign_startup_id
    BEFORE INSERT ON initiatives
    FOR EACH ROW EXECUTE FUNCTION assign_startup_id();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
