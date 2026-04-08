-- ============================================================
-- 027_promo_codes.sql
-- Promo code system for influencer/reviewer tier access
-- ============================================================

-- Promo codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL CHECK (tier IN ('pro', 'elite')),
  duration_days INT, -- NULL = indefinite
  max_uses INT DEFAULT 1, -- NULL = unlimited
  used_count INT DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  reason TEXT DEFAULT 'Influencer / reviewer access',
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ, -- code itself expires (different from tier duration)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Track who redeemed what
CREATE TABLE IF NOT EXISTS promo_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id UUID REFERENCES promo_codes(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  tier_granted TEXT NOT NULL,
  tier_expires_at TIMESTAMPTZ, -- when the granted tier expires
  redeemed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(promo_code_id, user_id) -- one redemption per user per code
);

-- RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_redemptions ENABLE ROW LEVEL SECURITY;

-- Only admins (via service role) can manage promo codes
-- Users can read codes for validation purposes (limited by app logic)
CREATE POLICY promo_codes_admin_all ON promo_codes FOR ALL TO service_role USING (true);
CREATE POLICY promo_redemptions_admin_all ON promo_redemptions FOR ALL TO service_role USING (true);

-- Users can see their own redemptions
CREATE POLICY promo_redemptions_self_read ON promo_redemptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Add tier_granted_by and tier_grant_reason columns to profiles if not exists
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier_granted_by TEXT;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier_grant_reason TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Index for code lookups
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON promo_redemptions(user_id);
