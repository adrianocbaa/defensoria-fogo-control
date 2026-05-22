CREATE OR REPLACE FUNCTION public.ajustar_medicao_congelada_lote(
  p_ajustes jsonb,
  p_motivo text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ajuste jsonb;
  v_old jsonb;
  v_new jsonb;
  v_count integer := 0;
  v_user_email text;
  v_item_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem ajustar valores congelados de medições.';
  END IF;

  IF p_motivo IS NULL OR length(trim(p_motivo)) < 3 THEN
    RAISE EXCEPTION 'É obrigatório informar o motivo do ajuste (mínimo 3 caracteres).';
  END IF;

  SELECT display_name INTO v_user_email FROM public.profiles WHERE user_id = auth.uid();

  FOR v_ajuste IN SELECT * FROM jsonb_array_elements(p_ajustes)
  LOOP
    v_item_id := (v_ajuste->>'id')::uuid;

    SELECT jsonb_build_object(
      'qtd_congelado', qtd_congelado,
      'pct_congelado', pct_congelado,
      'total_congelado', total_congelado
    ) INTO v_old
    FROM public.medicao_items
    WHERE id = v_item_id;

    UPDATE public.medicao_items
    SET qtd_congelado = (v_ajuste->>'qtd')::numeric,
        pct_congelado = (v_ajuste->>'pct')::numeric,
        total_congelado = (v_ajuste->>'total')::numeric,
        congelado_em = COALESCE(congelado_em, now())
    WHERE id = v_item_id;

    v_new := jsonb_build_object(
      'qtd_congelado', (v_ajuste->>'qtd')::numeric,
      'pct_congelado', (v_ajuste->>'pct')::numeric,
      'total_congelado', (v_ajuste->>'total')::numeric,
      'motivo', p_motivo
    );

    INSERT INTO public.audit_logs (table_name, record_id, operation, old_values, new_values, changed_fields, user_id, user_email)
    VALUES ('medicao_items', v_item_id, 'UPDATE', v_old, v_new, ARRAY['qtd_congelado','pct_congelado','total_congelado'], auth.uid(), v_user_email);

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;