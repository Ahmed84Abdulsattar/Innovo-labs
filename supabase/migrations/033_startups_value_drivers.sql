-- Migration 033: Primary value drivers on startups (parity with initiatives).
--
-- Startups had only secondary_value_drivers; this adds the primary value-driver
-- field (Cost Saving / Time Saving / Site Safety / Quality / ESG) so the startup
-- overview matches the initiatives model and the Innovation Concierge can match
-- startups on these five drivers.

ALTER TABLE startups ADD COLUMN IF NOT EXISTS value_drivers text[] DEFAULT '{}'::text[];
