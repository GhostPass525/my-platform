-- Add published_html and published_at to sites table
ALTER TABLE sites ADD COLUMN IF NOT EXISTS published_html TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;
