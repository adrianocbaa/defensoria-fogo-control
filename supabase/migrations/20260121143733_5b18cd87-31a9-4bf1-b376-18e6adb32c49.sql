
-- Corrigir a obra Almoxarifado Santa Cruz - Reforma 02 para não ser pública indevidamente
UPDATE obras 
SET is_public = false 
WHERE id = '273f6921-56e7-48fb-ace3-cc05c7e04de7';

-- Alterar a política de obras públicas para não incluir usuários contratada
-- Contratada só deve ver obras atribuídas via user_obra_access, não obras públicas
DROP POLICY IF EXISTS "Public can view public obras" ON obras;

CREATE POLICY "Public can view public obras"
ON obras
FOR SELECT
TO anon, authenticated
USING (
  is_public = true 
  AND NOT public.has_role(auth.uid(), 'contratada'::user_role)
);
