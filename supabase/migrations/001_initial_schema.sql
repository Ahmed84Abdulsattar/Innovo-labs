-- Migration 001: Initial schema (extracted from schema.sql)
-- Run once on a fresh database.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                 TEXT UNIQUE NOT NULL,
  username              TEXT NOT NULL,
  password_hash         TEXT NOT NULL,
  name                  TEXT NOT NULL,
  department            TEXT NOT NULL DEFAULT 'Digital Innovation',
  role                  TEXT NOT NULL DEFAULT 'viewer'
                        CHECK (role IN ('super_admin','admin','contributor','viewer')),
  can_view_executive    BOOLEAN NOT NULL DEFAULT FALSE,
  department_unassigned BOOLEAN NOT NULL DEFAULT TRUE,
  profile_photo         TEXT,
  last_login            TIMESTAMPTZ,
  email_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT NOT NULL,
  code       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('register','reset')),
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS initiatives (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id               TEXT NOT NULL,
  created_by                  UUID REFERENCES users(id),
  company                     TEXT NOT NULL,
  product                     TEXT NOT NULL,
  description                 TEXT,
  source                      TEXT,
  sector                      TEXT,
  technologies                TEXT[],
  business_units              TEXT[],
  departments                 TEXT[],
  build_departments           TEXT[],
  founded_year                TEXT,
  hq_country                  TEXT,
  funding_received            TEXT,
  product_maturity            TEXT,
  priority                    TEXT NOT NULL DEFAULT 'Medium',
  collaboration_status        TEXT NOT NULL DEFAULT 'To be assessed',
  rating                      TEXT,
  whats_great                 TEXT,
  whats_lacking               TEXT,
  next_steps                  TEXT,
  star_engagement             BOOLEAN DEFAULT FALSE,
  website                     TEXT,
  documents_link              TEXT,
  keywords                    TEXT,
  founder                     TEXT,
  innovo_engagement_type      TEXT,
  introducer_recommendation   TEXT,
  key_contacts                JSONB DEFAULT '[]',
  cyber_security_review       JSONB,
  nda_documents               JSONB DEFAULT '[]',
  legal_documents             JSONB DEFAULT '[]',
  videos                      JSONB DEFAULT '[]',
  costs                       JSONB DEFAULT '{"capex":[],"opex":[]}',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS timeline_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  initiative_id   UUID NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  status          TEXT NOT NULL,
  rating          TEXT,
  feedback        TEXT,
  created_by      UUID REFERENCES users(id),
  created_by_name TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  initiative_id UUID NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id),
  user_name     TEXT NOT NULL,
  body          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_ratings (
  initiative_id UUID    NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  user_id       UUID    NOT NULL REFERENCES users(id),
  user_name     TEXT    NOT NULL,
  rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (initiative_id, user_id)
);

CREATE TABLE IF NOT EXISTS ideas (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submitted_by          UUID REFERENCES users(id),
  submitted_by_name     TEXT NOT NULL,
  submitted_by_dept     TEXT NOT NULL,
  problem_title         TEXT NOT NULL,
  problem_description   TEXT NOT NULL,
  current_process       TEXT,
  impact_if_solved      TEXT,
  estimated_time_saved  TEXT,
  affected_teams        TEXT[],
  urgency               TEXT NOT NULL DEFAULT 'Medium',
  suggested_solution    TEXT,
  has_tried_before      BOOLEAN DEFAULT FALSE,
  tried_before_details  TEXT,
  expected_benefits     TEXT,
  any_budget_in_mind    TEXT,
  status                TEXT NOT NULL DEFAULT 'Submitted',
  linked_initiative_id  UUID REFERENCES initiatives(id),
  review_notes          TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investments (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                 TEXT NOT NULL,
  category             TEXT NOT NULL,
  vendor               TEXT NOT NULL,
  description          TEXT,
  status               TEXT NOT NULL DEFAULT 'Evaluating',
  total_invested       NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency             TEXT NOT NULL DEFAULT 'AED',
  start_date           DATE,
  renewal_date         DATE,
  department           TEXT,
  business_unit        TEXT,
  linked_initiative_id UUID REFERENCES initiatives(id),
  notes                TEXT,
  created_by           UUID REFERENCES users(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_entries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id),
  user_name     TEXT NOT NULL,
  initiative_id UUID REFERENCES initiatives(id),
  company_name  TEXT,
  action        TEXT NOT NULL,
  old_value     TEXT,
  new_value     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_initiatives_dept       ON initiatives(department_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_status     ON initiatives(collaboration_status);
CREATE INDEX IF NOT EXISTS idx_initiatives_created_by ON initiatives(created_by);
CREATE INDEX IF NOT EXISTS idx_timeline_initiative    ON timeline_events(initiative_id);
CREATE INDEX IF NOT EXISTS idx_comments_initiative    ON comments(initiative_id);
CREATE INDEX IF NOT EXISTS idx_ratings_initiative     ON user_ratings(initiative_id);
CREATE INDEX IF NOT EXISTS idx_ideas_submitted_by     ON ideas(submitted_by);
CREATE INDEX IF NOT EXISTS idx_investments_dept       ON investments(department);
CREATE INDEX IF NOT EXISTS idx_audit_initiative       ON audit_entries(initiative_id);
CREATE INDEX IF NOT EXISTS idx_audit_user             ON audit_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_email              ON otp_codes(email);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_users_updated       BEFORE UPDATE ON users       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_initiatives_updated BEFORE UPDATE ON initiatives FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_ideas_updated       BEFORE UPDATE ON ideas       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_investments_updated BEFORE UPDATE ON investments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
