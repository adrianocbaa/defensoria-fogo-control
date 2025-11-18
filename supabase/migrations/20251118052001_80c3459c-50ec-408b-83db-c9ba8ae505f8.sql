-- Adicionar política para permitir que usuários autenticados vejam informações básicas de outros usuários
-- Isso é necessário para exibir nomes e roles nos comentários do RDO
CREATE POLICY "authenticated_users_can_view_basic_profile_info"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_active = true);