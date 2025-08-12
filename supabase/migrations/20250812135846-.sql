-- Tighten access to sensitive financial tables
-- 1) aditivo_items: remove overly permissive policies and restrict to can_edit()
DROP POLICY IF EXISTS "Authenticated can SELECT aditivo_items" ON public.aditivo_items;
DROP POLICY IF EXISTS "Public can view aditivo_items" ON public.aditivo_items;
DROP POLICY IF EXISTS "Authenticated can INSERT aditivo_items" ON public.aditivo_items;
DROP POLICY IF EXISTS "Authenticated can UPDATE aditivo_items" ON public.aditivo_items;
DROP POLICY IF EXISTS "Authenticated can DELETE aditivo_items" ON public.aditivo_items;

-- Ensure a strict SELECT policy
CREATE POLICY "Users with edit permission can select aditivo_items"
ON public.aditivo_items
FOR SELECT
USING (can_edit());

-- Note: insert/update/delete policies restricted to can_edit() already exist; we keep them.

-- 2) medicao_items: remove permissive SELECT and restrict to can_edit()
DROP POLICY IF EXISTS "All authenticated users can view medicao_items" ON public.medicao_items;

CREATE POLICY "Users with edit permission can select medicao_items"
ON public.medicao_items
FOR SELECT
USING (can_edit());