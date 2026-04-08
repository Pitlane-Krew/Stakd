-- ============================================================
-- 022_watchlist_saved_searches.sql
-- Watchlist for tracking items without owning them
-- Saved Searches for getting notified on matching items
-- ============================================================

-- Watchlist table: track items user wants to monitor
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  target_price NUMERIC(12,2),
  current_price NUMERIC(12,2),
  price_change_7d NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_watchlist_user ON watchlist(user_id);
CREATE INDEX idx_watchlist_category ON watchlist(category);
CREATE INDEX idx_watchlist_created ON watchlist(created_at DESC);

-- Saved Searches table: notifications for search queries
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  category TEXT,
  notify BOOLEAN NOT NULL DEFAULT TRUE,
  last_results_count INTEGER DEFAULT 0,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX idx_saved_searches_notify ON saved_searches(notify) WHERE notify = TRUE;
CREATE INDEX idx_saved_searches_created ON saved_searches(created_at DESC);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- Watchlist: users can only see/manage their own
CREATE POLICY "Users can view own watchlist"
  ON watchlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist items"
  ON watchlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlist items"
  ON watchlist FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist items"
  ON watchlist FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can check all watchlist items (for price updates)
CREATE POLICY "Service can read all watchlist"
  ON watchlist FOR SELECT
  USING (auth.role() = 'service_role');

-- Saved Searches: users manage their own
CREATE POLICY "Users can view own saved searches"
  ON saved_searches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved searches"
  ON saved_searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved searches"
  ON saved_searches FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved searches"
  ON saved_searches FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can check all searches (for matching)
CREATE POLICY "Service can read all saved searches"
  ON saved_searches FOR SELECT
  USING (auth.role() = 'service_role');
