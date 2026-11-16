-- Compatibilidade dimensional: o resultado econômico só é comparado com valores administrativos na MESMA unidade.
-- Linhas antigas de avaliacao_compatibilidades ficam intactas (imutáveis); regra_versao NULL = registro anterior à regra.

-- 1) Colunas aditivas de rastreabilidade da conversão
ALTER TABLE public.avaliacao_compatibilidades
  ADD COLUMN IF NOT EXISTS regra_versao integer,
  ADD COLUMN IF NOT EXISTS status_comparacao text,
  ADD COLUMN IF NOT EXISTS valor_administrativo_original numeric,
  ADD COLUMN IF NOT EXISTS unidade_original text,
  ADD COLUMN IF NOT EXISTS unidade_resultado text,
  ADD COLUMN IF NOT EXISTS unidade_comparacao text,
  ADD COLUMN IF NOT EXISTS area_conversao numeric,
  ADD COLUMN IF NOT EXISTS area_campo text,
  ADD COLUMN IF NOT EXISTS area_origem text,
  ADD COLUMN IF NOT EXISTS conversao_formula text,
  ADD COLUMN IF NOT EXISTS motivo text;
-- Sem comparação possível não há valor comparado, diferença nem direção (nunca um percentual incorreto).
ALTER TABLE public.avaliacao_compatibilidades
  ALTER COLUMN valor_comparado DROP NOT NULL,
  ALTER COLUMN diferenca_absoluta DROP NOT NULL,
  ALTER COLUMN diferenca_percentual DROP NOT NULL,
  ALTER COLUMN direcao DROP NOT NULL;
ALTER TABLE public.avaliacao_compatibilidades DROP CONSTRAINT IF EXISTS avaliacao_compat_status_check;
ALTER TABLE public.avaliacao_compatibilidades ADD CONSTRAINT avaliacao_compat_status_check
  CHECK (status_comparacao IS NULL OR status_comparacao IN ('COMPARAVEL','NAO_COMPARAVEL_FALTA_AREA','NAO_COMPARAVEL_UNIDADE'));
ALTER TABLE public.avaliacao_compatibilidades DROP CONSTRAINT IF EXISTS avaliacao_compat_coerencia_check;
ALTER TABLE public.avaliacao_compatibilidades ADD CONSTRAINT avaliacao_compat_coerencia_check CHECK (
  CASE
    WHEN regra_versao IS NULL THEN valor_comparado IS NOT NULL AND diferenca_absoluta IS NOT NULL AND diferenca_percentual IS NOT NULL AND direcao IS NOT NULL
    WHEN status_comparacao = 'COMPARAVEL' THEN valor_administrativo_original IS NOT NULL AND unidade_original IS NOT NULL AND unidade_comparacao IS NOT NULL
      AND valor_comparado IS NOT NULL AND diferenca_absoluta IS NOT NULL AND diferenca_percentual IS NOT NULL AND direcao IS NOT NULL
    ELSE status_comparacao IS NOT NULL AND valor_administrativo_original IS NOT NULL AND unidade_original IS NOT NULL AND motivo IS NOT NULL
      AND valor_comparado IS NULL AND diferenca_absoluta IS NULL AND diferenca_percentual IS NULL AND direcao IS NULL
      AND posicao_ic = 'NAO_APLICAVEL' AND posicao_campo = 'NAO_APLICAVEL'
  END);

-- 2) Camada única: classificação da unidade econômica (variável dependente ou valor administrativo)
-- Usa metadados (unidade, campo de origem, finalidade/periodicidade da avaliação), nunca só o nome visual.
CREATE OR REPLACE FUNCTION public.aval_finalidade(p_tipo_avaliacao text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN p_tipo_avaliacao IN ('NOVA_LOCACAO','RENOVACAO','REAJUSTE') THEN 'LOCACAO' ELSE 'VENDA' END $$;

CREATE OR REPLACE FUNCTION public.aval_unidade_classificar(p_unidade text, p_campo_origem text, p_finalidade text)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  u text := lower(regexp_replace(translate(COALESCE(p_unidade, ''), '²', '2'), '\s', '', 'g'));
  v_per text := CASE WHEN p_finalidade = 'LOCACAO' THEN 'MENSAL' ELSE 'UNICA' END;
  v_per_u text; v_area_u boolean; v_area_c boolean; v_tot_c boolean; v_tot_u boolean; v_cat text; v_motivo text;
BEGIN
  v_area_u := u ~ '/m2';
  v_area_c := p_campo_origem = 'valor_unitario';
  v_tot_c := p_campo_origem = 'valor_utilizado';
  v_tot_u := u ~ '^r\$(/(m[eê]s|mensal))?$';
  v_per_u := CASE WHEN u ~ '(m[eê]s|mensal)' THEN 'MENSAL' WHEN u ~ '(ano|anual)' THEN 'ANUAL' END;
  IF v_per_u IS NOT NULL AND v_per_u <> v_per THEN
    v_cat := 'INDETERMINADA'; v_motivo := format('A unidade "%s" não corresponde à periodicidade da avaliação (%s).', p_unidade, lower(v_per));
  ELSIF (v_area_c AND u <> '' AND NOT v_area_u) OR (v_tot_c AND v_area_u) THEN
    v_cat := 'INDETERMINADA'; v_motivo := format('A unidade "%s" diverge do campo de origem "%s" da variável dependente.', p_unidade, p_campo_origem);
  ELSIF v_area_u OR v_area_c THEN v_cat := 'UNITARIO';
  ELSIF v_tot_c OR v_tot_u THEN v_cat := 'TOTAL';
  ELSE
    v_cat := 'INDETERMINADA'; v_motivo := format('Não foi possível identificar a unidade econômica da variável dependente (unidade "%s").', COALESCE(NULLIF(p_unidade, ''), 'não informada'));
  END IF;
  RETURN jsonb_build_object('categoria', v_cat, 'periodicidade', v_per, 'finalidade', p_finalidade,
    'unidade', CASE v_cat WHEN 'UNITARIO' THEN 'R$/m²' WHEN 'TOTAL' THEN CASE WHEN v_per = 'MENSAL' THEN 'R$/mês' ELSE 'R$' END
                          ELSE COALESCE(NULLIF(btrim(p_unidade), ''), 'não identificada') END,
    -- Valor unitário no SiDIF = valor utilizado ÷ área construída (mesma base do cadastro de dados de mercado).
    'area_campo', CASE WHEN v_cat = 'UNITARIO' THEN 'area_construida' END,
    'motivo', v_motivo);
END $$;

-- Valores administrativos são valores contratuais/propostos TOTAIS (R$/mês na locação; R$ na venda).
CREATE OR REPLACE FUNCTION public.aval_unidade_administrativa(p_finalidade text) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT jsonb_build_object('categoria', 'TOTAL', 'periodicidade', CASE WHEN p_finalidade = 'LOCACAO' THEN 'MENSAL' ELSE 'UNICA' END,
    'finalidade', p_finalidade, 'unidade', CASE WHEN p_finalidade = 'LOCACAO' THEN 'R$/mês' ELSE 'R$' END) $$;

-- 3) Comparação pura: converte o valor administrativo para a unidade do resultado e só então compara
-- (direção, diferença, posição no intervalo de confiança e no campo de arbítrio — todos na mesma unidade).
CREATE OR REPLACE FUNCTION public.aval_compat_calcular(p_res jsonb, p_resultado numeric, p_lim_inf numeric, p_lim_sup numeric,
  p_campo_inf numeric, p_campo_sup numeric, p_adm_valor numeric, p_adm jsonb, p_area numeric, p_area_origem text)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE v_eps numeric := 0.005; v_comp numeric; v_formula text; v_status text := 'COMPARAVEL'; v_motivo text; v_area numeric;
BEGIN
  IF p_res->>'categoria' = 'INDETERMINADA' THEN
    v_status := 'NAO_COMPARAVEL_UNIDADE'; v_motivo := COALESCE(p_res->>'motivo', 'Unidade do resultado não identificada.');
  ELSIF p_res->>'periodicidade' IS DISTINCT FROM p_adm->>'periodicidade' THEN
    v_status := 'NAO_COMPARAVEL_UNIDADE';
    v_motivo := format('Resultado em %s e valor administrativo em %s têm periodicidades diferentes.', p_res->>'unidade', p_adm->>'unidade');
  ELSIF p_res->>'categoria' = p_adm->>'categoria' THEN
    v_comp := p_adm_valor; v_formula := format('Comparação direta (mesma unidade: %s)', p_res->>'unidade');
  ELSIF p_res->>'categoria' = 'UNITARIO' AND p_adm->>'categoria' = 'TOTAL' THEN
    IF p_area IS NULL OR p_area <= 0 THEN
      v_status := 'NAO_COMPARAVEL_FALTA_AREA';
      v_motivo := format('Falta a área construída do imóvel avaliando para converter %s em %s.', p_adm->>'unidade', p_res->>'unidade');
    ELSE
      v_area := p_area; v_comp := p_adm_valor / p_area;
      v_formula := format('%s %s ÷ %s m² (área construída do avaliando%s) = %s %s',
        public.aval_fmt_money(p_adm_valor), regexp_replace(p_adm->>'unidade', '^R\$', ''), public.aval_fmt_num(p_area, 2),
        CASE p_area_origem WHEN 'PROJECAO' THEN ', usada na projeção' WHEN 'IMOVEL_AVALIANDO' THEN ', cadastro do imóvel' ELSE '' END,
        public.aval_fmt_money(v_comp), regexp_replace(p_res->>'unidade', '^R\$', ''));
    END IF;
  ELSE
    v_status := 'NAO_COMPARAVEL_UNIDADE';
    v_motivo := format('Não há conversão definida de %s para %s.', p_adm->>'unidade', p_res->>'unidade');
  END IF;
  IF v_status <> 'COMPARAVEL' THEN
    RETURN jsonb_build_object('status', v_status, 'motivo', v_motivo, 'valor_original', p_adm_valor, 'unidade_original', p_adm->>'unidade',
      'unidade_resultado', p_res->>'unidade', 'unidade_comparacao', NULL, 'valor_comparado', NULL, 'area', NULL, 'area_campo', NULL, 'area_origem', NULL,
      'formula', NULL, 'diferenca_absoluta', NULL, 'diferenca_percentual', NULL, 'direcao', NULL, 'posicao_ic', 'NAO_APLICAVEL', 'posicao_campo', 'NAO_APLICAVEL');
  END IF;
  RETURN jsonb_build_object('status', v_status, 'motivo', NULL, 'valor_original', p_adm_valor, 'unidade_original', p_adm->>'unidade',
    'unidade_resultado', p_res->>'unidade', 'unidade_comparacao', p_res->>'unidade', 'valor_comparado', v_comp,
    'area', v_area, 'area_campo', CASE WHEN v_area IS NOT NULL THEN p_res->>'area_campo' END, 'area_origem', CASE WHEN v_area IS NOT NULL THEN p_area_origem END,
    'formula', v_formula, 'diferenca_absoluta', p_resultado - v_comp,
    'diferenca_percentual', CASE WHEN p_resultado <> 0 THEN (p_resultado - v_comp) / p_resultado * 100 END,
    'direcao', CASE WHEN v_comp < p_resultado - v_eps THEN 'ABAIXO_REFERENCIA' WHEN v_comp > p_resultado + v_eps THEN 'ACIMA_REFERENCIA' ELSE 'IGUAL_REFERENCIA' END,
    'posicao_ic', CASE WHEN p_lim_inf IS NULL OR p_lim_sup IS NULL THEN 'NAO_APLICAVEL' WHEN v_comp < p_lim_inf THEN 'ABAIXO_IC' WHEN v_comp > p_lim_sup THEN 'ACIMA_IC' ELSE 'DENTRO_IC' END,
    'posicao_campo', CASE WHEN p_campo_inf IS NULL OR p_campo_sup IS NULL THEN 'NAO_APLICAVEL' WHEN v_comp < p_campo_inf THEN 'ABAIXO_CAMPO' WHEN v_comp > p_campo_sup THEN 'ACIMA_CAMPO' ELSE 'DENTRO_CAMPO' END);
END $$;

-- Unidade do resultado de uma projeção + área do avaliando compatível (snapshot da projeção, senão cadastro do imóvel).
CREATE OR REPLACE FUNCTION public.aval_unidade_resultado(p_projecao uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE pj record; dep record; v_tipo text; cls jsonb; v_cod text; v_area numeric; v_origem text; v_txt text;
BEGIN
  SELECT * INTO pj FROM public.avaliacao_projecoes WHERE id = p_projecao;
  IF pj.id IS NULL THEN RETURN NULL; END IF;
  SELECT v.* INTO dep FROM public.avaliacao_modelos m JOIN public.avaliacao_variaveis v ON v.id = m.dependente_variavel_id WHERE m.id = pj.modelo_id;
  SELECT tipo INTO v_tipo FROM public.avaliacoes WHERE id = pj.avaliacao_id;
  cls := public.aval_unidade_classificar(dep.unidade, dep.campo_origem, public.aval_finalidade(v_tipo))
    || jsonb_build_object('variavel_codigo', dep.codigo, 'variavel_unidade', dep.unidade, 'variavel_campo_origem', dep.campo_origem);
  IF cls->>'area_campo' IS NOT NULL THEN
    SELECT v.codigo INTO v_cod FROM public.avaliacao_variaveis v
     WHERE v.avaliacao_id = pj.avaliacao_id AND v.campo_origem = cls->>'area_campo' AND v.papel <> 'DEPENDENTE' AND pj.avaliando_json ? v.codigo
     ORDER BY v.created_at LIMIT 1;
    IF v_cod IS NOT NULL THEN
      v_txt := pj.avaliando_json->>v_cod;
      IF v_txt ~ '^-?[0-9]+(\.[0-9]+)?([eE][-+]?[0-9]+)?$' THEN v_area := v_txt::numeric; v_origem := 'PROJECAO'; END IF;
    END IF;
    IF v_area IS NULL OR v_area <= 0 THEN
      SELECT NULLIF(to_jsonb(i)->>(cls->>'area_campo'), '')::numeric INTO v_area
        FROM public.avaliacao_imoveis ai JOIN public.imoveis i ON i.id = ai.imovel_id
       WHERE ai.avaliacao_id = pj.avaliacao_id AND ai.papel = 'AVALIANDO' LIMIT 1;
      v_origem := CASE WHEN v_area > 0 THEN 'IMOVEL_AVALIANDO' END;
      IF NOT (v_area > 0) THEN v_area := NULL; END IF;
    END IF;
  END IF;
  RETURN cls || jsonb_build_object('area', v_area, 'area_origem', v_origem);
END $$;
REVOKE ALL ON FUNCTION public.aval_unidade_resultado(uuid) FROM PUBLIC, anon, authenticated;

-- 4) Confirmação do resultado econômico com comparação na mesma unidade
CREATE OR REPLACE FUNCTION public.aval_confirm_economic(p_projecao uuid, p_centro text, p_aplicar boolean, p_valor_arbitrado numeric, p_justificativa text, p_caracteristicas uuid[], p_conclusao text, p_conclusao_texto text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  pj record; ce record; av record; pol record; rp record; v_arb uuid; v_adot uuid; v_res uuid;
  v_inf numeric; v_sup numeric; v_bruto numeric; v_final numeric; va record; v_tipos text[]; v_dados jsonb; v_cid uuid;
  v_apl boolean := COALESCE(p_aplicar, false); v_un jsonb; v_adm jsonb; cmp jsonb;
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
  v_un := public.aval_unidade_resultado(pj.id);
  v_adm := public.aval_unidade_administrativa(public.aval_finalidade(av.tipo));
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
    valor_adotado_bruto, valor_final_apresentacao, unidade, rounding_policy_id)
  VALUES (av.organization_id, av.id, pj.id, ce.id, CASE WHEN v_apl THEN v_arb END,
    CASE WHEN v_apl THEN 'ARBITRAMENTO' ELSE 'TENDENCIA_CENTRAL' END, v_bruto, v_final, v_un->>'unidade', rp.id)
  RETURNING id INTO v_adot;
  INSERT INTO public.avaliacao_resultado_economico(organization_id, avaliacao_id, projecao_id, valor_adotado_id, centro, conclusao, conclusao_texto, confirmado_por)
  VALUES (av.organization_id, av.id, pj.id, v_adot, p_centro, p_conclusao, NULLIF(btrim(p_conclusao_texto), ''), auth.uid())
  RETURNING id INTO v_res;
  v_tipos := CASE av.tipo WHEN 'NOVA_LOCACAO' THEN ARRAY['SOLICITADO_PROPRIETARIO'] WHEN 'RENOVACAO' THEN ARRAY['CONTRATO_ATUAL','PROPOSTO_RENOVACAO'] ELSE ARRAY['REAJUSTADO'] END;
  FOR va IN SELECT * FROM public.avaliacao_valores_administrativos WHERE avaliacao_id = av.id AND ativo AND tipo = ANY(v_tipos) LOOP
    cmp := public.aval_compat_calcular(v_un, v_bruto, ce.limite_inferior, ce.limite_superior, v_inf, v_sup, va.valor, v_adm,
      (v_un->>'area')::numeric, v_un->>'area_origem');
    INSERT INTO public.avaliacao_compatibilidades(organization_id, avaliacao_id, resultado_id, valor_administrativo_id, tipo_valor,
      valor_referencia, valor_comparado, diferenca_absoluta, diferenca_percentual, direcao, posicao_ic, posicao_campo,
      regra_versao, status_comparacao, valor_administrativo_original, unidade_original, unidade_resultado, unidade_comparacao,
      area_conversao, area_campo, area_origem, conversao_formula, motivo)
    VALUES (av.organization_id, av.id, v_res, va.id, va.tipo, v_bruto, (cmp->>'valor_comparado')::numeric, (cmp->>'diferenca_absoluta')::numeric,
      (cmp->>'diferenca_percentual')::numeric, cmp->>'direcao', cmp->>'posicao_ic', cmp->>'posicao_campo',
      1, cmp->>'status', va.valor, cmp->>'unidade_original', cmp->>'unidade_resultado', cmp->>'unidade_comparacao',
      (cmp->>'area')::numeric, cmp->>'area_campo', cmp->>'area_origem', cmp->>'formula', cmp->>'motivo');
  END LOOP;
  v_dados := jsonb_build_object(
    'resultado', (SELECT to_jsonb(r) FROM public.avaliacao_resultado_economico r WHERE r.id = v_res),
    'valor_adotado', (SELECT to_jsonb(a) FROM public.avaliacao_valores_adotados a WHERE a.id = v_adot),
    'arbitrio', (SELECT to_jsonb(a) FROM public.avaliacao_arbitrios a WHERE a.id = v_arb),
    'centro', to_jsonb(ce), 'projecao', to_jsonb(pj),
    'centros', (SELECT jsonb_agg(to_jsonb(c2) ORDER BY c2.centro) FROM public.avaliacao_projecao_centros c2 WHERE c2.projecao_id = pj.id),
    'compatibilidades', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM public.avaliacao_compatibilidades c WHERE c.resultado_id = v_res), '[]'),
    'unidade_resultado', v_un,
    'politica_arbitrio', to_jsonb(pol), 'politica_arredondamento', to_jsonb(rp));
  INSERT INTO public.avaliacao_resultado_snapshots(organization_id, avaliacao_id, resultado_id, dados, hash)
  VALUES (av.organization_id, av.id, v_res, v_dados, public.aval_hash(v_dados));
  PERFORM public.aval_invalidate(av.id, 'REPORT_ONLY', 'Resultado econômico confirmado', NULL);
  IF v_apl THEN
    PERFORM public.aval_audit(av.id, 'arbitrio', v_arb, 'ARBITRATION_CONFIRMED', jsonb_build_object('valor', p_valor_arbitrado, 'centro', p_centro));
  END IF;
  PERFORM public.aval_audit(av.id, 'resultado_economico', v_res, 'ECONOMIC_RESULT_CONFIRMED',
    jsonb_build_object('centro', p_centro, 'valor_bruto', v_bruto, 'valor_final', v_final, 'conclusao', p_conclusao, 'unidade', v_un->>'unidade'));
  PERFORM public.aval_bump_stage(av.id, 'LAUDO');
  RETURN v_res;
END $function$;

-- 5) Tokens do laudo: valor administrativo com unidade original e equivalente convertido; sem percentual quando não comparável.
CREATE OR REPLACE FUNCTION public.aval_unidade_sufixo(p_unidade text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT regexp_replace(COALESCE(p_unidade, ''), '^R\$\s*', '') $$;

CREATE OR REPLACE FUNCTION public.aval_tokens(p_avaliacao uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE av record; res record; ad record; ce record; pj record; arb record; ac record; mv record; rs record; cp record; im record;
  v_tipo text; v_resp text; v_modelo text; v_conc text; fs record; v_suf text;
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
  SELECT * INTO fs FROM public.validation_foundation_summary WHERE validation_id = ac.validation_id;
  SELECT * INTO cp FROM public.avaliacao_compatibilidades WHERE resultado_id = res.id ORDER BY created_at LIMIT 1;
  SELECT i.* INTO im FROM public.avaliacao_imoveis ai JOIN public.imoveis i ON i.id = ai.imovel_id WHERE ai.avaliacao_id = av.id AND ai.papel = 'AVALIANDO';
  SELECT nome INTO v_modelo FROM public.avaliacao_modelos WHERE id = ac.modelo_id;
  SELECT COALESCE(NULLIF(display_name, ''), split_part(email, '@', 1)) INTO v_resp FROM public.profiles WHERE user_id = av.responsavel_tecnico_id;
  -- Valores monetários por m² levam a unidade no texto (valores mensais mantêm o texto anterior).
  v_suf := CASE WHEN ad.unidade ~ '/m' THEN public.aval_unidade_sufixo(ad.unidade) ELSE '' END;
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
    'VALOR_MERCADO', public.aval_fmt_money(ce.valor) || v_suf, 'LIMITE_INFERIOR', public.aval_fmt_money(ce.limite_inferior) || v_suf, 'LIMITE_SUPERIOR', public.aval_fmt_money(ce.limite_superior) || v_suf,
    'AMPLITUDE_IC', CASE WHEN ce.amplitude_pct IS NOT NULL THEN public.aval_fmt_num(ce.amplitude_pct, 2) || '%' END,
    'CAMPO_INFERIOR', public.aval_fmt_money(arb.campo_inferior) || v_suf, 'CAMPO_SUPERIOR', public.aval_fmt_money(arb.campo_superior) || v_suf,
    'VALOR_FINAL', public.aval_fmt_money(ad.valor_final_apresentacao) || v_suf,
    'ORIGEM_VALOR', CASE ad.origem WHEN 'ARBITRAMENTO' THEN 'arbitrado dentro do campo de arbítrio' WHEN 'TENDENCIA_CENTRAL' THEN 'tendência central' END,
    -- Grau de fundamentação vem só do resumo estruturado da validação do modelo aceito (nunca de texto).
    'GRAU_FUNDAMENTACAO', CASE WHEN mv.id IS NULL THEN NULL WHEN fs.id IS NULL THEN 'não calculado' ELSE COALESCE(fs.grade_calculated, 'não enquadrado') END,
    'PONTOS_FUNDAMENTACAO', CASE WHEN fs.id IS NOT NULL THEN fs.total_points::text END,
    'GRAU_PRECISAO', COALESCE(ce.grau_precisao, CASE WHEN ce.id IS NOT NULL THEN 'não enquadrado' END),
    'VALOR_ADMINISTRATIVO_REFERENCIA', CASE WHEN cp.id IS NULL THEN NULL
      WHEN cp.regra_versao IS NULL THEN public.aval_fmt_money(cp.valor_comparado)
      ELSE public.aval_fmt_money(cp.valor_administrativo_original) || public.aval_unidade_sufixo(cp.unidade_original)
        || CASE WHEN cp.status_comparacao = 'COMPARAVEL' AND cp.area_conversao IS NOT NULL
             THEN ' (equivalente a ' || public.aval_fmt_money(cp.valor_comparado) || public.aval_unidade_sufixo(cp.unidade_comparacao)
               || ', área de ' || public.aval_fmt_num(cp.area_conversao, 2) || ' m²)' ELSE '' END END,
    'DIFERENCA_PERCENTUAL', CASE WHEN cp.id IS NULL THEN NULL WHEN cp.diferenca_percentual IS NULL THEN 'não comparável'
      ELSE public.aval_fmt_num(cp.diferenca_percentual, 2) || '%' END,
    'CONCLUSAO', v_conc, 'DATA_EMISSAO', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY'), 'ENGINE_VERSION', pj.engine_version);
END $function$;

-- 6) Resultados vigentes comparados em unidades diferentes antes desta regra: exigem nova confirmação.
-- Nada é apagado nem reescrito: o resultado passa a "desatualizado" (fica no histórico) e o evento registra os valores antigos.
CREATE OR REPLACE FUNCTION public.aval_compat_revisar_legado() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n integer := 0;
BEGIN
  FOR r IN
    SELECT re.id, re.avaliacao_id, a.status AS av_status, u.cls
      FROM public.avaliacao_resultado_economico re
      JOIN public.avaliacoes a ON a.id = re.avaliacao_id
      CROSS JOIN LATERAL (SELECT public.aval_unidade_resultado(re.projecao_id) AS cls) u
     WHERE re.status = 'VIGENTE'
       AND EXISTS (SELECT 1 FROM public.avaliacao_compatibilidades c WHERE c.resultado_id = re.id AND c.regra_versao IS NULL)
       AND u.cls->>'categoria' IS DISTINCT FROM (public.aval_unidade_administrativa(public.aval_finalidade(a.tipo))->>'categoria')
  LOOP
    PERFORM public.aval_audit(r.avaliacao_id, 'resultado_economico', r.id, 'ECONOMIC_RESULT_UNIT_MISMATCH', jsonb_build_object(
      'motivo', 'Resultado em ' || (r.cls->>'unidade') || ' havia sido comparado diretamente com valores administrativos em R$/mês.',
      'unidade_resultado', r.cls->>'unidade',
      'comparacoes_anteriores', (SELECT jsonb_agg(jsonb_build_object('tipo_valor', c.tipo_valor, 'valor_referencia', c.valor_referencia,
          'valor_comparado', c.valor_comparado, 'diferenca_percentual', c.diferenca_percentual)) FROM public.avaliacao_compatibilidades c WHERE c.resultado_id = r.id),
      'acao', CASE WHEN r.av_status = 'ATIVA' THEN 'resultado marcado como desatualizado; reconfirmar' ELSE 'avaliação encerrada; registro preservado' END));
    IF r.av_status = 'ATIVA' THEN
      PERFORM public.aval_invalidate(r.avaliacao_id, 'ECONOMIC_RESULT', 'Comparação com valores administrativos em unidades diferentes — reconfirme o resultado', NULL);
    END IF;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.aval_compat_revisar_legado() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aval_compat_revisar_legado() TO service_role;
SELECT public.aval_compat_revisar_legado();