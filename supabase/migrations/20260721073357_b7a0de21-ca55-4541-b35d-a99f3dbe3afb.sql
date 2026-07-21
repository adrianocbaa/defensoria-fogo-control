
-- Tighten storage policies for checklist buckets to require obra access
DROP POLICY IF EXISTS checklist_fotos_storage_select ON storage.objects;
DROP POLICY IF EXISTS checklist_fotos_storage_insert ON storage.objects;
DROP POLICY IF EXISTS checklist_fotos_storage_delete ON storage.objects;
DROP POLICY IF EXISTS checklist_pdfs_storage_select ON storage.objects;
DROP POLICY IF EXISTS checklist_pdfs_storage_insert ON storage.objects;
DROP POLICY IF EXISTS checklist_pdfs_storage_delete ON storage.objects;

-- Helper: safely extract obra_id (first path segment) and check access
-- We inline the check using a CASE to avoid errors when path isn't a uuid.

CREATE POLICY checklist_fotos_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'checklist-fotos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.user_has_obra_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY checklist_fotos_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'checklist-fotos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.user_has_obra_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY checklist_fotos_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'checklist-fotos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.user_has_obra_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY checklist_pdfs_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'checklist-pdfs'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.user_has_obra_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY checklist_pdfs_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'checklist-pdfs'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.user_has_obra_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY checklist_pdfs_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'checklist-pdfs'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.user_has_obra_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
