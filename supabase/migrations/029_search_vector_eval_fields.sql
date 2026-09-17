-- Migration 029: Re-include evaluation fields in startups full-text search.
--
-- Production's search_vector indexed only company, product, description, sector,
-- keywords, hq_country — so global startup search never matched text in
-- what's-great / what's-lacking / next-steps. This rebuilds the generated column
-- to include those three (matching migration 002's original intent, minus the
-- `founder` column, which doesn't exist in production).
--
-- A generated column's expression cannot be ALTERed in place, so we drop and
-- recreate it. Dropping the column also drops idx_startups_search, so the GIN
-- index is recreated afterwards. Safe on a small table; idempotent-ish (guarded
-- with IF EXISTS / re-add).

DROP INDEX IF EXISTS idx_startups_search;
ALTER TABLE startups DROP COLUMN IF EXISTS search_vector;

ALTER TABLE startups
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(company, '')      || ' ' ||
      coalesce(product, '')      || ' ' ||
      coalesce(description, '')   || ' ' ||
      coalesce(sector, '')        || ' ' ||
      coalesce(keywords, '')      || ' ' ||
      coalesce(hq_country, '')    || ' ' ||
      coalesce(whats_great, '')   || ' ' ||
      coalesce(whats_lacking, '') || ' ' ||
      coalesce(next_steps, '')
    )
  ) STORED;

CREATE INDEX idx_startups_search ON startups USING GIN(search_vector);
