-- H3: inbound de Manutenção multi-tenant
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS maintenance_inbound_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_inbound_alias text,
  ADD COLUMN IF NOT EXISTS maintenance_sender_policy text NOT NULL DEFAULT 'allowed_domains',
  ADD COLUMN IF NOT EXISTS maintenance_allowed_domains text[] NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX IF NOT EXISTS organizations_maint_alias_uniq
  ON public.organizations (lower(maintenance_inbound_alias)) WHERE maintenance_inbound_alias IS NOT NULL;

CREATE OR REPLACE FUNCTION public.organizations_validate_inbound()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn1$
BEGIN
  IF NEW.maintenance_sender_policy NOT IN ('any','allowed_domains','registered_users','registered_or_allowed_domains') THEN
    RAISE EXCEPTION 'maintenance_sender_policy inválida';
  END IF;
  IF NEW.maintenance_inbound_alias IS NOT NULL THEN
    NEW.maintenance_inbound_alias := lower(trim(NEW.maintenance_inbound_alias));
    IF NEW.maintenance_inbound_alias !~ '^[a-z0-9][a-z0-9-]{1,40}$' THEN
      RAISE EXCEPTION 'alias inválido';
    END IF;
  END IF;
  NEW.maintenance_allowed_domains := ARRAY(SELECT DISTINCT lower(trim(d)) FROM unnest(NEW.maintenance_allowed_domains) d WHERE trim(d) <> '');
  IF TG_OP = 'UPDATE' AND auth.uid() IS NOT NULL AND NOT public.is_super_admin(auth.uid()) AND (
       NEW.maintenance_inbound_enabled IS DISTINCT FROM OLD.maintenance_inbound_enabled
    OR NEW.maintenance_inbound_alias IS DISTINCT FROM OLD.maintenance_inbound_alias
    OR NEW.maintenance_sender_policy IS DISTINCT FROM OLD.maintenance_sender_policy
    OR NEW.maintenance_allowed_domains IS DISTINCT FROM OLD.maintenance_allowed_domains) THEN
    RAISE EXCEPTION 'Somente Super Admin altera a configuração de inbound';
  END IF;
  RETURN NEW;
END
$fn1$;
DROP TRIGGER IF EXISTS trg_org_validate_inbound ON public.organizations;
CREATE TRIGGER trg_org_validate_inbound BEFORE INSERT OR UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.organizations_validate_inbound();

-- Endereços legados explícitos (não são fallback; apenas mapeamento exato)
CREATE TABLE IF NOT EXISTS public.maintenance_inbound_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address text NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS maintenance_inbound_addresses_addr_uniq ON public.maintenance_inbound_addresses (lower(address));
GRANT ALL ON public.maintenance_inbound_addresses TO service_role;
GRANT SELECT ON public.maintenance_inbound_addresses TO authenticated;
ALTER TABLE public.maintenance_inbound_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin reads inbound addresses" ON public.maintenance_inbound_addresses
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

-- Resolução de tenant + política de remetente (somente service_role)
CREATE OR REPLACE FUNCTION public.maintenance_inbound_resolve(p_recipients text[], p_sender text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn2$
DECLARE
  r text; addr text; loc text; dom text; a text; o uuid; orgs uuid[] := '{}';
  org record; sender text := lower(trim(coalesce(p_sender,''))); sdom text; reg boolean; okd boolean;
BEGIN
  FOREACH r IN ARRAY coalesce(p_recipients,'{}') LOOP
    addr := lower(trim(r));
    CONTINUE WHEN addr !~ '^[^@\s]+@[^@\s]+$';
    loc := split_part(addr,'@',1); dom := split_part(addr,'@',2); o := NULL;
    SELECT organization_id INTO o FROM maintenance_inbound_addresses WHERE lower(address) = addr;
    IF o IS NULL THEN
      a := NULL;
      IF dom = 'manutencao.sidif.com.br' THEN a := loc;
      ELSIF dom = 'sidif.com.br' AND loc LIKE 'chamados+%' THEN a := substr(loc, 10);
      END IF;
      IF a IS NOT NULL THEN
        SELECT id INTO o FROM organizations WHERE lower(maintenance_inbound_alias) = a;
      END IF;
    END IF;
    IF o IS NOT NULL AND NOT (o = ANY(orgs)) THEN orgs := orgs || o; END IF;
  END LOOP;
  IF array_length(orgs,1) IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','unknown_recipient'); END IF;
  IF array_length(orgs,1) > 1 THEN RETURN jsonb_build_object('ok',false,'reason','ambiguous_recipient'); END IF;
  SELECT * INTO org FROM organizations WHERE id = orgs[1];
  IF org.status IS DISTINCT FROM 'active' THEN RETURN jsonb_build_object('ok',false,'reason','organization_inactive'); END IF;
  IF NOT org.maintenance_inbound_enabled THEN RETURN jsonb_build_object('ok',false,'reason','inbound_disabled'); END IF;
  sdom := split_part(sender,'@',2);
  okd := sdom <> '' AND EXISTS (SELECT 1 FROM unnest(org.maintenance_allowed_domains) d WHERE sdom = d OR sdom LIKE '%.' || d);
  reg := sender <> '' AND EXISTS (SELECT 1 FROM profiles p WHERE lower(p.email) = sender
           AND public.user_organization_id(coalesce(p.user_id, p.id)) = org.id);
  IF NOT ((org.maintenance_sender_policy = 'any')
       OR (org.maintenance_sender_policy = 'allowed_domains' AND okd)
       OR (org.maintenance_sender_policy = 'registered_users' AND reg)
       OR (org.maintenance_sender_policy = 'registered_or_allowed_domains' AND (okd OR reg))) THEN
    RETURN jsonb_build_object('ok',false,'reason','sender_not_allowed','organization_id',org.id);
  END IF;
  RETURN jsonb_build_object('ok',true,'organization_id',org.id,'alias',org.maintenance_inbound_alias);
END
$fn2$;
REVOKE ALL ON FUNCTION public.maintenance_inbound_resolve(text[], text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.maintenance_inbound_resolve(text[], text) TO service_role;

-- Configuração por Super Admin
CREATE OR REPLACE FUNCTION public.super_admin_set_maintenance_inbound(
  p_organization_id uuid, p_enabled boolean, p_alias text, p_sender_policy text, p_allowed_domains text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn3$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE organizations SET maintenance_inbound_enabled = p_enabled, maintenance_inbound_alias = nullif(trim(p_alias),''),
    maintenance_sender_policy = p_sender_policy, maintenance_allowed_domains = coalesce(p_allowed_domains,'{}'), updated_at = now()
  WHERE id = p_organization_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'organization not found'; END IF;
END
$fn3$;
REVOKE ALL ON FUNCTION public.super_admin_set_maintenance_inbound(uuid, boolean, text, text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.super_admin_set_maintenance_inbound(uuid, boolean, text, text, text[]) TO authenticated;

-- Configuração inicial
UPDATE public.organizations SET maintenance_inbound_enabled = true, maintenance_inbound_alias = 'dpe-mt', maintenance_sender_policy = 'any'
 WHERE id = '00000000-0000-0000-0000-000000000001';
UPDATE public.organizations SET maintenance_inbound_enabled = true, maintenance_inbound_alias = 'org-teste',
  maintenance_sender_policy = 'registered_or_allowed_domains', maintenance_allowed_domains = ARRAY['sidif.test']
 WHERE id = '00000000-0000-0000-0000-000000000002';
INSERT INTO public.maintenance_inbound_addresses (address, organization_id, note) VALUES
  ('chamados@sidif.com.br', '00000000-0000-0000-0000-000000000001', 'Legado DPE-MT'),
  ('manutencao@dp.mt.gov.br', '00000000-0000-0000-0000-000000000001', 'Legado DPE-MT (repasse)')
ON CONFLICT DO NOTHING;