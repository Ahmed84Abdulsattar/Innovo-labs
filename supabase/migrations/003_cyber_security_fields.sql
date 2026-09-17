-- Add cyber security status and file fields to initiatives
ALTER TABLE initiatives
  ADD COLUMN IF NOT EXISTS cyber_security_status      TEXT,
  ADD COLUMN IF NOT EXISTS cyber_security_review_file JSONB,
  ADD COLUMN IF NOT EXISTS saas_file                  JSONB;
