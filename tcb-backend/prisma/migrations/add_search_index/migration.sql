-- ─────────────────────────────────────────────
-- Full-Text Search with tsvector + GIN index
-- ─────────────────────────────────────────────

-- Add tsvector column for full-text search
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS "posts_search_vector_idx" ON "posts" USING GIN ("search_vector");

-- Create GIN index on content for JSONB queries (if content is stored as JSONB)
-- Since content is TEXT (stringified JSON), we create a functional index
CREATE INDEX IF NOT EXISTS "posts_title_trgm_idx" ON "posts" USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "posts_excerpt_trgm_idx" ON "posts" USING GIN (excerpt gin_trgm_ops);

-- Enable pg_trgm extension for trigram similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Function to update search_vector on insert/update
CREATE OR REPLACE FUNCTION posts_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.excerpt, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW."metaTitle", '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW."metaDesc", '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update search_vector
DROP TRIGGER IF EXISTS posts_search_vector_trigger ON "posts";
CREATE TRIGGER posts_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, excerpt, "metaTitle", "metaDesc"
  ON "posts"
  FOR EACH ROW
  EXECUTE FUNCTION posts_search_vector_update();

-- Backfill existing posts
UPDATE "posts" SET
  search_vector =
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(excerpt, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE("metaTitle", '')), 'B') ||
    setweight(to_tsvector('english', COALESCE("metaDesc", '')), 'C');

-- Index for search query logging
CREATE TABLE IF NOT EXISTS "search_query_logs" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "search_query_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "search_query_logs_query_idx" ON "search_query_logs" ("query");
CREATE INDEX IF NOT EXISTS "search_query_logs_createdAt_idx" ON "search_query_logs" ("createdAt");
