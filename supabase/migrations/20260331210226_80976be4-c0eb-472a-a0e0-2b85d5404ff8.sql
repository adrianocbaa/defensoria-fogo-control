-- 1. Drop the old generic SELECT policies that leak data to contratada
DROP POLICY IF EXISTS "obras_select_v2" ON public.obras;
DROP POLICY IF EXISTS "Authenticated users with edit permission can view obras" ON public.obras;

-- 2. Recreate obras_select_v2 EXCLUDING contratada users
CREATE POLICY "obras_select_v2" ON public.obras FOR SELECT USING (
  -- Contratada users are handled by their own specific policy
  NOT public.has_role(auth.uid(), 'contratada'::user_role)
  AND (
    -- Demo users see only demo obras
    (public.is_demo_user(auth.uid()) AND is_demo = true)
    OR
    -- Non-demo users see non-demo obras
    (NOT public.is_demo_user(auth.uid()) AND (is_demo = false OR is_demo IS NULL))
    OR
    -- Public obras visible to non-demo users
    (is_public = true AND NOT public.is_demo_user(auth.uid()))
  )
);

-- 3. The "Contratada users can view assigned obras" policy already exists and is correct
-- It restricts contratada to only obras they have access to via user_obra_access