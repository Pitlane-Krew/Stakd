-- ============================================================
-- MIGRATION 016: Universal Price Engine
-- ============================================================
-- Price data linked to master_variants (not user items).
-- This means price data is shared across ALL users who own
-- the same collectible — massive efficiency gain.
-- ============================================================

-- Individual sale records from external sources
CREATE TABLE IF NOT EXISTS catalog_price_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_variant_id UUID NOT NULL REFERENCES master_variants(id) ON DELETE CASCADE,
  condition_id      UUID REFERENCES condition_scales(id),
  source            TEXT NOT NULL,                 -- 'ebay', 'psa', 'goldin', 'stockx', 'tcgplayer', 'manual'
  price             NUMERIC(12,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'USD',
  sale_date         DATE NOT NULL,
  listing_url       TEXT,
  listing_title     TEXT,                          -- Original listing title for reference
  is_auction        BOOLEAN DEFAULT false,
  metadata          JSONB NOT NULL DEFAULT '{}',   -- Source-specific data (seller, photos, etc.)
  fetched_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Aggregated daily snapshots per variant+condition
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
  trend             TEXT,                          -- 'up', 'down', 'stable'
  trend_pct         NUMERIC(6,2),                  -- % change from previous snapshot
  source_breakdown  JSONB NOT NULL DEFAULT '{}',   -- {"ebay": 5, "goldin": 2}
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(master_variant_id, condition_id, snapshot_date)
);

-- Current "fair market value" per variant — latest computed price
-- This is a materialized view alternative: one row per variant for fast lookups
CREATE TABLE IF NOT EXISTS catalog_current_prices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_variant_id UUID NOT NULL REFERENCES master_variants(id) ON DELETE CASCADE,
  condition_id      UUID REFERENCES condition_scales(id),
  current_price     NUMERIC(12,2),
  price_7d_ago      NUMERIC(12,2),
  price_30d_ago     NUMERIC(12,2),
  price_90d_ago     NUMERIC(12,2),
  trend_7d          NUMERIC(6,2),                  -- % change over 7 days
  trend_30d         NUMERIC(6,2),
  trend_90d         NUMERIC(6,2),
  last_sale_price   NUMERIC(12,2),
  last_sale_date    DATE,
  last_sale_source  TEXT,
  total_sales_30d   INTEGER NOT NULL DEFAULT 0,
  confidence        TEXT NOT NULL DEFAULT 'low',    -- 'low', 'medium', 'high' based on data volume
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(master_variant_id, condition_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Price history
CREATE INDEX idx_cat_prices_variant ON catalog_price_history(master_variant_id);
CREATE INDEX idx_cat_prices_date ON catalog_price_history(sale_date DESC);
CREATE INDEX idx_cat_prices_source ON catalog_price_history(source);
CREATE INDEX idx_cat_prices_variant_date ON catalog_price_history(master_variant_id, sale_date DESC);
CREATE INDEX idx_cat_prices_condition ON catalog_price_history(condition_id) WHERE condition_id IS NOT NULL;

-- Snapshots
CREATE INDEX idx_cat_snapshots_variant ON catalog_price_snapshots(master_variant_id);
CREATE INDEX idx_cat_snapshots_date ON catalog_price_snapshots(snapshot_date DESC);
CREATE INDEX idx_cat_snapshots_lookup ON catalog_price_snapshots(master_variant_id, condition_id, snapshot_date DESC);

-- Current prices (the hot path — must be fast)
CREATE INDEX idx_current_prices_variant ON catalog_current_prices(master_variant_id);
CREATE INDEX idx_current_prices_lookup ON catalog_current_prices(master_variant_id, condition_id);

-- ============================================================
-- FUNCTION: Refresh current prices from snapshots
-- ============================================================
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
  -- Get latest snapshot price
  SELECT avg_price INTO v_current
  FROM catalog_price_snapshots
  WHERE master_variant_id = p_variant_id AND condition_id IS NOT DISTINCT FROM p_condition_id
  ORDER BY snapshot_date DESC LIMIT 1;

  -- Get 7d, 30d, 90d ago prices
  SELECT avg_price INTO v_7d
  FROM catalog_price_snapshots
  WHERE master_variant_id = p_variant_id AND condition_id IS NOT DISTINCT FROM p_condition_id
    AND snapshot_date <= v_today - INTERVAL '7 days'
  ORDER BY snapshot_date DESC LIMIT 1;

  SELECT avg_price INTO v_30d
  FROM catalog_price_snapshots
  WHERE master_variant_id = p_variant_id AND condition_id IS NOT DISTINCT FROM p_condition_id
    AND snapshot_date <= v_today - INTERVAL '30 days'
  ORDER BY snapshot_date DESC LIMIT 1;

  SELECT avg_price INTO v_90d
  FROM catalog_price_snapshots
  WHERE master_variant_id = p_variant_id AND condition_id IS NOT DISTINCT FROM p_condition_id
    AND snapshot_date <= v_today - INTERVAL '90 days'
  ORDER BY snapshot_date DESC LIMIT 1;

  -- Get last individual sale
  SELECT price, sale_date, source INTO v_last_sale
  FROM catalog_price_history
  WHERE master_variant_id = p_variant_id AND condition_id IS NOT DISTINCT FROM p_condition_id
  ORDER BY sale_date DESC LIMIT 1;

  -- Count sales in last 30 days
  SELECT COUNT(*) INTO v_sale_count
  FROM catalog_price_history
  WHERE master_variant_id = p_variant_id AND condition_id IS NOT DISTINCT FROM p_condition_id
    AND sale_date >= v_today - INTERVAL '30 days';

  -- Upsert current price
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
    CASE
      WHEN v_sale_count >= 10 THEN 'high'
      WHEN v_sale_count >= 3 THEN 'medium'
      ELSE 'low'
    END,
    now()
  )
  ON CONFLICT (master_variant_id, condition_id) DO UPDATE SET
    current_price = EXCLUDED.current_price,
    price_7d_ago = EXCLUDED.price_7d_ago,
    price_30d_ago = EXCLUDED.price_30d_ago,
    price_90d_ago = EXCLUDED.price_90d_ago,
    trend_7d = EXCLUDED.trend_7d,
    trend_30d = EXCLUDED.trend_30d,
    trend_90d = EXCLUDED.trend_90d,
    last_sale_price = EXCLUDED.last_sale_price,
    last_sale_date = EXCLUDED.last_sale_date,
    last_sale_source = EXCLUDED.last_sale_source,
    total_sales_30d = EXCLUDED.total_sales_30d,
    confidence = EXCLUDED.confidence,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE catalog_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_current_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cat_prices_public_read" ON catalog_price_history FOR SELECT USING (true);
CREATE POLICY "cat_snapshots_public_read" ON catalog_price_snapshots FOR SELECT USING (true);
CREATE POLICY "cat_current_public_read" ON catalog_current_prices FOR SELECT USING (true);

-- Only service role / admin can write price data
CREATE POLICY "cat_prices_admin_write" ON catalog_price_history
  FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "cat_snapshots_admin_write" ON catalog_price_snapshots
  FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "cat_current_admin_write" ON catalog_current_prices
  FOR ALL USING (is_admin(auth.uid()));
