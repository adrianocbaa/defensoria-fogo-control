
-- Adicionar papel 'demo' à função can_edit_rdo
CREATE OR REPLACE FUNCTION public.can_edit_rdo(user_uuid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.has_role(user_uuid, 'admin'::user_role) 
      OR public.has_role(user_uuid, 'editor'::user_role)
      OR public.has_role(user_uuid, 'gm'::user_role)
      OR public.has_role(user_uuid, 'prestadora'::user_role)
      OR public.has_role(user_uuid, 'contratada'::user_role)
      OR public.has_role(user_uuid, 'demo'::user_role);
$function$;
