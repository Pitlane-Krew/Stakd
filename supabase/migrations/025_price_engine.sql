-- Enhanced price history with retail + resell values
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS retail_price NUMERIC;
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS resell_price NUMERIC;
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS price_source TEXT DEFAULT 'api';
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS condition_modifier NUMERIC DEFAULT 1.0;

-- Price snapshots for charting (daily aggregates)
CREATE TABLE IF NOT EXISTS price_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  retail_price NUMERIC,
  resell_price NUMERIC,
  market_price NUMERIC,
  low_price NUMERIC,
  high_price NUMERIC,
  source TEXT DEFAULT 'api',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, date)
);

CREATE INDEX IF NOT EXISTS idx_price_snapshots_item_date ON price_snapshots(item_id, date DESC);

-- Trade messages for real-time chat
CREATE TABLE IF NOT EXISTS trade_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_messages_trade ON trade_messages(trade_id, created_at);

-- RLS for trade_messages
ALTER TABLE trade_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages for their trades"
  ON trade_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trades
      WHERE trades.id = trade_messages.trade_id
      AND (trades.initiator_id = auth.uid() OR trades.receiver_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their trades"
  ON trade_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM trades
      WHERE trades.id = trade_messages.trade_id
      AND (trades.initiator_id = auth.uid() OR trades.receiver_id = auth.uid())
    )
  );

-- Notifications table (if not exists)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  entity_id TEXT,
  entity_type TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Enable Realtime for trade_messages and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE trade_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE price_snapshots;
