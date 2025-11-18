-- Adicionar campo para forçar troca de senha no primeiro login
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT FALSE;

-- Criar tabela para controlar acesso de usuários "contratada" às obras
CREATE TABLE IF NOT EXISTS public.user_obra_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, obra_id)
);

-- Habilitar RLS na tabela user_obra_access
ALTER TABLE public.user_obra_access ENABLE ROW LEVEL SECURITY;

-- Política: Admins podem ver todos os acessos
CREATE POLICY "Admins podem ver acessos de obras"
ON public.user_obra_access
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Política: Admins podem gerenciar acessos
CREATE POLICY "Admins podem gerenciar acessos de obras"
ON public.user_obra_access
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Política: Usuários podem ver seus próprios acessos
CREATE POLICY "Usuários podem ver seus próprios acessos"
ON public.user_obra_access
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_obra_access_user_id ON public.user_obra_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_obra_access_obra_id ON public.user_obra_access(obra_id);

-- Função para verificar se usuário tem acesso à obra
CREATE OR REPLACE FUNCTION public.user_has_obra_access(user_uuid UUID, obra_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Admins, GMs e Editors têm acesso a tudo
  SELECT 
    public.is_admin(user_uuid) 
    OR public.has_role(user_uuid, 'gm'::user_role)
    OR public.has_role(user_uuid, 'editor'::user_role)
    OR EXISTS (
      SELECT 1 FROM public.user_obra_access 
      WHERE user_id = user_uuid AND obra_id = obra_uuid
    );
$$;