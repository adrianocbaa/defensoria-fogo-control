-- Helper: entitlement check for the caller's own organization only (no cross-org leak)
CREATE OR REPLACE FUNCTION public.my_org_can(_feature text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT COALESCE((to_jsonb(e) ->> ('can_use_' || _feature))::boolean, (to_jsonb(e) ->> _feature)::boolean, false)
       FROM public.organization_entitlements e
      WHERE e.organization_id = public.user_organization_id(auth.uid())),
    false)
$$;
REVOKE EXECUTE ON FUNCTION public.my_org_can(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_org_can(text) TO authenticated;

-- Module gating: creating new records requires the module in the contract
DROP POLICY IF EXISTS module_entitlement ON public.obras;
CREATE POLICY module_entitlement ON public.obras AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.my_org_can('obras'));
DROP POLICY IF EXISTS module_entitlement ON public.rdo_reports;
CREATE POLICY module_entitlement ON public.rdo_reports AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.my_org_can('rdo'));
DROP POLICY IF EXISTS module_entitlement ON public.maintenance_tickets;
CREATE POLICY module_entitlement ON public.maintenance_tickets AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.my_org_can('manutencao'));
DROP POLICY IF EXISTS module_entitlement ON public.fire_extinguishers;
CREATE POLICY module_entitlement ON public.fire_extinguishers AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.my_org_can('preventivos'));
DROP POLICY IF EXISTS module_entitlement ON public.hydrants;
CREATE POLICY module_entitlement ON public.hydrants AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.my_org_can('preventivos'));

-- User limits: block activating a member above the contracted limit (null = unlimited)
CREATE OR REPLACE FUNCTION public.enforce_member_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lim bigint; cnt bigint; key text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'active' AND NEW.status IS DISTINCT FROM 'invited' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IN ('active','invited') AND OLD.member_type = NEW.member_type
     AND OLD.organization_id = NEW.organization_id THEN RETURN NEW; END IF;
  key := CASE WHEN NEW.member_type = 'external' THEN 'external_users_limit' ELSE 'internal_users_limit' END;
  SELECT (to_jsonb(e) ->> key)::bigint INTO lim FROM public.organization_entitlements e WHERE e.organization_id = NEW.organization_id;
  IF lim IS NULL THEN RETURN NEW; END IF;
  SELECT count(*) INTO cnt FROM public.organization_members m
   WHERE m.organization_id = NEW.organization_id AND m.member_type = NEW.member_type
     AND m.status IN ('active','invited') AND m.id <> NEW.id;
  IF cnt >= lim THEN
    RAISE EXCEPTION 'Limite de usuários % do plano atingido (%). Contate o administrador para ampliar o plano.',
      CASE WHEN NEW.member_type = 'external' THEN 'externos' ELSE 'internos' END, lim
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.enforce_member_limit() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_enforce_member_limit ON public.organization_members;
CREATE TRIGGER trg_enforce_member_limit BEFORE INSERT OR UPDATE OF status, member_type, organization_id
  ON public.organization_members FOR EACH ROW EXECUTE FUNCTION public.enforce_member_limit();