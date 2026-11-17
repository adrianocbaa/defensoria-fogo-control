-- Laudo institucional DIF (TEMPLATE_DIF_AVALIACAO_V1): estrutura documental versionada, mídias do laudo,
-- assistente por tópico, capa/assinatura, snapshot único para rascunho e emissão. Laudos emitidos permanecem intactos.

-- 1) Modelos versionados: layout, identidade institucional e anexos
ALTER TABLE public.laudo_template_versions
  ADD COLUMN IF NOT EXISTS codigo text,
  ADD COLUMN IF NOT EXISTS layout text NOT NULL DEFAULT 'GENERICO_V1',
  ADD COLUMN IF NOT EXISTS identidade jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS anexos jsonb;
ALTER TABLE public.laudo_template_sections
  ADD COLUMN IF NOT EXISTS nivel smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS grupo text,
  ADD COLUMN IF NOT EXISTS classe text NOT NULL DEFAULT 'ASSISTIDO',
  ADD COLUMN IF NOT EXISTS variantes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS perguntas jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dependencias text[],
  ADD COLUMN IF NOT EXISTS ocultavel boolean NOT NULL DEFAULT false;

-- 2) Seções do laudo: hierarquia, classe do texto, visibilidade, texto-base, perguntas/respostas e motivo de desatualização
ALTER TABLE public.laudo_secoes
  ADD COLUMN IF NOT EXISTS nivel smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS grupo text,
  ADD COLUMN IF NOT EXISTS classe text NOT NULL DEFAULT 'ASSISTIDO',
  ADD COLUMN IF NOT EXISTS visivel boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ocultavel boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS texto_base text,
  ADD COLUMN IF NOT EXISTS perguntas jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS respostas jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS dependencias text[],
  ADD COLUMN IF NOT EXISTS stale_motivo text,
  ADD COLUMN IF NOT EXISTS stale_em timestamptz;
DO $$ BEGIN
  ALTER TABLE public.laudo_secoes ADD CONSTRAINT laudo_secoes_classe_chk CHECK (classe IN ('FIXO','ASSISTIDO','ESTRUTURADO'));
  ALTER TABLE public.laudo_secoes ADD CONSTRAINT laudo_secoes_nivel_chk CHECK (nivel BETWEEN 0 AND 3);
  ALTER TABLE public.laudo_secoes ADD CONSTRAINT laudo_secoes_respostas_chk CHECK (jsonb_typeof(respostas) = 'object' AND length(respostas::text) <= 20000);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Versão do laudo: modelo usado e capa/assinatura
ALTER TABLE public.laudo_versoes
  ADD COLUMN IF NOT EXISTS template_version_id uuid REFERENCES public.laudo_template_versions(id),
  ADD COLUMN IF NOT EXISTS capa jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS capa_atualizada_em timestamptz;
UPDATE public.laudo_versoes v SET template_version_id = l.template_version_id
  FROM public.laudos l WHERE l.id = v.laudo_id AND v.template_version_id IS NULL;

-- Texto-base das seções existentes em rascunho (para "Restaurar texto-base"); emitidas não são tocadas.
UPDATE public.laudo_secoes s SET texto_base = ts.conteudo_padrao
  FROM public.laudo_versoes v, public.laudo_template_sections ts
 WHERE v.id = s.laudo_versao_id AND v.status IN ('RASCUNHO','EM_REVISAO') AND ts.template_version_id = v.template_version_id
   AND ts.codigo = s.codigo AND s.texto_base IS NULL;

-- 4) Mídias do laudo (fotos, mapa, planta, documentos rasterizados, imagens das amostras)
CREATE TABLE IF NOT EXISTS public.laudo_midias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  amostra_id uuid REFERENCES public.avaliacao_amostras(id) ON DELETE SET NULL,
  categoria text NOT NULL CHECK (categoria IN ('FOTO_PRINCIPAL','FACHADA','RECEPCAO','CORREDOR','SALA','TI','BANHEIRO','DML','PLANTA','MAPA_LOCALIZACAO','AMOSTRA_MERCADO','DOCUMENTO','OUTRA')),
  storage_bucket text NOT NULL DEFAULT 'documents' CHECK (storage_bucket = 'documents'),
  storage_path text NOT NULL,
  nome_arquivo text CHECK (length(nome_arquivo) <= 255),
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png')),
  largura integer NOT NULL CHECK (largura > 0 AND largura <= 10000),
  altura integer NOT NULL CHECK (altura > 0 AND altura <= 10000),
  file_size bigint CHECK (file_size > 0 AND file_size <= 15728640),
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  legenda text CHECK (length(legenda) <= 300),
  fonte text CHECK (length(fonte) <= 200),
  ano integer CHECK (ano BETWEEN 1900 AND 2100),
  ordem integer NOT NULL DEFAULT 0,
  observacao text CHECK (length(observacao) <= 500),
  documento_grupo uuid,
  pagina integer CHECK (pagina > 0),
  incluir boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.laudo_midias TO authenticated;
GRANT ALL ON public.laudo_midias TO service_role;
ALTER TABLE public.laudo_midias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS aval_select ON public.laudo_midias;
DROP POLICY IF EXISTS aval_insert ON public.laudo_midias;
DROP POLICY IF EXISTS aval_update ON public.laudo_midias;
DROP POLICY IF EXISTS aval_delete ON public.laudo_midias;
CREATE POLICY aval_select ON public.laudo_midias FOR SELECT TO authenticated USING (public.aval_is_reader(organization_id));
CREATE POLICY aval_insert ON public.laudo_midias FOR INSERT TO authenticated
  WITH CHECK (public.aval_is_reader(organization_id) AND public.aval_can_edit(avaliacao_id, 'report.edit'));
CREATE POLICY aval_update ON public.laudo_midias FOR UPDATE TO authenticated
  USING (public.aval_is_reader(organization_id) AND public.aval_can_edit(avaliacao_id, 'report.edit'))
  WITH CHECK (public.aval_is_reader(organization_id) AND public.aval_can_edit(avaliacao_id, 'report.edit'));
CREATE POLICY aval_delete ON public.laudo_midias FOR DELETE TO authenticated
  USING (public.aval_is_reader(organization_id) AND public.aval_can_edit(avaliacao_id, 'report.edit'));
CREATE INDEX IF NOT EXISTS laudo_midias_av_idx ON public.laudo_midias(avaliacao_id, categoria, ordem);
DROP TRIGGER IF EXISTS aval_set_org ON public.laudo_midias;
CREATE TRIGGER aval_set_org BEFORE INSERT OR UPDATE ON public.laudo_midias FOR EACH ROW EXECUTE FUNCTION public.aval_set_org();

-- Arquivo precisa estar na pasta da própria organização e avaliação; amostra precisa ser da mesma avaliação.
CREATE OR REPLACE FUNCTION public.aval_guard_laudo_midias() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_org uuid;
BEGIN
  NEW.updated_at := now();
  SELECT organization_id INTO v_org FROM public.avaliacoes WHERE id = NEW.avaliacao_id;
  IF TG_OP = 'UPDATE' AND NOT public.aval_is_privileged() AND (NEW.storage_path IS DISTINCT FROM OLD.storage_path OR NEW.sha256 IS DISTINCT FROM OLD.sha256
     OR NEW.largura IS DISTINCT FROM OLD.largura OR NEW.altura IS DISTINCT FROM OLD.altura OR NEW.mime_type IS DISTINCT FROM OLD.mime_type
     OR NEW.avaliacao_id IS DISTINCT FROM OLD.avaliacao_id) THEN
    RAISE EXCEPTION 'aval:protected_field' USING ERRCODE = '42501';
  END IF;
  IF NOT COALESCE(NEW.storage_path LIKE v_org::text || '/avaliacao/' || NEW.avaliacao_id::text || '/%', false) OR NEW.storage_path LIKE '%..%' THEN
    RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023';
  END IF;
  IF NEW.amostra_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.avaliacao_amostras a WHERE a.id = NEW.amostra_id AND a.avaliacao_id = NEW.avaliacao_id) THEN
    RAISE EXCEPTION 'aval:cross_org_reference' USING ERRCODE = '22023';
  END IF;
  IF NEW.categoria = 'AMOSTRA_MERCADO' AND NEW.amostra_id IS NULL THEN RAISE EXCEPTION 'aval:missing_required' USING ERRCODE = '22023'; END IF;
  IF NEW.categoria <> 'AMOSTRA_MERCADO' THEN NEW.amostra_id := NULL; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS aval_guard ON public.laudo_midias;
CREATE TRIGGER aval_guard BEFORE INSERT OR UPDATE ON public.laudo_midias FOR EACH ROW EXECUTE FUNCTION public.aval_guard_laudo_midias();

-- 5) Conversa do assistente por tópico (gravada só pela função do servidor; leitura por quem lê a avaliação)
CREATE TABLE IF NOT EXISTS public.laudo_secao_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  secao_id uuid NOT NULL REFERENCES public.laudo_secoes(id) ON DELETE CASCADE,
  papel text NOT NULL CHECK (papel IN ('USUARIO','ASSISTENTE')),
  conteudo text NOT NULL CHECK (length(conteudo) BETWEEN 1 AND 8000),
  perguntas jsonb,
  ai_conteudo_id uuid REFERENCES public.avaliacao_ai_conteudos(id),
  model text, prompt_version text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.laudo_secao_mensagens TO authenticated;
GRANT ALL ON public.laudo_secao_mensagens TO service_role;
ALTER TABLE public.laudo_secao_mensagens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS aval_select ON public.laudo_secao_mensagens;
CREATE POLICY aval_select ON public.laudo_secao_mensagens FOR SELECT TO authenticated USING (public.aval_is_reader(organization_id));
CREATE INDEX IF NOT EXISTS laudo_secao_mensagens_secao_idx ON public.laudo_secao_mensagens(secao_id, created_at);
DROP TRIGGER IF EXISTS aval_set_org ON public.laudo_secao_mensagens;
CREATE TRIGGER aval_set_org BEFORE INSERT OR UPDATE ON public.laudo_secao_mensagens FOR EACH ROW EXECUTE FUNCTION public.aval_set_org();

-- 6) Guarda das seções: estrutura e estado só pelo servidor; respostas às perguntas podem ser gravadas por quem edita
CREATE OR REPLACE FUNCTION public.aval_guard_laudo_secoes()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE v_status text; v_lv uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN v_lv := OLD.laudo_versao_id; ELSE v_lv := NEW.laudo_versao_id; END IF;
  SELECT status INTO v_status FROM public.laudo_versoes WHERE id = v_lv;
  IF v_status IN ('EMITIDO','SUPERADO') THEN RAISE EXCEPTION 'aval:report_issued_immutable' USING ERRCODE = '42501'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF TG_OP = 'UPDATE' AND NOT public.aval_is_privileged() THEN
    IF NEW.codigo IS DISTINCT FROM OLD.codigo OR NEW.titulo IS DISTINCT FROM OLD.titulo OR NEW.ordem IS DISTINCT FROM OLD.ordem
       OR NEW.numerada IS DISTINCT FROM OLD.numerada OR NEW.obrigatoria IS DISTINCT FROM OLD.obrigatoria
       OR NEW.blocos_sistema IS DISTINCT FROM OLD.blocos_sistema OR NEW.laudo_versao_id IS DISTINCT FROM OLD.laudo_versao_id
       OR NEW.status IS DISTINCT FROM OLD.status OR NEW.aprovada_por IS DISTINCT FROM OLD.aprovada_por
       OR NEW.aprovada_em IS DISTINCT FROM OLD.aprovada_em OR NEW.stale IS DISTINCT FROM OLD.stale
       OR NEW.nivel IS DISTINCT FROM OLD.nivel OR NEW.grupo IS DISTINCT FROM OLD.grupo OR NEW.classe IS DISTINCT FROM OLD.classe
       OR NEW.visivel IS DISTINCT FROM OLD.visivel OR NEW.ocultavel IS DISTINCT FROM OLD.ocultavel OR NEW.texto_base IS DISTINCT FROM OLD.texto_base
       OR NEW.perguntas IS DISTINCT FROM OLD.perguntas OR NEW.dependencias IS DISTINCT FROM OLD.dependencias
       OR NEW.stale_motivo IS DISTINCT FROM OLD.stale_motivo OR NEW.stale_em IS DISTINCT FROM OLD.stale_em THEN
      RAISE EXCEPTION 'aval:protected_field' USING ERRCODE = '42501';
    END IF;
    IF NEW.conteudo IS DISTINCT FROM OLD.conteudo THEN
      NEW.status := 'RASCUNHO'; NEW.aprovada_por := NULL; NEW.aprovada_em := NULL; NEW.stale := false; NEW.stale_motivo := NULL; NEW.stale_em := NULL; NEW.updated_by := auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END $function$;

-- 7) Invalidação: seções do modelo DIF só ficam desatualizadas quando um dado que usam muda; o motivo fica registrado
CREATE OR REPLACE FUNCTION public.aval_laudo_deps_nivel(p_nivel text) RETURNS text[]
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_nivel
    WHEN 'DATASET' THEN ARRAY['AMOSTRAS','MODELO','VALIDACAO','PROJECAO','RESULTADO']
    WHEN 'MODEL' THEN ARRAY['MODELO','VALIDACAO','PROJECAO','RESULTADO']
    WHEN 'VALIDATION' THEN ARRAY['VALIDACAO','PROJECAO','RESULTADO']
    WHEN 'PROJECTION' THEN ARRAY['PROJECAO','RESULTADO','IMOVEL']
    WHEN 'ECONOMIC_RESULT' THEN ARRAY['RESULTADO','VALORES_ADM']
    ELSE ARRAY[]::text[] END $$;

CREATE OR REPLACE FUNCTION public.aval_invalidate(p_av uuid, p_nivel text, p_motivo text, p_secoes text[] DEFAULT NULL::text[])
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE n_mod int := 0; n_val int := 0; n_ac int := 0; n_proj int := 0; n_res int := 0; n_sec int := 0; v_deps text[];
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
  v_deps := public.aval_laudo_deps_nivel(p_nivel);
  UPDATE public.laudo_secoes s SET stale = true, stale_motivo = left(COALESCE(NULLIF(btrim(p_motivo), ''), 'Dados da avaliação alterados.'), 500), stale_em = now()
    FROM public.laudo_versoes v
   WHERE v.id = s.laudo_versao_id AND v.avaliacao_id = p_av AND v.status IN ('RASCUNHO','EM_REVISAO') AND NOT s.stale
     AND (CASE WHEN p_nivel = 'REPORT_ONLY' THEN p_secoes IS NULL OR s.codigo = ANY(p_secoes) OR s.grupo = ANY(p_secoes)
               ELSE s.dependencias IS NULL OR s.dependencias && v_deps OR s.codigo = ANY(COALESCE(p_secoes, '{}')) OR s.grupo = ANY(COALESCE(p_secoes, '{}')) END);
  GET DIAGNOSTICS n_sec = ROW_COUNT;
  IF n_mod + n_val + n_ac + n_proj + n_res + n_sec > 0 THEN
    PERFORM public.aval_audit(p_av, 'avaliacao', p_av, 'INVALIDATION_APPLIED',
      jsonb_build_object('nivel', p_nivel, 'motivo', p_motivo, 'modelos', n_mod, 'validacoes', n_val, 'aceites', n_ac,
                         'projecoes', n_proj, 'resultados', n_res, 'secoes_laudo', n_sec));
  END IF;
  RETURN jsonb_build_object('nivel', p_nivel, 'modelos', n_mod, 'validacoes', n_val, 'aceites', n_ac, 'projecoes', n_proj, 'resultados', n_res, 'secoes_laudo', n_sec);
END $function$;

CREATE OR REPLACE FUNCTION public.aval_laudo_section_refresh(p_secao uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE s record;
BEGIN
  SELECT * INTO s FROM public.laudo_secoes WHERE id = p_secao;
  IF s.id IS NULL OR NOT public.aval_can_edit(s.avaliacao_id, 'report.edit') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  UPDATE public.laudo_secoes SET stale = false, stale_motivo = NULL, stale_em = NULL, status = 'RASCUNHO', aprovada_por = NULL, aprovada_em = NULL WHERE id = p_secao;
  PERFORM public.aval_audit(s.avaliacao_id, 'laudo_secao', s.id, 'REPORT_SECTION_REVIEWED_AFTER_CHANGE', jsonb_build_object('secao', s.codigo, 'motivo', s.stale_motivo));
END $function$;

-- 8) Ocultar/exibir tópico opcional (nunca os obrigatórios)
CREATE OR REPLACE FUNCTION public.aval_laudo_section_visibility(p_secao uuid, p_visivel boolean)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE s record;
BEGIN
  SELECT * INTO s FROM public.laudo_secoes WHERE id = p_secao;
  IF s.id IS NULL OR NOT public.aval_can_edit(s.avaliacao_id, 'report.edit') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  IF NOT p_visivel AND NOT s.ocultavel THEN RAISE EXCEPTION 'aval:field_not_allowed' USING ERRCODE = '22023'; END IF;
  UPDATE public.laudo_secoes SET visivel = p_visivel WHERE id = p_secao;
  PERFORM public.aval_audit(s.avaliacao_id, 'laudo_secao', s.id, CASE WHEN p_visivel THEN 'REPORT_SECTION_SHOWN' ELSE 'REPORT_SECTION_HIDDEN' END, jsonb_build_object('secao', s.codigo));
END $function$;

-- 9) Capa e assinatura (textos curtos; valores monetários e graus sempre vêm dos dados)
CREATE OR REPLACE FUNCTION public.aval_laudo_capa_salvar(p_laudo_versao uuid, p_capa jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE lv record; k text; v text; v_out jsonb := '{}'::jsonb;
  c_keys constant text[] := ARRAY['solicitante','objeto','objetivo','finalidade','metodologia','endereco_titulo','local','data_vistoria','data_referencia',
    'responsavel_nome','responsavel_cargo','responsavel_titulo','responsavel_crea'];
BEGIN
  SELECT * INTO lv FROM public.laudo_versoes WHERE id = p_laudo_versao;
  IF lv.id IS NULL OR NOT public.aval_can_edit(lv.avaliacao_id, 'report.edit') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  IF lv.status NOT IN ('RASCUNHO','EM_REVISAO') THEN RAISE EXCEPTION 'aval:report_issued_immutable' USING ERRCODE = '42501'; END IF;
  IF p_capa IS NULL OR jsonb_typeof(p_capa) <> 'object' THEN RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023'; END IF;
  FOR k, v IN SELECT key, value FROM jsonb_each_text(p_capa) LOOP
    IF NOT k = ANY(c_keys) THEN RAISE EXCEPTION 'aval:field_not_allowed' USING ERRCODE = '22023'; END IF;
    v := NULLIF(btrim(COALESCE(v, '')), '');
    CONTINUE WHEN v IS NULL;
    IF length(v) > 600 THEN RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023'; END IF;
    IF k IN ('data_vistoria','data_referencia') THEN
      IF v !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023'; END IF;
      BEGIN
        IF to_char(v::date, 'YYYY-MM-DD') <> v THEN RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023'; END IF;
      EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023';
      END;
    END IF;
    IF v ~ 'R\$\s*[0-9]' THEN RAISE EXCEPTION 'aval:typed_money' USING ERRCODE = '22023'; END IF;
    IF v ~* '\mgraus?(\s+de\s+[^\s{]+)?\s*:?\s+(iii|ii|i)\M' THEN RAISE EXCEPTION 'aval:typed_grade' USING ERRCODE = '22023'; END IF;
    v_out := v_out || jsonb_build_object(k, v);
  END LOOP;
  UPDATE public.laudo_versoes SET capa = v_out, capa_atualizada_em = now() WHERE id = lv.id;
  PERFORM public.aval_audit(lv.avaliacao_id, 'laudo_versao', lv.id, 'REPORT_COVER_UPDATED', jsonb_build_object('campos', (SELECT jsonb_agg(x) FROM jsonb_object_keys(v_out) x)));
  RETURN v_out;
END $function$;

-- Capa efetiva: valores informados + responsável técnico (perfil) + identidade do modelo
CREATE OR REPLACE FUNCTION public.aval_laudo_capa_efetiva(p_laudo_versao uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE lv record; av record; pr record; tv record; v_org text;
BEGIN
  SELECT * INTO lv FROM public.laudo_versoes WHERE id = p_laudo_versao;
  SELECT * INTO av FROM public.avaliacoes WHERE id = lv.avaliacao_id;
  SELECT display_name, position, crea_cau INTO pr FROM public.profiles WHERE user_id = av.responsavel_tecnico_id;
  SELECT * INTO tv FROM public.laudo_template_versions WHERE id = lv.template_version_id;
  SELECT nome INTO v_org FROM public.organizations WHERE id = av.organization_id;
  RETURN jsonb_strip_nulls(jsonb_build_object(
    'solicitante', COALESCE(NULLIF(lv.capa->>'solicitante', ''), tv.identidade->>'orgao_nome', v_org),
    'local', COALESCE(NULLIF(lv.capa->>'local', ''), tv.identidade->>'local_padrao'),
    'responsavel_nome', COALESCE(NULLIF(lv.capa->>'responsavel_nome', ''), NULLIF(pr.display_name, '')),
    'responsavel_cargo', COALESCE(NULLIF(lv.capa->>'responsavel_cargo', ''), NULLIF(pr.position, '')),
    'responsavel_titulo', COALESCE(NULLIF(lv.capa->>'responsavel_titulo', ''), tv.identidade->>'titulo_responsavel_padrao'),
    'responsavel_crea', COALESCE(NULLIF(lv.capa->>'responsavel_crea', ''), NULLIF(pr.crea_cau, ''))))
    || (lv.capa - 'solicitante' - 'local' - 'responsavel_nome' - 'responsavel_cargo' - 'responsavel_titulo' - 'responsavel_crea');
END $function$;

-- 10) Marcadores adicionais do modelo DIF (todos lidos do banco; nada é digitado)
CREATE OR REPLACE FUNCTION public.aval_tokens_dif(p_av uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE av record; ac record; rs record; res record; pj record; cp record; lv record; v_r numeric; v_prop text; v_org text; v_capa jsonb := '{}'::jsonb;
  v_atual numeric; v_proposto numeric;
BEGIN
  SELECT * INTO av FROM public.avaliacoes WHERE id = p_av;
  SELECT * INTO ac FROM public.model_acceptances WHERE avaliacao_id = p_av AND status = 'VIGENTE';
  SELECT * INTO rs FROM public.modelo_resultado_resumo WHERE execucao_id = ac.execucao_id;
  SELECT NULLIF(output_json #>> '{fit,rRegressao}', '')::numeric INTO v_r FROM public.avaliacao_modelo_execucoes WHERE id = ac.execucao_id;
  SELECT * INTO res FROM public.avaliacao_resultado_economico WHERE avaliacao_id = p_av AND status = 'VIGENTE';
  SELECT * INTO pj FROM public.avaliacao_projecoes WHERE id = res.projecao_id;
  SELECT * INTO cp FROM public.avaliacao_compatibilidades WHERE resultado_id = res.id ORDER BY created_at LIMIT 1;
  SELECT * INTO lv FROM public.laudo_versoes WHERE avaliacao_id = p_av ORDER BY revisao DESC LIMIT 1;
  IF lv.id IS NOT NULL THEN v_capa := public.aval_laudo_capa_efetiva(lv.id); END IF;
  SELECT nome INTO v_org FROM public.organizations WHERE id = av.organization_id;
  v_prop := CASE av.tipo WHEN 'NOVA_LOCACAO' THEN 'SOLICITADO_PROPRIETARIO' WHEN 'RENOVACAO' THEN 'PROPOSTO_RENOVACAO' ELSE 'REAJUSTADO' END;
  SELECT valor INTO v_atual FROM public.avaliacao_valores_administrativos WHERE avaliacao_id = p_av AND ativo AND tipo = 'CONTRATO_ATUAL' ORDER BY created_at DESC LIMIT 1;
  SELECT valor INTO v_proposto FROM public.avaliacao_valores_administrativos WHERE avaliacao_id = p_av AND ativo AND tipo = v_prop ORDER BY created_at DESC LIMIT 1;
  RETURN jsonb_build_object(
    'SOLICITANTE', COALESCE(v_capa->>'solicitante', v_org),
    'DATA_VISTORIA', CASE WHEN v_capa->>'data_vistoria' ~ '^\d{4}-\d{2}-\d{2}$' THEN to_char((v_capa->>'data_vistoria')::date, 'DD/MM/YYYY') END,
    'N_DADOS_COLETADOS', (SELECT count(*)::text FROM public.avaliacao_amostras WHERE avaliacao_id = p_av),
    'N_VARIAVEIS', rs.k::text,
    'R_CORRELACAO', public.aval_fmt_num(v_r, 4),
    'CLASSE_CORRELACAO', CASE WHEN v_r IS NULL THEN NULL WHEN abs(v_r) >= 1 THEN 'perfeita' WHEN abs(v_r) > 0.9 THEN 'fortíssima'
      WHEN abs(v_r) > 0.7 THEN 'forte' WHEN abs(v_r) > 0.3 THEN 'média' WHEN abs(v_r) > 0 THEN 'fraca' ELSE 'nula' END,
    'R2_PERCENTUAL', CASE WHEN rs.r2 IS NOT NULL THEN public.aval_fmt_num(rs.r2 * 100, 2) || '%' END,
    'F_CALCULADO', public.aval_fmt_num(rs.f, 2),
    'SIG_F', CASE WHEN rs.sig_f IS NOT NULL THEN public.aval_fmt_num(rs.sig_f * 100, 2) || '%' END,
    'PIOR_SIG_REGRESSOR', CASE WHEN rs.pior_sig_regressor IS NOT NULL THEN public.aval_fmt_num(rs.pior_sig_regressor * 100, 2) || '%' END,
    'VALOR_CONTRATO_ATUAL', public.aval_fmt_money(v_atual),
    'VALOR_PROPOSTO', public.aval_fmt_money(v_proposto),
    'DIFERENCA_ABSOLUTA', CASE WHEN cp.id IS NULL THEN NULL
      WHEN cp.regra_versao IS NOT NULL AND cp.status_comparacao <> 'COMPARAVEL' THEN 'não comparável'
      WHEN cp.diferenca_absoluta IS NULL THEN NULL
      ELSE public.aval_fmt_money(cp.diferenca_absoluta) || public.aval_unidade_sufixo(cp.unidade_comparacao) END,
    'POSICAO_COMPATIBILIDADE', CASE cp.posicao_ic WHEN 'ABAIXO_IC' THEN 'abaixo do intervalo de confiança' WHEN 'DENTRO_IC' THEN 'dentro do intervalo de confiança'
      WHEN 'ACIMA_IC' THEN 'acima do intervalo de confiança' WHEN 'NAO_APLICAVEL' THEN 'sem posição aplicável' END
      || CASE cp.posicao_campo WHEN 'DENTRO_CAMPO' THEN ' e dentro do campo de arbítrio' WHEN 'ABAIXO_CAMPO' THEN ' e abaixo do campo de arbítrio'
      WHEN 'ACIMA_CAMPO' THEN ' e acima do campo de arbítrio' ELSE '' END,
    'INTERVALO_PREDICAO_STATUS', CASE pj.intervalo_predicao_status WHEN 'AVAILABLE' THEN 'disponível' WHEN 'NOT_AVAILABLE' THEN 'não disponível'
      WHEN 'NOT_VALIDATED' THEN 'não validado' WHEN 'NOT_APPLICABLE' THEN 'não aplicável' END);
END $function$;
REVOKE EXECUTE ON FUNCTION public.aval_tokens_dif(uuid) FROM PUBLIC, anon, authenticated;

-- 11) Snapshot único do laudo: o rascunho e a emissão oficial usam exatamente o mesmo conteúdo
CREATE OR REPLACE FUNCTION public.aval_laudo_snapshot_build(p_laudo_versao uuid, p_codigo text)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE lv record; av record; ac record; res record; tv record; v_tpl text; v_conj uuid; v_tokens jsonb; v_secoes jsonb := '[]'::jsonb;
  s record; t record; v_txt text;
BEGIN
  SELECT * INTO lv FROM public.laudo_versoes WHERE id = p_laudo_versao;
  SELECT * INTO av FROM public.avaliacoes WHERE id = lv.avaliacao_id;
  SELECT * INTO ac FROM public.model_acceptances WHERE avaliacao_id = av.id AND status = 'VIGENTE';
  SELECT * INTO res FROM public.avaliacao_resultado_economico WHERE avaliacao_id = av.id AND status = 'VIGENTE';
  SELECT * INTO tv FROM public.laudo_template_versions WHERE id = COALESCE(lv.template_version_id, (SELECT template_version_id FROM public.laudos WHERE id = lv.laudo_id));
  SELECT codigo INTO v_tpl FROM public.laudo_templates WHERE id = tv.template_id;
  SELECT conjunto_id INTO v_conj FROM public.avaliacao_modelos WHERE id = ac.modelo_id;
  v_tokens := public.aval_tokens(av.id) || jsonb_build_object('NUMERO_AVALIACAO', p_codigo);
  FOR s IN SELECT * FROM public.laudo_secoes WHERE laudo_versao_id = lv.id ORDER BY ordem LOOP
    v_txt := s.conteudo;
    FOR t IN SELECT key, value FROM jsonb_each_text(v_tokens) LOOP
      v_txt := replace(v_txt, '{{' || t.key || '}}', COALESCE(t.value, '—'));
    END LOOP;
    v_secoes := v_secoes || jsonb_build_object('codigo', s.codigo, 'titulo', s.titulo, 'ordem', s.ordem, 'numerada', s.numerada,
      'blocos_sistema', to_jsonb(s.blocos_sistema), 'texto', v_txt, 'aprovada_por', s.aprovada_por, 'aprovada_em', s.aprovada_em,
      'nivel', s.nivel, 'grupo', s.grupo, 'classe', s.classe, 'visivel', s.visivel);
  END LOOP;
  RETURN jsonb_build_object(
    'codigo', p_codigo, 'revisao', lv.revisao,
    'avaliacao', to_jsonb(av), 'tokens', v_tokens, 'secoes', v_secoes,
    'anexos', COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.numero) FROM public.laudo_anexos a WHERE a.laudo_versao_id = lv.id AND a.incluido), '[]'),
    'valores_administrativos', COALESCE((SELECT jsonb_agg(to_jsonb(v) ORDER BY v.created_at) FROM public.avaliacao_valores_administrativos v WHERE v.avaliacao_id = av.id AND v.ativo), '[]'),
    'resultado_snapshot', (SELECT dados FROM public.avaliacao_resultado_snapshots WHERE resultado_id = res.id ORDER BY created_at DESC LIMIT 1),
    'validacao_snapshot', (SELECT dados FROM public.validation_snapshots WHERE acceptance_id = ac.id ORDER BY created_at DESC LIMIT 1),
    'execucao', (SELECT jsonb_build_object('id', e.id, 'engine_name', e.engine_name, 'engine_version', e.engine_version, 'input_hash', e.input_hash,
                   'output_hash', e.output_hash, 'output', e.output_json, 'input', e.input_snapshot_json)
                   FROM public.avaliacao_modelo_execucoes e WHERE e.id = ac.execucao_id),
    'modelo', (SELECT to_jsonb(m) FROM public.avaliacao_modelos m WHERE m.id = ac.modelo_id),
    'modelo_variaveis', (SELECT jsonb_agg(jsonb_build_object('codigo', v.codigo, 'nome', v.nome, 'unidade', v.unidade, 'transformacao', mv.transformacao,
                   'tipo_variavel', v.tipo_variavel, 'relacao_esperada', v.relacao_esperada, 'categorica', v.categorica) ORDER BY mv.ordem)
                   FROM public.avaliacao_modelo_variaveis mv JOIN public.avaliacao_variaveis v ON v.id = mv.variavel_id WHERE mv.modelo_id = ac.modelo_id),
    'amostras', (SELECT jsonb_agg(jsonb_build_object('amostra_id', sn.amostra_id, 'hash', sn.hash, 'dados', sn.dados))
                   FROM public.avaliacao_amostra_snapshots sn WHERE sn.conjunto_id = v_conj),
    'fundamentacao', (SELECT jsonb_build_object('resumo', to_jsonb(fs), 'itens',
        COALESCE((SELECT jsonb_agg(to_jsonb(fi) ORDER BY fi.item_number) FROM public.validation_foundation_items fi WHERE fi.validation_id = ac.validation_id), '[]'))
      FROM public.validation_foundation_summary fs WHERE fs.validation_id = ac.validation_id)
  ) || jsonb_build_object(
    'layout', COALESCE(tv.layout, 'GENERICO_V1'),
    'template', jsonb_build_object('id', tv.id, 'codigo', COALESCE(tv.codigo, v_tpl), 'versao', tv.versao, 'identidade', COALESCE(tv.identidade, '{}'::jsonb)),
    'capa', public.aval_laudo_capa_efetiva(lv.id),
    'organizacao', (SELECT jsonb_build_object('nome', o.nome) FROM public.organizations o WHERE o.id = av.organization_id),
    'midias', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', m.id, 'categoria', m.categoria, 'bucket', m.storage_bucket, 'path', m.storage_path,
        'mime', m.mime_type, 'largura', m.largura, 'altura', m.altura, 'sha256', m.sha256, 'legenda', m.legenda, 'fonte', m.fonte, 'ano', m.ano,
        'ordem', m.ordem, 'observacao', m.observacao, 'amostra_id', m.amostra_id, 'documento_grupo', m.documento_grupo, 'pagina', m.pagina)
        ORDER BY m.ordem, m.created_at, m.id) FROM public.laudo_midias m WHERE m.avaliacao_id = av.id AND m.incluir), '[]'),
    'dependente', (SELECT jsonb_build_object('codigo', v.codigo, 'nome', v.nome, 'unidade', v.unidade)
        FROM public.avaliacao_modelos m JOIN public.avaliacao_variaveis v ON v.id = m.dependente_variavel_id WHERE m.id = ac.modelo_id),
    'projecao', (SELECT jsonb_build_object('nivel_confianca', p.nivel_confianca, 'avaliando', p.avaliando_json, 'extrapolacao', p.extrapolacao,
        'intervalo_predicao_status', p.intervalo_predicao_status, 'engine_version', p.engine_version) FROM public.avaliacao_projecoes p WHERE p.id = res.projecao_id),
    'arbitrio', (SELECT jsonb_build_object('centro', a.centro, 'aplicar', a.aplicar, 'campo_inferior', a.campo_inferior, 'campo_superior', a.campo_superior,
        'valor_arbitrado', a.valor_arbitrado, 'justificativa', a.justificativa) FROM public.avaliacao_arbitrios a
        WHERE a.projecao_id = res.projecao_id AND a.centro = res.centro ORDER BY a.created_at DESC LIMIT 1),
    'valor_adotado', (SELECT jsonb_build_object('origem', ad.origem, 'valor_final', ad.valor_final_apresentacao, 'unidade', ad.unidade)
        FROM public.avaliacao_valores_adotados ad WHERE ad.id = res.valor_adotado_id),
    'resultado', CASE WHEN res.id IS NULL THEN NULL ELSE jsonb_build_object('centro', res.centro, 'conclusao', res.conclusao, 'conclusao_texto', res.conclusao_texto) END,
    'amostras_meta', COALESCE((SELECT jsonb_agg(jsonb_build_object('amostra_id', a.id, 'created_at', a.created_at, 'selecionada', a.selecionada,
        'habilitada_modelo', a.habilitada_modelo, 'motivo_desabilitacao', a.motivo_desabilitacao, 'origem_territorial', a.origem_territorial,
        'no_conjunto', EXISTS (SELECT 1 FROM public.avaliacao_amostra_snapshots sn WHERE sn.conjunto_id = v_conj AND sn.amostra_id = a.id),
        'snapshot_inclusao', CASE WHEN NOT EXISTS (SELECT 1 FROM public.avaliacao_amostra_snapshots sn WHERE sn.conjunto_id = v_conj AND sn.amostra_id = a.id)
          THEN a.snapshot_inclusao END) ORDER BY a.created_at, a.id) FROM public.avaliacao_amostras a WHERE a.avaliacao_id = av.id), '[]'),
    'municipios_comparaveis', COALESCE((SELECT jsonb_agg(jsonb_build_object('municipio_nome', mc.municipio_nome, 'uf', mc.uf, 'status', mc.status,
        'justificativa', mc.justificativa)) FROM public.avaliacao_municipios_comparaveis mc WHERE mc.avaliacao_id = av.id), '[]'),
    'imovel_avaliando', (SELECT jsonb_build_object('tipo_imovel', i.tipo_imovel, 'descricao', i.descricao, 'endereco', i.endereco, 'numero', i.numero,
        'complemento', i.complemento, 'bairro', i.bairro, 'municipio_nome', i.municipio_nome, 'uf', i.uf, 'cep', i.cep, 'area_construida', i.area_construida,
        'area_terreno', i.area_terreno, 'padrao', i.padrao)
        FROM public.avaliacao_imoveis ai JOIN public.imoveis i ON i.id = ai.imovel_id WHERE ai.avaliacao_id = av.id AND ai.papel = 'AVALIANDO' LIMIT 1),
    'avaliando_variaveis', COALESCE((SELECT jsonb_agg(jsonb_build_object('codigo', v.codigo, 'nome', v.nome, 'unidade', v.unidade, 'valor', vv.valor) ORDER BY v.nome)
        FROM public.avaliacao_variavel_valores vv JOIN public.avaliacao_variaveis v ON v.id = vv.variavel_id
        WHERE vv.avaliacao_id = av.id AND vv.scope_type = 'AVALIANDO'), '[]'));
END $function$;
REVOKE EXECUTE ON FUNCTION public.aval_laudo_snapshot_build(uuid, text) FROM PUBLIC, anon, authenticated;

-- Rascunho: mesmo snapshot da emissão (somente leitura, para quem gera rascunho)
CREATE OR REPLACE FUNCTION public.aval_laudo_snapshot(p_laudo_versao uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE lv record; av record;
BEGIN
  SELECT * INTO lv FROM public.laudo_versoes WHERE id = p_laudo_versao;
  IF lv.id IS NULL THEN RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
  SELECT * INTO av FROM public.avaliacoes WHERE id = lv.avaliacao_id;
  IF NOT public.aval_is_reader(av.organization_id) OR NOT (public.aval_has_perm(av.id, 'report.render_draft') OR public.aval_has_perm(av.id, 'report.edit')) THEN
    RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501';
  END IF;
  RETURN public.aval_laudo_snapshot_build(lv.id, av.codigo || CASE WHEN lv.revisao > 0 THEN ' — Revisão ' || lpad(lv.revisao::text, 2, '0') ELSE '' END)
    || jsonb_build_object('rascunho', lv.status IN ('RASCUNHO','EM_REVISAO'));
END $function$;
GRANT EXECUTE ON FUNCTION public.aval_laudo_snapshot(uuid) TO authenticated;

-- 12) Emissão: usa o snapshot único; mudanças de mídia/capa/visibilidade após a verificação exigem nova verificação
CREATE OR REPLACE FUNCTION public.aval_laudo_issue(p_laudo_versao uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE lv record; av record; pr record; v_snap jsonb; v_hash text; v_em uuid; v_codigo text;
BEGIN
  SELECT * INTO lv FROM public.laudo_versoes WHERE id = p_laudo_versao;
  IF lv.id IS NULL OR NOT public.aval_can_edit(lv.avaliacao_id, 'report.issue') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  IF lv.status NOT IN ('RASCUNHO','EM_REVISAO') THEN RAISE EXCEPTION 'aval:report_issued_immutable' USING ERRCODE = '42501'; END IF;
  SELECT * INTO av FROM public.avaliacoes WHERE id = lv.avaliacao_id;
  SELECT * INTO pr FROM public.laudo_preflight_runs WHERE laudo_versao_id = lv.id ORDER BY created_at DESC LIMIT 1;
  IF pr.id IS NULL OR pr.resultado <> 'PASS' THEN RAISE EXCEPTION 'aval:preflight_required' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM public.laudo_secoes WHERE laudo_versao_id = lv.id AND (updated_at > pr.created_at OR aprovada_em > pr.created_at))
     OR EXISTS (SELECT 1 FROM public.avaliacao_resultado_economico WHERE avaliacao_id = av.id AND confirmado_em > pr.created_at)
     OR EXISTS (SELECT 1 FROM public.audit_events WHERE avaliacao_id = av.id AND created_at > pr.created_at
                AND event_type IN ('INVALIDATION_APPLIED','REPORT_MEDIA_CHANGED','REPORT_COVER_UPDATED','REPORT_SECTION_HIDDEN','REPORT_SECTION_SHOWN','REPORT_TEMPLATE_MIGRATED'))
     OR lv.capa_atualizada_em > pr.created_at THEN
    RAISE EXCEPTION 'aval:preflight_outdated' USING ERRCODE = '22023';
  END IF;
  v_codigo := av.codigo || CASE WHEN lv.revisao > 0 THEN ' — Revisão ' || lpad(lv.revisao::text, 2, '0') ELSE '' END;
  v_snap := public.aval_laudo_snapshot_build(lv.id, v_codigo)
    || jsonb_build_object('emitido_em', now(), 'emitido_por', auth.uid(), 'preflight_run', pr.id);
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

-- Mudanças nas mídias ficam no histórico (e tornam a verificação de emissão desatualizada)
CREATE OR REPLACE FUNCTION public.aval_laudo_midias_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  PERFORM public.aval_audit(r.avaliacao_id, 'laudo_midia', r.id, 'REPORT_MEDIA_CHANGED',
    jsonb_build_object('operacao', TG_OP, 'categoria', r.categoria, 'legenda', r.legenda, 'ordem', r.ordem, 'incluir', r.incluir));
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS aval_audit_midias ON public.laudo_midias;
CREATE TRIGGER aval_audit_midias AFTER INSERT OR UPDATE OR DELETE ON public.laudo_midias FOR EACH ROW EXECUTE FUNCTION public.aval_laudo_midias_audit();

-- 13) Início do laudo: modelo da organização (DIF) ou genérico; texto-base pela finalidade; anexos do modelo
CREATE OR REPLACE FUNCTION public.aval_laudo_init(p_avaliacao uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE av record; v_laudo uuid; v_tv uuid; v_lv uuid; v_avv uuid; v_anexos jsonb;
BEGIN
  SELECT * INTO av FROM public.avaliacoes WHERE id = p_avaliacao;
  IF av.id IS NULL OR NOT public.aval_can_edit(p_avaliacao, 'report.edit') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  SELECT id INTO v_laudo FROM public.laudos WHERE avaliacao_id = p_avaliacao;
  IF v_laudo IS NOT NULL THEN RETURN v_laudo; END IF;
  SELECT tv.id, tv.anexos INTO v_tv, v_anexos FROM public.laudo_template_versions tv JOIN public.laudo_templates t ON t.id = tv.template_id
   WHERE t.ativo AND tv.status = 'VIGENTE' AND (t.organization_id = av.organization_id OR t.organization_id IS NULL)
   ORDER BY (t.organization_id IS NULL), (tv.layout = 'GENERICO_V1') DESC, tv.versao DESC LIMIT 1;
  SELECT id INTO v_avv FROM public.avaliacao_versoes WHERE avaliacao_id = p_avaliacao AND revisao = av.versao_atual;
  INSERT INTO public.laudos(organization_id, avaliacao_id, template_version_id) VALUES (av.organization_id, av.id, v_tv) RETURNING id INTO v_laudo;
  INSERT INTO public.laudo_versoes(organization_id, avaliacao_id, laudo_id, avaliacao_versao_id, revisao, created_by, template_version_id)
  VALUES (av.organization_id, av.id, v_laudo, v_avv, av.versao_atual, auth.uid(), v_tv) RETURNING id INTO v_lv;
  INSERT INTO public.laudo_secoes(organization_id, avaliacao_id, laudo_versao_id, codigo, titulo, ordem, numerada, obrigatoria, blocos_sistema, conteudo,
    nivel, grupo, classe, ocultavel, texto_base, perguntas, dependencias)
  SELECT av.organization_id, av.id, v_lv, s.codigo, s.titulo, s.ordem, s.numerada, s.obrigatoria, s.blocos_sistema, x.txt,
    s.nivel, s.grupo, s.classe, s.ocultavel, x.txt, s.perguntas, s.dependencias
    FROM public.laudo_template_sections s CROSS JOIN LATERAL (SELECT COALESCE(NULLIF(s.variantes->>av.tipo, ''), s.conteudo_padrao) AS txt) x
   WHERE s.template_version_id = v_tv;
  IF v_anexos IS NOT NULL THEN
    INSERT INTO public.laudo_anexos(organization_id, avaliacao_id, laudo_versao_id, numero, titulo, tipo, opcional, incluido)
    SELECT av.organization_id, av.id, v_lv, a.numero, a.titulo, a.tipo, COALESCE(a.opcional, false), COALESCE(a.incluido, true)
      FROM jsonb_to_recordset(v_anexos) a(numero text, titulo text, tipo text, opcional boolean, incluido boolean);
  ELSE
    INSERT INTO public.laudo_anexos(organization_id, avaliacao_id, laudo_versao_id, numero, titulo, tipo, opcional, incluido) VALUES
      (av.organization_id, av.id, v_lv, 'I', 'Documentos do imóvel', 'DOCUMENTOS_IMOVEL', false, true),
      (av.organization_id, av.id, v_lv, 'II', 'Pesquisa de mercado', 'PESQUISA_MERCADO', false, true),
      (av.organization_id, av.id, v_lv, 'III', 'Relatório estatístico SiDIF', 'RELATORIO_ESTATISTICO', false, true),
      (av.organization_id, av.id, v_lv, 'IV', 'Relatório de escassez de mercado', 'RELATORIO_ESCASSEZ', true, false);
  END IF;
  PERFORM public.aval_audit(av.id, 'laudo', v_laudo, 'REPORT_CREATED', jsonb_build_object('revisao', av.versao_atual, 'template_version', v_tv));
  RETURN v_laudo;
END $function$;

-- 14) Revisão: copia estrutura, textos, respostas, visibilidade, capa e o modelo da versão anterior
CREATE OR REPLACE FUNCTION public.aval_laudo_create_revision(p_laudo uuid, p_motivo text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
  INSERT INTO public.laudo_versoes(organization_id, avaliacao_id, laudo_id, avaliacao_versao_id, revisao, motivo_revisao, created_by, template_version_id, capa)
  VALUES (av.organization_id, av.id, l.id, v_avv, v_rev, btrim(p_motivo), auth.uid(), COALESCE(lv.template_version_id, l.template_version_id), lv.capa) RETURNING id INTO v_lv;
  INSERT INTO public.laudo_secoes(organization_id, avaliacao_id, laudo_versao_id, codigo, titulo, ordem, numerada, obrigatoria, blocos_sistema, conteudo,
    nivel, grupo, classe, visivel, ocultavel, texto_base, perguntas, respostas, dependencias)
  SELECT av.organization_id, av.id, v_lv, codigo, titulo, ordem, numerada, obrigatoria, blocos_sistema, conteudo,
    nivel, grupo, classe, visivel, ocultavel, texto_base, perguntas, respostas, dependencias FROM public.laudo_secoes WHERE laudo_versao_id = lv.id;
  INSERT INTO public.laudo_anexos(organization_id, avaliacao_id, laudo_versao_id, numero, titulo, tipo, opcional, incluido)
  SELECT av.organization_id, av.id, v_lv, numero, titulo, tipo, opcional, incluido FROM public.laudo_anexos WHERE laudo_versao_id = lv.id;
  UPDATE public.avaliacoes SET status = 'ATIVA', stage = 'LAUDO', versao_atual = v_rev WHERE id = av.id;
  PERFORM public.aval_audit(av.id, 'laudo', l.id, 'REPORT_REVISION_CREATED', jsonb_build_object('revisao', v_rev, 'motivo', btrim(p_motivo)));
  RETURN v_lv;
END $function$;

-- 15) Atualizar um rascunho existente para o modelo institucional da organização (histórico de textos preservado)
CREATE OR REPLACE FUNCTION public.aval_laudo_migrar_modelo(p_laudo_versao uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE lv record; av record; tvr record; s record; v_old_txt text; v_txt text; n_upd int := 0; n_ins int := 0; n_hid int := 0;
BEGIN
  SELECT * INTO lv FROM public.laudo_versoes WHERE id = p_laudo_versao;
  IF lv.id IS NULL OR NOT public.aval_can_edit(lv.avaliacao_id, 'report.edit') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  IF lv.status NOT IN ('RASCUNHO','EM_REVISAO') THEN RAISE EXCEPTION 'aval:report_issued_immutable' USING ERRCODE = '42501'; END IF;
  SELECT * INTO av FROM public.avaliacoes WHERE id = lv.avaliacao_id;
  SELECT tv.* INTO tvr FROM public.laudo_template_versions tv JOIN public.laudo_templates t ON t.id = tv.template_id
   WHERE t.ativo AND tv.status = 'VIGENTE' AND t.organization_id = av.organization_id AND tv.layout <> 'GENERICO_V1'
   ORDER BY tv.versao DESC LIMIT 1;
  IF tvr.id IS NULL THEN RAISE EXCEPTION 'aval:template_unavailable' USING ERRCODE = '22023'; END IF;
  IF lv.template_version_id = tvr.id THEN RETURN jsonb_build_object('atualizadas', 0, 'novas', 0, 'ocultas', 0); END IF;
  FOR s IN SELECT * FROM public.laudo_template_sections WHERE template_version_id = tvr.id ORDER BY ordem LOOP
    v_txt := COALESCE(NULLIF(s.variantes->>av.tipo, ''), s.conteudo_padrao);
    IF EXISTS (SELECT 1 FROM public.laudo_secoes WHERE laudo_versao_id = lv.id AND codigo = s.codigo) THEN
      SELECT conteudo_padrao INTO v_old_txt FROM public.laudo_template_sections WHERE template_version_id = lv.template_version_id AND codigo = s.codigo;
      UPDATE public.laudo_secoes x SET titulo = s.titulo, ordem = s.ordem, numerada = s.numerada, obrigatoria = s.obrigatoria, blocos_sistema = s.blocos_sistema,
        nivel = s.nivel, grupo = s.grupo, classe = s.classe, ocultavel = s.ocultavel, visivel = true, perguntas = s.perguntas, dependencias = s.dependencias, texto_base = v_txt,
        conteudo = CASE WHEN btrim(x.conteudo) = '' OR x.conteudo = COALESCE(v_old_txt, '') THEN v_txt ELSE x.conteudo END,
        status = 'RASCUNHO', aprovada_por = NULL, aprovada_em = NULL, stale = false, stale_motivo = NULL, stale_em = NULL
       WHERE x.laudo_versao_id = lv.id AND x.codigo = s.codigo;
      n_upd := n_upd + 1;
    ELSE
      INSERT INTO public.laudo_secoes(organization_id, avaliacao_id, laudo_versao_id, codigo, titulo, ordem, numerada, obrigatoria, blocos_sistema, conteudo,
        nivel, grupo, classe, ocultavel, texto_base, perguntas, dependencias)
      VALUES (av.organization_id, av.id, lv.id, s.codigo, s.titulo, s.ordem, s.numerada, s.obrigatoria, s.blocos_sistema, v_txt,
        s.nivel, s.grupo, s.classe, s.ocultavel, v_txt, s.perguntas, s.dependencias);
      n_ins := n_ins + 1;
    END IF;
  END LOOP;
  UPDATE public.laudo_secoes SET visivel = false, ocultavel = true, obrigatoria = false, ordem = 1000 + ordem
   WHERE laudo_versao_id = lv.id AND codigo NOT IN (SELECT codigo FROM public.laudo_template_sections WHERE template_version_id = tvr.id);
  GET DIAGNOSTICS n_hid = ROW_COUNT;
  IF tvr.anexos IS NOT NULL THEN
    UPDATE public.laudo_anexos SET incluido = false WHERE laudo_versao_id = lv.id
      AND tipo NOT IN (SELECT a.tipo FROM jsonb_to_recordset(tvr.anexos) a(tipo text));
    INSERT INTO public.laudo_anexos(organization_id, avaliacao_id, laudo_versao_id, numero, titulo, tipo, opcional, incluido)
    SELECT av.organization_id, av.id, lv.id, a.numero, a.titulo, a.tipo, COALESCE(a.opcional, false), COALESCE(a.incluido, true)
      FROM jsonb_to_recordset(tvr.anexos) a(numero text, titulo text, tipo text, opcional boolean, incluido boolean)
    ON CONFLICT (laudo_versao_id, tipo) DO UPDATE SET numero = EXCLUDED.numero, titulo = EXCLUDED.titulo, opcional = EXCLUDED.opcional, incluido = EXCLUDED.incluido;
  END IF;
  UPDATE public.laudo_versoes SET template_version_id = tvr.id WHERE id = lv.id;
  PERFORM public.aval_audit(av.id, 'laudo_versao', lv.id, 'REPORT_TEMPLATE_MIGRATED',
    jsonb_build_object('de', lv.template_version_id, 'para', tvr.id, 'atualizadas', n_upd, 'novas', n_ins, 'ocultas', n_hid));
  RETURN jsonb_build_object('atualizadas', n_upd, 'novas', n_ins, 'ocultas', n_hid);
END $function$;

-- 16) Modelo institucional DIF — TEMPLATE_DIF_AVALIACAO_V1 (Defensoria Pública do Estado de Mato Grosso / DIF)
DO $seed$
DECLARE v_org uuid; v_t uuid; v_tv uuid;
BEGIN
  SELECT id INTO v_org FROM public.organizations WHERE id = '00000000-0000-0000-0000-000000000001';
  IF EXISTS (SELECT 1 FROM public.laudo_template_versions WHERE codigo = 'TEMPLATE_DIF_AVALIACAO_V1') THEN RETURN; END IF;
  INSERT INTO public.laudo_templates(organization_id, codigo, nome, ativo)
  VALUES (v_org, 'TEMPLATE_DIF_AVALIACAO', 'Laudo de Avaliação de Imóvel — modelo institucional DIF', true) RETURNING id INTO v_t;
  INSERT INTO public.laudo_template_versions(template_id, versao, status, codigo, layout, identidade, anexos)
  VALUES (v_t, 1, 'VIGENTE', 'TEMPLATE_DIF_AVALIACAO_V1', 'DIF_V1',
    jsonb_build_object('orgao', 'DEFENSORIA PÚBLICA DO ESTADO DE MATO GROSSO', 'orgao_nome', 'Defensoria Pública do Estado de Mato Grosso',
      'diretoria', 'DIRETORIA DE INFRAESTRUTURA FÍSICA', 'logo', 'DPE_MT', 'local_padrao', 'Cuiabá – MT',
      'titulo_responsavel_padrao', 'Engenheiro Civil', 'software', 'SiDIF', 'referencia', 'Laudo de Avaliação de Imóvel nº 006/2026 — Guarantã do Norte'),
    '[{"numero":"I","titulo":"Documentos do Imóvel Avaliando","tipo":"DOCUMENTOS_IMOVEL","opcional":false,"incluido":true},
      {"numero":"II","titulo":"Imóveis de Amostra","tipo":"PESQUISA_MERCADO","opcional":false,"incluido":true},
      {"numero":"III","titulo":"Tratamento de Inferência Estatística","tipo":"RELATORIO_ESTATISTICO","opcional":false,"incluido":true}]'::jsonb)
  RETURNING id INTO v_tv;

  INSERT INTO public.laudo_template_sections(template_version_id, ordem, codigo, titulo, nivel, grupo, classe, numerada, obrigatoria, ocultavel,
    blocos_sistema, conteudo_padrao, variantes, perguntas, dependencias)
  SELECT v_tv, x.ordem, x.codigo, x.titulo, x.nivel, x.grupo, x.classe, x.nivel > 0, NOT x.ocultavel, x.ocultavel, x.blocos, x.txt, x.var::jsonb, x.perg::jsonb, x.deps
  FROM (VALUES
  (0, 'RESUMO', 'Resumo', 0, 'RESUMO', 'ESTRUTURADO', false, ARRAY['QUADRO_RESUMO'], '', '{}', '[]',
     ARRAY['AVALIACAO','IMOVEL','VALIDACAO','PROJECAO','RESULTADO','VALORES_ADM']),
  (1, 'SOLICITANTE', 'Solicitante', 1, 'SOLICITANTE', 'FIXO', false, ARRAY[]::text[],
     $t${{SOLICITANTE}}, conforme Processo Administrativo nº {{PROCESSO_ADMINISTRATIVO}}.$t$, '{}', '[]', ARRAY['AVALIACAO']),
  (2, 'OBJETO', 'Objeto da Avaliação', 1, 'OBJETO', 'ASSISTIDO', false, ARRAY[]::text[],
     $t$O objeto da presente avaliação é o imóvel ({{TIPO_IMOVEL}}) situado em {{ENDERECO_AVALIANDO}}, no município de {{MUNICIPIO}}/{{UF}}, com área construída de {{AREA_AVALIANDO}}.$t$,
     jsonb_build_object(
       'REAJUSTE', $t$O objeto da presente avaliação é o imóvel ({{TIPO_IMOVEL}}) situado em {{ENDERECO_AVALIANDO}}, no município de {{MUNICIPIO}}/{{UF}}, com área construída de {{AREA_AVALIANDO}}, locado pela Defensoria Pública do Estado de Mato Grosso por meio do Contrato nº {{NUMERO_CONTRATO}}.$t$,
       'RENOVACAO', $t$O objeto da presente avaliação é o imóvel ({{TIPO_IMOVEL}}) situado em {{ENDERECO_AVALIANDO}}, no município de {{MUNICIPIO}}/{{UF}}, com área construída de {{AREA_AVALIANDO}}, locado pela Defensoria Pública do Estado de Mato Grosso por meio do Contrato nº {{NUMERO_CONTRATO}}, cuja renovação/prorrogação se encontra em análise.$t$,
       'NOVA_LOCACAO', $t$O objeto da presente avaliação é o imóvel ({{TIPO_IMOVEL}}) situado em {{ENDERECO_AVALIANDO}}, no município de {{MUNICIPIO}}/{{UF}}, com área construída de {{AREA_AVALIANDO}}, ofertado para locação à Defensoria Pública do Estado de Mato Grosso.$t$)::text,
     '[{"id":"uso_atual","pergunta":"Qual o uso atual do imóvel e quem o ocupa?","obrigatoria":false}]', ARRAY['AVALIACAO','IMOVEL']),
  (3, 'OBJETIVO', 'Objetivo da Avaliação', 1, 'OBJETIVO', 'ASSISTIDO', false, ARRAY[]::text[],
     $t$O presente laudo tem por objetivo a determinação do valor de mercado para locação do imóvel avaliando.$t$,
     jsonb_build_object(
       'REAJUSTE', $t$O presente laudo tem por objetivo a determinação do valor de mercado para locação do imóvel avaliando, a fim de verificar a compatibilidade do valor contratual reajustado com os valores praticados no mercado imobiliário.$t$,
       'RENOVACAO', $t$O presente laudo tem por objetivo a determinação do valor de mercado para locação do imóvel avaliando, a fim de verificar a compatibilidade do valor proposto para a renovação/prorrogação contratual com os valores praticados no mercado imobiliário.$t$,
       'NOVA_LOCACAO', $t$O presente laudo tem por objetivo a determinação do valor de mercado para locação do imóvel avaliando, a fim de verificar a compatibilidade do valor proposto pelo locador com os valores praticados no mercado imobiliário.$t$)::text,
     '[]', ARRAY['AVALIACAO']),
  (4, 'FINALIDADE', 'Finalidade do Laudo', 1, 'FINALIDADE', 'ASSISTIDO', false, ARRAY[]::text[],
     $t$O laudo destina-se a subsidiar a decisão administrativa referente a {{TIPO_AVALIACAO}}.$t$,
     jsonb_build_object(
       'REAJUSTE', $t$O laudo destina-se a subsidiar a Administração na análise do reajuste do Contrato nº {{NUMERO_CONTRATO}}, verificando se o valor reajustado permanece compatível com o valor de mercado.$t$,
       'RENOVACAO', $t$O laudo destina-se a subsidiar a Administração na análise da renovação/prorrogação do Contrato nº {{NUMERO_CONTRATO}}, verificando se o valor proposto é compatível com o valor de mercado.$t$,
       'NOVA_LOCACAO', $t$O laudo destina-se a subsidiar a Administração no processo de locação do imóvel, em atendimento à exigência de avaliação prévia do bem prevista no art. 51 da Lei nº 14.133/2021.$t$)::text,
     '[]', ARRAY['AVALIACAO']),
  (5, 'CARACTERIZACAO', 'Caracterização do Bem Avaliando', 1, 'CARACTERIZACAO', 'FIXO', false, ARRAY[]::text[],
     $t$A caracterização do bem avaliando foi realizada a partir da vistoria ao imóvel, da documentação disponibilizada e das informações constantes do processo administrativo, conforme descrito nos itens a seguir.$t$, '{}', '[]', ARRAY[]::text[]),
  (6, 'VISTORIA', 'Vistoria', 2, 'CARACTERIZACAO', 'ASSISTIDO', false, ARRAY[]::text[],
     $t$A vistoria ao imóvel avaliando foi realizada em {{DATA_VISTORIA}} pelo responsável técnico, ocasião em que foram verificadas as características físicas, o estado de conservação aparente e o entorno do imóvel, com o devido registro fotográfico.$t$, '{}',
     '[{"id":"data_vistoria","pergunta":"Em que data foi realizada a vistoria?","obrigatoria":true,"dado":"capa.data_vistoria"},
       {"id":"acompanhante","pergunta":"Quem acompanhou a vistoria (cargo ou função)?","obrigatoria":false},
       {"id":"limitacoes","pergunta":"Houve limitação durante a vistoria (acesso restrito, ambientes não vistoriados)?","obrigatoria":false}]', ARRAY[]::text[]),
  (7, 'DOCUMENTACAO', 'Documentação do Imóvel Avaliando', 2, 'CARACTERIZACAO', 'ASSISTIDO', false, ARRAY[]::text[],
     $t$Para a elaboração deste laudo foram considerados os documentos do imóvel disponibilizados no processo administrativo, reproduzidos no Anexo I. Não foram realizadas investigações quanto à titularidade, a eventuais ônus ou gravames, nem quanto à regularidade da documentação, que se presume correta.$t$, '{}',
     '[{"id":"documentos","pergunta":"Quais documentos do imóvel foram disponibilizados (matrícula, escritura, IPTU, planta, habite-se, contrato)?","obrigatoria":true,"dado":"documentos.lista"},
       {"id":"matricula","pergunta":"Número da matrícula e cartório de registro, se disponíveis.","obrigatoria":false}]', ARRAY[]::text[]),
  (8, 'PRESSUPOSTOS', 'Pressuposto, Ressalvas e Fatores Limitantes', 2, 'CARACTERIZACAO', 'ASSISTIDO', false, ARRAY[]::text[],
     $t$O presente laudo foi elaborado com base nos seguintes pressupostos, ressalvas e fatores limitantes:
a) as informações obtidas junto a terceiros foram consideradas de boa-fé e tidas como verdadeiras;
b) não foram realizadas análises jurídicas da documentação do imóvel, presumindo-se que o bem se encontra livre e desembaraçado de ônus;
c) não foram realizados ensaios, sondagens ou investigações de vícios ocultos, sendo a avaliação baseada nas condições aparentes verificadas na vistoria;
d) as áreas consideradas são as informadas na documentação disponibilizada e/ou aferidas na vistoria;
e) o valor obtido refere-se à data de referência deste laudo e às condições de mercado então vigentes.$t$, '{}',
     '[{"id":"ressalvas","pergunta":"Há ressalvas específicas deste caso (divergência de áreas, ausência de documentos, ambientes não vistoriados)?","obrigatoria":false}]', ARRAY[]::text[]),
  (9, 'IDENTIFICACAO', 'Identificação do Imóvel Avaliando', 2, 'CARACTERIZACAO', 'FIXO', false, ARRAY['FIGURAS_MAPA'],
     $t$O imóvel avaliando localiza-se em {{ENDERECO_AVALIANDO}}, no município de {{MUNICIPIO}}/{{UF}}, conforme indicado a seguir.$t$, '{}', '[]', ARRAY['IMOVEL']),
  (10, 'LOCALIZACAO', 'Localização e Ocupação Circunvizinhas', 3, 'CARACTERIZACAO', 'ASSISTIDO', false, ARRAY[]::text[], '', '{}',
     '[{"id":"ocupacao","pergunta":"Qual a ocupação predominante do entorno (comercial, residencial, mista, institucional)?","obrigatoria":true},
       {"id":"padrao_entorno","pergunta":"Qual o padrão das edificações vizinhas?","obrigatoria":false},
       {"id":"referencias","pergunta":"Quais referências próximas merecem citação (fórum, órgãos públicos, centro, vias principais)?","obrigatoria":false}]', ARRAY['IMOVEL']),
  (11, 'MELHORAMENTOS', 'Melhoramentos Públicos e Meios de Transporte', 3, 'CARACTERIZACAO', 'ASSISTIDO', false, ARRAY[]::text[], '', '{}',
     '[{"id":"pavimentacao","pergunta":"A via possui pavimentação? De que tipo?","obrigatoria":true},
       {"id":"energia","pergunta":"Há rede de energia elétrica e iluminação pública?","obrigatoria":true},
       {"id":"agua_esgoto","pergunta":"Há abastecimento de água e rede de esgoto?","obrigatoria":true},
       {"id":"telecom","pergunta":"Há rede de telecomunicações (telefonia/internet)?","obrigatoria":false},
       {"id":"residuos","pergunta":"Há coleta de resíduos sólidos?","obrigatoria":false},
       {"id":"transporte","pergunta":"Há transporte público nas proximidades?","obrigatoria":false},
       {"id":"acesso","pergunta":"Como é a acessibilidade viária (vias de acesso, estacionamento)?","obrigatoria":false}]', ARRAY['IMOVEL']),
  (12, 'CARACTERIZACAO_IMOVEL', 'Caracterização do Imóvel', 3, 'CARACTERIZACAO', 'ASSISTIDO', false, ARRAY['FIGURAS_IMOVEL'], '', '{}',
     '[{"id":"padrao_construtivo","pergunta":"Qual o padrão construtivo (baixo, normal, alto)?","obrigatoria":true,"dado":"imovel.padrao"},
       {"id":"ambientes","pergunta":"Quais ambientes compõem o imóvel?","obrigatoria":true,"dado":"imovel.ambientes"},
       {"id":"estado","pergunta":"Qual o estado de conservação aparente?","obrigatoria":true},
       {"id":"piso","pergunta":"Qual o tipo de piso predominante?","obrigatoria":false},
       {"id":"forro","pergunta":"Qual o tipo de forro?","obrigatoria":false},
       {"id":"divisorias","pergunta":"Como são as divisórias internas (alvenaria, drywall, outro)?","obrigatoria":false},
       {"id":"portas","pergunta":"Como são as portas e esquadrias?","obrigatoria":false},
       {"id":"observacoes","pergunta":"Há observações relevantes (acessibilidade, climatização, estacionamento)?","obrigatoria":false}]', ARRAY['IMOVEL']),
  (13, 'DIAGNOSTICO_MERCADO', 'Diagnóstico de Mercado', 1, 'DIAGNOSTICO_MERCADO', 'ASSISTIDO', false, ARRAY[]::text[], '', '{}',
     '[{"id":"contexto","pergunta":"Como se caracteriza o mercado local de locação desse tipo de imóvel (oferta, procura, liquidez)?","obrigatoria":true},
       {"id":"justificativa_comparaveis","pergunta":"Por que foram usados dados de outros municípios?","obrigatoria":true,"dado":"pesquisa.justificativa_comparaveis"}]', ARRAY['AMOSTRAS']),
  (14, 'METODOLOGIA', 'Metodologia Avaliatória', 1, 'METODOLOGIA', 'FIXO', false, ARRAY[]::text[],
     $t$A metodologia avaliatória adotada observa as prescrições da ABNT NBR 14653-1 (Avaliação de bens – Parte 1: Procedimentos gerais) e da ABNT NBR 14653-2 (Avaliação de bens – Parte 2: Imóveis urbanos). Em função da natureza do bem avaliando, da finalidade da avaliação e da disponibilidade de dados de mercado, adotou-se o Método Comparativo Direto de Dados de Mercado.$t$, '{}', '[]', ARRAY[]::text[]),
  (15, 'METODO_COMPARATIVO', 'Método comparativo direto de dados de mercado', 2, 'METODOLOGIA', 'FIXO', false, ARRAY[]::text[],
     $t$O Método Comparativo Direto de Dados de Mercado identifica o valor de mercado do bem por meio de tratamento técnico dos atributos dos elementos comparáveis, constituintes da amostra. No presente trabalho, os dados foram tratados por inferência estatística, mediante regressão linear múltipla, na qual o valor do imóvel é explicado pelas variáveis que influenciam a formação do seu preço no mercado.$t$, '{}', '[]', ARRAY[]::text[]),
  (16, 'PESQUISA_MERCADO', 'Pesquisa de Valores e Tratamento dos Dados', 1, 'PESQUISA_MERCADO', 'FIXO', false, ARRAY[]::text[],
     $t$A pesquisa de valores foi realizada junto ao mercado imobiliário, abrangendo imóveis com características semelhantes às do imóvel avaliando, ofertados ou transacionados para locação. Foram coletados {{N_DADOS_COLETADOS}} dados de mercado, dos quais {{N_AMOSTRAS}} foram utilizados no modelo de inferência adotado. As fichas dos imóveis de amostra constam do Anexo II.$t$, '{}', '[]', ARRAY['AMOSTRAS','MODELO']),
  (17, 'SELECAO_DADOS', 'Seleção de Dados de Mercado', 2, 'PESQUISA_MERCADO', 'ASSISTIDO', false, ARRAY['TABELA_VARIAVEIS','TABELA_COMPOSICAO_AMOSTRAS'],
     $t$Na seleção dos dados de mercado buscou-se a maior semelhança possível com o imóvel avaliando quanto à localização, à tipologia, à área e ao padrão construtivo. As variáveis consideradas na análise e a composição da amostra são apresentadas a seguir.$t$, '{}',
     '[{"id":"criterios","pergunta":"Houve critério adicional de seleção ou de exclusão de dados?","obrigatoria":false}]', ARRAY['AMOSTRAS','MODELO']),
  (18, 'TRATAMENTO_DADOS', 'Tratamento de Dados', 2, 'PESQUISA_MERCADO', 'FIXO', false, ARRAY['EQUACAO'],
     $t$Os dados de mercado foram tratados por inferência estatística, com o emprego de regressão linear múltipla processada no software SiDIF (motor estatístico versão {{ENGINE_VERSION}}). O modelo adotado, aceito pelo responsável técnico após a verificação dos critérios de validação, é representado pela seguinte equação:$t$, '{}', '[]', ARRAY['MODELO']),
  (19, 'INFERENCIA', 'Inferências', 1, 'INFERENCIA', 'FIXO', false, ARRAY['TABELA_ESTATISTICAS_MODELO'],
     $t$Apresentam-se a seguir os principais parâmetros estatísticos do modelo adotado ({{MODELO_ACEITO}}), elaborado com {{N_AMOSTRAS}} dados de mercado e {{N_VARIAVEIS}} variáveis independentes. O relatório estatístico completo consta do Anexo III.$t$, '{}', '[]', ARRAY['MODELO']),
  (20, 'CORRELACAO', 'Coeficiente de correlação', 2, 'INFERENCIA', 'FIXO', false, ARRAY[]::text[],
     $t$O coeficiente de correlação (r) mede a intensidade da relação linear entre a variável dependente e as variáveis independentes do modelo. O modelo adotado apresenta coeficiente de correlação r = {{R_CORRELACAO}}, indicando correlação {{CLASSE_CORRELACAO}} entre as variáveis.$t$, '{}', '[]', ARRAY['MODELO']),
  (21, 'DETERMINACAO', 'Coeficiente de determinação (R²)', 2, 'INFERENCIA', 'FIXO', false, ARRAY[]::text[],
     $t$O coeficiente de determinação (R²) indica a parcela da variação da variável dependente explicada pelas variáveis independentes do modelo. O modelo adotado apresenta R² = {{R2}} e R² ajustado = {{R2_AJUSTADO}}, ou seja, {{R2_PERCENTUAL}} da variação dos valores observados é explicada pelo modelo.$t$, '{}', '[]', ARRAY['MODELO']),
  (22, 'SIGNIFICANCIA', 'Significância dos regressores', 2, 'INFERENCIA', 'FIXO', false, ARRAY['TABELA_SIGNIFICANCIA'],
     $t$A significância dos regressores foi verificada pelo teste t de Student bicaudal, que avalia a hipótese nula de cada coeficiente ser igual a zero. A tabela a seguir apresenta os coeficientes, os valores de t calculados e as respectivas significâncias; a maior significância entre os regressores do modelo é de {{PIOR_SIG_REGRESSOR}}.$t$, '{}', '[]', ARRAY['MODELO']),
  (23, 'ANOVA', 'Análise da variância', 2, 'INFERENCIA', 'FIXO', false, ARRAY['TABELA_ANOVA'],
     $t$A análise da variância verifica a significância global do modelo pelo teste F de Snedecor, que avalia a hipótese nula de todos os coeficientes das variáveis independentes serem simultaneamente iguais a zero. O modelo apresenta F calculado = {{F_CALCULADO}}, com significância de {{SIG_F}}.$t$, '{}', '[]', ARRAY['MODELO']),
  (24, 'NORMALIDADE', 'Normalidade dos resíduos', 2, 'INFERENCIA', 'FIXO', false, ARRAY['TABELA_NORMALIDADE'],
     $t$A normalidade dos resíduos foi verificada pela comparação entre as frequências relativas dos resíduos padronizados nos intervalos de ±1, ±1,64 e ±1,96 desvio-padrão e as frequências esperadas para a distribuição normal, conforme a tabela a seguir.$t$, '{}', '[]', ARRAY['MODELO']),
  (25, 'CAMPO_ARBITRIO', 'Campo de Arbítrio', 2, 'INFERENCIA', 'FIXO', false, ARRAY['TABELA_CAMPO_ARBITRIO'],
     $t$O campo de arbítrio corresponde ao intervalo em torno da estimativa de tendência central dentro do qual o avaliador pode arbitrar o valor do bem, desde que justificado. No presente caso, o campo de arbítrio está compreendido entre {{CAMPO_INFERIOR}} e {{CAMPO_SUPERIOR}}.$t$, '{}', '[]', ARRAY['PROJECAO','RESULTADO']),
  (26, 'INTERVALO_PREDICAO', 'Intervalo de predição', 2, 'INFERENCIA', 'FIXO', true, ARRAY[]::text[],
     $t$O intervalo de predição corresponde à faixa em que se espera encontrar um novo valor observado para um imóvel com as características do avaliando, ao nível de confiança de {{NIVEL_CONFIANCA}}. Para o modelo adotado, o intervalo de predição está {{INTERVALO_PREDICAO_STATUS}}.$t$, '{}', '[]', ARRAY['PROJECAO']),
  (27, 'CALCULO_VALOR', 'Cálculo do valor de mercado', 2, 'INFERENCIA', 'FIXO', false, ARRAY['TABELA_AVALIANDO_VARIAVEIS','TABELA_CALCULO_VALOR'],
     $t$Substituindo-se na equação do modelo as características do imóvel avaliando, apresentadas a seguir, obtêm-se as estimativas de tendência central e os respectivos limites do intervalo de confiança de {{NIVEL_CONFIANCA}}. Adotou-se como valor de mercado a {{CENTRO_ADOTADO}}, correspondente a {{VALOR_MERCADO}}, sendo o valor final adotado de {{VALOR_FINAL}} ({{ORIGEM_VALOR}}).$t$, '{}', '[]', ARRAY['PROJECAO','RESULTADO']),
  (28, 'ESPECIFICACAO', 'Classificação da Avaliação', 1, 'ESPECIFICACAO', 'FIXO', false, ARRAY[]::text[],
     $t$A classificação da avaliação quanto à fundamentação e à precisão segue os critérios da ABNT NBR 14653-2, conforme demonstrado a seguir.$t$, '{}', '[]', ARRAY[]::text[]),
  (29, 'FUNDAMENTACAO', 'Graus de Fundamentação', 2, 'ESPECIFICACAO', 'FIXO', false, ARRAY['TABELA_FUNDAMENTACAO'],
     $t$O grau de fundamentação é determinado pela pontuação obtida nos itens de fundamentação aplicáveis aos modelos de regressão linear. Com {{PONTOS_FUNDAMENTACAO}} pontos e observados os requisitos obrigatórios, a avaliação enquadra-se no grau de fundamentação {{GRAU_FUNDAMENTACAO}}.$t$, '{}', '[]', ARRAY['VALIDACAO']),
  (30, 'PRECISAO', 'Grau de Precisão', 2, 'ESPECIFICACAO', 'FIXO', false, ARRAY['TABELA_PRECISAO'],
     $t$O grau de precisão é determinado pela amplitude do intervalo de confiança em torno da estimativa de tendência central adotada, ao nível de confiança de {{NIVEL_CONFIANCA}}. A amplitude obtida foi de {{AMPLITUDE_IC}}, o que corresponde ao grau de precisão {{GRAU_PRECISAO}}.$t$, '{}', '[]', ARRAY['PROJECAO','RESULTADO']),
  (31, 'COMPATIBILIDADE', 'Análise de compatibilidade', 1, 'COMPATIBILIDADE', 'ASSISTIDO', false, ARRAY['TABELA_COMPATIBILIDADE'],
     $t$Comparando-se o valor de mercado obtido com o valor administrativo de {{VALOR_ADMINISTRATIVO_REFERENCIA}}, verifica-se diferença de {{DIFERENCA_PERCENTUAL}} em relação ao valor de referência, situando-se o valor administrativo {{POSICAO_COMPATIBILIDADE}}.$t$,
     jsonb_build_object(
       'REAJUSTE', $t$Comparando-se o valor de mercado obtido com o valor contratual reajustado de {{VALOR_ADMINISTRATIVO_REFERENCIA}}, verifica-se diferença de {{DIFERENCA_PERCENTUAL}} em relação ao valor de referência, situando-se o valor reajustado {{POSICAO_COMPATIBILIDADE}}.$t$,
       'NOVA_LOCACAO', $t$Comparando-se o valor de mercado obtido com o valor proposto pelo locador de {{VALOR_ADMINISTRATIVO_REFERENCIA}}, verifica-se diferença de {{DIFERENCA_PERCENTUAL}} em relação ao valor de referência, situando-se o valor proposto {{POSICAO_COMPATIBILIDADE}}.$t$)::text,
     '[{"id":"observacoes","pergunta":"Há observação sobre a compatibilidade que deva constar do laudo?","obrigatoria":false}]', ARRAY['RESULTADO','VALORES_ADM']),
  (32, 'CONCLUSAO', 'Conclusão', 1, 'CONCLUSAO', 'ASSISTIDO', false, ARRAY['TABELA_CONCLUSAO'],
     $t$Diante do exposto, o valor de mercado apurado para o imóvel avaliando, na data de referência deste laudo, é de {{VALOR_FINAL}}, obtido a partir da {{CENTRO_ADOTADO}} do modelo adotado, com intervalo de confiança compreendido entre {{LIMITE_INFERIOR}} e {{LIMITE_SUPERIOR}}. Em relação ao valor administrativo de {{VALOR_ADMINISTRATIVO_REFERENCIA}}, verifica-se diferença de {{DIFERENCA_PERCENTUAL}}, sendo o resultado {{CONCLUSAO}}. A avaliação enquadra-se no grau de fundamentação {{GRAU_FUNDAMENTACAO}} e no grau de precisão {{GRAU_PRECISAO}}.$t$,
     jsonb_build_object(
       'REAJUSTE', $t$Diante do exposto, o valor de mercado apurado para o imóvel avaliando, na data de referência deste laudo, é de {{VALOR_FINAL}}, obtido a partir da {{CENTRO_ADOTADO}} do modelo adotado, com intervalo de confiança compreendido entre {{LIMITE_INFERIOR}} e {{LIMITE_SUPERIOR}}. O valor contratual atual é de {{VALOR_CONTRATO_ATUAL}} e o valor reajustado é de {{VALOR_PROPOSTO}}; em relação ao valor de referência, verifica-se diferença de {{DIFERENCA_PERCENTUAL}}, sendo o valor reajustado {{CONCLUSAO}}. A avaliação enquadra-se no grau de fundamentação {{GRAU_FUNDAMENTACAO}} e no grau de precisão {{GRAU_PRECISAO}}.$t$,
       'NOVA_LOCACAO', $t$Diante do exposto, o valor de mercado apurado para o imóvel avaliando, na data de referência deste laudo, é de {{VALOR_FINAL}}, obtido a partir da {{CENTRO_ADOTADO}} do modelo adotado, com intervalo de confiança compreendido entre {{LIMITE_INFERIOR}} e {{LIMITE_SUPERIOR}}. O valor proposto pelo locador é de {{VALOR_PROPOSTO}}; em relação ao valor de referência, verifica-se diferença de {{DIFERENCA_PERCENTUAL}}, sendo o valor proposto {{CONCLUSAO}}. A avaliação enquadra-se no grau de fundamentação {{GRAU_FUNDAMENTACAO}} e no grau de precisão {{GRAU_PRECISAO}}.$t$)::text,
     '[{"id":"ressalvas","pergunta":"Há ressalvas que devam constar da conclusão?","obrigatoria":false}]', ARRAY['VALIDACAO','PROJECAO','RESULTADO','VALORES_ADM']),
  (33, 'ENCERRAMENTO', 'Encerramento', 1, 'ENCERRAMENTO', 'FIXO', false, ARRAY['ASSINATURA'],
     $t$Nada mais havendo a acrescentar, encerra-se o presente Laudo de Avaliação, elaborado segundo a metodologia descrita, que segue datado e assinado pelo responsável técnico.$t$, '{}', '[]', ARRAY[]::text[])
  ) AS x(ordem, codigo, titulo, nivel, grupo, classe, ocultavel, blocos, txt, var, perg, deps);
END $seed$;

-- 17) Marcadores novos (catálogo usado pela verificação de emissão e pela IA)
INSERT INTO public.document_tokens(codigo, descricao, critico) VALUES
  ('SOLICITANTE', 'Solicitante do laudo', false),
  ('DATA_VISTORIA', 'Data da vistoria', false),
  ('N_DADOS_COLETADOS', 'Total de dados de mercado coletados', true),
  ('N_VARIAVEIS', 'Número de variáveis independentes do modelo', true),
  ('R_CORRELACAO', 'Coeficiente de correlação (r)', true),
  ('CLASSE_CORRELACAO', 'Classificação da correlação', true),
  ('R2_PERCENTUAL', 'R² em percentual', true),
  ('F_CALCULADO', 'F calculado (ANOVA)', true),
  ('SIG_F', 'Significância do modelo (F)', true),
  ('PIOR_SIG_REGRESSOR', 'Maior significância entre os regressores', true),
  ('VALOR_CONTRATO_ATUAL', 'Valor do contrato atual', true),
  ('VALOR_PROPOSTO', 'Valor proposto / reajustado', true),
  ('DIFERENCA_ABSOLUTA', 'Diferença absoluta em relação ao valor de referência', true),
  ('POSICAO_COMPATIBILIDADE', 'Posição do valor administrativo (intervalo e campo de arbítrio)', true),
  ('INTERVALO_PREDICAO_STATUS', 'Situação do intervalo de predição', true)
ON CONFLICT (codigo) DO NOTHING;

-- 18) Verificação de emissão: tópicos ocultos não contam; modelo DIF exige responsável, foto principal e legendas/fontes
CREATE OR REPLACE FUNCTION public.aval_laudo_preflight(p_laudo_versao uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_layout text; v_capa jsonb; lv record; av record; v_run uuid; v_req text[]; v_missing text[]; checks jsonb := '[]'::jsonb; c jsonb; v_fs record; v_tk jsonb;
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
  checks := checks || jsonb_build_object('codigo','SECOES_APROVADAS','ok', NOT EXISTS (SELECT 1 FROM public.laudo_secoes WHERE laudo_versao_id = lv.id AND obrigatoria AND visivel AND (status <> 'APROVADA' OR stale)), 'msg', 'Todas as seções obrigatórias devem estar aprovadas e atualizadas.');
  checks := checks || jsonb_build_object('codigo','TOKENS','ok', NOT EXISTS (
      SELECT 1 FROM public.laudo_secoes s CROSS JOIN LATERAL regexp_matches(s.conteudo, '\{\{([A-Z0-9_]+)\}\}', 'g') m
       WHERE s.laudo_versao_id = lv.id AND s.visivel AND NOT EXISTS (SELECT 1 FROM public.document_tokens t WHERE t.codigo = m[1])), 'msg', 'Há marcadores de dados desconhecidos no texto.');
  checks := checks || jsonb_build_object('codigo','VALORES_DIGITADOS','ok', NOT EXISTS (
      SELECT 1 FROM public.laudo_secoes s WHERE s.laudo_versao_id = lv.id AND s.visivel AND s.conteudo ~ 'R\$\s*[0-9]'), 'msg', 'Há valores monetários digitados no texto; use os marcadores protegidos (ex.: {{VALOR_FINAL}}).');
  SELECT fs.* INTO v_fs FROM public.model_acceptances ac JOIN public.validation_foundation_summary fs ON fs.validation_id = ac.validation_id
   WHERE ac.avaliacao_id = av.id AND ac.status = 'VIGENTE';
  checks := checks || jsonb_build_object('codigo','FUNDAMENTACAO','ok', v_fs.id IS NOT NULL AND jsonb_array_length(COALESCE(v_fs.pendencias, '[]'::jsonb)) = 0,
    'msg', 'A fundamentação estruturada do modelo aceito precisa estar calculada, com todos os itens com grau definido pelo sistema ou pelo profissional.');
  v_tk := public.aval_tokens(av.id);
  checks := checks || jsonb_build_object('codigo','GRAUS_CONSISTENTES','ok', v_fs.id IS NOT NULL
      AND (v_tk->>'GRAU_FUNDAMENTACAO') = COALESCE(v_fs.grade_calculated, 'não enquadrado') AND (v_tk->>'GRAU_PRECISAO') IS NOT NULL,
    'msg', 'Os graus do laudo precisam vir da estrutura oficial (fundamentação da validação aceita e precisão do resultado confirmado).');
  checks := checks || jsonb_build_object('codigo','GRAUS_DIGITADOS','ok', NOT EXISTS (
      SELECT 1 FROM public.laudo_secoes s WHERE s.laudo_versao_id = lv.id AND s.visivel AND s.conteudo ~* '\mgraus?(\s+de\s+[^\s{]+)?\s*:?\s+(iii|ii|i)\M'),
    'msg', 'Há grau digitado no texto; use os marcadores {{GRAU_FUNDAMENTACAO}} e {{GRAU_PRECISAO}}.');
  SELECT layout INTO v_layout FROM public.laudo_template_versions WHERE id = lv.template_version_id;
  IF v_layout = 'DIF_V1' THEN
    v_capa := public.aval_laudo_capa_efetiva(lv.id);
    checks := checks || jsonb_build_object('codigo','RESPONSAVEL_ASSINATURA','ok', COALESCE(v_capa->>'responsavel_nome', '') <> '' AND COALESCE(v_capa->>'responsavel_cargo', '') <> ''
      AND COALESCE(v_capa->>'responsavel_crea', '') <> '', 'msg', 'Informe nome, cargo e registro no CREA do responsável (capa e assinatura).');
    checks := checks || jsonb_build_object('codigo','FOTO_PRINCIPAL','ok', EXISTS (SELECT 1 FROM public.laudo_midias WHERE avaliacao_id = av.id AND incluir AND categoria IN ('FOTO_PRINCIPAL','FACHADA')),
      'msg', 'Inclua a foto principal ou a fachada do imóvel (aparece no quadro-resumo).');
    checks := checks || jsonb_build_object('codigo','FIGURAS_LEGENDA','ok', NOT EXISTS (SELECT 1 FROM public.laudo_midias WHERE avaliacao_id = av.id AND incluir
      AND categoria NOT IN ('DOCUMENTO','AMOSTRA_MERCADO') AND (COALESCE(btrim(legenda), '') = '' OR COALESCE(btrim(fonte), '') = '')),
      'msg', 'Toda figura do corpo do laudo precisa de legenda e fonte.');
  END IF;
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

-- 19) Marcadores: a função anterior vira a base e a pública acrescenta os do modelo DIF
ALTER FUNCTION public.aval_tokens(uuid) RENAME TO aval_tokens_base;
CREATE OR REPLACE FUNCTION public.aval_tokens(p_avaliacao uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.aval_tokens_base(p_avaliacao) || public.aval_tokens_dif(p_avaliacao);
END $function$;
GRANT EXECUTE ON FUNCTION public.aval_tokens(uuid) TO authenticated, service_role;