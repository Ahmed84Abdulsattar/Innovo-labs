-- ============================================================================
-- Innovo Labs — CONSOLIDATED SCHEMA SNAPSHOT (reference only)
-- ============================================================================
-- The CREATE TABLE blocks below collapse migrations 000–029 into their final
-- state, reconciled against the live schema (Supabase export, 2026-06). Changes
-- from migrations 030–043 are summarised in "LATER MIGRATIONS" at the end of the
-- file rather than folded into the blocks above.
--
--   * This is the authoritative, readable picture of the live schema. It is NOT
--     run by scripts/migrate.js.
--   * The /supabase/migrations folder no longer rebuilds prod exactly (see the DRIFT note
--     below). The fix is to rebaseline from a live dump — see docs/REBASELINE.md.
--     Until then, treat THIS file as the source of truth for what prod looks like.
--   * To change the schema, add a new numbered migration; regenerate this snapshot
--     (and the baseline, once created) to match.
--   * Column/table conventions are documented in docs/CONVENTIONS.md.
--   * otp_codes and investments were dropped in migration 042 (retired features)
--     and no longer appear below.
--
-- Naming note: migration 023 swapped two table names —
--     old `initiatives`       (startup evaluations) -> `startups`
--     old `initiatives_board` (the delivery board)  -> `initiatives`
-- This file reflects the POST-rename names.
--
-- ⚠ MIGRATION-vs-PRODUCTION DRIFT (verified against the live DB export):
--   Production was NOT built purely from these migrations. Confirmed differences:
--     * startups is MISSING the 6 legacy columns 001 declares (build_departments,
--       founded_year, funding_received, founder, innovo_engagement_type,
--       introducer_recommendation).
--     * startups.search_vector ALREADY indexes the 9 live fields (company, product,
--       description, sector, keywords, hq_country, whats_great, whats_lacking,
--       next_steps) — so migration 029's premise ("only 6 fields") was wrong; the
--       eval-feedback fields are already searchable. The live export RENDERS it as
--       a plain `DEFAULT` column, but that is cosmetic: pg_attribute confirms
--       attgenerated = 's', i.e. it is GENERATED ALWAYS … STORED and auto-refreshes
--       on every INSERT and UPDATE. => Migration 029 is NOT needed; do not run it.
--     * collaborations was MISSING the updated_at column its trigger writes —
--       migration 027 adds it. CONFIRMED PRESENT in the live schema (027 applied).
--   Implication: a fresh DB built from /migrations will NOT match production.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;        -- migration 026 (trigram ILIKE search)

-- ── schema_migrations (000) — migration ledger for scripts/migrate.js ────────
CREATE TABLE schema_migrations (
  version    TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── users (001; roles updated 014; password_hash nullable 022) ───────────────
CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                 TEXT UNIQUE NOT NULL,
  username              TEXT NOT NULL,
  password_hash         TEXT,                                   -- nullable (022): SSO accounts have none
  name                  TEXT NOT NULL,
  department            TEXT NOT NULL DEFAULT 'Digital Innovation',
  role                  TEXT NOT NULL DEFAULT 'viewer'
                        CHECK (role IN ('super_admin','innovation_admin','contributor','viewer')),  -- 014
  department_unassigned BOOLEAN NOT NULL DEFAULT TRUE,   -- (can_view_executive dropped in 043)
  profile_photo         TEXT,                                   -- now a Storage URL (legacy rows: base64)
  last_login            TIMESTAMPTZ,
  email_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── startups  (was `initiatives`; 001 + 002,003,018,019,020,021,025) ─────────
-- Startup/vendor evaluations. Array columns here are TEXT[].
CREATE TABLE startups (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  startup_id                  TEXT UNIQUE,                      -- 020: auto "STU-000" via trigger
  department_id               TEXT NOT NULL,
  created_by                  UUID REFERENCES users(id) ON DELETE SET NULL,  -- 008
  company                     TEXT NOT NULL,
  product                     TEXT NOT NULL,
  description                 TEXT,
  source                      TEXT,
  sector                      TEXT,
  technologies                TEXT[],
  business_units              TEXT[],
  departments                 TEXT[],
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
  problem_statement           TEXT,                             -- 018
  strategic_fit               TEXT,                             -- 018
  solution_details            TEXT,                             -- 019
  hq_country                  TEXT,                             -- 001/019
  commercial_model            TEXT,                             -- 019
  key_contacts                JSONB DEFAULT '[]',
  cyber_security_review       JSONB,
  cyber_security_status       TEXT,                             -- 003
  cyber_security_review_file  JSONB,                            -- 003
  saas_file                   JSONB,                            -- 003
  nda_documents               JSONB DEFAULT '[]',
  legal_documents             JSONB DEFAULT '[]',
  videos                      JSONB DEFAULT '[]',
  costs                       JSONB DEFAULT '{"capex":[],"opex":[]}',
  -- Construction-framework matching fields (021)
  secondary_value_drivers     TEXT[],
  applicable_stakeholders     TEXT[],
  project_lifecycle_stages    TEXT[],
  project_types               TEXT[],
  project_location            TEXT[],
  applicable_project_size     TEXT[],
  applicable_project_value    TEXT[],
  technology_category         TEXT[],
  implementation_complexity   TEXT,
  investment_level            TEXT,
  change_management_effort    TEXT,
  deployment_type             TEXT[],
  visibility                  TEXT,                             -- 025 (Internal/Global)
  project_complexity          TEXT,                             -- 025 (Simple/Challenging/Complex)
  -- NOTE: migration 001 also declares build_departments, founded_year,
  -- funding_received, founder, innovo_engagement_type, introducer_recommendation,
  -- but these DO NOT EXIST in production (verified). Prod was not built from 001.
  -- Full-text search: generated, STORED. This is the ACTUAL live definition
  -- (verified) — it indexes only these 6 fields and differs from migration 002,
  -- which also lists founder, whats_great, whats_lacking and next_steps. So prod
  -- FTS does NOT search what's-great / what's-lacking / next-steps.
  search_vector               tsvector GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(company,'')||' '||coalesce(product,'')||' '||coalesce(description,'')||' '||
      coalesce(sector,'')||' '||coalesce(keywords,'')||' '||coalesce(hq_country,''))
  ) STORED,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 020: auto-generated human IDs (STU-000, STU-001, …)
CREATE SEQUENCE IF NOT EXISTS startup_id_seq START 0 MINVALUE 0 INCREMENT 1;
CREATE OR REPLACE FUNCTION assign_startup_id() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.startup_id IS NULL THEN
    NEW.startup_id := 'STU-' || LPAD(nextval('startup_id_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_assign_startup_id BEFORE INSERT ON startups
  FOR EACH ROW EXECUTE FUNCTION assign_startup_id();

-- ── timeline_events (001; FK col renamed 023; created_by SET NULL 008) ───────
CREATE TABLE timeline_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  startup_id      UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  status          TEXT NOT NULL,
  rating          TEXT,
  feedback        TEXT,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by_name TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── comments (001; FK col renamed 023; user_id SET NULL 008) ─────────────────
CREATE TABLE comments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name  TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── user_ratings (001; FK col renamed 023; user_id CASCADE 008) ──────────────
CREATE TABLE user_ratings (
  startup_id UUID    NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  user_id    UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name  TEXT    NOT NULL,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (startup_id, user_id)
);

-- ── ideas (001; linked col renamed 023; submitted_by SET NULL 008) ──────────
CREATE TABLE ideas (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submitted_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  submitted_by_name    TEXT NOT NULL,
  submitted_by_dept    TEXT NOT NULL,
  problem_title        TEXT NOT NULL,
  problem_description  TEXT NOT NULL,
  current_process      TEXT,
  impact_if_solved     TEXT,
  estimated_time_saved TEXT,
  affected_teams       TEXT[],
  urgency              TEXT NOT NULL DEFAULT 'Medium',
  suggested_solution   TEXT,
  has_tried_before     BOOLEAN DEFAULT FALSE,
  tried_before_details TEXT,
  expected_benefits    TEXT,
  any_budget_in_mind   TEXT,
  status               TEXT NOT NULL DEFAULT 'Submitted',
  linked_startup_id    UUID REFERENCES startups(id),
  review_notes         TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── audit_entries (001; FK col renamed 023; both FKs SET NULL 008) ──────────
CREATE TABLE audit_entries (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name    TEXT NOT NULL,
  startup_id   UUID REFERENCES startups(id) ON DELETE SET NULL,
  company_name TEXT,
  action       TEXT NOT NULL,
  old_value    TEXT,
  new_value    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── news_articles (004) ──────────────────────────────────────────────────────
CREATE TABLE news_articles (
  id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  title              TEXT NOT NULL,
  excerpt            TEXT,
  content            TEXT,
  categories         TEXT[] NOT NULL DEFAULT '{}',
  thumbnail_url      TEXT,                                      -- Storage URL (current flow)
  thumbnail_data_url TEXT,                                      -- legacy inline base64
  article_images     JSONB NOT NULL DEFAULT '[]',
  video_data_url     TEXT,
  source             TEXT,
  author             TEXT,
  published_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_custom          BOOLEAN NOT NULL DEFAULT FALSE,
  created_by         UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ── collaborations (009; images 005) ─────────────────────────────────────────
CREATE TABLE collaborations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner           TEXT NOT NULL,
  type              TEXT NOT NULL DEFAULT 'University',
  focus_area        TEXT,
  description       TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'Not Started',
  detailed_overview TEXT,
  current_status    TEXT,
  next_steps        TEXT,
  images            JSONB NOT NULL DEFAULT '[]',                -- [{id, dataUrl(=Storage URL), caption}]
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()   -- added by migration 027
  -- BUG (pre-027): prod had the trg_collaborations_updated trigger (009) but NOT
  -- this column, so every UPDATE errored ("record new has no field updated_at").
  -- Migration 027 adds the column. Apply 027 to production to fix collab editing.
);

-- ── challenges (009) ─────────────────────────────────────────────────────────
CREATE TABLE challenges (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number                   INTEGER NOT NULL DEFAULT 0,
  title                    TEXT NOT NULL,
  short_description        TEXT,
  overview                 TEXT,
  key_challenges           JSONB NOT NULL DEFAULT '[]',
  innovation_opportunities JSONB NOT NULL DEFAULT '[]',
  business_impact          JSONB NOT NULL DEFAULT '[]',
  use_cases                JSONB NOT NULL DEFAULT '[]',
  strategic_focus_areas    JSONB NOT NULL DEFAULT '[]',
  is_custom                BOOLEAN NOT NULL DEFAULT FALSE,
  created_by               UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── initiatives  (was `initiatives_board`; 009 + 006,010,011,012,015,017,025) ─
-- The delivery board. NOTE: business_units/departments/value_drivers/documents/
-- evaluations/contributors are JSONB here (unlike startups, where the arrays are
-- TEXT[]); the framework-matching columns added in 010/011 are TEXT[].
CREATE TABLE initiatives (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  initiative_id             TEXT UNIQUE NOT NULL,               -- "INIT-001" (normalized 016)
  name                      TEXT NOT NULL,
  description               TEXT,
  problem_statement         TEXT,
  proposed_solution         TEXT,
  value_drivers             JSONB NOT NULL DEFAULT '[]',
  potential_cost_saving     NUMERIC,
  potential_time_saving     NUMERIC,
  potential_quality_saving  NUMERIC,                            -- 006
  potential_safety_impact   NUMERIC,                            -- 006
  potential_esg_offset      NUMERIC,                            -- 006
  identified_solution       TEXT,
  linked_startup            TEXT,
  business_units            JSONB NOT NULL DEFAULT '[]',
  departments               JSONB NOT NULL DEFAULT '[]',
  priority                  TEXT NOT NULL DEFAULT 'Medium',
  status                    TEXT NOT NULL DEFAULT 'Not Started',
  progress                  INTEGER,
  next_steps                TEXT,
  lessons_learnt            TEXT,
  documents                 JSONB NOT NULL DEFAULT '[]',
  evaluations               JSONB NOT NULL DEFAULT '[]',
  contributors              JSONB NOT NULL DEFAULT '[]',        -- 015
  -- Framework matching fields (010/011); business_functions added in 010, dropped 017
  applicable_stakeholders   TEXT[] NOT NULL DEFAULT '{}',
  project_lifecycle_stages  TEXT[] NOT NULL DEFAULT '{}',
  secondary_value_drivers   TEXT[] NOT NULL DEFAULT '{}',
  project_types             TEXT[] NOT NULL DEFAULT '{}',
  project_location          TEXT[] NOT NULL DEFAULT '{}',
  applicable_project_size   TEXT[] NOT NULL DEFAULT '{}',
  applicable_project_value  TEXT[] NOT NULL DEFAULT '{}',
  technology_category       TEXT[] NOT NULL DEFAULT '{}',
  implementation_complexity TEXT,
  investment_level          TEXT,
  change_management_effort  TEXT,
  deployment_type           TEXT[] NOT NULL DEFAULT '{}',
  visibility                TEXT,                               -- 025
  project_complexity        TEXT,                               -- 025
  created_by                UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── rate_limit_entries (007) — distributed serverless rate limiter ──────────
CREATE TABLE rate_limit_entries (
  key      TEXT PRIMARY KEY,
  count    INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL
);

-- ============================================================================
-- Indexes
-- ============================================================================
-- startups
CREATE INDEX idx_startups_dept           ON startups(department_id);
CREATE INDEX idx_startups_status         ON startups(collaboration_status);
CREATE INDEX idx_startups_created_by     ON startups(created_by);
CREATE INDEX idx_startups_search         ON startups USING GIN(search_vector);
CREATE INDEX idx_startups_business_units ON startups USING GIN(business_units);    -- 026
CREATE INDEX idx_startups_departments    ON startups USING GIN(departments);       -- 026
CREATE INDEX idx_startups_created_at     ON startups(created_at DESC);             -- 026
CREATE INDEX idx_startups_lower_company  ON startups(LOWER(company));              -- 026
-- children of startups
CREATE INDEX idx_timeline_startup        ON timeline_events(startup_id);
CREATE INDEX idx_comments_startup        ON comments(startup_id);
CREATE INDEX idx_ratings_startup         ON user_ratings(startup_id);
-- ideas / audit
CREATE INDEX idx_ideas_submitted_by         ON ideas(submitted_by);
CREATE INDEX idx_ideas_status               ON ideas(status);                          -- 008
CREATE INDEX idx_ideas_submitted_created    ON ideas(submitted_by, created_at DESC);  -- 026
CREATE INDEX idx_ideas_linked_startup       ON ideas(linked_startup_id);              -- 043
CREATE INDEX idx_ideas_problem_title_trgm   ON ideas USING GIN(problem_title gin_trgm_ops);      -- 043
CREATE INDEX idx_ideas_submitted_by_name_trgm ON ideas USING GIN(submitted_by_name gin_trgm_ops); -- 043
CREATE INDEX idx_ideas_idea_ref_trgm        ON ideas USING GIN(idea_ref gin_trgm_ops);           -- 043
CREATE INDEX idx_audit_startup           ON audit_entries(startup_id);
CREATE INDEX idx_audit_user              ON audit_entries(user_id);
CREATE INDEX idx_audit_created_at        ON audit_entries(created_at DESC);         -- 026
-- rate limit
CREATE INDEX idx_rate_limit_reset_at     ON rate_limit_entries(reset_at);
-- initiatives (board)
CREATE INDEX idx_initiatives_initiative_id      ON initiatives(initiative_id);
CREATE INDEX idx_initiatives_status             ON initiatives(status);
CREATE INDEX idx_initiatives_priority           ON initiatives(priority);
CREATE INDEX idx_initiatives_created_at         ON initiatives(created_at DESC);                       -- 026
CREATE INDEX idx_initiatives_name_trgm          ON initiatives USING GIN(name gin_trgm_ops);           -- 026
CREATE INDEX idx_initiatives_description_trgm   ON initiatives USING GIN(description gin_trgm_ops);    -- 026
CREATE INDEX idx_initiatives_initiative_id_trgm ON initiatives USING GIN(initiative_id gin_trgm_ops);  -- 026
CREATE INDEX idx_initiatives_board_stakeholders     ON initiatives USING GIN(applicable_stakeholders);  -- 010 (name not renamed)
CREATE INDEX idx_initiatives_board_lifecycle_stages ON initiatives USING GIN(project_lifecycle_stages); -- 010
CREATE INDEX idx_initiatives_board_project_types    ON initiatives USING GIN(project_types);            -- 011
CREATE INDEX idx_initiatives_board_tech_category    ON initiatives USING GIN(technology_category);      -- 011
-- challenges / news / collaborations
CREATE INDEX idx_challenges_number         ON challenges(number);
CREATE INDEX idx_news_published_at         ON news_articles(published_at DESC);    -- 026
CREATE INDEX idx_collaborations_created_at ON collaborations(created_at DESC);     -- 026

-- ============================================================================
-- updated_at trigger (shared) — applied to tables with an updated_at column
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated          BEFORE UPDATE ON users          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_startups_updated       BEFORE UPDATE ON startups       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_ideas_updated          BEFORE UPDATE ON ideas          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_initiatives_updated    BEFORE UPDATE ON initiatives    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_collaborations_updated BEFORE UPDATE ON collaborations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- ^ present in prod since 009, but only valid once migration 027 adds
--   collaborations.updated_at; before 027 it errors on every collaboration UPDATE.

-- ============================================================================
-- Row Level Security (013, 024)
-- ============================================================================
-- Every table has RLS ENABLED with NO permissive policies. The app connects with
-- the service role (which bypasses RLS); this blocks any direct anon/public REST
-- access via the Supabase API. Tables: all of the above + schema_migrations.
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE startups           ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_articles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges         ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiatives        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_migrations  ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- LATER MIGRATIONS (030–043) — deltas not folded into the blocks above
-- ============================================================================
-- 030 humanize_sso_names            — one-off data backfill of users.name.
-- 031 notifications_read_at         — notifications table gains read_at (per-user
--                                     read receipts).
-- 032 seed_challenges               — seed data only.
-- 033 startups_value_drivers        — startups.value_drivers TEXT[].
-- 034 startups_value_tracker        — startups gains potential_cost_saving,
--                                     potential_time_saving, potential_quality_saving,
--                                     potential_safety_impact, potential_esg_offset (NUMERIC).
-- 035 ideas_benefit_tracker         — ideas gains benefit_drivers TEXT[],
--                                     benefit_cost_saving / benefit_time_saving /
--                                     benefit_quality / benefit_safety / benefit_esg (NUMERIC),
--                                     benefit_business_units / benefit_departments (TEXT[]).
-- 036 idea_status_history           — new table idea_status_history
--                                     (id, idea_id FK→ideas ON DELETE CASCADE, from_status,
--                                      to_status, changed_by, changed_by_name, changed_by_email,
--                                      created_at); super-admin-only status timeline.
-- 037 idea_status_history_note      — idea_status_history.note TEXT (reviewer feedback).
-- 038 idea_status_converted_...     — data rename "Converted to Startup" → "Converted to Initiative".
-- 039 add_idea_ref                  — ideas.idea_ref TEXT UNIQUE, auto "IDEA-000" via
--                                     sequence idea_ref_seq + BEFORE INSERT trigger.
-- 040 comments_on_ideas             — comments.startup_id made NULLABLE; comments gains
--                                     idea_id UUID FK→ideas ON DELETE CASCADE; a comment now
--                                     belongs to exactly one of startup_id / idea_id.
--                                     Index: idx_comments_idea ON comments(idea_id).
-- 041 idea_contributors             — ideas.contributors JSONB DEFAULT '[]'
--                                     (array of {id,name,email,role}; super-admin assigned).
-- 042 drop_otp_and_investments      — DROP TABLE otp_codes, investments (retired features).
-- 043 schema_review_fixes           — DROP COLUMN users.can_view_executive (dead);
--                                     add idx_ideas_linked_startup and trigram GIN indexes
--                                     idx_ideas_problem_title_trgm / _submitted_by_name_trgm /
--                                     _idea_ref_trgm to back the ideas list ILIKE search.
