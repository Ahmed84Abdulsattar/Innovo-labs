-- Migration 034: Value-tracker amounts on startups (parity with initiatives).
--
-- Companion to 033 (value_drivers): when a startup selects a value driver, it can
-- now record the estimated value, exactly like initiatives. Nullable numerics;
-- each is only set when its driver is selected.

ALTER TABLE startups ADD COLUMN IF NOT EXISTS potential_cost_saving    numeric;
ALTER TABLE startups ADD COLUMN IF NOT EXISTS potential_time_saving    numeric;
ALTER TABLE startups ADD COLUMN IF NOT EXISTS potential_quality_saving numeric;
ALTER TABLE startups ADD COLUMN IF NOT EXISTS potential_safety_impact  numeric;
ALTER TABLE startups ADD COLUMN IF NOT EXISTS potential_esg_offset     numeric;
