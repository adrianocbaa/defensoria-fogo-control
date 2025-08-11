-- Create aditivo sessions and items tables for persisting addenda

-- 1) Table: aditivo_sessions
CREATE TABLE IF NOT EXISTS public.aditivo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL,
  sequencia INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberta',
  user_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.aditivo_sessions ENABLE ROW LEVEL SECURITY;

-- Policies (mirroring medicao_sessions)
DROP POLICY IF EXISTS "Public can view aditivo_sessions" ON public.aditivo_sessions;
CREATE POLICY "Public can view aditivo_sessions"
ON public.aditivo_sessions
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users with edit permission can insert aditivo_sessions" ON public.aditivo_sessions;
CREATE POLICY "Users with edit permission can insert aditivo_sessions"
ON public.aditivo_sessions
FOR INSERT
WITH CHECK (public.can_edit());

DROP POLICY IF EXISTS "Users with edit permission can update aditivo_sessions" ON public.aditivo_sessions;
CREATE POLICY "Users with edit permission can update aditivo_sessions"
ON public.aditivo_sessions
FOR UPDATE
USING (public.can_edit());

DROP POLICY IF EXISTS "Users with edit permission can delete aditivo_sessions" ON public.aditivo_sessions;
CREATE POLICY "Users with edit permission can delete aditivo_sessions"
ON public.aditivo_sessions
FOR DELETE
USING (public.can_edit());

-- Update trigger
DROP TRIGGER IF EXISTS update_aditivo_sessions_updated_at ON public.aditivo_sessions;
CREATE TRIGGER update_aditivo_sessions_updated_at
BEFORE UPDATE ON public.aditivo_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Table: aditivo_items
CREATE TABLE IF NOT EXISTS public.aditivo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aditivo_id UUID NOT NULL,
  item_code TEXT NOT NULL,
  qtd NUMERIC NOT NULL DEFAULT 0,
  pct NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  user_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT aditivo_items_unique UNIQUE (aditivo_id, item_code)
);

-- Enable RLS
ALTER TABLE public.aditivo_items ENABLE ROW LEVEL SECURITY;

-- Policies (mirroring medicao_items)
DROP POLICY IF EXISTS "Public can view aditivo_items" ON public.aditivo_items;
CREATE POLICY "Public can view aditivo_items"
ON public.aditivo_items
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users with edit permission can insert aditivo_items" ON public.aditivo_items;
CREATE POLICY "Users with edit permission can insert aditivo_items"
ON public.aditivo_items
FOR INSERT
WITH CHECK (public.can_edit());

DROP POLICY IF EXISTS "Users with edit permission can update aditivo_items" ON public.aditivo_items;
CREATE POLICY "Users with edit permission can update aditivo_items"
ON public.aditivo_items
FOR UPDATE
USING (public.can_edit());

DROP POLICY IF EXISTS "Users with edit permission can delete aditivo_items" ON public.aditivo_items;
CREATE POLICY "Users with edit permission can delete aditivo_items"
ON public.aditivo_items
FOR DELETE
USING (public.can_edit());

-- Update trigger
DROP TRIGGER IF EXISTS update_aditivo_items_updated_at ON public.aditivo_items;
CREATE TRIGGER update_aditivo_items_updated_at
BEFORE UPDATE ON public.aditivo_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();