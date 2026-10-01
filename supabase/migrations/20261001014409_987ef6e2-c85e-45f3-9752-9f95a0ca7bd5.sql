CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_version_id uuid NOT NULL REFERENCES public.plan_versions(id),
  status text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial','active','past_due','suspended','cancelled','expired')),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
  started_at timestamptz NOT NULL DEFAULT now(),
  current_period_start date,
  current_period_end date,
  cancelled_at timestamptz,
  origin text NOT NULL DEFAULT 'manual' CHECK (origin IN ('manual','contract','checkout','imported')),
  contracted_amount_cents bigint NOT NULL DEFAULT 0,
  discount_cents bigint NOT NULL DEFAULT 0,
  external_reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX subscriptions_one_current_per_org ON public.subscriptions(organization_id)
  WHERE status IN ('trial','active','past_due','suspended');
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.subscription_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('plan','module','addon','discount')),
  plan_id uuid REFERENCES public.plans(id),
  module_id uuid REFERENCES public.commercial_modules(id),
  module_tier_id uuid REFERENCES public.module_tiers(id),
  addon_id uuid REFERENCES public.addons(id),
  price_item_id uuid REFERENCES public.price_items(id),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  amount_cents bigint NOT NULL DEFAULT 0,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((item_type <> 'plan') OR plan_id IS NOT NULL),
  CHECK ((item_type <> 'module') OR (module_id IS NOT NULL AND module_tier_id IS NOT NULL)),
  CHECK ((item_type <> 'addon') OR addon_id IS NOT NULL)
);
CREATE UNIQUE INDEX subscription_items_one_plan ON public.subscription_items(subscription_id) WHERE item_type = 'plan';
CREATE UNIQUE INDEX subscription_items_one_tier_per_module ON public.subscription_items(subscription_id, module_id) WHERE module_id IS NOT NULL;
GRANT SELECT ON public.subscription_items TO authenticated;
GRANT ALL ON public.subscription_items TO service_role;
ALTER TABLE public.subscription_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.subscription_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id uuid,
  entity text NOT NULL,
  action text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  reason text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sub_history_org ON public.subscription_history(organization_id, created_at DESC);
GRANT SELECT ON public.subscription_history TO authenticated;
GRANT ALL ON public.subscription_history TO service_role;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins view subscription" ON public.subscriptions FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) AND organization_id = public.user_organization_id(auth.uid()));
CREATE POLICY "Org admins view subscription items" ON public.subscription_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id = subscription_id
    AND public.is_admin(auth.uid()) AND s.organization_id = public.user_organization_id(auth.uid())));
CREATE POLICY "Org admins view subscription history" ON public.subscription_history FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) AND organization_id = public.user_organization_id(auth.uid()));

CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_subscription_items_updated BEFORE UPDATE ON public.subscription_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Total contratado = soma dos itens - desconto
CREATE OR REPLACE FUNCTION public.recalc_subscription_amount()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _sid uuid := COALESCE(NEW.subscription_id, OLD.subscription_id);
BEGIN
  UPDATE public.subscriptions s
     SET contracted_amount_cents = COALESCE((SELECT SUM(amount_cents * quantity) FROM public.subscription_items WHERE subscription_id = _sid), 0) - s.discount_cents
   WHERE s.id = _sid;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_subscription_items_recalc AFTER INSERT OR UPDATE OR DELETE ON public.subscription_items
  FOR EACH ROW EXECUTE FUNCTION public.recalc_subscription_amount();

CREATE OR REPLACE FUNCTION public.subscriptions_apply_discount()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.discount_cents IS DISTINCT FROM OLD.discount_cents THEN
    NEW.contracted_amount_cents := COALESCE((SELECT SUM(amount_cents * quantity) FROM public.subscription_items WHERE subscription_id = NEW.id), 0) - NEW.discount_cents;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_subscriptions_discount BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.subscriptions_apply_discount();

-- Histórico automático e imutável
CREATE OR REPLACE FUNCTION public.log_subscription_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid; _sid uuid;
BEGIN
  IF TG_TABLE_NAME = 'subscriptions' THEN
    _org := COALESCE(NEW.organization_id, OLD.organization_id);
    _sid := COALESCE(NEW.id, OLD.id);
    IF TG_OP = 'UPDATE' AND (to_jsonb(NEW) - 'updated_at' - 'contracted_amount_cents') = (to_jsonb(OLD) - 'updated_at' - 'contracted_amount_cents') THEN
      RETURN NULL;
    END IF;
  ELSE
    _sid := COALESCE(NEW.subscription_id, OLD.subscription_id);
    SELECT organization_id INTO _org FROM public.subscriptions WHERE id = _sid;
    IF _org IS NULL THEN RETURN NULL; END IF;
  END IF;
  INSERT INTO public.subscription_history (organization_id, subscription_id, entity, action, old_value, new_value, reason, changed_by)
  VALUES (_org, _sid, TG_TABLE_NAME, lower(TG_OP),
    CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END,
    NULLIF(current_setting('sidif.change_reason', true), ''), auth.uid());
  RETURN NULL;
END $$;
CREATE TRIGGER trg_subscriptions_history AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.log_subscription_change();
CREATE TRIGGER trg_subscription_items_history AFTER INSERT OR UPDATE OR DELETE ON public.subscription_items
  FOR EACH ROW EXECUTE FUNCTION public.log_subscription_change();

REVOKE EXECUTE ON FUNCTION public.recalc_subscription_amount() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.log_subscription_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.subscriptions_apply_discount() FROM anon, authenticated, public;