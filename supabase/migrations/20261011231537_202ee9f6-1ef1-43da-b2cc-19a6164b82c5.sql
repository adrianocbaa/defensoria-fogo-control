-- lovable-cron-fallback-reviewed: replaces an existing 5-minute job one-for-one (same cadence, 288 runs/day) only to swap anon-key auth for an internal token; no new polling added
-- LOTE S4 — privilégios globais, RPCs e crons tenant-aware

CREATE OR REPLACE FUNCTION public.obra_same_org_as_user(_obra_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.obras o
    WHERE o.id = _obra_id AND o.organization_id IS NOT NULL
      AND o.organization_id = public.user_organization_id(_user_id))
$$;
REVOKE ALL ON FUNCTION public.obra_same_org_as_user(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obra_same_org_as_user(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.user_has_obra_access(user_uuid uuid, obra_uuid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (
    public.is_admin(user_uuid)
    OR public.has_role(user_uuid, 'gm'::user_role)
    OR public.has_role(user_uuid, 'editor'::user_role)
    OR EXISTS (SELECT 1 FROM public.user_obra_access WHERE user_id = user_uuid AND obra_id = obra_uuid)
  ) AND public.obra_same_org_as_user(obra_uuid, user_uuid)
$$;

CREATE OR REPLACE FUNCTION public.can_edit_obra(obra_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.obra_same_org_as_user(obra_uuid, user_uuid) AND
    CASE
      WHEN public.is_demo_user(user_uuid) THEN public.obra_is_demo(obra_uuid)
      ELSE NOT public.obra_is_demo(obra_uuid)
        AND (
          public.has_role(user_uuid, 'admin'::user_role)
          OR ((public.has_role(user_uuid, 'editor'::user_role) OR public.has_role(user_uuid, 'gm'::user_role))
              AND EXISTS (SELECT 1 FROM public.user_obra_access WHERE user_id = user_uuid AND obra_id = obra_uuid))
          OR public.is_fiscal_of_obra(obra_uuid, user_uuid)
          OR EXISTS (SELECT 1 FROM public.obra_fiscal_substitutos s WHERE s.obra_id = obra_uuid AND s.substitute_user_id = user_uuid)
        )
    END
$$;

CREATE OR REPLACE FUNCTION public._rdo_progress_allowed(_obra_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NULL OR public.obra_same_org_as_user(_obra_id, auth.uid())
$$;
REVOKE ALL ON FUNCTION public._rdo_progress_allowed(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._rdo_progress_allowed(uuid) TO authenticated, service_role;

DO $do$
DECLARE src text;
BEGIN
  SELECT prosrc INTO src FROM pg_proc WHERE oid = 'public.get_rdo_progress_batch(uuid[])'::regprocedure;
  src := regexp_replace(src, '^\s*BEGIN', E'BEGIN\n  p_obra_ids := ARRAY(SELECT x FROM unnest(p_obra_ids) x WHERE public._rdo_progress_allowed(x));\n');
  EXECUTE format('CREATE OR REPLACE FUNCTION public.get_rdo_progress_batch(p_obra_ids uuid[]) RETURNS TABLE(obra_id uuid, progress numeric) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS %L', src);

  SELECT prosrc INTO src FROM pg_proc WHERE oid = 'public.get_rdo_progress_by_obra(uuid)'::regprocedure;
  src := regexp_replace(src, 'BEGIN', E'BEGIN\n  IF NOT public._rdo_progress_allowed(p_obra_id) THEN RETURN NULL; END IF;\n');
  EXECUTE format('CREATE OR REPLACE FUNCTION public.get_rdo_progress_by_obra(p_obra_id uuid) RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS %L', src);
END $do$;

CREATE OR REPLACE FUNCTION public._medicao_item_same_org(_item_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.medicao_items mi JOIN public.medicoes m ON m.id = mi.medicao_id
    WHERE mi.id = _item_id AND public.obra_same_org_as_user(m.obra_id, auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.medicao_items mi JOIN public.medicao_sessions s ON s.id = mi.medicao_id
    WHERE mi.id = _item_id AND public.obra_same_org_as_user(s.obra_id, auth.uid()))
$$;
REVOKE ALL ON FUNCTION public._medicao_item_same_org(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ajustar_medicao_congelada(p_medicao_item_id uuid, p_qtd numeric, p_pct numeric, p_total numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem ajustar valores congelados de medições.';
  END IF;
  IF NOT public._medicao_item_same_org(p_medicao_item_id) THEN
    RAISE EXCEPTION 'Item de medição não encontrado.';
  END IF;
  UPDATE public.medicao_items
  SET qtd_congelado = p_qtd, pct_congelado = p_pct, total_congelado = p_total,
      congelado_em = COALESCE(congelado_em, now())
  WHERE id = p_medicao_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ajustar_medicao_congelada_lote(p_ajustes jsonb, p_motivo text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ajuste jsonb; v_old jsonb; v_new jsonb; v_count integer := 0; v_user_email text; v_item_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem ajustar valores congelados de medições.';
  END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 3 THEN
    RAISE EXCEPTION 'É obrigatório informar o motivo do ajuste (mínimo 3 caracteres).';
  END IF;
  FOR v_ajuste IN SELECT * FROM jsonb_array_elements(p_ajustes) LOOP
    IF NOT public._medicao_item_same_org((v_ajuste->>'id')::uuid) THEN
      RAISE EXCEPTION 'Item de medição não encontrado.';
    END IF;
  END LOOP;

  SELECT display_name INTO v_user_email FROM public.profiles WHERE user_id = auth.uid();
  FOR v_ajuste IN SELECT * FROM jsonb_array_elements(p_ajustes) LOOP
    v_item_id := (v_ajuste->>'id')::uuid;
    SELECT jsonb_build_object('qtd_congelado', qtd_congelado, 'pct_congelado', pct_congelado, 'total_congelado', total_congelado)
      INTO v_old FROM public.medicao_items WHERE id = v_item_id;
    UPDATE public.medicao_items
    SET qtd_congelado = (v_ajuste->>'qtd')::numeric, pct_congelado = (v_ajuste->>'pct')::numeric,
        total_congelado = (v_ajuste->>'total')::numeric, congelado_em = COALESCE(congelado_em, now())
    WHERE id = v_item_id;
    v_new := jsonb_build_object('qtd_congelado', (v_ajuste->>'qtd')::numeric, 'pct_congelado', (v_ajuste->>'pct')::numeric,
      'total_congelado', (v_ajuste->>'total')::numeric, 'motivo', p_motivo);
    INSERT INTO public.audit_logs (table_name, record_id, operation, old_values, new_values, changed_fields, user_id, user_email)
    VALUES ('medicao_items', v_item_id, 'UPDATE', v_old, v_new, ARRAY['qtd_congelado','pct_congelado','total_congelado'], auth.uid(), v_user_email);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.storage_admin_same_org_folder(p_folder text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin(auth.uid()) AND (
    public.is_super_admin(auth.uid()) OR (
      p_folder ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND public.user_organization_id(p_folder::uuid) IS NOT NULL
      AND public.user_organization_id(p_folder::uuid) = public.user_organization_id(auth.uid())))
$$;
REVOKE ALL ON FUNCTION public.storage_admin_same_org_folder(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.storage_admin_same_org_folder(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.storage_admin_same_org_obra_folder(p_folder text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin(auth.uid())
    AND p_folder ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.obra_same_org_as_user(p_folder::uuid, auth.uid())
$$;
REVOKE ALL ON FUNCTION public.storage_admin_same_org_obra_folder(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.storage_admin_same_org_obra_folder(text) TO authenticated;

DO $do$
DECLARE b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['reports','artifacts','rdo-signatures'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', replace(b,'-','_')||'_select_own');
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', replace(b,'-','_')||'_delete_own');
    EXECUTE format($p$CREATE POLICY %I ON storage.objects FOR SELECT TO authenticated USING (bucket_id = %L AND (((auth.uid())::text = (storage.foldername(name))[1]) OR public.storage_admin_same_org_folder((storage.foldername(name))[1])))$p$, replace(b,'-','_')||'_select_own', b);
    EXECUTE format($p$CREATE POLICY %I ON storage.objects FOR DELETE TO authenticated USING (bucket_id = %L AND (((auth.uid())::text = (storage.foldername(name))[1]) OR public.storage_admin_same_org_folder((storage.foldername(name))[1])))$p$, replace(b,'-','_')||'_delete_own', b);
  END LOOP;
END $do$;

DROP POLICY IF EXISTS docs_encerramento_delete ON storage.objects;
CREATE POLICY docs_encerramento_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documentos-encerramento' AND public.storage_admin_same_org_obra_folder((storage.foldername(name))[1]));

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'sidif_internal_cron_token') THEN
    PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'sidif_internal_cron_token', 'S4: token interno das rotinas agendadas');
  END IF;
END $do$;

CREATE OR REPLACE FUNCTION public.verify_internal_cron_token(p_token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, vault AS $$
  SELECT p_token IS NOT NULL AND length(p_token) >= 32 AND EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'sidif_internal_cron_token' AND decrypted_secret = p_token)
$$;
REVOKE ALL ON FUNCTION public.verify_internal_cron_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_internal_cron_token(text) TO service_role;

DO $do$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('check-teletrabalho-ending-daily','check-maintenance-confirmations-5min') AND username = current_user;
END $do$;

SELECT cron.schedule('check-teletrabalho-ending-daily-v2', '0 11 * * *', $cmd$
  SELECT net.http_post(
    url := 'https://mmumfgxngzaivvyqfbed.supabase.co/functions/v1/check-teletrabalho-ending',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-sidif-internal-token', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sidif_internal_cron_token')),
    body := '{}'::jsonb) AS request_id;
$cmd$);

SELECT cron.schedule('check-maintenance-confirmations-5min-v2', '*/5 * * * *', $cmd$
  SELECT net.http_post(
    url := 'https://mmumfgxngzaivvyqfbed.supabase.co/functions/v1/check-maintenance-confirmations',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-sidif-internal-token', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sidif_internal_cron_token')),
    body := '{}'::jsonb) AS request_id;
$cmd$);