-- Ciclo de vida do modelo: retirar da validação, revalidar com configuração atual, arquivamento bloqueado em validação, histórico.
-- Nada é apagado: execuções, coeficientes, validações, aceites e snapshots são preservados.

-- 1) Motivo da invalidação disponível para o registro por modelo (mesma função, uma linha a mais).
CREATE OR REPLACE FUNCTION public.aval_invalidate(p_av uuid, p_nivel text, p_motivo text, p_secoes text[] DEFAULT NULL::text[])
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE n_mod int := 0; n_val int := 0; n_ac int := 0; n_proj int := 0; n_res int := 0; n_sec int := 0;
BEGIN
  IF p_nivel = 'NO_IMPACT' THEN RETURN jsonb_build_object('nivel', p_nivel); END IF;
  PERFORM set_config('aval.inv_motivo', COALESCE(p_motivo, ''), true);
  IF p_nivel IN ('DATASET','MODEL') THEN
    UPDATE public.avaliacao_modelos SET stale = true, stale_motivo = p_motivo, stale_em = now()
     WHERE avaliacao_id = p_av AND NOT stale AND status <> 'RASCUNHO';
    GET DIAGNOSTICS n_mod = ROW_COUNT;
  END IF;
  IF p_nivel IN ('DATASET','MODEL','VALIDATION') THEN
    UPDATE public.model_validations SET stale = true WHERE avaliacao_id = p_av AND NOT stale;
    GET DIAGNOSTICS n_val = ROW_COUNT;
    UPDATE public.model_acceptances SET status = 'INVALIDADO', invalidado_em = now(), invalidado_motivo = p_motivo
     WHERE avaliacao_id = p_av AND status = 'VIGENTE';
    GET DIAGNOSTICS n_ac = ROW_COUNT;
    UPDATE public.avaliacao_projecoes SET stale = true WHERE avaliacao_id = p_av AND NOT stale;
    GET DIAGNOSTICS n_proj = ROW_COUNT;
  END IF;
  IF p_nivel IN ('DATASET','MODEL','VALIDATION','PROJECTION','ECONOMIC_RESULT') THEN
    UPDATE public.avaliacao_resultado_economico SET stale = true, status = 'DESATUALIZADO' WHERE avaliacao_id = p_av AND status = 'VIGENTE';
    GET DIAGNOSTICS n_res = ROW_COUNT;
  END IF;
  UPDATE public.laudo_secoes s SET stale = true FROM public.laudo_versoes v
   WHERE v.id = s.laudo_versao_id AND v.avaliacao_id = p_av AND v.status IN ('RASCUNHO','EM_REVISAO') AND NOT s.stale
     AND (p_nivel <> 'REPORT_ONLY' OR p_secoes IS NULL OR s.codigo = ANY(p_secoes));
  GET DIAGNOSTICS n_sec = ROW_COUNT;
  IF n_mod + n_val + n_ac + n_proj + n_res + n_sec > 0 THEN
    PERFORM public.aval_audit(p_av, 'avaliacao', p_av, 'INVALIDATION_APPLIED',
      jsonb_build_object('nivel', p_nivel, 'motivo', p_motivo, 'modelos', n_mod, 'validacoes', n_val, 'aceites', n_ac,
                         'projecoes', n_proj, 'resultados', n_res, 'secoes_laudo', n_sec));
  END IF;
  RETURN jsonb_build_object('nivel', p_nivel, 'modelos', n_mod, 'validacoes', n_val, 'aceites', n_ac, 'projecoes', n_proj, 'resultados', n_res, 'secoes_laudo', n_sec);
END $function$;

-- 2) Cada validação que fica desatualizada gera um evento no histórico do modelo (coeficientes preservados).
CREATE OR REPLACE FUNCTION public.aval_trg_validation_stale() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.stale AND NOT OLD.stale THEN
    INSERT INTO public.audit_events(organization_id, avaliacao_id, entity_type, entity_id, event_type, actor_id, details_json)
    VALUES (NEW.organization_id, NEW.avaliacao_id, 'modelo', NEW.modelo_id, 'VALIDATION_MARKED_STALE', auth.uid(),
      jsonb_build_object('validacao', NEW.id, 'motivo', NULLIF(current_setting('aval.inv_motivo', true), ''), 'coeficientes_preservados', true));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS aval_validation_stale_log ON public.model_validations;
CREATE TRIGGER aval_validation_stale_log AFTER UPDATE OF stale ON public.model_validations
  FOR EACH ROW EXECUTE FUNCTION public.aval_trg_validation_stale();

-- 3) Barreira no banco: modelo em validação nunca é arquivado (qualquer caminho).
CREATE OR REPLACE FUNCTION public.aval_guard_modelo_ciclo() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.arquivado AND NEW.status = 'EM_VALIDACAO'
     AND (NEW.arquivado IS DISTINCT FROM OLD.arquivado OR NEW.status IS DISTINCT FROM OLD.status) THEN
    RAISE EXCEPTION 'aval:model_in_validation' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS aval_guard_ciclo ON public.avaliacao_modelos;
CREATE TRIGGER aval_guard_ciclo BEFORE UPDATE OF arquivado, status ON public.avaliacao_modelos
  FOR EACH ROW EXECUTE FUNCTION public.aval_guard_modelo_ciclo();

-- 4) Proteção contra arquivamento: em validação, aceito vigente, projeção vigente, origem de outro modelo, candidato ou favorito.
CREATE OR REPLACE FUNCTION public.aval_model_protegido(p_modelo uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT m.status NOT IN ('RASCUNHO','CALCULADO','ERRO') OR m.candidato OR m.favorito
      OR EXISTS (SELECT 1 FROM public.model_acceptances x WHERE x.modelo_id = m.id AND x.status = 'VIGENTE')
      OR EXISTS (SELECT 1 FROM public.avaliacao_projecoes x WHERE x.modelo_id = m.id AND NOT x.stale)
      OR EXISTS (SELECT 1 FROM public.avaliacao_modelos x WHERE x.modelo_origem_id = m.id)
    FROM public.avaliacao_modelos m WHERE m.id = p_modelo
$$;

CREATE OR REPLACE FUNCTION public.aval_model_archive(p_avaliacao uuid, p_modelos uuid[] DEFAULT NULL, p_rodada uuid DEFAULT NULL, p_arquivar boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_alvo uuid[]; v_ok uuid[]; v_prot int; v_emval int := 0;
BEGIN
  IF NOT public.aval_can_edit(p_avaliacao, 'model.create') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  IF p_rodada IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.avaliacao_model_generation_runs WHERE id = p_rodada AND avaliacao_id = p_avaliacao) THEN
    RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501';
  END IF;
  IF COALESCE(p_arquivar, true) AND p_modelos IS NOT NULL AND p_rodada IS NULL AND EXISTS (
       SELECT 1 FROM public.avaliacao_modelos m WHERE m.avaliacao_id = p_avaliacao AND m.id = ANY(p_modelos) AND m.status = 'EM_VALIDACAO' AND NOT m.arquivado) THEN
    RAISE EXCEPTION 'aval:model_in_validation' USING ERRCODE = '22023';
  END IF;
  SELECT COALESCE(array_agg(m.id), '{}') INTO v_alvo FROM public.avaliacao_modelos m
   WHERE m.avaliacao_id = p_avaliacao AND m.arquivado IS DISTINCT FROM COALESCE(p_arquivar, true)
     AND (p_modelos IS NULL OR m.id = ANY(p_modelos))
     AND (p_rodada IS NULL OR EXISTS (SELECT 1 FROM public.avaliacao_model_run_modelos rm WHERE rm.run_id = p_rodada AND rm.modelo_id = m.id));
  IF COALESCE(p_arquivar, true) THEN
    SELECT count(*) INTO v_emval FROM public.avaliacao_modelos WHERE id = ANY(v_alvo) AND status = 'EM_VALIDACAO';
    SELECT COALESCE(array_agg(id), '{}') INTO v_ok FROM unnest(v_alvo) id WHERE NOT public.aval_model_protegido(id);
    UPDATE public.avaliacao_modelos SET arquivado = true, arquivado_em = now(), arquivado_por = auth.uid() WHERE id = ANY(v_ok);
  ELSE
    v_ok := v_alvo;
    UPDATE public.avaliacao_modelos SET arquivado = false, arquivado_em = NULL, arquivado_por = NULL WHERE id = ANY(v_ok);
  END IF;
  v_prot := cardinality(v_alvo) - cardinality(v_ok);
  IF cardinality(v_ok) > 0 THEN
    PERFORM public.aval_audit(p_avaliacao, 'avaliacao', p_avaliacao, CASE WHEN COALESCE(p_arquivar, true) THEN 'MODELS_ARCHIVED' ELSE 'MODELS_UNARCHIVED' END,
      jsonb_build_object('quantidade', cardinality(v_ok), 'protegidos', v_prot, 'em_validacao', v_emval, 'rodada', p_rodada, 'modelos', to_jsonb(v_ok[1:500])));
  END IF;
  RETURN jsonb_build_object('alterados', cardinality(v_ok), 'protegidos', v_prot, 'em_validacao', v_emval);
END $$;
REVOKE ALL ON FUNCTION public.aval_model_archive(uuid, uuid[], uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aval_model_archive(uuid, uuid[], uuid, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.aval_model_run_archive(p_run uuid, p_arquivar boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_ids uuid[]; v_res jsonb;
BEGIN
  SELECT * INTO r FROM public.avaliacao_model_generation_runs WHERE id = p_run;
  IF r.id IS NULL OR NOT public.aval_can_edit(r.avaliacao_id, 'model.create') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  UPDATE public.avaliacao_model_generation_runs SET arquivada = COALESCE(p_arquivar, true),
    arquivada_em = CASE WHEN COALESCE(p_arquivar, true) THEN now() END, arquivada_por = CASE WHEN COALESCE(p_arquivar, true) THEN auth.uid() END
   WHERE id = p_run;
  SELECT COALESCE(array_agg(rm.modelo_id), '{}') INTO v_ids FROM public.avaliacao_model_run_modelos rm
   WHERE rm.run_id = p_run AND (NOT COALESCE(p_arquivar, true) OR NOT EXISTS (
     SELECT 1 FROM public.avaliacao_model_run_modelos o JOIN public.avaliacao_model_generation_runs g ON g.id = o.run_id
      WHERE o.modelo_id = rm.modelo_id AND o.run_id <> p_run AND NOT g.arquivada));
  v_res := public.aval_model_archive(r.avaliacao_id, v_ids, p_run, COALESCE(p_arquivar, true));
  PERFORM public.aval_audit(r.avaliacao_id, 'rodada_modelos', p_run, CASE WHEN COALESCE(p_arquivar, true) THEN 'MODEL_ROUND_ARCHIVED' ELSE 'MODEL_ROUND_UNARCHIVED' END,
    jsonb_build_object('numero', r.numero) || v_res);
  RETURN v_res || jsonb_build_object('rodada', r.numero, 'mantidos_outras_rodadas',
    (SELECT count(*) FROM public.avaliacao_model_run_modelos WHERE run_id = p_run) - cardinality(v_ids));
END $$;
REVOKE ALL ON FUNCTION public.aval_model_run_archive(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aval_model_run_archive(uuid, boolean) TO authenticated, service_role;

-- 5) Envio/reenvio à validação
CREATE OR REPLACE FUNCTION public.aval_send_to_validation(p_modelo uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE m record; e record; v_reenvio boolean; v_nval int;
BEGIN
  SELECT * INTO m FROM public.avaliacao_modelos WHERE id = p_modelo;
  IF m.id IS NULL OR NOT public.aval_can_edit(m.avaliacao_id, 'validation.run') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  IF m.stale THEN RAISE EXCEPTION 'aval:model_stale' USING ERRCODE = '22023'; END IF;
  IF m.status = 'EM_VALIDACAO' THEN RETURN; END IF;
  SELECT * INTO e FROM public.avaliacao_modelo_execucoes WHERE modelo_id = p_modelo AND status = 'SUCESSO' ORDER BY created_at DESC LIMIT 1;
  IF e.id IS NULL THEN RAISE EXCEPTION 'aval:model_not_calculated' USING ERRCODE = '22023'; END IF;
  v_reenvio := EXISTS (SELECT 1 FROM public.audit_events WHERE entity_type = 'modelo' AND entity_id = m.id AND event_type = 'MODEL_WITHDRAWN_FROM_VALIDATION');
  SELECT count(*) INTO v_nval FROM public.model_validations WHERE modelo_id = m.id;
  UPDATE public.avaliacao_modelos SET status = 'EM_VALIDACAO', candidato = true, arquivado = false, arquivado_em = NULL, arquivado_por = NULL WHERE id = p_modelo;
  INSERT INTO public.modelo_snapshots(organization_id, avaliacao_id, modelo_id, execucao_id, dados, hash)
  SELECT m.organization_id, m.avaliacao_id, m.id, e.id, s.d, public.aval_hash(s.d) FROM (SELECT jsonb_build_object(
      'modelo', to_jsonb(m) - 'updated_at' - 'favorito' - 'candidato' - 'status',
      'variaveis', (SELECT jsonb_agg(to_jsonb(mv) ORDER BY mv.ordem) FROM public.avaliacao_modelo_variaveis mv WHERE mv.modelo_id = m.id),
      'execucao_id', e.id, 'input_hash', e.input_hash, 'output_hash', e.output_hash, 'engine_version', e.engine_version) AS d) s;
  PERFORM public.aval_audit(m.avaliacao_id, 'modelo', m.id, CASE WHEN v_reenvio THEN 'MODEL_RESENT_TO_VALIDATION' ELSE 'MODEL_SENT_TO_VALIDATION' END,
    jsonb_build_object('execucao', e.id, 'status_anterior', m.status, 'status_novo', 'EM_VALIDACAO', 'validacoes_anteriores', v_nval));
  PERFORM public.aval_bump_stage(m.avaliacao_id, 'VALIDACAO');
END $function$;

-- 6) Retirar da validação
CREATE OR REPLACE FUNCTION public.aval_model_withdraw_validation(p_modelo uuid, p_motivo text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m record; v_ac uuid; v_nval int; v_motivo text := NULLIF(btrim(COALESCE(p_motivo, '')), '');
BEGIN
  SELECT * INTO m FROM public.avaliacao_modelos WHERE id = p_modelo FOR UPDATE;
  IF m.id IS NULL OR NOT public.aval_can_edit(m.avaliacao_id, 'validation.run') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  IF m.status <> 'EM_VALIDACAO' THEN RAISE EXCEPTION 'aval:model_not_in_validation' USING ERRCODE = '22023'; END IF;
  SELECT id INTO v_ac FROM public.model_acceptances WHERE modelo_id = m.id AND status = 'VIGENTE' LIMIT 1;
  IF v_ac IS NOT NULL THEN
    IF length(COALESCE(v_motivo, '')) < 10 THEN RAISE EXCEPTION 'aval:justification_required' USING ERRCODE = '22023'; END IF;
    UPDATE public.model_acceptances SET status = 'REVOGADO', invalidado_em = now(), invalidado_motivo = 'Modelo retirado da validação: ' || v_motivo WHERE id = v_ac;
    UPDATE public.avaliacao_projecoes SET stale = true WHERE modelo_id = m.id AND NOT stale;
    PERFORM public.aval_invalidate(m.avaliacao_id, 'ECONOMIC_RESULT', 'Modelo aceito retirado da validação');
  END IF;
  UPDATE public.avaliacao_modelos SET status = 'CALCULADO', candidato = false WHERE id = m.id;
  SELECT count(*) INTO v_nval FROM public.model_validations WHERE modelo_id = m.id;
  PERFORM public.aval_audit(m.avaliacao_id, 'modelo', m.id, 'MODEL_WITHDRAWN_FROM_VALIDATION',
    jsonb_build_object('status_anterior', 'EM_VALIDACAO', 'status_novo', 'CALCULADO', 'acao', 'Retirado da validação', 'motivo', v_motivo,
      'validacoes_preservadas', v_nval, 'aceite_revogado', v_ac));
  RETURN jsonb_build_object('status', 'CALCULADO', 'validacoes_preservadas', v_nval, 'aceite_revogado', v_ac IS NOT NULL);
END $$;
REVOKE ALL ON FUNCTION public.aval_model_withdraw_validation(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aval_model_withdraw_validation(uuid, text) TO authenticated, service_role;

-- 7) Aceite somente de modelo em validação
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
    'graus_profissionais', COALESCE((SELECT jsonb_agg(to_jsonb(g) ORDER BY g.created_at) FROM public.validation_foundation_manual_grades g WHERE g.modelo_id = v.modelo_id), '[]'));
  INSERT INTO public.validation_snapshots(organization_id, avaliacao_id, validation_id, acceptance_id, dados, hash)
  VALUES (v.organization_id, v.avaliacao_id, v.id, v_id, v_dados, public.aval_hash(v_dados));
  PERFORM public.aval_invalidate(v.avaliacao_id, 'REPORT_ONLY', 'Novo modelo aceito', NULL);
  PERFORM public.aval_audit(v.avaliacao_id, 'modelo', v.modelo_id, 'MODEL_ACCEPTED', jsonb_build_object('validacao', v.id, 'status', v.overall_status));
  PERFORM public.aval_bump_stage(v.avaliacao_id, 'RESULTADO_ECONOMICO');
  RETURN v_id;
END $function$;

-- 8) Validação gravada pelo motor: nova linha sempre; revalidação registrada como tal.
CREATE OR REPLACE FUNCTION public.aval_engine_persist_validation(p jsonb)
 RETURNS uuid LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE v jsonb := p->'validacao'; v_id uuid; v_av uuid := (p->'validacao'->>'avaliacao_id')::uuid; prev record;
BEGIN
  SELECT id, stale INTO prev FROM public.model_validations WHERE modelo_id = (v->>'modelo_id')::uuid ORDER BY created_at DESC, id DESC LIMIT 1;
  INSERT INTO public.model_validations(organization_id, avaliacao_id, modelo_id, execucao_id, policy_id, overall_status, fundamentacao_grau, precisao_grau, amplitude_pct, resumo_json, created_by)
  VALUES ((v->>'organization_id')::uuid, v_av, (v->>'modelo_id')::uuid, (v->>'execucao_id')::uuid, (v->>'policy_id')::uuid, v->>'overall_status',
    v->>'fundamentacao_grau', v->>'precisao_grau', (v->>'amplitude_pct')::numeric, v->'resumo_json', (v->>'created_by')::uuid)
  RETURNING id INTO v_id;
  INSERT INTO public.model_validation_results(avaliacao_id, validation_id, codigo, numero, nome, origem, modo, status, grau, valor, detalhe, dados, revisado, bloqueante)
  SELECT v_av, v_id, r.codigo, r.numero, r.nome, r.origem, r.modo, r.status, r.grau, r.valor, r.detalhe, r.dados, r.revisado, r.bloqueante
    FROM jsonb_to_recordset(p->'resultados') AS r(codigo text, numero int, nome text, origem text, modo text, status text, grau text, valor numeric, detalhe text, dados jsonb, revisado boolean, bloqueante boolean);
  IF p ? 'fundamentacao' AND jsonb_typeof(p->'fundamentacao') = 'object' THEN
    INSERT INTO public.validation_foundation_summary(avaliacao_id, validation_id, policy_id, policy_version, policy_reference, total_points, grade_calculated,
      requirements_met, mandatory_requirements_json, pendencias)
    SELECT v_av, v_id, (v->>'policy_id')::uuid, (p->'fundamentacao'->>'policy_version')::int, s.policy_reference, s.total_points, s.grade_calculated,
      s.requirements_met, COALESCE(s.mandatory_requirements_json, '[]'), COALESCE(s.pendencias, '[]')
      FROM jsonb_to_record(p->'fundamentacao'->'summary') AS s(policy_reference text, total_points int, grade_calculated text, requirements_met boolean, mandatory_requirements_json jsonb, pendencias jsonb);
    INSERT INTO public.validation_foundation_items(avaliacao_id, validation_id, item_number, codigo, titulo, source_type, criterio_codigo, grade_achieved, points, mandatory_for_grade, status, details_json)
    SELECT v_av, v_id, i.item_number, i.codigo, i.titulo, i.source_type, i.criterio_codigo, i.grade_achieved, i.points, i.mandatory_for_grade, i.status, COALESCE(i.details_json, '{}')
      FROM jsonb_to_recordset(p->'fundamentacao'->'items') AS i(item_number int, codigo text, titulo text, source_type text, criterio_codigo text, grade_achieved text, points int, mandatory_for_grade boolean, status text, details_json jsonb);
  END IF;
  INSERT INTO public.audit_events(organization_id, avaliacao_id, entity_type, entity_id, event_type, actor_id, details_json)
  VALUES ((v->>'organization_id')::uuid, v_av, 'modelo', (v->>'modelo_id')::uuid, CASE WHEN prev.id IS NULL THEN 'VALIDATION_EXECUTED' ELSE 'MODEL_REVALIDATED' END, (v->>'created_by')::uuid,
    jsonb_build_object('validacao', v_id, 'status', v->>'overall_status', 'politica', p->>'politica', 'fundamentacao', v->>'fundamentacao_grau',
      'execucao', v->>'execucao_id', 'validacao_anterior', prev.id, 'anterior_desatualizada', prev.stale));
  RETURN v_id;
END $function$;
REVOKE ALL ON FUNCTION public.aval_engine_persist_validation(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aval_engine_persist_validation(jsonb) TO service_role;