-- Printful integration: stores OAuth tokens per user/site
-- Run this in the Supabase SQL editor before deploying

CREATE TABLE IF NOT EXISTS printful_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id TEXT,
  access_token TEXT NOT NULL,
  store_id TEXT,
  store_name TEXT,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, site_id)
);

ALTER TABLE printful_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own connections" ON printful_connections
  FOR ALL USING (auth.uid() = user_id);
