CREATE TABLE IF NOT EXISTS stripe_connect (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  connected_account_id TEXT,
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stripe_connect ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connect data" ON stripe_connect
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access" ON stripe_connect
  USING (true) WITH CHECK (true);
