-- Add framework/concierge matching columns to the initiatives (startups) table
ALTER TABLE initiatives
  ADD COLUMN IF NOT EXISTS secondary_value_drivers   TEXT[],
  ADD COLUMN IF NOT EXISTS applicable_stakeholders   TEXT[],
  ADD COLUMN IF NOT EXISTS project_lifecycle_stages  TEXT[],
  ADD COLUMN IF NOT EXISTS project_types             TEXT[],
  ADD COLUMN IF NOT EXISTS project_location          TEXT[],
  ADD COLUMN IF NOT EXISTS applicable_project_size   TEXT[],
  ADD COLUMN IF NOT EXISTS applicable_project_value  TEXT[],
  ADD COLUMN IF NOT EXISTS technology_category       TEXT[],
  ADD COLUMN IF NOT EXISTS implementation_complexity TEXT,
  ADD COLUMN IF NOT EXISTS investment_level          TEXT,
  ADD COLUMN IF NOT EXISTS change_management_effort  TEXT,
  ADD COLUMN IF NOT EXISTS deployment_type           TEXT[];
