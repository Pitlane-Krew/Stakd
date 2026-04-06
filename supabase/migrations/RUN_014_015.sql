-- ============================================================
-- STAKD: Run Migrations 014 + 015 (paste into Supabase SQL Editor)
-- Categories, Subcategories, Attribute Defs, Sets, Master Items, Variants, Conditions
-- ============================================================

-- ===================== 014: CATEGORIES =====================

CREATE TABLE IF NOT EXISTS collectible_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  icon_url    TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collectible_subcategories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES collectible_categories(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, slug)
);

CREATE TABLE IF NOT EXISTS category_attribute_defs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   UUID NOT NULL REFERENCES collectible_categories(id) ON DELETE CASCADE,
  attribute_key TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  data_type     TEXT NOT NULL DEFAULT 'text',
  is_required   BOOLEAN NOT NULL DEFAULT false,
  is_searchable BOOLEAN NOT NULL DEFAULT true,
  is_filterable BOOLEAN NOT NULL DEFAULT true,
  options       JSONB,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, attribute_key)
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON collectible_categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active ON collectible_categories(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_subcategories_category ON collectible_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_attr_defs_category ON category_attribute_defs(category_id);

CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON collectible_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_subcategories_updated_at
  BEFORE UPDATE ON collectible_subcategories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE collectible_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE collectible_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_attribute_defs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_public_read" ON collectible_categories FOR SELECT USING (true);
CREATE POLICY "subcategories_public_read" ON collectible_subcategories FOR SELECT USING (true);
CREATE POLICY "attr_defs_public_read" ON category_attribute_defs FOR SELECT USING (true);
CREATE POLICY "categories_admin_write" ON collectible_categories FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "subcategories_admin_write" ON collectible_subcategories FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "attr_defs_admin_write" ON category_attribute_defs FOR ALL USING (is_admin(auth.uid()));

-- SEED CATEGORIES
INSERT INTO collectible_categories (slug, name, description, sort_order, metadata) VALUES
  ('pokemon_tcg', 'Pokémon TCG', 'Pokémon Trading Card Game cards and sealed products', 1, '{"grading_supported": true, "default_condition_scale": "psa"}'),
  ('sports_cards', 'Sports Cards', 'Baseball, basketball, football, hockey, and soccer trading cards', 2, '{"grading_supported": true, "default_condition_scale": "psa"}'),
  ('hot_wheels', 'Hot Wheels', 'Hot Wheels and diecast vehicles', 3, '{"grading_supported": false, "default_condition_scale": "collector"}'),
  ('figures', 'Figures & Toys', 'Action figures, Funko Pops, statues, and collectible toys', 4, '{"grading_supported": false, "default_condition_scale": "collector"}')
ON CONFLICT (slug) DO NOTHING;

-- SEED POKEMON TCG ATTRIBUTES
INSERT INTO category_attribute_defs (category_id, attribute_key, display_name, data_type, is_required, sort_order, options) VALUES
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'card_name', 'Card Name', 'text', true, 1, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'card_number', 'Card Number', 'text', true, 2, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'rarity', 'Rarity', 'select', false, 3, '["Common","Uncommon","Rare","Holo Rare","Ultra Rare","Secret Rare","Illustration Rare","Special Art Rare","Hyper Rare","Gold"]'),
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'card_type', 'Card Type', 'select', false, 4, '["Pokémon","Trainer","Energy","VSTAR","VMAX","V","EX","GX","Tag Team"]'),
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'holo_type', 'Holo Type', 'select', false, 5, '["None","Holo","Reverse Holo","Full Art","Alt Art","Rainbow","Gold"]'),
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'language', 'Language', 'select', false, 6, '["English","Japanese","Korean","Chinese","French","German","Spanish","Italian","Portuguese"]'),
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'first_edition', 'First Edition', 'boolean', false, 7, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'shadowless', 'Shadowless', 'boolean', false, 8, NULL);

-- SEED SPORTS CARDS ATTRIBUTES
INSERT INTO category_attribute_defs (category_id, attribute_key, display_name, data_type, is_required, sort_order, options) VALUES
  ((SELECT id FROM collectible_categories WHERE slug = 'sports_cards'), 'player_name', 'Player Name', 'text', true, 1, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'sports_cards'), 'team', 'Team', 'text', false, 2, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'sports_cards'), 'sport', 'Sport', 'select', true, 3, '["Baseball","Basketball","Football","Hockey","Soccer","Boxing","UFC","Wrestling","Golf","Tennis"]'),
  ((SELECT id FROM collectible_categories WHERE slug = 'sports_cards'), 'card_year', 'Year', 'number', false, 4, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'sports_cards'), 'brand', 'Brand', 'select', false, 5, '["Topps","Panini","Upper Deck","Bowman","Fleer","Donruss","Prizm","Select","National Treasures","Optic"]'),
  ((SELECT id FROM collectible_categories WHERE slug = 'sports_cards'), 'card_number', 'Card Number', 'text', false, 6, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'sports_cards'), 'is_rookie', 'Rookie Card', 'boolean', false, 7, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'sports_cards'), 'is_auto', 'Autographed', 'boolean', false, 8, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'sports_cards'), 'is_relic', 'Game-Used Relic', 'boolean', false, 9, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'sports_cards'), 'serial_numbered', 'Serial Numbered', 'text', false, 10, NULL);

-- SEED HOT WHEELS ATTRIBUTES
INSERT INTO category_attribute_defs (category_id, attribute_key, display_name, data_type, is_required, sort_order, options) VALUES
  ((SELECT id FROM collectible_categories WHERE slug = 'hot_wheels'), 'model_name', 'Model Name', 'text', true, 1, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'hot_wheels'), 'series_name', 'Series', 'text', false, 2, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'hot_wheels'), 'case_code', 'Case Code', 'text', false, 3, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'hot_wheels'), 'collector_number', 'Collector Number', 'text', false, 4, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'hot_wheels'), 'color', 'Color', 'text', false, 5, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'hot_wheels'), 'is_treasure_hunt', 'Treasure Hunt', 'boolean', false, 6, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'hot_wheels'), 'is_super_treasure_hunt', 'Super Treasure Hunt', 'boolean', false, 7, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'hot_wheels'), 'wheel_type', 'Wheel Type', 'select', false, 8, '["Basic","Real Riders","5-Spoke","10-Spoke","Other"]'),
  ((SELECT id FROM collectible_categories WHERE slug = 'hot_wheels'), 'year_released', 'Year Released', 'number', false, 9, NULL);

-- SEED FIGURES ATTRIBUTES
INSERT INTO category_attribute_defs (category_id, attribute_key, display_name, data_type, is_required, sort_order, options) VALUES
  ((SELECT id FROM collectible_categories WHERE slug = 'figures'), 'figure_name', 'Figure Name', 'text', true, 1, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'figures'), 'brand', 'Brand', 'select', false, 2, '["Funko","McFarlane","NECA","Hasbro","Mattel","Bandai","Hot Toys","Sideshow","Mezco","Super7","Jazwares"]'),
  ((SELECT id FROM collectible_categories WHERE slug = 'figures'), 'figure_line', 'Product Line', 'text', false, 3, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'figures'), 'figure_number', 'Figure Number', 'text', false, 4, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'figures'), 'edition', 'Edition', 'select', false, 5, '["Standard","Exclusive","Limited Edition","Convention Exclusive","Chase","Flocked","Glow in the Dark"]'),
  ((SELECT id FROM collectible_categories WHERE slug = 'figures'), 'is_vaulted', 'Vaulted/Retired', 'boolean', false, 6, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'figures'), 'is_chase', 'Chase Variant', 'boolean', false, 7, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'figures'), 'scale', 'Scale', 'select', false, 8, '["1:6","1:10","1:12","1:18","3.75\"","6\"","7\"","12\"","Pop!","Other"]');

-- ===================== 015: MASTER CATALOG =====================

CREATE TABLE IF NOT EXISTS collectible_sets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     UUID NOT NULL REFERENCES collectible_categories(id) ON DELETE CASCADE,
  subcategory_id  UUID REFERENCES collectible_subcategories(id) ON DELETE SET NULL,
  slug            TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  release_date    DATE,
  total_items     INTEGER,
  image_url       TEXT,
  logo_url        TEXT,
  attributes      JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, slug)
);

CREATE TABLE IF NOT EXISTS master_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     UUID NOT NULL REFERENCES collectible_categories(id) ON DELETE CASCADE,
  set_id          UUID REFERENCES collectible_sets(id) ON DELETE SET NULL,
  slug            TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  image_url       TEXT,
  thumbnail_url   TEXT,
  set_position    INTEGER,
  attributes      JSONB NOT NULL DEFAULT '{}',
  external_ids    JSONB NOT NULL DEFAULT '{}',
  tags            TEXT[] DEFAULT '{}',
  popularity      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES profiles(id),
  verified        BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, slug)
);

CREATE TABLE IF NOT EXISTS master_variants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_item_id  UUID NOT NULL REFERENCES master_items(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  image_url       TEXT,
  attributes      JSONB NOT NULL DEFAULT '{}',
  sku             TEXT,
  is_default      BOOLEAN NOT NULL DEFAULT false,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(master_item_id, slug)
);

CREATE TABLE IF NOT EXISTS condition_scales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     UUID NOT NULL REFERENCES collectible_categories(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL,
  name            TEXT NOT NULL,
  abbreviation    TEXT,
  grade_value     NUMERIC(4,1),
  grading_company TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_sets_category ON collectible_sets(category_id);
CREATE INDEX IF NOT EXISTS idx_sets_slug ON collectible_sets(slug);
CREATE INDEX IF NOT EXISTS idx_sets_release ON collectible_sets(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_sets_active ON collectible_sets(category_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_master_items_category ON master_items(category_id);
CREATE INDEX IF NOT EXISTS idx_master_items_set ON master_items(set_id);
CREATE INDEX IF NOT EXISTS idx_master_items_slug ON master_items(slug);
CREATE INDEX IF NOT EXISTS idx_master_items_popularity ON master_items(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_master_items_tags ON master_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_master_items_attrs ON master_items USING GIN(attributes);
CREATE INDEX IF NOT EXISTS idx_master_items_external ON master_items USING GIN(external_ids);
CREATE INDEX IF NOT EXISTS idx_master_items_verified ON master_items(verified) WHERE verified = true;
CREATE INDEX IF NOT EXISTS idx_master_items_search ON master_items USING GIN(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));
CREATE INDEX IF NOT EXISTS idx_variants_master ON master_variants(master_item_id);
CREATE INDEX IF NOT EXISTS idx_variants_default ON master_variants(master_item_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_conditions_category ON condition_scales(category_id);

CREATE TRIGGER set_sets_updated_at BEFORE UPDATE ON collectible_sets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_master_items_updated_at BEFORE UPDATE ON master_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_variants_updated_at BEFORE UPDATE ON master_variants FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE collectible_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE condition_scales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sets_public_read" ON collectible_sets FOR SELECT USING (true);
CREATE POLICY "master_items_public_read" ON master_items FOR SELECT USING (true);
CREATE POLICY "variants_public_read" ON master_variants FOR SELECT USING (true);
CREATE POLICY "conditions_public_read" ON condition_scales FOR SELECT USING (true);
CREATE POLICY "master_items_auth_insert" ON master_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "sets_admin_write" ON collectible_sets FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "master_items_admin_write" ON master_items FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "variants_admin_write" ON master_variants FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "conditions_admin_write" ON condition_scales FOR ALL USING (is_admin(auth.uid()));

-- SEED CONDITION SCALES
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
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'raw_dmg', 'Damaged (Raw)', 'DMG', NULL, NULL, 20),
  ((SELECT id FROM collectible_categories WHERE slug = 'sports_cards'), 'psa_10', 'PSA 10 Gem Mint', 'PSA 10', 10.0, 'PSA', 100),
  ((SELECT id FROM collectible_categories WHERE slug = 'sports_cards'), 'psa_9', 'PSA 9 Mint', 'PSA 9', 9.0, 'PSA', 90),
  ((SELECT id FROM collectible_categories WHERE slug = 'sports_cards'), 'psa_8', 'PSA 8 NM-MT', 'PSA 8', 8.0, 'PSA', 80),
  ((SELECT id FROM collectible_categories WHERE slug = 'sports_cards'), 'raw_nm', 'Near Mint (Raw)', 'NM', NULL, NULL, 60),
  ((SELECT id FROM collectible_categories WHERE slug = 'sports_cards'), 'raw_lp', 'Lightly Played (Raw)', 'LP', NULL, NULL, 50),
  ((SELECT id FROM collectible_categories WHERE slug = 'hot_wheels'), 'sealed_mint', 'Sealed / Mint on Card', 'MOC', NULL, NULL, 100),
  ((SELECT id FROM collectible_categories WHERE slug = 'hot_wheels'), 'opened_mint', 'Opened - Mint', 'Mint', NULL, NULL, 80),
  ((SELECT id FROM collectible_categories WHERE slug = 'hot_wheels'), 'opened_nm', 'Opened - Near Mint', 'NM', NULL, NULL, 60),
  ((SELECT id FROM collectible_categories WHERE slug = 'hot_wheels'), 'played_with', 'Played With', 'PW', NULL, NULL, 40),
  ((SELECT id FROM collectible_categories WHERE slug = 'hot_wheels'), 'damaged', 'Damaged', 'DMG', NULL, NULL, 20),
  ((SELECT id FROM collectible_categories WHERE slug = 'figures'), 'sealed_mint', 'Sealed / Mint in Box', 'MIB', NULL, NULL, 100),
  ((SELECT id FROM collectible_categories WHERE slug = 'figures'), 'opened_complete', 'Opened - Complete', 'OC', NULL, NULL, 70),
  ((SELECT id FROM collectible_categories WHERE slug = 'figures'), 'opened_incomplete', 'Opened - Incomplete', 'OI', NULL, NULL, 50),
  ((SELECT id FROM collectible_categories WHERE slug = 'figures'), 'loose', 'Loose / No Box', 'Loose', NULL, NULL, 30),
  ((SELECT id FROM collectible_categories WHERE slug = 'figures'), 'damaged', 'Damaged', 'DMG', NULL, NULL, 10);
