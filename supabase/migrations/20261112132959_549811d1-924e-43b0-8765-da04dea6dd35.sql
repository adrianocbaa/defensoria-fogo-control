-- Avaliações — variáveis da pesquisa definidas antes da coleta.
-- Aditiva: catálogo mínimo de características, resolução de valores pela fonte configurada (cadastro físico,
-- característica do imóvel, dado de mercado ou digitação manual), completude, bloqueio no congelamento,
-- edição de características/valores/definição de variáveis pelo fluxo de impacto em lote e etapa VARIAVEIS nas pendências.

-- 1) Catálogo: características padrão que faltavam (globais, sem organização).
ALTER TABLE public.atributos_imobiliarios DISABLE TRIGGER aval_set_org;
INSERT INTO public.atributos_imobiliarios(organization_id, codigo, nome, categoria, data_type, unidade, modelable, ordem, opcoes)
SELECT NULL, x.codigo, x.nome, x.categoria, 'NUMERIC', x.unidade, true, x.ordem, NULL
  FROM (VALUES ('AREA_PRIVATIVA', 'Área privativa', 'Dimensões', 'm²', 4),
               ('LOCALIZACAO', 'Localização (código alocado)', 'Localização', NULL, 29),
               ('DISTANCIA_POLO', 'Distância ao polo', 'Localização', 'km', 32)) x(codigo, nome, categoria, unidade, ordem)
 WHERE NOT EXISTS (SELECT 1 FROM public.atributos_imobiliarios a WHERE a.organization_id IS NULL AND a.codigo = x.codigo);
ALTER TABLE public.atributos_imobiliarios ENABLE TRIGGER aval_set_org;

-- 2) Fonte dos valores de uma variável.
CREATE OR REPLACE FUNCTION public.aval_var_fonte(p_campo text, p_atributo uuid) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN p_campo IN ('valor_utilizado','valor_unitario') THEN 'MERCADO'
              WHEN p_campo IN ('area_construida','area_terreno') THEN 'IMOVEL'
              WHEN p_atributo IS NOT NULL THEN 'ATRIBUTO' ELSE 'MANUAL' END
$$;

-- Variável usada em modelo calculado (versão que respeita as regras de acesso de quem consulta).
CREATE OR REPLACE FUNCTION public.aval_var_usada(p_var uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.avaliacao_modelos m WHERE m.dependente_variavel_id = p_var AND m.status <> 'RASCUNHO')
      OR EXISTS (SELECT 1 FROM public.avaliacao_modelo_variaveis mv JOIN public.avaliacao_modelos m ON m.id = mv.modelo_id
                  WHERE mv.variavel_id = p_var AND m.status <> 'RASCUNHO')
$$;

-- Variável fotografada no conjunto congelado vigente.
CREATE OR REPLACE FUNCTION public.aval_var_no_conjunto(p_var uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.avaliacao_variaveis v
    JOIN public.avaliacao_conjuntos_dados c ON c.avaliacao_id = v.avaliacao_id AND c.status IN ('CONGELADO','EM_USO')
    JOIN public.avaliacao_amostra_snapshots s ON s.conjunto_id = c.id
   WHERE v.id = p_var AND s.dados->'variaveis' ? v.codigo)
$$;

-- Valor numérico de uma variável lido da fonte configurada (a fonte é a verdade; nada é copiado em paralelo).
-- Categorias viram código alocado pela ordem das opções (1, 2, 3…); sim/não e possui/não possui viram 1/0.
CREATE OR REPLACE FUNCTION public.aval_var_resolve(p_var uuid, p_imovel uuid, p_dado uuid, p_amostra uuid) RETURNS numeric
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE v record; a record;
BEGIN
  SELECT id, campo_origem, atributo_id INTO v FROM public.avaliacao_variaveis WHERE id = p_var;
  IF v.id IS NULL THEN RETURN NULL; END IF;
  CASE public.aval_var_fonte(v.campo_origem, v.atributo_id)
  WHEN 'MERCADO' THEN
    IF p_dado IS NULL THEN RETURN NULL; END IF;
    RETURN (SELECT CASE v.campo_origem WHEN 'valor_utilizado' THEN d.valor_utilizado ELSE d.valor_unitario END FROM public.dados_mercado d WHERE d.id = p_dado);
  WHEN 'IMOVEL' THEN
    IF p_imovel IS NULL THEN RETURN NULL; END IF;
    RETURN (SELECT CASE v.campo_origem WHEN 'area_construida' THEN i.area_construida ELSE i.area_terreno END FROM public.imoveis i WHERE i.id = p_imovel);
  WHEN 'ATRIBUTO' THEN
    IF p_imovel IS NULL THEN RETURN NULL; END IF;
    SELECT at.data_type, at.opcoes, ia.valor_numeric, ia.valor_bool, ia.valor_category, ia.valor_status INTO a
      FROM public.imovel_atributos ia JOIN public.atributos_imobiliarios at ON at.id = ia.atributo_id
     WHERE ia.imovel_id = p_imovel AND ia.atributo_id = v.atributo_id;
    IF NOT FOUND THEN RETURN NULL; END IF;
    RETURN CASE a.data_type
      WHEN 'NUMERIC' THEN a.valor_numeric
      WHEN 'BOOL' THEN CASE a.valor_bool WHEN true THEN 1 WHEN false THEN 0 END
      WHEN 'STATUS' THEN CASE a.valor_status WHEN 'POSSUI' THEN 1 WHEN 'NAO_POSSUI' THEN 0 END
      WHEN 'CATEGORY' THEN (SELECT e.ord FROM jsonb_array_elements_text(COALESCE(a.opcoes, '[]'::jsonb)) WITH ORDINALITY e(val, ord) WHERE e.val = a.valor_category)
    END;
  ELSE
    RETURN (SELECT x.valor FROM public.avaliacao_variavel_valores x WHERE x.variavel_id = p_var
             AND CASE WHEN p_amostra IS NULL THEN x.scope_type = 'AVALIANDO' ELSE x.scope_type = 'AMOSTRA' AND x.amostra_id = p_amostra END);
  END CASE;
END $$;

-- Valores do avaliando de variáveis com fonte no cadastro: mantidos alinhados à fonte (o motor lê este registro).
CREATE OR REPLACE FUNCTION public.aval_sync_avaliando(p_av uuid, p_var uuid DEFAULT NULL) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE av record; v_im uuid; v record; r numeric; v_cid uuid; v_cval numeric; n int := 0;
BEGIN
  SELECT id, organization_id, status INTO av FROM public.avaliacoes WHERE id = p_av;
  IF av.id IS NULL OR av.status <> 'ATIVA' THEN RETURN 0; END IF;
  SELECT imovel_id INTO v_im FROM public.avaliacao_imoveis WHERE avaliacao_id = p_av AND papel = 'AVALIANDO';
  FOR v IN SELECT id, codigo FROM public.avaliacao_variaveis WHERE avaliacao_id = p_av AND ativo AND papel <> 'DEPENDENTE'
             AND (p_var IS NULL OR id = p_var) AND public.aval_var_fonte(campo_origem, atributo_id) IN ('IMOVEL','ATRIBUTO') LOOP
    r := CASE WHEN v_im IS NULL THEN NULL ELSE public.aval_var_resolve(v.id, v_im, NULL, NULL) END;
    SELECT x.id, x.valor INTO v_cid, v_cval FROM public.avaliacao_variavel_valores x WHERE x.variavel_id = v.id AND x.scope_type = 'AVALIANDO';
    IF v_cid IS NULL THEN
      IF r IS NULL THEN CONTINUE; END IF;
      INSERT INTO public.avaliacao_variavel_valores(organization_id, avaliacao_id, variavel_id, scope_type, valor, origem)
      VALUES (av.organization_id, p_av, v.id, 'AVALIANDO', r, 'CADASTRO');
    ELSIF v_cval IS DISTINCT FROM r THEN
      UPDATE public.avaliacao_variavel_valores SET valor = r, origem = 'CADASTRO' WHERE id = v_cid;
    ELSE CONTINUE; END IF;
    PERFORM public.aval_audit(p_av, 'variavel_valor_avaliando', v.id, 'VARIABLE_VALUE_SYNCED',
      jsonb_build_object('variavel', v.codigo, 'anterior', v_cval, 'novo', r, 'origem', 'CADASTRO'));
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

-- Completude das variáveis: valor do avaliando e de cada amostra (lidos da fonte), faltantes obrigatórios e contagem.
CREATE OR REPLACE FUNCTION public.aval_variaveis_status(p_avaliacao uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE av record; v_im uuid; v_vars jsonb := '[]'; v_am jsonb := '[]'; v_av_falta jsonb := '[]'; r record; x record; val numeric;
  v_vals jsonb; v_falta jsonb; v_cnt jsonb := '{}'; v_n int := 0; v_precisa boolean;
BEGIN
  SELECT id, organization_id INTO av FROM public.avaliacoes WHERE id = p_avaliacao AND public.aval_is_reader(organization_id);
  IF av.id IS NULL THEN RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
  SELECT imovel_id INTO v_im FROM public.avaliacao_imoveis WHERE avaliacao_id = p_avaliacao AND papel = 'AVALIANDO';
  FOR x IN SELECT a.id, a.dado_id, d.imovel_id, a.selecionada, a.habilitada_modelo, row_number() OVER (ORDER BY a.created_at, a.id) AS indice
             FROM public.avaliacao_amostras a JOIN public.dados_mercado d ON d.id = a.dado_id
            WHERE a.avaliacao_id = p_avaliacao ORDER BY a.created_at, a.id LOOP
    v_vals := '{}'; v_falta := '[]';
    FOR r IN SELECT id, obrigatoria FROM public.avaliacao_variaveis WHERE avaliacao_id = p_avaliacao AND ativo ORDER BY created_at, id LOOP
      val := public.aval_var_resolve(r.id, x.imovel_id, x.dado_id, x.id);
      v_vals := v_vals || jsonb_build_object(r.id::text, val);
      IF val IS NULL AND r.obrigatoria THEN v_falta := v_falta || to_jsonb(r.id::text); END IF;
      IF x.selecionada AND val IS NOT NULL THEN
        v_cnt := v_cnt || jsonb_build_object(r.id::text, COALESCE((v_cnt->>(r.id::text))::int, 0) + 1);
      END IF;
    END LOOP;
    IF x.selecionada THEN v_n := v_n + 1; END IF;
    v_am := v_am || jsonb_build_array(jsonb_build_object('amostra_id', x.id, 'dado_id', x.dado_id, 'imovel_id', x.imovel_id, 'indice', x.indice,
      'selecionada', x.selecionada, 'habilitada_modelo', x.habilitada_modelo, 'valores', v_vals, 'faltando', v_falta,
      'completa', jsonb_array_length(v_falta) = 0));
  END LOOP;
  FOR r IN SELECT v.id, v.codigo, v.nome, v.papel, v.obrigatoria, v.relacao_esperada, v.tipo_variavel, v.categorica, v.unidade, v.origem_tipo,
                  v.campo_origem, v.atributo_id, v.transformacoes_autorizadas, at.codigo AS at_codigo, at.nome AS at_nome, at.data_type, at.opcoes,
                  public.aval_var_fonte(v.campo_origem, v.atributo_id) AS fonte
             FROM public.avaliacao_variaveis v LEFT JOIN public.atributos_imobiliarios at ON at.id = v.atributo_id
            WHERE v.avaliacao_id = p_avaliacao AND v.ativo ORDER BY v.created_at, v.id LOOP
    v_precisa := r.papel <> 'DEPENDENTE' AND r.fonte <> 'MERCADO';
    val := CASE WHEN v_precisa AND (v_im IS NOT NULL OR r.fonte = 'MANUAL') THEN public.aval_var_resolve(r.id, v_im, NULL, NULL) END;
    IF v_precisa AND r.obrigatoria AND val IS NULL THEN v_av_falta := v_av_falta || to_jsonb(r.id::text); END IF;
    v_vars := v_vars || jsonb_build_array(jsonb_build_object('id', r.id, 'codigo', r.codigo, 'nome', r.nome, 'papel', r.papel,
      'obrigatoria', r.obrigatoria, 'relacao_esperada', r.relacao_esperada, 'tipo_variavel', r.tipo_variavel, 'categorica', r.categorica,
      'unidade', r.unidade, 'origem_tipo', r.origem_tipo, 'fonte', r.fonte, 'campo_origem', r.campo_origem, 'atributo_id', r.atributo_id,
      'atributo_codigo', r.at_codigo, 'atributo_nome', r.at_nome, 'data_type', r.data_type, 'opcoes', r.opcoes,
      'transformacoes_autorizadas', to_jsonb(r.transformacoes_autorizadas), 'precisa_avaliando', v_precisa, 'valor_avaliando', val,
      'em_uso', public.aval_var_usada(r.id), 'no_conjunto', public.aval_var_no_conjunto(r.id),
      'amostras_completas', COALESCE((v_cnt->>(r.id::text))::int, 0), 'amostras_total', v_n));
  END LOOP;
  RETURN jsonb_build_object('avaliando', jsonb_build_object('imovel_id', v_im, 'faltando', v_av_falta), 'variaveis', v_vars, 'amostras', v_am);
END $$;


CREATE OR REPLACE FUNCTION public.aval_change_level(p_av uuid, p_entity text, p_campo text, p_entity_id uuid, p_ctx jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  c_loc constant text[] := ARRAY['endereco','numero','complemento','bairro','cep','latitude','longitude','precisao','localizacao'];
  v_rn text; v_rd text; v_is_av boolean := false; v_amostras uuid[]; v_in_conj boolean := false; v_pesquisa boolean;
  v_n text := 'NO_IMPACT'; v_d text := 'Sem impacto técnico nesta avaliação.'; v_s text[] := '{}'; v_sn text; v_sd text;
  vr record; v_attr uuid; v_org uuid; v_uso boolean; v_amostra uuid;
BEGIN
  IF p_entity IN ('avaliacao','valor_administrativo') THEN
    SELECT nivel, descricao INTO v_rn, v_rd FROM public.aval_impact_rules WHERE entity_type = p_entity AND campo = p_campo;
    IF v_rn IS NULL THEN RAISE EXCEPTION 'aval:field_not_allowed' USING ERRCODE = '22023'; END IF;
    RETURN jsonb_build_object('nivel', v_rn, 'descricao', v_rd, 'secoes',
      to_jsonb(CASE WHEN p_entity = 'avaliacao' THEN ARRAY['RESUMO','SOLICITANTE','OBJETO'] ELSE ARRAY['RESUMO','COMPATIBILIDADE'] END));
  END IF;
  -- Definição da variável (papel, relação, obrigatoriedade, nome/unidade, tipo e origem dos valores)
  IF p_entity = 'variavel' THEN
    SELECT * INTO vr FROM public.avaliacao_variaveis WHERE id = p_entity_id AND avaliacao_id = p_av;
    IF vr.id IS NULL THEN RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
    IF p_campo NOT IN ('papel','relacao_esperada','obrigatoria','nome','unidade','tipo_variavel','categorica','fonte') THEN
      RAISE EXCEPTION 'aval:field_not_allowed' USING ERRCODE = '22023';
    END IF;
    v_uso := public.aval_var_usada(vr.id);
    IF p_campo IN ('relacao_esperada','tipo_variavel','categorica') AND v_uso THEN
      RETURN jsonb_build_object('nivel', 'VALIDATION', 'descricao', 'A relação esperada/tipo da variável é critério da validação de modelo já calculado.', 'secoes', to_jsonb(ARRAY['INFERENCIA']));
    ELSIF p_campo = 'papel' AND v_uso AND 'DEPENDENTE' IN (vr.papel, COALESCE(p_ctx->>'_valor', '')) THEN
      RETURN jsonb_build_object('nivel', 'MODEL', 'descricao', 'A variável dependente de modelo calculado foi trocada.', 'secoes', to_jsonb(ARRAY['INFERENCIA']));
    ELSIF p_campo = 'fonte' AND (v_uso OR public.aval_var_no_conjunto(vr.id)) THEN
      RETURN jsonb_build_object('nivel', 'DATASET', 'descricao', 'A origem dos valores da variável muda: o conjunto congelado precisa de nova versão.', 'secoes', to_jsonb(ARRAY['PESQUISA_MERCADO','INFERENCIA']));
    ELSIF p_campo IN ('nome','unidade') AND v_uso THEN
      RETURN jsonb_build_object('nivel', 'REPORT_ONLY', 'descricao', 'Nome/unidade de variável usada aparecem no laudo.', 'secoes', to_jsonb(ARRAY['PESQUISA_MERCADO','INFERENCIA']));
    END IF;
    RETURN jsonb_build_object('nivel', 'NO_IMPACT', 'descricao', 'Afeta somente a coleta e as próximas gerações de modelos.', 'secoes', '[]'::jsonb);
  END IF;
  -- Valor de variável manual/derivada (sem fonte estruturada): do avaliando ou de uma amostra
  IF p_entity = 'variavel_valor' THEN
    SELECT * INTO vr FROM public.avaliacao_variaveis WHERE id = p_entity_id AND avaliacao_id = p_av;
    IF vr.id IS NULL THEN RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
    IF p_campo <> 'valor' OR public.aval_var_fonte(vr.campo_origem, vr.atributo_id) <> 'MANUAL' THEN
      RAISE EXCEPTION 'aval:field_not_allowed' USING ERRCODE = '22023';
    END IF;
    v_amostra := NULLIF(p_ctx->>'amostra_id', '')::uuid;
    IF v_amostra IS NULL THEN
      IF public.aval_var_usada(vr.id) THEN
        RETURN jsonb_build_object('nivel', 'MODEL', 'descricao', 'O valor do avaliando alimenta modelo calculado.', 'secoes', to_jsonb(ARRAY['CARACTERIZACAO']));
      END IF;
      RETURN jsonb_build_object('nivel', 'NO_IMPACT', 'descricao', 'Valor do avaliando ainda não usado em modelo calculado.', 'secoes', '[]'::jsonb);
    END IF;
    IF vr.ativo AND EXISTS (SELECT 1 FROM public.avaliacao_conjunto_amostras ca JOIN public.avaliacao_conjuntos_dados c ON c.id = ca.conjunto_id
                             WHERE c.avaliacao_id = p_av AND c.status IN ('CONGELADO','EM_USO') AND ca.amostra_id = v_amostra) THEN
      RETURN jsonb_build_object('nivel', 'DATASET', 'descricao', 'Valor de variável de amostra do conjunto vigente.', 'secoes', to_jsonb(ARRAY['PESQUISA_MERCADO']));
    END IF;
    RETURN jsonb_build_object('nivel', 'NO_IMPACT', 'descricao', 'Amostra fora do conjunto congelado: vale para a próxima versão.', 'secoes', '[]'::jsonb);
  END IF;

  IF p_entity NOT IN ('imovel','imovel_localizacao','imovel_atributo','dado_mercado','amostra','fonte_principal') THEN
    RAISE EXCEPTION 'aval:entity_not_allowed' USING ERRCODE = '22023';
  END IF;
  IF (p_entity = 'imovel' AND p_campo NOT IN ('tipo_imovel','endereco','numero','complemento','bairro','cep','area_construida','area_terreno','anuncio_url','anuncio_id','descricao'))
     OR (p_entity = 'imovel_localizacao' AND p_campo NOT IN ('precisao','latitude','longitude'))
     OR (p_entity = 'dado_mercado' AND p_campo NOT IN ('natureza_dado','valor_ofertado','valor_utilizado','data_observacao','url_anuncio','anuncio_id'))
     OR (p_entity = 'amostra' AND p_campo <> 'origem_territorial')
     OR (p_entity = 'fonte_principal' AND p_campo NOT IN ('tipo','nome')) THEN
    RAISE EXCEPTION 'aval:field_not_allowed' USING ERRCODE = '22023';
  END IF;
  IF p_entity = 'imovel_atributo' THEN
    SELECT organization_id INTO v_org FROM public.avaliacoes WHERE id = p_av;
    SELECT id INTO v_attr FROM public.atributos_imobiliarios WHERE codigo = p_campo AND ativo AND (organization_id IS NULL OR organization_id = v_org)
     ORDER BY organization_id NULLS LAST LIMIT 1;
    IF v_attr IS NULL THEN RAISE EXCEPTION 'aval:field_not_allowed' USING ERRCODE = '22023'; END IF;
  END IF;

  IF p_entity IN ('imovel','imovel_localizacao','imovel_atributo') THEN
    IF COALESCE(p_ctx->>'modo', '') = 'CLONAR' THEN
      SELECT array_agg(a.id) INTO v_amostras FROM public.avaliacao_amostras a WHERE a.avaliacao_id = p_av AND a.dado_id = (p_ctx->>'dado_id')::uuid;
    ELSE
      v_is_av := EXISTS (SELECT 1 FROM public.avaliacao_imoveis WHERE avaliacao_id = p_av AND imovel_id = p_entity_id AND papel = 'AVALIANDO');
      SELECT array_agg(a.id) INTO v_amostras FROM public.avaliacao_amostras a JOIN public.dados_mercado d ON d.id = a.dado_id
       WHERE a.avaliacao_id = p_av AND d.imovel_id = p_entity_id;
    END IF;
  ELSIF p_entity IN ('dado_mercado','fonte_principal') THEN
    SELECT array_agg(a.id) INTO v_amostras FROM public.avaliacao_amostras a WHERE a.avaliacao_id = p_av AND a.dado_id = p_entity_id;
  ELSE
    SELECT array_agg(a.id) INTO v_amostras FROM public.avaliacao_amostras a WHERE a.avaliacao_id = p_av AND a.id = p_entity_id;
  END IF;
  v_in_conj := v_amostras IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.avaliacao_conjunto_amostras ca JOIN public.avaliacao_conjuntos_dados c ON c.id = ca.conjunto_id
     WHERE c.avaliacao_id = p_av AND c.status IN ('CONGELADO','EM_USO') AND ca.amostra_id = ANY(v_amostras));

  -- Papel de imóvel avaliando
  IF v_is_av THEN
    v_s := ARRAY['RESUMO','OBJETO','CARACTERIZACAO'];
    v_n := 'REPORT_ONLY'; v_d := 'Correção descritiva do avaliando: afeta apenas o laudo.';
    IF p_entity = 'imovel' AND p_campo = 'tipo_imovel' THEN
      v_pesquisa := EXISTS (SELECT 1 FROM public.avaliacao_amostras WHERE avaliacao_id = p_av)
                 OR EXISTS (SELECT 1 FROM public.avaliacao_conjuntos_dados WHERE avaliacao_id = p_av)
                 OR EXISTS (SELECT 1 FROM public.avaliacao_modelos WHERE avaliacao_id = p_av AND status <> 'RASCUNHO');
      IF v_pesquisa THEN v_n := 'DATASET'; v_d := 'O tipo do avaliando define a comparabilidade da pesquisa já iniciada.'; END IF;
    ELSIF p_entity = 'imovel' AND p_campo IN ('area_construida','area_terreno') THEN
      IF public.aval_vars_match(p_av, ARRAY[p_campo], false, true) THEN
        v_n := 'MODEL'; v_d := 'A área do avaliando alimenta variável de modelo calculado.';
      END IF;
    ELSIF p_entity = 'imovel_atributo' THEN
      IF EXISTS (SELECT 1 FROM public.avaliacao_variaveis v WHERE v.avaliacao_id = p_av AND v.ativo AND v.atributo_id = v_attr
                  AND v.campo_origem IS NULL AND public.aval_var_usada(v.id)) THEN
        v_n := 'MODEL'; v_d := 'A característica do avaliando alimenta variável de modelo calculado.';
      END IF;
    ELSIF p_campo = ANY(c_loc) THEN
      IF public.aval_vars_match(p_av, c_loc, true, true) THEN
        v_n := 'MODEL'; v_d := 'A localização do avaliando alimenta variável locacional de modelo calculado.';
      END IF;
    END IF;
  END IF;

  -- Papel de amostra de mercado
  IF v_amostras IS NOT NULL THEN
    v_s := v_s || ARRAY['PESQUISA_MERCADO'];
    v_sn := 'REPORT_ONLY'; v_sd := 'Correção descritiva da amostra: afeta apenas o laudo.';
    IF v_in_conj THEN
      IF p_entity = 'imovel' AND p_campo = 'tipo_imovel' THEN
        v_sn := 'DATASET'; v_sd := 'O tipo do imóvel altera a comparabilidade de amostra do conjunto vigente.';
      ELSIF p_entity = 'imovel_atributo' AND EXISTS (SELECT 1 FROM public.avaliacao_variaveis v WHERE v.avaliacao_id = p_av AND v.ativo
                  AND v.atributo_id = v_attr AND v.campo_origem IS NULL) THEN
        v_sn := 'DATASET'; v_sd := 'A característica de amostra do conjunto vigente alimenta variável.';
      ELSIF p_entity = 'imovel' AND p_campo = 'area_construida' AND public.aval_vars_match(p_av, ARRAY['area_construida','valor_unitario'], false, false) THEN
        v_sn := 'DATASET'; v_sd := 'A área de amostra do conjunto vigente alimenta variável (área ou valor unitário).';
      ELSIF p_entity = 'imovel' AND p_campo = 'area_terreno' AND public.aval_vars_match(p_av, ARRAY['area_terreno'], false, false) THEN
        v_sn := 'DATASET'; v_sd := 'A área do terreno de amostra do conjunto vigente alimenta variável.';
      ELSIF p_entity IN ('imovel','imovel_localizacao') AND p_campo = ANY(c_loc) AND public.aval_vars_match(p_av, c_loc, true, false) THEN
        v_sn := 'DATASET'; v_sd := 'A localização de amostra do conjunto vigente alimenta variável locacional.';
      ELSIF p_entity = 'dado_mercado' AND p_campo = 'valor_utilizado' THEN
        v_sn := 'DATASET'; v_sd := 'O valor utilizado de amostra do conjunto vigente altera a variável dependente.';
      ELSIF p_entity = 'dado_mercado' AND p_campo = 'valor_ofertado'
            AND (SELECT valor_utilizado FROM public.dados_mercado WHERE id = p_entity_id) IS NULL THEN
        v_sn := 'DATASET'; v_sd := 'O valor ofertado é o valor efetivamente utilizado pela amostra do conjunto vigente.';
      ELSIF p_entity = 'dado_mercado' AND p_campo = 'natureza_dado' THEN
        v_sn := 'DATASET'; v_sd := 'A natureza do dado altera o tratamento de amostra do conjunto vigente.';
      ELSIF p_entity = 'amostra' THEN
        v_sn := 'DATASET'; v_sd := 'A origem territorial altera a composição do conjunto vigente.';
      END IF;
    END IF;
    IF public.aval_nivel_rank(v_sn) > public.aval_nivel_rank(v_n) THEN v_n := v_sn; v_d := v_sd; END IF;
  END IF;
  RETURN jsonb_build_object('nivel', v_n, 'descricao', v_d, 'secoes', to_jsonb(v_s));
END $$;

CREATE OR REPLACE FUNCTION public.aval_changes_plan(p_av uuid, p_changes jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE v_org uuid; ch jsonb; i int := 0; v_e text; v_id uuid; v_c text; v_ctx jsonb; v_out jsonb := '[]'; v_outras jsonb; o record;
BEGIN
  SELECT organization_id INTO v_org FROM public.avaliacoes WHERE id = p_av;
  IF v_org IS NULL THEN RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
  IF jsonb_typeof(p_changes) IS DISTINCT FROM 'array' OR jsonb_array_length(p_changes) = 0 OR jsonb_array_length(p_changes) > 60 THEN
    RAISE EXCEPTION 'aval:invalid_changes' USING ERRCODE = '22023';
  END IF;
  FOR ch IN SELECT value FROM jsonb_array_elements(p_changes) LOOP
    IF jsonb_typeof(ch) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'aval:invalid_changes' USING ERRCODE = '22023'; END IF;
    v_e := ch->>'entity_type'; v_c := ch->>'campo'; v_ctx := COALESCE(ch->'contexto', '{}'::jsonb);
    BEGIN v_id := (ch->>'entity_id')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'aval:invalid_changes' USING ERRCODE = '22023'; END;
    IF v_e IS NULL OR v_c IS NULL OR v_id IS NULL OR jsonb_typeof(v_ctx) <> 'object' THEN RAISE EXCEPTION 'aval:invalid_changes' USING ERRCODE = '22023'; END IF;
    IF COALESCE(v_ctx->>'modo', '') NOT IN ('', 'COMPARTILHADO', 'CLONAR') THEN RAISE EXCEPTION 'aval:invalid_changes' USING ERRCODE = '22023'; END IF;
    IF v_ctx->>'modo' = 'CLONAR' AND (v_e NOT IN ('imovel','imovel_localizacao','imovel_atributo') OR (v_ctx->>'dado_id') IS NULL) THEN
      RAISE EXCEPTION 'aval:invalid_changes' USING ERRCODE = '22023';
    END IF;
    v_outras := '[]';
    IF (v_e IN ('imovel','imovel_localizacao','imovel_atributo') AND COALESCE(v_ctx->>'modo', '') <> 'CLONAR') OR v_e IN ('dado_mercado','fonte_principal') THEN
      FOR o IN SELECT a.id, a.codigo FROM public.avaliacoes a
        WHERE a.organization_id = v_org AND a.id <> p_av AND a.status = 'ATIVA'
          AND CASE WHEN v_e IN ('imovel','imovel_localizacao','imovel_atributo') THEN
                 EXISTS (SELECT 1 FROM public.avaliacao_imoveis ai WHERE ai.avaliacao_id = a.id AND ai.imovel_id = v_id)
              OR EXISTS (SELECT 1 FROM public.avaliacao_amostras am JOIN public.dados_mercado d ON d.id = am.dado_id WHERE am.avaliacao_id = a.id AND d.imovel_id = v_id)
            ELSE EXISTS (SELECT 1 FROM public.avaliacao_amostras am WHERE am.avaliacao_id = a.id AND am.dado_id = v_id) END
        ORDER BY a.codigo LOOP
        v_outras := v_outras || jsonb_build_array(jsonb_build_object('avaliacao_id', o.id, 'codigo', o.codigo)
                    || (public.aval_change_level(o.id, v_e, v_c, v_id, '{}'::jsonb) - 'descricao'));
      END LOOP;
    END IF;
    v_out := v_out || jsonb_build_array(jsonb_build_object('i', i, 'entity_type', v_e, 'entity_id', v_id, 'campo', v_c, 'rotulo', ch->>'rotulo')
             || public.aval_change_level(p_av, v_e, v_c, v_id, v_ctx || CASE WHEN v_e = 'variavel' THEN jsonb_build_object('_valor', ch->'valor' #>> '{}') ELSE '{}'::jsonb END) || jsonb_build_object('outras', v_outras));
    i := i + 1;
  END LOOP;
  RETURN v_out;
END $$;

CREATE OR REPLACE FUNCTION public.aval_evaluate_changes_impact(p_avaliacao uuid, p_changes jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE v_plan jsonb; v_max text := 'NO_IMPACT'; e jsonb; o jsonb; v_outras jsonb := '{}'; v_share jsonb := '[]'; x record; s jsonb; k text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'aval:unauthenticated' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.avaliacoes WHERE id = p_avaliacao AND public.aval_is_reader(organization_id)) THEN
    RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501';
  END IF;
  v_plan := public.aval_changes_plan(p_avaliacao, p_changes);
  FOR e IN SELECT value FROM jsonb_array_elements(v_plan) LOOP
    IF public.aval_nivel_rank(e->>'nivel') > public.aval_nivel_rank(v_max) THEN v_max := e->>'nivel'; END IF;
    FOR o IN SELECT value FROM jsonb_array_elements(e->'outras') LOOP
      k := o->>'avaliacao_id';
      IF NOT v_outras ? k OR public.aval_nivel_rank(o->>'nivel') > public.aval_nivel_rank(v_outras->k->>'nivel') THEN
        v_outras := v_outras || jsonb_build_object(k, jsonb_build_object('avaliacao_id', k, 'codigo', o->>'codigo', 'nivel', o->>'nivel'));
      END IF;
    END LOOP;
  END LOOP;
  FOR x IN SELECT DISTINCT (c->>'entity_id')::uuid AS imovel, NULLIF(c->'contexto'->>'dado_id', '')::uuid AS dado
             FROM jsonb_array_elements(p_changes) c WHERE c->>'entity_type' IN ('imovel','imovel_localizacao','imovel_atributo') LOOP
    s := public.aval_imovel_sharing(p_avaliacao, x.imovel, x.dado);
    IF (s->>'compartilhado')::boolean THEN v_share := v_share || jsonb_build_array(s || jsonb_build_object('imovel_id', x.imovel)); END IF;
  END LOOP;
  RETURN jsonb_build_object('nivel', v_max, 'campos', v_plan, 'afetados', public.aval_impact_counts(p_avaliacao, v_max),
    'outras_avaliacoes', COALESCE((SELECT jsonb_agg(value ORDER BY value->>'codigo') FROM jsonb_each(v_outras)), '[]'::jsonb),
    'imoveis_compartilhados', v_share,
    'explicacao', CASE v_max
      WHEN 'DATASET' THEN 'O conjunto congelado atual não muda. Os modelos, a validação e o resultado ficam desatualizados até que uma nova versão do conjunto seja congelada.'
      WHEN 'MODEL' THEN 'Os modelos calculados, a validação e o aceite ficam desatualizados. Calcule novamente para usar a correção.'
      WHEN 'ECONOMIC_RESULT' THEN 'O resultado econômico e a compatibilidade ficam desatualizados.'
      WHEN 'REPORT_ONLY' THEN 'Afeta apenas o texto do laudo; nenhum cálculo é desatualizado.'
      ELSE 'Sem impacto técnico. A alteração fica registrada no histórico.' END);
END $$;

CREATE OR REPLACE FUNCTION public.aval_apply_changes(p_avaliacao uuid, p_changes jsonb, p_motivo text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid(); av record; v_plan jsonb; e jsonb; ch jsonb; o jsonb; v_lote uuid := gen_random_uuid();
  v_e text; v_c text; v_id uuid; v_ctx jsonb; v_txt text; v_tbl text; v_key text; v_target uuid; v_type text; v_num numeric;
  v_old jsonb; v_new jsonb; v_n int; v_perm text; v_share jsonb; v_clone uuid; v_dado uuid; k text;
  v_clones jsonb := '{}'; v_applied jsonb := '[]'; v_idx int[] := '{}';
  v_max text := 'NO_IMPACT'; v_secoes text[] := '{}'; v_outras jsonb := '{}';
  v_dados uuid[]; v_avimv uuid[]; v_before jsonb := '{}'; v_before_av jsonb := '{}'; d record; f text; vv record; cur record;
  v_oldn numeric; v_newn numeric; v_fonte jsonb := '{}'; v_ftipo text; v_fnome text; v_fid uuid; v_facao text;
  v_motivo text := left(NULLIF(btrim(COALESCE(p_motivo, '')), ''), 500); v_mot_inv text;
  at record; vr record; v_amostra uuid; v_col text; v_vid uuid; v_vval numeric; v_fz text; v_fc text; v_fa uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'aval:unauthenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO av FROM public.avaliacoes WHERE id = p_avaliacao;
  IF av.id IS NULL OR NOT public.aval_is_reader(av.organization_id) THEN RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
  IF av.status <> 'ATIVA' THEN RAISE EXCEPTION 'aval:evaluation_not_active' USING ERRCODE = '42501'; END IF;
  v_plan := public.aval_changes_plan(p_avaliacao, p_changes);

  -- 1) Pertencimento e permissão de cada alteração, antes de gravar qualquer coisa.
  FOR ch IN SELECT value FROM jsonb_array_elements(p_changes) LOOP
    v_e := ch->>'entity_type'; v_id := (ch->>'entity_id')::uuid; v_ctx := COALESCE(ch->'contexto', '{}'::jsonb);
    IF v_e = 'avaliacao' THEN
      IF v_id <> p_avaliacao THEN RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
      v_perm := 'evaluation.edit';
    ELSIF v_e = 'valor_administrativo' THEN
      IF NOT EXISTS (SELECT 1 FROM public.avaliacao_valores_administrativos WHERE id = v_id AND avaliacao_id = p_avaliacao AND ativo) THEN
        RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
      v_perm := 'evaluation.edit';
    ELSIF v_e = 'variavel' THEN
      IF NOT EXISTS (SELECT 1 FROM public.avaliacao_variaveis WHERE id = v_id AND avaliacao_id = p_avaliacao) THEN
        RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
      v_perm := 'model.create';
    ELSIF v_e = 'variavel_valor' THEN
      IF NOT EXISTS (SELECT 1 FROM public.avaliacao_variaveis WHERE id = v_id AND avaliacao_id = p_avaliacao) THEN
        RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
      IF NULLIF(v_ctx->>'amostra_id', '') IS NULL THEN v_perm := 'property.edit';
      ELSE
        IF NOT EXISTS (SELECT 1 FROM public.avaliacao_amostras WHERE id = (v_ctx->>'amostra_id')::uuid AND avaliacao_id = p_avaliacao) THEN
          RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
        v_perm := 'market.edit';
      END IF;
    ELSIF v_e IN ('imovel','imovel_localizacao','imovel_atributo') THEN
      IF v_ctx->>'modo' = 'CLONAR' THEN
        IF NOT EXISTS (SELECT 1 FROM public.avaliacao_amostras a JOIN public.dados_mercado dm ON dm.id = a.dado_id
                        WHERE a.avaliacao_id = p_avaliacao AND a.dado_id = (v_ctx->>'dado_id')::uuid AND dm.imovel_id = v_id) THEN
          RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
        v_perm := 'market.edit';
      ELSIF EXISTS (SELECT 1 FROM public.avaliacao_imoveis WHERE avaliacao_id = p_avaliacao AND imovel_id = v_id AND papel = 'AVALIANDO') THEN
        v_perm := 'property.edit';
      ELSIF EXISTS (SELECT 1 FROM public.avaliacao_amostras a JOIN public.dados_mercado dm ON dm.id = a.dado_id
                     WHERE a.avaliacao_id = p_avaliacao AND dm.imovel_id = v_id) THEN
        v_perm := 'market.edit';
        IF COALESCE(v_ctx->>'modo', '') <> 'COMPARTILHADO' THEN
          v_share := public.aval_imovel_sharing(p_avaliacao, v_id, NULLIF(v_ctx->>'dado_id', '')::uuid);
          IF (v_share->>'compartilhado')::boolean THEN RAISE EXCEPTION 'aval:shared_choice_required' USING ERRCODE = '22023'; END IF;
        END IF;
      ELSE
        RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501';
      END IF;
    ELSIF v_e IN ('dado_mercado','fonte_principal') THEN
      IF NOT EXISTS (SELECT 1 FROM public.avaliacao_amostras WHERE avaliacao_id = p_avaliacao AND dado_id = v_id) THEN
        RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
      v_perm := 'market.edit';
    ELSIF v_e = 'amostra' THEN
      IF NOT EXISTS (SELECT 1 FROM public.avaliacao_amostras WHERE avaliacao_id = p_avaliacao AND id = v_id) THEN
        RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
      v_perm := 'market.edit';
    ELSE
      RAISE EXCEPTION 'aval:entity_not_allowed' USING ERRCODE = '22023';
    END IF;
    IF NOT public.aval_can_edit(p_avaliacao, v_perm) THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  END LOOP;

  PERFORM set_config('aval.batch', 'on', true);

  -- 2) "Este anúncio é de outro imóvel": clona o cadastro físico e reatribui somente o dado desta amostra.
  FOR ch IN SELECT value FROM jsonb_array_elements(p_changes) WHERE value->'contexto'->>'modo' = 'CLONAR' LOOP
    v_id := (ch->>'entity_id')::uuid; v_dado := (ch->'contexto'->>'dado_id')::uuid; k := v_id::text || ':' || v_dado::text;
    IF NOT v_clones ? k THEN
      INSERT INTO public.imoveis(organization_id, tipo_imovel, descricao, endereco, numero, complemento, bairro, municipio_nome, municipio_ibge,
        uf, cep, area_construida, area_terreno, padrao, anuncio_url, anuncio_id)
      SELECT organization_id, tipo_imovel, descricao, endereco, numero, complemento, bairro, municipio_nome, municipio_ibge,
        uf, cep, area_construida, area_terreno, padrao, anuncio_url, anuncio_id FROM public.imoveis WHERE id = v_id
      RETURNING id INTO v_clone;
      INSERT INTO public.imovel_localizacao(organization_id, imovel_id, precisao, latitude, longitude, fonte, observacao)
      SELECT organization_id, v_clone, precisao, latitude, longitude, fonte, observacao FROM public.imovel_localizacao WHERE imovel_id = v_id;
      INSERT INTO public.imovel_atributos(organization_id, imovel_id, atributo_id, valor_numeric, valor_text, valor_bool, valor_category, valor_status, fonte)
      SELECT organization_id, v_clone, atributo_id, valor_numeric, valor_text, valor_bool, valor_category, valor_status, fonte FROM public.imovel_atributos WHERE imovel_id = v_id;
      INSERT INTO public.imovel_ambientes(organization_id, imovel_id, tipo, nome, quantidade, area, observacao)
      SELECT organization_id, v_clone, tipo, nome, quantidade, area, observacao FROM public.imovel_ambientes WHERE imovel_id = v_id;
      UPDATE public.dados_mercado SET imovel_id = v_clone WHERE id = v_dado;
      v_clones := v_clones || jsonb_build_object(k, v_clone);
      v_applied := v_applied || jsonb_build_array(jsonb_build_object('entity_type', 'dado_mercado', 'entity_id', v_dado, 'campo', 'imovel_id',
        'anterior', v_id, 'novo', v_clone, 'nivel', NULL));
      PERFORM public.aval_audit(p_avaliacao, 'imovel', v_clone, 'PROPERTY_CLONED',
        jsonb_build_object('imovel_origem', v_id, 'imovel_novo', v_clone, 'dado_id', v_dado, 'lote', v_lote));
    END IF;
  END LOOP;

  -- 3) Estado anterior dos campos que alimentam valor unitário e variáveis.
  SELECT COALESCE(array_agg(DISTINCT x.id), '{}') INTO v_dados FROM (
    SELECT (c->>'entity_id')::uuid AS id FROM jsonb_array_elements(p_changes) c WHERE c->>'entity_type' = 'dado_mercado'
    UNION SELECT dm.id FROM jsonb_array_elements(p_changes) c JOIN public.dados_mercado dm ON dm.imovel_id = (c->>'entity_id')::uuid
     WHERE c->>'entity_type' = 'imovel' AND COALESCE(c->'contexto'->>'modo', '') <> 'CLONAR'
    UNION SELECT (c->'contexto'->>'dado_id')::uuid FROM jsonb_array_elements(p_changes) c
     WHERE c->>'entity_type' = 'imovel' AND c->'contexto'->>'modo' = 'CLONAR') x;
  FOR d IN SELECT dm.id, dm.valor_utilizado, dm.valor_unitario, i.area_construida, i.area_terreno
             FROM public.dados_mercado dm JOIN public.imoveis i ON i.id = dm.imovel_id WHERE dm.id = ANY(v_dados) LOOP
    v_before := v_before || jsonb_build_object(d.id::text, jsonb_build_object('valor_utilizado', d.valor_utilizado, 'valor_unitario', d.valor_unitario,
      'area_construida', d.area_construida, 'area_terreno', d.area_terreno));
  END LOOP;
  SELECT COALESCE(array_agg(DISTINCT (c->>'entity_id')::uuid), '{}') INTO v_avimv FROM jsonb_array_elements(p_changes) c
   WHERE c->>'entity_type' = 'imovel' AND COALESCE(c->'contexto'->>'modo', '') <> 'CLONAR';
  FOR d IN SELECT i.id, i.area_construida, i.area_terreno FROM public.imoveis i WHERE i.id = ANY(v_avimv)
             AND EXISTS (SELECT 1 FROM public.avaliacao_imoveis ai WHERE ai.imovel_id = i.id) LOOP
    v_before_av := v_before_av || jsonb_build_object(d.id::text, jsonb_build_object('area_construida', d.area_construida, 'area_terreno', d.area_terreno));
  END LOOP;

  -- 4) Campos efetivamente alterados (somente colunas da lista permitida; valores validados).
  FOR e IN SELECT value FROM jsonb_array_elements(v_plan) LOOP
    ch := p_changes -> ((e->>'i')::int);
    v_e := ch->>'entity_type'; v_c := ch->>'campo'; v_id := (ch->>'entity_id')::uuid; v_ctx := COALESCE(ch->'contexto', '{}'::jsonb);
    v_txt := NULLIF(btrim(ch->'valor' #>> '{}'), '');
    IF length(v_txt) > 2000 THEN RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023'; END IF;
    -- Característica dinâmica do imóvel (imovel_atributos): grava na própria fonte, validando o tipo do atributo.
    IF v_e = 'imovel_atributo' THEN
      v_target := v_id;
      IF v_ctx->>'modo' = 'CLONAR' THEN v_target := (v_clones ->> (v_id::text || ':' || (v_ctx->>'dado_id')))::uuid; END IF;
      SELECT id, codigo, data_type, opcoes INTO at FROM public.atributos_imobiliarios WHERE codigo = v_c AND ativo
         AND (organization_id IS NULL OR organization_id = av.organization_id) ORDER BY organization_id NULLS LAST LIMIT 1;
      v_col := CASE at.data_type WHEN 'NUMERIC' THEN 'valor_numeric' WHEN 'BOOL' THEN 'valor_bool' WHEN 'CATEGORY' THEN 'valor_category'
                                 WHEN 'STATUS' THEN 'valor_status' ELSE 'valor_text' END;
      EXECUTE format('SELECT to_jsonb(t) -> %L FROM public.imovel_atributos t WHERE imovel_id = $1 AND atributo_id = $2', v_col) INTO v_old USING v_target, at.id;
      IF v_txt IS NULL THEN
        DELETE FROM public.imovel_atributos WHERE imovel_id = v_target AND atributo_id = at.id;
        GET DIAGNOSTICS v_n = ROW_COUNT;
      ELSE
        BEGIN
          IF at.data_type = 'NUMERIC' THEN
            v_num := v_txt::numeric;
            IF v_num < 0 OR (at.codigo LIKE 'AREA%' AND v_num <= 0) THEN RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023'; END IF;
          ELSIF at.data_type = 'BOOL' AND v_txt NOT IN ('true','false') THEN RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023';
          ELSIF at.data_type = 'STATUS' AND v_txt NOT IN ('POSSUI','NAO_POSSUI','NAO_VERIFICADO') THEN RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023';
          ELSIF at.data_type = 'CATEGORY' AND at.opcoes IS NOT NULL AND NOT (at.opcoes ? v_txt) THEN RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023';
          END IF;
          EXECUTE format('INSERT INTO public.imovel_atributos AS t (organization_id, imovel_id, atributo_id, %1$I, fonte) VALUES ($1, $2, $3, $4::%2$s, ''AVALIACAO'')
             ON CONFLICT (imovel_id, atributo_id) DO UPDATE SET %1$I = EXCLUDED.%1$I, fonte = ''AVALIACAO'' WHERE t.%1$I IS DISTINCT FROM EXCLUDED.%1$I',
             v_col, CASE at.data_type WHEN 'NUMERIC' THEN 'numeric' WHEN 'BOOL' THEN 'boolean' ELSE 'text' END)
            USING av.organization_id, v_target, at.id, v_txt;
          GET DIAGNOSTICS v_n = ROW_COUNT;
        EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range OR check_violation THEN
          RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023';
        END;
      END IF;
      IF v_n > 0 THEN
        EXECUTE format('SELECT to_jsonb(t) -> %L FROM public.imovel_atributos t WHERE imovel_id = $1 AND atributo_id = $2', v_col) INTO v_new USING v_target, at.id;
        v_applied := v_applied || jsonb_build_array(jsonb_build_object('entity_type', v_e, 'entity_id', v_target, 'campo', v_c,
          'anterior', v_old, 'novo', v_new, 'nivel', e->>'nivel'));
        v_idx := v_idx || (e->>'i')::int;
      END IF;
      CONTINUE;
    END IF;
    -- Valor de variável manual/derivada (avaliando ou amostra).
    IF v_e = 'variavel_valor' THEN
      v_amostra := NULLIF(v_ctx->>'amostra_id', '')::uuid;
      BEGIN v_num := v_txt::numeric;
      EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023'; END;
      SELECT x.id, x.valor INTO v_vid, v_vval FROM public.avaliacao_variavel_valores x WHERE x.variavel_id = v_id
         AND CASE WHEN v_amostra IS NULL THEN x.scope_type = 'AVALIANDO' ELSE x.scope_type = 'AMOSTRA' AND x.amostra_id = v_amostra END;
      v_n := 0;
      IF v_vid IS NULL AND v_num IS NOT NULL THEN
        INSERT INTO public.avaliacao_variavel_valores(organization_id, avaliacao_id, variavel_id, scope_type, amostra_id, valor, origem)
        VALUES (av.organization_id, p_avaliacao, v_id, CASE WHEN v_amostra IS NULL THEN 'AVALIANDO' ELSE 'AMOSTRA' END, v_amostra, v_num, 'MANUAL');
        v_n := 1;
      ELSIF v_vid IS NOT NULL AND v_vval IS DISTINCT FROM v_num THEN
        UPDATE public.avaliacao_variavel_valores SET valor = v_num, origem = 'MANUAL' WHERE id = v_vid;
        v_n := 1;
      END IF;
      IF v_n > 0 THEN
        v_applied := v_applied || jsonb_build_array(jsonb_build_object('entity_type', v_e, 'entity_id', v_id, 'campo', 'valor',
          'anterior', v_vval, 'novo', v_num, 'nivel', e->>'nivel') || CASE WHEN v_amostra IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('amostra_id', v_amostra) END);
        v_idx := v_idx || (e->>'i')::int;
      END IF;
      CONTINUE;
    END IF;
    -- Origem dos valores da variável: campo do cadastro, atributo do imóvel ou digitação manual.
    IF v_e = 'variavel' AND v_c = 'fonte' THEN
      SELECT * INTO vr FROM public.avaliacao_variaveis WHERE id = v_id;
      v_fz := 'MANUAL'; v_fc := NULL; v_fa := NULL;
      IF v_txt LIKE 'campo:%' THEN
        v_fc := substr(v_txt, 7);
        IF v_fc NOT IN ('valor_utilizado','valor_unitario','area_construida','area_terreno') THEN RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023'; END IF;
        v_fz := 'CAMPO_DADO_MERCADO';
      ELSIF v_txt LIKE 'atributo:%' THEN
        SELECT id INTO v_fa FROM public.atributos_imobiliarios WHERE codigo = substr(v_txt, 10) AND ativo
           AND (organization_id IS NULL OR organization_id = av.organization_id) ORDER BY organization_id NULLS LAST LIMIT 1;
        IF v_fa IS NULL THEN RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023'; END IF;
        v_fz := 'ATRIBUTO_IMOBILIARIO';
      ELSIF v_txt IS DISTINCT FROM 'manual' THEN RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023';
      END IF;
      IF vr.origem_tipo IS DISTINCT FROM v_fz OR vr.campo_origem IS DISTINCT FROM v_fc OR vr.atributo_id IS DISTINCT FROM v_fa THEN
        UPDATE public.avaliacao_variaveis SET origem_tipo = v_fz, campo_origem = v_fc, atributo_id = v_fa WHERE id = v_id;
        v_applied := v_applied || jsonb_build_array(jsonb_build_object('entity_type', v_e, 'entity_id', v_id, 'campo', 'fonte',
          'anterior', jsonb_build_object('origem_tipo', vr.origem_tipo, 'campo_origem', vr.campo_origem, 'atributo_id', vr.atributo_id),
          'novo', jsonb_build_object('origem_tipo', v_fz, 'campo_origem', v_fc, 'atributo_id', v_fa), 'nivel', e->>'nivel'));
        v_idx := v_idx || (e->>'i')::int;
      END IF;
      CONTINUE;
    END IF;
    IF v_e = 'variavel' AND v_c = 'papel' AND v_txt = 'DEPENDENTE' AND EXISTS (SELECT 1 FROM public.avaliacao_variaveis
         WHERE avaliacao_id = p_avaliacao AND ativo AND papel = 'DEPENDENTE' AND id <> v_id) THEN
      RAISE EXCEPTION 'aval:dependent_exists' USING ERRCODE = '22023';
    END IF;
    IF v_e = 'fonte_principal' THEN
      v_fonte := v_fonte || jsonb_build_object(v_id::text, COALESCE(v_fonte->(v_id::text), '{}'::jsonb)
                 || jsonb_build_object(v_c, v_txt, 'idx', COALESCE(v_fonte->(v_id::text)->'idx', '[]'::jsonb) || to_jsonb((e->>'i')::int)));
      CONTINUE;
    END IF;
    v_tbl := CASE v_e WHEN 'avaliacao' THEN 'avaliacoes' WHEN 'valor_administrativo' THEN 'avaliacao_valores_administrativos'
      WHEN 'imovel' THEN 'imoveis' WHEN 'imovel_localizacao' THEN 'imovel_localizacao' WHEN 'dado_mercado' THEN 'dados_mercado'
      WHEN 'amostra' THEN 'avaliacao_amostras' WHEN 'variavel' THEN 'avaliacao_variaveis' END;
    v_key := CASE WHEN v_e = 'imovel_localizacao' THEN 'imovel_id' ELSE 'id' END;
    v_target := v_id;
    IF v_e IN ('imovel','imovel_localizacao') AND v_ctx->>'modo' = 'CLONAR' THEN
      v_target := (v_clones ->> (v_id::text || ':' || (v_ctx->>'dado_id')))::uuid;
    END IF;
    SELECT format_type(a.atttypid, a.atttypmod) INTO v_type FROM pg_attribute a
     WHERE a.attrelid = ('public.' || v_tbl)::regclass AND a.attname = v_c AND a.attnum > 0 AND NOT a.attisdropped;
    IF v_type IS NULL THEN RAISE EXCEPTION 'aval:field_not_allowed' USING ERRCODE = '22023'; END IF;
    IF v_e = 'imovel_localizacao' AND NOT EXISTS (SELECT 1 FROM public.imovel_localizacao WHERE imovel_id = v_target) THEN
      INSERT INTO public.imovel_localizacao(imovel_id) VALUES (v_target);
    END IF;
    EXECUTE format('SELECT to_jsonb(t) -> %L FROM public.%I t WHERE %I = $1', v_c, v_tbl, v_key) INTO v_old USING v_target;
    BEGIN
      IF v_c IN ('tipo_imovel','tipo','valor','valor_utilizado','natureza_dado','origem_territorial','precisao','papel','relacao_esperada','nome','tipo_variavel','obrigatoria') AND v_txt IS NULL THEN
        RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023';
      END IF;
      IF v_type LIKE 'numeric%' AND v_txt IS NOT NULL THEN
        v_num := v_txt::numeric;
        IF (v_c IN ('area_construida','area_terreno','valor','valor_utilizado') AND v_num <= 0) OR (v_c = 'valor_ofertado' AND v_num < 0)
           OR (v_c = 'latitude' AND NOT v_num BETWEEN -90 AND 90) OR (v_c = 'longitude' AND NOT v_num BETWEEN -180 AND 180) THEN
          RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023';
        END IF;
      END IF;
      EXECUTE format('UPDATE public.%I SET %I = $1::%s WHERE %I = $2 AND %I IS DISTINCT FROM $1::%s', v_tbl, v_c, v_type, v_key, v_c, v_type)
        USING v_txt, v_target;
      GET DIAGNOSTICS v_n = ROW_COUNT;
    EXCEPTION WHEN invalid_text_representation OR invalid_datetime_format OR datetime_field_overflow OR numeric_value_out_of_range
                 OR check_violation OR not_null_violation OR string_data_right_truncation THEN
      RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023';
    END;
    IF v_n > 0 THEN
      EXECUTE format('SELECT to_jsonb(t) -> %L FROM public.%I t WHERE %I = $1', v_c, v_tbl, v_key) INTO v_new USING v_target;
      v_applied := v_applied || jsonb_build_array(jsonb_build_object('entity_type', v_e, 'entity_id', v_target, 'campo', v_c,
        'anterior', v_old, 'novo', v_new, 'nivel', e->>'nivel'));
      v_idx := v_idx || (e->>'i')::int;
    END IF;
  END LOOP;

  -- 5) Fonte principal: reutiliza fonte equivalente, atualiza a própria se exclusiva ou cria nova; nunca duplica sem necessidade.
  FOR k IN SELECT jsonb_object_keys(v_fonte) LOOP
    v_dado := k::uuid;
    cur := NULL;
    SELECT df.id AS link_id, f.id AS fonte_id, f.tipo, f.nome INTO cur FROM public.dados_mercado_fontes df JOIN public.fontes_mercado f ON f.id = df.fonte_id
     WHERE df.dado_id = v_dado AND df.principal ORDER BY df.created_at LIMIT 1;
    v_ftipo := CASE WHEN v_fonte->k ? 'tipo' THEN v_fonte->k->>'tipo' ELSE cur.tipo END;
    v_fnome := CASE WHEN v_fonte->k ? 'nome' THEN v_fonte->k->>'nome' ELSE cur.nome END;
    IF v_fnome IS NULL THEN
      IF cur.link_id IS NOT NULL THEN
        DELETE FROM public.dados_mercado_fontes WHERE id = cur.link_id; v_facao := 'DESVINCULADA';
      ELSE CONTINUE; END IF;
    ELSE
      v_ftipo := COALESCE(v_ftipo, 'OUTRO');
      IF v_ftipo NOT IN ('IMOBILIARIA','CORRETOR','PROPRIETARIO','PORTAL','ORGAO_PUBLICO','REDE_SOCIAL','PLACA','OUTRO') THEN
        RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023'; END IF;
      IF cur.fonte_id IS NOT NULL AND cur.tipo = v_ftipo AND cur.nome = v_fnome THEN CONTINUE; END IF;
      v_fid := NULL;
      SELECT id INTO v_fid FROM public.fontes_mercado WHERE organization_id = av.organization_id AND tipo = v_ftipo
         AND public.aval_normalize_text(nome) = public.aval_normalize_text(v_fnome) ORDER BY (id = cur.fonte_id) DESC, created_at LIMIT 1;
      IF v_fid IS NOT NULL THEN v_facao := 'REUTILIZADA';
        IF v_fid = cur.fonte_id THEN UPDATE public.fontes_mercado SET nome = v_fnome WHERE id = v_fid; v_facao := 'ATUALIZADA'; END IF;
      ELSIF cur.fonte_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.dados_mercado_fontes WHERE fonte_id = cur.fonte_id AND dado_id <> v_dado) THEN
        UPDATE public.fontes_mercado SET tipo = v_ftipo, nome = v_fnome WHERE id = cur.fonte_id; v_fid := cur.fonte_id; v_facao := 'ATUALIZADA';
      ELSE
        INSERT INTO public.fontes_mercado(organization_id, tipo, nome) VALUES (av.organization_id, v_ftipo, v_fnome) RETURNING id INTO v_fid; v_facao := 'CRIADA';
      END IF;
      IF cur.link_id IS NULL THEN
        INSERT INTO public.dados_mercado_fontes(organization_id, dado_id, fonte_id, principal) VALUES (av.organization_id, v_dado, v_fid, true);
      ELSIF cur.fonte_id <> v_fid THEN
        UPDATE public.dados_mercado_fontes SET fonte_id = v_fid WHERE id = cur.link_id;
      END IF;
    END IF;
    v_applied := v_applied || jsonb_build_array(jsonb_build_object('entity_type', 'fonte_principal', 'entity_id', v_dado, 'campo', 'fonte',
      'anterior', CASE WHEN cur.fonte_id IS NULL THEN NULL ELSE jsonb_build_object('tipo', cur.tipo, 'nome', cur.nome) END,
      'novo', CASE WHEN v_fnome IS NULL THEN NULL ELSE jsonb_build_object('tipo', v_ftipo, 'nome', v_fnome) END, 'acao', v_facao, 'nivel', 'REPORT_ONLY'));
    v_idx := v_idx || ARRAY(SELECT jsonb_array_elements_text(v_fonte->k->'idx')::int);
  END LOOP;

  -- 6) Derivado: valor unitário = valor utilizado ÷ área construída (4 casas), quando um dos dois mudou.
  FOR d IN SELECT dm.id, dm.valor_unitario AS antes, dm.valor_utilizado, i.area_construida,
                  CASE WHEN i.area_construida > 0 AND dm.valor_utilizado IS NOT NULL THEN round(dm.valor_utilizado / i.area_construida, 4) END AS depois
             FROM public.dados_mercado dm JOIN public.imoveis i ON i.id = dm.imovel_id WHERE dm.id = ANY(v_dados) LOOP
    IF ((v_before->(d.id::text)->>'valor_utilizado')::numeric IS DISTINCT FROM d.valor_utilizado
        OR (v_before->(d.id::text)->>'area_construida')::numeric IS DISTINCT FROM d.area_construida)
       AND d.antes IS DISTINCT FROM d.depois THEN
      UPDATE public.dados_mercado SET valor_unitario = d.depois WHERE id = d.id;
      v_applied := v_applied || jsonb_build_array(jsonb_build_object('entity_type', 'dado_mercado', 'entity_id', d.id, 'campo', 'valor_unitario',
        'anterior', d.antes, 'novo', d.depois, 'derivado', true, 'nivel', NULL));
    END IF;
  END LOOP;

  -- 7) Valores de variáveis preenchidos a partir do cadastro (somente os que ainda espelham o valor anterior; avaliações ativas da organização).
  FOR d IN SELECT dm.id, dm.valor_utilizado, dm.valor_unitario, i.area_construida, i.area_terreno
             FROM public.dados_mercado dm JOIN public.imoveis i ON i.id = dm.imovel_id WHERE dm.id = ANY(v_dados) LOOP
    FOREACH f IN ARRAY ARRAY['valor_utilizado','valor_unitario','area_construida','area_terreno'] LOOP
      v_oldn := (v_before->(d.id::text)->>f)::numeric;
      v_newn := (to_jsonb(d)->>f)::numeric;
      IF v_oldn IS DISTINCT FROM v_newn THEN
        FOR vv IN UPDATE public.avaliacao_variavel_valores x SET valor = v_newn
                   FROM public.avaliacao_variaveis v, public.avaliacao_amostras a, public.avaliacoes a2
                  WHERE v.id = x.variavel_id AND v.campo_origem = f AND x.scope_type = 'AMOSTRA' AND x.amostra_id = a.id AND a.dado_id = d.id
                    AND a2.id = a.avaliacao_id AND a2.status = 'ATIVA' AND a2.organization_id = av.organization_id
                    AND x.valor IS NOT DISTINCT FROM v_oldn
                  RETURNING x.id, x.avaliacao_id, v.codigo, a.id AS amostra_id LOOP
          PERFORM public.aval_audit(vv.avaliacao_id, 'variavel_valor_amostra', vv.id, 'VARIABLE_VALUE_SYNCED',
            jsonb_build_object('variavel', vv.codigo, 'amostra_id', vv.amostra_id, 'anterior', v_oldn, 'novo', v_newn, 'lote', v_lote));
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;
  FOR d IN SELECT i.id, i.area_construida, i.area_terreno FROM public.imoveis i WHERE i.id = ANY(v_avimv) AND v_before_av ? i.id::text LOOP
    FOREACH f IN ARRAY ARRAY['area_construida','area_terreno'] LOOP
      v_oldn := (v_before_av->(d.id::text)->>f)::numeric;
      v_newn := (to_jsonb(d)->>f)::numeric;
      IF v_oldn IS DISTINCT FROM v_newn THEN
        FOR vv IN UPDATE public.avaliacao_variavel_valores x SET valor = v_newn
                   FROM public.avaliacao_variaveis v, public.avaliacao_imoveis ai, public.avaliacoes a2
                  WHERE v.id = x.variavel_id AND v.campo_origem = f AND x.scope_type = 'AVALIANDO' AND ai.avaliacao_id = x.avaliacao_id
                    AND ai.imovel_id = d.id AND ai.papel = 'AVALIANDO' AND a2.id = x.avaliacao_id AND a2.status = 'ATIVA'
                    AND a2.organization_id = av.organization_id AND x.valor IS NOT DISTINCT FROM v_oldn
                  RETURNING x.id, x.avaliacao_id, v.codigo LOOP
          PERFORM public.aval_audit(vv.avaliacao_id, 'variavel_valor_avaliando', vv.id, 'VARIABLE_VALUE_SYNCED',
            jsonb_build_object('variavel', vv.codigo, 'anterior', v_oldn, 'novo', v_newn, 'lote', v_lote));
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;

  -- Valores do avaliando vindos do cadastro (fonte da verdade) ficam alinhados à fonte.
  PERFORM public.aval_sync_avaliando(p_avaliacao);
  PERFORM set_config('aval.batch', 'off', true);
  IF jsonb_array_length(v_applied) = 0 THEN
    RETURN jsonb_build_object('nivel', 'NO_IMPACT', 'aplicados', 0, 'lote', v_lote);
  END IF;

  -- 8) Uma única invalidação por avaliação, pelo maior nível dos campos efetivamente alterados.
  FOR e IN SELECT value FROM jsonb_array_elements(v_plan) WHERE (value->>'i')::int = ANY(v_idx) LOOP
    IF public.aval_nivel_rank(e->>'nivel') > public.aval_nivel_rank(v_max) THEN v_max := e->>'nivel'; END IF;
    v_secoes := v_secoes || ARRAY(SELECT jsonb_array_elements_text(e->'secoes'));
    FOR o IN SELECT value FROM jsonb_array_elements(e->'outras') LOOP
      k := o->>'avaliacao_id';
      IF NOT v_outras ? k OR public.aval_nivel_rank(o->>'nivel') > public.aval_nivel_rank(v_outras->k->>'nivel') THEN
        v_outras := v_outras || jsonb_build_object(k, jsonb_build_object('nivel', o->>'nivel', 'codigo', o->>'codigo',
          'secoes', COALESCE(v_outras->k->'secoes', '[]'::jsonb) || o->'secoes'));
      ELSE
        v_outras := jsonb_set(v_outras, ARRAY[k, 'secoes'], (v_outras->k->'secoes') || o->'secoes');
      END IF;
    END LOOP;
  END LOOP;
  v_mot_inv := 'Correção de dados (' || jsonb_array_length(v_applied) || ' campo(s))' || COALESCE(': ' || v_motivo, '');
  PERFORM public.aval_invalidate(p_avaliacao, v_max, v_mot_inv, CASE WHEN v_max = 'REPORT_ONLY' THEN v_secoes END);
  FOR k IN SELECT jsonb_object_keys(v_outras) LOOP
    PERFORM public.aval_invalidate(k::uuid, v_outras->k->>'nivel', 'Correção de cadastro compartilhado feita na avaliação ' || av.codigo,
      CASE WHEN v_outras->k->>'nivel' = 'REPORT_ONLY' THEN ARRAY(SELECT jsonb_array_elements_text(v_outras->k->'secoes')) END);
    PERFORM public.aval_audit(k::uuid, 'avaliacao', k::uuid, 'SHARED_RECORD_CHANGED',
      jsonb_build_object('origem_avaliacao', av.codigo, 'nivel', v_outras->k->>'nivel', 'lote', v_lote));
  END LOOP;

  -- 9) Trilha antes/depois por campo.
  FOR o IN SELECT value FROM jsonb_array_elements(v_applied) LOOP
    PERFORM public.aval_audit(p_avaliacao, o->>'entity_type', (o->>'entity_id')::uuid, 'CHANGE_APPLIED',
      jsonb_build_object('campo', o->>'campo', 'anterior', o->'anterior', 'novo', o->'novo', 'nivel', COALESCE(o->>'nivel', v_max),
        'motivo', v_motivo, 'lote', v_lote) || CASE WHEN o ? 'derivado' THEN jsonb_build_object('derivado', true) ELSE '{}'::jsonb END
        || CASE WHEN o ? 'acao' THEN jsonb_build_object('acao', o->'acao') ELSE '{}'::jsonb END);
  END LOOP;
  PERFORM public.aval_audit(p_avaliacao, 'avaliacao', p_avaliacao, 'CHANGES_APPLIED',
    jsonb_build_object('lote', v_lote, 'nivel', v_max, 'campos', jsonb_array_length(v_applied), 'motivo', v_motivo,
      'outras_avaliacoes', (SELECT count(*) FROM jsonb_object_keys(v_outras))));
  RETURN jsonb_build_object('nivel', v_max, 'aplicados', jsonb_array_length(v_applied), 'lote', v_lote,
    'outras_avaliacoes', (SELECT count(*) FROM jsonb_object_keys(v_outras)), 'imoveis_clonados', v_clones);
END $$;

CREATE OR REPLACE FUNCTION public.aval_trg_inv_variaveis() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.aval_batch_active() THEN RETURN NEW; END IF;
  IF (NEW.origem_tipo IS DISTINCT FROM OLD.origem_tipo OR NEW.campo_origem IS DISTINCT FROM OLD.campo_origem
      OR NEW.atributo_id IS DISTINCT FROM OLD.atributo_id OR NEW.codigo IS DISTINCT FROM OLD.codigo)
     AND (public.aval_variable_in_use(NEW.id) OR public.aval_var_no_conjunto(OLD.id)) THEN
    PERFORM public.aval_invalidate(NEW.avaliacao_id, 'DATASET', 'Origem dos valores de variável alterada — criar nova versão do conjunto');
  ELSIF NEW.papel IS DISTINCT FROM OLD.papel AND 'DEPENDENTE' IN (NEW.papel, OLD.papel) AND public.aval_variable_in_use(NEW.id) THEN
    PERFORM public.aval_invalidate(NEW.avaliacao_id, 'MODEL', 'Variável dependente alterada');
  ELSIF (NEW.relacao_esperada IS DISTINCT FROM OLD.relacao_esperada OR NEW.tipo_variavel IS DISTINCT FROM OLD.tipo_variavel
         OR NEW.categorica IS DISTINCT FROM OLD.categorica) AND public.aval_variable_in_use(NEW.id) THEN
    PERFORM public.aval_invalidate(NEW.avaliacao_id, 'VALIDATION', 'Relação esperada/tipo de variável alterado');
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.aval_dataset_freeze(p_conjunto uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; v_prev int; v_n int; v_av_imovel uuid; v_dados jsonb; v_falta jsonb;
BEGIN
  SELECT * INTO c FROM public.avaliacao_conjuntos_dados WHERE id = p_conjunto;
  IF c.id IS NULL OR NOT public.aval_can_edit(c.avaliacao_id, 'market.select_samples') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  IF c.status <> 'RASCUNHO' THEN RAISE EXCEPTION 'aval:dataset_frozen' USING ERRCODE = '42501'; END IF;
  SELECT count(*) INTO v_n FROM public.avaliacao_conjunto_amostras WHERE conjunto_id = p_conjunto;
  IF v_n = 0 THEN RAISE EXCEPTION 'aval:dataset_empty' USING ERRCODE = '22023'; END IF;
  -- Amostras habilitadas precisam de todas as variáveis obrigatórias (lidas da fonte configurada).
  SELECT jsonb_agg(jsonb_build_object('amostra', x.indice, 'faltando', to_jsonb(x.nomes)) ORDER BY x.indice) INTO v_falta FROM (
    SELECT idx.indice, array_agg(v.nome ORDER BY v.created_at, v.id) AS nomes
      FROM public.avaliacao_conjunto_amostras ca
      JOIN (SELECT a2.id, row_number() OVER (ORDER BY a2.created_at, a2.id) AS indice FROM public.avaliacao_amostras a2 WHERE a2.avaliacao_id = c.avaliacao_id) idx
        ON idx.id = ca.amostra_id
      JOIN public.dados_mercado d ON d.id = ca.dado_id
      JOIN public.avaliacao_variaveis v ON v.avaliacao_id = c.avaliacao_id AND v.ativo AND v.obrigatoria
     WHERE ca.conjunto_id = p_conjunto AND ca.habilitada_modelo
       AND public.aval_var_resolve(v.id, d.imovel_id, d.id, ca.amostra_id) IS NULL
     GROUP BY idx.indice ORDER BY idx.indice LIMIT 50) x;
  IF v_falta IS NOT NULL THEN
    RAISE EXCEPTION 'aval:dataset_incomplete' USING ERRCODE = '22023', DETAIL = v_falta::text;
  END IF;
  PERFORM public.aval_sync_avaliando(c.avaliacao_id);
  INSERT INTO public.avaliacao_amostra_snapshots(organization_id, avaliacao_id, conjunto_id, amostra_id, dado_id, imovel_id, dados, hash)
  SELECT c.organization_id, c.avaliacao_id, c.id, ca.amostra_id, ca.dado_id, d.imovel_id, s.dados, public.aval_hash(s.dados)
    FROM public.avaliacao_conjunto_amostras ca
    JOIN public.dados_mercado d ON d.id = ca.dado_id
    JOIN public.avaliacao_amostras a ON a.id = ca.amostra_id
    CROSS JOIN LATERAL (SELECT jsonb_build_object(
      'amostra', to_jsonb(a) - 'updated_at', 'habilitada_modelo', ca.habilitada_modelo, 'dado', to_jsonb(d),
      'imovel', (SELECT to_jsonb(i) FROM public.imoveis i WHERE i.id = d.imovel_id),
      'localizacao', (SELECT to_jsonb(l) FROM public.imovel_localizacao l WHERE l.imovel_id = d.imovel_id),
      'atributos', COALESCE((SELECT jsonb_object_agg(at.codigo, jsonb_build_object('numeric', ia.valor_numeric, 'text', ia.valor_text, 'bool', ia.valor_bool, 'category', ia.valor_category, 'status', ia.valor_status))
                     FROM public.imovel_atributos ia JOIN public.atributos_imobiliarios at ON at.id = ia.atributo_id WHERE ia.imovel_id = d.imovel_id), '{}'),
      'ambientes', COALESCE((SELECT jsonb_agg(jsonb_build_object('tipo', am.tipo, 'quantidade', am.quantidade, 'area', am.area)) FROM public.imovel_ambientes am WHERE am.imovel_id = d.imovel_id), '[]'),
      'fontes', COALESCE((SELECT jsonb_agg(jsonb_build_object('tipo', f.tipo, 'nome', f.nome)) FROM public.dados_mercado_fontes df JOIN public.fontes_mercado f ON f.id = df.fonte_id WHERE df.dado_id = d.id), '[]'),
      'variaveis', COALESCE((SELECT jsonb_object_agg(v.codigo, public.aval_var_resolve(v.id, d.imovel_id, d.id, a.id)) FROM public.avaliacao_variaveis v
                     WHERE v.avaliacao_id = c.avaliacao_id AND (v.ativo OR EXISTS (SELECT 1 FROM public.avaliacao_variavel_valores vv
                       WHERE vv.variavel_id = v.id AND vv.amostra_id = a.id AND vv.scope_type = 'AMOSTRA'))), '{}'),
      'variaveis_origem', COALESCE((SELECT jsonb_object_agg(v.codigo, CASE public.aval_var_fonte(v.campo_origem, v.atributo_id)
                       WHEN 'MERCADO' THEN 'dados_mercado.' || v.campo_origem WHEN 'IMOVEL' THEN 'imoveis.' || v.campo_origem
                       WHEN 'ATRIBUTO' THEN 'imovel_atributos.' || (SELECT at2.codigo FROM public.atributos_imobiliarios at2 WHERE at2.id = v.atributo_id)
                       ELSE 'avaliacao_variavel_valores' END) FROM public.avaliacao_variaveis v
                     WHERE v.avaliacao_id = c.avaliacao_id AND (v.ativo OR EXISTS (SELECT 1 FROM public.avaliacao_variavel_valores vv
                       WHERE vv.variavel_id = v.id AND vv.amostra_id = a.id AND vv.scope_type = 'AMOSTRA'))), '{}')
    ) AS dados) s
   WHERE ca.conjunto_id = p_conjunto;
  SELECT imovel_id INTO v_av_imovel FROM public.avaliacao_imoveis WHERE avaliacao_id = c.avaliacao_id AND papel = 'AVALIANDO';
  IF v_av_imovel IS NOT NULL THEN
    v_dados := jsonb_build_object('imovel', (SELECT to_jsonb(i) FROM public.imoveis i WHERE i.id = v_av_imovel),
      'atributos', COALESCE((SELECT jsonb_agg(to_jsonb(ia)) FROM public.imovel_atributos ia WHERE ia.imovel_id = v_av_imovel), '[]'),
      'ambientes', COALESCE((SELECT jsonb_agg(to_jsonb(am)) FROM public.imovel_ambientes am WHERE am.imovel_id = v_av_imovel), '[]'));
    INSERT INTO public.imovel_snapshots(organization_id, imovel_id, avaliacao_id, motivo, dados, hash, created_by)
    VALUES (c.organization_id, v_av_imovel, c.avaliacao_id, 'CONJUNTO_CONGELADO_V' || c.versao, v_dados, public.aval_hash(v_dados), auth.uid());
  END IF;
  UPDATE public.avaliacao_conjuntos_dados SET status = 'SUPERADO' WHERE avaliacao_id = c.avaliacao_id AND id <> c.id AND status IN ('CONGELADO','EM_USO');
  GET DIAGNOSTICS v_prev = ROW_COUNT;
  UPDATE public.avaliacao_conjuntos_dados SET status = 'CONGELADO', congelado_em = now(), congelado_por = auth.uid() WHERE id = c.id;
  IF v_prev > 0 THEN
    PERFORM public.aval_invalidate(c.avaliacao_id, 'DATASET', 'Nova versão do conjunto de dados congelada (V' || c.versao || ')');
  END IF;
  PERFORM public.aval_audit(c.avaliacao_id, 'conjunto_dados', c.id, 'DATASET_FROZEN', jsonb_build_object('versao', c.versao, 'amostras', v_n));
  PERFORM public.aval_bump_stage(c.avaliacao_id, 'MODELAGEM');
  RETURN c.id;
END $$;

CREATE OR REPLACE FUNCTION public.aval_pendencias(p_avaliacao uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE av record; v_out jsonb := '[]'::jsonb; p text[]; e text;
  v_req text[]; n_sel int; c_vig record; n_mod int; n_calc int; n_stale int; ac record; res record; lv record; n_sec int; n_apr int; n_sstale int;
  v_has_imovel boolean; v_vist boolean; st jsonb; n_dep int; n_ind int; v_avf text[]; n_inc int;
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
  e := CASE WHEN n_sel = 0 THEN 'PENDENTE' WHEN c_vig.id IS NULL THEN 'EM_ANDAMENTO' WHEN cardinality(p) > (CASE WHEN n_inc > 0 THEN 1 ELSE 0 END) THEN 'DESATUALIZADA' ELSE 'PRONTA' END;
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

-- Gatilhos: valores do avaliando acompanham a fonte (cadastro, características, definição da variável, vínculo do avaliando).
CREATE OR REPLACE FUNCTION public.aval_trg_sync_variavel() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.aval_sync_avaliando(NEW.avaliacao_id, NEW.id); RETURN NULL; END $$;
CREATE OR REPLACE FUNCTION public.aval_trg_sync_vinculo() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN IF NEW.papel = 'AVALIANDO' THEN PERFORM public.aval_sync_avaliando(NEW.avaliacao_id); END IF; RETURN NULL; END $$;
CREATE OR REPLACE FUNCTION public.aval_trg_sync_imovel() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j jsonb; v_im uuid; a uuid;
BEGIN
  j := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  v_im := (CASE WHEN TG_TABLE_NAME = 'imoveis' THEN j->>'id' ELSE j->>'imovel_id' END)::uuid;
  FOR a IN SELECT ai.avaliacao_id FROM public.avaliacao_imoveis ai JOIN public.avaliacoes x ON x.id = ai.avaliacao_id AND x.status = 'ATIVA'
            WHERE ai.imovel_id = v_im AND ai.papel = 'AVALIANDO' LOOP
    PERFORM public.aval_sync_avaliando(a);
  END LOOP;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS aval_sync_avaliando ON public.avaliacao_variaveis;
CREATE TRIGGER aval_sync_avaliando AFTER INSERT OR UPDATE OF campo_origem, atributo_id, origem_tipo, papel, ativo ON public.avaliacao_variaveis
  FOR EACH ROW EXECUTE FUNCTION public.aval_trg_sync_variavel();
DROP TRIGGER IF EXISTS aval_sync_avaliando ON public.avaliacao_imoveis;
CREATE TRIGGER aval_sync_avaliando AFTER INSERT OR UPDATE ON public.avaliacao_imoveis FOR EACH ROW EXECUTE FUNCTION public.aval_trg_sync_vinculo();
DROP TRIGGER IF EXISTS aval_sync_avaliando ON public.imoveis;
CREATE TRIGGER aval_sync_avaliando AFTER UPDATE OF area_construida, area_terreno ON public.imoveis FOR EACH ROW EXECUTE FUNCTION public.aval_trg_sync_imovel();
DROP TRIGGER IF EXISTS aval_sync_avaliando ON public.imovel_atributos;
CREATE TRIGGER aval_sync_avaliando AFTER INSERT OR UPDATE OR DELETE ON public.imovel_atributos FOR EACH ROW EXECUTE FUNCTION public.aval_trg_sync_imovel();

-- Guarda: características de imóvel já usado numa avaliação só mudam pelo fluxo com matriz de impacto.
CREATE OR REPLACE FUNCTION public.aval_guard_live_atributos() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_im uuid; v_old uuid;
BEGIN
  IF public.aval_batch_active() OR public.aval_is_privileged() THEN IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND (to_jsonb(NEW) - 'updated_at') = (to_jsonb(OLD) - 'updated_at') THEN RETURN NEW; END IF;
  v_im := CASE WHEN TG_OP = 'DELETE' THEN OLD.imovel_id ELSE NEW.imovel_id END;
  v_old := CASE WHEN TG_OP = 'UPDATE' THEN OLD.imovel_id END;
  IF EXISTS (SELECT 1 FROM public.avaliacao_imoveis WHERE imovel_id IN (v_im, v_old))
     OR EXISTS (SELECT 1 FROM public.dados_mercado d JOIN public.avaliacao_amostras a ON a.dado_id = d.id WHERE d.imovel_id IN (v_im, v_old)) THEN
    RAISE EXCEPTION 'aval:use_change_flow' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS aval_guard_live ON public.imovel_atributos;
CREATE TRIGGER aval_guard_live BEFORE INSERT OR UPDATE OR DELETE ON public.imovel_atributos FOR EACH ROW EXECUTE FUNCTION public.aval_guard_live_atributos();

-- Permissões de execução
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY['public.aval_var_resolve(uuid, uuid, uuid, uuid)','public.aval_sync_avaliando(uuid, uuid)',
    'public.aval_trg_sync_variavel()','public.aval_trg_sync_vinculo()','public.aval_trg_sync_imovel()'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
  FOREACH fn IN ARRAY ARRAY['public.aval_variaveis_status(uuid)','public.aval_var_fonte(text, uuid)','public.aval_var_usada(uuid)',
    'public.aval_var_no_conjunto(uuid)','public.aval_guard_live_atributos()'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
  END LOOP;
END $$;
