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
