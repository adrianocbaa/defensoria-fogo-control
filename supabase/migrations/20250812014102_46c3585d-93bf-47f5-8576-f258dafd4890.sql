-- Add SELECT policies so imported/saved data can be read back
-- Enable RLS (no-op if already enabled)
ALTER TABLE IF EXISTS public.orcamento_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.medicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.aditivos ENABLE ROW LEVEL SECURITY;

-- orcamento_items: allow SELECT for authenticated users
DO $$
BEGIN
  CREATE POLICY "Authenticated can SELECT orcamento_items"
    ON public.orcamento_items
    FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- medicoes: allow SELECT for authenticated users
DO $$
BEGIN
  CREATE POLICY "Authenticated can SELECT medicoes"
    ON public.medicoes
    FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- aditivos: allow SELECT for authenticated users
DO $$
BEGIN
  CREATE POLICY "Authenticated can SELECT aditivos"
    ON public.aditivos
    FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
