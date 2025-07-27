-- Atualizar a função can_edit para incluir o role 'gm'
CREATE OR REPLACE FUNCTION public.can_edit(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = user_uuid AND role IN ('admin', 'editor', 'gm')
  );
$function$;