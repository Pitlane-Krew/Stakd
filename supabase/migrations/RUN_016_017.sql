-- ============================================================
-- STAKD: Run Migrations 016 + 017 (paste into Supabase SQL Editor)
-- Price Engine + User Collection Link
-- ============================================================

-- ===================== 016: PRICE ENGINE =====================

CREATE TABLE IF NOT EXISTS catalog_price_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_variant_id UUID NOT NULL REFERENCES master_variants(id) ON DELETE CASCADE,
  condition_id      UUID REFERENCES condition_scales(id),
  source            TEXT NOT NULL,
  price             NUMERIC(12,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'USD',
  sale_date         DATE NOT NULL,
  listing_url       TEXT,
  listing_title     TEXT,
  is_auction        BOOLEAN DEFAULT false,
  metadata          JSONB NOT NULL DEFAULT '{}',
  fetched_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS catalog_price_snapshots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_variant_id UUID NOT NULL REFERENCES master_variants(id) ON DELETE CASCADE,
  condition_id      UUID REFERENCES condition_scales(id),
  snapshot_date     DATE NOT NULL,
  avg_price         NUMERIC(12,2),
  min_price         NUMERIC(12,2),
  max_price         NUMERIC(12,2),
  median_price      NUMERIC(12,2),
  sale_count        INTEGER NOT NULL DEFAULT 0,
  trend             TEXT,
  trend_pct         NUMERIC(6,2),
  source_breakdown  JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(master_variant_id, condition_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS catalog_current_prices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_variant_id UUID NOT NULL REFERENCES master_variants(id) ON DELETE CASCADE,
  condition_id      UUID REFERENCES condition_scales(id),
  current_price     NUMERIC(12,2),
  price_7d_ago      NUMERIC(12,2),
  price_30d_ago     NUMERIC(12,2),
  price_90d_ago     NUMERIC(12,2),
  trend_7d          NUMERIC(6,2),
  trend_30d         NUMERIC(6,2),
  trend_90d         NUMERIC(6,2),
  last_sale_price   NUMERIC(12,2),
  last_sale_date    DATE,
  last_sale_source  TEXT,
  total_sales_30d   INTEGER NOT NULL DEFAULT 0,
  confidence        TEXT NOT NULL DEFAULT 'low',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(master_variant_id, condition_id)
);

CREATE INDEX IF NOT EXISTS idx_cat_prices_variant ON catalog_price_history(master_variant_id);
CREATE INDEX IF NOT EXISTS idx_cat_prices_date ON catalog_price_history(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_cat_prices_source ON catalog_price_history(source);
CREATE INDEX IF NOT EXISTS idx_cat_prices_variant_date ON catalog_price_history(master_variant_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_cat_prices_condition ON catalog_price_history(condition_id) WHERE condition_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cat_snapshots_variant ON catalog_price_snapshots(master_variant_id);
CREATE INDEX IF NOT EXISTS idx_cat_snapshots_date ON catalog_price_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_cat_snapshots_lookup ON catalog_price_snapshots(master_variant_id, condition_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_current_prices_variant ON catalog_current_prices(master_variant_id);
CREATE INDEX IF NOT EXISTS idx_current_prices_lookup ON catalog_current_prices(master_variant_id, condition_id);

CREATE OR REPLACE FUNCTION refresh_current_price(p_variant_id UUID, p_condition_id UUID)
RETURNS void AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_current NUMERIC(12,2);
  v_7d NUMERIC(12,2);
  v_30d NUMERIC(12,2);
  v_90d NUMERIC(12,2);
  v_last_sale RECORD;
  v_sale_count INTEGER;
BEGIN
  SELECT avg_price INTO v_current FROM catalog_price_snapshots
  WHERE master_variant_id = p_variant_id AND condition_id IS NOT DISTINCT FROM p_condition_id
  ORDER BY snapshot_date DESC LIMIT 1;

  SELECT avg_price INTO v_7d FROM catalog_price_snapshots
  WHERE master_variant_id = p_variant_id AND condition_id IS NOT DISTINCT FROM p_condition_id
    AND snapshot_date <= v_today - INTERVAL '7 days'
  ORDER BY snapshot_date DESC LIMIT 1;

  SELECT avg_price INTO v_30d FROM catalog_price_snapshots
  WHERE master_variant_id = p_variant_id AND condition_id IS NOT DISTINCT FROM p_condition_id
    AND snapshot_date <= v_today - INTERVAL '30 days'
  ORDER BY snapshot_date DESC LIMIT 1;

  SELECT avg_price INTO v_90d FROM catalog_price_snapshots
  WHERE master_variant_id = p_variant_id AND condition_id IS NOT DISTINCT FROM p_condition_id
    AND snapshot_date <= v_today - INTERVAL '90 days'
  ORDER BY snapshot_date DESC LIMIT 1;

  SELECT price, sale_date, source INTO v_last_sale FROM catalog_price_history
  WHERE master_variant_id = p_variant_id AND condition_id IS NOT DISTINCT FROM p_condition_id
  ORDER BY sale_date DESC LIMIT 1;

  SELECT COUNT(*) INTO v_sale_count FROM catalog_price_history
  WHERE master_variant_id = p_variant_id AND condition_id IS NOT DISTINCT FROM p_condition_id
    AND sale_date >= v_today - INTERVAL '30 days';

  INSERT INTO catalog_current_prices (
    master_variant_id, condition_id, current_price,
    price_7d_ago, price_30d_ago, price_90d_ago,
    trend_7d, trend_30d, trend_90d,
    last_sale_price, last_sale_date, last_sale_source,
    total_sales_30d, confidence, updated_at
  ) VALUES (
    p_variant_id, p_condition_id, v_current,
    v_7d, v_30d, v_90d,
    CASE WHEN v_7d > 0 THEN ROUND(((v_current - v_7d) / v_7d) * 100, 2) END,
    CASE WHEN v_30d > 0 THEN ROUND(((v_current - v_30d) / v_30d) * 100, 2) END,
    CASE WHEN v_90d > 0 THEN ROUND(((v_current - v_90d) / v_90d) * 100, 2) END,
    v_last_sale.price, v_last_sale.sale_date, v_last_sale.source,
    v_sale_count,
    CASE WHEN v_sale_count >= 10 THEN 'high' WHEN v_sale_count >= 3 THEN 'medium' ELSE 'low' END,
    now()
  )
  ON CONFLICT (master_variant_id, condition_id) DO UPDATE SET
    current_price = EXCLUDED.current_price, price_7d_ago = EXCLUDED.price_7d_ago,
    price_30d_ago = EXCLUDED.price_30d_ago, price_90d_ago = EXCLUDED.price_90d_ago,
    trend_7d = EXCLUDED.trend_7d, trend_30d = EXCLUDED.trend_30d, trend_90d = EXCLUDED.trend_90d,
    last_sale_price = EXCLUDED.last_sale_price, last_sale_date = EXCLUDED.last_sale_date,
    last_sale_source = EXCLUDED.last_sale_source, total_sales_30d = EXCLUDED.total_sales_30d,
    confidence = EXCLUDED.confidence, updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE catalog_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_current_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cat_prices_public_read" ON catalog_price_history FOR SELECT USING (true);
CREATE POLICY "cat_snapshots_public_read" ON catalog_price_snapshots FOR SELECT USING (true);
CREATE POLICY "cat_current_public_read" ON catalog_current_prices FOR SELECT USING (true);
CREATE POLICY "cat_prices_admin_write" ON catalog_price_history FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "cat_snapshots_admin_write" ON catalog_price_snapshots FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "cat_current_admin_write" ON catalog_current_prices FOR ALL USING (is_admin(auth.uid()));

-- ===================== 017: USER COLLECTION LINK =====================

CREATE TABLE IF NOT EXISTS user_collection_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  collection_id     UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  master_item_id    UUID REFERENCES master_items(id) ON DELETE SET NULL,
  master_variant_id UUID REFERENCES master_variants(id) ON DELETE SET NULL,
  condition_id      UUID REFERENCES condition_scales(id),
  custom_title      TEXT,
  custom_image_urls TEXT[],
  notes             TEXT,
  purchase_price    NUMERIC(12,2),
  purchase_date     DATE,
  purchase_source   TEXT,
  custom_attributes JSONB NOT NULL DEFAULT '{}',
  is_for_sale       BOOLEAN NOT NULL DEFAULT false,
  is_for_trade      BOOLEAN NOT NULL DEFAULT false,
  sale_price        NUMERIC(12,2),
  is_graded         BOOLEAN NOT NULL DEFAULT false,
  grade_value       TEXT,
  grading_company   TEXT,
  cert_number       TEXT,
  quantity          INTEGER NOT NULL DEFAULT 1,
  current_value     NUMERIC(12,2),
  value_updated_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_set_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  set_id          UUID NOT NULL REFERENCES collectible_sets(id) ON DELETE CASCADE,
  items_owned     INTEGER NOT NULL DEFAULT 0,
  items_total     INTEGER NOT NULL DEFAULT 0,
  completion_pct  NUMERIC(5,2) NOT NULL DEFAULT 0,
  last_item_added TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, set_id)
);

CREATE TABLE IF NOT EXISTS user_want_list (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  master_item_id    UUID REFERENCES master_items(id) ON DELETE CASCADE,
  master_variant_id UUID REFERENCES master_variants(id) ON DELETE SET NULL,
  max_price         NUMERIC(12,2),
  min_condition_id  UUID REFERENCES condition_scales(id),
  priority          INTEGER NOT NULL DEFAULT 0,
  notes             TEXT,
  notify_on_price   BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, master_item_id, master_variant_id)
);

CREATE INDEX IF NOT EXISTS idx_uci_user ON user_collection_items(user_id);
CREATE INDEX IF NOT EXISTS idx_uci_collection ON user_collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_uci_master_item ON user_collection_items(master_item_id) WHERE master_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_uci_variant ON user_collection_items(master_variant_id) WHERE master_variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_uci_for_trade ON user_collection_items(is_for_trade) WHERE is_for_trade = true;
CREATE INDEX IF NOT EXISTS idx_uci_for_sale ON user_collection_items(is_for_sale) WHERE is_for_sale = true;
CREATE INDEX IF NOT EXISTS idx_uci_value ON user_collection_items(current_value DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_uci_created ON user_collection_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_set_progress_user ON user_set_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_set_progress_set ON user_set_progress(set_id);
CREATE INDEX IF NOT EXISTS idx_set_progress_completion ON user_set_progress(completion_pct DESC);
CREATE INDEX IF NOT EXISTS idx_want_list_user ON user_want_list(user_id);
CREATE INDEX IF NOT EXISTS idx_want_list_item ON user_want_list(master_item_id);

CREATE OR REPLACE FUNCTION recalc_set_completion(p_user_id UUID, p_set_id UUID)
RETURNS void AS $$
DECLARE
  v_owned INTEGER;
  v_total INTEGER;
BEGIN
  SELECT COUNT(DISTINCT uci.master_item_id) INTO v_owned
  FROM user_collection_items uci
  JOIN master_items mi ON mi.id = uci.master_item_id
  WHERE uci.user_id = p_user_id AND mi.set_id = p_set_id;

  SELECT COALESCE(total_items, 0) INTO v_total FROM collectible_sets WHERE id = p_set_id;

  INSERT INTO user_set_progress (user_id, set_id, items_owned, items_total, completion_pct, last_item_added, updated_at)
  VALUES (
    p_user_id, p_set_id, v_owned, v_total,
    CASE WHEN v_total > 0 THEN ROUND((v_owned::numeric / v_total) * 100, 2) ELSE 0 END,
    now(), now()
  )
  ON CONFLICT (user_id, set_id) DO UPDATE SET
    items_owned = EXCLUDED.items_owned, items_total = EXCLUDED.items_total,
    completion_pct = EXCLUDED.completion_pct, last_item_added = EXCLUDED.last_item_added, updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_user_collection_value()
RETURNS trigger AS $$
BEGIN
  UPDATE collections SET
    item_count = (SELECT COUNT(*) FROM user_collection_items WHERE collection_id = COALESCE(NEW.collection_id, OLD.collection_id)),
    total_value = (SELECT COALESCE(SUM(current_value * quantity), 0) FROM user_collection_items WHERE collection_id = COALESCE(NEW.collection_id, OLD.collection_id)),
    updated_at = now()
  WHERE id = COALESCE(NEW.collection_id, OLD.collection_id);

  IF NEW.master_item_id IS NOT NULL THEN
    PERFORM recalc_set_completion(NEW.user_id, (SELECT set_id FROM master_items WHERE id = NEW.master_item_id));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_uci_collection_value
  AFTER INSERT OR UPDATE OR DELETE ON user_collection_items
  FOR EACH ROW EXECUTE FUNCTION update_user_collection_value();

CREATE TRIGGER set_uci_updated_at BEFORE UPDATE ON user_collection_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_progress_updated_at BEFORE UPDATE ON user_set_progress FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE user_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_set_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_want_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uci_owner_all" ON user_collection_items FOR ALL USING (user_id = auth.uid());
CREATE POLICY "uci_public_read" ON user_collection_items FOR SELECT USING (EXISTS (SELECT 1 FROM collections c WHERE c.id = collection_id AND c.is_public = true));
CREATE POLICY "set_progress_owner" ON user_set_progress FOR ALL USING (user_id = auth.uid());
CREATE POLICY "set_progress_public_read" ON user_set_progress FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = user_id AND p.is_public = true));
CREATE POLICY "want_list_owner" ON user_want_list FOR ALL USING (user_id = auth.uid());
