CREATE OR REPLACE FUNCTION public.aval_change_level(p_av uuid, p_entity text, p_campo text, p_entity_id uuid, p_ctx jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
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
  IF (p_entity = 'imovel' AND p_campo NOT IN ('tipo_imovel','endereco','numero','complemento','bairro','cep','area_construida','area_terreno','anuncio_url','anuncio_id','descricao','uf','municipio_nome','municipio_ibge'))
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
      ELSIF p_entity = 'imovel' AND p_campo IN ('uf','municipio_nome','municipio_ibge') THEN
        v_sn := 'DATASET'; v_sd := 'O município de amostra do conjunto vigente altera a origem territorial e a comparabilidade da pesquisa.';
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
END $function$;

-- Código IBGE da UF (dois primeiros dígitos do código de município).
CREATE OR REPLACE FUNCTION public.aval_uf_codigo(p_uf text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE upper(btrim(p_uf))
    WHEN 'RO' THEN '11' WHEN 'AC' THEN '12' WHEN 'AM' THEN '13' WHEN 'RR' THEN '14' WHEN 'PA' THEN '15' WHEN 'AP' THEN '16' WHEN 'TO' THEN '17'
    WHEN 'MA' THEN '21' WHEN 'PI' THEN '22' WHEN 'CE' THEN '23' WHEN 'RN' THEN '24' WHEN 'PB' THEN '25' WHEN 'PE' THEN '26' WHEN 'AL' THEN '27'
    WHEN 'SE' THEN '28' WHEN 'BA' THEN '29' WHEN 'MG' THEN '31' WHEN 'ES' THEN '32' WHEN 'RJ' THEN '33' WHEN 'SP' THEN '35'
    WHEN 'PR' THEN '41' WHEN 'SC' THEN '42' WHEN 'RS' THEN '43' WHEN 'MS' THEN '50' WHEN 'MT' THEN '51' WHEN 'GO' THEN '52' WHEN 'DF' THEN '53'
  END
$$;

-- Município do imóvel coerente: código IBGE de 7 dígitos, da UF informada, com nome. Conferido no fim da transação
-- (o lote de correção grava UF, código e nome um campo de cada vez).
CREATE OR REPLACE FUNCTION public.aval_trg_imovel_municipio_check()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE r record;
BEGIN
  SELECT municipio_ibge, municipio_nome, uf INTO r FROM public.imoveis WHERE id = NEW.id;
  IF NOT FOUND OR r.municipio_ibge IS NULL THEN RETURN NULL; END IF;
  IF r.municipio_ibge !~ '^[0-9]{7}$' OR r.uf IS NULL OR public.aval_uf_codigo(r.uf) IS DISTINCT FROM left(r.municipio_ibge, 2)
     OR NULLIF(btrim(COALESCE(r.municipio_nome, '')), '') IS NULL THEN
    RAISE EXCEPTION 'aval:invalid_municipio' USING ERRCODE = '22023';
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS aval_municipio_check ON public.imoveis;
CREATE CONSTRAINT TRIGGER aval_municipio_check AFTER INSERT OR UPDATE OF municipio_ibge, municipio_nome, uf ON public.imoveis
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.aval_trg_imovel_municipio_check();

-- "Mesmo município" só vale quando o imóvel é do município da avaliação; caso contrário a inclusão vira município comparável.
CREATE OR REPLACE FUNCTION public.aval_trg_amostra_origem_coerente()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_av text; v_im text;
BEGIN
  IF NEW.origem_territorial IS DISTINCT FROM 'LOCAL' THEN RETURN NEW; END IF;
  SELECT municipio_ibge INTO v_av FROM public.avaliacoes WHERE id = NEW.avaliacao_id;
  SELECT i.municipio_ibge INTO v_im FROM public.dados_mercado d JOIN public.imoveis i ON i.id = d.imovel_id WHERE d.id = NEW.dado_id;
  NEW.origem_territorial := public.aval_origem_territorial_padrao(v_av, v_im);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS aval_origem_coerente ON public.avaliacao_amostras;
CREATE TRIGGER aval_origem_coerente BEFORE INSERT ON public.avaliacao_amostras
  FOR EACH ROW EXECUTE FUNCTION public.aval_trg_amostra_origem_coerente();

REVOKE ALL ON FUNCTION public.aval_trg_imovel_municipio_check() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.aval_trg_amostra_origem_coerente() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aval_uf_codigo(text) TO authenticated, service_role;