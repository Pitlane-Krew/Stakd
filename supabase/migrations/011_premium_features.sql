-- ============================================================
-- Migration 011: Premium Features
-- Price Alerts, Restock Alert Prefs, Insurance Reports
-- ============================================================

-- Price Alerts table
CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  item_title TEXT NOT NULL,
  category TEXT,
  target_price NUMERIC(12,2) NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('above', 'below')),
  current_price NUMERIC(12,2),
  triggered BOOLEAN NOT NULL DEFAULT FALSE,
  triggered_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_alerts_user ON price_alerts(user_id);
CREATE INDEX idx_price_alerts_item ON price_alerts(item_id) WHERE item_id IS NOT NULL;
CREATE INDEX idx_price_alerts_active ON price_alerts(active, triggered) WHERE active = TRUE AND triggered = FALSE;

-- Restock Alert Preferences table (if not exists from earlier migration)
CREATE TABLE IF NOT EXISTS restock_alert_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT,
  keyword TEXT,
  radius_miles INTEGER NOT NULL DEFAULT 25,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restock_alert_prefs_user ON restock_alert_prefs(user_id);
CREATE INDEX IF NOT EXISTS idx_restock_alert_prefs_enabled ON restock_alert_prefs(enabled) WHERE enabled = TRUE;

-- Onboarding preferences (track wizard completion)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_categories TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS alerts_enabled BOOLEAN DEFAULT TRUE;

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_alert_prefs ENABLE ROW LEVEL SECURITY;

-- Price alerts: users can only see/manage their own
CREATE POLICY "Users can view own price alerts"
  ON price_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own price alerts"
  ON price_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own price alerts"
  ON price_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own price alerts"
  ON price_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can check all alerts (for price update triggers)
CREATE POLICY "Service can read all active alerts"
  ON price_alerts FOR SELECT
  USING (auth.role() = 'service_role');

-- Restock alert prefs: users manage their own
CREATE POLICY "Users can view own restock alert prefs"
  ON restock_alert_prefs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own restock alert prefs"
  ON restock_alert_prefs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own restock alert prefs"
  ON restock_alert_prefs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own restock alert prefs"
  ON restock_alert_prefs FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can check all prefs (for matching)
CREATE POLICY "Service can read all alert prefs"
  ON restock_alert_prefs FOR SELECT
  USING (auth.role() = 'service_role');
