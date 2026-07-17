
-- SELECT: qualquer autenticado com acesso à obra (pasta = obra_id)
CREATE POLICY "docs_encerramento_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documentos-encerramento'
  AND public.user_has_obra_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- INSERT: quem pode editar a obra
CREATE POLICY "docs_encerramento_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documentos-encerramento'
  AND public.can_edit_obra(((storage.foldername(name))[1])::uuid, auth.uid())
);

-- DELETE: só admin
CREATE POLICY "docs_encerramento_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documentos-encerramento'
  AND public.is_admin(auth.uid())
);
