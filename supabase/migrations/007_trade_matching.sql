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
