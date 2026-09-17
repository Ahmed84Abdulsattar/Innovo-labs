-- Migration 012: Drop primary_value_drivers from initiatives_board
-- The existing value_drivers column already serves this purpose.
-- The UI label was renamed from "Value Drivers" to "Primary Value Driver" instead.

ALTER TABLE initiatives_board DROP COLUMN IF EXISTS primary_value_drivers;
