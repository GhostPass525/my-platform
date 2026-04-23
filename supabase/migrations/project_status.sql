-- Add status and published_at columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;
