-- Políticas RLS para rdo_occurrences (Contratada)
CREATE POLICY "Contratada pode inserir ocorrências em obras autorizadas"
ON rdo_occurrences FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'contratada'::user_role) 
  AND user_has_obra_access(auth.uid(), obra_id)
);

CREATE POLICY "Contratada pode atualizar ocorrências em obras autorizadas"
ON rdo_occurrences FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'contratada'::user_role) 
  AND user_has_obra_access(auth.uid(), obra_id)
);

CREATE POLICY "Contratada pode deletar ocorrências em obras autorizadas"
ON rdo_occurrences FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'contratada'::user_role) 
  AND user_has_obra_access(auth.uid(), obra_id)
);

-- Políticas RLS para rdo_visits (Contratada)
CREATE POLICY "Contratada pode inserir visitas em obras autorizadas"
ON rdo_visits FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'contratada'::user_role) 
  AND user_has_obra_access(auth.uid(), obra_id)
);

CREATE POLICY "Contratada pode atualizar visitas em obras autorizadas"
ON rdo_visits FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'contratada'::user_role) 
  AND user_has_obra_access(auth.uid(), obra_id)
);

CREATE POLICY "Contratada pode deletar visitas em obras autorizadas"
ON rdo_visits FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'contratada'::user_role) 
  AND user_has_obra_access(auth.uid(), obra_id)
);

-- Políticas RLS para rdo_equipment (Contratada)
CREATE POLICY "Contratada pode inserir equipamentos em obras autorizadas"
ON rdo_equipment FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'contratada'::user_role) 
  AND user_has_obra_access(auth.uid(), obra_id)
);

CREATE POLICY "Contratada pode atualizar equipamentos em obras autorizadas"
ON rdo_equipment FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'contratada'::user_role) 
  AND user_has_obra_access(auth.uid(), obra_id)
);

CREATE POLICY "Contratada pode deletar equipamentos em obras autorizadas"
ON rdo_equipment FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'contratada'::user_role) 
  AND user_has_obra_access(auth.uid(), obra_id)
);

-- Políticas RLS para rdo_workforce (Contratada)
CREATE POLICY "Contratada pode inserir mão de obra em obras autorizadas"
ON rdo_workforce FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'contratada'::user_role) 
  AND user_has_obra_access(auth.uid(), obra_id)
);

CREATE POLICY "Contratada pode atualizar mão de obra em obras autorizadas"
ON rdo_workforce FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'contratada'::user_role) 
  AND user_has_obra_access(auth.uid(), obra_id)
);

CREATE POLICY "Contratada pode deletar mão de obra em obras autorizadas"
ON rdo_workforce FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'contratada'::user_role) 
  AND user_has_obra_access(auth.uid(), obra_id)
);