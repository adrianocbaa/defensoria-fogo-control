CREATE POLICY "Fiscais can view medicao_sessions of their obras"
ON public.medicao_sessions FOR SELECT TO authenticated
USING (public.can_edit_obra(obra_id));

CREATE POLICY "Fiscais can update medicao_sessions of their obras"
ON public.medicao_sessions FOR UPDATE TO authenticated
USING (public.can_edit_obra(obra_id))
WITH CHECK (public.can_edit_obra(obra_id));