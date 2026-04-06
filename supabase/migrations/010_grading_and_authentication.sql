-- ============================================================
-- Migration 010: AI Grading Analysis + Collectible Authentication
-- ============================================================
-- This is the DATA FLYWHEEL for STAKD's future grading service.
-- Every analysis = training data for competing with PSA/BGS/CGC.
-- ============================================================

-- 1. AI Grading Analyses (training data goldmine)
CREATE TABLE IF NOT EXISTS grading_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  category TEXT,
  estimated_grade DECIMAL(3,1),
  confidence INTEGER, -- 0-100
  subgrades JSONB DEFAULT '{}',
  -- { centering: 8.5, corners: 9.0, edges: 8.0, surface: 7.5 }
  defects TEXT[] DEFAULT '{}',
  recommendation TEXT, -- worth_grading, borderline, not_worth_grading
  raw_analysis TEXT, -- Full AI response for training
  metadata JSONB DEFAULT '{}',
  -- Feedback loop: user reports actual grade after submission
  actual_grade DECIMAL(3,1),
  actual_grading_company TEXT,
  feedback_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for analytics and model training
CREATE INDEX IF NOT EXISTS idx_grading_category ON grading_analyses(category);
CREATE INDEX IF NOT EXISTS idx_grading_grade ON grading_analyses(estimated_grade);
CREATE INDEX IF NOT EXISTS idx_grading_with_feedback
ON grading_analyses(actual_grade) WHERE actual_grade IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_grading_user ON grading_analyses(user_id);

COMMENT ON TABLE grading_analyses IS
'Every AI grading analysis is stored for training data.
When users report actual grades, this creates labeled training pairs.
This data is the foundation for STAKD competing with PSA/BGS/CGC.';

-- 2. Collectible Authentication System
-- Combined AI + community verification
CREATE TABLE IF NOT EXISTS authentications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  image_urls TEXT[] NOT NULL,
  category TEXT,
  status TEXT DEFAULT 'pending',
  -- pending, ai_reviewed, community_review, authenticated, flagged, rejected

  -- AI Assessment
  ai_score DECIMAL(5,2), -- 0-100 confidence of authenticity
  ai_analysis TEXT,
  ai_flags TEXT[] DEFAULT '{}', -- Specific issues detected

  -- Community Review
  community_votes_authentic INTEGER DEFAULT 0,
  community_votes_fake INTEGER DEFAULT 0,
  community_confidence DECIMAL(5,2), -- Calculated from votes + voter reputation

  -- Final Determination
  final_verdict TEXT, -- authentic, suspicious, counterfeit
  final_confidence DECIMAL(5,2),
  reviewed_by UUID REFERENCES profiles(id),

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Community authentication votes
CREATE TABLE IF NOT EXISTS auth_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  authentication_id UUID REFERENCES authentications(id) ON DELETE CASCADE,
  voter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  vote TEXT NOT NULL, -- authentic, suspicious, counterfeit
  confidence INTEGER, -- 1-10 how confident is the voter
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT unique_auth_vote UNIQUE (authentication_id, voter_id)
);

-- Expert reputation for authentication
-- Higher rep = more weight on votes
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS auth_reputation INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS auth_votes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS auth_accuracy DECIMAL(5,2) DEFAULT 0;

COMMENT ON COLUMN profiles.auth_reputation IS
'Authentication expert reputation (0-1000). Earned by accurate votes.';

-- 3. Member Portal: Friend Activity Tracking
CREATE TABLE IF NOT EXISTS friend_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  -- item_added, collection_created, trade_completed, grade_submitted,
  -- restock_reported, achievement_earned
  entity_id UUID, -- ID of the related item/collection/etc.
  entity_type TEXT, -- items, collections, trades, etc.
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_friend_activity_user
ON friend_activity(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_friend_activity_type
ON friend_activity(activity_type, created_at DESC);

-- 4. Collection sharing and visibility settings
ALTER TABLE collections
ADD COLUMN IF NOT EXISTS share_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS show_values BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN DEFAULT true;

-- Generate share codes for existing public collections
UPDATE collections SET share_code = LEFT(gen_random_uuid()::text, 8)
WHERE is_public = true AND share_code IS NULL;

-- 5. Friend notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  -- friend_item_added, friend_collection_created, trade_proposal,
  -- restock_alert, price_change, grade_ready, auth_result
  title TEXT NOT NULL,
  body TEXT,
  entity_id UUID,
  entity_type TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
ON notifications(user_id, read, created_at DESC);

-- RLS Policies
ALTER TABLE grading_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE authentications ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Grading analyses: users see their own
CREATE POLICY "Users see own grading analyses"
ON grading_analyses FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can create analyses"
ON grading_analyses FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Authentications: visible to all, submit own
CREATE POLICY "Anyone can view authentications"
ON authentications FOR SELECT USING (true);

CREATE POLICY "Users can submit authentications"
ON authentications FOR INSERT
WITH CHECK (submitted_by = auth.uid());

-- Auth votes: users manage their own votes
CREATE POLICY "Users can read auth votes"
ON auth_votes FOR SELECT USING (true);

CREATE POLICY "Users can cast votes"
ON auth_votes FOR INSERT
WITH CHECK (voter_id = auth.uid());

-- Friend activity: visible to followers
CREATE POLICY "Users see friends activity"
ON friend_activity FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM follows
    WHERE follows.follower_id = auth.uid()
    AND follows.following_id = friend_activity.user_id
  )
);

CREATE POLICY "System inserts friend activity"
ON friend_activity FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Notifications: users see own
CREATE POLICY "Users see own notifications"
ON notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (user_id = auth.uid());
