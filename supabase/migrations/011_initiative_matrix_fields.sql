-- Migration 011: Add remaining Construction Innovation Framework Matrix fields to initiatives_board

ALTER TABLE initiatives_board
  ADD COLUMN IF NOT EXISTS secondary_value_drivers  TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS project_types            TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS project_location         TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS applicable_project_size  TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS applicable_project_value TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS technology_category      TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS implementation_complexity TEXT,
  ADD COLUMN IF NOT EXISTS investment_level          TEXT,
  ADD COLUMN IF NOT EXISTS change_management_effort  TEXT,
  ADD COLUMN IF NOT EXISTS deployment_type          TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_initiatives_board_project_types  ON initiatives_board USING GIN (project_types);
CREATE INDEX IF NOT EXISTS idx_initiatives_board_tech_category  ON initiatives_board USING GIN (technology_category);
