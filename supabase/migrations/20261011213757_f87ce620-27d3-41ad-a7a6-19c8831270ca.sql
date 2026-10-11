CREATE OR REPLACE FUNCTION public.storage_path_entities_match_org(p_name text, p_org uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s text[] := string_to_array(p_name, '/'); u uuid; o uuid; i int;
BEGIN
  IF p_org IS NULL THEN RETURN false; END IF;
  FOR i IN 1..coalesce(array_length(s,1),0) LOOP
    u := public._s1_uuid(CASE WHEN s[i] LIKE 'batch-%' THEN substr(s[i],7,36) ELSE s[i] END);
    CONTINUE WHEN u IS NULL;
    IF EXISTS (SELECT 1 FROM organizations WHERE id = u) THEN
      IF u <> p_org THEN RETURN false; END IF; CONTINUE;
    END IF;
    SELECT organization_id INTO o FROM obras WHERE id = u;
    IF FOUND THEN IF o IS DISTINCT FROM p_org THEN RETURN false; END IF; CONTINUE; END IF;
    SELECT organization_id INTO o FROM rdo_reports WHERE id = u;
    IF FOUND THEN IF o IS DISTINCT FROM p_org THEN RETURN false; END IF; CONTINUE; END IF;
    SELECT organization_id INTO o FROM rdo_media WHERE id = u;
    IF FOUND THEN IF o IS DISTINCT FROM p_org THEN RETURN false; END IF; CONTINUE; END IF;
    SELECT organization_id INTO o FROM maintenance_tickets WHERE id = u;
    IF FOUND THEN IF o IS DISTINCT FROM p_org THEN RETURN false; END IF; CONTINUE; END IF;
    SELECT organization_id INTO o FROM maintenance_ticket_services WHERE id = u;
    IF FOUND THEN IF o IS DISTINCT FROM p_org THEN RETURN false; END IF; CONTINUE; END IF;
    SELECT organization_id INTO o FROM nucleo_teletrabalho WHERE id = u;
    IF FOUND THEN IF o IS DISTINCT FROM p_org THEN RETURN false; END IF; CONTINUE; END IF;
    IF EXISTS (SELECT 1 FROM profiles WHERE id = u OR user_id = u) OR EXISTS (SELECT 1 FROM auth.users WHERE id = u) THEN
      o := public.user_organization_id(u);
      IF o IS DISTINCT FROM p_org THEN RETURN false; END IF;
    END IF;
  END LOOP;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.storage_path_entities_match_org(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.storage_path_entities_match_org(text, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.storage_can_insert(p_bucket text, p_name text)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); org uuid; ob uuid; contr boolean;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  org := public.storage_object_org(p_name, uid, now());
  IF org IS NULL OR org IS DISTINCT FROM public.user_organization_id(uid) THEN RETURN false; END IF;
  IF NOT public.storage_path_entities_match_org(p_name, org) THEN RETURN false; END IF;
  contr := public.is_contratada(uid);
  ob := public.storage_object_obra(p_bucket, p_name);
  IF ob IS NOT NULL AND NOT EXISTS (SELECT 1 FROM obras WHERE id = ob AND organization_id = org) THEN RETURN false; END IF;
  IF contr AND ob IS NOT NULL AND NOT EXISTS (SELECT 1 FROM user_obra_access WHERE user_id = uid AND obra_id = ob) THEN RETURN false; END IF;
  IF p_bucket = 'teletrabalho-portarias' THEN RETURN public.can_edit(uid) AND NOT contr; END IF;
  IF p_bucket = 'rdo-pdf' THEN RETURN public.can_edit_rdo(uid) AND ob IS NOT NULL; END IF;
  RETURN true;
END $function$;

CREATE OR REPLACE FUNCTION public.storage_can_modify(p_bucket text, p_name text, p_owner uuid, p_created_at timestamp with time zone)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); org uuid;
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  IF public.is_super_admin(uid) THEN RETURN true; END IF;
  org := public.storage_object_org(p_name, p_owner, p_created_at);
  IF org IS NULL OR org IS DISTINCT FROM public.user_organization_id(uid) THEN RETURN false; END IF;
  -- caminhos novos (<org>/...) precisam ter todas as entidades no mesmo órgão; legado mantém regra anterior
  IF EXISTS (SELECT 1 FROM organizations WHERE id = public._s1_uuid(split_part(p_name,'/',1)))
     AND NOT public.storage_path_entities_match_org(p_name, org) THEN RETURN false; END IF;
  IF public.is_contratada(uid) THEN
    IF p_bucket = 'teletrabalho-portarias' THEN RETURN false; END IF;
    RETURN public.storage_is_uploader(p_name, p_owner);
  END IF;
  IF public.storage_is_uploader(p_name, p_owner) THEN RETURN true; END IF;
  IF p_bucket = 'rdo-pdf' THEN RETURN public.can_edit_rdo(uid); END IF;
  RETURN public.can_edit(uid);
END $function$;