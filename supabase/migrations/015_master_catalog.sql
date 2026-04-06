-- ============================================================
-- MIGRATION 015: Master Collectible Catalog
-- ============================================================
-- The canonical reference database. Each row is a REAL collectible
-- that exists in the world (e.g., "Base Set Charizard #4").
-- Users link their personal items to these master records.
-- ============================================================

-- Sets / Series (e.g., "Base Set", "2023 Topps Chrome", "Boulevard Series")
CREATE TABLE IF NOT EXISTS collectible_sets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     UUID NOT NULL REFERENCES collectible_categories(id) ON DELETE CASCADE,
  subcategory_id  UUID REFERENCES collectible_subcategories(id) ON DELETE SET NULL,
  slug            TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  release_date    DATE,
  total_items     INTEGER,                        -- Known size of the set (for completion tracking)
  image_url       TEXT,
  logo_url        TEXT,
  attributes      JSONB NOT NULL DEFAULT '{}',    -- Set-level metadata (e.g., tcg set code, brand)
  is_active       BOOLEAN NOT NULL DEFAULT true,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, slug)
);

-- Master items — the canonical record for each collectible
CREATE TABLE IF NOT EXISTS master_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     UUID NOT NULL REFERENCES collectible_categories(id) ON DELETE CASCADE,
  set_id          UUID REFERENCES collectible_sets(id) ON DELETE SET NULL,
  slug            TEXT NOT NULL,
  name            TEXT NOT NULL,                   -- "Charizard", "LeBron James Prizm Silver"
  description     TEXT,
  image_url       TEXT,
  thumbnail_url   TEXT,
  set_position    INTEGER,                         -- Position within the set (for ordering/completion)
  attributes      JSONB NOT NULL DEFAULT '{}',     -- Category-specific fields from attribute_defs
  external_ids    JSONB NOT NULL DEFAULT '{}',     -- {"tcgplayer_id": "123", "ebay_epid": "456"}
  tags            TEXT[] DEFAULT '{}',
  popularity      INTEGER NOT NULL DEFAULT 0,      -- Search/view count for ranking
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES profiles(id),    -- null = system-imported
  verified        BOOLEAN NOT NULL DEFAULT false,   -- Admin-verified record
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, slug)
);

-- Variants of a master item (e.g., 1st Edition Holo, Reverse Holo, PSA 10 slab)
CREATE TABLE IF NOT EXISTS master_variants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_item_id  UUID NOT NULL REFERENCES master_items(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL,
  name            TEXT NOT NULL,                   -- "1st Edition Holo", "Reverse Holo", "Base"
  description     TEXT,
  image_url       TEXT,
  attributes      JSONB NOT NULL DEFAULT '{}',     -- Variant-specific overrides
  sku             TEXT,                            -- External SKU if applicable
  is_default      BOOLEAN NOT NULL DEFAULT false,  -- The "base" variant
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(master_item_id, slug)
);

-- Condition definitions per category
CREATE TABLE IF NOT EXISTS condition_scales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     UUID NOT NULL REFERENCES collectible_categories(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL,                   -- 'psa_10', 'nm', 'mint_sealed'
  name            TEXT NOT NULL,                   -- 'PSA 10 Gem Mint'
  abbreviation    TEXT,                            -- 'PSA 10', 'NM', 'LP'
  grade_value     NUMERIC(4,1),                   -- 10.0, 9.5, 9.0 ... for graded items
  grading_company TEXT,                            -- 'PSA', 'BGS', 'CGC', null for raw
  sort_order      INTEGER NOT NULL DEFAULT 0,      -- Higher = better condition
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, slug)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Sets
CREATE INDEX idx_sets_category ON collectible_sets(category_id);
CREATE INDEX idx_sets_slug ON collectible_sets(slug);
CREATE INDEX idx_sets_release ON collectible_sets(release_date DESC);
CREATE INDEX idx_sets_active ON collectible_sets(category_id, is_active) WHERE is_active = true;

-- Master items
CREATE INDEX idx_master_items_category ON master_items(category_id);
CREATE INDEX idx_master_items_set ON master_items(set_id);
CREATE INDEX idx_master_items_slug ON master_items(slug);
CREATE INDEX idx_master_items_popularity ON master_items(popularity DESC);
CREATE INDEX idx_master_items_tags ON master_items USING GIN(tags);
CREATE INDEX idx_master_items_attrs ON master_items USING GIN(attributes);
CREATE INDEX idx_master_items_external ON master_items USING GIN(external_ids);
CREATE INDEX idx_master_items_verified ON master_items(verified) WHERE verified = true;

-- Full-text search index on master items
CREATE INDEX idx_master_items_search ON master_items
  USING GIN(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- Variants
CREATE INDEX idx_variants_master ON master_variants(master_item_id);
CREATE INDEX idx_variants_default ON master_variants(master_item_id, is_default) WHERE is_default = true;

-- Condition scales
CREATE INDEX idx_conditions_category ON condition_scales(category_id);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE TRIGGER set_sets_updated_at
  BEFORE UPDATE ON collectible_sets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_master_items_updated_at
  BEFORE UPDATE ON master_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_variants_updated_at
  BEFORE UPDATE ON master_variants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE collectible_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE condition_scales ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "sets_public_read" ON collectible_sets FOR SELECT USING (true);
CREATE POLICY "master_items_public_read" ON master_items FOR SELECT USING (true);
CREATE POLICY "variants_public_read" ON master_variants FOR SELECT USING (true);
CREATE POLICY "conditions_public_read" ON condition_scales FOR SELECT USING (true);

-- Authenticated users can suggest new items (unverified)
CREATE POLICY "master_items_auth_insert" ON master_items
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Admin full control
CREATE POLICY "sets_admin_write" ON collectible_sets
  FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "master_items_admin_write" ON master_items
  FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "variants_admin_write" ON master_variants
  FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "conditions_admin_write" ON condition_scales
  FOR ALL USING (is_admin(auth.uid()));

-- ============================================================
-- SEED: Condition scales
-- ============================================================

-- PSA grading scale (for TCG and Sports)
INSERT INTO condition_scales (category_id, slug, name, abbreviation, grade_value, grading_company, sort_order) VALUES
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'psa_10', 'PSA 10 Gem Mint', 'PSA 10', 10.0, 'PSA', 100),
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'psa_9', 'PSA 9 Mint', 'PSA 9', 9.0, 'PSA', 90),
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'psa_8', 'PSA 8 NM-MT', 'PSA 8', 8.0, 'PSA', 80),
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'psa_7', 'PSA 7 NM', 'PSA 7', 7.0, 'PSA', 70),
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'bgs_10', 'BGS 10 Pristine', 'BGS 10', 10.0, 'BGS', 101),
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'bgs_95', 'BGS 9.5 Gem Mint', 'BGS 9.5', 9.5, 'BGS', 96),
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'cgc_10', 'CGC 10 Pristine', 'CGC 10', 10.0, 'CGC', 102),
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'raw_nm', 'Near Mint (Raw)', 'NM', NULL, NULL, 60),
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'raw_lp', 'Lightly Played (Raw)', 'LP', NULL, NULL, 50),
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'raw_mp', 'Moderately Played (Raw)', 'MP', NULL, NULL, 40),
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'raw_hp', 'Heavily Played (Raw)', 'HP', NULL, NULL, 30),
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'raw_dmg', 'Damaged (Raw)', 'DMG', NULL, NULL, 20);

-- Sports cards (same PSA scale + raw)
INSERT INTO condition_scales (category_id, slug, name, abbreviation, grade_value, grading_company, sort_order) VALUES
  ((SELECT id FROM collectible_categories WHERE slug = 'sports_cards'), 'psa_10', 'PSA 10 Gem Mint', 'PSA 10', 10.0, 'PSA', 100),
  ((SELECT id FROM collectible_categories WHERE slug = 'sports_cards'), 'psa_9', 'PSA 9 Mint', 'PSA 9', 9.0, 'PSA', 90),
  ((SELECT id FROM collectible_categories WHERE slug = 'sports_cards'), 'psa_8', 'PSA 8 NM-MT', 'PSA 8', 8.0, 'PSA', 80),
  ((SELECT id FROM collectible_categories WHERE slug = 'sports_cards'), 'raw_nm', 'Near Mint (Raw)', 'NM', NULL, NULL, 60),
  ((SELECT id FROM collectible_categories WHERE slug = 'sports_cards'), 'raw_lp', 'Lightly Played (Raw)', 'LP', NULL, NULL, 50);

-- Hot Wheels (collector scale — no grading companies)
INSERT INTO condition_scales (category_id, slug, name, abbreviation, grade_value, grading_company, sort_order) VALUES
  ((SELECT id FROM collectible_categories WHERE slug = 'hot_wheels'), 'sealed_mint', 'Sealed / Mint on Card', 'MOC', NULL, NULL, 100),
  ((SELECT id FROM collectible_categories WHERE slug = 'hot_wheels'), 'opened_mint', 'Opened - Mint', 'Mint', NULL, NULL, 80),
  ((SELECT id FROM collectible_categories WHERE slug = 'hot_wheels'), 'opened_nm', 'Opened - Near Mint', 'NM', NULL, NULL, 60),
  ((SELECT id FROM collectible_categories WHERE slug = 'hot_wheels'), 'played_with', 'Played With', 'PW', NULL, NULL, 40),
  ((SELECT id FROM collectible_categories WHERE slug = 'hot_wheels'), 'damaged', 'Damaged', 'DMG', NULL, NULL, 20);

-- Figures (collector scale)
INSERT INTO condition_scales (category_id, slug, name, abbreviation, grade_value, grading_company, sort_order) VALUES
  ((SELECT id FROM collectible_categories WHERE slug = 'figures'), 'sealed_mint', 'Sealed / Mint in Box', 'MIB', NULL, NULL, 100),
  ((SELECT id FROM collectible_categories WHERE slug = 'figures'), 'opened_complete', 'Opened - Complete', 'OC', NULL, NULL, 70),
  ((SELECT id FROM collectible_categories WHERE slug = 'figures'), 'opened_incomplete', 'Opened - Incomplete', 'OI', NULL, NULL, 50),
  ((SELECT id FROM collectible_categories WHERE slug = 'figures'), 'loose', 'Loose / No Box', 'Loose', NULL, NULL, 30),
  ((SELECT id FROM collectible_categories WHERE slug = 'figures'), 'damaged', 'Damaged', 'DMG', NULL, NULL, 10);
