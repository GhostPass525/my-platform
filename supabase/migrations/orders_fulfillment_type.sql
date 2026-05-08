-- Add fulfillment_type and tracking fields to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS fulfillment_type text,         -- 'printful' | 'manual' | null
  ADD COLUMN IF NOT EXISTS tracking_number text,          -- filled by store owner for manual orders
  ADD COLUMN IF NOT EXISTS tracking_carrier text;         -- e.g. 'USPS', 'UPS', 'FedEx'
