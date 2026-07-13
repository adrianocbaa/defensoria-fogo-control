CREATE POLICY "Auth users can read maintenance confirmations"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'maintenance-confirmations'
);