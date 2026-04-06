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
