CREATE POLICY "Authenticated users can read obra documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');