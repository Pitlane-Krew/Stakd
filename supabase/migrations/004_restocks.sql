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
