-- ============================================================
-- MIGRATION 025: Full-Text Search System
-- ============================================================
-- Enhanced full-text search with tsvector + pg_trgm for:
-- - items (title, brand, category, description)
-- - profiles (username, display_name, bio)
-- - restocks (store_name, description, location)
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- ITEMS - Full-Text Search Vector
-- ============================================================

-- Add search_vector column if not exists
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Update existing search vectors
UPDATE public.items
SET search_vector = to_tsvector('english',
  COALESCE(title, '') || ' ' ||
  COALESCE(brand, '') || ' ' ||
  COALESCE(category, '') || ' ' ||
  COALESCE(description, '')
);

-- Create GIN index on search_vector for fast full-text search
CREATE INDEX IF NOT EXISTS idx_items_search_vector
  ON public.items USING GIN(search_vector);

-- Create trigram index on title for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_items_title_trgm
  ON public.items USING GIN(title gin_trgm_ops);

-- Trigger to automatically update search_vector on INSERT/UPDATE
CREATE OR REPLACE FUNCTION update_items_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.title, '') || ' ' ||
    COALESCE(NEW.brand, '') || ' ' ||
    COALESCE(NEW.category, '') || ' ' ||
    COALESCE(NEW.description, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF NOT EXISTS trg_items_update_search_vector ON public.items;
CREATE TRIGGER trg_items_update_search_vector
  BEFORE INSERT OR UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION update_items_search_vector();

-- ============================================================
-- PROFILES - Full-Text Search Vector
-- ============================================================

-- Add search_vector column if not exists
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Update existing search vectors
UPDATE public.profiles
SET search_vector = to_tsvector('english',
  COALESCE(username, '') || ' ' ||
  COALESCE(display_name, '') || ' ' ||
  COALESCE(bio, '')
);

-- Create GIN index on search_vector for fast full-text search
CREATE INDEX IF NOT EXISTS idx_profiles_search_vector
  ON public.profiles USING GIN(search_vector);

-- Create trigram index on username for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm
  ON public.profiles USING GIN(username gin_trgm_ops);

-- Create trigram index on display_name for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm
  ON public.profiles USING GIN(display_name gin_trgm_ops);

-- Trigger to automatically update search_vector on INSERT/UPDATE
CREATE OR REPLACE FUNCTION update_profiles_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.username, '') || ' ' ||
    COALESCE(NEW.display_name, '') || ' ' ||
    COALESCE(NEW.bio, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF NOT EXISTS trg_profiles_update_search_vector ON public.profiles;
CREATE TRIGGER trg_profiles_update_search_vector
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_profiles_search_vector();

-- ============================================================
-- RESTOCKS - Full-Text Search Vector
-- ============================================================

-- Add search_vector column if not exists
ALTER TABLE public.restocks
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Update existing search vectors
UPDATE public.restocks
SET search_vector = to_tsvector('english',
  COALESCE(store_name, '') || ' ' ||
  COALESCE(description, '') || ' ' ||
  COALESCE(store_address, '') || ' ' ||
  COALESCE(item_found, '')
);

-- Create GIN index on search_vector for fast full-text search
CREATE INDEX IF NOT EXISTS idx_restocks_search_vector
  ON public.restocks USING GIN(search_vector);

-- Create trigram index on store_name for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_restocks_store_name_trgm
  ON public.restocks USING GIN(store_name gin_trgm_ops);

-- Trigger to automatically update search_vector on INSERT/UPDATE
CREATE OR REPLACE FUNCTION update_restocks_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.store_name, '') || ' ' ||
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(NEW.store_address, '') || ' ' ||
    COALESCE(NEW.item_found, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF NOT EXISTS trg_restocks_update_search_vector ON public.restocks;
CREATE TRIGGER trg_restocks_update_search_vector
  BEFORE INSERT OR UPDATE ON public.restocks
  FOR EACH ROW EXECUTE FUNCTION update_restocks_search_vector();

-- ============================================================
-- Search Analytics Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  search_type TEXT NOT NULL,  -- 'items', 'profiles', 'restocks', 'all'
  result_count INTEGER,
  clicked_entity_id UUID,     -- Which result was clicked (if any)
  clicked_entity_type TEXT,   -- Type of clicked result
  response_time_ms INTEGER,   -- Query latency
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_logs_user ON public.search_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_created ON public.search_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_logs_query ON public.search_logs(query);

-- Enable RLS on search_logs
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert own searches"
  ON public.search_logs FOR INSERT
  WITH CHECK (auth.uid() IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can view own searches"
  ON public.search_logs FOR SELECT
  USING (auth.uid() IS NULL OR auth.uid() = user_id);

-- ============================================================
-- Rate Limiting Table (for API rate limiting)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.search_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  search_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, window_start)
);

CREATE INDEX IF NOT EXISTS idx_search_rate_limits_user_window
  ON public.search_rate_limits(user_id, window_start);

-- Enable RLS on search_rate_limits
ALTER TABLE public.search_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own rate limits"
  ON public.search_rate_limits FOR ALL
  USING (auth.uid() = user_id);
