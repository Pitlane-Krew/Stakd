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
