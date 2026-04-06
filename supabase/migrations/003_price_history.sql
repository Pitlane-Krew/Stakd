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
