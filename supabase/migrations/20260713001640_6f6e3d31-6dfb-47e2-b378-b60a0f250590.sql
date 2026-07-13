
-- SELECT policies for newly-private buckets
DROP POLICY IF EXISTS "checklist_fotos_storage_select" ON storage.objects;
CREATE POLICY "checklist_fotos_storage_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'checklist-fotos');

DROP POLICY IF EXISTS "checklist_pdfs_storage_select" ON storage.objects;
CREATE POLICY "checklist_pdfs_storage_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'checklist-pdfs');

DROP POLICY IF EXISTS "documents_storage_select" ON storage.objects;
CREATE POLICY "documents_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "rdo_pdf_storage_select" ON storage.objects;
CREATE POLICY "rdo_pdf_storage_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'rdo-pdf');

DROP POLICY IF EXISTS "teletrabalho_portarias_storage_select" ON storage.objects;
CREATE POLICY "teletrabalho_portarias_storage_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'teletrabalho-portarias');

-- rdo-signatures ownership
DROP POLICY IF EXISTS "Authenticated users can view rdo-signatures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update rdo-signatures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete rdo-signatures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to rdo-signatures" ON storage.objects;

CREATE POLICY "rdo_signatures_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'rdo-signatures'
         AND ((auth.uid())::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid())));

CREATE POLICY "rdo_signatures_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rdo-signatures'
              AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "rdo_signatures_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'rdo-signatures'
         AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "rdo_signatures_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'rdo-signatures'
         AND ((auth.uid())::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid())));

-- reports & artifacts ownership
DROP POLICY IF EXISTS "reports_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "artifacts_authenticated" ON storage.objects;

CREATE POLICY "reports_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'reports'
         AND ((auth.uid())::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid())));
CREATE POLICY "reports_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reports' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "reports_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'reports' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "reports_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'reports'
         AND ((auth.uid())::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid())));

CREATE POLICY "artifacts_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'artifacts'
         AND ((auth.uid())::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid())));
CREATE POLICY "artifacts_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'artifacts' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "artifacts_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'artifacts' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "artifacts_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'artifacts'
         AND ((auth.uid())::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid())));
