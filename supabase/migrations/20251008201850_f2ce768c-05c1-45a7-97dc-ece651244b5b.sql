-- Corrigir políticas RLS do bucket rdo-signatures
-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users with edit permission can upload signatures" ON storage.objects;
DROP POLICY IF EXISTS "Users with edit permission can view signatures" ON storage.objects;
DROP POLICY IF EXISTS "Users with edit permission can delete signatures" ON storage.objects;

-- Criar políticas corretas para o bucket rdo-signatures
CREATE POLICY "Authenticated users can upload to rdo-signatures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'rdo-signatures'
);

CREATE POLICY "Authenticated users can update rdo-signatures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'rdo-signatures');

CREATE POLICY "Authenticated users can view rdo-signatures"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'rdo-signatures');

CREATE POLICY "Authenticated users can delete rdo-signatures"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'rdo-signatures');