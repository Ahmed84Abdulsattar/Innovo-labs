-- Migration 010: Add Construction Innovation Framework filtering fields to initiatives_board

ALTER TABLE initiatives_board
  ADD COLUMN IF NOT EXISTS applicable_stakeholders  TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS business_functions        TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS project_lifecycle_stages  TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_initiatives_board_stakeholders     ON initiatives_board USING GIN (applicable_stakeholders);
CREATE INDEX IF NOT EXISTS idx_initiatives_board_business_funcs   ON initiatives_board USING GIN (business_functions);
CREATE INDEX IF NOT EXISTS idx_initiatives_board_lifecycle_stages ON initiatives_board USING GIN (project_lifecycle_stages);
