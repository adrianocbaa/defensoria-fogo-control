-- Adicionar política RLS para permitir que Contratada insira mão de obra
CREATE POLICY "contratada_can_insert_workforce"
ON public.rdo_workforce
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_contratada(auth.uid()) 
  AND public.user_has_obra_access(auth.uid(), obra_id)
);

-- Adicionar política RLS para permitir que Contratada atualize mão de obra
CREATE POLICY "contratada_can_update_workforce"
ON public.rdo_workforce
FOR UPDATE
TO authenticated
USING (
  public.is_contratada(auth.uid()) 
  AND public.user_has_obra_access(auth.uid(), obra_id)
);

-- Adicionar política RLS para permitir que Contratada delete mão de obra
CREATE POLICY "contratada_can_delete_workforce"
ON public.rdo_workforce
FOR DELETE
TO authenticated
USING (
  public.is_contratada(auth.uid()) 
  AND public.user_has_obra_access(auth.uid(), obra_id)
);