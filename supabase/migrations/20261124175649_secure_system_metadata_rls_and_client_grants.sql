-- Production containment for the undocumented system metadata table.
-- No direct anon/authenticated consumer was found in the active Website repository.
-- Keep this table private: no client policies are intentionally defined.
REVOKE ALL PRIVILEGES ON TABLE public.system_metadata FROM anon, authenticated;
ALTER TABLE public.system_metadata ENABLE ROW LEVEL SECURITY;
