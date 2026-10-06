CREATE OR REPLACE FUNCTION public.super_admin_create_subscription(p_organization_id uuid, p_plan_key text, p_module_tier_keys text[] DEFAULT '{}'::text[], p_addon_keys text[] DEFAULT '{}'::text[], p_billing_cycle text DEFAULT 'monthly'::text, p_started_at date DEFAULT CURRENT_DATE, p_period_end date DEFAULT NULL::date, p_origin text DEFAULT 'manual'::text, p_external_reference text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_discount_cents bigint DEFAULT 0, p_custom_amounts jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sub uuid;
  v_plan_version uuid;
  v_price_table uuid;
  v_tier_key text;
  v_addon_key text;
  v_tier record;
  v_addon record;
  v_price bigint;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado: requer super admin'; END IF;

  SELECT id INTO v_price_table FROM public.price_tables WHERE status = 'active' ORDER BY valid_from DESC LIMIT 1;
  IF v_price_table IS NULL THEN RAISE EXCEPTION 'Nenhuma tabela de preços ativa'; END IF;

  SELECT pv.id INTO v_plan_version
  FROM public.plan_versions pv JOIN public.plans p ON p.id = pv.plan_id
  WHERE p.key = p_plan_key AND pv.valid_from <= CURRENT_DATE AND (pv.valid_to IS NULL OR pv.valid_to >= CURRENT_DATE)
  ORDER BY pv.valid_from DESC LIMIT 1;
  IF v_plan_version IS NULL THEN RAISE EXCEPTION 'Plano % sem versão vigente', p_plan_key; END IF;

  INSERT INTO public.subscriptions (organization_id, plan_version_id, status, billing_cycle, started_at, current_period_start, current_period_end, origin, external_reference, notes, discount_cents)
  VALUES (p_organization_id, v_plan_version, 'active', p_billing_cycle, p_started_at, p_started_at, COALESCE(p_period_end, p_started_at + INTERVAL '1 month'), p_origin, p_external_reference, p_notes, p_discount_cents)
  RETURNING id INTO v_sub;

  SELECT pi.amount_cents INTO v_price FROM public.price_items pi
  WHERE pi.price_table_id = v_price_table AND pi.plan_id = (SELECT plan_id FROM public.plan_versions WHERE id = v_plan_version)
    AND pi.module_tier_id IS NULL AND pi.addon_id IS NULL
  LIMIT 1;

  INSERT INTO public.subscription_items (subscription_id, item_type, plan_id, price_item_id, quantity, amount_cents, descricao)
  SELECT v_sub, 'plan', p.id, pi.id, 1,
         COALESCE((p_custom_amounts->>'plan')::bigint, pi.amount_cents),
         'Plano ' || p.nome
  FROM public.plans p JOIN public.price_items pi ON pi.plan_id = p.id AND pi.price_table_id = v_price_table
  WHERE p.key = p_plan_key AND pi.module_tier_id IS NULL AND pi.addon_id IS NULL;

  FOREACH v_tier_key IN ARRAY p_module_tier_keys LOOP
    SELECT mt.id AS tier_id, mt.module_id, mt.nome AS tier_nome, cm.nome AS module_nome, pi.id AS price_item_id, pi.amount_cents
    INTO v_tier
    FROM public.module_tiers mt
    JOIN public.commercial_modules cm ON cm.id = mt.module_id
    LEFT JOIN public.price_items pi ON pi.module_tier_id = mt.id AND pi.price_table_id = v_price_table
    WHERE mt.key = v_tier_key AND mt.ativo;
    IF v_tier.tier_id IS NULL THEN RAISE EXCEPTION 'Tier de módulo % não encontrado', v_tier_key; END IF;
    INSERT INTO public.subscription_items (subscription_id, item_type, module_id, module_tier_id, price_item_id, quantity, amount_cents, descricao)
    VALUES (v_sub, 'module', v_tier.module_id, v_tier.tier_id, v_tier.price_item_id, 1,
            COALESCE((p_custom_amounts->>v_tier_key)::bigint, v_tier.amount_cents, 0),
            v_tier.module_nome || ' — ' || v_tier.tier_nome);
  END LOOP;

  FOREACH v_addon_key IN ARRAY p_addon_keys LOOP
    SELECT a.id, a.nome, pi.id AS price_item_id, pi.amount_cents INTO v_addon
    FROM public.addons a
    LEFT JOIN public.price_items pi ON pi.addon_id = a.id AND pi.price_table_id = v_price_table
    WHERE a.key = v_addon_key AND a.ativo;
    IF v_addon.id IS NULL THEN RAISE EXCEPTION 'Extra % não encontrado', v_addon_key; END IF;
    INSERT INTO public.subscription_items (subscription_id, item_type, addon_id, price_item_id, quantity, amount_cents, descricao)
    VALUES (v_sub, 'addon', v_addon.id, v_addon.price_item_id, 1,
            COALESCE((p_custom_amounts->>v_addon_key)::bigint, v_addon.amount_cents, 0),
            'Extra: ' || v_addon.nome);
  END LOOP;

  PERFORM public.recalculate_entitlements(p_organization_id);

  INSERT INTO public.subscription_history (organization_id, subscription_id, entity, action, new_value, reason, changed_by)
  VALUES (p_organization_id, v_sub, 'subscription', 'created',
          jsonb_build_object('plan', p_plan_key, 'tiers', p_module_tier_keys, 'addons', p_addon_keys, 'origin', p_origin),
          COALESCE(p_notes, 'Contratação manual via painel Super Admin'), auth.uid());

  RETURN v_sub;
END;
$function$;