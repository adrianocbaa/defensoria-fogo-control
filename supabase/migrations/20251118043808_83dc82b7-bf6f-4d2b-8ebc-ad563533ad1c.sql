-- Políticas RLS para permitir usuários Contratada acessarem RDO das obras autorizadas

-- rdo_reports: Permitir Contratada visualizar e editar relatórios das obras com acesso
CREATE POLICY "Contratada can view rdo_reports of assigned obras"
ON public.rdo_reports
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'contratada'::user_role) 
  AND user_has_obra_access(auth.uid(), obra_id)
);

CREATE POLICY "Contratada can insert rdo_reports for assigned obras"
ON public.rdo_reports
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'contratada'::user_role) 
  AND user_has_obra_access(auth.uid(), obra_id)
);

CREATE POLICY "Contratada can update rdo_reports of assigned obras"
ON public.rdo_reports
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'contratada'::user_role) 
  AND user_has_obra_access(auth.uid(), obra_id)
);

-- rdo_activities: Permitir Contratada gerenciar atividades dos RDOs das obras com acesso
CREATE POLICY "Contratada can view rdo_activities of assigned obras"
ON public.rdo_activities
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'contratada'::user_role) 
  AND user_has_obra_access(auth.uid(), obra_id)
);

CREATE POLICY "Contratada can insert rdo_activities for assigned obras"
ON public.rdo_activities
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'contratada'::user_role) 
  AND user_has_obra_access(auth.uid(), obra_id)
);

CREATE POLICY "Contratada can update rdo_activities of assigned obras"
ON public.rdo_activities
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'contratada'::user_role) 
  AND user_has_obra_access(auth.uid(), obra_id)
);

CREATE POLICY "Contratada can delete rdo_activities of assigned obras"
ON public.rdo_activities
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'contratada'::user_role) 
  AND user_has_obra_access(auth.uid(), obra_id)
);

-- rdo_activity_notes: Permitir Contratada gerenciar notas de atividades
CREATE POLICY "Contratada can view rdo_activity_notes of assigned obras"
ON public.rdo_activity_notes
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'contratada'::user_role) 
  AND EXISTS (
    SELECT 1 FROM public.rdo_reports 
    WHERE id = rdo_activity_notes.report_id 
    AND user_has_obra_access(auth.uid(), obra_id)
  )
);

CREATE POLICY "Contratada can insert rdo_activity_notes for assigned obras"
ON public.rdo_activity_notes
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'contratada'::user_role) 
  AND EXISTS (
    SELECT 1 FROM public.rdo_reports 
    WHERE id = rdo_activity_notes.report_id 
    AND user_has_obra_access(auth.uid(), obra_id)
  )
);

CREATE POLICY "Contratada can update rdo_activity_notes of assigned obras"
ON public.rdo_activity_notes
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'contratada'::user_role) 
  AND EXISTS (
    SELECT 1 FROM public.rdo_reports 
    WHERE id = rdo_activity_notes.report_id 
    AND user_has_obra_access(auth.uid(), obra_id)
  )
);

CREATE POLICY "Contratada can delete rdo_activity_notes of assigned obras"
ON public.rdo_activity_notes
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'contratada'::user_role) 
  AND EXISTS (
    SELECT 1 FROM public.rdo_reports 
    WHERE id = rdo_activity_notes.report_id 
    AND user_has_obra_access(auth.uid(), obra_id)
  )
);

-- rdo_audit_log: Permitir Contratada inserir logs de auditoria
CREATE POLICY "Contratada can insert rdo_audit_log for assigned obras"
ON public.rdo_audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'contratada'::user_role) 
  AND user_has_obra_access(auth.uid(), obra_id)
);

CREATE POLICY "Contratada can view rdo_audit_log of assigned obras"
ON public.rdo_audit_log
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'contratada'::user_role) 
  AND user_has_obra_access(auth.uid(), obra_id)
);