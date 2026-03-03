
-- Atualizar can_edit para incluir demo
CREATE OR REPLACE FUNCTION public.can_edit(user_uuid uuid DEFAULT auth.uid())
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

-- Atualizar is_admin para demo também (acesso total aos dados demo)
CREATE OR REPLACE FUNCTION public.is_demo_user(user_uuid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.has_role(user_uuid, 'demo'::user_role);
$function$;

-- Política nas obras: demo só vê is_demo=true, mas com can_edit já incluído
-- Garantir que a policy de obras permita demo ver apenas obras demo
DROP POLICY IF EXISTS "Demo users can view demo obras" ON public.obras;
CREATE POLICY "Demo users can view demo obras"
ON public.obras FOR SELECT
USING (
  public.has_role(auth.uid(), 'demo'::user_role) AND is_demo = true
);

-- Demo pode editar obras demo
DROP POLICY IF EXISTS "Demo users can update demo obras" ON public.obras;
CREATE POLICY "Demo users can update demo obras"
ON public.obras FOR UPDATE
USING (
  public.has_role(auth.uid(), 'demo'::user_role) AND is_demo = true
);
