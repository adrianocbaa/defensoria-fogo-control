
-- Permitir que fiscais (e substitutos) excluam medições das obras sob sua responsabilidade

CREATE POLICY "Fiscais can delete medicoes of their obras"
ON public.medicoes FOR DELETE
USING (public.can_edit_obra(obra_id));

CREATE POLICY "Fiscais can delete medicao_sessions of their obras"
ON public.medicao_sessions FOR DELETE
USING (public.can_edit_obra(obra_id));

CREATE POLICY "Fiscais can delete medicao_items of their obras"
ON public.medicao_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.medicao_sessions ms
    WHERE ms.id = medicao_items.medicao_id
      AND public.can_edit_obra(ms.obra_id)
  )
);
