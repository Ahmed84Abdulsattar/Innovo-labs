-- Migration 004: news_articles table with categories TEXT[] array
-- Handles both fresh installs and upgrades from the old category TEXT column

CREATE TABLE IF NOT EXISTS news_articles (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  title               TEXT NOT NULL,
  excerpt             TEXT,
  content             TEXT,
  categories          TEXT[] NOT NULL DEFAULT '{}',
  thumbnail_url       TEXT,
  thumbnail_data_url  TEXT,
  article_images      JSONB NOT NULL DEFAULT '[]',
  video_data_url      TEXT,
  source              TEXT,
  author              TEXT,
  published_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_custom           BOOLEAN NOT NULL DEFAULT FALSE,
  created_by          UUID REFERENCES users(id) ON DELETE SET NULL
);

-- If the table already existed with the old singular 'category' column, migrate it
DO $$
BEGIN
  -- Add categories[] column if it doesn't exist yet
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'news_articles' AND column_name = 'categories'
  ) THEN
    ALTER TABLE news_articles ADD COLUMN categories TEXT[] NOT NULL DEFAULT '{}';
    UPDATE news_articles
      SET categories = ARRAY[category]
      WHERE category IS NOT NULL AND category <> '';
  END IF;

  -- Drop the old singular category column if it still exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'news_articles' AND column_name = 'category'
  ) THEN
    ALTER TABLE news_articles DROP COLUMN category;
  END IF;
END $$;
