-- Update RLS policies to allow editors to manage module visibility
-- Keep existing SELECT policy; replace INSERT/DELETE admin-only with can_edit()

ALTER TABLE public.nucleo_module_visibility ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can insert nucleo_module_visibility" ON public.nucleo_module_visibility;
DROP POLICY IF EXISTS "Admins can delete nucleo_module_visibility" ON public.nucleo_module_visibility;

CREATE POLICY "Editors can insert nucleo_module_visibility"
ON public.nucleo_module_visibility
FOR INSERT
TO authenticated
WITH CHECK (can_edit());

CREATE POLICY "Editors can delete nucleo_module_visibility"
ON public.nucleo_module_visibility
FOR DELETE
TO authenticated
USING (can_edit());