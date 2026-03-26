-- Extend orders table with fulfillment fields
-- Run this in your Supabase SQL editor

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS product_name text,
  ADD COLUMN IF NOT EXISTS product_type text default 'physical',
  ADD COLUMN IF NOT EXISTS product_variants jsonb,
  ADD COLUMN IF NOT EXISTS amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS currency text default 'usd',
  ADD COLUMN IF NOT EXISTS shipping_address jsonb,
  ADD COLUMN IF NOT EXISTS preferred_datetime text,
  ADD COLUMN IF NOT EXISTS customer_notes text,
  ADD COLUMN IF NOT EXISTS fulfillment_status text not null default 'unfulfilled',
  ADD COLUMN IF NOT EXISTS fulfillment_notes text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_session_id text;

-- Backfill amount from total for existing orders
UPDATE orders SET amount = total WHERE amount IS NULL AND total IS NOT NULL;

-- Allow store owners to update fulfillment status on their own orders
DO $$ BEGIN
  CREATE POLICY "users_update_own_orders" ON orders
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
