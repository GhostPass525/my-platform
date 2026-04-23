-- ============================================================
-- Full schema for projects + sites tables with RLS policies
-- Run this in the Supabase SQL editor
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS)
-- ============================================================

-- ── projects ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        text NOT NULL,
  status      text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

-- Add columns if table already exists but is missing them
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_projects" ON projects;
CREATE POLICY "users_select_own_projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_insert_own_projects" ON projects;
CREATE POLICY "users_insert_own_projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_update_own_projects" ON projects;
CREATE POLICY "users_update_own_projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_delete_own_projects" ON projects;
CREATE POLICY "users_delete_own_projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- ── sites ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sites (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id     uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  site_json      jsonb,
  published_html text,
  published_at   timestamptz,
  created_at     timestamptz DEFAULT now() NOT NULL,
  updated_at     timestamptz DEFAULT now() NOT NULL
);

-- Add columns if table already exists but is missing them
ALTER TABLE sites ADD COLUMN IF NOT EXISTS published_html text;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Ensure unique constraint on project_id for upsert to work
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sites_project_id_key' AND conrelid = 'sites'::regclass
  ) THEN
    ALTER TABLE sites ADD CONSTRAINT sites_project_id_key UNIQUE (project_id);
  END IF;
END $$;

-- RLS
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_sites" ON sites;
CREATE POLICY "users_select_own_sites" ON sites
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_insert_own_sites" ON sites;
CREATE POLICY "users_insert_own_sites" ON sites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_update_own_sites" ON sites;
CREATE POLICY "users_update_own_sites" ON sites
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_delete_own_sites" ON sites;
CREATE POLICY "users_delete_own_sites" ON sites
  FOR DELETE USING (auth.uid() = user_id);
