-- Critério 12 (Outliers): classificação em três níveis pela política versionada e decisões do avaliador por amostra.

-- 1) Política SIDIF_V1 versão 3 (v2 preservada para as validações já registradas)
DO $mig$
DECLARE v2 uuid; v3 uuid;
BEGIN
  SELECT id INTO v2 FROM public.validation_policies WHERE codigo = 'SIDIF_V1' AND versao = 2 AND organization_id IS NULL;
  IF v2 IS NULL OR EXISTS (SELECT 1 FROM public.validation_policies WHERE codigo = 'SIDIF_V1' AND versao = 3 AND organization_id IS NULL) THEN RETURN; END IF;
  INSERT INTO public.validation_policies(organization_id, codigo, nome, versao, status, parametros)
  SELECT NULL, codigo, nome, 3, 'VIGENTE', parametros FROM public.validation_policies WHERE id = v2
  RETURNING id INTO v3;
  INSERT INTO public.validation_policy_rules(policy_id, codigo, numero, nome, origem, modo, bloqueante, entra_fundamentacao, thresholds, ativo)
  SELECT v3, codigo, numero, nome, origem, modo, bloqueante, entra_fundamentacao,
    CASE codigo
      WHEN 'OUTLIERS' THEN thresholds || jsonb_build_object(
        'metrica', 'RESIDUO_DP', 'limite_moderado', 2, 'limite_forte', 3, 'alpha', 0.05,
        'p_moderado', false, 'bonferroni', true, 'justificativa_manter', 'FORTE',
        'metrica_alvo', 'STUDENTIZADO_EXTERNO', 'origem', 'PROCEDIMENTO_INTERNO',
        'descricao', 'Atende automaticamente quando todas as amostras têm |Resíduo/DP| ≤ 2,00. Indício moderado: 2,00 < |r| ≤ 3,00. Forte indício: |r| > 3,00 ou p do resíduo studentizado externo < α/n (Bonferroni). Nenhuma amostra é excluída automaticamente; a decisão é do avaliador.')
      ELSE thresholds END,
    ativo
  FROM public.validation_policy_rules WHERE policy_id = v2;
  UPDATE public.validation_policies SET status = 'SUPERADA' WHERE id = v2;
END $mig$;

-- 2) Decisão do avaliador sobre amostra sinalizada (histórico em audit_events; não altera o modelo calculado)
CREATE OR REPLACE FUNCTION public.aval_outlier_decision(p_validation uuid, p_amostra uuid, p_decisao text, p_justificativa text DEFAULT NULL, p_criar_modelo boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v record; m record; v_dados jsonb; s jsonb; v_regra text; v_nivel text; v_engine text; v_num int; v_pol text;
  v_novo uuid; v_novo_nome text; v_erro text; v_vars jsonb; v_excl uuid[];
  v_just text := NULLIF(btrim(COALESCE(p_justificativa, '')), '');
BEGIN
  SELECT * INTO v FROM public.model_validations WHERE id = p_validation;
  IF v.id IS NULL OR NOT public.aval_can_edit(v.avaliacao_id, 'validation.manual_review') THEN
    RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501';
  END IF;
  IF p_decisao IS NULL OR p_decisao NOT IN ('MANTER', 'EXCLUIR') THEN RAISE EXCEPTION 'aval:invalid_decision' USING ERRCODE = '22023'; END IF;
  IF length(COALESCE(v_just, '')) > 2000 THEN RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023'; END IF;
  SELECT * INTO m FROM public.avaliacao_modelos WHERE id = v.modelo_id;
  IF m.status <> 'EM_VALIDACAO' THEN RAISE EXCEPTION 'aval:model_not_in_validation' USING ERRCODE = '22023'; END IF;
  IF v.stale OR m.stale THEN RAISE EXCEPTION 'aval:validation_stale' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM public.model_validations WHERE modelo_id = v.modelo_id AND created_at > v.created_at) THEN
    RAISE EXCEPTION 'aval:validation_not_latest' USING ERRCODE = '22023';
  END IF;
  SELECT dados INTO v_dados FROM public.model_validation_results WHERE validation_id = v.id AND codigo = 'OUTLIERS' LIMIT 1;
  SELECT x INTO s FROM jsonb_array_elements(COALESCE(v_dados->'suspeitas', '[]'::jsonb)) x WHERE x->>'amostra_id' = p_amostra::text LIMIT 1;
  IF s IS NULL THEN RAISE EXCEPTION 'aval:outlier_not_flagged' USING ERRCODE = '22023'; END IF;
  v_nivel := s->>'nivel';
  v_regra := COALESCE(v_dados->'politica'->>'justificativa_manter', 'FORTE');
  IF (p_decisao = 'EXCLUIR' OR v_regra = 'SEMPRE' OR (v_regra = 'FORTE' AND v_nivel = 'FORTE')) AND length(COALESCE(v_just, '')) < 10 THEN
    RAISE EXCEPTION 'aval:justification_required' USING ERRCODE = '22023';
  END IF;
  SELECT engine_version INTO v_engine FROM public.avaliacao_modelo_execucoes WHERE id = v.execucao_id;
  SELECT count(*) INTO v_num FROM public.model_validations WHERE modelo_id = m.id AND created_at <= v.created_at;
  SELECT codigo || ' v' || versao INTO v_pol FROM public.validation_policies WHERE id = v.policy_id;

  -- Excluir: novo modelo derivado sem a amostra (o modelo atual não é alterado); deduplicado pela assinatura existente.
  IF p_decisao = 'EXCLUIR' AND COALESCE(p_criar_modelo, true) THEN
    SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object('variavel_id', variavel_id, 'transformacao', transformacao, 'power', power)) ORDER BY ordem)
      INTO v_vars FROM public.avaliacao_modelo_variaveis WHERE modelo_id = m.id;
    SELECT array_agg(DISTINCT x ORDER BY x) INTO v_excl FROM unnest(COALESCE(m.amostras_excluidas, '{}'::uuid[]) || p_amostra) x;
    BEGIN
      v_novo := public.aval_model_create(m.avaliacao_id, m.conjunto_id, m.nome || ' sem amostra ' || lpad(s->>'ordem', 2, '0'),
        m.dependente_variavel_id, m.dependente_transformacao, m.dependente_power, v_vars, 'MANUAL', m.id, v_excl, m.espaco_id);
      SELECT nome INTO v_novo_nome FROM public.avaliacao_modelos WHERE id = v_novo;
    EXCEPTION WHEN OTHERS THEN
      v_novo := NULL;
      v_erro := CASE WHEN SQLERRM LIKE 'aval:%' THEN substring(SQLERRM FROM 6) ELSE 'model_create_failed' END;
    END;
  END IF;

  PERFORM public.aval_audit(m.avaliacao_id, 'modelo', m.id, 'OUTLIER_DECISION', jsonb_build_object(
    'validacao', v.id, 'validacao_numero', v_num, 'execucao', v.execucao_id, 'engine_version', v_engine, 'politica', v_pol,
    'modelo_numero', m.numero, 'modelo_nome', m.nome, 'amostra_id', p_amostra, 'ordem', (s->>'ordem')::int,
    'decisao', p_decisao, 'justificativa', v_just, 'nivel', v_nivel, 'metrica', v_dados->>'metrica',
    'indicadores', s - 'amostra_id', 'modelo_derivado', v_novo, 'modelo_derivado_nome', v_novo_nome, 'erro_modelo_derivado', v_erro));
  RETURN jsonb_build_object('decisao', p_decisao, 'nivel', v_nivel, 'modelo_novo', v_novo, 'modelo_novo_nome', v_novo_nome, 'erro_modelo', v_erro);
END $$;
REVOKE ALL ON FUNCTION public.aval_outlier_decision(uuid, uuid, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aval_outlier_decision(uuid, uuid, text, text, boolean) TO authenticated, service_role;

-- 3) Aceite: decisões de outlier posteriores à validação exigem revalidar; decisões entram no snapshot do aceite
CREATE OR REPLACE FUNCTION public.aval_accept_model(p_validation uuid, p_justificativa text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v record; m record; v_id uuid; v_last timestamptz; v_dados jsonb;
BEGIN
  SELECT * INTO v FROM public.model_validations WHERE id = p_validation;
  IF v.id IS NULL OR NOT public.aval_can_edit(v.avaliacao_id, 'validation.accept') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  SELECT * INTO m FROM public.avaliacao_modelos WHERE id = v.modelo_id;
  IF m.status <> 'EM_VALIDACAO' THEN RAISE EXCEPTION 'aval:model_not_in_validation' USING ERRCODE = '22023'; END IF;
  IF v.stale OR m.stale THEN RAISE EXCEPTION 'aval:validation_stale' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM public.model_validations WHERE modelo_id = v.modelo_id AND created_at > v.created_at) THEN
    RAISE EXCEPTION 'aval:validation_not_latest' USING ERRCODE = '22023';
  END IF;
  SELECT max(created_at) INTO v_last FROM public.validation_manual_reviews WHERE modelo_id = v.modelo_id;
  IF v_last IS NOT NULL AND v_last > v.created_at THEN RAISE EXCEPTION 'aval:validation_outdated_reviews' USING ERRCODE = '22023'; END IF;
  SELECT max(created_at) INTO v_last FROM public.validation_foundation_manual_grades WHERE modelo_id = v.modelo_id;
  IF v_last IS NOT NULL AND v_last > v.created_at THEN RAISE EXCEPTION 'aval:validation_outdated_reviews' USING ERRCODE = '22023'; END IF;
  SELECT max(created_at) INTO v_last FROM public.audit_events WHERE entity_type = 'modelo' AND entity_id = v.modelo_id AND event_type = 'OUTLIER_DECISION';
  IF v_last IS NOT NULL AND v_last > v.created_at THEN RAISE EXCEPTION 'aval:validation_outdated_reviews' USING ERRCODE = '22023'; END IF;
  IF v.overall_status NOT IN ('APTO','APTO_COM_RESSALVAS') THEN RAISE EXCEPTION 'aval:validation_not_apt' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM public.model_validation_results WHERE validation_id = v.id AND status = 'REQUER_ANALISE' AND NOT revisado) THEN
    RAISE EXCEPTION 'aval:manual_review_pending' USING ERRCODE = '22023';
  END IF;
  IF v.overall_status = 'APTO_COM_RESSALVAS' AND length(btrim(COALESCE(p_justificativa, ''))) < 10 THEN
    RAISE EXCEPTION 'aval:justification_required' USING ERRCODE = '22023';
  END IF;
  UPDATE public.model_acceptances SET status = 'REVOGADO', invalidado_em = now(), invalidado_motivo = 'Substituído por novo aceite'
   WHERE avaliacao_id = v.avaliacao_id AND status = 'VIGENTE';
  UPDATE public.avaliacao_projecoes SET stale = true WHERE avaliacao_id = v.avaliacao_id AND NOT stale;
  UPDATE public.avaliacao_resultado_economico SET status = 'SUPERADO', stale = true WHERE avaliacao_id = v.avaliacao_id AND status = 'VIGENTE';
  INSERT INTO public.model_acceptances(organization_id, avaliacao_id, modelo_id, validation_id, execucao_id, justificativa, accepted_by)
  VALUES (v.organization_id, v.avaliacao_id, v.modelo_id, v.id, v.execucao_id, NULLIF(btrim(p_justificativa), ''), auth.uid())
  RETURNING id INTO v_id;
  v_dados := jsonb_build_object('validacao', to_jsonb(v) - 'stale',
    'resultados', (SELECT jsonb_agg(to_jsonb(r) ORDER BY r.numero) FROM public.model_validation_results r WHERE r.validation_id = v.id),
    'revisoes', COALESCE((SELECT jsonb_agg(to_jsonb(rv) ORDER BY rv.created_at) FROM public.validation_manual_reviews rv WHERE rv.modelo_id = v.modelo_id), '[]'),
    'fundamentacao', (SELECT jsonb_build_object('resumo', to_jsonb(fs), 'itens',
        COALESCE((SELECT jsonb_agg(to_jsonb(fi) ORDER BY fi.item_number) FROM public.validation_foundation_items fi WHERE fi.validation_id = v.id), '[]'))
      FROM public.validation_foundation_summary fs WHERE fs.validation_id = v.id),
    'graus_profissionais', COALESCE((SELECT jsonb_agg(to_jsonb(g) ORDER BY g.created_at) FROM public.validation_foundation_manual_grades g WHERE g.modelo_id = v.modelo_id), '[]'),
    'decisoes_outliers', COALESCE((SELECT jsonb_agg(jsonb_build_object('created_at', e.created_at, 'actor_id', e.actor_id, 'details', e.details_json) ORDER BY e.created_at)
        FROM public.audit_events e WHERE e.entity_type = 'modelo' AND e.entity_id = v.modelo_id AND e.event_type = 'OUTLIER_DECISION'
          AND e.details_json->>'execucao' = v.execucao_id::text), '[]'));
  INSERT INTO public.validation_snapshots(organization_id, avaliacao_id, validation_id, acceptance_id, dados, hash)
  VALUES (v.organization_id, v.avaliacao_id, v.id, v_id, v_dados, public.aval_hash(v_dados));
  PERFORM public.aval_invalidate(v.avaliacao_id, 'REPORT_ONLY', 'Novo modelo aceito', NULL);
  PERFORM public.aval_audit(v.avaliacao_id, 'modelo', v.modelo_id, 'MODEL_ACCEPTED', jsonb_build_object('validacao', v.id, 'status', v.overall_status));
  PERFORM public.aval_bump_stage(v.avaliacao_id, 'RESULTADO_ECONOMICO');
  RETURN v_id;
END $function$;