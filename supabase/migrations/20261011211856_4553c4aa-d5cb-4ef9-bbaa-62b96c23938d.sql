CREATE OR REPLACE FUNCTION public.storage_can_insert(p_bucket text, p_name text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); org uuid; ob uuid; contr boolean;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  org := public.storage_object_org(p_name, uid, now());
  IF org IS NULL OR org IS DISTINCT FROM public.user_organization_id(uid) THEN RETURN false; END IF;
  contr := public.is_contratada(uid);
  ob := public.storage_object_obra(p_bucket, p_name);
  IF ob IS NOT NULL AND NOT EXISTS (SELECT 1 FROM obras WHERE id = ob AND organization_id = org) THEN RETURN false; END IF;
  IF contr AND ob IS NOT NULL AND NOT EXISTS (SELECT 1 FROM user_obra_access WHERE user_id = uid AND obra_id = ob) THEN RETURN false; END IF;
  IF p_bucket = 'teletrabalho-portarias' THEN RETURN public.can_edit(uid) AND NOT contr; END IF;
  IF p_bucket = 'rdo-pdf' THEN RETURN public.can_edit_rdo(uid) AND ob IS NOT NULL; END IF;
  RETURN true;
END $$;