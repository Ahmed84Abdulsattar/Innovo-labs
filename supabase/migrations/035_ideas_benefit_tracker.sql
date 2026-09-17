-- 035: Ideas — value/benefit tracker + business function
-- Adds the "How will your idea benefit Innovo's business" value tracker
-- (drivers + per-driver monthly figures) and the "Which business function will
-- benefit" selection (business units + departments) to idea submissions.
-- `estimated_time_saved` stays a text column; the form now stores a numeric
-- hours/month value in it.

ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS benefit_drivers        text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS benefit_cost_saving    numeric,
  ADD COLUMN IF NOT EXISTS benefit_time_saving    numeric,
  ADD COLUMN IF NOT EXISTS benefit_quality        numeric,
  ADD COLUMN IF NOT EXISTS benefit_safety         numeric,
  ADD COLUMN IF NOT EXISTS benefit_esg            numeric,
  ADD COLUMN IF NOT EXISTS benefit_business_units text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS benefit_departments    text[] DEFAULT '{}'::text[];
