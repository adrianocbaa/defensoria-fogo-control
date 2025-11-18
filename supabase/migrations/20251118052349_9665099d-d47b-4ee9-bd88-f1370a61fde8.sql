-- Adicionar política RLS para permitir que Contratada visualize mão de obra
CREATE POLICY "contratada_can_select_workforce"
ON public.rdo_workforce
FOR SELECT
TO authenticated
USING (
  public.is_contratada(auth.uid()) 
  AND public.user_has_obra_access(auth.uid(), obra_id)
);