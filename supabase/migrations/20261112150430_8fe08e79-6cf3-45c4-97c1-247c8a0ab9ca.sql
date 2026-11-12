-- Avaliações — rodadas de geração de modelos, deduplicação por assinatura canônica, arquivamento sem exclusão,
-- listagem paginada (filtros/ordenação no servidor) e dados para a triagem explicável. Não altera o motor nem execuções.

-- 1) Rodadas e vínculo modelo↔rodada (um modelo já existente pode ser referenciado por rodadas posteriores)
CREATE TABLE public.avaliacao_model_generation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id),
  conjunto_id uuid NOT NULL REFERENCES public.avaliacao_conjuntos_dados(id),
  numero int NOT NULL,
  modo text NOT NULL CHECK (modo IN ('ASSISTIDO','AMPLA','MANUAL')),
  parametros jsonb NOT NULL DEFAULT '{}',
  qtd_estimada int NOT NULL DEFAULT 0,
  qtd_criada int NOT NULL DEFAULT 0,
  qtd_existente int NOT NULL DEFAULT 0,
  qtd_calculada int NOT NULL DEFAULT 0,
  qtd_erro int NOT NULL DEFAULT 0,
  arquivada boolean NOT NULL DEFAULT false, arquivada_em timestamptz, arquivada_por uuid,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (avaliacao_id, numero)
);
CREATE TABLE public.avaliacao_model_run_modelos (
  run_id uuid NOT NULL REFERENCES public.avaliacao_model_generation_runs(id),
  modelo_id uuid NOT NULL REFERENCES public.avaliacao_modelos(id),
  organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id),
  situacao text NOT NULL CHECK (situacao IN ('CRIADO','JA_EXISTENTE','MANUAL')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (run_id, modelo_id)
);
CREATE INDEX avaliacao_model_run_modelos_modelo_idx ON public.avaliacao_model_run_modelos(modelo_id);
GRANT SELECT ON public.avaliacao_model_generation_runs, public.avaliacao_model_run_modelos TO authenticated;
GRANT ALL ON public.avaliacao_model_generation_runs, public.avaliacao_model_run_modelos TO service_role;
ALTER TABLE public.avaliacao_model_generation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacao_model_run_modelos ENABLE ROW LEVEL SECURITY;
CREATE POLICY aval_select ON public.avaliacao_model_generation_runs FOR SELECT TO authenticated USING (public.aval_is_reader(organization_id));
CREATE POLICY aval_select ON public.avaliacao_model_run_modelos FOR SELECT TO authenticated USING (public.aval_is_reader(organization_id));
CREATE TRIGGER update_avaliacao_model_generation_runs_updated_at BEFORE UPDATE ON public.avaliacao_model_generation_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Assinatura canônica e arquivamento (soft) nos modelos
ALTER TABLE public.avaliacao_modelos
  ADD COLUMN IF NOT EXISTS assinatura text,
  ADD COLUMN IF NOT EXISTS arquivado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS arquivado_em timestamptz,
  ADD COLUMN IF NOT EXISTS arquivado_por uuid;
CREATE INDEX IF NOT EXISTS avaliacao_modelos_assinatura_idx ON public.avaliacao_modelos(conjunto_id, assinatura);

-- Conjunto + dependente/transformação/potência + independentes ordenadas (id, transformação, potência) + amostras excluídas.
CREATE OR REPLACE FUNCTION public.aval_model_signature(p_conjunto uuid, p_dep uuid, p_dep_transf text, p_dep_power numeric, p_vars jsonb, p_excluidas uuid[])
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT md5(concat_ws('|', p_conjunto::text,
    p_dep::text || ':' || p_dep_transf || ':' || COALESCE(trim_scale(p_dep_power)::text, ''),
    (SELECT COALESCE(string_agg(k, ',' ORDER BY k), '') FROM (
       SELECT (x->>'variavel_id') || ':' || (x->>'transformacao') || ':' || COALESCE(trim_scale(NULLIF(x->>'power', '')::numeric)::text, '') AS k
         FROM jsonb_array_elements(COALESCE(p_vars, '[]'::jsonb)) x) s),
    (SELECT COALESCE(string_agg(e::text, ',' ORDER BY e::text), '') FROM unnest(COALESCE(p_excluidas, '{}'::uuid[])) e)))
$$;
REVOKE ALL ON FUNCTION public.aval_model_signature(uuid, uuid, text, numeric, jsonb, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aval_model_signature(uuid, uuid, text, numeric, jsonb, uuid[]) TO authenticated, service_role;

UPDATE public.avaliacao_modelos m SET assinatura = public.aval_model_signature(m.conjunto_id, m.dependente_variavel_id, m.dependente_transformacao, m.dependente_power,
  (SELECT COALESCE(jsonb_agg(jsonb_build_object('variavel_id', mv.variavel_id, 'transformacao', mv.transformacao, 'power', mv.power)), '[]') FROM public.avaliacao_modelo_variaveis mv WHERE mv.modelo_id = m.id),
  m.amostras_excluidas)
 WHERE m.assinatura IS NULL;

-- Modelo idêntico (mesmo conjunto) ainda válido; simulações não são deduplicadas.
CREATE OR REPLACE FUNCTION public.aval_model_find_duplicate(p_avaliacao uuid, p_conjunto uuid, p_assinatura text) RETURNS uuid
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT id FROM public.avaliacao_modelos
   WHERE avaliacao_id = p_avaliacao AND conjunto_id = p_conjunto AND assinatura = p_assinatura AND NOT stale
     AND origem_tipo IN ('MANUAL','GERADO_ASSISTIDO','GERADO_AMPLA')
   ORDER BY numero LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.aval_model_find_duplicate(uuid, uuid, text) FROM PUBLIC, anon, authenticated;

-- 3) Núcleo de criação: grava a assinatura e, para manual/candidatos, devolve o modelo idêntico existente em vez de duplicar.
CREATE OR REPLACE FUNCTION public.aval_model_create_core(p_avaliacao uuid, p_conjunto uuid, p_nome text, p_dep_var uuid, p_dep_transf text, p_dep_power numeric, p_vars jsonb, p_origem_tipo text DEFAULT 'MANUAL'::text, p_modelo_origem uuid DEFAULT NULL::uuid, p_amostras_excluidas uuid[] DEFAULT '{}'::uuid[], p_espaco uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_org uuid; v_num int; v_id uuid; v_perm text; x jsonb; v_aut text[]; v_conf numeric; i int := 0; v_sig text;
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
  v_sig := public.aval_model_signature(p_conjunto, p_dep_var, p_dep_transf, p_dep_power, p_vars, COALESCE(p_amostras_excluidas, '{}'));
  IF p_origem_tipo IN ('MANUAL','GERADO_ASSISTIDO','GERADO_AMPLA') THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('aval_model:' || p_conjunto::text, 0));
    v_id := public.aval_model_find_duplicate(p_avaliacao, p_conjunto, v_sig);
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  END IF;
  SELECT COALESCE((parametros->>'nivel_confianca')::numeric, 0.80) INTO v_conf FROM public.validation_policies
   WHERE id = COALESCE((SELECT policy_id FROM public.organization_validation_policy WHERE organization_id = v_org),
                       (SELECT id FROM public.validation_policies WHERE organization_id IS NULL AND status = 'VIGENTE' ORDER BY versao DESC LIMIT 1));
  SELECT COALESCE(max(numero), 0) + 1 INTO v_num FROM public.avaliacao_modelos WHERE avaliacao_id = p_avaliacao;
  INSERT INTO public.avaliacao_modelos(organization_id, avaliacao_id, conjunto_id, espaco_id, numero, nome, modelo_origem_id, origem_tipo,
    dependente_variavel_id, dependente_transformacao, dependente_power, nivel_confianca, amostras_excluidas, created_by, assinatura)
  VALUES (v_org, p_avaliacao, p_conjunto, p_espaco, v_num, COALESCE(NULLIF(btrim(p_nome), ''), 'Modelo ' || v_num), p_modelo_origem,
    p_origem_tipo, p_dep_var, p_dep_transf, p_dep_power, COALESCE(v_conf, 0.80), COALESCE(p_amostras_excluidas, '{}'), auth.uid(), v_sig)
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

-- Contadores de cálculo/erro das rodadas acompanham o status dos modelos (gravado pelo motor).
CREATE OR REPLACE FUNCTION public.aval_run_recount(p_run uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.avaliacao_model_generation_runs r SET
    qtd_calculada = (SELECT count(*) FROM public.avaliacao_model_run_modelos rm JOIN public.avaliacao_modelos m ON m.id = rm.modelo_id
                      WHERE rm.run_id = r.id AND m.status IN ('CALCULADO','EM_VALIDACAO')),
    qtd_erro = (SELECT count(*) FROM public.avaliacao_model_run_modelos rm JOIN public.avaliacao_modelos m ON m.id = rm.modelo_id
                 WHERE rm.run_id = r.id AND m.status = 'ERRO')
   WHERE r.id = p_run
$$;
REVOKE ALL ON FUNCTION public.aval_run_recount(uuid) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.aval_trg_run_counts() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r uuid;
BEGIN
  FOR r IN SELECT run_id FROM public.avaliacao_model_run_modelos WHERE modelo_id = NEW.id LOOP PERFORM public.aval_run_recount(r); END LOOP;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.aval_trg_run_counts() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER aval_run_counts AFTER UPDATE OF status ON public.avaliacao_modelos
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION public.aval_trg_run_counts();

-- 4) Geração de candidatos em rodada: nova rodada a cada geração; idênticos não são recriados (referenciados como já existentes).
CREATE OR REPLACE FUNCTION public.aval_model_generate_round(p_avaliacao uuid, p_conjunto uuid, p_modo text, p_candidatos jsonb, p_confirmado boolean DEFAULT false,
  p_parametros jsonb DEFAULT '{}'::jsonb, p_estimados int DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid; s record; n int; v_soft int; c jsonb; x jsonb; v_dep uuid; v_origem text; v_run uuid; v_num int;
  v_sig text; v_id uuid; v_seen text[] := '{}'; v_criados uuid[] := '{}'; v_exist uuid[] := '{}'; v_rep int := 0;
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
  PERFORM pg_advisory_xact_lock(hashtextextended('aval_model:' || p_conjunto::text, 0));
  SELECT COALESCE(max(numero), 0) + 1 INTO v_num FROM public.avaliacao_model_generation_runs WHERE avaliacao_id = p_avaliacao;
  INSERT INTO public.avaliacao_model_generation_runs(organization_id, avaliacao_id, conjunto_id, numero, modo, parametros, qtd_estimada, created_by)
  VALUES (v_org, p_avaliacao, p_conjunto, v_num, p_modo, COALESCE(p_parametros, '{}'), COALESCE(p_estimados, n), auth.uid())
  RETURNING id INTO v_run;
  FOR c IN SELECT * FROM jsonb_array_elements(p_candidatos) LOOP
    v_sig := public.aval_model_signature(p_conjunto, v_dep, c->>'dep_transf', NULL, c->'vars', '{}');
    IF v_sig = ANY(v_seen) THEN v_rep := v_rep + 1; CONTINUE; END IF;
    v_seen := v_seen || v_sig;
    v_id := public.aval_model_find_duplicate(p_avaliacao, p_conjunto, v_sig);
    IF v_id IS NOT NULL THEN
      v_exist := v_exist || v_id;
      UPDATE public.avaliacao_modelos SET arquivado = false, arquivado_em = NULL, arquivado_por = NULL WHERE id = v_id AND arquivado;
      INSERT INTO public.avaliacao_model_run_modelos(run_id, modelo_id, organization_id, avaliacao_id, situacao) VALUES (v_run, v_id, v_org, p_avaliacao, 'JA_EXISTENTE');
    ELSE
      v_id := public.aval_model_create_core(p_avaliacao, p_conjunto, NULL, v_dep, c->>'dep_transf', NULL, c->'vars', v_origem, NULL, '{}'::uuid[], NULL);
      v_criados := v_criados || v_id;
      INSERT INTO public.avaliacao_model_run_modelos(run_id, modelo_id, organization_id, avaliacao_id, situacao) VALUES (v_run, v_id, v_org, p_avaliacao, 'CRIADO');
    END IF;
  END LOOP;
  UPDATE public.avaliacao_model_generation_runs SET qtd_criada = cardinality(v_criados), qtd_existente = cardinality(v_exist) + v_rep WHERE id = v_run;
  PERFORM public.aval_run_recount(v_run);
  PERFORM public.aval_audit(p_avaliacao, 'rodada_modelos', v_run, 'MODEL_ROUND_CREATED', jsonb_build_object('numero', v_num, 'modo', p_modo, 'conjunto', p_conjunto,
    'estimados', COALESCE(p_estimados, n), 'criados', cardinality(v_criados), 'ja_existentes', cardinality(v_exist), 'repetidos_na_lista', v_rep));
  RETURN jsonb_build_object('rodada_id', v_run, 'numero', v_num, 'criados', to_jsonb(v_criados), 'existentes', to_jsonb(v_exist),
    'ignorados_duplicidade', cardinality(v_exist) + v_rep, 'repetidos_na_lista', v_rep,
    'a_calcular', (SELECT COALESCE(jsonb_agg(m.id ORDER BY m.numero), '[]') FROM public.avaliacao_modelos m
                    WHERE m.id = ANY(v_criados || v_exist) AND m.status = 'RASCUNHO' AND NOT m.stale));
END $$;
REVOKE ALL ON FUNCTION public.aval_model_generate_round(uuid, uuid, text, jsonb, boolean, jsonb, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aval_model_generate_round(uuid, uuid, text, jsonb, boolean, jsonb, int) TO authenticated, service_role;

-- Compatibilidade: a função antiga passa a criar uma rodada e devolve os ids da rodada (novos + já existentes).
CREATE OR REPLACE FUNCTION public.aval_model_generate_batch(p_avaliacao uuid, p_conjunto uuid, p_modo text, p_candidatos jsonb, p_confirmado boolean DEFAULT false)
RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  r := public.aval_model_generate_round(p_avaliacao, p_conjunto, p_modo, p_candidatos, p_confirmado, '{}'::jsonb, NULL);
  RETURN ARRAY(SELECT jsonb_array_elements_text(r->'criados')::uuid) || ARRAY(SELECT jsonb_array_elements_text(r->'existentes')::uuid);
END $$;
REVOKE ALL ON FUNCTION public.aval_model_generate_batch(uuid, uuid, text, jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aval_model_generate_batch(uuid, uuid, text, jsonb, boolean) TO authenticated, service_role;

-- Modelo manual: deduplicado pelo núcleo e vinculado à rodada vigente do mesmo conjunto (ou a uma rodada MANUAL nova).
CREATE OR REPLACE FUNCTION public.aval_model_create(p_avaliacao uuid, p_conjunto uuid, p_nome text, p_dep_var uuid, p_dep_transf text, p_dep_power numeric, p_vars jsonb, p_origem_tipo text DEFAULT 'MANUAL'::text, p_modelo_origem uuid DEFAULT NULL::uuid, p_amostras_excluidas uuid[] DEFAULT '{}'::uuid[], p_espaco uuid DEFAULT NULL::uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_id uuid; v_exist uuid; v_run uuid; v_org uuid; v_num int;
BEGIN
  IF p_origem_tipo IN ('GERADO_ASSISTIDO','GERADO_AMPLA') THEN RAISE EXCEPTION 'aval:use_candidate_batch' USING ERRCODE = '22023'; END IF;
  IF COALESCE(p_origem_tipo, 'MANUAL') = 'MANUAL' AND jsonb_typeof(p_vars) = 'array' THEN
    v_exist := public.aval_model_find_duplicate(p_avaliacao, p_conjunto,
      public.aval_model_signature(p_conjunto, p_dep_var, p_dep_transf, p_dep_power, p_vars, COALESCE(p_amostras_excluidas, '{}')));
  END IF;
  v_id := public.aval_model_create_core(p_avaliacao, p_conjunto, p_nome, p_dep_var, p_dep_transf, p_dep_power, p_vars, p_origem_tipo, p_modelo_origem, p_amostras_excluidas, p_espaco);
  IF COALESCE(p_origem_tipo, 'MANUAL') = 'MANUAL' THEN
    SELECT organization_id INTO v_org FROM public.avaliacoes WHERE id = p_avaliacao;
    SELECT id INTO v_run FROM public.avaliacao_model_generation_runs WHERE avaliacao_id = p_avaliacao ORDER BY numero DESC LIMIT 1;
    IF v_run IS NULL OR NOT EXISTS (SELECT 1 FROM public.avaliacao_model_generation_runs WHERE id = v_run AND conjunto_id = p_conjunto AND NOT arquivada) THEN
      SELECT COALESCE(max(numero), 0) + 1 INTO v_num FROM public.avaliacao_model_generation_runs WHERE avaliacao_id = p_avaliacao;
      INSERT INTO public.avaliacao_model_generation_runs(organization_id, avaliacao_id, conjunto_id, numero, modo, qtd_estimada, created_by)
      VALUES (v_org, p_avaliacao, p_conjunto, v_num, 'MANUAL', 1, auth.uid()) RETURNING id INTO v_run;
    END IF;
    INSERT INTO public.avaliacao_model_run_modelos(run_id, modelo_id, organization_id, avaliacao_id, situacao)
    VALUES (v_run, v_id, v_org, p_avaliacao, CASE WHEN v_exist IS NOT NULL THEN 'JA_EXISTENTE' ELSE 'MANUAL' END) ON CONFLICT DO NOTHING;
    IF v_exist IS NOT NULL THEN
      UPDATE public.avaliacao_modelos SET arquivado = false, arquivado_em = NULL, arquivado_por = NULL WHERE id = v_id AND arquivado;
    END IF;
    PERFORM public.aval_run_recount(v_run);
  END IF;
  RETURN v_id;
END $function$;
REVOKE ALL ON FUNCTION public.aval_model_create(uuid, uuid, text, uuid, text, numeric, jsonb, text, uuid, uuid[], uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aval_model_create(uuid, uuid, text, uuid, text, numeric, jsonb, text, uuid, uuid[], uuid) TO authenticated, service_role;

-- 5) Arquivamento visual (nunca exclui). Protegidos: em validação/validados/aceitos/projetados/usados em simulação, candidatos enviados e favoritos.
CREATE OR REPLACE FUNCTION public.aval_model_protegido(p_modelo uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT m.status NOT IN ('RASCUNHO','CALCULADO','ERRO') OR m.candidato OR m.favorito
      OR EXISTS (SELECT 1 FROM public.modelo_snapshots x WHERE x.modelo_id = m.id)
      OR EXISTS (SELECT 1 FROM public.model_validations x WHERE x.modelo_id = m.id)
      OR EXISTS (SELECT 1 FROM public.model_acceptances x WHERE x.modelo_id = m.id)
      OR EXISTS (SELECT 1 FROM public.avaliacao_projecoes x WHERE x.modelo_id = m.id)
      OR EXISTS (SELECT 1 FROM public.avaliacao_modelos x WHERE x.modelo_origem_id = m.id)
    FROM public.avaliacao_modelos m WHERE m.id = p_modelo
$$;
REVOKE ALL ON FUNCTION public.aval_model_protegido(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aval_model_protegido(uuid) TO authenticated, service_role;

-- p_modelos NULL = todos da avaliação (ou da rodada p_rodada). Desarquivar não tem restrição.
CREATE OR REPLACE FUNCTION public.aval_model_archive(p_avaliacao uuid, p_modelos uuid[] DEFAULT NULL, p_rodada uuid DEFAULT NULL, p_arquivar boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_alvo uuid[]; v_ok uuid[]; v_prot int;
BEGIN
  IF NOT public.aval_can_edit(p_avaliacao, 'model.create') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  IF p_rodada IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.avaliacao_model_generation_runs WHERE id = p_rodada AND avaliacao_id = p_avaliacao) THEN
    RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(array_agg(m.id), '{}') INTO v_alvo FROM public.avaliacao_modelos m
   WHERE m.avaliacao_id = p_avaliacao AND m.arquivado IS DISTINCT FROM COALESCE(p_arquivar, true)
     AND (p_modelos IS NULL OR m.id = ANY(p_modelos))
     AND (p_rodada IS NULL OR EXISTS (SELECT 1 FROM public.avaliacao_model_run_modelos rm WHERE rm.run_id = p_rodada AND rm.modelo_id = m.id));
  IF COALESCE(p_arquivar, true) THEN
    SELECT COALESCE(array_agg(id), '{}') INTO v_ok FROM unnest(v_alvo) id WHERE NOT public.aval_model_protegido(id);
    UPDATE public.avaliacao_modelos SET arquivado = true, arquivado_em = now(), arquivado_por = auth.uid() WHERE id = ANY(v_ok);
  ELSE
    v_ok := v_alvo;
    UPDATE public.avaliacao_modelos SET arquivado = false, arquivado_em = NULL, arquivado_por = NULL WHERE id = ANY(v_ok);
  END IF;
  v_prot := cardinality(v_alvo) - cardinality(v_ok);
  IF cardinality(v_ok) > 0 THEN
    PERFORM public.aval_audit(p_avaliacao, 'avaliacao', p_avaliacao, CASE WHEN COALESCE(p_arquivar, true) THEN 'MODELS_ARCHIVED' ELSE 'MODELS_UNARCHIVED' END,
      jsonb_build_object('quantidade', cardinality(v_ok), 'protegidos', v_prot, 'rodada', p_rodada, 'modelos', to_jsonb(v_ok[1:500])));
  END IF;
  RETURN jsonb_build_object('alterados', cardinality(v_ok), 'protegidos', v_prot);
END $$;
REVOKE ALL ON FUNCTION public.aval_model_archive(uuid, uuid[], uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aval_model_archive(uuid, uuid[], uuid, boolean) TO authenticated, service_role;

-- Arquivar rodada: marca a rodada e arquiva seus modelos não protegidos que não pertençam a outra rodada ativa.
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
  v_res := public.aval_model_archive(r.avaliacao_id, v_ids, NULL, COALESCE(p_arquivar, true));
  PERFORM public.aval_audit(r.avaliacao_id, 'rodada_modelos', p_run, CASE WHEN COALESCE(p_arquivar, true) THEN 'MODEL_ROUND_ARCHIVED' ELSE 'MODEL_ROUND_UNARCHIVED' END,
    jsonb_build_object('numero', r.numero) || v_res);
  RETURN v_res || jsonb_build_object('rodada', r.numero, 'mantidos_outras_rodadas',
    (SELECT count(*) FROM public.avaliacao_model_run_modelos WHERE run_id = p_run) - cardinality(v_ids));
END $$;
REVOKE ALL ON FUNCTION public.aval_model_run_archive(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aval_model_run_archive(uuid, boolean) TO authenticated, service_role;

-- 6) Leitura (respeita as regras de acesso: SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.aval_model_runs(p_avaliacao uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', r.id, 'numero', r.numero, 'modo', r.modo, 'conjunto_id', r.conjunto_id, 'conjunto_versao', c.versao,
    'qtd_estimada', r.qtd_estimada, 'qtd_criada', r.qtd_criada, 'qtd_existente', r.qtd_existente, 'qtd_calculada', r.qtd_calculada, 'qtd_erro', r.qtd_erro,
    'modelos', (SELECT count(*) FROM public.avaliacao_model_run_modelos rm WHERE rm.run_id = r.id),
    'arquivada', r.arquivada, 'parametros', r.parametros, 'created_at', r.created_at) ORDER BY r.numero DESC), '[]')
    FROM public.avaliacao_model_generation_runs r JOIN public.avaliacao_conjuntos_dados c ON c.id = r.conjunto_id
   WHERE r.avaliacao_id = p_avaliacao
$$;
REVOKE ALL ON FUNCTION public.aval_model_runs(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aval_model_runs(uuid) TO authenticated, service_role;

-- Lista paginada com o resumo da última execução (modelo_resultado_resumo). Filtros e ordenação por lista fechada.
CREATE OR REPLACE FUNCTION public.aval_model_list(p_avaliacao uuid, p_rodada uuid DEFAULT NULL, p_filtros jsonb DEFAULT '{}'::jsonb,
  p_ordem text DEFAULT 'numero', p_desc boolean DEFAULT true, p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH prm AS (
    SELECT COALESCE(p_filtros, '{}'::jsonb) AS f, COALESCE(p_filtros->>'arquivados', 'OCULTAR') AS arq,
           CASE WHEN p_ordem IN ('numero','r2_ajustado','pior_sig_regressor','amplitude_pct','n') THEN p_ordem ELSE 'numero' END AS o,
           COALESCE(p_desc, true) AS d, LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200) AS lim, GREATEST(COALESCE(p_offset, 0), 0) AS off),
  base AS (
    SELECT m.id, m.numero, r.r2_ajustado, r.pior_sig_regressor, r.amplitude_pct, r.n,
      jsonb_build_object('id', m.id, 'numero', m.numero, 'nome', m.nome, 'origem_tipo', m.origem_tipo, 'status', m.status, 'stale', m.stale,
        'favorito', m.favorito, 'candidato', m.candidato, 'arquivado', m.arquivado, 'conjunto_id', m.conjunto_id, 'conjunto_versao', cj.versao,
        'dependente_variavel_id', m.dependente_variavel_id, 'dependente_transformacao', m.dependente_transformacao,
        'variaveis', (SELECT COALESCE(jsonb_agg(jsonb_build_object('variavel_id', mv.variavel_id, 'transformacao', mv.transformacao, 'ordem', mv.ordem) ORDER BY mv.ordem), '[]')
                        FROM public.avaliacao_modelo_variaveis mv WHERE mv.modelo_id = m.id),
        'resumo', CASE WHEN r.id IS NULL THEN NULL ELSE jsonb_build_object('n', r.n, 'k', r.k, 'r2', r.r2, 'r2_ajustado', r.r2_ajustado, 'f', r.f, 'sig_f', r.sig_f,
          'pior_sig_regressor', r.pior_sig_regressor, 'amplitude_pct', r.amplitude_pct, 'grau_precisao', r.grau_precisao, 'extrapola', r.extrapola) END) AS j
      FROM prm, public.avaliacao_modelos m
      JOIN public.avaliacao_conjuntos_dados cj ON cj.id = m.conjunto_id
      LEFT JOIN LATERAL (SELECT rr.* FROM public.modelo_resultado_resumo rr WHERE rr.modelo_id = m.id ORDER BY rr.created_at DESC LIMIT 1) r ON true
     WHERE m.avaliacao_id = p_avaliacao
       AND (p_rodada IS NULL OR EXISTS (SELECT 1 FROM public.avaliacao_model_run_modelos rm WHERE rm.run_id = p_rodada AND rm.modelo_id = m.id))
       AND (prm.arq = 'TODOS' OR (prm.arq = 'SOMENTE' AND m.arquivado) OR (prm.arq NOT IN ('TODOS','SOMENTE') AND NOT m.arquivado))
       AND (prm.f->>'status' IS NULL OR (prm.f->>'status' = 'CALCULADO' AND m.status IN ('CALCULADO','EM_VALIDACAO')) OR (prm.f->>'status' = 'ERRO' AND m.status = 'ERRO'))
       AND (NOT COALESCE((prm.f->>'favoritos')::boolean, false) OR m.favorito)
       AND (NOT COALESCE((prm.f->>'sem_extrapolacao')::boolean, false) OR r.extrapola = false)
       AND (jsonb_typeof(prm.f->'graus_precisao') IS DISTINCT FROM 'array' OR jsonb_array_length(prm.f->'graus_precisao') = 0 OR (prm.f->'graus_precisao') ? r.grau_precisao)
       AND (jsonb_typeof(prm.f->'ids') IS DISTINCT FROM 'array' OR m.id::text IN (SELECT jsonb_array_elements_text(prm.f->'ids'))))
  SELECT jsonb_build_object('total', (SELECT count(*) FROM base), 'limit', prm.lim, 'offset', prm.off,
    'rows', (SELECT COALESCE(jsonb_agg(s.j ORDER BY s.ord), '[]') FROM (
      SELECT b.j, row_number() OVER (ORDER BY
        CASE WHEN p.o = 'r2_ajustado' AND p.d THEN b.r2_ajustado END DESC NULLS LAST, CASE WHEN p.o = 'r2_ajustado' AND NOT p.d THEN b.r2_ajustado END ASC NULLS LAST,
        CASE WHEN p.o = 'pior_sig_regressor' AND p.d THEN b.pior_sig_regressor END DESC NULLS LAST, CASE WHEN p.o = 'pior_sig_regressor' AND NOT p.d THEN b.pior_sig_regressor END ASC NULLS LAST,
        CASE WHEN p.o = 'amplitude_pct' AND p.d THEN b.amplitude_pct END DESC NULLS LAST, CASE WHEN p.o = 'amplitude_pct' AND NOT p.d THEN b.amplitude_pct END ASC NULLS LAST,
        CASE WHEN p.o = 'n' AND p.d THEN b.n END DESC NULLS LAST, CASE WHEN p.o = 'n' AND NOT p.d THEN b.n END ASC NULLS LAST,
        CASE WHEN p.o = 'numero' AND NOT p.d THEN b.numero END ASC, b.numero DESC) AS ord
        FROM base b, prm p ORDER BY ord LIMIT (SELECT lim FROM prm) OFFSET (SELECT off FROM prm)) s))
    FROM prm
$$;
REVOKE ALL ON FUNCTION public.aval_model_list(uuid, uuid, jsonb, text, boolean, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aval_model_list(uuid, uuid, jsonb, text, boolean, int, int) TO authenticated, service_role;

-- Dados da triagem prévia: modelos calculados, válidos e não arquivados (ou os ids pedidos, para o comparador),
-- com coeficientes da última execução e os limites de significância da política vigente da organização.
CREATE OR REPLACE FUNCTION public.aval_model_triagem_dados(p_avaliacao uuid, p_rodada uuid DEFAULT NULL, p_ids uuid[] DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH av AS (SELECT id, organization_id FROM public.avaliacoes WHERE id = p_avaliacao),
  pol AS (
    SELECT p.id, p.codigo, p.versao FROM public.validation_policies p, av
     WHERE p.id = COALESCE((SELECT policy_id FROM public.organization_validation_policy o WHERE o.organization_id = av.organization_id),
                           (SELECT id FROM public.validation_policies WHERE organization_id IS NULL AND status = 'VIGENTE' ORDER BY versao DESC LIMIT 1))),
  mods AS (
    SELECT m.*, e.id AS ex_id FROM public.avaliacao_modelos m
      JOIN LATERAL (SELECT x.id, x.status FROM public.avaliacao_modelo_execucoes x WHERE x.modelo_id = m.id ORDER BY x.created_at DESC LIMIT 1) e ON e.status = 'SUCESSO'
     WHERE m.avaliacao_id = p_avaliacao AND m.status IN ('CALCULADO','EM_VALIDACAO')
       AND (p_ids IS NOT NULL AND m.id = ANY(p_ids)
         OR p_ids IS NULL AND NOT m.stale AND NOT m.arquivado AND m.status = 'CALCULADO'
            AND (p_rodada IS NULL OR EXISTS (SELECT 1 FROM public.avaliacao_model_run_modelos rm WHERE rm.run_id = p_rodada AND rm.modelo_id = m.id))))
  SELECT jsonb_build_object(
    'politica', (SELECT jsonb_build_object('id', pol.id, 'codigo', pol.codigo, 'versao', pol.versao,
        'sig_regressores', (SELECT r.thresholds->'graus' FROM public.validation_policy_rules r WHERE r.policy_id = pol.id AND r.codigo = 'SIGNIF_REGRESSORES' AND r.ativo LIMIT 1),
        'sig_modelo', (SELECT r.thresholds->'graus' FROM public.validation_policy_rules r WHERE r.policy_id = pol.id AND r.codigo = 'SIGNIF_MODELO' AND r.ativo LIMIT 1)) FROM pol),
    'modelos', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', m.id, 'numero', m.numero, 'nome', m.nome, 'status', m.status, 'stale', m.stale, 'arquivado', m.arquivado,
        'origem_tipo', m.origem_tipo, 'dependente_variavel_id', m.dependente_variavel_id, 'dependente_transformacao', m.dependente_transformacao, 'dependente_power', m.dependente_power,
        'resumo', (SELECT jsonb_build_object('n', rr.n, 'k', rr.k, 'r2', rr.r2, 'r2_ajustado', rr.r2_ajustado, 'f', rr.f, 'sig_f', rr.sig_f, 'pior_sig_regressor', rr.pior_sig_regressor,
                     'amplitude_pct', rr.amplitude_pct, 'grau_precisao', rr.grau_precisao, 'extrapola', rr.extrapola) FROM public.modelo_resultado_resumo rr WHERE rr.execucao_id = m.ex_id),
        'variaveis', (SELECT COALESCE(jsonb_agg(jsonb_build_object('variavel_id', v.id, 'codigo', v.codigo, 'nome', v.nome, 'transformacao', mv.transformacao, 'power', mv.power,
                         'relacao_esperada', v.relacao_esperada, 'beta', c.beta, 'sig', c.sig) ORDER BY mv.ordem), '[]')
                        FROM public.avaliacao_modelo_variaveis mv JOIN public.avaliacao_variaveis v ON v.id = mv.variavel_id
                        LEFT JOIN public.modelo_coeficientes c ON c.execucao_id = m.ex_id AND c.codigo = v.codigo
                       WHERE mv.modelo_id = m.id)) ORDER BY m.numero), '[]') FROM mods m))
$$;
REVOKE ALL ON FUNCTION public.aval_model_triagem_dados(uuid, uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aval_model_triagem_dados(uuid, uuid, uuid[]) TO authenticated, service_role;

-- 7) Rodadas para modelos gerados antes desta mudança (cada lote gravado na mesma transação = uma rodada). Não altera modelos.
DO $$
DECLARE g record; v_run uuid; v_num int;
BEGIN
  FOR g IN
    SELECT m.avaliacao_id, m.organization_id, m.conjunto_id, m.origem_tipo, m.created_at, min(m.created_by::text)::uuid AS created_by, count(*) AS n
      FROM public.avaliacao_modelos m
     WHERE m.origem_tipo IN ('GERADO_ASSISTIDO','GERADO_AMPLA','MANUAL')
       AND NOT EXISTS (SELECT 1 FROM public.avaliacao_model_run_modelos rm WHERE rm.modelo_id = m.id)
     GROUP BY 1, 2, 3, 4, 5 ORDER BY m.created_at
  LOOP
    SELECT COALESCE(max(numero), 0) + 1 INTO v_num FROM public.avaliacao_model_generation_runs WHERE avaliacao_id = g.avaliacao_id;
    INSERT INTO public.avaliacao_model_generation_runs(organization_id, avaliacao_id, conjunto_id, numero, modo, parametros, qtd_estimada, qtd_criada, created_by, created_at)
    VALUES (g.organization_id, g.avaliacao_id, g.conjunto_id, v_num, CASE g.origem_tipo WHEN 'GERADO_AMPLA' THEN 'AMPLA' WHEN 'GERADO_ASSISTIDO' THEN 'ASSISTIDO' ELSE 'MANUAL' END,
      jsonb_build_object('origem', 'registro_anterior_as_rodadas'), g.n, g.n, g.created_by, g.created_at)
    RETURNING id INTO v_run;
    INSERT INTO public.avaliacao_model_run_modelos(run_id, modelo_id, organization_id, avaliacao_id, situacao, created_at)
    SELECT v_run, m.id, m.organization_id, m.avaliacao_id, CASE WHEN g.origem_tipo = 'MANUAL' THEN 'MANUAL' ELSE 'CRIADO' END, g.created_at
      FROM public.avaliacao_modelos m
     WHERE m.avaliacao_id = g.avaliacao_id AND m.conjunto_id = g.conjunto_id AND m.origem_tipo = g.origem_tipo AND m.created_at = g.created_at;
    PERFORM public.aval_run_recount(v_run);
  END LOOP;
END $$;