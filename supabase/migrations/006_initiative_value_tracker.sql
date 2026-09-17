-- Add Quality, Safety, ESG value tracker fields to initiatives_board
ALTER TABLE initiatives_board
  ADD COLUMN IF NOT EXISTS potential_quality_saving NUMERIC,   -- AED saved by re-work
  ADD COLUMN IF NOT EXISTS potential_safety_impact  NUMERIC,   -- injuries prevented
  ADD COLUMN IF NOT EXISTS potential_esg_offset     NUMERIC;   -- kg CO2 offset
