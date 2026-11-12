CREATE OR REPLACE FUNCTION public.aval_confirm_economic(p_projecao uuid, p_centro text, p_aplicar boolean, p_valor_arbitrado numeric,
  p_justificativa text, p_caracteristicas uuid[], p_conclusao text, p_conclusao_texto text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pj record; ce record; av record; pol record; rp record; v_arb uuid; v_adot uuid; v_res uuid;
  v_inf numeric; v_sup numeric; v_bruto numeric; v_final numeric; va record; v_tipos text[]; v_dados jsonb; v_cid uuid;
  v_dir text; v_ic text; v_campo text; v_eps numeric := 0.005; v_apl boolean := COALESCE(p_aplicar, false);
BEGIN
  SELECT * INTO pj FROM public.avaliacao_projecoes WHERE id = p_projecao;
  IF pj.id IS NULL OR NOT public.aval_can_edit(pj.avaliacao_id, 'economic.confirm') OR NOT public.aval_has_perm(pj.avaliacao_id, 'economic.select_center') THEN
    RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501';
  END IF;
  IF pj.stale OR NOT EXISTS (SELECT 1 FROM public.model_acceptances WHERE id = pj.acceptance_id AND status = 'VIGENTE') THEN
    RAISE EXCEPTION 'aval:projection_stale' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO ce FROM public.avaliacao_projecao_centros WHERE projecao_id = p_projecao AND centro = p_centro;
  IF ce.id IS NULL THEN RAISE EXCEPTION 'aval:invalid_center' USING ERRCODE = '22023'; END IF;
  IF p_conclusao IS NULL OR p_conclusao NOT IN ('COMPATIVEL','FAVORAVEL_ADMINISTRACAO','ABAIXO_REFERENCIA','ACIMA_REFERENCIA','REQUER_ANALISE','OUTRA') THEN
    RAISE EXCEPTION 'aval:invalid_conclusion' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO av FROM public.avaliacoes WHERE id = pj.avaliacao_id;
  SELECT * INTO pol FROM public.arbitration_policies WHERE status = 'VIGENTE' AND (organization_id = av.organization_id OR organization_id IS NULL)
   ORDER BY (organization_id IS NULL), versao DESC LIMIT 1;
  SELECT * INTO rp FROM public.rounding_policies WHERE status = 'VIGENTE' AND (organization_id = av.organization_id OR organization_id IS NULL)
   ORDER BY (organization_id IS NULL), versao DESC LIMIT 1;
  v_inf := ce.valor * (1 - pol.percentual_inferior / 100);
  v_sup := ce.valor * (1 + pol.percentual_superior / 100);
  IF v_apl THEN
    IF NOT public.aval_has_perm(pj.avaliacao_id, 'economic.apply_arbitration') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
    IF p_valor_arbitrado IS NULL OR p_valor_arbitrado < v_inf OR p_valor_arbitrado > v_sup THEN RAISE EXCEPTION 'aval:arbitration_out_of_field' USING ERRCODE = '22023'; END IF;
    IF length(btrim(COALESCE(p_justificativa, ''))) < 20 THEN RAISE EXCEPTION 'aval:justification_required' USING ERRCODE = '22023'; END IF;
    IF COALESCE(array_length(p_caracteristicas, 1), 0) = 0 THEN RAISE EXCEPTION 'aval:characteristics_required' USING ERRCODE = '22023'; END IF;
    v_bruto := p_valor_arbitrado;
  ELSE
    v_bruto := ce.valor;
  END IF;
  v_final := round(v_bruto, COALESCE(rp.casas_decimais, 2));
  UPDATE public.avaliacao_resultado_economico SET status = 'SUPERADO' WHERE avaliacao_id = av.id AND status IN ('VIGENTE','DESATUALIZADO');
  INSERT INTO public.avaliacao_arbitrios(organization_id, avaliacao_id, projecao_id, centro, aplicar, policy_id, campo_inferior, campo_superior,
    valor_arbitrado, justificativa, created_by)
  VALUES (av.organization_id, av.id, pj.id, p_centro, v_apl, pol.id, v_inf, v_sup,
    CASE WHEN v_apl THEN p_valor_arbitrado END, CASE WHEN v_apl THEN btrim(p_justificativa) END, auth.uid())
  RETURNING id INTO v_arb;
  IF v_apl THEN
    FOREACH v_cid IN ARRAY p_caracteristicas LOOP
      IF NOT EXISTS (SELECT 1 FROM public.avaliacao_caracteristicas_relevantes WHERE id = v_cid AND avaliacao_id = av.id) THEN
        RAISE EXCEPTION 'aval:invalid_characteristic' USING ERRCODE = '22023';
      END IF;
      INSERT INTO public.avaliacao_arbitrio_caracteristicas(organization_id, avaliacao_id, arbitrio_id, caracteristica_id)
      VALUES (av.organization_id, av.id, v_arb, v_cid);
    END LOOP;
  END IF;
  INSERT INTO public.avaliacao_valores_adotados(organization_id, avaliacao_id, projecao_id, centro_id, arbitrio_id, origem,
    valor_adotado_bruto, valor_final_apresentacao, rounding_policy_id)
  VALUES (av.organization_id, av.id, pj.id, ce.id, CASE WHEN v_apl THEN v_arb END,
    CASE WHEN v_apl THEN 'ARBITRAMENTO' ELSE 'TENDENCIA_CENTRAL' END, v_bruto, v_final, rp.id)
  RETURNING id INTO v_adot;
  INSERT INTO public.avaliacao_resultado_economico(organization_id, avaliacao_id, projecao_id, valor_adotado_id, centro, conclusao, conclusao_texto, confirmado_por)
  VALUES (av.organization_id, av.id, pj.id, v_adot, p_centro, p_conclusao, NULLIF(btrim(p_conclusao_texto), ''), auth.uid())
  RETURNING id INTO v_res;
  v_tipos := CASE av.tipo WHEN 'NOVA_LOCACAO' THEN ARRAY['SOLICITADO_PROPRIETARIO'] WHEN 'RENOVACAO' THEN ARRAY['CONTRATO_ATUAL','PROPOSTO_RENOVACAO'] ELSE ARRAY['REAJUSTADO'] END;
  FOR va IN SELECT * FROM public.avaliacao_valores_administrativos WHERE avaliacao_id = av.id AND ativo AND tipo = ANY(v_tipos) LOOP
    v_dir := CASE WHEN va.valor < v_bruto - v_eps THEN 'ABAIXO_REFERENCIA' WHEN va.valor > v_bruto + v_eps THEN 'ACIMA_REFERENCIA' ELSE 'IGUAL_REFERENCIA' END;
    v_ic := CASE WHEN va.valor < ce.limite_inferior THEN 'ABAIXO_IC' WHEN va.valor > ce.limite_superior THEN 'ACIMA_IC' ELSE 'DENTRO_IC' END;
    v_campo := CASE WHEN va.valor < v_inf THEN 'ABAIXO_CAMPO' WHEN va.valor > v_sup THEN 'ACIMA_CAMPO' ELSE 'DENTRO_CAMPO' END;
    INSERT INTO public.avaliacao_compatibilidades(organization_id, avaliacao_id, resultado_id, valor_administrativo_id, tipo_valor,
      valor_referencia, valor_comparado, diferenca_absoluta, diferenca_percentual, direcao, posicao_ic, posicao_campo)
    VALUES (av.organization_id, av.id, v_res, va.id, va.tipo, v_bruto, va.valor, v_bruto - va.valor, (v_bruto - va.valor) / v_bruto * 100, v_dir, v_ic, v_campo);
  END LOOP;
  v_dados := jsonb_build_object(
    'resultado', (SELECT to_jsonb(r) FROM public.avaliacao_resultado_economico r WHERE r.id = v_res),
    'valor_adotado', (SELECT to_jsonb(a) FROM public.avaliacao_valores_adotados a WHERE a.id = v_adot),
    'arbitrio', (SELECT to_jsonb(a) FROM public.avaliacao_arbitrios a WHERE a.id = v_arb),
    'centro', to_jsonb(ce), 'projecao', to_jsonb(pj),
    'centros', (SELECT jsonb_agg(to_jsonb(c2) ORDER BY c2.centro) FROM public.avaliacao_projecao_centros c2 WHERE c2.projecao_id = pj.id),
    'compatibilidades', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM public.avaliacao_compatibilidades c WHERE c.resultado_id = v_res), '[]'),
    'politica_arbitrio', to_jsonb(pol), 'politica_arredondamento', to_jsonb(rp));
  INSERT INTO public.avaliacao_resultado_snapshots(organization_id, avaliacao_id, resultado_id, dados, hash)
  VALUES (av.organization_id, av.id, v_res, v_dados, public.aval_hash(v_dados));
  PERFORM public.aval_invalidate(av.id, 'REPORT_ONLY', 'Resultado econômico confirmado', NULL);
  IF v_apl THEN
    PERFORM public.aval_audit(av.id, 'arbitrio', v_arb, 'ARBITRATION_CONFIRMED', jsonb_build_object('valor', p_valor_arbitrado, 'centro', p_centro));
  END IF;
  PERFORM public.aval_audit(av.id, 'resultado_economico', v_res, 'ECONOMIC_RESULT_CONFIRMED',
    jsonb_build_object('centro', p_centro, 'valor_bruto', v_bruto, 'valor_final', v_final, 'conclusao', p_conclusao));
  PERFORM public.aval_bump_stage(av.id, 'LAUDO');
  RETURN v_res;
END $$;

CREATE OR REPLACE FUNCTION public.aval_tokens(p_avaliacao uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE av record; res record; ad record; ce record; pj record; arb record; ac record; mv record; rs record; cp record; im record;
  v_tipo text; v_resp text; v_modelo text; v_conc text;
BEGIN
  SELECT * INTO av FROM public.avaliacoes WHERE id = p_avaliacao;
  IF av.id IS NULL OR NOT public.aval_is_reader(av.organization_id) THEN RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
  SELECT * INTO res FROM public.avaliacao_resultado_economico WHERE avaliacao_id = av.id AND status = 'VIGENTE';
  SELECT * INTO ad FROM public.avaliacao_valores_adotados WHERE id = res.valor_adotado_id;
  SELECT * INTO ce FROM public.avaliacao_projecao_centros WHERE id = ad.centro_id;
  SELECT * INTO pj FROM public.avaliacao_projecoes WHERE id = res.projecao_id;
  SELECT * INTO arb FROM public.avaliacao_arbitrios WHERE projecao_id = res.projecao_id AND centro = res.centro ORDER BY created_at DESC LIMIT 1;
  SELECT * INTO ac FROM public.model_acceptances WHERE avaliacao_id = av.id AND status = 'VIGENTE';
  SELECT * INTO mv FROM public.model_validations WHERE id = ac.validation_id;
  SELECT * INTO rs FROM public.modelo_resultado_resumo WHERE execucao_id = ac.execucao_id;
  SELECT * INTO cp FROM public.avaliacao_compatibilidades WHERE resultado_id = res.id ORDER BY created_at LIMIT 1;
  SELECT i.* INTO im FROM public.avaliacao_imoveis ai JOIN public.imoveis i ON i.id = ai.imovel_id WHERE ai.avaliacao_id = av.id AND ai.papel = 'AVALIANDO';
  SELECT nome INTO v_modelo FROM public.avaliacao_modelos WHERE id = ac.modelo_id;
  SELECT COALESCE(NULLIF(display_name, ''), split_part(email, '@', 1)) INTO v_resp FROM public.profiles WHERE user_id = av.responsavel_tecnico_id;
  v_tipo := CASE av.tipo WHEN 'NOVA_LOCACAO' THEN 'nova locação' WHEN 'RENOVACAO' THEN 'renovação de locação' ELSE 'reajuste de locação' END;
  v_conc := CASE res.conclusao WHEN 'COMPATIVEL' THEN 'compatível com o mercado' WHEN 'FAVORAVEL_ADMINISTRACAO' THEN 'favorável à Administração'
    WHEN 'ABAIXO_REFERENCIA' THEN 'abaixo do valor de referência' WHEN 'ACIMA_REFERENCIA' THEN 'acima do valor de referência'
    WHEN 'REQUER_ANALISE' THEN 'requer análise' WHEN 'OUTRA' THEN COALESCE(res.conclusao_texto, 'outra') END;
  RETURN jsonb_build_object(
    'NUMERO_AVALIACAO', av.codigo, 'TIPO_AVALIACAO', v_tipo, 'MUNICIPIO', av.municipio_nome, 'UF', av.uf, 'TIPO_IMOVEL', av.tipo_imovel,
    'PROCESSO_ADMINISTRATIVO', av.processo_administrativo, 'NUMERO_CONTRATO', av.numero_contrato, 'RESPONSAVEL_TECNICO', v_resp,
    'ENDERECO_AVALIANDO', NULLIF(concat_ws(', ', im.endereco, im.numero, im.complemento, im.bairro), ''),
    'AREA_AVALIANDO', CASE WHEN im.area_construida IS NOT NULL THEN public.aval_fmt_num(im.area_construida, 2) || ' m²' END,
    'N_AMOSTRAS', rs.n::text, 'MODELO_ACEITO', v_modelo, 'R2', public.aval_fmt_num(rs.r2, 4), 'R2_AJUSTADO', public.aval_fmt_num(rs.r2_ajustado, 4),
    'NIVEL_CONFIANCA', CASE WHEN pj.nivel_confianca IS NOT NULL THEN public.aval_fmt_num(pj.nivel_confianca * 100, 0) || '%' END,
    'CENTRO_ADOTADO', CASE res.centro WHEN 'MODE' THEN 'moda' WHEN 'MEDIAN' THEN 'mediana' WHEN 'MEAN' THEN 'média' WHEN 'DIRECT' THEN 'estimativa central' END,
    'VALOR_MERCADO', public.aval_fmt_money(ce.valor), 'LIMITE_INFERIOR', public.aval_fmt_money(ce.limite_inferior), 'LIMITE_SUPERIOR', public.aval_fmt_money(ce.limite_superior),
    'AMPLITUDE_IC', CASE WHEN ce.amplitude_pct IS NOT NULL THEN public.aval_fmt_num(ce.amplitude_pct, 2) || '%' END,
    'CAMPO_INFERIOR', public.aval_fmt_money(arb.campo_inferior), 'CAMPO_SUPERIOR', public.aval_fmt_money(arb.campo_superior),
    'VALOR_FINAL', public.aval_fmt_money(ad.valor_final_apresentacao),
    'ORIGEM_VALOR', CASE ad.origem WHEN 'ARBITRAMENTO' THEN 'arbitrado dentro do campo de arbítrio' WHEN 'TENDENCIA_CENTRAL' THEN 'tendência central' END,
    'GRAU_FUNDAMENTACAO', COALESCE(mv.fundamentacao_grau, CASE WHEN mv.id IS NOT NULL THEN 'não enquadrado' END),
    'GRAU_PRECISAO', COALESCE(ce.grau_precisao, CASE WHEN ce.id IS NOT NULL THEN 'não enquadrado' END),
    'VALOR_ADMINISTRATIVO_REFERENCIA', public.aval_fmt_money(cp.valor_comparado),
    'DIFERENCA_PERCENTUAL', CASE WHEN cp.id IS NOT NULL THEN public.aval_fmt_num(cp.diferenca_percentual, 2) || '%' END,
    'CONCLUSAO', v_conc, 'DATA_EMISSAO', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY'), 'ENGINE_VERSION', pj.engine_version);
END $$;

CREATE OR REPLACE FUNCTION public.aval_laudo_init(p_avaliacao uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE av record; v_laudo uuid; v_tv uuid; v_lv uuid; v_avv uuid;
BEGIN
  SELECT * INTO av FROM public.avaliacoes WHERE id = p_avaliacao;
  IF av.id IS NULL OR NOT public.aval_can_edit(p_avaliacao, 'report.edit') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  SELECT id INTO v_laudo FROM public.laudos WHERE avaliacao_id = p_avaliacao;
  IF v_laudo IS NOT NULL THEN RETURN v_laudo; END IF;
  SELECT tv.id INTO v_tv FROM public.laudo_template_versions tv JOIN public.laudo_templates t ON t.id = tv.template_id
   WHERE t.ativo AND tv.status = 'VIGENTE' AND (t.organization_id = av.organization_id OR t.organization_id IS NULL)
   ORDER BY (t.organization_id IS NULL), tv.versao DESC LIMIT 1;
  SELECT id INTO v_avv FROM public.avaliacao_versoes WHERE avaliacao_id = p_avaliacao AND revisao = av.versao_atual;
  INSERT INTO public.laudos(organization_id, avaliacao_id, template_version_id) VALUES (av.organization_id, av.id, v_tv) RETURNING id INTO v_laudo;
  INSERT INTO public.laudo_versoes(organization_id, avaliacao_id, laudo_id, avaliacao_versao_id, revisao, created_by)
  VALUES (av.organization_id, av.id, v_laudo, v_avv, av.versao_atual, auth.uid()) RETURNING id INTO v_lv;
  INSERT INTO public.laudo_secoes(organization_id, avaliacao_id, laudo_versao_id, codigo, titulo, ordem, numerada, obrigatoria, blocos_sistema, conteudo)
  SELECT av.organization_id, av.id, v_lv, s.codigo, s.titulo, s.ordem, s.numerada, s.obrigatoria, s.blocos_sistema, s.conteudo_padrao
    FROM public.laudo_template_sections s WHERE s.template_version_id = v_tv;
  INSERT INTO public.laudo_anexos(organization_id, avaliacao_id, laudo_versao_id, numero, titulo, tipo, opcional, incluido) VALUES
    (av.organization_id, av.id, v_lv, 'I', 'Documentos do imóvel', 'DOCUMENTOS_IMOVEL', false, true),
    (av.organization_id, av.id, v_lv, 'II', 'Pesquisa de mercado', 'PESQUISA_MERCADO', false, true),
    (av.organization_id, av.id, v_lv, 'III', 'Relatório estatístico SiDIF', 'RELATORIO_ESTATISTICO', false, true),
    (av.organization_id, av.id, v_lv, 'IV', 'Relatório de escassez de mercado', 'RELATORIO_ESCASSEZ', true, false);
  PERFORM public.aval_audit(av.id, 'laudo', v_laudo, 'REPORT_CREATED', jsonb_build_object('revisao', av.versao_atual));
  RETURN v_laudo;
END $$;
CREATE OR REPLACE FUNCTION public.aval_laudo_section_approve(p_secao uuid, p_aprovar boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record;
BEGIN
  SELECT * INTO s FROM public.laudo_secoes WHERE id = p_secao;
  IF s.id IS NULL OR NOT public.aval_can_edit(s.avaliacao_id, 'report.approve') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  IF p_aprovar AND s.stale THEN RAISE EXCEPTION 'aval:section_stale' USING ERRCODE = '22023'; END IF;
  UPDATE public.laudo_secoes SET status = CASE WHEN p_aprovar THEN 'APROVADA' ELSE 'RASCUNHO' END,
    aprovada_por = CASE WHEN p_aprovar THEN auth.uid() END, aprovada_em = CASE WHEN p_aprovar THEN now() END WHERE id = p_secao;
  PERFORM public.aval_audit(s.avaliacao_id, 'laudo_secao', s.id, CASE WHEN p_aprovar THEN 'REPORT_SECTION_APPROVED' ELSE 'REPORT_SECTION_REOPENED' END,
    jsonb_build_object('secao', s.codigo));
END $$;
CREATE OR REPLACE FUNCTION public.aval_laudo_section_refresh(p_secao uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record;
BEGIN
  SELECT * INTO s FROM public.laudo_secoes WHERE id = p_secao;
  IF s.id IS NULL OR NOT public.aval_can_edit(s.avaliacao_id, 'report.edit') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  UPDATE public.laudo_secoes SET stale = false, status = 'RASCUNHO', aprovada_por = NULL, aprovada_em = NULL WHERE id = p_secao;
  PERFORM public.aval_audit(s.avaliacao_id, 'laudo_secao', s.id, 'REPORT_SECTION_REVIEWED_AFTER_CHANGE', jsonb_build_object('secao', s.codigo));
END $$;
CREATE OR REPLACE FUNCTION public.aval_laudo_preflight(p_laudo_versao uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lv record; av record; v_run uuid; v_req text[]; v_missing text[]; checks jsonb := '[]'::jsonb; c jsonb;
BEGIN
  SELECT * INTO lv FROM public.laudo_versoes WHERE id = p_laudo_versao;
  IF lv.id IS NULL OR NOT public.aval_has_perm(lv.avaliacao_id, 'report.render_draft') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  SELECT * INTO av FROM public.avaliacoes WHERE id = lv.avaliacao_id;
  checks := checks || jsonb_build_object('codigo','VERSAO','ok', lv.status IN ('RASCUNHO','EM_REVISAO'), 'msg', 'A versão do laudo deve estar em rascunho.');
  checks := checks || jsonb_build_object('codigo','STATUS','ok', av.status = 'ATIVA', 'msg', 'A avaliação deve estar ativa.');
  checks := checks || jsonb_build_object('codigo','PROCESSO','ok', COALESCE(btrim(av.processo_administrativo), '') <> '', 'msg', 'Processo administrativo é obrigatório para emissão.');
  checks := checks || jsonb_build_object('codigo','RESPONSAVEL','ok', EXISTS (SELECT 1 FROM public.avaliacao_membros WHERE avaliacao_id = av.id AND papel = 'RESPONSAVEL_TECNICO' AND ativo), 'msg', 'Responsável técnico ativo é obrigatório.');
  v_req := CASE av.tipo WHEN 'NOVA_LOCACAO' THEN ARRAY['SOLICITADO_PROPRIETARIO'] WHEN 'RENOVACAO' THEN ARRAY['CONTRATO_ATUAL'] ELSE ARRAY['CONTRATO_ATUAL','REAJUSTADO'] END;
  SELECT array_agg(t) INTO v_missing FROM unnest(v_req) t
   WHERE NOT EXISTS (SELECT 1 FROM public.avaliacao_valores_administrativos va WHERE va.avaliacao_id = av.id AND va.ativo AND va.tipo = t);
  checks := checks || jsonb_build_object('codigo','VALORES_ADMINISTRATIVOS','ok', v_missing IS NULL, 'msg', 'Valores administrativos obrigatórios ausentes: ' || COALESCE(array_to_string(v_missing, ', '), '—'));
  checks := checks || jsonb_build_object('codigo','MODELO_ACEITO','ok', EXISTS (SELECT 1 FROM public.model_acceptances WHERE avaliacao_id = av.id AND status = 'VIGENTE'), 'msg', 'É necessário um modelo aceito vigente.');
  checks := checks || jsonb_build_object('codigo','RESULTADO','ok', EXISTS (SELECT 1 FROM public.avaliacao_resultado_economico WHERE avaliacao_id = av.id AND status = 'VIGENTE' AND NOT stale), 'msg', 'É necessário um resultado econômico confirmado e atualizado.');
  checks := checks || jsonb_build_object('codigo','SECOES_APROVADAS','ok', NOT EXISTS (SELECT 1 FROM public.laudo_secoes WHERE laudo_versao_id = lv.id AND obrigatoria AND (status <> 'APROVADA' OR stale)), 'msg', 'Todas as seções obrigatórias devem estar aprovadas e atualizadas.');
  checks := checks || jsonb_build_object('codigo','TOKENS','ok', NOT EXISTS (
      SELECT 1 FROM public.laudo_secoes s CROSS JOIN LATERAL regexp_matches(s.conteudo, '\{\{([A-Z0-9_]+)\}\}', 'g') m
       WHERE s.laudo_versao_id = lv.id AND NOT EXISTS (SELECT 1 FROM public.document_tokens t WHERE t.codigo = m[1])), 'msg', 'Há marcadores de dados desconhecidos no texto.');
  checks := checks || jsonb_build_object('codigo','VALORES_DIGITADOS','ok', NOT EXISTS (
      SELECT 1 FROM public.laudo_secoes s WHERE s.laudo_versao_id = lv.id AND s.conteudo ~ 'R\$\s*[0-9]'), 'msg', 'Há valores monetários digitados no texto; use os marcadores protegidos (ex.: {{VALOR_FINAL}}).');
  INSERT INTO public.laudo_preflight_runs(organization_id, avaliacao_id, laudo_versao_id, resultado, executado_por)
  VALUES (av.organization_id, av.id, lv.id, CASE WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(checks) x WHERE NOT (x->>'ok')::boolean) THEN 'FAIL' ELSE 'PASS' END, auth.uid())
  RETURNING id INTO v_run;
  FOR c IN SELECT * FROM jsonb_array_elements(checks) LOOP
    INSERT INTO public.laudo_preflight_results(organization_id, avaliacao_id, run_id, codigo, status, mensagem)
    VALUES (av.organization_id, av.id, v_run, c->>'codigo', CASE WHEN (c->>'ok')::boolean THEN 'OK' ELSE 'FALHA' END,
            CASE WHEN (c->>'ok')::boolean THEN 'OK' ELSE c->>'msg' END);
  END LOOP;
  RETURN v_run;
END $$;
CREATE OR REPLACE FUNCTION public.aval_laudo_issue(p_laudo_versao uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lv record; av record; pr record; v_tokens jsonb; v_secoes jsonb := '[]'::jsonb; s record; t record; v_txt text;
  v_snap jsonb; v_hash text; v_em uuid; v_codigo text; ac record; res record;
BEGIN
  SELECT * INTO lv FROM public.laudo_versoes WHERE id = p_laudo_versao;
  IF lv.id IS NULL OR NOT public.aval_can_edit(lv.avaliacao_id, 'report.issue') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  IF lv.status NOT IN ('RASCUNHO','EM_REVISAO') THEN RAISE EXCEPTION 'aval:report_issued_immutable' USING ERRCODE = '42501'; END IF;
  SELECT * INTO av FROM public.avaliacoes WHERE id = lv.avaliacao_id;
  SELECT * INTO pr FROM public.laudo_preflight_runs WHERE laudo_versao_id = lv.id ORDER BY created_at DESC LIMIT 1;
  IF pr.id IS NULL OR pr.resultado <> 'PASS' THEN RAISE EXCEPTION 'aval:preflight_required' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM public.laudo_secoes WHERE laudo_versao_id = lv.id AND (updated_at > pr.created_at OR aprovada_em > pr.created_at))
     OR EXISTS (SELECT 1 FROM public.avaliacao_resultado_economico WHERE avaliacao_id = av.id AND confirmado_em > pr.created_at)
     OR EXISTS (SELECT 1 FROM public.audit_events WHERE avaliacao_id = av.id AND event_type = 'INVALIDATION_APPLIED' AND created_at > pr.created_at) THEN
    RAISE EXCEPTION 'aval:preflight_outdated' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO ac FROM public.model_acceptances WHERE avaliacao_id = av.id AND status = 'VIGENTE';
  SELECT * INTO res FROM public.avaliacao_resultado_economico WHERE avaliacao_id = av.id AND status = 'VIGENTE';
  v_codigo := av.codigo || CASE WHEN lv.revisao > 0 THEN ' — Revisão ' || lpad(lv.revisao::text, 2, '0') ELSE '' END;
  v_tokens := public.aval_tokens(av.id) || jsonb_build_object('NUMERO_AVALIACAO', v_codigo);
  FOR s IN SELECT * FROM public.laudo_secoes WHERE laudo_versao_id = lv.id ORDER BY ordem LOOP
    v_txt := s.conteudo;
    FOR t IN SELECT key, value FROM jsonb_each_text(v_tokens) LOOP
      v_txt := replace(v_txt, '{{' || t.key || '}}', COALESCE(t.value, '—'));
    END LOOP;
    v_secoes := v_secoes || jsonb_build_object('codigo', s.codigo, 'titulo', s.titulo, 'ordem', s.ordem, 'numerada', s.numerada,
      'blocos_sistema', to_jsonb(s.blocos_sistema), 'texto', v_txt, 'aprovada_por', s.aprovada_por, 'aprovada_em', s.aprovada_em);
  END LOOP;
  v_snap := jsonb_build_object(
    'codigo', v_codigo, 'revisao', lv.revisao, 'emitido_em', now(), 'emitido_por', auth.uid(),
    'avaliacao', to_jsonb(av), 'tokens', v_tokens, 'secoes', v_secoes,
    'anexos', COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.numero) FROM public.laudo_anexos a WHERE a.laudo_versao_id = lv.id AND a.incluido), '[]'),
    'valores_administrativos', COALESCE((SELECT jsonb_agg(to_jsonb(v)) FROM public.avaliacao_valores_administrativos v WHERE v.avaliacao_id = av.id AND v.ativo), '[]'),
    'resultado_snapshot', (SELECT dados FROM public.avaliacao_resultado_snapshots WHERE resultado_id = res.id ORDER BY created_at DESC LIMIT 1),
    'validacao_snapshot', (SELECT dados FROM public.validation_snapshots WHERE acceptance_id = ac.id ORDER BY created_at DESC LIMIT 1),
    'execucao', (SELECT jsonb_build_object('id', e.id, 'engine_name', e.engine_name, 'engine_version', e.engine_version, 'input_hash', e.input_hash,
                   'output_hash', e.output_hash, 'output', e.output_json, 'input', e.input_snapshot_json)
                   FROM public.avaliacao_modelo_execucoes e WHERE e.id = ac.execucao_id),
    'modelo', (SELECT to_jsonb(m) FROM public.avaliacao_modelos m WHERE m.id = ac.modelo_id),
    'modelo_variaveis', (SELECT jsonb_agg(jsonb_build_object('codigo', v.codigo, 'nome', v.nome, 'unidade', v.unidade, 'transformacao', mv.transformacao) ORDER BY mv.ordem)
                   FROM public.avaliacao_modelo_variaveis mv JOIN public.avaliacao_variaveis v ON v.id = mv.variavel_id WHERE mv.modelo_id = ac.modelo_id),
    'amostras', (SELECT jsonb_agg(jsonb_build_object('amostra_id', sn.amostra_id, 'hash', sn.hash, 'dados', sn.dados))
                   FROM public.avaliacao_amostra_snapshots sn JOIN public.avaliacao_modelos m ON m.conjunto_id = sn.conjunto_id WHERE m.id = ac.modelo_id),
    'preflight_run', pr.id);
  v_hash := public.aval_hash(v_snap);
  INSERT INTO public.laudo_emissoes(organization_id, avaliacao_id, laudo_versao_id, revisao, codigo, preflight_run_id, hash, emitido_por)
  VALUES (av.organization_id, av.id, lv.id, lv.revisao, v_codigo, pr.id, v_hash, auth.uid()) RETURNING id INTO v_em;
  INSERT INTO public.laudo_emissao_snapshots(organization_id, avaliacao_id, emissao_id, dados, hash) VALUES (av.organization_id, av.id, v_em, v_snap, v_hash);
  UPDATE public.laudo_versoes SET status = 'SUPERADO' WHERE laudo_id = lv.laudo_id AND id <> lv.id AND status = 'EMITIDO';
  UPDATE public.avaliacao_versoes SET status = 'SUPERADA' WHERE avaliacao_id = av.id AND id <> lv.avaliacao_versao_id AND status = 'EMITIDA';
  UPDATE public.laudo_versoes SET status = 'EMITIDO' WHERE id = lv.id;
  UPDATE public.avaliacao_versoes SET status = 'EMITIDA', emitida_em = now() WHERE id = lv.avaliacao_versao_id;
  UPDATE public.avaliacoes SET status = 'CONCLUIDA', stage = 'EMISSAO' WHERE id = av.id;
  PERFORM public.aval_audit(av.id, 'laudo_emissao', v_em, 'REPORT_ISSUED', jsonb_build_object('codigo', v_codigo, 'hash', v_hash));
  RETURN v_em;
END $$;
CREATE OR REPLACE FUNCTION public.aval_laudo_create_revision(p_laudo uuid, p_motivo text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l record; av record; lv record; v_rev int; v_avv uuid; v_lv uuid;
BEGIN
  SELECT * INTO l FROM public.laudos WHERE id = p_laudo;
  IF l.id IS NULL OR NOT public.aval_has_perm(l.avaliacao_id, 'report.create_revision') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  IF length(btrim(COALESCE(p_motivo, ''))) < 10 THEN RAISE EXCEPTION 'aval:justification_required' USING ERRCODE = '22023'; END IF;
  SELECT * INTO av FROM public.avaliacoes WHERE id = l.avaliacao_id;
  IF av.status = 'CANCELADA' THEN RAISE EXCEPTION 'aval:evaluation_cancelled' USING ERRCODE = '22023'; END IF;
  SELECT * INTO lv FROM public.laudo_versoes WHERE laudo_id = l.id ORDER BY revisao DESC LIMIT 1;
  IF lv.status <> 'EMITIDO' THEN RAISE EXCEPTION 'aval:revision_requires_issued' USING ERRCODE = '22023'; END IF;
  v_rev := lv.revisao + 1;
  INSERT INTO public.avaliacao_versoes(organization_id, avaliacao_id, revisao, status, motivo, created_by)
  VALUES (av.organization_id, av.id, v_rev, 'RASCUNHO', btrim(p_motivo), auth.uid()) RETURNING id INTO v_avv;
  INSERT INTO public.laudo_versoes(organization_id, avaliacao_id, laudo_id, avaliacao_versao_id, revisao, motivo_revisao, created_by)
  VALUES (av.organization_id, av.id, l.id, v_avv, v_rev, btrim(p_motivo), auth.uid()) RETURNING id INTO v_lv;
  INSERT INTO public.laudo_secoes(organization_id, avaliacao_id, laudo_versao_id, codigo, titulo, ordem, numerada, obrigatoria, blocos_sistema, conteudo)
  SELECT av.organization_id, av.id, v_lv, codigo, titulo, ordem, numerada, obrigatoria, blocos_sistema, conteudo FROM public.laudo_secoes WHERE laudo_versao_id = lv.id;
  INSERT INTO public.laudo_anexos(organization_id, avaliacao_id, laudo_versao_id, numero, titulo, tipo, opcional, incluido)
  SELECT av.organization_id, av.id, v_lv, numero, titulo, tipo, opcional, incluido FROM public.laudo_anexos WHERE laudo_versao_id = lv.id;
  UPDATE public.avaliacoes SET status = 'ATIVA', stage = 'LAUDO', versao_atual = v_rev WHERE id = av.id;
  PERFORM public.aval_audit(av.id, 'laudo', l.id, 'REPORT_REVISION_CREATED', jsonb_build_object('revisao', v_rev, 'motivo', btrim(p_motivo)));
  RETURN v_lv;
END $$;
CREATE OR REPLACE FUNCTION public.aval_ai_decide(p_conteudo uuid, p_aprovar boolean, p_texto text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record;
BEGIN
  SELECT * INTO c FROM public.avaliacao_ai_conteudos WHERE id = p_conteudo;
  IF c.id IS NULL OR NOT public.aval_can_edit(c.avaliacao_id, 'report.edit') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  IF c.status <> 'PROPOSTO' THEN RAISE EXCEPTION 'aval:ai_already_decided' USING ERRCODE = '22023'; END IF;
  UPDATE public.avaliacao_ai_conteudos SET status = CASE WHEN p_aprovar THEN 'APROVADO' ELSE 'DESCARTADO' END,
    approved_text = CASE WHEN p_aprovar THEN COALESCE(NULLIF(btrim(p_texto), ''), generated_text) END, approved_by = auth.uid(), approved_at = now()
   WHERE id = p_conteudo;
  PERFORM public.aval_audit(c.avaliacao_id, 'ai_conteudo', c.id, CASE WHEN p_aprovar THEN 'AI_TEXT_APPROVED' ELSE 'AI_TEXT_DISCARDED' END,
    jsonb_build_object('contexto', c.context_type));
END $$;

CREATE OR REPLACE FUNCTION public.aval_evaluate_change_impact(p_avaliacao uuid, p_entity_type text, p_campo text, p_entity_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nivel text; v_desc text; v_use boolean := true; v_var uuid; r jsonb := '[]'::jsonb; n int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.avaliacoes WHERE id = p_avaliacao AND public.aval_is_reader(organization_id)) THEN
    RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501';
  END IF;
  SELECT nivel, descricao INTO v_nivel, v_desc FROM public.aval_impact_rules WHERE entity_type = p_entity_type AND campo = p_campo;
  IF v_nivel IS NULL THEN RETURN jsonb_build_object('nivel', 'NO_IMPACT', 'descricao', 'Sem impacto técnico registrado.', 'afetados', '[]'::jsonb); END IF;
  IF p_entity_type IN ('variavel_valor_avaliando','variavel_valor_amostra') AND p_entity_id IS NOT NULL THEN
    SELECT variavel_id INTO v_var FROM public.avaliacao_variavel_valores WHERE id = p_entity_id;
    v_use := v_var IS NULL OR public.aval_variable_in_use(v_var);
  ELSIF p_entity_type = 'variavel' AND p_entity_id IS NOT NULL THEN
    v_use := public.aval_variable_in_use(p_entity_id);
  END IF;
  IF NOT v_use THEN RETURN jsonb_build_object('nivel', 'NO_IMPACT', 'descricao', 'A variável ainda não é usada em modelos calculados.', 'afetados', '[]'::jsonb); END IF;
  IF v_nivel IN ('DATASET','MODEL') THEN
    SELECT count(*) INTO n FROM public.avaliacao_modelos WHERE avaliacao_id = p_avaliacao AND NOT stale AND status <> 'RASCUNHO';
    IF n > 0 THEN r := r || jsonb_build_object('entidade', 'Modelos calculados', 'quantidade', n); END IF;
  END IF;
  IF v_nivel IN ('DATASET','MODEL','VALIDATION') THEN
    SELECT count(*) INTO n FROM public.model_validations WHERE avaliacao_id = p_avaliacao AND NOT stale;
    IF n > 0 THEN r := r || jsonb_build_object('entidade', 'Validações', 'quantidade', n); END IF;
    SELECT count(*) INTO n FROM public.model_acceptances WHERE avaliacao_id = p_avaliacao AND status = 'VIGENTE';
    IF n > 0 THEN r := r || jsonb_build_object('entidade', 'Aceite do modelo', 'quantidade', n); END IF;
    SELECT count(*) INTO n FROM public.avaliacao_projecoes WHERE avaliacao_id = p_avaliacao AND NOT stale;
    IF n > 0 THEN r := r || jsonb_build_object('entidade', 'Projeções oficiais', 'quantidade', n); END IF;
  END IF;
  IF v_nivel IN ('DATASET','MODEL','VALIDATION','PROJECTION','ECONOMIC_RESULT') THEN
    SELECT count(*) INTO n FROM public.avaliacao_resultado_economico WHERE avaliacao_id = p_avaliacao AND status = 'VIGENTE';
    IF n > 0 THEN r := r || jsonb_build_object('entidade', 'Resultado econômico', 'quantidade', n); END IF;
  END IF;
  SELECT count(*) INTO n FROM public.laudo_secoes s JOIN public.laudo_versoes v ON v.id = s.laudo_versao_id
   WHERE v.avaliacao_id = p_avaliacao AND v.status IN ('RASCUNHO','EM_REVISAO') AND NOT s.stale;
  IF n > 0 THEN r := r || jsonb_build_object('entidade', 'Seções do laudo (rascunho)', 'quantidade', n); END IF;
  RETURN jsonb_build_object('nivel', v_nivel, 'descricao', v_desc, 'afetados', r);
END $$;

CREATE OR REPLACE FUNCTION public.aval_apply_change(p_avaliacao uuid, p_entity_type text, p_entity_id uuid, p_campo text, p_valor jsonb, p_motivo text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_impact jsonb; v_old jsonb; v_txt text := p_valor #>> '{}'; v_ok int := 0;
BEGIN
  v_impact := public.aval_evaluate_change_impact(p_avaliacao, p_entity_type, p_campo, p_entity_id);
  IF p_entity_type = 'valor_administrativo' THEN
    IF NOT public.aval_can_edit(p_avaliacao, 'evaluation.edit') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
    SELECT to_jsonb(v) INTO v_old FROM public.avaliacao_valores_administrativos v WHERE id = p_entity_id AND avaliacao_id = p_avaliacao;
    IF p_campo = 'valor' THEN UPDATE public.avaliacao_valores_administrativos SET valor = v_txt::numeric WHERE id = p_entity_id AND avaliacao_id = p_avaliacao;
    ELSIF p_campo = 'data_referencia' THEN UPDATE public.avaliacao_valores_administrativos SET data_referencia = NULLIF(v_txt, '')::date WHERE id = p_entity_id AND avaliacao_id = p_avaliacao;
    ELSIF p_campo = 'observacao' THEN UPDATE public.avaliacao_valores_administrativos SET observacao = v_txt WHERE id = p_entity_id AND avaliacao_id = p_avaliacao;
    ELSE RAISE EXCEPTION 'aval:field_not_allowed' USING ERRCODE = '22023'; END IF;
    GET DIAGNOSTICS v_ok = ROW_COUNT;
  ELSIF p_entity_type IN ('variavel_valor_avaliando','variavel_valor_amostra') THEN
    IF NOT public.aval_can_edit(p_avaliacao, 'model.create') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
    IF p_campo <> 'valor' THEN RAISE EXCEPTION 'aval:field_not_allowed' USING ERRCODE = '22023'; END IF;
    SELECT to_jsonb(v) INTO v_old FROM public.avaliacao_variavel_valores v WHERE id = p_entity_id AND avaliacao_id = p_avaliacao;
    UPDATE public.avaliacao_variavel_valores SET valor = NULLIF(v_txt, '')::numeric WHERE id = p_entity_id AND avaliacao_id = p_avaliacao
       AND scope_type = CASE WHEN p_entity_type = 'variavel_valor_avaliando' THEN 'AVALIANDO' ELSE 'AMOSTRA' END;
    GET DIAGNOSTICS v_ok = ROW_COUNT;
  ELSIF p_entity_type = 'variavel' THEN
    IF NOT public.aval_can_edit(p_avaliacao, 'model.create') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
    SELECT to_jsonb(v) INTO v_old FROM public.avaliacao_variaveis v WHERE id = p_entity_id AND avaliacao_id = p_avaliacao;
    IF p_campo = 'relacao_esperada' THEN UPDATE public.avaliacao_variaveis SET relacao_esperada = v_txt WHERE id = p_entity_id AND avaliacao_id = p_avaliacao;
    ELSIF p_campo = 'tipo_variavel' THEN UPDATE public.avaliacao_variaveis SET tipo_variavel = v_txt WHERE id = p_entity_id AND avaliacao_id = p_avaliacao;
    ELSE RAISE EXCEPTION 'aval:field_not_allowed' USING ERRCODE = '22023'; END IF;
    GET DIAGNOSTICS v_ok = ROW_COUNT;
  ELSIF p_entity_type = 'avaliacao' THEN
    IF NOT public.aval_can_edit(p_avaliacao, 'evaluation.edit') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
    IF p_entity_id IS DISTINCT FROM p_avaliacao THEN RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
    SELECT jsonb_build_object('processo_administrativo', processo_administrativo, 'numero_contrato', numero_contrato, 'observacao', observacao)
      INTO v_old FROM public.avaliacoes WHERE id = p_avaliacao;
    IF p_campo = 'processo_administrativo' THEN UPDATE public.avaliacoes SET processo_administrativo = NULLIF(btrim(v_txt), '') WHERE id = p_avaliacao;
    ELSIF p_campo = 'numero_contrato' THEN UPDATE public.avaliacoes SET numero_contrato = NULLIF(btrim(v_txt), '') WHERE id = p_avaliacao;
    ELSIF p_campo = 'observacao' THEN UPDATE public.avaliacoes SET observacao = v_txt WHERE id = p_avaliacao;
    ELSE RAISE EXCEPTION 'aval:field_not_allowed' USING ERRCODE = '22023'; END IF;
    GET DIAGNOSTICS v_ok = ROW_COUNT;
  ELSE
    RAISE EXCEPTION 'aval:entity_not_allowed' USING ERRCODE = '22023';
  END IF;
  IF v_ok = 0 THEN RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
  PERFORM public.aval_audit(p_avaliacao, p_entity_type, p_entity_id, 'CHANGE_APPLIED',
    jsonb_build_object('campo', p_campo, 'anterior', v_old -> p_campo, 'novo', p_valor, 'nivel', v_impact->>'nivel', 'motivo', p_motivo));
  RETURN v_impact;
END $$;

CREATE OR REPLACE FUNCTION public.aval_pendencias(p_avaliacao uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE av record; v_out jsonb := '[]'::jsonb; p text[]; e text;
  v_req text[]; n_sel int; c_vig record; n_mod int; n_calc int; n_stale int; ac record; res record; lv record; n_sec int; n_apr int; n_sstale int;
  v_has_imovel boolean; v_vist boolean;
BEGIN
  SELECT * INTO av FROM public.avaliacoes WHERE id = p_avaliacao;
  IF av.id IS NULL THEN RETURN NULL; END IF;
  v_req := CASE av.tipo WHEN 'NOVA_LOCACAO' THEN ARRAY['SOLICITADO_PROPRIETARIO'] WHEN 'RENOVACAO' THEN ARRAY['CONTRATO_ATUAL'] ELSE ARRAY['CONTRATO_ATUAL','REAJUSTADO'] END;
  SELECT array_agg('Informar valor ' || t) INTO p FROM unnest(v_req) t
   WHERE NOT EXISTS (SELECT 1 FROM public.avaliacao_valores_administrativos va WHERE va.avaliacao_id = av.id AND va.ativo AND va.tipo = t);
  p := COALESCE(p, '{}');
  IF COALESCE(av.processo_administrativo, '') = '' THEN p := p || 'Processo administrativo (obrigatório para emissão)'::text; END IF;
  e := CASE WHEN cardinality(p) = 0 THEN 'PRONTA' WHEN cardinality(p) = 1 AND COALESCE(av.processo_administrativo, '') = '' THEN 'EM_ANDAMENTO' ELSE 'PENDENTE' END;
  v_out := v_out || jsonb_build_object('bloco', 'DADOS', 'estado', e, 'pendencias', to_jsonb(p), 'proxima_acao', CASE WHEN e = 'PRONTA' THEN NULL ELSE 'Completar dados administrativos' END);

  v_has_imovel := EXISTS (SELECT 1 FROM public.avaliacao_imoveis WHERE avaliacao_id = av.id AND papel = 'AVALIANDO');
  v_vist := EXISTS (SELECT 1 FROM public.imovel_vistorias WHERE avaliacao_id = av.id);
  p := '{}';
  IF NOT v_has_imovel THEN p := p || 'Vincular o imóvel avaliando'::text; END IF;
  IF NOT v_vist THEN p := p || 'Registrar a vistoria'::text; END IF;
  e := CASE WHEN NOT v_has_imovel THEN 'PENDENTE' WHEN NOT v_vist THEN 'EM_ANDAMENTO' ELSE 'PRONTA' END;
  v_out := v_out || jsonb_build_object('bloco', 'IMOVEL', 'estado', e, 'pendencias', to_jsonb(p), 'proxima_acao', CASE e WHEN 'PENDENTE' THEN 'Cadastrar o imóvel avaliando' WHEN 'EM_ANDAMENTO' THEN 'Registrar a vistoria' END);

  SELECT count(*) INTO n_sel FROM public.avaliacao_amostras WHERE avaliacao_id = av.id AND selecionada;
  SELECT * INTO c_vig FROM public.avaliacao_conjuntos_dados WHERE avaliacao_id = av.id AND status = 'CONGELADO' ORDER BY versao DESC LIMIT 1;
  p := '{}';
  IF n_sel = 0 THEN p := p || 'Selecionar amostras de mercado'::text; END IF;
  IF c_vig.id IS NULL THEN p := p || 'Congelar o conjunto de dados'::text;
  ELSIF EXISTS (SELECT 1 FROM public.avaliacao_amostras a WHERE a.avaliacao_id = av.id AND a.selecionada
                 AND NOT EXISTS (SELECT 1 FROM public.avaliacao_conjunto_amostras ca WHERE ca.conjunto_id = c_vig.id AND ca.amostra_id = a.id))
     OR EXISTS (SELECT 1 FROM public.avaliacao_conjunto_amostras ca JOIN public.avaliacao_amostras a ON a.id = ca.amostra_id
                 WHERE ca.conjunto_id = c_vig.id AND NOT a.selecionada) THEN
    p := p || 'Seleção de amostras difere do conjunto congelado'::text;
  END IF;
  e := CASE WHEN n_sel = 0 THEN 'PENDENTE' WHEN c_vig.id IS NULL THEN 'EM_ANDAMENTO' WHEN cardinality(p) > 0 THEN 'DESATUALIZADA' ELSE 'PRONTA' END;
  v_out := v_out || jsonb_build_object('bloco', 'MERCADO', 'estado', e, 'pendencias', to_jsonb(p), 'amostras', n_sel, 'conjunto_versao', c_vig.versao,
    'proxima_acao', CASE e WHEN 'PENDENTE' THEN 'Pesquisar e selecionar amostras' WHEN 'EM_ANDAMENTO' THEN 'Preparar e congelar o conjunto' WHEN 'DESATUALIZADA' THEN 'Criar nova versão do conjunto' END);

  SELECT count(*), count(*) FILTER (WHERE status NOT IN ('RASCUNHO','ERRO') AND NOT stale), count(*) FILTER (WHERE stale)
    INTO n_mod, n_calc, n_stale FROM public.avaliacao_modelos WHERE avaliacao_id = av.id;
  e := CASE WHEN c_vig.id IS NULL THEN 'BLOQUEADA' WHEN n_mod = 0 THEN 'PENDENTE' WHEN n_calc > 0 THEN 'PRONTA' WHEN n_stale > 0 THEN 'DESATUALIZADA' ELSE 'EM_ANDAMENTO' END;
  v_out := v_out || jsonb_build_object('bloco', 'MODELAGEM', 'estado', e, 'modelos', n_mod,
    'pendencias', to_jsonb(CASE e WHEN 'BLOQUEADA' THEN ARRAY['Aguardando conjunto de dados congelado'] WHEN 'PENDENTE' THEN ARRAY['Criar e calcular um modelo']
      WHEN 'DESATUALIZADA' THEN ARRAY['Modelos desatualizados — recalcular'] WHEN 'EM_ANDAMENTO' THEN ARRAY['Calcular o modelo'] ELSE '{}'::text[] END),
    'proxima_acao', CASE e WHEN 'PENDENTE' THEN 'Preparar modelagem' WHEN 'DESATUALIZADA' THEN 'Recalcular modelos' WHEN 'EM_ANDAMENTO' THEN 'Executar o modelo' END);

  SELECT * INTO ac FROM public.model_acceptances WHERE avaliacao_id = av.id AND status = 'VIGENTE';
  e := CASE WHEN ac.id IS NOT NULL THEN 'PRONTA' WHEN n_calc = 0 THEN 'BLOQUEADA'
            WHEN EXISTS (SELECT 1 FROM public.model_acceptances WHERE avaliacao_id = av.id AND status = 'INVALIDADO') THEN 'DESATUALIZADA'
            WHEN EXISTS (SELECT 1 FROM public.model_validations WHERE avaliacao_id = av.id AND NOT stale) THEN 'EM_ANDAMENTO' ELSE 'PENDENTE' END;
  v_out := v_out || jsonb_build_object('bloco', 'VALIDACAO', 'estado', e,
    'pendencias', to_jsonb(CASE e WHEN 'BLOQUEADA' THEN ARRAY['Aguardando modelo calculado'] WHEN 'PENDENTE' THEN ARRAY['Validar um modelo']
      WHEN 'EM_ANDAMENTO' THEN ARRAY['Concluir análises e aceitar o modelo'] WHEN 'DESATUALIZADA' THEN ARRAY['Aceite anterior invalidado — validar novamente'] ELSE '{}'::text[] END),
    'proxima_acao', CASE e WHEN 'PENDENTE' THEN 'Executar validação' WHEN 'EM_ANDAMENTO' THEN 'Aceitar o modelo' WHEN 'DESATUALIZADA' THEN 'Validar novamente' END);

  SELECT * INTO res FROM public.avaliacao_resultado_economico WHERE avaliacao_id = av.id ORDER BY confirmado_em DESC LIMIT 1;
  e := CASE WHEN res.id IS NOT NULL AND res.status = 'VIGENTE' AND NOT res.stale THEN 'PRONTA'
            WHEN ac.id IS NULL THEN 'BLOQUEADA'
            WHEN res.id IS NOT NULL AND res.status = 'DESATUALIZADO' THEN 'DESATUALIZADA' ELSE 'PENDENTE' END;
  v_out := v_out || jsonb_build_object('bloco', 'RESULTADO', 'estado', e,
    'pendencias', to_jsonb(CASE e WHEN 'BLOQUEADA' THEN ARRAY['Aguardando aceite do modelo'] WHEN 'PENDENTE' THEN ARRAY['Selecionar centro e confirmar resultado']
      WHEN 'DESATUALIZADA' THEN ARRAY['Resultado desatualizado — confirmar novamente'] ELSE '{}'::text[] END),
    'proxima_acao', CASE e WHEN 'PENDENTE' THEN 'Confirmar resultado econômico' WHEN 'DESATUALIZADA' THEN 'Revisar resultado' END);

  SELECT v.* INTO lv FROM public.laudo_versoes v JOIN public.laudos l ON l.id = v.laudo_id WHERE l.avaliacao_id = av.id ORDER BY v.revisao DESC LIMIT 1;
  SELECT count(*), count(*) FILTER (WHERE status = 'APROVADA' AND NOT stale), count(*) FILTER (WHERE stale)
    INTO n_sec, n_apr, n_sstale FROM public.laudo_secoes WHERE laudo_versao_id = lv.id;
  e := CASE WHEN lv.status = 'EMITIDO' THEN 'PRONTA'
            WHEN res.id IS NULL OR res.status <> 'VIGENTE' THEN 'BLOQUEADA'
            WHEN lv.id IS NULL THEN 'PENDENTE'
            WHEN n_sstale > 0 THEN 'DESATUALIZADA' WHEN n_apr = n_sec AND n_sec > 0 THEN 'PRONTA' ELSE 'EM_ANDAMENTO' END;
  v_out := v_out || jsonb_build_object('bloco', 'LAUDO', 'estado', e, 'emitido', COALESCE(lv.status = 'EMITIDO', false), 'revisao', lv.revisao,
    'secoes', n_sec, 'secoes_aprovadas', n_apr,
    'pendencias', to_jsonb(CASE e WHEN 'BLOQUEADA' THEN ARRAY['Aguardando resultado econômico'] WHEN 'PENDENTE' THEN ARRAY['Iniciar o laudo']
      WHEN 'DESATUALIZADA' THEN ARRAY[n_sstale || ' seção(ões) desatualizada(s)'] WHEN 'EM_ANDAMENTO' THEN ARRAY[(n_sec - n_apr) || ' seção(ões) a aprovar'] ELSE '{}'::text[] END),
    'proxima_acao', CASE e WHEN 'PENDENTE' THEN 'Iniciar laudo' WHEN 'EM_ANDAMENTO' THEN 'Aprovar seções e emitir' WHEN 'DESATUALIZADA' THEN 'Revisar seções desatualizadas' END);
  RETURN v_out;
END $$;

CREATE OR REPLACE FUNCTION public.aval_find_duplicates(p_endereco text, p_numero text, p_complemento text, p_municipio_ibge text,
  p_latitude numeric, p_longitude numeric, p_anuncio_url text, p_anuncio_id text, p_area numeric, p_foto_hashes text[] DEFAULT '{}', p_exclude uuid DEFAULT NULL)
RETURNS TABLE(imovel_id uuid, pontos int, motivos text[], endereco text, numero text, complemento text, bairro text, area_construida numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH base AS (
    SELECT i.*, l.latitude, l.longitude,
      (public.aval_normalize_text(i.endereco) = public.aval_normalize_text(p_endereco) AND public.aval_normalize_text(p_endereco) <> ''
        AND public.aval_normalize_text(i.numero) = public.aval_normalize_text(p_numero)) AS mesmo_end,
      public.aval_normalize_text(i.complemento) = public.aval_normalize_text(p_complemento) AS mesma_unid,
      CASE WHEN l.latitude IS NOT NULL AND p_latitude IS NOT NULL THEN
        6371000 * 2 * asin(sqrt(power(sin(radians((l.latitude - p_latitude) / 2)), 2)
          + cos(radians(p_latitude)) * cos(radians(l.latitude)) * power(sin(radians((l.longitude - p_longitude) / 2)), 2))) END AS dist_m
    FROM public.imoveis i LEFT JOIN public.imovel_localizacao l ON l.imovel_id = i.id
    WHERE (p_exclude IS NULL OR i.id <> p_exclude)
      AND (p_municipio_ibge IS NULL OR i.municipio_ibge IS NULL OR i.municipio_ibge = p_municipio_ibge)
  ), scored AS (
    SELECT b.*,
      (COALESCE(p_anuncio_url, '') <> '' AND b.anuncio_url = p_anuncio_url) OR (COALESCE(p_anuncio_id, '') <> '' AND b.anuncio_id = p_anuncio_id) AS mesmo_anuncio,
      COALESCE(array_length(p_foto_hashes, 1), 0) > 0 AND b.foto_hashes && p_foto_hashes AS mesma_foto,
      p_area IS NOT NULL AND b.area_construida IS NOT NULL AND abs(b.area_construida - p_area) <= 0.03 * p_area AS area_sim
    FROM base b
  )
  SELECT s.id,
    ((CASE WHEN s.mesmo_end AND s.mesma_unid THEN 60 WHEN s.mesmo_end THEN 25 ELSE 0 END)
     + (CASE WHEN s.dist_m IS NOT NULL AND s.dist_m <= 25 THEN 40 ELSE 0 END)
     + (CASE WHEN s.mesmo_anuncio THEN 70 ELSE 0 END) + (CASE WHEN s.mesma_foto THEN 50 ELSE 0 END)
     + (CASE WHEN s.area_sim THEN 10 ELSE 0 END))::int AS pontos,
    array_remove(ARRAY[
      CASE WHEN s.mesmo_end AND s.mesma_unid THEN 'Mesmo endereço e mesma unidade/complemento' END,
      CASE WHEN s.mesmo_end AND NOT s.mesma_unid THEN 'Mesmo endereço (unidade diferente ou não informada)' END,
      CASE WHEN s.dist_m IS NOT NULL AND s.dist_m <= 25 THEN 'Coordenadas a ' || round(s.dist_m) || ' m' END,
      CASE WHEN s.mesmo_anuncio THEN 'Mesmo anúncio (URL/ID)' END,
      CASE WHEN s.mesma_foto THEN 'Mesma foto' END,
      CASE WHEN s.area_sim THEN 'Área semelhante (sinal auxiliar)' END], NULL) AS motivos,
    s.endereco, s.numero, s.complemento, s.bairro, s.area_construida
  FROM scored s
  WHERE ((CASE WHEN s.mesmo_end AND s.mesma_unid THEN 60 WHEN s.mesmo_end THEN 25 ELSE 0 END)
     + (CASE WHEN s.dist_m IS NOT NULL AND s.dist_m <= 25 THEN 40 ELSE 0 END)
     + (CASE WHEN s.mesmo_anuncio THEN 70 ELSE 0 END) + (CASE WHEN s.mesma_foto THEN 50 ELSE 0 END)
     + (CASE WHEN s.area_sim THEN 10 ELSE 0 END)) >= 35
  ORDER BY 2 DESC LIMIT 10
$$;

CREATE OR REPLACE FUNCTION public.aval_imovel_set_normalizado() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.endereco_normalizado := NULLIF(btrim(concat_ws(' ', public.aval_normalize_text(NEW.endereco), public.aval_normalize_text(NEW.numero),
    public.aval_normalize_text(NEW.complemento))), '');
  RETURN NEW;
END $$;

DO $$
DECLARE f record;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname LIKE 'aval\_%' LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
  END LOOP;
END $$;