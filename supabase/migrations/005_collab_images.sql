-- Migration 005: add images column to collaborations table
ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]';
