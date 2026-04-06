-- 012_tiers_and_reputation.sql
-- Adds subscription tier column, reputation scoring, and trade feedback

-- ─── Tier column on profiles ───
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'free'
    CHECK (tier IN ('free', 'pro', 'elite')),
  ADD COLUMN IF NOT EXISTS tier_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS ai_grades_used_this_month int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_grades_reset_at timestamptz DEFAULT now();

-- ─── Reputation / trust score system ───
-- Composite score calculated from verified trades, community votes, account age
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS reputation_score int NOT NULL DEFAULT 50
    CHECK (reputation_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS total_trades int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS successful_trades int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trade_disputes int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_seller boolean NOT NULL DEFAULT false;

-- ─── Trade system tables ───
CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_id uuid NOT NULL REFERENCES profiles(id),
  receiver_id uuid NOT NULL REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'disputed', 'cancelled')),
  initiator_items uuid[] DEFAULT '{}',
  receiver_items uuid[] DEFAULT '{}',
  initiator_cash numeric(10,2) DEFAULT 0,
  receiver_cash numeric(10,2) DEFAULT 0,
  message text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trade feedback (both parties rate after completion)
CREATE TABLE IF NOT EXISTS trade_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(id),
  reviewed_id uuid NOT NULL REFERENCES profiles(id),
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE (trade_id, reviewer_id)
);

-- ─── RLS Policies ───
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_feedback ENABLE ROW LEVEL SECURITY;

-- Users can view trades they're part of
CREATE POLICY trades_select ON trades FOR SELECT
  USING (auth.uid() = initiator_id OR auth.uid() = receiver_id);

-- Users can create trades they initiate
CREATE POLICY trades_insert ON trades FOR INSERT
  WITH CHECK (auth.uid() = initiator_id);

-- Participants can update their trades
CREATE POLICY trades_update ON trades FOR UPDATE
  USING (auth.uid() = initiator_id OR auth.uid() = receiver_id);

-- Feedback: viewable by trade participants
CREATE POLICY feedback_select ON trade_feedback FOR SELECT
  USING (auth.uid() = reviewer_id OR auth.uid() = reviewed_id);

-- Users can leave feedback they authored
CREATE POLICY feedback_insert ON trade_feedback FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

-- ─── Indexes ───
CREATE INDEX IF NOT EXISTS idx_trades_initiator ON trades(initiator_id);
CREATE INDEX IF NOT EXISTS idx_trades_receiver ON trades(receiver_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_feedback_reviewed ON trade_feedback(reviewed_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON profiles(tier);
CREATE INDEX IF NOT EXISTS idx_profiles_reputation ON profiles(reputation_score DESC);

-- ─── Function: recalculate reputation score ───
CREATE OR REPLACE FUNCTION recalc_reputation(user_uuid uuid)
RETURNS void AS $$
DECLARE
  v_total int;
  v_success int;
  v_disputes int;
  v_avg_rating numeric;
  v_account_days int;
  v_score int;
BEGIN
  SELECT total_trades, successful_trades, trade_disputes
    INTO v_total, v_success, v_disputes
    FROM profiles WHERE id = user_uuid;

  SELECT COALESCE(AVG(rating), 3)
    INTO v_avg_rating
    FROM trade_feedback WHERE reviewed_id = user_uuid;

  SELECT EXTRACT(DAY FROM now() - created_at)::int
    INTO v_account_days
    FROM profiles WHERE id = user_uuid;

  -- Score formula: base 50 + trade history (max 30) + rating bonus (max 15) + tenure (max 5)
  v_score := 50;

  -- Trade success ratio bonus (up to +30, or down to -20 for disputes)
  IF v_total > 0 THEN
    v_score := v_score + LEAST(30, (v_success::numeric / v_total * 30)::int);
    v_score := v_score - LEAST(20, v_disputes * 5);
  END IF;

  -- Rating bonus (avg 3 = neutral, 5 = +15)
  v_score := v_score + GREATEST(-10, LEAST(15, ((v_avg_rating - 3) * 7.5)::int));

  -- Account age bonus (1 point per 90 days, max 5)
  v_score := v_score + LEAST(5, v_account_days / 90);

  -- Clamp 0-100
  v_score := GREATEST(0, LEAST(100, v_score));

  UPDATE profiles SET reputation_score = v_score WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
