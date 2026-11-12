-- Critério 1 (Relacionamento das variáveis): registro da análise visual dos gráficos de relacionamento.
-- Reutiliza o histórico existente (audit_events). Só gera análise manual que entra na validação quando a política
-- trata o critério como não automático (não cria obrigação normativa nova).
CREATE OR REPLACE FUNCTION public.aval_relationship_visual_review(p_validation uuid, p_conclusao text, p_observacao text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v record; m record; v_engine text; v_modo text; v_status text; v_num int; v_review uuid;
  v_obs text := NULLIF(btrim(COALESCE(p_observacao, '')), '');
BEGIN
  SELECT * INTO v FROM public.model_validations WHERE id = p_validation;
  IF v.id IS NULL OR NOT public.aval_can_edit(v.avaliacao_id, 'validation.manual_review') THEN
    RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501';
  END IF;
  IF p_conclusao IS NULL OR p_conclusao NOT IN ('COERENTE', 'REVISAR') THEN RAISE EXCEPTION 'aval:invalid_conclusion' USING ERRCODE = '22023'; END IF;
  IF length(COALESCE(v_obs, '')) > 2000 THEN RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023'; END IF;
  SELECT * INTO m FROM public.avaliacao_modelos WHERE id = v.modelo_id;
  IF m.status <> 'EM_VALIDACAO' THEN RAISE EXCEPTION 'aval:model_not_in_validation' USING ERRCODE = '22023'; END IF;
  IF v.stale OR m.stale THEN RAISE EXCEPTION 'aval:validation_stale' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM public.model_validations WHERE modelo_id = v.modelo_id AND created_at > v.created_at) THEN
    RAISE EXCEPTION 'aval:validation_not_latest' USING ERRCODE = '22023';
  END IF;
  SELECT engine_version INTO v_engine FROM public.avaliacao_modelo_execucoes WHERE id = v.execucao_id;
  SELECT modo INTO v_modo FROM public.validation_policy_rules WHERE policy_id = v.policy_id AND codigo = 'RELACIONAMENTO';
  v_modo := COALESCE(v_modo, 'AUTOMATICO');
  SELECT status INTO v_status FROM public.model_validation_results WHERE validation_id = v.id AND codigo = 'RELACIONAMENTO' LIMIT 1;
  SELECT count(*) INTO v_num FROM public.model_validations WHERE modelo_id = m.id AND created_at <= v.created_at;
  IF v_modo <> 'AUTOMATICO' THEN
    INSERT INTO public.validation_manual_reviews(organization_id, avaliacao_id, modelo_id, codigo, decisao, justificativa, created_by)
    VALUES (m.organization_id, m.avaliacao_id, m.id, 'RELACIONAMENTO',
      CASE WHEN p_conclusao = 'COERENTE' THEN 'ATENDE' ELSE 'INCONCLUSIVO' END,
      CASE WHEN length(COALESCE(v_obs, '')) >= 10 THEN v_obs
           ELSE 'Análise visual dos gráficos de relacionamento: ' || CASE WHEN p_conclusao = 'COERENTE' THEN 'coerência confirmada' ELSE 'marcado para revisão' END
                || COALESCE(' — ' || v_obs, '') END,
      auth.uid()) RETURNING id INTO v_review;
  END IF;
  PERFORM public.aval_audit(m.avaliacao_id, 'modelo', m.id, 'RELATIONSHIP_VISUAL_ANALYSIS', jsonb_build_object(
    'validacao', v.id, 'validacao_numero', v_num, 'execucao', v.execucao_id, 'engine_version', v_engine,
    'modelo_numero', m.numero, 'modelo_nome', m.nome, 'conclusao', p_conclusao, 'observacao', v_obs,
    'criterio_status', v_status, 'modo_politica', v_modo, 'incorpora_validacao', v_review IS NOT NULL));
  RETURN jsonb_build_object('modo', v_modo, 'incorpora_validacao', v_review IS NOT NULL);
END $$;
REVOKE ALL ON FUNCTION public.aval_relationship_visual_review(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aval_relationship_visual_review(uuid, text, text) TO authenticated, service_role;