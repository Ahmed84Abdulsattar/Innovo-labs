-- Migration 002: Add full-text search vector to initiatives

ALTER TABLE initiatives
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(company, '')          || ' ' ||
      coalesce(product, '')          || ' ' ||
      coalesce(description, '')      || ' ' ||
      coalesce(sector, '')           || ' ' ||
      coalesce(keywords, '')         || ' ' ||
      coalesce(founder, '')          || ' ' ||
      coalesce(hq_country, '')       || ' ' ||
      coalesce(whats_great, '')      || ' ' ||
      coalesce(whats_lacking, '')    || ' ' ||
      coalesce(next_steps, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_initiatives_search ON initiatives USING GIN(search_vector);
