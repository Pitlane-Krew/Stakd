-- ============================================================
-- MIGRATION 018: Universal Search System
-- ============================================================
-- Full-text search across the master catalog with category
-- filtering, autocomplete support, and search analytics.
-- ============================================================

-- Search index table — denormalized for fast full-text search
-- Rebuilt periodically from master_items + variants + sets
CREATE TABLE IF NOT EXISTS search_index (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     TEXT NOT NULL,                   -- 'master_item', 'set', 'variant'
  entity_id       UUID NOT NULL,
  category_id     UUID NOT NULL REFERENCES collectible_categories(id) ON DELETE CASCADE,
  set_id          UUID REFERENCES collectible_sets(id) ON DELETE SET NULL,

  -- Searchable text fields
  title           TEXT NOT NULL,
  subtitle        TEXT,                            -- Set name, player name, etc.
  description     TEXT,
  search_text     TEXT NOT NULL,                   -- Concatenated searchable content
  search_vector   TSVECTOR,                        -- Pre-computed tsvector

  -- Display data (avoid joins for search results)
  image_url       TEXT,
  category_slug   TEXT NOT NULL,
  set_name        TEXT,
  attributes      JSONB NOT NULL DEFAULT '{}',     -- Key attributes for display/filtering

  -- Ranking signals
  popularity      INTEGER NOT NULL DEFAULT 0,
  has_price_data  BOOLEAN NOT NULL DEFAULT false,
  verified        BOOLEAN NOT NULL DEFAULT false,

  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id)
);

-- ============================================================
-- INDEXES for search
-- ============================================================

-- The main full-text search index
CREATE INDEX idx_search_vector ON search_index USING GIN(search_vector);

-- Category-scoped search (most common query pattern)
CREATE INDEX idx_search_category_vector ON search_index USING GIN(search_vector)
  WHERE entity_type = 'master_item';

-- Filtering indexes
CREATE INDEX idx_search_category ON search_index(category_id);
CREATE INDEX idx_search_category_slug ON search_index(category_slug);
CREATE INDEX idx_search_set ON search_index(set_id) WHERE set_id IS NOT NULL;
CREATE INDEX idx_search_popularity ON search_index(popularity DESC);
CREATE INDEX idx_search_verified ON search_index(verified) WHERE verified = true;
CREATE INDEX idx_search_attrs ON search_index USING GIN(attributes);

-- Trigram index for fuzzy/autocomplete (requires pg_trgm extension)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_search_title_trgm ON search_index USING GIN(title gin_trgm_ops);

-- ============================================================
-- FUNCTION: Build search text for an item
-- ============================================================
CREATE OR REPLACE FUNCTION build_search_text(
  p_name TEXT,
  p_description TEXT,
  p_set_name TEXT,
  p_attributes JSONB
) RETURNS TEXT AS $$
DECLARE
  v_text TEXT;
  v_key TEXT;
  v_val TEXT;
BEGIN
  v_text := COALESCE(p_name, '') || ' ' || COALESCE(p_description, '') || ' ' || COALESCE(p_set_name, '');

  -- Extract all string values from attributes
  FOR v_key, v_val IN SELECT key, value #>> '{}' FROM jsonb_each(p_attributes)
  LOOP
    IF v_val IS NOT NULL AND v_val != 'true' AND v_val != 'false' THEN
      v_text := v_text || ' ' || v_val;
    END IF;
  END LOOP;

  RETURN TRIM(v_text);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- FUNCTION: Upsert search index for a master item
-- ============================================================
CREATE OR REPLACE FUNCTION index_master_item(p_item_id UUID)
RETURNS void AS $$
DECLARE
  v_item RECORD;
  v_set_name TEXT;
  v_category_slug TEXT;
  v_search_text TEXT;
BEGIN
  SELECT * INTO v_item FROM master_items WHERE id = p_item_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT name INTO v_set_name FROM collectible_sets WHERE id = v_item.set_id;
  SELECT slug INTO v_category_slug FROM collectible_categories WHERE id = v_item.category_id;

  v_search_text := build_search_text(v_item.name, v_item.description, v_set_name, v_item.attributes);

  INSERT INTO search_index (
    entity_type, entity_id, category_id, set_id,
    title, subtitle, description, search_text, search_vector,
    image_url, category_slug, set_name, attributes,
    popularity, has_price_data, verified, updated_at
  ) VALUES (
    'master_item', v_item.id, v_item.category_id, v_item.set_id,
    v_item.name,
    COALESCE(v_set_name, v_item.attributes->>'player_name', v_item.attributes->>'series_name'),
    v_item.description,
    v_search_text,
    to_tsvector('english', v_search_text),
    v_item.image_url,
    v_category_slug,
    v_set_name,
    v_item.attributes,
    v_item.popularity,
    EXISTS(SELECT 1 FROM catalog_current_prices cp
           JOIN master_variants mv ON mv.id = cp.master_variant_id
           WHERE mv.master_item_id = v_item.id),
    v_item.verified,
    now()
  )
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    description = EXCLUDED.description,
    search_text = EXCLUDED.search_text,
    search_vector = EXCLUDED.search_vector,
    image_url = EXCLUDED.image_url,
    set_name = EXCLUDED.set_name,
    attributes = EXCLUDED.attributes,
    popularity = EXCLUDED.popularity,
    has_price_data = EXCLUDED.has_price_data,
    verified = EXCLUDED.verified,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Universal search query
-- ============================================================
CREATE OR REPLACE FUNCTION search_catalog(
  p_query TEXT,
  p_category_slug TEXT DEFAULT NULL,
  p_set_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  entity_type TEXT,
  entity_id UUID,
  title TEXT,
  subtitle TEXT,
  image_url TEXT,
  category_slug TEXT,
  set_name TEXT,
  attributes JSONB,
  popularity INTEGER,
  has_price_data BOOLEAN,
  verified BOOLEAN,
  rank REAL
) AS $$
DECLARE
  v_tsquery TSQUERY;
BEGIN
  -- Build tsquery with prefix matching for autocomplete
  v_tsquery := websearch_to_tsquery('english', p_query);

  RETURN QUERY
  SELECT
    si.entity_type,
    si.entity_id,
    si.title,
    si.subtitle,
    si.image_url,
    si.category_slug,
    si.set_name,
    si.attributes,
    si.popularity,
    si.has_price_data,
    si.verified,
    (ts_rank_cd(si.search_vector, v_tsquery) * 100
     + CASE WHEN si.verified THEN 10 ELSE 0 END
     + CASE WHEN si.has_price_data THEN 5 ELSE 0 END
     + (si.popularity::real / 1000)
     + similarity(si.title, p_query) * 50
    )::REAL AS rank
  FROM search_index si
  WHERE
    (si.search_vector @@ v_tsquery OR similarity(si.title, p_query) > 0.15)
    AND (p_category_slug IS NULL OR si.category_slug = p_category_slug)
    AND (p_set_id IS NULL OR si.set_id = p_set_id)
  ORDER BY rank DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- FUNCTION: Autocomplete (fast prefix search)
-- ============================================================
CREATE OR REPLACE FUNCTION search_autocomplete(
  p_query TEXT,
  p_category_slug TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 8
)
RETURNS TABLE (
  entity_id UUID,
  title TEXT,
  subtitle TEXT,
  image_url TEXT,
  category_slug TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    si.entity_id,
    si.title,
    si.subtitle,
    si.image_url,
    si.category_slug
  FROM search_index si
  WHERE
    si.entity_type = 'master_item'
    AND (si.title ILIKE p_query || '%' OR similarity(si.title, p_query) > 0.2)
    AND (p_category_slug IS NULL OR si.category_slug = p_category_slug)
  ORDER BY
    CASE WHEN si.title ILIKE p_query || '%' THEN 0 ELSE 1 END,
    similarity(si.title, p_query) DESC,
    si.popularity DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- Search analytics (track what people search for)
-- ============================================================
CREATE TABLE IF NOT EXISTS search_analytics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id),       -- null for anonymous
  query       TEXT NOT NULL,
  category    TEXT,
  result_count INTEGER,
  clicked_id  UUID,                                -- Which result they clicked
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_search_analytics_query ON search_analytics(query);
CREATE INDEX idx_search_analytics_date ON search_analytics(created_at DESC);

-- ============================================================
-- TRIGGER: Auto-index on master_items insert/update
-- ============================================================
CREATE OR REPLACE FUNCTION trg_index_master_item()
RETURNS trigger AS $$
BEGIN
  PERFORM index_master_item(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_master_item_search_index
  AFTER INSERT OR UPDATE ON master_items
  FOR EACH ROW EXECUTE FUNCTION trg_index_master_item();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "search_index_public_read" ON search_index FOR SELECT USING (true);
CREATE POLICY "search_analytics_insert" ON search_analytics
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR user_id IS NULL);
CREATE POLICY "search_analytics_admin_read" ON search_analytics
  FOR SELECT USING (is_admin(auth.uid()));
