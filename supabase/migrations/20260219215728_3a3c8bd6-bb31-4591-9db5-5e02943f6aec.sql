
-- Remover a política SELECT permissiva
DROP POLICY IF EXISTS "Users can view medicao_rdo_imports" ON public.medicao_rdo_imports;

-- Política para usuários com permissão de edição
CREATE POLICY "Users with edit permission can view medicao_rdo_imports"
  ON public.medicao_rdo_imports
  FOR SELECT
  USING (can_edit(auth.uid()));

-- Política para acesso público em obras públicas (consistente com medicao_sessions e medicao_items)
CREATE POLICY "Public can view medicao_rdo_imports of public obras"
  ON public.medicao_rdo_imports
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM obras
    WHERE obras.id = medicao_rdo_imports.obra_id
      AND obras.is_public = true
  ));
