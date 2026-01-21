-- 1. Criar função para verificar se usuário pode editar uma obra específica
CREATE OR REPLACE FUNCTION public.can_edit_obra(obra_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    -- Admin sempre pode editar tudo
    public.has_role(user_uuid, 'admin'::user_role) 
    OR (
      -- Editor/GM pode editar se tiver acesso explícito à obra
      (public.has_role(user_uuid, 'editor'::user_role) OR public.has_role(user_uuid, 'gm'::user_role))
      AND EXISTS (
        SELECT 1 FROM public.user_obra_access 
        WHERE user_id = user_uuid AND obra_id = obra_uuid
      )
    );
$$;

-- 2. Criar trigger para auto-atribuir acesso quando um fiscal cria uma obra
CREATE OR REPLACE FUNCTION public.auto_assign_obra_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Quando uma obra é criada, dar acesso ao criador (se for editor/gm)
  IF (public.has_role(auth.uid(), 'editor'::user_role) OR public.has_role(auth.uid(), 'gm'::user_role)) THEN
    INSERT INTO public.user_obra_access (user_id, obra_id)
    VALUES (auth.uid(), NEW.id)
    ON CONFLICT (user_id, obra_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Criar o trigger na tabela obras
DROP TRIGGER IF EXISTS trigger_auto_assign_obra_access ON public.obras;
CREATE TRIGGER trigger_auto_assign_obra_access
  AFTER INSERT ON public.obras
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_obra_access();

-- 4. Atualizar política de UPDATE em obras para usar a nova função
DROP POLICY IF EXISTS "Users with edit permission can update obras" ON public.obras;
CREATE POLICY "Users with edit permission can update obras" 
ON public.obras 
FOR UPDATE 
USING (
  public.is_admin() 
  OR public.can_edit_obra(id)
);

-- 5. Atualizar política de DELETE em obras
DROP POLICY IF EXISTS "Users with edit permission can delete obras" ON public.obras;
CREATE POLICY "Users with edit permission can delete obras" 
ON public.obras 
FOR DELETE 
USING (
  public.is_admin() 
  OR public.can_edit_obra(id)
);

-- 6. Política de INSERT permanece permitindo editor/gm criar obras
DROP POLICY IF EXISTS "Users with edit permission can insert obras" ON public.obras;
CREATE POLICY "Users with edit permission can insert obras" 
ON public.obras 
FOR INSERT 
WITH CHECK (can_edit());

-- 7. Atribuir automaticamente acesso aos fiscais que já são "donos" de obras existentes
-- (baseado no campo fiscal_id se existir, ou created_by)
INSERT INTO public.user_obra_access (user_id, obra_id)
SELECT DISTINCT p.user_id, o.id
FROM public.obras o
JOIN public.profiles p ON p.user_id IS NOT NULL
JOIN public.user_roles ur ON ur.user_id = p.user_id
WHERE ur.role IN ('editor', 'gm')
AND NOT EXISTS (
  SELECT 1 FROM public.user_obra_access uoa 
  WHERE uoa.user_id = p.user_id AND uoa.obra_id = o.id
)
ON CONFLICT (user_id, obra_id) DO NOTHING;