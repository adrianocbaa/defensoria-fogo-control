
CREATE POLICY "Editors and GMs can view empresas"
ON public.empresas
FOR SELECT
USING (public.can_edit(auth.uid()));
