-- Migration 023: Rename tables to match what they actually store.
-- The old 'initiatives' table held startup evaluations, while the real
-- initiatives lived in 'initiatives_board'. This flips the names so code,
-- URLs and schema all say what they mean.
-- Triggers, sequences and generated columns follow their tables automatically.

ALTER TABLE initiatives RENAME TO startups;
ALTER TABLE initiatives_board RENAME TO initiatives;

-- Foreign-key columns that point at startups
ALTER TABLE timeline_events RENAME COLUMN initiative_id TO startup_id;
ALTER TABLE comments        RENAME COLUMN initiative_id TO startup_id;
ALTER TABLE user_ratings    RENAME COLUMN initiative_id TO startup_id;
ALTER TABLE ideas           RENAME COLUMN linked_initiative_id TO linked_startup_id;
ALTER TABLE investments     RENAME COLUMN linked_initiative_id TO linked_startup_id;
ALTER TABLE audit_entries   RENAME COLUMN initiative_id TO startup_id;

-- Indexes (note: startups indexes must be renamed before the board indexes
-- free up the idx_initiatives_* namespace)
ALTER INDEX IF EXISTS idx_initiatives_dept       RENAME TO idx_startups_dept;
ALTER INDEX IF EXISTS idx_initiatives_status     RENAME TO idx_startups_status;
ALTER INDEX IF EXISTS idx_initiatives_created_by RENAME TO idx_startups_created_by;
ALTER INDEX IF EXISTS idx_initiatives_search     RENAME TO idx_startups_search;
ALTER INDEX IF EXISTS idx_timeline_initiative    RENAME TO idx_timeline_startup;
ALTER INDEX IF EXISTS idx_comments_initiative    RENAME TO idx_comments_startup;
ALTER INDEX IF EXISTS idx_ratings_initiative     RENAME TO idx_ratings_startup;
ALTER INDEX IF EXISTS idx_audit_initiative       RENAME TO idx_audit_startup;
ALTER INDEX IF EXISTS idx_initiatives_board_initiative_id RENAME TO idx_initiatives_initiative_id;
ALTER INDEX IF EXISTS idx_initiatives_board_status        RENAME TO idx_initiatives_status;
ALTER INDEX IF EXISTS idx_initiatives_board_priority      RENAME TO idx_initiatives_priority;

-- Stored idea-status label that referenced the old naming
UPDATE ideas SET status = 'Converted to Startup' WHERE status = 'Converted to Initiative';
