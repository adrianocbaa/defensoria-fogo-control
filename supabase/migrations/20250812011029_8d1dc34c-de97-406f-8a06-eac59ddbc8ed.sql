-- Enable RLS on aditivo tables
ALTER TABLE IF EXISTS public.aditivo_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.aditivo_items ENABLE ROW LEVEL SECURITY;

-- Policies for aditivo_sessions
DO $$
BEGIN
  CREATE POLICY "Authenticated can SELECT aditivo_sessions"
    ON public.aditivo_sessions
    FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Authenticated can INSERT aditivo_sessions"
    ON public.aditivo_sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Authenticated can UPDATE aditivo_sessions"
    ON public.aditivo_sessions
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Authenticated can DELETE aditivo_sessions"
    ON public.aditivo_sessions
    FOR DELETE
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Policies for aditivo_items
DO $$
BEGIN
  CREATE POLICY "Authenticated can SELECT aditivo_items"
    ON public.aditivo_items
    FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Authenticated can INSERT aditivo_items"
    ON public.aditivo_items
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Authenticated can UPDATE aditivo_items"
    ON public.aditivo_items
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Authenticated can DELETE aditivo_items"
    ON public.aditivo_items
    FOR DELETE
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;