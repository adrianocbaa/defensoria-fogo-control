
-- ========== audit_logs ==========
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS organization_id uuid;

UPDATE public.audit_logs a SET organization_id = COALESCE(
  NULLIF(COALESCE(a.new_values->>'organization_id', a.old_values->>'organization_id'),'')::uuid,
  (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = a.user_id AND om.status IN ('active','invited') LIMIT 1),
  '00000000-0000-0000-0000-000000000001'::uuid)
WHERE a.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs(organization_id);

CREATE OR REPLACE FUNCTION public.audit_logs_set_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Always derived server-side; never trust client value
  NEW.organization_id := COALESCE(
    NULLIF(COALESCE(NEW.new_values->>'organization_id', NEW.old_values->>'organization_id'),'')::uuid,
    public.user_organization_id(COALESCE(NEW.user_id, auth.uid())));
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.audit_logs_set_org() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_audit_logs_set_org ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_set_org BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_set_org();

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "audit_logs_select_org_admin" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid())
         OR (public.is_admin(auth.uid()) AND organization_id = public.user_organization_id(auth.uid())));
CREATE POLICY "s3_org_boundary" ON public.audit_logs AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR organization_id = public.user_organization_id(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()) OR organization_id = public.user_organization_id(auth.uid()));

-- ========== org-owned config tables ==========
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['maintenance_types','maintenance_managers','rdo_templates_atividades'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id)', t);
    EXECUTE format('UPDATE public.%I SET organization_id = %L WHERE organization_id IS NULL', t, '00000000-0000-0000-0000-000000000001');
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN organization_id SET DEFAULT public.user_organization_id(auth.uid())', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN organization_id SET NOT NULL', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(organization_id)', 'idx_'||t||'_org', t);
    EXECUTE format('DROP POLICY IF EXISTS s3_org_boundary ON public.%I', t);
    EXECUTE format('CREATE POLICY s3_org_boundary ON public.%I AS RESTRICTIVE FOR ALL TO public
      USING (auth.uid() IS NOT NULL AND (public.is_super_admin(auth.uid()) OR organization_id = public.user_organization_id(auth.uid())))
      WITH CHECK (auth.uid() IS NOT NULL AND (public.is_super_admin(auth.uid()) OR organization_id = public.user_organization_id(auth.uid())))', t);
  END LOOP;
END $$;

-- maintenance_managers: linked user must belong to the record's org
CREATE OR REPLACE FUNCTION public.maintenance_managers_check_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND public.user_organization_id(NEW.user_id) IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION 'Usuário vinculado não pertence à organização do registro' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.maintenance_managers_check_org() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_maintenance_managers_check_org ON public.maintenance_managers;
CREATE TRIGGER trg_maintenance_managers_check_org BEFORE INSERT OR UPDATE ON public.maintenance_managers
  FOR EACH ROW EXECUTE FUNCTION public.maintenance_managers_check_org();

-- ========== obra-linked tables ==========
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['rdo_dias_sem_expediente','rdo_ui_prefs','rdo_notificacoes_enviadas'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS s3_org_boundary ON public.%I', t);
    EXECUTE format('CREATE POLICY s3_org_boundary ON public.%I AS RESTRICTIVE FOR ALL TO public
      USING (auth.uid() IS NOT NULL AND (public.is_super_admin(auth.uid()) OR public.obra_in_user_org(obra_id)))
      WITH CHECK (auth.uid() IS NOT NULL AND (public.is_super_admin(auth.uid()) OR public.obra_in_user_org(obra_id)))', t);
  END LOOP;
END $$;
