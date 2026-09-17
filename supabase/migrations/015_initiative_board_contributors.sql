-- Migration 015: Add contributors array to initiatives_board
ALTER TABLE initiatives_board
  ADD COLUMN IF NOT EXISTS contributors JSONB NOT NULL DEFAULT '[]';
