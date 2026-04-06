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
