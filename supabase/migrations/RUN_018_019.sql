-- ============================================================
-- STAKD: Run Migrations 018 + 019 (paste into Supabase SQL Editor)
-- Search System + Data Ingestion
-- ============================================================

-- ===================== 018: SEARCH SYSTEM =====================

CREATE TABLE IF NOT EXISTS search_index (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  category_id     UUID NOT NULL REFERENCES collectible_categories(id) ON DELETE CASCADE,
  set_id          UUID REFERENCES collectible_sets(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  subtitle        TEXT,
  description     TEXT,
  search_text     TEXT NOT NULL,
  search_vector   TSVECTOR,
  image_url       TEXT,
  category_slug   TEXT NOT NULL,
  set_name        TEXT,
  attributes      JSONB NOT NULL DEFAULT '{}',
  popularity      INTEGER NOT NULL DEFAULT 0,
  has_price_data  BOOLEAN NOT NULL DEFAULT false,
  verified        BOOLEAN NOT NULL DEFAULT false,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_search_vector ON search_index USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_search_category_vector ON search_index USING GIN(search_vector) WHERE entity_type = 'master_item';
CREATE INDEX IF NOT EXISTS idx_search_category ON search_index(category_id);
CREATE INDEX IF NOT EXISTS idx_search_category_slug ON search_index(category_slug);
CREATE INDEX IF NOT EXISTS idx_search_set ON search_index(set_id) WHERE set_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_search_popularity ON search_index(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_search_verified ON search_index(verified) WHERE verified = true;
CREATE INDEX IF NOT EXISTS idx_search_attrs ON search_index USING GIN(attributes);

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_search_title_trgm ON search_index USING GIN(title gin_trgm_ops);

CREATE OR REPLACE FUNCTION build_search_text(
  p_name TEXT, p_description TEXT, p_set_name TEXT, p_attributes JSONB
) RETURNS TEXT AS $$
DECLARE
  v_text TEXT;
  v_key TEXT;
  v_val TEXT;
BEGIN
  v_text := COALESCE(p_name, '') || ' ' || COALESCE(p_description, '') || ' ' || COALESCE(p_set_name, '');
  FOR v_key, v_val IN SELECT key, value #>> '{}' FROM jsonb_each(p_attributes)
  LOOP
    IF v_val IS NOT NULL AND v_val != 'true' AND v_val != 'false' THEN
      v_text := v_text || ' ' || v_val;
    END IF;
  END LOOP;
  RETURN TRIM(v_text);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

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
    v_item.description, v_search_text, to_tsvector('english', v_search_text),
    v_item.image_url, v_category_slug, v_set_name, v_item.attributes,
    v_item.popularity,
    EXISTS(SELECT 1 FROM catalog_current_prices cp JOIN master_variants mv ON mv.id = cp.master_variant_id WHERE mv.master_item_id = v_item.id),
    v_item.verified, now()
  )
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, description = EXCLUDED.description,
    search_text = EXCLUDED.search_text, search_vector = EXCLUDED.search_vector,
    image_url = EXCLUDED.image_url, set_name = EXCLUDED.set_name, attributes = EXCLUDED.attributes,
    popularity = EXCLUDED.popularity, has_price_data = EXCLUDED.has_price_data,
    verified = EXCLUDED.verified, updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION search_catalog(
  p_query TEXT, p_category_slug TEXT DEFAULT NULL, p_set_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20, p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  entity_type TEXT, entity_id UUID, title TEXT, subtitle TEXT, image_url TEXT,
  category_slug TEXT, set_name TEXT, attributes JSONB, popularity INTEGER,
  has_price_data BOOLEAN, verified BOOLEAN, rank REAL
) AS $$
DECLARE
  v_tsquery TSQUERY;
BEGIN
  v_tsquery := websearch_to_tsquery('english', p_query);
  RETURN QUERY
  SELECT si.entity_type, si.entity_id, si.title, si.subtitle, si.image_url,
    si.category_slug, si.set_name, si.attributes, si.popularity,
    si.has_price_data, si.verified,
    (ts_rank_cd(si.search_vector, v_tsquery) * 100
     + CASE WHEN si.verified THEN 10 ELSE 0 END
     + CASE WHEN si.has_price_data THEN 5 ELSE 0 END
     + (si.popularity::real / 1000)
     + similarity(si.title, p_query) * 50
    )::REAL AS rank
  FROM search_index si
  WHERE (si.search_vector @@ v_tsquery OR similarity(si.title, p_query) > 0.15)
    AND (p_category_slug IS NULL OR si.category_slug = p_category_slug)
    AND (p_set_id IS NULL OR si.set_id = p_set_id)
  ORDER BY rank DESC LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION search_autocomplete(
  p_query TEXT, p_category_slug TEXT DEFAULT NULL, p_limit INTEGER DEFAULT 8
)
RETURNS TABLE (entity_id UUID, title TEXT, subtitle TEXT, image_url TEXT, category_slug TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT si.entity_id, si.title, si.subtitle, si.image_url, si.category_slug
  FROM search_index si
  WHERE si.entity_type = 'master_item'
    AND (si.title ILIKE p_query || '%' OR similarity(si.title, p_query) > 0.2)
    AND (p_category_slug IS NULL OR si.category_slug = p_category_slug)
  ORDER BY
    CASE WHEN si.title ILIKE p_query || '%' THEN 0 ELSE 1 END,
    similarity(si.title, p_query) DESC, si.popularity DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE TABLE IF NOT EXISTS search_analytics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id),
  query       TEXT NOT NULL,
  category    TEXT,
  result_count INTEGER,
  clicked_id  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics(query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_date ON search_analytics(created_at DESC);

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

ALTER TABLE search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "search_index_public_read" ON search_index FOR SELECT USING (true);
CREATE POLICY "search_analytics_insert" ON search_analytics FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR user_id IS NULL);
CREATE POLICY "search_analytics_admin_read" ON search_analytics FOR SELECT USING (is_admin(auth.uid()));

-- ===================== 019: DATA INGESTION =====================

CREATE TABLE IF NOT EXISTS import_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     UUID NOT NULL REFERENCES collectible_categories(id),
  source          TEXT NOT NULL,
  source_version  TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  total_records   INTEGER NOT NULL DEFAULT 0,
  processed       INTEGER NOT NULL DEFAULT 0,
  inserted        INTEGER NOT NULL DEFAULT 0,
  updated         INTEGER NOT NULL DEFAULT 0,
  skipped         INTEGER NOT NULL DEFAULT 0,
  errors          INTEGER NOT NULL DEFAULT 0,
  error_log       JSONB NOT NULL DEFAULT '[]',
  started_by      UUID REFERENCES profiles(id),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS external_id_map (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  source          TEXT NOT NULL,
  external_id     TEXT NOT NULL,
  external_data   JSONB NOT NULL DEFAULT '{}',
  last_synced_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source, external_id)
);

CREATE TABLE IF NOT EXISTS import_staging (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  entity_type     TEXT NOT NULL,
  external_id     TEXT,
  data            JSONB NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  matched_id      UUID,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_category ON import_jobs(category_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created ON import_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ext_id_source ON external_id_map(source, external_id);
CREATE INDEX IF NOT EXISTS idx_ext_id_entity ON external_id_map(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_staging_job ON import_staging(job_id);
CREATE INDEX IF NOT EXISTS idx_staging_status ON import_staging(status);
CREATE INDEX IF NOT EXISTS idx_staging_external ON import_staging(external_id);

CREATE OR REPLACE FUNCTION upsert_from_import(
  p_job_id UUID, p_category_slug TEXT, p_set_slug TEXT, p_item_slug TEXT,
  p_item_name TEXT, p_attributes JSONB, p_external_source TEXT, p_external_id TEXT,
  p_image_url TEXT DEFAULT NULL, p_set_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL, p_set_position INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_category_id UUID;
  v_set_id UUID;
  v_item_id UUID;
  v_existing_id UUID;
BEGIN
  SELECT id INTO v_category_id FROM collectible_categories WHERE slug = p_category_slug;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown category: %', p_category_slug; END IF;

  IF p_set_slug IS NOT NULL THEN
    SELECT id INTO v_set_id FROM collectible_sets WHERE category_id = v_category_id AND slug = p_set_slug;
    IF NOT FOUND AND p_set_name IS NOT NULL THEN
      INSERT INTO collectible_sets (category_id, slug, name) VALUES (v_category_id, p_set_slug, p_set_name) RETURNING id INTO v_set_id;
    END IF;
  END IF;

  SELECT entity_id INTO v_existing_id FROM external_id_map WHERE source = p_external_source AND external_id = p_external_id;

  IF v_existing_id IS NOT NULL THEN
    UPDATE master_items SET name = COALESCE(p_item_name, name), attributes = attributes || p_attributes,
      image_url = COALESCE(p_image_url, image_url), description = COALESCE(p_description, description),
      set_position = COALESCE(p_set_position, set_position), updated_at = now()
    WHERE id = v_existing_id;
    UPDATE external_id_map SET last_synced_at = now() WHERE source = p_external_source AND external_id = p_external_id;
    RETURN v_existing_id;
  END IF;

  SELECT id INTO v_item_id FROM master_items WHERE category_id = v_category_id AND slug = p_item_slug;
  IF v_item_id IS NOT NULL THEN
    INSERT INTO external_id_map (entity_type, entity_id, source, external_id)
    VALUES ('item', v_item_id, p_external_source, p_external_id)
    ON CONFLICT (source, external_id) DO UPDATE SET entity_id = v_item_id, last_synced_at = now();
    RETURN v_item_id;
  END IF;

  INSERT INTO master_items (category_id, set_id, slug, name, description, image_url, set_position, attributes, verified)
  VALUES (v_category_id, v_set_id, p_item_slug, p_item_name, p_description, p_image_url, p_set_position, p_attributes, false)
  RETURNING id INTO v_item_id;

  INSERT INTO master_variants (master_item_id, slug, name, is_default) VALUES (v_item_id, 'base', 'Base', true);

  INSERT INTO external_id_map (entity_type, entity_id, source, external_id)
  VALUES ('item', v_item_id, p_external_source, p_external_id) ON CONFLICT (source, external_id) DO NOTHING;

  RETURN v_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_import_summary(p_job_id UUID)
RETURNS JSONB AS $$
DECLARE v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'job_id', ij.id, 'status', ij.status, 'source', ij.source,
    'total', ij.total_records, 'processed', ij.processed, 'inserted', ij.inserted,
    'updated', ij.updated, 'skipped', ij.skipped, 'errors', ij.errors,
    'duration_seconds', EXTRACT(EPOCH FROM (COALESCE(ij.completed_at, now()) - ij.started_at)),
    'error_sample', ij.error_log->0
  ) INTO v_result FROM import_jobs ij WHERE ij.id = p_job_id;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_id_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_staging ENABLE ROW LEVEL SECURITY;

CREATE POLICY "import_jobs_admin" ON import_jobs FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "ext_id_map_admin" ON external_id_map FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "staging_admin" ON import_staging FOR ALL USING (is_admin(auth.uid()));
