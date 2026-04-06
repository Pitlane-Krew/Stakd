-- Enable PostGIS for location features
CREATE EXTENSION IF NOT EXISTS postgis;

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  location_coords GEOGRAPHY(POINT, 4326),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_location ON public.profiles USING GIST(location_coords);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
-- Collections
CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  cover_image_url TEXT,
  is_public BOOLEAN DEFAULT true,
  item_count INTEGER DEFAULT 0,
  total_value NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_collections_user ON public.collections(user_id);
CREATE INDEX idx_collections_category ON public.collections(category);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Items
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  condition TEXT NOT NULL,
  grade_value TEXT,
  grading_company TEXT,
  year INTEGER,
  brand TEXT,
  tags TEXT[] DEFAULT '{}',
  estimated_value NUMERIC(12,2),
  purchase_price NUMERIC(12,2),
  purchase_date DATE,
  image_urls TEXT[] DEFAULT '{}',
  enhanced_image_url TEXT,
  is_for_sale BOOLEAN DEFAULT false,
  is_for_trade BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_items_collection ON public.items(collection_id);
CREATE INDEX idx_items_user ON public.items(user_id);
CREATE INDEX idx_items_category ON public.items(category);
CREATE INDEX idx_items_tags ON public.items USING GIN(tags);
CREATE INDEX idx_items_for_trade ON public.items(is_for_trade) WHERE is_for_trade = true;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update collection stats on item changes
CREATE OR REPLACE FUNCTION update_collection_stats()
RETURNS TRIGGER AS $$
DECLARE
  target_collection_id UUID;
BEGIN
  target_collection_id := COALESCE(NEW.collection_id, OLD.collection_id);
  UPDATE public.collections SET
    item_count = (SELECT COUNT(*) FROM public.items WHERE collection_id = target_collection_id),
    total_value = (SELECT COALESCE(SUM(estimated_value), 0) FROM public.items WHERE collection_id = target_collection_id)
  WHERE id = target_collection_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_collection_on_item_change
  AFTER INSERT OR UPDATE OR DELETE ON public.items
  FOR EACH ROW EXECUTE FUNCTION update_collection_stats();

-- RLS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public collections are viewable"
  ON public.collections FOR SELECT USING (is_public = true);
CREATE POLICY "Owners see all own collections"
  ON public.collections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owners manage own collections"
  ON public.collections FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Items in public collections are viewable"
  ON public.items FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id AND (c.is_public = true OR c.user_id = auth.uid())
    )
  );
CREATE POLICY "Owners manage own items"
  ON public.items FOR ALL USING (auth.uid() = user_id);
-- Price history (individual sale records)
CREATE TABLE public.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  price NUMERIC(12,2) NOT NULL,
  source TEXT NOT NULL,
  sale_date DATE,
  listing_url TEXT,
  fetched_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_price_history_item ON public.price_history(item_id);
CREATE INDEX idx_price_history_date ON public.price_history(sale_date DESC);

-- Daily price snapshots (populated by cron)
CREATE TABLE public.price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  avg_price NUMERIC(12,2),
  min_price NUMERIC(12,2),
  max_price NUMERIC(12,2),
  sale_count INTEGER DEFAULT 0,
  trend TEXT,
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(item_id, snapshot_date)
);

CREATE INDEX idx_snapshots_item_date ON public.price_snapshots(item_id, snapshot_date DESC);

-- RLS: price data inherits visibility from the item's collection
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Price history viewable if item is viewable"
  ON public.price_history FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.items i
      JOIN public.collections c ON c.id = i.collection_id
      WHERE i.id = item_id AND (c.is_public = true OR c.user_id = auth.uid())
    )
  );

CREATE POLICY "Price snapshots viewable if item is viewable"
  ON public.price_snapshots FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.items i
      JOIN public.collections c ON c.id = i.collection_id
      WHERE i.id = item_id AND (c.is_public = true OR c.user_id = auth.uid())
    )
  );
-- Restock reports
CREATE TABLE public.restocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  store_location GEOGRAPHY(POINT, 4326) NOT NULL,
  store_address TEXT,
  item_found TEXT NOT NULL,
  category TEXT,
  description TEXT,
  image_url TEXT,
  freshness_score NUMERIC(3,1),
  verified_count INTEGER DEFAULT 0,
  reported_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_restocks_location ON public.restocks USING GIST(store_location);
CREATE INDEX idx_restocks_freshness ON public.restocks(freshness_score DESC);
CREATE INDEX idx_restocks_reported ON public.restocks(reported_at DESC);
CREATE INDEX idx_restocks_category ON public.restocks(category);

-- Verifications
CREATE TABLE public.restock_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restock_id UUID NOT NULL REFERENCES public.restocks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_confirmed BOOLEAN NOT NULL,
  verified_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restock_id, user_id)
);

-- Freshness calculation (called by cron)
CREATE OR REPLACE FUNCTION refresh_freshness_scores()
RETURNS void AS $$
BEGIN
  UPDATE public.restocks SET
    freshness_score = GREATEST(0,
      10.0 - (EXTRACT(EPOCH FROM (now() - reported_at)) / 8640)
      + (verified_count * 0.5)
    )
  WHERE reported_at > now() - INTERVAL '48 hours';

  DELETE FROM public.restocks
  WHERE reported_at < now() - INTERVAL '48 hours';
END;
$$ LANGUAGE plpgsql;

-- Restock alerts preferences
CREATE TABLE public.restock_alert_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  radius_miles INTEGER DEFAULT 25,
  categories TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.restock_alert_prefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE public.restocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restock_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restock_alert_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view restocks"
  ON public.restocks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own restocks"
  ON public.restocks FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view verifications"
  ON public.restock_verifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own verifications"
  ON public.restock_verifications FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own alert prefs"
  ON public.restock_alert_prefs FOR ALL USING (auth.uid() = user_id);
-- Route optimization
CREATE TABLE public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT,
  origin GEOGRAPHY(POINT, 4326) NOT NULL,
  destination GEOGRAPHY(POINT, 4326),
  waypoints JSONB NOT NULL DEFAULT '[]',
  optimized_order INTEGER[],
  total_distance_meters INTEGER,
  total_duration_seconds INTEGER,
  route_geometry JSONB,
  provider TEXT DEFAULT 'mapbox',
  is_saved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_routes_user ON public.routes(user_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: routes are private to owner
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own routes"
  ON public.routes FOR ALL USING (auth.uid() = user_id);
-- Follows
CREATE TABLE public.follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX idx_follows_following ON public.follows(following_id);

-- Posts
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  image_urls TEXT[] DEFAULT '{}',
  post_type TEXT DEFAULT 'general',
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  restock_id UUID REFERENCES public.restocks(id) ON DELETE SET NULL,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_posts_user ON public.posts(user_id);
CREATE INDEX idx_posts_created ON public.posts(created_at DESC);
CREATE INDEX idx_posts_type ON public.posts(post_type);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Likes
CREATE TABLE public.likes (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX idx_likes_post ON public.likes(post_id);

-- Update post like_count
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
DECLARE
  target_post_id UUID;
BEGIN
  target_post_id := COALESCE(NEW.post_id, OLD.post_id);
  UPDATE public.posts SET
    like_count = (SELECT COUNT(*) FROM public.likes WHERE post_id = target_post_id)
  WHERE id = target_post_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_like_count
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

-- Comments
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comments_post ON public.comments(post_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update post comment_count
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
DECLARE
  target_post_id UUID;
BEGIN
  target_post_id := COALESCE(NEW.post_id, OLD.post_id);
  UPDATE public.posts SET
    comment_count = (SELECT COUNT(*) FROM public.comments WHERE post_id = target_post_id)
  WHERE id = target_post_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_comment_count
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can see follows"
  ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users manage own follows"
  ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE USING (auth.uid() = follower_id);

CREATE POLICY "Public posts are viewable"
  ON public.posts FOR SELECT USING (true);
CREATE POLICY "Users manage own posts"
  ON public.posts FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can see likes"
  ON public.likes FOR SELECT USING (true);
CREATE POLICY "Users manage own likes"
  ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike"
  ON public.likes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can see comments"
  ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users manage own comments"
  ON public.comments FOR ALL USING (auth.uid() = user_id);
-- Want list for trade matching
CREATE TABLE public.want_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  min_condition TEXT,
  max_price NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_want_list_user ON public.want_list(user_id);
CREATE INDEX idx_want_list_category ON public.want_list(category);

-- Trade proposals
CREATE TABLE public.trade_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  proposer_items UUID[] NOT NULL DEFAULT '{}',   -- item IDs offered
  recipient_items UUID[] NOT NULL DEFAULT '{}',   -- item IDs requested
  message TEXT,
  status TEXT DEFAULT 'pending',  -- 'pending', 'accepted', 'declined', 'countered', 'cancelled'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_trade_proposals_proposer ON public.trade_proposals(proposer_id);
CREATE INDEX idx_trade_proposals_recipient ON public.trade_proposals(recipient_id);
CREATE INDEX idx_trade_proposals_status ON public.trade_proposals(status);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.trade_proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE public.want_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Want lists are public"
  ON public.want_list FOR SELECT USING (true);
CREATE POLICY "Users manage own want list"
  ON public.want_list FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see own trade proposals"
  ON public.trade_proposals FOR SELECT USING (
    auth.uid() = proposer_id OR auth.uid() = recipient_id
  );
CREATE POLICY "Users create trade proposals"
  ON public.trade_proposals FOR INSERT WITH CHECK (auth.uid() = proposer_id);
CREATE POLICY "Involved users update trade proposals"
  ON public.trade_proposals FOR UPDATE USING (
    auth.uid() = proposer_id OR auth.uid() = recipient_id
  );
-- ============================================================
-- Dynamic Item Type System
-- Items now store category-specific data in a JSONB column.
-- The application's category-registry.ts defines the schema;
-- the DB just stores and indexes the data flexibly.
-- ============================================================

-- Add JSONB attributes column for category-specific fields
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}';

-- GIN index for fast JSONB queries (containment, key-exists)
CREATE INDEX IF NOT EXISTS idx_items_attributes
  ON public.items USING GIN (attributes);

-- Partial indexes for common high-value queries per vertical
-- Pokémon: find by set name
CREATE INDEX IF NOT EXISTS idx_items_pokemon_set
  ON public.items ((attributes->>'set_name'))
  WHERE category = 'pokemon';

-- Sports cards: find by player
CREATE INDEX IF NOT EXISTS idx_items_sports_player
  ON public.items ((attributes->>'player_name'))
  WHERE category = 'sports_cards';

-- Hot Wheels: find treasure hunts
CREATE INDEX IF NOT EXISTS idx_items_hw_sth
  ON public.items ((attributes->>'super_treasure_hunt'))
  WHERE category = 'hot_wheels' AND (attributes->>'super_treasure_hunt') = 'true';

-- Figures: find vaulted items
CREATE INDEX IF NOT EXISTS idx_items_figures_vaulted
  ON public.items ((attributes->>'vaulted'))
  WHERE category = 'figures' AND (attributes->>'vaulted') = 'true';

-- Comics: find key issues
CREATE INDEX IF NOT EXISTS idx_items_comics_key
  ON public.items ((attributes->>'key_issue'))
  WHERE category = 'comics' AND (attributes->>'key_issue') = 'true';

-- Sneakers: find by style code
CREATE INDEX IF NOT EXISTS idx_items_sneakers_style
  ON public.items ((attributes->>'style_code'))
  WHERE category = 'sneakers';

-- ============================================================
-- Update the category values to support new verticals
-- (The existing 'cards' category maps to both pokemon and sports_cards now)
-- ============================================================

-- Expand the category options comment for documentation
COMMENT ON COLUMN public.items.category IS
  'Category values: pokemon, sports_cards, hot_wheels, figures, sneakers, comics, other. Defined in category-registry.ts.';

COMMENT ON COLUMN public.items.attributes IS
  'JSONB blob storing category-specific attributes. Schema defined in category-registry.ts. Example for pokemon: {"card_name": "Charizard VMAX", "set_name": "Evolving Skies", "rarity": "secret_rare"}';

-- ============================================================
-- Helper function: search items by attribute value
-- Usage: SELECT * FROM search_items_by_attribute('pokemon', 'set_name', 'Evolving Skies');
-- ============================================================

CREATE OR REPLACE FUNCTION search_items_by_attribute(
  p_category TEXT,
  p_attr_key TEXT,
  p_attr_value TEXT
)
RETURNS SETOF public.items AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.items
  WHERE category = p_category
    AND attributes->>p_attr_key ILIKE '%' || p_attr_value || '%'
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- Update collections table to support new category values too
-- ============================================================

COMMENT ON COLUMN public.collections.category IS
  'Category values: pokemon, sports_cards, hot_wheels, figures, sneakers, comics, other. Must match category-registry.ts.';
-- ============================================================
-- Migration 009: Internationalization Support
-- ============================================================
-- Adds:
-- 1. language_preference to profiles
-- 2. translation_cache for on-demand content translation
-- 3. collector_glossary for multi-language term registry
-- 4. item_names_search for future multilingual search
-- ============================================================

-- 1. User language preference
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS language_preference TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS currency_preference TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS distance_unit TEXT DEFAULT 'mi';

COMMENT ON COLUMN profiles.language_preference IS 'ISO locale code: en, es, zh-CN, ja';
COMMENT ON COLUMN profiles.currency_preference IS 'ISO 4217 currency code for display';
COMMENT ON COLUMN profiles.distance_unit IS 'mi or km';

-- 2. Translation cache for user-generated content
CREATE TABLE IF NOT EXISTS translation_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_hash TEXT NOT NULL,
  original_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  source_locale TEXT NOT NULL DEFAULT 'auto',
  target_locale TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT unique_translation UNIQUE (original_hash, target_locale)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_translation_cache_lookup
ON translation_cache (original_hash, target_locale);

-- Auto-expire old translations (older than 90 days)
-- Can be run via Vercel cron or Supabase scheduled function
CREATE OR REPLACE FUNCTION cleanup_translation_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM translation_cache
  WHERE created_at < now() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- 3. Collector glossary for multi-language term management
CREATE TABLE IF NOT EXISTS collector_glossary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  canonical_term TEXT NOT NULL,         -- English key (e.g., "graded")
  term_group TEXT NOT NULL,             -- Category (condition, rarity, special)
  locale TEXT NOT NULL,                 -- Target locale
  display_label TEXT NOT NULL,          -- Translated display text
  description TEXT,                     -- Optional description in target locale
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT unique_glossary_entry UNIQUE (canonical_term, locale)
);

-- Index for term lookups
CREATE INDEX IF NOT EXISTS idx_glossary_term_locale
ON collector_glossary (canonical_term, locale);

CREATE INDEX IF NOT EXISTS idx_glossary_group
ON collector_glossary (term_group, locale);

-- 4. Multilingual item name search table (for future search)
-- Stores alternative names for items across languages
-- e.g., Charizard -> リザードン (ja) -> 喷火龙 (zh-CN)
CREATE TABLE IF NOT EXISTS item_name_aliases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  alias_name TEXT NOT NULL,             -- The name in this locale
  alias_type TEXT DEFAULT 'official',   -- official, community, search
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT unique_item_alias UNIQUE (item_id, locale, alias_name)
);

-- Full-text search index on aliases
CREATE INDEX IF NOT EXISTS idx_item_aliases_search
ON item_name_aliases USING GIN (to_tsvector('simple', alias_name));

CREATE INDEX IF NOT EXISTS idx_item_aliases_item
ON item_name_aliases (item_id);

-- 5. Seed some common glossary entries (English defaults)
INSERT INTO collector_glossary (canonical_term, term_group, locale, display_label, description)
VALUES
  ('graded', 'condition', 'en', 'Graded', 'Professionally graded by a grading company'),
  ('raw', 'condition', 'en', 'Raw', 'Ungraded, not in a protective slab'),
  ('sealed', 'condition', 'en', 'Sealed', 'Factory sealed, never opened'),
  ('slabbed', 'condition', 'en', 'Slabbed', 'Encased in a grading company slab'),
  ('mint', 'condition', 'en', 'Mint', 'Perfect condition'),
  ('near_mint', 'condition', 'en', 'Near Mint', 'Almost perfect, very minor wear'),
  ('graded', 'condition', 'es', 'Calificado', 'Evaluado profesionalmente por una empresa de calificación'),
  ('raw', 'condition', 'es', 'Sin Calificar', 'Sin evaluar, sin protección'),
  ('sealed', 'condition', 'es', 'Sellado', 'Sellado de fábrica, sin abrir'),
  ('graded', 'condition', 'zh-CN', '已评级', '由专业评级公司评定等级'),
  ('raw', 'condition', 'zh-CN', '裸卡', '未评级，无保护壳'),
  ('sealed', 'condition', 'zh-CN', '未拆封', '工厂密封，从未打开'),
  ('graded', 'condition', 'ja', 'グレーディング済み', 'グレーディング会社による専門評価'),
  ('raw', 'condition', 'ja', '生カード', '未グレーディング、スラブなし'),
  ('sealed', 'condition', 'ja', '未開封', '工場出荷時のまま、未開封')
ON CONFLICT (canonical_term, locale) DO NOTHING;

-- RLS Policies
ALTER TABLE translation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE collector_glossary ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_name_aliases ENABLE ROW LEVEL SECURITY;

-- Translation cache: anyone can read, authenticated can insert
CREATE POLICY "Anyone can read translations"
ON translation_cache FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert translations"
ON translation_cache FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Glossary: public read, admin write
CREATE POLICY "Anyone can read glossary"
ON collector_glossary FOR SELECT USING (true);

-- Item aliases: public read, owner write
CREATE POLICY "Anyone can read item aliases"
ON item_name_aliases FOR SELECT USING (true);

CREATE POLICY "Item owners can manage aliases"
ON item_name_aliases FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM items WHERE items.id = item_name_aliases.item_id
    AND items.user_id = auth.uid()
  )
);
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
