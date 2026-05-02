-- ============================================================
-- Part 8: Printful master account + enhanced orders tracking
-- Run in Supabase SQL Editor
-- Safe to re-run (uses IF NOT EXISTS / IF EXISTS)
-- ============================================================

-- NOTE: There is no standalone "products" table in this schema.
-- Products live inside sites.site_json (JSONB array).
-- Fields like printful_product_id, design_url, base_printful_cost, etc.
-- are stored as properties on each product object in that JSON blob.
-- No SQL migration is needed for product-level fields.

-- ── orders: Printful fulfillment + financial split tracking ────

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS printful_order_id    TEXT,
  ADD COLUMN IF NOT EXISTS shipping_method      TEXT,
  ADD COLUMN IF NOT EXISTS shipping_cost        DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS tracking_number      TEXT,
  ADD COLUMN IF NOT EXISTS tracking_url         TEXT,
  ADD COLUMN IF NOT EXISTS printful_cost        DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS platform_fee         DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS owner_payout         DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS sent_to_printful_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipped_at           TIMESTAMPTZ;

-- ── stripe_connect: metadata columns (charges/payouts/UNIQUE already exist)

ALTER TABLE stripe_connect
  ADD COLUMN IF NOT EXISTS account_type   TEXT DEFAULT 'express',
  ADD COLUMN IF NOT EXISTS activated_at   TIMESTAMPTZ;

-- ── ai_generations: token / cost tracking for future use ──────

CREATE TABLE IF NOT EXISTS ai_generations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES profiles(id),
  prompt     TEXT,
  image_url  TEXT,
  cost       DECIMAL(10,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_generations" ON ai_generations;
CREATE POLICY "users_select_own_generations" ON ai_generations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_insert_own_generations" ON ai_generations;
CREATE POLICY "users_insert_own_generations" ON ai_generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
