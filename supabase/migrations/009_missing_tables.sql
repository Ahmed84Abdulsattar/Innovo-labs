-- Migration 009: Document and create the three tables that were missing from migrations.
-- collaborations, initiatives_board, and challenges existed in the live database but were
-- never recorded in a migration file — migrations 005 and 006 alter these tables without
-- ever creating them, which breaks a fresh database restore.
--
-- All statements use IF NOT EXISTS so this is safe to run against the existing database.
-- For a fresh install, run this migration BEFORE 005 and 006.

-- ── Collaborations ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collaborations (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner           TEXT        NOT NULL,
  type              TEXT        NOT NULL DEFAULT 'University',
  focus_area        TEXT,
  description       TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'Not Started',
  detailed_overview TEXT,
  current_status    TEXT,
  next_steps        TEXT,
  images            JSONB       NOT NULL DEFAULT '[]',  -- includes column added in migration 005
  created_by        UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  CREATE TRIGGER trg_collaborations_updated
    BEFORE UPDATE ON collaborations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Challenges ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS challenges (
  id                        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  number                    INTEGER     NOT NULL DEFAULT 0,
  title                     TEXT        NOT NULL,
  short_description         TEXT,
  overview                  TEXT,
  key_challenges            JSONB       NOT NULL DEFAULT '[]',
  innovation_opportunities  JSONB       NOT NULL DEFAULT '[]',
  business_impact           JSONB       NOT NULL DEFAULT '[]',
  use_cases                 JSONB       NOT NULL DEFAULT '[]',
  strategic_focus_areas     JSONB       NOT NULL DEFAULT '[]',
  is_custom                 BOOLEAN     NOT NULL DEFAULT FALSE,
  created_by                UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenges_number ON challenges (number);

-- ── Initiatives Board ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS initiatives_board (
  id                       UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  initiative_id            TEXT        UNIQUE NOT NULL,
  name                     TEXT        NOT NULL,
  description              TEXT,
  problem_statement        TEXT,
  proposed_solution        TEXT,
  value_drivers            JSONB       NOT NULL DEFAULT '[]',
  potential_cost_saving    NUMERIC,
  potential_time_saving    NUMERIC,
  potential_quality_saving NUMERIC,   -- added in migration 006
  potential_safety_impact  NUMERIC,   -- added in migration 006
  potential_esg_offset     NUMERIC,   -- added in migration 006
  identified_solution      TEXT,
  linked_startup           TEXT,
  business_units           JSONB       NOT NULL DEFAULT '[]',
  departments              JSONB       NOT NULL DEFAULT '[]',
  priority                 TEXT        NOT NULL DEFAULT 'Medium',
  status                   TEXT        NOT NULL DEFAULT 'Not Started',
  progress                 INTEGER,
  next_steps               TEXT,
  lessons_learnt           TEXT,
  documents                JSONB       NOT NULL DEFAULT '[]',
  evaluations              JSONB       NOT NULL DEFAULT '[]',
  created_by               UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_initiatives_board_initiative_id ON initiatives_board (initiative_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_board_status        ON initiatives_board (status);
CREATE INDEX IF NOT EXISTS idx_initiatives_board_priority      ON initiatives_board (priority);

DO $$ BEGIN
  CREATE TRIGGER trg_initiatives_board_updated
    BEFORE UPDATE ON initiatives_board
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
