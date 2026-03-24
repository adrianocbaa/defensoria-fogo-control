-- Atualiza políticas de DELETE nas tabelas de cronograma para permitir can_edit() (não só admins)

DROP POLICY IF EXISTS "Admins can delete cronogramas" ON public.cronograma_financeiro;
CREATE POLICY "Editors can delete cronogramas"
  ON public.cronograma_financeiro FOR DELETE
  USING (can_edit(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete cronograma items" ON public.cronograma_items;
CREATE POLICY "Editors can delete cronograma items"
  ON public.cronograma_items FOR DELETE
  USING (can_edit(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete cronograma periodos" ON public.cronograma_periodos;
CREATE POLICY "Editors can delete cronograma periodos"
  ON public.cronograma_periodos FOR DELETE
  USING (can_edit(auth.uid()));