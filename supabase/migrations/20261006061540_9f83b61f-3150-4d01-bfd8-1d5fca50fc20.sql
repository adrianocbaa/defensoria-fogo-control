-- ===== LOTE 11 — Órgão de teste para validação de isolamento e limites =====

INSERT INTO public.organizations (id, nome, cnpj, slug, status)
VALUES ('00000000-0000-0000-0000-000000000002', 'Órgão de Teste SiDIF (Homologação)', NULL, 'teste-homolog', 'active')
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-000000000002';
  v_sub uuid;
  v_pt uuid;
  v_pv uuid;
  v_plan_id uuid;
  v_tier_id uuid;
  v_tier_module uuid;
  v_price_plan bigint;
  v_price_tier bigint;
  v_price_item_plan uuid;
  v_price_item_tier uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.subscriptions WHERE organization_id = v_org) THEN
    RETURN;
  END IF;

  SELECT id INTO v_pt FROM public.price_tables WHERE status = 'active' ORDER BY valid_from DESC LIMIT 1;

  SELECT pv.id, p.id INTO v_pv, v_plan_id
  FROM public.plan_versions pv JOIN public.plans p ON p.id = pv.plan_id
  WHERE p.key = 'base' AND pv.valid_from <= CURRENT_DATE AND (pv.valid_to IS NULL OR pv.valid_to >= CURRENT_DATE)
  ORDER BY pv.valid_from DESC LIMIT 1;

  INSERT INTO public.subscriptions (organization_id, plan_version_id, status, billing_cycle, started_at,
    current_period_start, current_period_end, origin, notes, discount_cents)
  VALUES (v_org, v_pv, 'active', 'monthly', CURRENT_DATE, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month',
    'manual', 'Órgão de teste do Lote 11 — isolamento/limites; Base + Obras Medição (sem Manutenção/Preventivos)', 0)
  RETURNING id INTO v_sub;

  SELECT pi.id, pi.amount_cents INTO v_price_item_plan, v_price_plan
  FROM public.price_items pi
  WHERE pi.price_table_id = v_pt AND pi.plan_id = v_plan_id
    AND pi.module_tier_id IS NULL AND pi.addon_id IS NULL
  LIMIT 1;

  INSERT INTO public.subscription_items (subscription_id, item_type, plan_id, price_item_id, quantity, amount_cents, descricao)
  VALUES (v_sub, 'plan', v_plan_id, v_price_item_plan, 1, COALESCE(v_price_plan, 0), 'Plano Base');

  SELECT mt.id, mt.module_id, pi.id, pi.amount_cents INTO v_tier_id, v_tier_module, v_price_item_tier, v_price_tier
  FROM public.module_tiers mt
  LEFT JOIN public.price_items pi ON pi.module_tier_id = mt.id AND pi.price_table_id = v_pt
  WHERE mt.key = 'medicao' AND mt.ativo;

  INSERT INTO public.subscription_items (subscription_id, item_type, module_id, module_tier_id, price_item_id, quantity, amount_cents, descricao)
  VALUES (v_sub, 'module', v_tier_module, v_tier_id, v_price_item_tier, 1, COALESCE(v_price_tier, 0), 'Obras — Medição');

  INSERT INTO public.subscription_history (organization_id, subscription_id, entity, action, new_value, reason, changed_by)
  VALUES (v_org, v_sub, 'subscription', 'created',
    jsonb_build_object('plan', 'base', 'tiers', ARRAY['medicao']::text[], 'addons', ARRAY[]::text[], 'origin', 'manual'),
    'Órgão de teste Lote 11 (criado via migração de homologação)', NULL);

  PERFORM public.recalculate_entitlements(v_org);
END $$;

INSERT INTO public.obras (nome, municipio, status, tipo, valor_total, is_public, is_demo, rdo_habilitado,
  organization_id, n_contrato, data_inicio_prevista, coordinates_lat, coordinates_lng, objeto_contrato)
SELECT 'Obra Teste Isolamento — Lote 11', 'Cuiabá', 'em_andamento', 'Construção', 250000, true, true, true,
  '00000000-0000-0000-0000-000000000002', 'TESTE-L11', CURRENT_DATE, -15.6014, -56.0979, 'Obra fictícia para teste de isolamento entre organizações (Lote 11)'
WHERE NOT EXISTS (SELECT 1 FROM public.obras WHERE n_contrato = 'TESTE-L11');

DO $$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-000000000002';
  v_user uuid := '00000000-0000-0000-0000-0000000000a2';
  v_email text := 'teste.lote11@sidif.com.br';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user) THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
      reauthentication_token, phone, phone_change, phone_change_token, is_sso_user, is_anonymous,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (NULL, v_user, 'authenticated', 'authenticated', v_email, crypt('SidifHomolog11!', 'bf'), now(),
      '', '', '', '', '', '', NULL, '', '', false, false,
      '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Fiscal Teste Homolog L11"}'::jsonb,
      now(), now());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_user) THEN
    INSERT INTO public.profiles (user_id, display_name, email, role, is_active, force_password_change, is_maintenance_responsible)
    VALUES (v_user, 'Fiscal Teste Homolog L11', v_email, 'editor', true, false, false);
  END IF;

  DELETE FROM public.organization_members WHERE user_id = v_user;
  INSERT INTO public.organization_members (organization_id, user_id, member_type, status, activated_at)
  VALUES (v_org, v_user, 'internal', 'active', now())
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user, 'editor')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;

SELECT public.reconcile_usage_counters();

SELECT e.organization_id, o.slug,
  e.can_use_obras, e.can_use_rdo, e.can_use_manutencao, e.can_use_preventivos,
  e.internal_users_limit, e.external_users_limit, e.storage_limit_bytes
FROM public.organization_entitlements e JOIN public.organizations o ON o.id = e.organization_id
WHERE e.organization_id IN ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002')
ORDER BY e.organization_id;

SELECT organization_id, member_type, count(*) FROM public.organization_members
WHERE organization_id IN ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002')
GROUP BY 1,2 ORDER BY 1,2;