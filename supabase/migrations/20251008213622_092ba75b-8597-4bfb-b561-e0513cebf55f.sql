-- Create function to check if user has contratada role specifically
CREATE OR REPLACE FUNCTION public.is_contratada(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.has_role(user_uuid, 'contratada'::user_role);
$$;

-- Update can_edit_rdo to include contratada (keeping prestadora for backward compatibility)
CREATE OR REPLACE FUNCTION public.can_edit_rdo(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.has_role(user_uuid, 'admin'::user_role) 
      OR public.has_role(user_uuid, 'editor'::user_role)
      OR public.has_role(user_uuid, 'gm'::user_role)
      OR public.has_role(user_uuid, 'prestadora'::user_role)
      OR public.has_role(user_uuid, 'contratada'::user_role);
$$;