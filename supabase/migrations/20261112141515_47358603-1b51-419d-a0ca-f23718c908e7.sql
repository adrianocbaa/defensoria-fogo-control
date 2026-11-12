-- Compatibilidade do conjunto congelado com as variáveis atuais do espaço de modelagem.
-- Ausente: variável (dependente/independente ativa) sem valor no snapshot de amostra habilitada (ex.: conjunto congelado antes da etapa Variáveis).
-- Divergente: variável com fonte estruturada cujo valor vivo difere do congelado (cadastro corrigido após o congelamento).
-- Somente leitura; não altera snapshots (imutáveis).
CREATE OR REPLACE FUNCTION public.aval_conjunto_compat(p_conjunto uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE c record; v_n int; v_vars jsonb; v_aus int; v_div int;
BEGIN
  SELECT id, avaliacao_id, versao, status, congelado_em INTO c FROM public.avaliacao_conjuntos_dados WHERE id = p_conjunto;
  IF c.id IS NULL THEN RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
  SELECT count(*) INTO v_n FROM public.avaliacao_amostra_snapshots s
   WHERE s.conjunto_id = c.id AND COALESCE((s.dados->>'habilitada_modelo')::boolean, true);
  WITH idx AS (
    SELECT a.id, row_number() OVER (ORDER BY a.created_at, a.id) AS indice FROM public.avaliacao_amostras a WHERE a.avaliacao_id = c.avaliacao_id),
  sn AS (
    SELECT s.amostra_id, s.dado_id, s.imovel_id, s.dados->'variaveis' AS vars, idx.indice
      FROM public.avaliacao_amostra_snapshots s LEFT JOIN idx ON idx.id = s.amostra_id
     WHERE s.conjunto_id = c.id AND COALESCE((s.dados->>'habilitada_modelo')::boolean, true)),
  vs AS (
    SELECT v.id, v.codigo, v.nome, v.papel, v.created_at, public.aval_var_fonte(v.campo_origem, v.atributo_id) AS fonte
      FROM public.avaliacao_variaveis v
     WHERE v.avaliacao_id = c.avaliacao_id AND v.ativo AND v.papel IN ('DEPENDENTE','INDEPENDENTE')),
  chk AS (
    SELECT vs.id, vs.codigo, vs.nome, vs.papel, vs.created_at, vs.fonte, sn.indice,
           NULLIF(sn.vars->>vs.codigo, '') IS NULL AS ausente,
           CASE WHEN vs.fonte IN ('MERCADO','IMOVEL','ATRIBUTO') AND NULLIF(sn.vars->>vs.codigo, '') IS NOT NULL
                THEN public.aval_var_resolve(vs.id, sn.imovel_id, sn.dado_id, sn.amostra_id) IS DISTINCT FROM
                     (CASE WHEN (sn.vars->>vs.codigo) ~ '^-?[0-9]+(\.[0-9]+)?([eE][-+]?[0-9]+)?$' THEN (sn.vars->>vs.codigo)::numeric END)
                ELSE false END AS divergente
      FROM vs CROSS JOIN sn),
  agg AS (
    SELECT id, codigo, nome, papel, fonte, min(created_at) AS ord,
           count(*) FILTER (WHERE NOT ausente) AS presentes,
           count(*) FILTER (WHERE ausente) AS ausentes,
           count(*) FILTER (WHERE divergente) AS divergentes,
           COALESCE(jsonb_agg(indice ORDER BY indice) FILTER (WHERE ausente), '[]') AS ausentes_amostras,
           COALESCE(jsonb_agg(indice ORDER BY indice) FILTER (WHERE divergente), '[]') AS divergentes_amostras
      FROM chk GROUP BY id, codigo, nome, papel, fonte)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'codigo', codigo, 'nome', nome, 'papel', papel, 'fonte', fonte,
           'presentes', presentes, 'ausentes', ausentes, 'divergentes', divergentes,
           'ausentes_amostras', ausentes_amostras, 'divergentes_amostras', divergentes_amostras) ORDER BY ord, id), '[]'),
         COALESCE(sum(ausentes), 0), COALESCE(sum(divergentes), 0)
    INTO v_vars, v_aus, v_div FROM agg;
  RETURN jsonb_build_object('conjunto_id', c.id, 'versao', c.versao, 'status', c.status, 'congelado_em', c.congelado_em,
    'amostras', v_n, 'variaveis', v_vars, 'compativel', v_aus = 0 AND v_div = 0,
    'motivo', CASE WHEN v_aus > 0 THEN 'VARIAVEL_AUSENTE' WHEN v_div > 0 THEN 'VALOR_ALTERADO' END);
END $$;
REVOKE ALL ON FUNCTION public.aval_conjunto_compat(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aval_conjunto_compat(uuid) TO authenticated, service_role;

-- Criação de modelo (manual, candidatos e simulações) recusa conjunto incompatível com as variáveis atuais.
CREATE OR REPLACE FUNCTION public.aval_model_create_core(p_avaliacao uuid, p_conjunto uuid, p_nome text, p_dep_var uuid, p_dep_transf text, p_dep_power numeric, p_vars jsonb, p_origem_tipo text DEFAULT 'MANUAL'::text, p_modelo_origem uuid DEFAULT NULL::uuid, p_amostras_excluidas uuid[] DEFAULT '{}'::uuid[], p_espaco uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_org uuid; v_num int; v_id uuid; v_perm text; x jsonb; v_aut text[]; v_conf numeric; i int := 0;
BEGIN
  v_perm := CASE WHEN p_origem_tipo IN ('SIMULACAO_VARIAVEL','SIMULACAO_AMOSTRA') THEN 'model.simulate' ELSE 'model.create' END;
  IF NOT public.aval_can_edit(p_avaliacao, v_perm) THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  SELECT organization_id INTO v_org FROM public.avaliacoes WHERE id = p_avaliacao;
  IF NOT EXISTS (SELECT 1 FROM public.avaliacao_conjuntos_dados WHERE id = p_conjunto AND avaliacao_id = p_avaliacao AND status = 'CONGELADO') THEN
    RAISE EXCEPTION 'aval:dataset_not_frozen' USING ERRCODE = '22023';
  END IF;
  IF NOT COALESCE((public.aval_conjunto_compat(p_conjunto)->>'compativel')::boolean, false) THEN
    RAISE EXCEPTION 'aval:dataset_outdated' USING ERRCODE = '22023';
  END IF;
  SELECT transformacoes_autorizadas INTO v_aut FROM public.avaliacao_variaveis WHERE id = p_dep_var AND avaliacao_id = p_avaliacao;
  IF v_aut IS NULL OR NOT (p_dep_transf = ANY(v_aut)) THEN RAISE EXCEPTION 'aval:transform_not_authorized' USING ERRCODE = '22023'; END IF;
  IF jsonb_typeof(p_vars) <> 'array' OR jsonb_array_length(p_vars) = 0 THEN RAISE EXCEPTION 'aval:missing_variables' USING ERRCODE = '22023'; END IF;
  SELECT COALESCE((parametros->>'nivel_confianca')::numeric, 0.80) INTO v_conf FROM public.validation_policies
   WHERE id = COALESCE((SELECT policy_id FROM public.organization_validation_policy WHERE organization_id = v_org),
                       (SELECT id FROM public.validation_policies WHERE organization_id IS NULL AND status = 'VIGENTE' ORDER BY versao DESC LIMIT 1));
  SELECT COALESCE(max(numero), 0) + 1 INTO v_num FROM public.avaliacao_modelos WHERE avaliacao_id = p_avaliacao;
  INSERT INTO public.avaliacao_modelos(organization_id, avaliacao_id, conjunto_id, espaco_id, numero, nome, modelo_origem_id, origem_tipo,
    dependente_variavel_id, dependente_transformacao, dependente_power, nivel_confianca, amostras_excluidas, created_by)
  VALUES (v_org, p_avaliacao, p_conjunto, p_espaco, v_num, COALESCE(NULLIF(btrim(p_nome), ''), 'Modelo ' || v_num), p_modelo_origem,
    p_origem_tipo, p_dep_var, p_dep_transf, p_dep_power, COALESCE(v_conf, 0.80), COALESCE(p_amostras_excluidas, '{}'), auth.uid())
  RETURNING id INTO v_id;
  FOR x IN SELECT * FROM jsonb_array_elements(p_vars) LOOP
    i := i + 1;
    SELECT transformacoes_autorizadas INTO v_aut FROM public.avaliacao_variaveis
     WHERE id = (x->>'variavel_id')::uuid AND avaliacao_id = p_avaliacao AND id <> p_dep_var;
    IF v_aut IS NULL OR NOT ((x->>'transformacao') = ANY(v_aut)) THEN RAISE EXCEPTION 'aval:transform_not_authorized' USING ERRCODE = '22023'; END IF;
    INSERT INTO public.avaliacao_modelo_variaveis(organization_id, avaliacao_id, modelo_id, variavel_id, transformacao, power, ordem)
    VALUES (v_org, p_avaliacao, v_id, (x->>'variavel_id')::uuid, x->>'transformacao', NULLIF(x->>'power', '')::numeric, i);
  END LOOP;
  PERFORM public.aval_audit(p_avaliacao, 'modelo', v_id, 'MODEL_CREATED', jsonb_build_object('numero', v_num, 'origem', p_origem_tipo, 'origem_modelo', p_modelo_origem));
  RETURN v_id;
END $function$;
REVOKE ALL ON FUNCTION public.aval_model_create_core(uuid, uuid, text, uuid, text, numeric, jsonb, text, uuid, uuid[], uuid) FROM PUBLIC, anon, authenticated;

-- Candidatos: conjunto incompatível é recusado antes da checagem de domínio (que não enxerga valores ausentes).
CREATE OR REPLACE FUNCTION public.aval_model_generate_batch(p_avaliacao uuid, p_conjunto uuid, p_modo text, p_candidatos jsonb, p_confirmado boolean DEFAULT false)
RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid; s record; n int; v_soft int; v_ids uuid[] := '{}'; c jsonb; x jsonb; v_dep uuid; v_origem text;
BEGIN
  IF p_modo NOT IN ('ASSISTIDO','AMPLA') THEN RAISE EXCEPTION 'aval:invalid_mode' USING ERRCODE = '22023'; END IF;
  IF NOT public.aval_can_edit(p_avaliacao, 'model.create') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  IF jsonb_typeof(p_candidatos) <> 'array' OR jsonb_array_length(p_candidatos) = 0 THEN RAISE EXCEPTION 'aval:missing_variables' USING ERRCODE = '22023'; END IF;
  SELECT organization_id INTO v_org FROM public.avaliacoes WHERE id = p_avaliacao;
  SELECT * INTO s FROM public.avaliacao_modeling_settings WHERE organization_id = v_org;
  IF s.id IS NULL THEN SELECT * INTO s FROM public.avaliacao_modeling_settings WHERE organization_id IS NULL; END IF;
  n := jsonb_array_length(p_candidatos);
  IF s.hard_limit IS NOT NULL AND n > s.hard_limit THEN RAISE EXCEPTION 'aval:candidate_hard_limit' USING ERRCODE = '22023'; END IF;
  v_soft := CASE p_modo WHEN 'AMPLA' THEN s.exploration_candidate_soft_limit ELSE s.assisted_candidate_soft_limit END;
  IF (n > COALESCE(v_soft, 30) OR (s.require_confirmation_over IS NOT NULL AND n > s.require_confirmation_over)) AND NOT COALESCE(p_confirmado, false) THEN
    RAISE EXCEPTION 'aval:candidate_confirmation_required' USING ERRCODE = '22023';
  END IF;
  SELECT id INTO v_dep FROM public.avaliacao_variaveis WHERE avaliacao_id = p_avaliacao AND papel = 'DEPENDENTE' AND ativo LIMIT 1;
  IF v_dep IS NULL THEN RAISE EXCEPTION 'aval:missing_variables' USING ERRCODE = '22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.avaliacao_conjuntos_dados WHERE id = p_conjunto AND avaliacao_id = p_avaliacao AND status = 'CONGELADO') THEN
    RAISE EXCEPTION 'aval:dataset_not_frozen' USING ERRCODE = '22023';
  END IF;
  IF NOT COALESCE((public.aval_conjunto_compat(p_conjunto)->>'compativel')::boolean, false) THEN
    RAISE EXCEPTION 'aval:dataset_outdated' USING ERRCODE = '22023';
  END IF;
  FOR c IN SELECT * FROM jsonb_array_elements(p_candidatos) LOOP
    IF NOT public.aval_domain_ok(p_conjunto, v_dep, c->>'dep_transf') THEN RAISE EXCEPTION 'aval:invalid_domain' USING ERRCODE = '22023'; END IF;
    FOR x IN SELECT * FROM jsonb_array_elements(c->'vars') LOOP
      IF NOT public.aval_domain_ok(p_conjunto, (x->>'variavel_id')::uuid, x->>'transformacao') THEN RAISE EXCEPTION 'aval:invalid_domain' USING ERRCODE = '22023'; END IF;
    END LOOP;
  END LOOP;
  v_origem := CASE p_modo WHEN 'AMPLA' THEN 'GERADO_AMPLA' ELSE 'GERADO_ASSISTIDO' END;
  FOR c IN SELECT * FROM jsonb_array_elements(p_candidatos) LOOP
    v_ids := v_ids || public.aval_model_create_core(p_avaliacao, p_conjunto, NULL, v_dep, c->>'dep_transf', NULL, c->'vars', v_origem, NULL, '{}'::uuid[], NULL);
  END LOOP;
  RETURN v_ids;
END $$;
REVOKE ALL ON FUNCTION public.aval_model_generate_batch(uuid, uuid, text, jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aval_model_generate_batch(uuid, uuid, text, jsonb, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.aval_pendencias(p_avaliacao uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE av record; v_out jsonb := '[]'::jsonb; p text[]; e text;
  v_req text[]; n_sel int; c_vig record; n_mod int; n_calc int; n_stale int; ac record; res record; lv record; n_sec int; n_apr int; n_sstale int;
  v_has_imovel boolean; v_vist boolean; st jsonb; n_dep int; n_ind int; v_avf text[]; n_inc int; v_compat boolean := true;
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

  -- Variáveis da pesquisa (antes da coleta)
  SELECT count(*) FILTER (WHERE papel = 'DEPENDENTE'), count(*) FILTER (WHERE papel = 'INDEPENDENTE') INTO n_dep, n_ind
    FROM public.avaliacao_variaveis WHERE avaliacao_id = av.id AND ativo;
  p := '{}';
  IF n_dep = 0 THEN p := p || 'Definir a variável dependente'::text; END IF;
  IF n_ind = 0 THEN p := p || 'Definir ao menos uma variável independente'::text; END IF;
  e := CASE WHEN n_dep + n_ind = 0 THEN 'PENDENTE' WHEN cardinality(p) > 0 THEN 'EM_ANDAMENTO' ELSE 'PRONTA' END;
  v_out := v_out || jsonb_build_object('bloco', 'VARIAVEIS', 'estado', e, 'pendencias', to_jsonb(p), 'variaveis', n_dep + n_ind,
    'proxima_acao', CASE WHEN e = 'PRONTA' THEN NULL ELSE 'Definir variáveis da pesquisa' END);
  st := public.aval_variaveis_status(av.id);
  SELECT array_agg(x->>'nome' ORDER BY ord) INTO v_avf FROM jsonb_array_elements(st->'variaveis') WITH ORDINALITY t(x, ord)
   WHERE (st->'avaliando'->'faltando') ? (x->>'id');
  SELECT count(*) INTO n_inc FROM jsonb_array_elements(st->'amostras') a
   WHERE (a->>'selecionada')::boolean AND (a->>'habilitada_modelo')::boolean AND NOT (a->>'completa')::boolean;

  v_has_imovel := EXISTS (SELECT 1 FROM public.avaliacao_imoveis WHERE avaliacao_id = av.id AND papel = 'AVALIANDO');
  v_vist := EXISTS (SELECT 1 FROM public.imovel_vistorias WHERE avaliacao_id = av.id);
  p := '{}';
  IF NOT v_has_imovel THEN p := p || 'Vincular o imóvel avaliando'::text; END IF;
  IF NOT v_vist THEN p := p || 'Registrar a vistoria'::text; END IF;
  IF v_has_imovel AND v_avf IS NOT NULL THEN p := p || ('Preencher no avaliando: ' || array_to_string(v_avf, ', '))::text; END IF;
  e := CASE WHEN NOT v_has_imovel THEN 'PENDENTE' WHEN cardinality(p) > 0 THEN 'EM_ANDAMENTO' ELSE 'PRONTA' END;
  v_out := v_out || jsonb_build_object('bloco', 'IMOVEL', 'estado', e, 'pendencias', to_jsonb(p), 'proxima_acao', CASE WHEN e = 'PENDENTE' THEN 'Cadastrar o imóvel avaliando'
    WHEN e = 'EM_ANDAMENTO' AND v_avf IS NOT NULL THEN 'Preencher os dados necessários do avaliando' WHEN e = 'EM_ANDAMENTO' THEN 'Registrar a vistoria' END);

  SELECT count(*) INTO n_sel FROM public.avaliacao_amostras WHERE avaliacao_id = av.id AND selecionada;
  SELECT * INTO c_vig FROM public.avaliacao_conjuntos_dados WHERE avaliacao_id = av.id AND status = 'CONGELADO' ORDER BY versao DESC LIMIT 1;
  p := '{}';
  IF n_sel = 0 THEN p := p || 'Selecionar amostras de mercado'::text; END IF;
  IF n_inc > 0 THEN p := p || (n_inc || ' amostra(s) habilitada(s) sem variável obrigatória')::text; END IF;
  IF c_vig.id IS NULL THEN p := p || 'Congelar o conjunto de dados'::text;
  ELSIF EXISTS (SELECT 1 FROM public.avaliacao_amostras a WHERE a.avaliacao_id = av.id AND a.selecionada
                 AND NOT EXISTS (SELECT 1 FROM public.avaliacao_conjunto_amostras ca WHERE ca.conjunto_id = c_vig.id AND ca.amostra_id = a.id))
     OR EXISTS (SELECT 1 FROM public.avaliacao_conjunto_amostras ca JOIN public.avaliacao_amostras a ON a.id = ca.amostra_id
                 WHERE ca.conjunto_id = c_vig.id AND NOT a.selecionada) THEN
    p := p || 'Seleção de amostras difere do conjunto congelado'::text;
  END IF;
  IF c_vig.id IS NOT NULL THEN
    v_compat := COALESCE((public.aval_conjunto_compat(c_vig.id)->>'compativel')::boolean, true);
    IF NOT v_compat THEN p := p || 'Conjunto congelado antes das últimas alterações em variáveis/amostras — congelar nova versão'::text; END IF;
  END IF;
  e := CASE WHEN n_sel = 0 THEN 'PENDENTE' WHEN c_vig.id IS NULL THEN 'EM_ANDAMENTO' WHEN cardinality(p) > (CASE WHEN n_inc > 0 THEN 1 ELSE 0 END) THEN 'DESATUALIZADA' ELSE 'PRONTA' END;
  v_out := v_out || jsonb_build_object('bloco', 'MERCADO', 'estado', e, 'pendencias', to_jsonb(p), 'amostras', n_sel, 'conjunto_versao', c_vig.versao,
    'proxima_acao', CASE e WHEN 'PENDENTE' THEN 'Pesquisar e selecionar amostras' WHEN 'EM_ANDAMENTO' THEN 'Preparar e congelar o conjunto' WHEN 'DESATUALIZADA' THEN 'Criar nova versão do conjunto' END);

  SELECT count(*), count(*) FILTER (WHERE status NOT IN ('RASCUNHO','ERRO') AND NOT stale), count(*) FILTER (WHERE stale)
    INTO n_mod, n_calc, n_stale FROM public.avaliacao_modelos WHERE avaliacao_id = av.id;
  e := CASE WHEN c_vig.id IS NULL THEN 'BLOQUEADA' WHEN NOT v_compat THEN 'DESATUALIZADA' WHEN n_mod = 0 THEN 'PENDENTE' WHEN n_calc > 0 THEN 'PRONTA' WHEN n_stale > 0 THEN 'DESATUALIZADA' ELSE 'EM_ANDAMENTO' END;
  v_out := v_out || jsonb_build_object('bloco', 'MODELAGEM', 'estado', e, 'modelos', n_mod,
    'pendencias', to_jsonb(CASE e WHEN 'BLOQUEADA' THEN ARRAY['Aguardando conjunto de dados congelado'] WHEN 'PENDENTE' THEN ARRAY['Criar e calcular um modelo']
      WHEN 'DESATUALIZADA' THEN CASE WHEN NOT v_compat THEN ARRAY['Conjunto vigente desatualizado — congele nova versão antes de gerar modelos'] ELSE ARRAY['Modelos desatualizados — recalcular'] END WHEN 'EM_ANDAMENTO' THEN ARRAY['Calcular o modelo'] ELSE '{}'::text[] END),
    'proxima_acao', CASE e WHEN 'PENDENTE' THEN 'Preparar modelagem' WHEN 'DESATUALIZADA' THEN CASE WHEN NOT v_compat THEN 'Congelar nova versão do conjunto' ELSE 'Recalcular modelos' END WHEN 'EM_ANDAMENTO' THEN 'Executar o modelo' END);

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