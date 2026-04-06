-- ============================================================
-- MIGRATION 019: Data Ingestion & Deduplication System
-- ============================================================
-- Infrastructure for bulk importing collectible data (Pokémon sets,
-- sports card releases, etc.) with dedup protection and audit trail.
-- ============================================================

-- Import jobs: tracks each bulk import operation
CREATE TABLE IF NOT EXISTS import_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     UUID NOT NULL REFERENCES collectible_categories(id),
  source          TEXT NOT NULL,                   -- 'pokemon_tcg_api', 'manual_csv', 'tcgplayer_api', 'ebay_api'
  source_version  TEXT,                            -- API version or file hash
  status          TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed, cancelled
  total_records   INTEGER NOT NULL DEFAULT 0,
  processed       INTEGER NOT NULL DEFAULT 0,
  inserted        INTEGER NOT NULL DEFAULT 0,
  updated         INTEGER NOT NULL DEFAULT 0,
  skipped         INTEGER NOT NULL DEFAULT 0,
  errors          INTEGER NOT NULL DEFAULT 0,
  error_log       JSONB NOT NULL DEFAULT '[]',     -- [{record: ..., error: ...}]
  started_by      UUID REFERENCES profiles(id),    -- null = system/cron
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}',     -- Import-specific config
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deduplication: external ID mapping
-- Maps external IDs (from APIs, CSVs) to our internal UUIDs
CREATE TABLE IF NOT EXISTS external_id_map (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     TEXT NOT NULL,                   -- 'set', 'item', 'variant'
  entity_id       UUID NOT NULL,                   -- Our internal UUID
  source          TEXT NOT NULL,                   -- 'pokemon_tcg_api', 'tcgplayer', 'cardmarket'
  external_id     TEXT NOT NULL,                   -- The external system's ID
  external_data   JSONB NOT NULL DEFAULT '{}',     -- Raw data from source for reference
  last_synced_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source, external_id)
);

-- Import staging table: temporary holding for incoming data
-- Data lands here first, gets validated, then merged into master tables
CREATE TABLE IF NOT EXISTS import_staging (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  entity_type     TEXT NOT NULL,                   -- 'set', 'item', 'variant'
  external_id     TEXT,
  data            JSONB NOT NULL,                  -- Raw incoming record
  status          TEXT NOT NULL DEFAULT 'pending', -- pending, matched, inserted, updated, error
  matched_id      UUID,                            -- Matched existing record (if any)
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_import_jobs_status ON import_jobs(status);
CREATE INDEX idx_import_jobs_category ON import_jobs(category_id);
CREATE INDEX idx_import_jobs_created ON import_jobs(created_at DESC);

CREATE INDEX idx_ext_id_source ON external_id_map(source, external_id);
CREATE INDEX idx_ext_id_entity ON external_id_map(entity_type, entity_id);

CREATE INDEX idx_staging_job ON import_staging(job_id);
CREATE INDEX idx_staging_status ON import_staging(status);
CREATE INDEX idx_staging_external ON import_staging(external_id);

-- ============================================================
-- FUNCTION: Upsert a master item from import data
-- ============================================================
CREATE OR REPLACE FUNCTION upsert_from_import(
  p_job_id UUID,
  p_category_slug TEXT,
  p_set_slug TEXT,
  p_item_slug TEXT,
  p_item_name TEXT,
  p_attributes JSONB,
  p_external_source TEXT,
  p_external_id TEXT,
  p_image_url TEXT DEFAULT NULL,
  p_set_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_set_position INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_category_id UUID;
  v_set_id UUID;
  v_item_id UUID;
  v_existing_id UUID;
BEGIN
  -- Resolve category
  SELECT id INTO v_category_id FROM collectible_categories WHERE slug = p_category_slug;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown category: %', p_category_slug;
  END IF;

  -- Resolve or create set
  IF p_set_slug IS NOT NULL THEN
    SELECT id INTO v_set_id FROM collectible_sets
    WHERE category_id = v_category_id AND slug = p_set_slug;

    IF NOT FOUND AND p_set_name IS NOT NULL THEN
      INSERT INTO collectible_sets (category_id, slug, name)
      VALUES (v_category_id, p_set_slug, p_set_name)
      RETURNING id INTO v_set_id;
    END IF;
  END IF;

  -- Check external ID map for existing record
  SELECT entity_id INTO v_existing_id
  FROM external_id_map
  WHERE source = p_external_source AND external_id = p_external_id;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing item
    UPDATE master_items SET
      name = COALESCE(p_item_name, name),
      attributes = attributes || p_attributes,
      image_url = COALESCE(p_image_url, image_url),
      description = COALESCE(p_description, description),
      set_position = COALESCE(p_set_position, set_position),
      updated_at = now()
    WHERE id = v_existing_id;

    -- Update sync timestamp
    UPDATE external_id_map SET last_synced_at = now()
    WHERE source = p_external_source AND external_id = p_external_id;

    RETURN v_existing_id;
  END IF;

  -- Try to match by slug (in case item exists but wasn't imported before)
  SELECT id INTO v_item_id FROM master_items
  WHERE category_id = v_category_id AND slug = p_item_slug;

  IF v_item_id IS NOT NULL THEN
    -- Map existing item to external ID
    INSERT INTO external_id_map (entity_type, entity_id, source, external_id)
    VALUES ('item', v_item_id, p_external_source, p_external_id)
    ON CONFLICT (source, external_id) DO UPDATE SET
      entity_id = v_item_id, last_synced_at = now();

    RETURN v_item_id;
  END IF;

  -- Insert new item
  INSERT INTO master_items (
    category_id, set_id, slug, name, description,
    image_url, set_position, attributes, verified
  ) VALUES (
    v_category_id, v_set_id, p_item_slug, p_item_name, p_description,
    p_image_url, p_set_position, p_attributes, false
  )
  RETURNING id INTO v_item_id;

  -- Create default variant
  INSERT INTO master_variants (master_item_id, slug, name, is_default)
  VALUES (v_item_id, 'base', 'Base', true);

  -- Map to external ID
  INSERT INTO external_id_map (entity_type, entity_id, source, external_id)
  VALUES ('item', v_item_id, p_external_source, p_external_id)
  ON CONFLICT (source, external_id) DO NOTHING;

  RETURN v_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Get import job summary
-- ============================================================
CREATE OR REPLACE FUNCTION get_import_summary(p_job_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'job_id', ij.id,
    'status', ij.status,
    'source', ij.source,
    'total', ij.total_records,
    'processed', ij.processed,
    'inserted', ij.inserted,
    'updated', ij.updated,
    'skipped', ij.skipped,
    'errors', ij.errors,
    'duration_seconds', EXTRACT(EPOCH FROM (COALESCE(ij.completed_at, now()) - ij.started_at)),
    'error_sample', ij.error_log->0
  ) INTO v_result
  FROM import_jobs ij WHERE ij.id = p_job_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_id_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_staging ENABLE ROW LEVEL SECURITY;

-- Admin only
CREATE POLICY "import_jobs_admin" ON import_jobs
  FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "ext_id_map_admin" ON external_id_map
  FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "staging_admin" ON import_staging
  FOR ALL USING (is_admin(auth.uid()));
