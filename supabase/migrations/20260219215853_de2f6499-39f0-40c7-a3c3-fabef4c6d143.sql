
-- Remover política SELECT permissiva
DROP POLICY IF EXISTS "Users can view all orcamentos" ON public.orcamentos;

-- Apenas usuários com permissão de edição podem ver orçamentos
CREATE POLICY "Users with edit permission can view orcamentos"
  ON public.orcamentos
  FOR SELECT
  USING (can_edit(auth.uid()));
