-- Avaliações V1 — Rodada 2 (somente aditiva). Fundamentação estruturada, tabelas estatísticas derivadas,
-- limites de candidatos por organização, arquivos oficiais emitidos congelados, IA no laudo e guarda de permissões técnicas.

-- 1) Variáveis: PROXY/CODIGO_ALOCADO podem ser marcadas como não categóricas (micronumerosidade)
ALTER TABLE public.avaliacao_variaveis ADD COLUMN IF NOT EXISTS categorica boolean;

-- 2) Política institucional SIDIF_V1 versão 2 (v1 fica preservada para validações já registradas)
DO $mig$
DECLARE v1 uuid; v2 uuid;
BEGIN
  SELECT id INTO v1 FROM public.validation_policies WHERE codigo = 'SIDIF_V1' AND versao = 1 AND organization_id IS NULL;
  IF v1 IS NULL OR EXISTS (SELECT 1 FROM public.validation_policies WHERE codigo = 'SIDIF_V1' AND versao = 2 AND organization_id IS NULL) THEN RETURN; END IF;
  INSERT INTO public.validation_policies(organization_id, codigo, nome, versao, status, parametros)
  SELECT NULL, codigo, nome, 2, 'VIGENTE', parametros || jsonb_build_object('fundamentacao', jsonb_build_object(
      'referencia', 'ABNT NBR 14653-2:2011 — Tabelas 1 e 2 (graus de fundamentação em regressão linear). Conferir com a edição vigente da norma.',
      'origem', 'NORMA_TECNICA',
      'pontos', jsonb_build_object('III', 3, 'II', 2, 'I', 1),
      'itens', jsonb_build_array(
        jsonb_build_object('item', 1, 'codigo', 'CARACTERIZACAO_AVALIANDO', 'titulo', 'Caracterização do imóvel avaliando', 'source_type', 'MANUAL', 'obrigatorio', false),
        jsonb_build_object('item', 2, 'codigo', 'QUANTIDADE_DADOS', 'titulo', 'Quantidade mínima de dados de mercado efetivamente utilizados', 'source_type', 'CRITERIO', 'criterio', 'NUMERO_DADOS', 'obrigatorio', true),
        jsonb_build_object('item', 3, 'codigo', 'IDENTIFICACAO_DADOS', 'titulo', 'Identificação dos dados de mercado', 'source_type', 'MANUAL', 'obrigatorio', false),
        jsonb_build_object('item', 4, 'codigo', 'EXTRAPOLACAO', 'titulo', 'Extrapolação', 'source_type', 'CRITERIO', 'criterio', 'EXTRAPOLACAO', 'obrigatorio', true),
        jsonb_build_object('item', 5, 'codigo', 'SIGNIF_REGRESSORES', 'titulo', 'Nível de significância máximo de cada regressor (bicaudal)', 'source_type', 'CRITERIO', 'criterio', 'SIGNIF_REGRESSORES', 'obrigatorio', true),
        jsonb_build_object('item', 6, 'codigo', 'SIGNIF_MODELO', 'titulo', 'Nível de significância máximo do modelo (teste F)', 'source_type', 'CRITERIO', 'criterio', 'SIGNIF_MODELO', 'obrigatorio', true)),
      'enquadramento', jsonb_build_array(
        jsonb_build_object('grau', 'III', 'pontos_min', 16, 'obrigatorios_grau_min', 'III', 'demais_grau_min', 'II'),
        jsonb_build_object('grau', 'II', 'pontos_min', 10, 'obrigatorios_grau_min', 'II', 'demais_grau_min', 'I'),
        jsonb_build_object('grau', 'I', 'pontos_min', 6, 'obrigatorios_grau_min', 'I', 'demais_grau_min', 'I'))))
  FROM public.validation_policies WHERE id = v1
  RETURNING id INTO v2;
  INSERT INTO public.validation_policy_rules(policy_id, codigo, numero, nome, origem, modo, bloqueante, entra_fundamentacao, thresholds, ativo)
  SELECT v2, codigo, numero, nome, origem, modo, bloqueante, entra_fundamentacao,
    CASE codigo
      WHEN 'NORMALIDADE' THEN thresholds || jsonb_build_object('comparacao_sem_tolerancia', 'MINIMO', 'comparacao_origem', 'PROCEDIMENTO_INTERNO')
      WHEN 'PONTOS_INFLUENTES' THEN (thresholds - 'cook_limite') || jsonb_build_object('cook_regra', jsonb_build_object('tipo', 'K_SOBRE_N', 'k', 4, 'origem', 'PROCEDIMENTO_INTERNO',
          'descricao', 'Heurística operacional D > 4/n para sinalizar amostras influentes. Não é limite normativo; nenhuma amostra é excluída automaticamente.'))
      WHEN 'MICRONUMEROSIDADE' THEN thresholds || jsonb_build_object('tipos', jsonb_build_array('DICOTOMICA', 'PROXY', 'CODIGO_ALOCADO'))
      WHEN 'EXTRAPOLACAO' THEN thresholds - 'grau_maximo_com_extrapolacao'
      ELSE thresholds END,
    ativo
  FROM public.validation_policy_rules WHERE policy_id = v1;
  UPDATE public.validation_policies SET status = 'SUPERADA' WHERE id = v1;
END $mig$;

-- 3) Fundamentação estruturada
CREATE TABLE public.validation_foundation_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id),
  validation_id uuid NOT NULL UNIQUE REFERENCES public.model_validations(id),
  policy_id uuid NOT NULL REFERENCES public.validation_policies(id),
  policy_version integer NOT NULL,
  policy_reference text,
  total_points integer NOT NULL,
  grade_calculated text CHECK (grade_calculated IN ('III','II','I')),
  requirements_met boolean NOT NULL,
  mandatory_requirements_json jsonb NOT NULL DEFAULT '[]',
  pendencias jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.validation_foundation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id),
  validation_id uuid NOT NULL REFERENCES public.model_validations(id),
  item_number integer NOT NULL,
  codigo text NOT NULL,
  titulo text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('CRITERIO','MANUAL')),
  criterio_codigo text,
  grade_achieved text CHECK (grade_achieved IN ('III','II','I')),
  points integer NOT NULL DEFAULT 0,
  mandatory_for_grade boolean NOT NULL DEFAULT false,
  status text NOT NULL CHECK (status IN ('ATENDE','NAO_ATENDE','REQUER_ANALISE','NAO_APLICAVEL','NAO_VERIFICADO')),
  details_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (validation_id, codigo)
);
CREATE TABLE public.validation_foundation_manual_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id),
  modelo_id uuid NOT NULL REFERENCES public.avaliacao_modelos(id),
  codigo text NOT NULL CHECK (codigo ~ '^[A-Z][A-Z0-9_]{2,59}$'),
  grau text NOT NULL CHECK (grau IN ('III','II','I','NAO_ENQUADRA')),
  justificativa text NOT NULL CHECK (length(btrim(justificativa)) >= 10),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.validation_foundation_items(validation_id);
CREATE INDEX ON public.validation_foundation_manual_grades(modelo_id, codigo, created_at);
GRANT SELECT ON public.validation_foundation_summary, public.validation_foundation_items TO authenticated;
GRANT SELECT, INSERT ON public.validation_foundation_manual_grades TO authenticated;
GRANT ALL ON public.validation_foundation_summary, public.validation_foundation_items, public.validation_foundation_manual_grades TO service_role;
ALTER TABLE public.validation_foundation_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_foundation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_foundation_manual_grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY aval_select ON public.validation_foundation_summary FOR SELECT TO authenticated USING (public.aval_is_reader(organization_id));
CREATE POLICY aval_select ON public.validation_foundation_items FOR SELECT TO authenticated USING (public.aval_is_reader(organization_id));
CREATE POLICY aval_select ON public.validation_foundation_manual_grades FOR SELECT TO authenticated USING (public.aval_is_reader(organization_id));
CREATE POLICY aval_insert ON public.validation_foundation_manual_grades FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.aval_can_edit(avaliacao_id, 'validation.manual_review'));

-- Preenche avaliacao_id a partir do modelo (antes da checagem de permissão) e registra auditoria.
CREATE OR REPLACE FUNCTION public.aval_fgrade_prepare() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m record;
BEGIN
  SELECT id, avaliacao_id, stale FROM public.avaliacao_modelos WHERE id = NEW.modelo_id INTO m;
  IF m.id IS NULL THEN RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
  IF m.stale THEN RAISE EXCEPTION 'aval:model_stale' USING ERRCODE = '22023'; END IF;
  NEW.avaliacao_id := m.avaliacao_id;
  NEW.justificativa := btrim(NEW.justificativa);
  IF NOT public.aval_is_privileged() THEN NEW.created_by := auth.uid(); NEW.created_at := now(); END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.aval_fgrade_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.aval_audit(NEW.avaliacao_id, 'modelo', NEW.modelo_id, 'FOUNDATION_GRADE_ASSIGNED', jsonb_build_object('item', NEW.codigo, 'grau', NEW.grau));
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.aval_fgrade_prepare() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.aval_fgrade_audit() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER aval_fgrade_prepare BEFORE INSERT ON public.validation_foundation_manual_grades FOR EACH ROW EXECUTE FUNCTION public.aval_fgrade_prepare();
CREATE TRIGGER aval_fgrade_audit AFTER INSERT ON public.validation_foundation_manual_grades FOR EACH ROW EXECUTE FUNCTION public.aval_fgrade_audit();
DO $mig$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['validation_foundation_summary','validation_foundation_items','validation_foundation_manual_grades'] LOOP
    EXECUTE format('CREATE TRIGGER aval_set_org BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.aval_set_org()', t);
    EXECUTE format('CREATE TRIGGER aval_immutable BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.aval_block_mutation()', t);
  END LOOP;
END $mig$;

-- 4) Tabelas estatísticas derivadas (preenchidas a partir da MESMA saída do motor; imutáveis)
CREATE TABLE public.modelo_anova (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id),
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), execucao_id uuid NOT NULL REFERENCES public.avaliacao_modelo_execucoes(id),
  modelo_id uuid NOT NULL REFERENCES public.avaliacao_modelos(id),
  ordem integer NOT NULL, fonte text NOT NULL CHECK (fonte IN ('REGRESSAO','RESIDUO','TOTAL')),
  sq numeric NOT NULL, gl integer NOT NULL, mq numeric NOT NULL, f numeric, significancia numeric,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (execucao_id, fonte)
);
CREATE TABLE public.modelo_residuos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id),
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), execucao_id uuid NOT NULL REFERENCES public.avaliacao_modelo_execucoes(id),
  modelo_id uuid NOT NULL REFERENCES public.avaliacao_modelos(id),
  amostra_id uuid NOT NULL, ordem integer NOT NULL,
  observado_original numeric NOT NULL, estimado_original numeric NOT NULL,
  observado_transformado numeric NOT NULL, estimado_transformado numeric NOT NULL,
  residuo numeric NOT NULL, residuo_relativo numeric, residuo_dp numeric NOT NULL, leverage numeric NOT NULL, cook numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (execucao_id, amostra_id)
);
CREATE TABLE public.modelo_normalidade (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id),
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), execucao_id uuid NOT NULL REFERENCES public.avaliacao_modelo_execucoes(id),
  modelo_id uuid NOT NULL REFERENCES public.avaliacao_modelos(id), policy_id uuid REFERENCES public.validation_policies(id),
  z numeric NOT NULL, referencia numeric, tolerancia numeric, criterio text, limite_inferior numeric, limite_superior numeric,
  observado numeric NOT NULL, status text NOT NULL CHECK (status IN ('ATENDE','FORA','NAO_VERIFICADO')),
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (execucao_id, z)
);
CREATE TABLE public.modelo_correlacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id),
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), execucao_id uuid NOT NULL REFERENCES public.avaliacao_modelo_execucoes(id),
  modelo_id uuid NOT NULL REFERENCES public.avaliacao_modelos(id),
  variavel_a text NOT NULL, variavel_b text NOT NULL, correlacao numeric, escala text NOT NULL DEFAULT 'TRANSFORMADA',
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (execucao_id, variavel_a, variavel_b, escala)
);
CREATE TABLE public.modelo_estatisticas_variaveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id),
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), execucao_id uuid NOT NULL REFERENCES public.avaliacao_modelo_execucoes(id),
  modelo_id uuid NOT NULL REFERENCES public.avaliacao_modelos(id),
  variavel text NOT NULL, papel text NOT NULL, transformacao text NOT NULL, n integer NOT NULL,
  minimo numeric NOT NULL, maximo numeric NOT NULL, media numeric NOT NULL, desvio_padrao numeric NOT NULL, amplitude numeric NOT NULL,
  minimo_transformado numeric NOT NULL, maximo_transformado numeric NOT NULL, media_transformada numeric NOT NULL, desvio_padrao_transformado numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (execucao_id, variavel)
);
CREATE TABLE public.modelo_extrapolacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id),
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), execucao_id uuid NOT NULL REFERENCES public.avaliacao_modelo_execucoes(id),
  modelo_id uuid NOT NULL REFERENCES public.avaliacao_modelos(id),
  variavel text NOT NULL, valor_avaliando numeric NOT NULL, min_amostra numeric NOT NULL, max_amostra numeric NOT NULL, inside boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (execucao_id, variavel)
);
DO $mig$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['modelo_anova','modelo_residuos','modelo_normalidade','modelo_correlacoes','modelo_estatisticas_variaveis','modelo_extrapolacoes'] LOOP
    EXECUTE format('CREATE INDEX ON public.%I (execucao_id)', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY aval_select ON public.%I FOR SELECT TO authenticated USING (public.aval_is_reader(organization_id))', t);
    EXECUTE format('CREATE TRIGGER aval_set_org BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.aval_set_org()', t);
    EXECUTE format('CREATE TRIGGER aval_immutable BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.aval_block_mutation()', t);
  END LOOP;
END $mig$;

-- 5) Configuração de modelagem por organização (linha sem organização = padrão institucional)
CREATE TABLE public.avaliacao_modeling_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid UNIQUE REFERENCES public.organizations(id),
  assisted_candidate_soft_limit integer NOT NULL DEFAULT 30 CHECK (assisted_candidate_soft_limit > 0),
  exploration_candidate_soft_limit integer NOT NULL DEFAULT 200 CHECK (exploration_candidate_soft_limit > 0),
  hard_limit integer CHECK (hard_limit IS NULL OR hard_limit > 0),
  require_confirmation_over integer CHECK (require_confirmation_over IS NULL OR require_confirmation_over > 0),
  cook_regra jsonb CHECK (cook_regra IS NULL OR (cook_regra->>'tipo' IN ('FIXO','K_SOBRE_N','K_SOBRE_N_MENOS_P')
    AND COALESCE((cook_regra->>'valor')::numeric, (cook_regra->>'k')::numeric) > 0)),
  origem text NOT NULL DEFAULT 'PROCEDIMENTO_INTERNO',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid DEFAULT auth.uid()
);
CREATE UNIQUE INDEX avaliacao_modeling_settings_global ON public.avaliacao_modeling_settings ((true)) WHERE organization_id IS NULL;
GRANT SELECT, INSERT, UPDATE ON public.avaliacao_modeling_settings TO authenticated;
GRANT ALL ON public.avaliacao_modeling_settings TO service_role;
ALTER TABLE public.avaliacao_modeling_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY aval_select ON public.avaliacao_modeling_settings FOR SELECT TO authenticated
  USING (organization_id IS NULL OR public.aval_is_reader(organization_id));
CREATE POLICY aval_insert ON public.avaliacao_modeling_settings FOR INSERT TO authenticated
  WITH CHECK (organization_id IS NOT NULL AND organization_id = public.user_organization_id(auth.uid()) AND public.aval_has_global_perm('policy.manage'));
CREATE POLICY aval_update ON public.avaliacao_modeling_settings FOR UPDATE TO authenticated
  USING (organization_id IS NOT NULL AND organization_id = public.user_organization_id(auth.uid()) AND public.aval_has_global_perm('policy.manage'))
  WITH CHECK (organization_id IS NOT NULL AND organization_id = public.user_organization_id(auth.uid()) AND public.aval_has_global_perm('policy.manage'));
CREATE TRIGGER aval_updated_at BEFORE UPDATE ON public.avaliacao_modeling_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.avaliacao_modeling_settings(organization_id, assisted_candidate_soft_limit, exploration_candidate_soft_limit, hard_limit, require_confirmation_over, cook_regra, updated_by)
VALUES (NULL, 30, 200, 2000, 100, NULL, NULL);

-- 6) Arquivos oficiais emitidos (gravados somente pelo servidor; imutáveis)
ALTER TABLE public.laudo_arquivos_emitidos
  ADD COLUMN IF NOT EXISTS storage_bucket text,
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS display_filename text,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS sha256 text,
  ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.laudo_arquivos_emitidos ADD COLUMN IF NOT EXISTS file_type text GENERATED ALWAYS AS (formato) STORED;
ALTER TABLE public.laudo_arquivos_emitidos ADD CONSTRAINT laudo_arquivos_emitidos_frozen_chk CHECK (
  storage_bucket IS NOT NULL AND storage_path IS NOT NULL AND display_filename IS NOT NULL AND mime_type IS NOT NULL
  AND file_size > 0 AND sha256 ~ '^[0-9a-f]{64}$');
CREATE UNIQUE INDEX IF NOT EXISTS laudo_arquivos_emitidos_emissao_formato ON public.laudo_arquivos_emitidos(emissao_id, formato);
CREATE UNIQUE INDEX IF NOT EXISTS laudo_arquivos_emitidos_path ON public.laudo_arquivos_emitidos(storage_bucket, storage_path);

-- Leitura dos arquivos congelados: só quem lê a avaliação; nenhuma escrita/alteração pelo cliente.
CREATE POLICY aval_emitidos_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avaliacao-emitidos' AND EXISTS (
    SELECT 1 FROM public.laudo_arquivos_emitidos f
     WHERE f.storage_bucket = 'avaliacao-emitidos' AND f.storage_path = storage.objects.name AND public.aval_is_reader(f.organization_id)));

-- 7) IA no laudo: texto-base, alertas e hash do contexto (generated_text ≠ approved_text)
ALTER TABLE public.avaliacao_ai_conteudos
  ADD COLUMN IF NOT EXISTS modo text NOT NULL DEFAULT 'GERAR' CHECK (modo IN ('GERAR','MELHORAR')),
  ADD COLUMN IF NOT EXISTS base_text text,
  ADD COLUMN IF NOT EXISTS context_hash text,
  ADD COLUMN IF NOT EXISTS alertas jsonb NOT NULL DEFAULT '[]';

INSERT INTO public.document_tokens(codigo, descricao, critico)
VALUES ('PONTOS_FUNDAMENTACAO', 'Pontuação da fundamentação', true)
ON CONFLICT (codigo) DO NOTHING;

-- 8) Decisões técnicas exigem papel explícito na avaliação: perfis globais nunca recebem essas permissões.
CREATE OR REPLACE FUNCTION public.aval_guard_papel_permissoes() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.papel IN ('GLOBAL_ADMIN','GLOBAL_TECNICO') AND NEW.permissao IN (
      'validation.manual_review','validation.accept','economic.select_center','economic.apply_arbitration','economic.confirm',
      'report.approve','report.issue','report.create_revision','market.select_samples') THEN
    RAISE EXCEPTION 'aval:technical_permission_requires_role' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.aval_guard_papel_permissoes() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER aval_guard_papel BEFORE INSERT OR UPDATE ON public.avaliacao_papel_permissoes FOR EACH ROW EXECUTE FUNCTION public.aval_guard_papel_permissoes();

-- 9) Domínio das transformações (mesma regra do motor) e geração de candidatos com limite validado no servidor
CREATE OR REPLACE FUNCTION public.aval_transform_ok(p_t text, p_x numeric) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN p_x IS NULL THEN true
    WHEN p_t IN ('DIRECT','SQUARE') THEN true
    WHEN p_t IN ('INVERSE','INV_SQUARE') THEN p_x <> 0
    WHEN p_t IN ('LN','INV_SQRT') THEN p_x > 0
    WHEN p_t = 'SQRT' THEN p_x >= 0
    ELSE false END
$$;
CREATE OR REPLACE FUNCTION public.aval_domain_ok(p_conjunto uuid, p_variavel uuid, p_t text) RETURNS boolean
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT NOT EXISTS (
      SELECT 1 FROM public.avaliacao_amostra_snapshots sn JOIN public.avaliacao_variaveis v ON v.id = p_variavel
       WHERE sn.conjunto_id = p_conjunto AND COALESCE((sn.dados->>'habilitada_modelo')::boolean, true)
         AND NOT public.aval_transform_ok(p_t, NULLIF(sn.dados->'variaveis'->>v.codigo, '')::numeric))
    AND NOT EXISTS (
      SELECT 1 FROM public.avaliacao_variavel_valores vv JOIN public.avaliacao_variaveis v ON v.id = vv.variavel_id
       WHERE vv.variavel_id = p_variavel AND vv.scope_type = 'AVALIANDO' AND v.papel <> 'DEPENDENTE'
         AND NOT public.aval_transform_ok(p_t, vv.valor))
$$;

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
REVOKE ALL ON FUNCTION public.aval_domain_ok(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aval_domain_ok(uuid, uuid, text) TO authenticated, service_role;

-- 10) Persistência atômica do motor (somente service_role; SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.aval_engine_persist_run(p jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE e jsonb := p->'execucao'; v_ex uuid; v_av uuid := (p->'execucao'->>'avaliacao_id')::uuid; v_mod uuid := (p->'execucao'->>'modelo_id')::uuid;
BEGIN
  INSERT INTO public.avaliacao_modelo_execucoes(organization_id, avaliacao_id, modelo_id, engine_name, engine_version, status, input_snapshot_json, input_hash,
    output_json, output_hash, iniciado_em, concluido_em, executado_por)
  VALUES ((e->>'organization_id')::uuid, v_av, v_mod, e->>'engine_name', e->>'engine_version', 'SUCESSO', e->'input_snapshot_json', e->>'input_hash',
    e->'output_json', e->>'output_hash', (e->>'iniciado_em')::timestamptz, now(), (e->>'executado_por')::uuid)
  RETURNING id INTO v_ex;
  INSERT INTO public.modelo_resultado_resumo(avaliacao_id, execucao_id, modelo_id, n, k, r2, r2_ajustado, f, sig_f, pior_sig_regressor, amplitude_pct, grau_precisao, extrapola, centro_preliminar)
  SELECT v_av, v_ex, v_mod, r.n, r.k, r.r2, r.r2_ajustado, r.f, r.sig_f, r.pior_sig_regressor, r.amplitude_pct, r.grau_precisao, r.extrapola, r.centro_preliminar
    FROM jsonb_to_record(p->'resumo') AS r(n int, k int, r2 numeric, r2_ajustado numeric, f numeric, sig_f numeric, pior_sig_regressor numeric, amplitude_pct numeric, grau_precisao text, extrapola boolean, centro_preliminar numeric);
  INSERT INTO public.modelo_coeficientes(avaliacao_id, execucao_id, codigo, transformacao, beta, erro_padrao, t, sig, ordem)
  SELECT v_av, v_ex, r.codigo, r.transformacao, r.beta, r.erro_padrao, r.t, r.sig, r.ordem
    FROM jsonb_to_recordset(p->'coeficientes') AS r(codigo text, transformacao text, beta numeric, erro_padrao numeric, t numeric, sig numeric, ordem int);
  INSERT INTO public.modelo_anova(avaliacao_id, execucao_id, modelo_id, ordem, fonte, sq, gl, mq, f, significancia)
  SELECT v_av, v_ex, v_mod, r.ordem, r.fonte, r.sq, r.gl, r.mq, r.f, r.significancia
    FROM jsonb_to_recordset(p->'derived'->'anova') AS r(ordem int, fonte text, sq numeric, gl int, mq numeric, f numeric, significancia numeric);
  INSERT INTO public.modelo_residuos(avaliacao_id, execucao_id, modelo_id, amostra_id, ordem, observado_original, estimado_original, observado_transformado,
    estimado_transformado, residuo, residuo_relativo, residuo_dp, leverage, cook)
  SELECT v_av, v_ex, v_mod, r.amostra_id, r.ordem, r.observado_original, r.estimado_original, r.observado_transformado, r.estimado_transformado,
    r.residuo, r.residuo_relativo, r.residuo_dp, r.leverage, r.cook
    FROM jsonb_to_recordset(p->'derived'->'residuos') AS r(amostra_id uuid, ordem int, observado_original numeric, estimado_original numeric,
      observado_transformado numeric, estimado_transformado numeric, residuo numeric, residuo_relativo numeric, residuo_dp numeric, leverage numeric, cook numeric);
  INSERT INTO public.modelo_normalidade(avaliacao_id, execucao_id, modelo_id, policy_id, z, referencia, tolerancia, criterio, limite_inferior, limite_superior, observado, status)
  SELECT v_av, v_ex, v_mod, (p->>'policy_id')::uuid, r.z, r.referencia, r.tolerancia, r.criterio, r.limite_inferior, r.limite_superior, r.observado, r.status
    FROM jsonb_to_recordset(p->'derived'->'normalidade') AS r(z numeric, referencia numeric, tolerancia numeric, criterio text, limite_inferior numeric, limite_superior numeric, observado numeric, status text);
  INSERT INTO public.modelo_correlacoes(avaliacao_id, execucao_id, modelo_id, variavel_a, variavel_b, correlacao, escala)
  SELECT v_av, v_ex, v_mod, r.variavel_a, r.variavel_b, r.correlacao, r.escala
    FROM jsonb_to_recordset(p->'derived'->'correlacoes') AS r(variavel_a text, variavel_b text, correlacao numeric, escala text);
  INSERT INTO public.modelo_estatisticas_variaveis(avaliacao_id, execucao_id, modelo_id, variavel, papel, transformacao, n, minimo, maximo, media, desvio_padrao, amplitude,
    minimo_transformado, maximo_transformado, media_transformada, desvio_padrao_transformado)
  SELECT v_av, v_ex, v_mod, r.variavel, r.papel, r.transformacao, r.n, r.minimo, r.maximo, r.media, r.desvio_padrao, r.amplitude,
    r.minimo_transformado, r.maximo_transformado, r.media_transformada, r.desvio_padrao_transformado
    FROM jsonb_to_recordset(p->'derived'->'estatisticas') AS r(variavel text, papel text, transformacao text, n int, minimo numeric, maximo numeric, media numeric,
      desvio_padrao numeric, amplitude numeric, minimo_transformado numeric, maximo_transformado numeric, media_transformada numeric, desvio_padrao_transformado numeric);
  INSERT INTO public.modelo_extrapolacoes(avaliacao_id, execucao_id, modelo_id, variavel, valor_avaliando, min_amostra, max_amostra, inside)
  SELECT v_av, v_ex, v_mod, r.variavel, r.valor_avaliando, r.min_amostra, r.max_amostra, r.inside
    FROM jsonb_to_recordset(p->'derived'->'extrapolacoes') AS r(variavel text, valor_avaliando numeric, min_amostra numeric, max_amostra numeric, inside boolean);
  UPDATE public.avaliacao_modelos SET status = 'CALCULADO' WHERE id = v_mod;
  INSERT INTO public.audit_events(organization_id, avaliacao_id, entity_type, entity_id, event_type, actor_id, details_json)
  VALUES ((e->>'organization_id')::uuid, v_av, 'modelo', v_mod, 'MODEL_EXECUTED', (e->>'executado_por')::uuid,
    jsonb_build_object('execucao', v_ex, 'input_hash', e->>'input_hash', 'output_hash', e->>'output_hash', 'n', p->'resumo'->'n', 'engine_version', e->>'engine_version'));
  RETURN v_ex;
END $$;

CREATE OR REPLACE FUNCTION public.aval_engine_persist_validation(p jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v jsonb := p->'validacao'; v_id uuid; v_av uuid := (p->'validacao'->>'avaliacao_id')::uuid;
BEGIN
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
  VALUES ((v->>'organization_id')::uuid, v_av, 'modelo', (v->>'modelo_id')::uuid, 'VALIDATION_EXECUTED', (v->>'created_by')::uuid,
    jsonb_build_object('validacao', v_id, 'status', v->>'overall_status', 'politica', p->>'politica', 'fundamentacao', v->>'fundamentacao_grau'));
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.aval_engine_persist_run(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.aval_engine_persist_validation(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aval_engine_persist_run(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.aval_engine_persist_validation(jsonb) TO service_role;

-- 11) Funções existentes estendidas (mesma assinatura e privilégios)

-- Núcleo (sem execução direta pelo cliente); o wrapper público recusa origens geradas,
-- que só entram por aval_model_generate_batch (limites e domínio validados no servidor).
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
CREATE OR REPLACE FUNCTION public.aval_model_create(p_avaliacao uuid, p_conjunto uuid, p_nome text, p_dep_var uuid, p_dep_transf text, p_dep_power numeric, p_vars jsonb, p_origem_tipo text DEFAULT 'MANUAL'::text, p_modelo_origem uuid DEFAULT NULL::uuid, p_amostras_excluidas uuid[] DEFAULT '{}'::uuid[], p_espaco uuid DEFAULT NULL::uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF p_origem_tipo IN ('GERADO_ASSISTIDO','GERADO_AMPLA') THEN RAISE EXCEPTION 'aval:use_candidate_batch' USING ERRCODE = '22023'; END IF;
  RETURN public.aval_model_create_core(p_avaliacao, p_conjunto, p_nome, p_dep_var, p_dep_transf, p_dep_power, p_vars, p_origem_tipo, p_modelo_origem, p_amostras_excluidas, p_espaco);
END $function$;

CREATE OR REPLACE FUNCTION public.aval_accept_model(p_validation uuid, p_justificativa text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v record; m record; v_id uuid; v_last timestamptz; v_dados jsonb;
BEGIN
  SELECT * INTO v FROM public.model_validations WHERE id = p_validation;
  IF v.id IS NULL OR NOT public.aval_can_edit(v.avaliacao_id, 'validation.accept') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  SELECT * INTO m FROM public.avaliacao_modelos WHERE id = v.modelo_id;
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

CREATE OR REPLACE FUNCTION public.aval_tokens(p_avaliacao uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE av record; res record; ad record; ce record; pj record; arb record; ac record; mv record; rs record; cp record; im record;
  v_tipo text; v_resp text; v_modelo text; v_conc text; fs record;
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
    -- Grau de fundamentação vem só do resumo estruturado da validação do modelo aceito (nunca de texto).
    'GRAU_FUNDAMENTACAO', CASE WHEN mv.id IS NULL THEN NULL WHEN fs.id IS NULL THEN 'não calculado' ELSE COALESCE(fs.grade_calculated, 'não enquadrado') END,
    'PONTOS_FUNDAMENTACAO', CASE WHEN fs.id IS NOT NULL THEN fs.total_points::text END,
    'GRAU_PRECISAO', COALESCE(ce.grau_precisao, CASE WHEN ce.id IS NOT NULL THEN 'não enquadrado' END),
    'VALOR_ADMINISTRATIVO_REFERENCIA', public.aval_fmt_money(cp.valor_comparado),
    'DIFERENCA_PERCENTUAL', CASE WHEN cp.id IS NOT NULL THEN public.aval_fmt_num(cp.diferenca_percentual, 2) || '%' END,
    'CONCLUSAO', v_conc, 'DATA_EMISSAO', to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY'), 'ENGINE_VERSION', pj.engine_version);
END $function$;

CREATE OR REPLACE FUNCTION public.aval_laudo_preflight(p_laudo_versao uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE lv record; av record; v_run uuid; v_req text[]; v_missing text[]; checks jsonb := '[]'::jsonb; c jsonb; v_fs record; v_tk jsonb;
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
  SELECT fs.* INTO v_fs FROM public.model_acceptances ac JOIN public.validation_foundation_summary fs ON fs.validation_id = ac.validation_id
   WHERE ac.avaliacao_id = av.id AND ac.status = 'VIGENTE';
  checks := checks || jsonb_build_object('codigo','FUNDAMENTACAO','ok', v_fs.id IS NOT NULL AND jsonb_array_length(COALESCE(v_fs.pendencias, '[]'::jsonb)) = 0,
    'msg', 'A fundamentação estruturada do modelo aceito precisa estar calculada, com todos os itens com grau definido pelo sistema ou pelo profissional.');
  v_tk := public.aval_tokens(av.id);
  checks := checks || jsonb_build_object('codigo','GRAUS_CONSISTENTES','ok', v_fs.id IS NOT NULL
      AND (v_tk->>'GRAU_FUNDAMENTACAO') = COALESCE(v_fs.grade_calculated, 'não enquadrado') AND (v_tk->>'GRAU_PRECISAO') IS NOT NULL,
    'msg', 'Os graus do laudo precisam vir da estrutura oficial (fundamentação da validação aceita e precisão do resultado confirmado).');
  checks := checks || jsonb_build_object('codigo','GRAUS_DIGITADOS','ok', NOT EXISTS (
      SELECT 1 FROM public.laudo_secoes s WHERE s.laudo_versao_id = lv.id AND s.conteudo ~* '\mgraus?(\s+de\s+[^\s{]+)?\s*:?\s+(iii|ii|i)\M'),
    'msg', 'Há grau digitado no texto; use os marcadores {{GRAU_FUNDAMENTACAO}} e {{GRAU_PRECISAO}}.');
  INSERT INTO public.laudo_preflight_runs(organization_id, avaliacao_id, laudo_versao_id, resultado, executado_por)
  VALUES (av.organization_id, av.id, lv.id, CASE WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(checks) x WHERE NOT (x->>'ok')::boolean) THEN 'FAIL' ELSE 'PASS' END, auth.uid())
  RETURNING id INTO v_run;
  FOR c IN SELECT * FROM jsonb_array_elements(checks) LOOP
    INSERT INTO public.laudo_preflight_results(organization_id, avaliacao_id, run_id, codigo, status, mensagem)
    VALUES (av.organization_id, av.id, v_run, c->>'codigo', CASE WHEN (c->>'ok')::boolean THEN 'OK' ELSE 'FALHA' END,
            CASE WHEN (c->>'ok')::boolean THEN 'OK' ELSE c->>'msg' END);
  END LOOP;
  RETURN v_run;
END $function$;

CREATE OR REPLACE FUNCTION public.aval_laudo_issue(p_laudo_versao uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    'fundamentacao', (SELECT jsonb_build_object('resumo', to_jsonb(fs), 'itens',
        COALESCE((SELECT jsonb_agg(to_jsonb(fi) ORDER BY fi.item_number) FROM public.validation_foundation_items fi WHERE fi.validation_id = ac.validation_id), '[]'))
      FROM public.validation_foundation_summary fs WHERE fs.validation_id = ac.validation_id),
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
END $function$;