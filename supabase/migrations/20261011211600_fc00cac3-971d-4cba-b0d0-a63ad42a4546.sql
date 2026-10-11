-- ===== LOTE S1 — Storage tenant-aware =====
CREATE OR REPLACE FUNCTION public._s1_uuid(p text) RETURNS uuid
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN p ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN p::uuid END
$$;

-- Organização dona de um objeto. Ordem: org no 1º segmento > obra > chamado/serviço > usuário (path) > owner > legado (DPE-MT, somente objetos anteriores ao corte S1).
CREATE OR REPLACE FUNCTION public.storage_object_org(p_name text, p_owner uuid, p_created_at timestamptz)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE s text[] := string_to_array(p_name, '/'); u1 uuid := public._s1_uuid(s[1]); r uuid; i int;
BEGIN
  IF u1 IS NOT NULL THEN
    SELECT id INTO r FROM organizations WHERE id = u1; IF r IS NOT NULL THEN RETURN r; END IF;
    SELECT organization_id INTO r FROM obras WHERE id = u1; IF r IS NOT NULL THEN RETURN r; END IF;
  END IF;
  IF s[1] LIKE 'batch-%' THEN
    SELECT organization_id INTO r FROM obras WHERE id = public._s1_uuid(substr(s[1], 7, 36));
    IF r IS NOT NULL THEN RETURN r; END IF;
  END IF;
  IF s[1] IN ('maintenance-archive','maintenance-confirmations','maintenance-inbound','reference-tickets','service-execution','service-reference') THEN
    FOR i IN 2..3 LOOP
      SELECT organization_id INTO r FROM maintenance_tickets WHERE id = public._s1_uuid(s[i]);
      IF r IS NOT NULL THEN RETURN r; END IF;
      SELECT t.organization_id INTO r FROM maintenance_ticket_services v JOIN maintenance_tickets t ON t.id = v.ticket_id WHERE v.id = public._s1_uuid(s[i]);
      IF r IS NOT NULL THEN RETURN r; END IF;
    END LOOP;
  END IF;
  IF u1 IS NOT NULL THEN r := public.user_organization_id(u1); IF r IS NOT NULL THEN RETURN r; END IF; END IF;
  IF p_owner IS NOT NULL THEN r := public.user_organization_id(p_owner); IF r IS NOT NULL THEN RETURN r; END IF; END IF;
  -- Legado: antes do corte S1 só a DPE-MT possuía arquivos (Órgão de Teste: 0 objetos, verificado).
  IF p_created_at IS NOT NULL AND p_created_at < '2026-10-11 21:15:00+00'::timestamptz THEN
    RETURN '00000000-0000-0000-0000-000000000001'::uuid;
  END IF;
  RETURN NULL;
END $$;

-- Obra vinculada ao objeto (quando o caminho permite determinar)
CREATE OR REPLACE FUNCTION public.storage_object_obra(p_bucket text, p_name text)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE s text[] := string_to_array(p_name, '/'); r uuid; i int;
BEGIN
  IF s[1] LIKE 'batch-%' THEN RETURN (SELECT id FROM obras WHERE id = public._s1_uuid(substr(s[1],7,36))); END IF;
  FOR i IN 1..4 LOOP
    IF public._s1_uuid(s[i]) IS NOT NULL THEN
      SELECT id INTO r FROM obras WHERE id = public._s1_uuid(s[i]);
      IF r IS NOT NULL THEN RETURN r; END IF;
    END IF;
  END LOOP;
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.storage_is_uploader(p_name text, p_owner uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (p_owner = auth.uid() OR auth.uid()::text = ANY (string_to_array(p_name,'/')))
$$;

-- Leitura
CREATE OR REPLACE FUNCTION public.storage_can_read(p_bucket text, p_name text, p_owner uuid, p_created_at timestamptz)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); org uuid; ob uuid;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  IF public.is_super_admin(uid) THEN RETURN true; END IF;
  org := public.storage_object_org(p_name, p_owner, p_created_at);
  IF org IS NULL OR org IS DISTINCT FROM public.user_organization_id(uid) THEN RETURN false; END IF;
  IF public.is_contratada(uid) THEN
    IF public.storage_is_uploader(p_name, p_owner) THEN RETURN true; END IF;
    ob := public.storage_object_obra(p_bucket, p_name);
    RETURN ob IS NOT NULL AND EXISTS (SELECT 1 FROM user_obra_access WHERE user_id = uid AND obra_id = ob);
  END IF;
  RETURN true;
END $$;

-- Envio de novo arquivo
CREATE OR REPLACE FUNCTION public.storage_can_insert(p_bucket text, p_name text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); org uuid; ob uuid; contr boolean;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  org := public.storage_object_org(p_name, uid, now());
  IF org IS NULL OR org IS DISTINCT FROM public.user_organization_id(uid) THEN RETURN false; END IF;
  contr := public.is_contratada(uid);
  ob := public.storage_object_obra(p_bucket, p_name);
  IF contr AND ob IS NOT NULL AND NOT EXISTS (SELECT 1 FROM user_obra_access WHERE user_id = uid AND obra_id = ob) THEN RETURN false; END IF;
  IF p_bucket = 'teletrabalho-portarias' THEN RETURN public.can_edit(uid) AND NOT contr; END IF;
  IF p_bucket = 'rdo-pdf' THEN RETURN public.can_edit_rdo(uid) AND ob IS NOT NULL; END IF;
  RETURN true;
END $$;

-- Alteração / exclusão
CREATE OR REPLACE FUNCTION public.storage_can_modify(p_bucket text, p_name text, p_owner uuid, p_created_at timestamptz)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); org uuid; ob uuid;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  IF public.is_super_admin(uid) THEN RETURN true; END IF;
  org := public.storage_object_org(p_name, p_owner, p_created_at);
  IF org IS NULL OR org IS DISTINCT FROM public.user_organization_id(uid) THEN RETURN false; END IF;
  IF public.is_contratada(uid) THEN
    IF p_bucket = 'teletrabalho-portarias' THEN RETURN false; END IF;
    RETURN public.storage_is_uploader(p_name, p_owner);
  END IF;
  IF public.storage_is_uploader(p_name, p_owner) THEN RETURN true; END IF;
  IF p_bucket = 'rdo-pdf' THEN RETURN public.can_edit_rdo(uid); END IF;
  RETURN public.can_edit(uid);
END $$;

REVOKE ALL ON FUNCTION public.storage_object_org(text,uuid,timestamptz), public.storage_object_obra(text,text),
  public.storage_can_read(text,text,uuid,timestamptz), public.storage_can_insert(text,text),
  public.storage_can_modify(text,text,uuid,timestamptz), public.storage_is_uploader(text,uuid), public._s1_uuid(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.storage_object_org(text,uuid,timestamptz), public.storage_object_obra(text,text),
  public.storage_can_read(text,text,uuid,timestamptz), public.storage_can_insert(text,text),
  public.storage_can_modify(text,text,uuid,timestamptz), public.storage_is_uploader(text,uuid), public._s1_uuid(text) TO authenticated, service_role;

-- ===== Remoção das políticas antigas (rollback: ver relatório S1) =====
DROP POLICY IF EXISTS "Auth users can read maintenance confirmations" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read obra documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "Users with edit permission can delete PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users with edit permission can upload PDFs" ON storage.objects;
DROP POLICY IF EXISTS "rdo_pdf_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "Users with edit permission can delete teletrabalho portarias" ON storage.objects;
DROP POLICY IF EXISTS "Users with edit permission can update teletrabalho portarias" ON storage.objects;
DROP POLICY IF EXISTS "Users with edit permission can upload teletrabalho portarias" ON storage.objects;
DROP POLICY IF EXISTS "teletrabalho_portarias_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de fotos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias fotos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem gerenciar suas próprias fotos" ON storage.objects;

-- ===== Políticas novas =====
CREATE POLICY s1_tenant_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('documents','rdo-pdf','teletrabalho-portarias','service-photos')
         AND public.storage_can_read(bucket_id, name, owner, created_at));
CREATE POLICY s1_tenant_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('documents','rdo-pdf','teletrabalho-portarias','service-photos')
              AND public.storage_can_insert(bucket_id, name));
CREATE POLICY s1_tenant_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('documents','rdo-pdf','teletrabalho-portarias','service-photos')
         AND public.storage_can_modify(bucket_id, name, owner, created_at))
  WITH CHECK (bucket_id IN ('documents','rdo-pdf','teletrabalho-portarias','service-photos')
              AND public.storage_can_insert(bucket_id, name));
CREATE POLICY s1_tenant_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('documents','rdo-pdf','teletrabalho-portarias','service-photos')
         AND public.storage_can_modify(bucket_id, name, owner, created_at));