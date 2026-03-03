
-- Migração 2: Funções helpers e políticas RLS de isolamento demo

-- Helper: is_demo_user (usa texto para evitar problema de enum)
CREATE OR REPLACE FUNCTION public.is_demo_user(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = user_uuid AND role::text = 'demo'
  );
$$;

-- Helper: verifica se uma obra é demo
CREATE OR REPLACE FUNCTION public.obra_is_demo(obra_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_demo FROM public.obras WHERE id = obra_uuid), false);
$$;

-- Atualizar can_edit_obra para bloquear demo em obras reais
CREATE OR REPLACE FUNCTION public.can_edit_obra(obra_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE
      WHEN public.is_demo_user(user_uuid) THEN
        public.obra_is_demo(obra_uuid)
      ELSE
        NOT public.obra_is_demo(obra_uuid)
        AND (
          public.has_role(user_uuid, 'admin'::user_role) 
          OR (
            (public.has_role(user_uuid, 'editor'::user_role) OR public.has_role(user_uuid, 'gm'::user_role))
            AND EXISTS (
              SELECT 1 FROM public.user_obra_access 
              WHERE user_id = user_uuid AND obra_id = obra_uuid
            )
          )
          OR public.is_fiscal_of_obra(obra_uuid, user_uuid)
          OR EXISTS (
            SELECT 1 FROM public.obra_fiscal_substitutos s
            WHERE s.obra_id = obra_uuid AND s.substitute_user_id = user_uuid
          )
        )
    END;
$$;

-- Atualizar get_user_role para incluir 'demo' com prioridade baixa
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.user_roles 
  WHERE user_id = user_uuid 
  ORDER BY 
    CASE role::text
      WHEN 'admin' THEN 1
      WHEN 'gm' THEN 2
      WHEN 'editor' THEN 3
      WHEN 'manutencao' THEN 4
      WHEN 'contratada' THEN 5
      WHEN 'prestadora' THEN 6
      WHEN 'demo' THEN 7
      WHEN 'viewer' THEN 8
      ELSE 9
    END
  LIMIT 1;
$$;

-- ============================================================
-- Políticas RLS para obras com isolamento demo
-- ============================================================

-- Dropar políticas existentes
DROP POLICY IF EXISTS "obras_select_policy" ON public.obras;
DROP POLICY IF EXISTS "obras_insert_policy" ON public.obras;
DROP POLICY IF EXISTS "obras_update_policy" ON public.obras;
DROP POLICY IF EXISTS "obras_delete_policy" ON public.obras;
DROP POLICY IF EXISTS "Authenticated users can view obras" ON public.obras;
DROP POLICY IF EXISTS "Admin and editors can insert obras" ON public.obras;
DROP POLICY IF EXISTS "Admin and editors can update obras" ON public.obras;
DROP POLICY IF EXISTS "Admin can delete obras" ON public.obras;
DROP POLICY IF EXISTS "obras_select" ON public.obras;
DROP POLICY IF EXISTS "obras_insert" ON public.obras;
DROP POLICY IF EXISTS "obras_update" ON public.obras;
DROP POLICY IF EXISTS "obras_delete" ON public.obras;
DROP POLICY IF EXISTS "obras_select_v2" ON public.obras;
DROP POLICY IF EXISTS "obras_insert_v2" ON public.obras;
DROP POLICY IF EXISTS "obras_update_v2" ON public.obras;
DROP POLICY IF EXISTS "obras_delete_v2" ON public.obras;

-- SELECT: demo vê só obras demo; usuários reais veem só obras reais (+ públicas)
CREATE POLICY "obras_select_v2" ON public.obras
FOR SELECT USING (
  (public.is_demo_user(auth.uid()) AND is_demo = true)
  OR (NOT public.is_demo_user(auth.uid()) AND (is_demo = false OR is_demo IS NULL))
  OR (is_public = true AND NOT public.is_demo_user(auth.uid()))
);

-- INSERT: demo insere apenas obras demo; usuários normais inserem obras reais
CREATE POLICY "obras_insert_v2" ON public.obras
FOR INSERT WITH CHECK (
  (public.is_demo_user(auth.uid()) AND is_demo = true)
  OR (NOT public.is_demo_user(auth.uid()) AND (is_demo = false OR is_demo IS NULL) AND public.can_edit(auth.uid()))
);

-- UPDATE: regras baseadas em can_edit_obra (já atualizada acima)
CREATE POLICY "obras_update_v2" ON public.obras
FOR UPDATE USING (
  public.can_edit_obra(id, auth.uid())
);

-- DELETE: admin deleta obras reais; demo deleta obras demo
CREATE POLICY "obras_delete_v2" ON public.obras
FOR DELETE USING (
  (public.is_admin(auth.uid()) AND (is_demo = false OR is_demo IS NULL))
  OR (public.is_demo_user(auth.uid()) AND is_demo = true)
);
