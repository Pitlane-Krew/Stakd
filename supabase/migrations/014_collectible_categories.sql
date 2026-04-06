-- ============================================================
-- MIGRATION 014: Universal Collectible Categories
-- ============================================================
-- Foundation layer: categories and subcategories for all verticals.
-- This replaces the free-text 'category' column approach with a
-- structured, extensible registry.
-- ============================================================

-- Master category registry
CREATE TABLE IF NOT EXISTS collectible_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,              -- 'pokemon_tcg', 'sports_cards', 'hot_wheels', 'figures'
  name        TEXT NOT NULL,                     -- 'Pokémon TCG'
  description TEXT,
  icon_url    TEXT,                              -- Category icon for UI
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  metadata    JSONB NOT NULL DEFAULT '{}',       -- Extensible per-category config
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subcategories within a category (e.g., Pokemon TCG -> "Base Set Era", "Modern", "Japanese")
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

-- Category-specific attribute definitions (schema registry)
-- This tells the system what fields each category supports
CREATE TABLE IF NOT EXISTS category_attribute_defs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   UUID NOT NULL REFERENCES collectible_categories(id) ON DELETE CASCADE,
  attribute_key TEXT NOT NULL,                    -- 'card_number', 'player_name', 'case_code'
  display_name  TEXT NOT NULL,                    -- 'Card Number', 'Player Name'
  data_type     TEXT NOT NULL DEFAULT 'text',     -- text, number, boolean, select, multi_select
  is_required   BOOLEAN NOT NULL DEFAULT false,
  is_searchable BOOLEAN NOT NULL DEFAULT true,
  is_filterable BOOLEAN NOT NULL DEFAULT true,
  options       JSONB,                            -- For select/multi_select: ["Common","Uncommon","Rare"]
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, attribute_key)
);

-- Indexes
CREATE INDEX idx_categories_slug ON collectible_categories(slug);
CREATE INDEX idx_categories_active ON collectible_categories(is_active) WHERE is_active = true;
CREATE INDEX idx_subcategories_category ON collectible_subcategories(category_id);
CREATE INDEX idx_attr_defs_category ON category_attribute_defs(category_id);

-- Updated_at trigger
CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON collectible_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_subcategories_updated_at
  BEFORE UPDATE ON collectible_subcategories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE collectible_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE collectible_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_attribute_defs ENABLE ROW LEVEL SECURITY;

-- Public read for all
CREATE POLICY "categories_public_read" ON collectible_categories
  FOR SELECT USING (true);
CREATE POLICY "subcategories_public_read" ON collectible_subcategories
  FOR SELECT USING (true);
CREATE POLICY "attr_defs_public_read" ON category_attribute_defs
  FOR SELECT USING (true);

-- Admin write only
CREATE POLICY "categories_admin_write" ON collectible_categories
  FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "subcategories_admin_write" ON collectible_subcategories
  FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "attr_defs_admin_write" ON category_attribute_defs
  FOR ALL USING (is_admin(auth.uid()));

-- ============================================================
-- SEED: Initial categories
-- ============================================================
INSERT INTO collectible_categories (slug, name, description, sort_order, metadata) VALUES
  ('pokemon_tcg', 'Pokémon TCG', 'Pokémon Trading Card Game cards and sealed products', 1, '{"grading_supported": true, "default_condition_scale": "psa"}'),
  ('sports_cards', 'Sports Cards', 'Baseball, basketball, football, hockey, and soccer trading cards', 2, '{"grading_supported": true, "default_condition_scale": "psa"}'),
  ('hot_wheels', 'Hot Wheels', 'Hot Wheels and diecast vehicles', 3, '{"grading_supported": false, "default_condition_scale": "collector"}'),
  ('figures', 'Figures & Toys', 'Action figures, Funko Pops, statues, and collectible toys', 4, '{"grading_supported": false, "default_condition_scale": "collector"}')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- SEED: Attribute definitions per category
-- ============================================================

-- POKEMON TCG attributes
INSERT INTO category_attribute_defs (category_id, attribute_key, display_name, data_type, is_required, sort_order, options) VALUES
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'card_name', 'Card Name', 'text', true, 1, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'card_number', 'Card Number', 'text', true, 2, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'rarity', 'Rarity', 'select', false, 3, '["Common","Uncommon","Rare","Holo Rare","Ultra Rare","Secret Rare","Illustration Rare","Special Art Rare","Hyper Rare","Gold"]'),
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'card_type', 'Card Type', 'select', false, 4, '["Pokémon","Trainer","Energy","VSTAR","VMAX","V","EX","GX","Tag Team"]'),
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'holo_type', 'Holo Type', 'select', false, 5, '["None","Holo","Reverse Holo","Full Art","Alt Art","Rainbow","Gold"]'),
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'language', 'Language', 'select', false, 6, '["English","Japanese","Korean","Chinese","French","German","Spanish","Italian","Portuguese"]'),
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'first_edition', 'First Edition', 'boolean', false, 7, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'pokemon_tcg'), 'shadowless', 'Shadowless', 'boolean', false, 8, NULL);

-- SPORTS CARDS attributes
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

-- HOT WHEELS attributes
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

-- FIGURES attributes
INSERT INTO category_attribute_defs (category_id, attribute_key, display_name, data_type, is_required, sort_order, options) VALUES
  ((SELECT id FROM collectible_categories WHERE slug = 'figures'), 'figure_name', 'Figure Name', 'text', true, 1, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'figures'), 'brand', 'Brand', 'select', false, 2, '["Funko","McFarlane","NECA","Hasbro","Mattel","Bandai","Hot Toys","Sideshow","Mezco","Super7","Jazwares"]'),
  ((SELECT id FROM collectible_categories WHERE slug = 'figures'), 'figure_line', 'Product Line', 'text', false, 3, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'figures'), 'figure_number', 'Figure Number', 'text', false, 4, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'figures'), 'edition', 'Edition', 'select', false, 5, '["Standard","Exclusive","Limited Edition","Convention Exclusive","Chase","Flocked","Glow in the Dark"]'),
  ((SELECT id FROM collectible_categories WHERE slug = 'figures'), 'is_vaulted', 'Vaulted/Retired', 'boolean', false, 6, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'figures'), 'is_chase', 'Chase Variant', 'boolean', false, 7, NULL),
  ((SELECT id FROM collectible_categories WHERE slug = 'figures'), 'scale', 'Scale', 'select', false, 8, '["1:6","1:10","1:12","1:18","3.75\"","6\"","7\"","12\"","Pop!","Other"]');
