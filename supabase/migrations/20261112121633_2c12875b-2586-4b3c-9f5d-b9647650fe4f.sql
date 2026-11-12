-- Avaliações — edição completa de dados com matriz de invalidação em lote.
-- Aditiva: novas funções, regra de impacto para tipo do valor administrativo, guarda contra edição silenciosa
-- de cadastros vinculados e modo "lote" nos gatilhos de invalidação existentes (invalidação única por lote).

INSERT INTO public.aval_impact_rules(entity_type, campo, nivel, descricao) VALUES
 ('valor_administrativo','tipo','ECONOMIC_RESULT','Tipo do valor administrativo altera a compatibilidade e a conclusão')
ON CONFLICT (entity_type, campo) DO NOTHING;

CREATE OR REPLACE FUNCTION public.aval_nivel_rank(p text) RETURNS int
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT COALESCE(array_position(ARRAY['NO_IMPACT','REPORT_ONLY','ECONOMIC_RESULT','PROJECTION','VALIDATION','MODEL','DATASET']::text[], p) - 1, 0)
$$;

CREATE OR REPLACE FUNCTION public.aval_batch_active() RETURNS boolean
LANGUAGE sql STABLE SET search_path = public AS $$ SELECT COALESCE(current_setting('aval.batch', true), '') = 'on' $$;

-- Existe variável ativa desta avaliação alimentada pelos campos (ou locacional)? p_in_use: só as usadas em modelo calculado.
CREATE OR REPLACE FUNCTION public.aval_vars_match(p_av uuid, p_campos text[], p_locacional boolean, p_in_use boolean) RETURNS boolean
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.avaliacao_variaveis v LEFT JOIN public.atributos_imobiliarios at ON at.id = v.atributo_id
     WHERE v.avaliacao_id = p_av AND v.ativo
       AND (v.campo_origem = ANY(p_campos) OR (p_locacional AND at.categoria ILIKE 'locali%'))
       AND (NOT p_in_use
         OR EXISTS (SELECT 1 FROM public.avaliacao_modelos m WHERE m.dependente_variavel_id = v.id AND m.status <> 'RASCUNHO')
         OR EXISTS (SELECT 1 FROM public.avaliacao_modelo_variaveis mv JOIN public.avaliacao_modelos m ON m.id = mv.modelo_id
                     WHERE mv.variavel_id = v.id AND m.status <> 'RASCUNHO')))
$$;

-- Nível de impacto contextual de UMA alteração para a avaliação p_av.
CREATE OR REPLACE FUNCTION public.aval_change_level(p_av uuid, p_entity text, p_campo text, p_entity_id uuid, p_ctx jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  c_loc constant text[] := ARRAY['endereco','numero','complemento','bairro','cep','latitude','longitude','precisao','localizacao'];
  v_rn text; v_rd text; v_is_av boolean := false; v_amostras uuid[]; v_in_conj boolean := false; v_pesquisa boolean;
  v_n text := 'NO_IMPACT'; v_d text := 'Sem impacto técnico nesta avaliação.'; v_s text[] := '{}'; v_sn text; v_sd text;
BEGIN
  IF p_entity IN ('avaliacao','valor_administrativo') THEN
    SELECT nivel, descricao INTO v_rn, v_rd FROM public.aval_impact_rules WHERE entity_type = p_entity AND campo = p_campo;
    IF v_rn IS NULL THEN RAISE EXCEPTION 'aval:field_not_allowed' USING ERRCODE = '22023'; END IF;
    RETURN jsonb_build_object('nivel', v_rn, 'descricao', v_rd, 'secoes',
      to_jsonb(CASE WHEN p_entity = 'avaliacao' THEN ARRAY['RESUMO','SOLICITANTE','OBJETO'] ELSE ARRAY['RESUMO','COMPATIBILIDADE'] END));
  END IF;
  IF p_entity NOT IN ('imovel','imovel_localizacao','dado_mercado','amostra','fonte_principal') THEN
    RAISE EXCEPTION 'aval:entity_not_allowed' USING ERRCODE = '22023';
  END IF;
  IF (p_entity = 'imovel' AND p_campo NOT IN ('tipo_imovel','endereco','numero','complemento','bairro','cep','area_construida','area_terreno','anuncio_url','anuncio_id','descricao'))
     OR (p_entity = 'imovel_localizacao' AND p_campo NOT IN ('precisao','latitude','longitude'))
     OR (p_entity = 'dado_mercado' AND p_campo NOT IN ('natureza_dado','valor_ofertado','valor_utilizado','data_observacao','url_anuncio','anuncio_id'))
     OR (p_entity = 'amostra' AND p_campo <> 'origem_territorial')
     OR (p_entity = 'fonte_principal' AND p_campo NOT IN ('tipo','nome')) THEN
    RAISE EXCEPTION 'aval:field_not_allowed' USING ERRCODE = '22023';
  END IF;

  IF p_entity IN ('imovel','imovel_localizacao') THEN
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

-- Compartilhamento do cadastro físico: outros dados de mercado e outras avaliações ativas que o usam.
CREATE OR REPLACE FUNCTION public.aval_imovel_sharing(p_avaliacao uuid, p_imovel uuid, p_dado uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE v_org uuid; v_dados int; v_av_links int; v_outras jsonb; v_dado_outras jsonb;
BEGIN
  SELECT organization_id INTO v_org FROM public.avaliacoes WHERE id = p_avaliacao AND public.aval_is_reader(organization_id);
  IF v_org IS NULL OR NOT EXISTS (SELECT 1 FROM public.imoveis WHERE id = p_imovel AND organization_id = v_org) THEN
    RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501';
  END IF;
  SELECT count(*) INTO v_dados FROM public.dados_mercado WHERE imovel_id = p_imovel AND (p_dado IS NULL OR id <> p_dado);
  SELECT count(*) INTO v_av_links FROM public.avaliacao_imoveis WHERE imovel_id = p_imovel AND (p_dado IS NOT NULL OR avaliacao_id <> p_avaliacao);
  SELECT COALESCE(jsonb_agg(DISTINCT a.codigo), '[]') INTO v_outras FROM public.avaliacoes a
   WHERE a.organization_id = v_org AND a.id <> p_avaliacao AND a.status = 'ATIVA'
     AND (EXISTS (SELECT 1 FROM public.avaliacao_imoveis ai WHERE ai.avaliacao_id = a.id AND ai.imovel_id = p_imovel)
       OR EXISTS (SELECT 1 FROM public.avaliacao_amostras am JOIN public.dados_mercado d ON d.id = am.dado_id WHERE am.avaliacao_id = a.id AND d.imovel_id = p_imovel));
  SELECT COALESCE(jsonb_agg(DISTINCT a.codigo), '[]') INTO v_dado_outras FROM public.avaliacoes a
   WHERE p_dado IS NOT NULL AND a.organization_id = v_org AND a.id <> p_avaliacao AND a.status = 'ATIVA'
     AND EXISTS (SELECT 1 FROM public.avaliacao_amostras am WHERE am.avaliacao_id = a.id AND am.dado_id = p_dado);
  RETURN jsonb_build_object('compartilhado', v_dados + v_av_links > 0, 'outros_dados', v_dados, 'vinculos_avaliando', v_av_links,
    'outras_avaliacoes', v_outras, 'dado_outras_avaliacoes', v_dado_outras);
END $$;

-- Plano por alteração (nível nesta avaliação e nas demais avaliações ativas afetadas pelo mesmo cadastro).
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
    IF v_ctx->>'modo' = 'CLONAR' AND (v_e NOT IN ('imovel','imovel_localizacao') OR (v_ctx->>'dado_id') IS NULL) THEN
      RAISE EXCEPTION 'aval:invalid_changes' USING ERRCODE = '22023';
    END IF;
    v_outras := '[]';
    IF (v_e IN ('imovel','imovel_localizacao') AND COALESCE(v_ctx->>'modo', '') <> 'CLONAR') OR v_e IN ('dado_mercado','fonte_principal') THEN
      FOR o IN SELECT a.id, a.codigo FROM public.avaliacoes a
        WHERE a.organization_id = v_org AND a.id <> p_av AND a.status = 'ATIVA'
          AND CASE WHEN v_e IN ('imovel','imovel_localizacao') THEN
                 EXISTS (SELECT 1 FROM public.avaliacao_imoveis ai WHERE ai.avaliacao_id = a.id AND ai.imovel_id = v_id)
              OR EXISTS (SELECT 1 FROM public.avaliacao_amostras am JOIN public.dados_mercado d ON d.id = am.dado_id WHERE am.avaliacao_id = a.id AND d.imovel_id = v_id)
            ELSE EXISTS (SELECT 1 FROM public.avaliacao_amostras am WHERE am.avaliacao_id = a.id AND am.dado_id = v_id) END
        ORDER BY a.codigo LOOP
        v_outras := v_outras || jsonb_build_array(jsonb_build_object('avaliacao_id', o.id, 'codigo', o.codigo)
                    || (public.aval_change_level(o.id, v_e, v_c, v_id, '{}'::jsonb) - 'descricao'));
      END LOOP;
    END IF;
    v_out := v_out || jsonb_build_array(jsonb_build_object('i', i, 'entity_type', v_e, 'entity_id', v_id, 'campo', v_c, 'rotulo', ch->>'rotulo')
             || public.aval_change_level(p_av, v_e, v_c, v_id, v_ctx) || jsonb_build_object('outras', v_outras));
    i := i + 1;
  END LOOP;
  RETURN v_out;
END $$;

CREATE OR REPLACE FUNCTION public.aval_impact_counts(p_av uuid, p_nivel text) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE r jsonb := '[]'; n int;
BEGIN
  IF p_nivel IN ('DATASET','MODEL') THEN
    SELECT count(*) INTO n FROM public.avaliacao_modelos WHERE avaliacao_id = p_av AND NOT stale AND status <> 'RASCUNHO';
    IF n > 0 THEN r := r || jsonb_build_array(jsonb_build_object('entidade', 'Modelos calculados', 'quantidade', n)); END IF;
  END IF;
  IF p_nivel IN ('DATASET','MODEL','VALIDATION') THEN
    SELECT count(*) INTO n FROM public.model_validations WHERE avaliacao_id = p_av AND NOT stale;
    IF n > 0 THEN r := r || jsonb_build_array(jsonb_build_object('entidade', 'Validações', 'quantidade', n)); END IF;
    SELECT count(*) INTO n FROM public.model_acceptances WHERE avaliacao_id = p_av AND status = 'VIGENTE';
    IF n > 0 THEN r := r || jsonb_build_array(jsonb_build_object('entidade', 'Aceite do modelo', 'quantidade', n)); END IF;
    SELECT count(*) INTO n FROM public.avaliacao_projecoes WHERE avaliacao_id = p_av AND NOT stale;
    IF n > 0 THEN r := r || jsonb_build_array(jsonb_build_object('entidade', 'Projeções oficiais', 'quantidade', n)); END IF;
  END IF;
  IF p_nivel IN ('DATASET','MODEL','VALIDATION','PROJECTION','ECONOMIC_RESULT') THEN
    SELECT count(*) INTO n FROM public.avaliacao_resultado_economico WHERE avaliacao_id = p_av AND status = 'VIGENTE';
    IF n > 0 THEN r := r || jsonb_build_array(jsonb_build_object('entidade', 'Resultado econômico', 'quantidade', n)); END IF;
  END IF;
  IF p_nivel <> 'NO_IMPACT' THEN
    SELECT count(*) INTO n FROM public.laudo_secoes s JOIN public.laudo_versoes v ON v.id = s.laudo_versao_id
     WHERE v.avaliacao_id = p_av AND v.status IN ('RASCUNHO','EM_REVISAO') AND NOT s.stale;
    IF n > 0 THEN r := r || jsonb_build_array(jsonb_build_object('entidade', 'Seções do laudo (rascunho)', 'quantidade', n)); END IF;
  END IF;
  RETURN r;
END $$;

-- Avaliação de impacto de um lote de alterações (sem gravar nada).
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
             FROM jsonb_array_elements(p_changes) c WHERE c->>'entity_type' IN ('imovel','imovel_localizacao') LOOP
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

-- Aplica um lote de alterações em transação única, com permissão no servidor, derivados, invalidação única e trilha antes/depois.
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
    ELSIF v_e IN ('imovel','imovel_localizacao') THEN
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
    IF v_e = 'fonte_principal' THEN
      v_fonte := v_fonte || jsonb_build_object(v_id::text, COALESCE(v_fonte->(v_id::text), '{}'::jsonb)
                 || jsonb_build_object(v_c, v_txt, 'idx', COALESCE(v_fonte->(v_id::text)->'idx', '[]'::jsonb) || to_jsonb((e->>'i')::int)));
      CONTINUE;
    END IF;
    v_tbl := CASE v_e WHEN 'avaliacao' THEN 'avaliacoes' WHEN 'valor_administrativo' THEN 'avaliacao_valores_administrativos'
      WHEN 'imovel' THEN 'imoveis' WHEN 'imovel_localizacao' THEN 'imovel_localizacao' WHEN 'dado_mercado' THEN 'dados_mercado'
      WHEN 'amostra' THEN 'avaliacao_amostras' END;
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
      IF v_c IN ('tipo_imovel','tipo','valor','valor_utilizado','natureza_dado','origem_territorial','precisao') AND v_txt IS NULL THEN
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

-- Gatilhos de invalidação existentes: dentro de um lote, a invalidação é feita uma única vez por aval_apply_changes.
CREATE OR REPLACE FUNCTION public.aval_trg_inv_valores_adm() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_av uuid;
BEGIN
  IF public.aval_batch_active() THEN IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW; END IF;
  IF TG_OP = 'DELETE' THEN v_av := OLD.avaliacao_id; ELSE v_av := NEW.avaliacao_id; END IF;
  IF TG_OP <> 'UPDATE' THEN
    PERFORM public.aval_invalidate(v_av, 'ECONOMIC_RESULT', 'Valor administrativo incluído/removido');
  ELSIF NEW.valor IS DISTINCT FROM OLD.valor OR NEW.tipo IS DISTINCT FROM OLD.tipo OR NEW.ativo IS DISTINCT FROM OLD.ativo THEN
    PERFORM public.aval_invalidate(v_av, 'ECONOMIC_RESULT', 'Valor administrativo alterado');
  ELSIF NEW.data_referencia IS DISTINCT FROM OLD.data_referencia OR NEW.observacao IS DISTINCT FROM OLD.observacao THEN
    PERFORM public.aval_invalidate(v_av, 'REPORT_ONLY', 'Dado administrativo alterado', ARRAY['RESUMO','COMPATIBILIDADE']);
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.aval_trg_inv_variavel_valores() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_av uuid; v_var uuid; v_scope text;
BEGIN
  IF public.aval_batch_active() THEN IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW; END IF;
  IF TG_OP = 'DELETE' THEN v_av := OLD.avaliacao_id; v_var := OLD.variavel_id; v_scope := OLD.scope_type;
  ELSE v_av := NEW.avaliacao_id; v_var := NEW.variavel_id; v_scope := NEW.scope_type; END IF;
  IF TG_OP = 'UPDATE' AND NEW.valor IS NOT DISTINCT FROM OLD.valor THEN RETURN NEW; END IF;
  IF public.aval_variable_in_use(v_var) THEN
    IF v_scope = 'AVALIANDO' THEN
      PERFORM public.aval_invalidate(v_av, 'MODEL', 'Valor do avaliando usado no modelo alterado');
    ELSE
      PERFORM public.aval_invalidate(v_av, 'DATASET', 'Valor de amostra usada alterado — criar nova versão do conjunto');
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.aval_trg_inv_avaliacao() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.aval_batch_active() THEN RETURN NEW; END IF;
  IF NEW.processo_administrativo IS DISTINCT FROM OLD.processo_administrativo OR NEW.numero_contrato IS DISTINCT FROM OLD.numero_contrato
     OR NEW.observacao IS DISTINCT FROM OLD.observacao THEN
    PERFORM public.aval_invalidate(NEW.id, 'REPORT_ONLY', 'Dados administrativos alterados', ARRAY['RESUMO','SOLICITANTE','OBJETO']);
  END IF;
  RETURN NEW;
END $$;

-- Guarda: cadastro físico, observação de mercado, localização e origem territorial vinculados a avaliação
-- só mudam pelo fluxo com matriz de impacto (aval_apply_changes). Evita edição silenciosa direta pela API.
CREATE OR REPLACE FUNCTION public.aval_guard_live_cadastro() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_linked boolean := false; v_ign text[] := ARRAY['updated_at','endereco_normalizado'];
BEGIN
  IF public.aval_batch_active() OR public.aval_is_privileged() THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'avaliacao_amostras' THEN
    IF NEW.origem_territorial IS DISTINCT FROM OLD.origem_territorial THEN RAISE EXCEPTION 'aval:use_change_flow' USING ERRCODE = '42501'; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF (to_jsonb(NEW) - v_ign) = (to_jsonb(OLD) - v_ign) THEN RETURN NEW; END IF;
  END IF;
  IF TG_TABLE_NAME = 'imoveis' THEN
    v_linked := EXISTS (SELECT 1 FROM public.avaliacao_imoveis WHERE imovel_id = NEW.id)
             OR EXISTS (SELECT 1 FROM public.dados_mercado d JOIN public.avaliacao_amostras a ON a.dado_id = d.id WHERE d.imovel_id = NEW.id);
  ELSIF TG_TABLE_NAME = 'imovel_localizacao' THEN
    v_linked := EXISTS (SELECT 1 FROM public.avaliacao_imoveis WHERE imovel_id = NEW.imovel_id)
             OR EXISTS (SELECT 1 FROM public.dados_mercado d JOIN public.avaliacao_amostras a ON a.dado_id = d.id WHERE d.imovel_id = NEW.imovel_id);
  ELSIF TG_TABLE_NAME = 'dados_mercado' THEN
    v_linked := EXISTS (SELECT 1 FROM public.avaliacao_amostras WHERE dado_id = NEW.id);
  END IF;
  IF v_linked THEN RAISE EXCEPTION 'aval:use_change_flow' USING ERRCODE = '42501'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS aval_guard_live ON public.imoveis;
CREATE TRIGGER aval_guard_live BEFORE UPDATE ON public.imoveis FOR EACH ROW EXECUTE FUNCTION public.aval_guard_live_cadastro();
DROP TRIGGER IF EXISTS aval_guard_live ON public.dados_mercado;
CREATE TRIGGER aval_guard_live BEFORE UPDATE ON public.dados_mercado FOR EACH ROW EXECUTE FUNCTION public.aval_guard_live_cadastro();
DROP TRIGGER IF EXISTS aval_guard_live ON public.imovel_localizacao;
CREATE TRIGGER aval_guard_live BEFORE INSERT OR UPDATE ON public.imovel_localizacao FOR EACH ROW EXECUTE FUNCTION public.aval_guard_live_cadastro();
DROP TRIGGER IF EXISTS aval_guard_live ON public.avaliacao_amostras;
CREATE TRIGGER aval_guard_live BEFORE UPDATE ON public.avaliacao_amostras FOR EACH ROW EXECUTE FUNCTION public.aval_guard_live_cadastro();

-- Permissões de execução
REVOKE ALL ON FUNCTION public.aval_apply_changes(uuid, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aval_apply_changes(uuid, jsonb, text) TO authenticated, service_role;
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY['public.aval_evaluate_changes_impact(uuid, jsonb)','public.aval_imovel_sharing(uuid, uuid, uuid)',
    'public.aval_changes_plan(uuid, jsonb)','public.aval_change_level(uuid, text, text, uuid, jsonb)','public.aval_impact_counts(uuid, text)',
    'public.aval_vars_match(uuid, text[], boolean, boolean)','public.aval_nivel_rank(text)','public.aval_batch_active()',
    'public.aval_guard_live_cadastro()'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
  END LOOP;
END $$;