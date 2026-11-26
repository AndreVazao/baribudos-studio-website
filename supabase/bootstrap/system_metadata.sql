-- Manual pre-migration bootstrap for a fresh Supabase project.
-- Execute only when public.system_metadata does not yet exist, before
-- running the timestamped supabase/migrations directory.
-- Existing production already has this table; do not run there.

CREATE TABLE IF NOT EXISTS public.system_metadata (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.system_metadata ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.system_metadata FROM anon, authenticated;
