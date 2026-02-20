
-- Remover política SELECT permissiva para editores
DROP POLICY IF EXISTS "Users with edit permission can view empresas" ON public.empresas;

-- Apenas admins podem ver todas as empresas
CREATE POLICY "Admins can view all empresas"
  ON public.empresas
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Política para contratada ver sua própria empresa já existe e está correta
-- "Contratada users can view their empresa" 
