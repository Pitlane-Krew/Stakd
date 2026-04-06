-- ============================================================
-- MIGRATION 017: User Collection ↔ Master Catalog Link
-- ============================================================
-- Bridges user-owned items to the master catalog.
-- Users add items from the catalog to their collection,
-- with personal overrides (condition, notes, photos).
-- ============================================================

-- Link table: user's item → master catalog entry
-- This is the PRIMARY way users add items to their collection going forward
CREATE TABLE IF NOT EXISTS user_collection_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  collection_id     UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  master_item_id    UUID REFERENCES master_items(id) ON DELETE SET NULL,     -- null = custom/manual item
  master_variant_id UUID REFERENCES master_variants(id) ON DELETE SET NULL,
  condition_id      UUID REFERENCES condition_scales(id),

  -- User overrides (personal data that differs from master)
  custom_title      TEXT,                          -- Override display name
  custom_image_urls TEXT[],                        -- User's own photos
  notes             TEXT,                          -- Personal notes
  purchase_price    NUMERIC(12,2),
  purchase_date     DATE,
  purchase_source   TEXT,                          -- 'lcs', 'ebay', 'target', 'trade', etc.

  -- For fully custom items (no master_item_id)
  custom_attributes JSONB NOT NULL DEFAULT '{}',   -- Freeform attributes for manual entries

  -- Status flags
  is_for_sale       BOOLEAN NOT NULL DEFAULT false,
  is_for_trade      BOOLEAN NOT NULL DEFAULT false,
  sale_price        NUMERIC(12,2),
  is_graded         BOOLEAN NOT NULL DEFAULT false,
  grade_value       TEXT,
  grading_company   TEXT,
  cert_number       TEXT,                          -- Grading cert number

  -- Quantity (for sealed product, duplicates)
  quantity          INTEGER NOT NULL DEFAULT 1,

  -- Computed (updated by triggers/cron)
  current_value     NUMERIC(12,2),                 -- Pulled from catalog_current_prices
  value_updated_at  TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Set completion tracking
CREATE TABLE IF NOT EXISTS user_set_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  set_id          UUID NOT NULL REFERENCES collectible_sets(id) ON DELETE CASCADE,
  items_owned     INTEGER NOT NULL DEFAULT 0,
  items_total     INTEGER NOT NULL DEFAULT 0,       -- Cached from collectible_sets.total_items
  completion_pct  NUMERIC(5,2) NOT NULL DEFAULT 0,  -- 0.00 to 100.00
  last_item_added TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, set_id)
);

-- Want list v2: linked to master catalog
CREATE TABLE IF NOT EXISTS user_want_list (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  master_item_id    UUID REFERENCES master_items(id) ON DELETE CASCADE,
  master_variant_id UUID REFERENCES master_variants(id) ON DELETE SET NULL,
  max_price         NUMERIC(12,2),
  min_condition_id  UUID REFERENCES condition_scales(id),
  priority          INTEGER NOT NULL DEFAULT 0,     -- Higher = more wanted
  notes             TEXT,
  notify_on_price   BOOLEAN NOT NULL DEFAULT false, -- Alert when price drops below max
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, master_item_id, master_variant_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- User collection items (the most queried table)
CREATE INDEX idx_uci_user ON user_collection_items(user_id);
CREATE INDEX idx_uci_collection ON user_collection_items(collection_id);
CREATE INDEX idx_uci_master_item ON user_collection_items(master_item_id) WHERE master_item_id IS NOT NULL;
CREATE INDEX idx_uci_variant ON user_collection_items(master_variant_id) WHERE master_variant_id IS NOT NULL;
CREATE INDEX idx_uci_for_trade ON user_collection_items(is_for_trade) WHERE is_for_trade = true;
CREATE INDEX idx_uci_for_sale ON user_collection_items(is_for_sale) WHERE is_for_sale = true;
CREATE INDEX idx_uci_value ON user_collection_items(current_value DESC NULLS LAST);
CREATE INDEX idx_uci_created ON user_collection_items(created_at DESC);

-- Set progress
CREATE INDEX idx_set_progress_user ON user_set_progress(user_id);
CREATE INDEX idx_set_progress_set ON user_set_progress(set_id);
CREATE INDEX idx_set_progress_completion ON user_set_progress(completion_pct DESC);

-- Want list
CREATE INDEX idx_want_list_user ON user_want_list(user_id);
CREATE INDEX idx_want_list_item ON user_want_list(master_item_id);

-- ============================================================
-- FUNCTION: Recalculate set completion
-- ============================================================
CREATE OR REPLACE FUNCTION recalc_set_completion(p_user_id UUID, p_set_id UUID)
RETURNS void AS $$
DECLARE
  v_owned INTEGER;
  v_total INTEGER;
BEGIN
  -- Count distinct master items user owns in this set
  SELECT COUNT(DISTINCT uci.master_item_id) INTO v_owned
  FROM user_collection_items uci
  JOIN master_items mi ON mi.id = uci.master_item_id
  WHERE uci.user_id = p_user_id AND mi.set_id = p_set_id;

  -- Get total items in set
  SELECT COALESCE(total_items, 0) INTO v_total
  FROM collectible_sets WHERE id = p_set_id;

  -- Upsert progress
  INSERT INTO user_set_progress (user_id, set_id, items_owned, items_total, completion_pct, last_item_added, updated_at)
  VALUES (
    p_user_id, p_set_id, v_owned, v_total,
    CASE WHEN v_total > 0 THEN ROUND((v_owned::numeric / v_total) * 100, 2) ELSE 0 END,
    now(), now()
  )
  ON CONFLICT (user_id, set_id) DO UPDATE SET
    items_owned = EXCLUDED.items_owned,
    items_total = EXCLUDED.items_total,
    completion_pct = EXCLUDED.completion_pct,
    last_item_added = EXCLUDED.last_item_added,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Update collection value when item changes
-- ============================================================
CREATE OR REPLACE FUNCTION update_user_collection_value()
RETURNS trigger AS $$
BEGIN
  -- Recalculate collection totals
  UPDATE collections SET
    item_count = (SELECT COUNT(*) FROM user_collection_items WHERE collection_id = COALESCE(NEW.collection_id, OLD.collection_id)),
    total_value = (SELECT COALESCE(SUM(current_value * quantity), 0) FROM user_collection_items WHERE collection_id = COALESCE(NEW.collection_id, OLD.collection_id)),
    updated_at = now()
  WHERE id = COALESCE(NEW.collection_id, OLD.collection_id);

  -- Recalculate set completion if item is linked to master catalog
  IF NEW.master_item_id IS NOT NULL THEN
    PERFORM recalc_set_completion(
      NEW.user_id,
      (SELECT set_id FROM master_items WHERE id = NEW.master_item_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_uci_collection_value
  AFTER INSERT OR UPDATE OR DELETE ON user_collection_items
  FOR EACH ROW EXECUTE FUNCTION update_user_collection_value();

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE TRIGGER set_uci_updated_at
  BEFORE UPDATE ON user_collection_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_progress_updated_at
  BEFORE UPDATE ON user_set_progress
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE user_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_set_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_want_list ENABLE ROW LEVEL SECURITY;

-- Users see own items + items in public collections
CREATE POLICY "uci_owner_all" ON user_collection_items
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "uci_public_read" ON user_collection_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM collections c WHERE c.id = collection_id AND c.is_public = true)
  );

-- Set progress: owner + public
CREATE POLICY "set_progress_owner" ON user_set_progress
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "set_progress_public_read" ON user_set_progress
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = user_id AND p.is_public = true)
  );

-- Want list: owner only
CREATE POLICY "want_list_owner" ON user_want_list
  FOR ALL USING (user_id = auth.uid());
