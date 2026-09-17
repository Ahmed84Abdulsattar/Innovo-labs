-- Step 1: Remove any accidental spaces (e.g. "INIT -002" → "INIT-002").
UPDATE initiatives_board
SET initiative_id = REPLACE(initiative_id, ' ', '')
WHERE initiative_id ~ '^INIT\s';

-- Step 2: Normalize INIT-N / INIT-NN to 3-digit zero-padded format (INIT-001).
-- Safe to run multiple times; the WHERE clause only touches rows that need it.
UPDATE initiatives_board
SET initiative_id = 'INIT-' || LPAD(SUBSTRING(initiative_id FROM 6), 3, '0')
WHERE initiative_id ~ '^INIT-[0-9]+$'
  AND LENGTH(SUBSTRING(initiative_id FROM 6)) < 3;
