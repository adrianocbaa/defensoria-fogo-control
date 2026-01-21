-- Tabela de fiscais substitutos por obra
CREATE TABLE IF NOT EXISTS public.obra_fiscal_substitutos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  substitute_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (obra_id, substitute_user_id)
);

CREATE INDEX IF NOT EXISTS idx_ofs_obra_id ON public.obra_fiscal_substitutos (obra_id);
CREATE INDEX IF NOT EXISTS idx_ofs_substitute_user_id ON public.obra_fiscal_substitutos (substitute_user_id);

ALTER TABLE public.obra_fiscal_substitutos ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para verificar se é fiscal titular de uma obra
CREATE OR REPLACE FUNCTION public.is_fiscal_of_obra(obra_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.obras o
    WHERE o.id = obra_uuid
      AND o.fiscal_id = user_uuid
  );
$$;

-- Permitir leitura para: admin, fiscal titular da obra, ou o próprio substituto
DROP POLICY IF EXISTS "Read obra_fiscal_substitutos" ON public.obra_fiscal_substitutos;
CREATE POLICY "Read obra_fiscal_substitutos"
ON public.obra_fiscal_substitutos
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR substitute_user_id = auth.uid()
  OR public.is_fiscal_of_obra(obra_id, auth.uid())
);

-- Permitir inserir apenas para admin ou fiscal titular da obra
DROP POLICY IF EXISTS "Insert obra_fiscal_substitutos" ON public.obra_fiscal_substitutos;
CREATE POLICY "Insert obra_fiscal_substitutos"
ON public.obra_fiscal_substitutos
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.is_fiscal_of_obra(obra_id, auth.uid())
);

-- Permitir excluir apenas para admin ou fiscal titular da obra
DROP POLICY IF EXISTS "Delete obra_fiscal_substitutos" ON public.obra_fiscal_substitutos;
CREATE POLICY "Delete obra_fiscal_substitutos"
ON public.obra_fiscal_substitutos
FOR DELETE
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.is_fiscal_of_obra(obra_id, auth.uid())
);

-- Atualizar função de permissão de edição para incluir fiscal titular e substitutos
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
    )
    OR public.is_fiscal_of_obra(obra_uuid, user_uuid)
    OR (
      -- Fiscal substituto pode editar
      EXISTS (
        SELECT 1
        FROM public.obra_fiscal_substitutos s
        WHERE s.obra_id = obra_uuid
          AND s.substitute_user_id = user_uuid
      )
    );
$$;