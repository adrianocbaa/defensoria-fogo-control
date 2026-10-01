CREATE TABLE public.organization_entitlement_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  key text NOT NULL CHECK (key IN ('can_use_obras','can_use_rdo','can_use_manutencao','can_use_preventivos',
    'internal_users_limit','external_users_limit','storage_limit_bytes','sso_enabled','api_enabled','priority_support','personalizacao_institucional')),
  value jsonb,
  motivo text NOT NULL CHECK (length(trim(motivo)) > 0),
  valid_from date NOT NULL DEFAULT current_date,
  valid_to date,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ent_overrides_org ON public.organization_entitlement_overrides(organization_id);
GRANT SELECT ON public.organization_entitlement_overrides TO authenticated;
GRANT ALL ON public.organization_entitlement_overrides TO service_role;
ALTER TABLE public.organization_entitlement_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org admins view overrides" ON public.organization_entitlement_overrides FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) AND organization_id = public.user_organization_id(auth.uid()));
CREATE TRIGGER trg_ent_overrides_updated BEFORE UPDATE ON public.organization_entitlement_overrides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.organization_entitlements (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  can_use_obras boolean NOT NULL DEFAULT false,
  can_use_rdo boolean NOT NULL DEFAULT false,
  can_use_manutencao boolean NOT NULL DEFAULT false,
  can_use_preventivos boolean NOT NULL DEFAULT false,
  internal_users_limit integer,
  external_users_limit integer,
  storage_limit_bytes bigint,
  sso_enabled boolean NOT NULL DEFAULT false,
  api_enabled boolean NOT NULL DEFAULT false,
  priority_support boolean NOT NULL DEFAULT false,
  personalizacao_institucional boolean NOT NULL DEFAULT false,
  computed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organization_entitlements TO authenticated;
GRANT ALL ON public.organization_entitlements TO service_role;
ALTER TABLE public.organization_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own entitlements" ON public.organization_entitlements FOR SELECT TO authenticated
  USING (organization_id = public.user_organization_id(auth.uid()));

CREATE OR REPLACE FUNCTION public.recalculate_entitlements(_org uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _sub public.subscriptions%ROWTYPE;
  _pv public.plan_versions%ROWTYPE;
  _e jsonb;
  _ov record;
BEGIN
  SELECT * INTO _sub FROM public.subscriptions
   WHERE organization_id = _org AND status IN ('trial','active','past_due')
   ORDER BY started_at DESC LIMIT 1;

  IF _sub.id IS NULL THEN
    _e := jsonb_build_object('can_use_obras',false,'can_use_rdo',false,'can_use_manutencao',false,'can_use_preventivos',false,
      'internal_users_limit',0,'external_users_limit',0,'storage_limit_bytes',0,
      'sso_enabled',false,'api_enabled',false,'priority_support',false,'personalizacao_institucional',false);
  ELSE
    SELECT * INTO _pv FROM public.plan_versions WHERE id = _sub.plan_version_id;
    _e := jsonb_build_object(
      'can_use_obras', EXISTS (SELECT 1 FROM public.subscription_items i JOIN public.commercial_modules m ON m.id=i.module_id
                               WHERE i.subscription_id=_sub.id AND m.key='obras'),
      'can_use_rdo', EXISTS (SELECT 1 FROM public.subscription_items i JOIN public.module_tiers t ON t.id=i.module_tier_id
                             WHERE i.subscription_id=_sub.id AND t.key='gestao_completa'),
      'can_use_manutencao', EXISTS (SELECT 1 FROM public.subscription_items i JOIN public.commercial_modules m ON m.id=i.module_id
                                    WHERE i.subscription_id=_sub.id AND m.key='manutencao'),
      'can_use_preventivos', EXISTS (SELECT 1 FROM public.subscription_items i JOIN public.commercial_modules m ON m.id=i.module_id
                                     WHERE i.subscription_id=_sub.id AND m.key='preventivos'),
      'internal_users_limit', CASE WHEN _pv.internal_users_limit IS NULL THEN NULL ELSE _pv.internal_users_limit + COALESCE((SELECT SUM(a.quantidade*i.quantity) FROM public.subscription_items i JOIN public.addons a ON a.id=i.addon_id WHERE i.subscription_id=_sub.id AND a.tipo='internal_users'),0) END,
      'external_users_limit', CASE WHEN _pv.external_users_limit IS NULL THEN NULL ELSE _pv.external_users_limit + COALESCE((SELECT SUM(a.quantidade*i.quantity) FROM public.subscription_items i JOIN public.addons a ON a.id=i.addon_id WHERE i.subscription_id=_sub.id AND a.tipo='external_users'),0) END,
      'storage_limit_bytes', CASE WHEN _pv.storage_limit_bytes IS NULL THEN NULL ELSE _pv.storage_limit_bytes + COALESCE((SELECT SUM(a.quantidade*i.quantity) FROM public.subscription_items i JOIN public.addons a ON a.id=i.addon_id WHERE i.subscription_id=_sub.id AND a.tipo='storage'),0) END,
      'sso_enabled', COALESCE(_pv.sso_enabled,false),
      'api_enabled', COALESCE(_pv.api_enabled,false),
      'priority_support', COALESCE(_pv.priority_support,false),
      'personalizacao_institucional', COALESCE(_pv.personalizacao_institucional,false));
  END IF;

  FOR _ov IN SELECT key, value FROM public.organization_entitlement_overrides
             WHERE organization_id=_org AND valid_from <= current_date AND (valid_to IS NULL OR valid_to >= current_date)
             ORDER BY created_at LOOP
    _e := _e || jsonb_build_object(_ov.key, _ov.value);
  END LOOP;

  INSERT INTO public.organization_entitlements AS t
  SELECT _org, r.can_use_obras, r.can_use_rdo, r.can_use_manutencao, r.can_use_preventivos,
         r.internal_users_limit, r.external_users_limit, r.storage_limit_bytes,
         r.sso_enabled, r.api_enabled, r.priority_support, r.personalizacao_institucional, now()
  FROM jsonb_populate_record(NULL::public.organization_entitlements, _e) r
  ON CONFLICT (organization_id) DO UPDATE SET
    can_use_obras=EXCLUDED.can_use_obras, can_use_rdo=EXCLUDED.can_use_rdo,
    can_use_manutencao=EXCLUDED.can_use_manutencao, can_use_preventivos=EXCLUDED.can_use_preventivos,
    internal_users_limit=EXCLUDED.internal_users_limit, external_users_limit=EXCLUDED.external_users_limit,
    storage_limit_bytes=EXCLUDED.storage_limit_bytes, sso_enabled=EXCLUDED.sso_enabled,
    api_enabled=EXCLUDED.api_enabled, priority_support=EXCLUDED.priority_support,
    personalizacao_institucional=EXCLUDED.personalizacao_institucional, computed_at=now();
END $$;
REVOKE EXECUTE ON FUNCTION public.recalculate_entitlements(uuid) FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.trg_recalc_entitlements()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid;
BEGIN
  IF TG_TABLE_NAME = 'subscription_items' THEN
    SELECT organization_id INTO _org FROM public.subscriptions WHERE id = COALESCE(NEW.subscription_id, OLD.subscription_id);
  ELSE
    _org := COALESCE(NEW.organization_id, OLD.organization_id);
  END IF;
  IF _org IS NOT NULL THEN PERFORM public.recalculate_entitlements(_org); END IF;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.trg_recalc_entitlements() FROM anon, authenticated, public;
CREATE TRIGGER trg_subscriptions_entitlements AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_entitlements();
CREATE TRIGGER trg_subscription_items_entitlements AFTER INSERT OR UPDATE OR DELETE ON public.subscription_items FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_entitlements();
CREATE TRIGGER trg_overrides_entitlements AFTER INSERT OR UPDATE OR DELETE ON public.organization_entitlement_overrides FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_entitlements();

CREATE OR REPLACE FUNCTION public.org_can(_org uuid, _feature text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((to_jsonb(e) ->> ('can_use_' || _feature))::boolean, (to_jsonb(e) ->> _feature)::boolean, false)
  FROM public.organization_entitlements e WHERE e.organization_id = _org
$$;
CREATE OR REPLACE FUNCTION public.org_limit(_org uuid, _key text)
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (to_jsonb(e) ->> _key)::bigint FROM public.organization_entitlements e WHERE e.organization_id = _org
$$;
REVOKE EXECUTE ON FUNCTION public.org_can(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.org_limit(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.org_can(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_limit(uuid, text) TO authenticated;