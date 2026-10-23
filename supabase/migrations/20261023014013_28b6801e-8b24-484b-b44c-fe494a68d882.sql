CREATE OR REPLACE FUNCTION public.super_admin_set_maintenance_inbound(p_organization_id uuid, p_enabled boolean, p_alias text, p_sender_policy text, p_allowed_domains text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE a text := nullif(lower(trim(p_alias)), ''); ds text[]; d text;
BEGIN
  IF NOT coalesce(public.is_super_admin(auth.uid()),false) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('maintenance-inbound-routing',0));
  PERFORM 1 FROM public.organizations WHERE id=p_organization_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'organization_not_found' USING ERRCODE='22023'; END IF;
  IF p_enabled IS NULL OR p_sender_policy IS NULL OR p_sender_policy NOT IN ('any','allowed_domains','registered_users','registered_or_allowed_domains') THEN RAISE EXCEPTION 'invalid_inbound_policy' USING ERRCODE='22023'; END IF;
  IF a IS NOT NULL AND a !~ '^[a-z0-9][a-z0-9-]{1,40}$' THEN RAISE EXCEPTION 'invalid_inbound_alias' USING ERRCODE='22023'; END IF;
  IF cardinality(coalesce(p_allowed_domains,'{}')) > 100 THEN RAISE EXCEPTION 'invalid_inbound_domains' USING ERRCODE='22023'; END IF;
  ds := ARRAY(SELECT DISTINCT lower(trim(v)) FROM unnest(coalesce(p_allowed_domains,'{}')) v WHERE v IS NOT NULL AND trim(v)<>'' ORDER BY 1);
  FOREACH d IN ARRAY ds LOOP
    IF length(d)>253 OR d !~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]([a-z0-9-]{0,61}[a-z0-9])?$' THEN RAISE EXCEPTION 'invalid_inbound_domains' USING ERRCODE='22023'; END IF;
  END LOOP;
  IF p_sender_policy='allowed_domains' AND cardinality(ds)=0 THEN RAISE EXCEPTION 'inbound_domains_required' USING ERRCODE='22023'; END IF;
  IF p_enabled AND a IS NULL AND NOT EXISTS(SELECT 1 FROM public.maintenance_inbound_addresses WHERE organization_id=p_organization_id) THEN RAISE EXCEPTION 'inbound_address_required' USING ERRCODE='22023'; END IF;
  IF a IS NOT NULL AND (EXISTS(SELECT 1 FROM public.organizations WHERE id<>p_organization_id AND lower(maintenance_inbound_alias)=a) OR EXISTS(SELECT 1 FROM public.maintenance_inbound_addresses WHERE organization_id<>p_organization_id AND lower(address) IN (a||'@manutencao.sidif.com.br','chamados+'||a||'@sidif.com.br'))) THEN RAISE EXCEPTION 'inbound_address_conflict' USING ERRCODE='23505'; END IF;
  UPDATE public.organizations SET maintenance_inbound_enabled=p_enabled, maintenance_inbound_alias=a, maintenance_sender_policy=p_sender_policy, maintenance_allowed_domains=ds, updated_at=now() WHERE id=p_organization_id;
END $fn$;
REVOKE ALL ON FUNCTION public.super_admin_set_maintenance_inbound(uuid,boolean,text,text,text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.super_admin_set_maintenance_inbound(uuid,boolean,text,text,text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.super_admin_save_maintenance_inbound(p_organization_id uuid,p_enabled boolean,p_alias text,p_sender_policy text,p_allowed_domains text[],p_addresses text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE ads text[]; a text; loc text; dom text; alias_part text;
BEGIN
  IF NOT coalesce(public.is_super_admin(auth.uid()),false) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('maintenance-inbound-routing',0));
  PERFORM 1 FROM public.organizations WHERE id=p_organization_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'organization_not_found' USING ERRCODE='22023'; END IF;
  IF p_addresses IS NULL OR cardinality(p_addresses)>100 THEN RAISE EXCEPTION 'invalid_inbound_addresses' USING ERRCODE='22023'; END IF;
  ads:=ARRAY(SELECT DISTINCT lower(trim(v)) FROM unnest(p_addresses) v WHERE v IS NOT NULL AND trim(v)<>'' ORDER BY 1);
  FOREACH a IN ARRAY ads LOOP
    loc:=split_part(a,'@',1); dom:=split_part(a,'@',2);
    IF length(a)>254 OR length(loc)>64 OR a !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]([a-z0-9-]{0,61}[a-z0-9])?$' THEN RAISE EXCEPTION 'invalid_inbound_addresses' USING ERRCODE='22023'; END IF;
    alias_part:=CASE WHEN dom='manutencao.sidif.com.br' THEN loc WHEN dom='sidif.com.br' AND loc LIKE 'chamados+%' THEN substr(loc,10) ELSE NULL END;
    IF EXISTS(SELECT 1 FROM public.maintenance_inbound_addresses WHERE lower(address)=a AND organization_id<>p_organization_id) OR (alias_part IS NOT NULL AND EXISTS(SELECT 1 FROM public.organizations WHERE id<>p_organization_id AND lower(maintenance_inbound_alias)=alias_part)) THEN RAISE EXCEPTION 'inbound_address_conflict' USING ERRCODE='23505'; END IF;
  END LOOP;
  DELETE FROM public.maintenance_inbound_addresses WHERE organization_id=p_organization_id AND NOT(lower(address)=ANY(ads));
  INSERT INTO public.maintenance_inbound_addresses(address,organization_id) SELECT a,p_organization_id FROM unnest(ads) a WHERE NOT EXISTS(SELECT 1 FROM public.maintenance_inbound_addresses m WHERE lower(m.address)=a);
  PERFORM public.super_admin_set_maintenance_inbound(p_organization_id,p_enabled,p_alias,p_sender_policy,p_allowed_domains);
END $fn$;
REVOKE ALL ON FUNCTION public.super_admin_save_maintenance_inbound(uuid,boolean,text,text,text[],text[]) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.super_admin_save_maintenance_inbound(uuid,boolean,text,text,text[],text[]) TO authenticated;