
-- Remover política permissiva atual
DROP POLICY IF EXISTS "authenticated_users_can_view_basic_profile_info" ON public.profiles;

-- Colaboradores internos (não-contratada) podem ver todos os perfis ativos
CREATE POLICY "Internal staff can view all active profiles"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND NOT has_role(auth.uid(), 'contratada'::user_role)
  );

-- Contratadas só veem seu próprio perfil
CREATE POLICY "Contratada can view own profile"
  ON public.profiles
  FOR SELECT
  USING (
    has_role(auth.uid(), 'contratada'::user_role)
    AND user_id = auth.uid()
  );
