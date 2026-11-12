CREATE OR REPLACE FUNCTION public.aval_is_reader(_org uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND _org IS NOT NULL
     AND _org = public.user_organization_id(auth.uid())
     AND NOT public.has_role(auth.uid(), 'contratada'::user_role)
     AND NOT public.has_role(auth.uid(), 'prestadora'::user_role)
     AND NOT public.has_role(auth.uid(), 'demo'::user_role)
$$;
CREATE OR REPLACE FUNCTION public.aval_is_technical(_uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _uid IS NOT NULL
     AND (public.has_role(_uid,'admin'::user_role) OR public.has_role(_uid,'editor'::user_role)
          OR public.has_role(_uid,'gm'::user_role) OR public.has_role(_uid,'super_admin'::user_role))
     AND NOT public.has_role(_uid,'contratada'::user_role) AND NOT public.has_role(_uid,'prestadora'::user_role)
$$;
CREATE OR REPLACE FUNCTION public.aval_has_global_perm(_perm text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL
     AND public.aval_is_reader(public.user_organization_id(auth.uid()))
     AND EXISTS (SELECT 1 FROM public.avaliacao_papel_permissoes pp
                 WHERE pp.permissao = _perm
                   AND ((pp.papel = 'GLOBAL_ADMIN' AND public.has_role(auth.uid(),'admin'::user_role))
                     OR (pp.papel = 'GLOBAL_TECNICO' AND public.aval_is_technical(auth.uid()))))
$$;
CREATE OR REPLACE FUNCTION public.aval_has_perm(_avaliacao uuid, _perm text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.avaliacoes a
    WHERE a.id = _avaliacao AND public.aval_is_reader(a.organization_id)
      AND (
        EXISTS (SELECT 1 FROM public.avaliacao_membros m
                JOIN public.avaliacao_papel_permissoes pp ON pp.papel = m.papel AND pp.permissao = _perm
                WHERE m.avaliacao_id = a.id AND m.user_id = auth.uid() AND m.ativo AND public.aval_is_technical(auth.uid()))
        OR (public.has_role(auth.uid(),'admin'::user_role)
            AND EXISTS (SELECT 1 FROM public.avaliacao_papel_permissoes pp WHERE pp.papel = 'GLOBAL_ADMIN' AND pp.permissao = _perm))
      ))
$$;
CREATE OR REPLACE FUNCTION public.aval_can_edit(_avaliacao uuid, _perm text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.aval_has_perm(_avaliacao, _perm)
     AND EXISTS (SELECT 1 FROM public.avaliacoes WHERE id = _avaliacao AND status = 'ATIVA')
$$;
CREATE OR REPLACE FUNCTION public.aval_my_perms(p_avaliacao uuid) RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(array_agg(p.codigo ORDER BY p.codigo), '{}')
  FROM public.avaliacao_permissoes p
  WHERE (p_avaliacao IS NOT NULL AND public.aval_has_perm(p_avaliacao, p.codigo)) OR public.aval_has_global_perm(p.codigo)
$$;
CREATE OR REPLACE FUNCTION public.aval_list_tecnicos() RETURNS TABLE(user_id uuid, display_name text, cargo text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id, COALESCE(NULLIF(p.display_name,''), split_part(p.email,'@',1)), p.position
  FROM public.profiles p
  JOIN public.organization_members om ON om.user_id = p.user_id AND om.status IN ('active','invited')
  WHERE public.aval_is_reader(public.user_organization_id(auth.uid()))
    AND om.organization_id = public.user_organization_id(auth.uid())
    AND COALESCE(p.is_active, true) AND public.aval_is_technical(p.user_id)
  ORDER BY 2
$$;
CREATE OR REPLACE FUNCTION public.aval_is_privileged() RETURNS boolean
LANGUAGE sql STABLE SET search_path = public AS $$ SELECT current_user NOT IN ('authenticated','anon') $$;
CREATE OR REPLACE FUNCTION public.aval_hash(_j jsonb) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT encode(sha256(convert_to(_j::text, 'UTF8')), 'hex') $$;
CREATE OR REPLACE FUNCTION public.aval_fmt_num(v numeric, casas int) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN v IS NULL THEN NULL ELSE
    translate(to_char(round(v, casas), 'FM999,999,999,999,990' || CASE WHEN casas > 0 THEN '.' || repeat('0', casas) ELSE '' END), ',.', '.,') END
$$;
CREATE OR REPLACE FUNCTION public.aval_fmt_money(v numeric) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT CASE WHEN v IS NULL THEN NULL ELSE 'R$ ' || public.aval_fmt_num(v, 2) END $$;
CREATE OR REPLACE FUNCTION public.aval_normalize_text(t text) RETURNS text
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT btrim(regexp_replace(lower(public.unaccent(COALESCE(t, ''))), '[^a-z0-9]+', ' ', 'g'))
$$;

CREATE OR REPLACE FUNCTION public.aval_set_org() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j jsonb := to_jsonb(NEW); v_org uuid; v_old uuid; v_parent uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN v_old := (to_jsonb(OLD)->>'organization_id')::uuid; END IF;
  IF j ? 'avaliacao_id' AND (j->>'avaliacao_id') IS NOT NULL THEN
    SELECT organization_id INTO v_org FROM public.avaliacoes WHERE id = (j->>'avaliacao_id')::uuid;
    IF v_org IS NULL THEN RAISE EXCEPTION 'aval:avaliacao_not_found' USING ERRCODE = '23503'; END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    v_org := v_old;
  ELSIF auth.uid() IS NOT NULL THEN
    v_org := public.user_organization_id(auth.uid());
  ELSE
    v_org := (j->>'organization_id')::uuid;
  END IF;
  IF v_org IS NULL THEN RAISE EXCEPTION 'aval:organization_required' USING ERRCODE = '23502'; END IF;
  IF TG_OP = 'UPDATE' AND v_old IS DISTINCT FROM v_org THEN RAISE EXCEPTION 'aval:organization_immutable' USING ERRCODE = '42501'; END IF;
  IF j ? 'imovel_id' AND (j->>'imovel_id') IS NOT NULL THEN
    SELECT organization_id INTO v_parent FROM public.imoveis WHERE id = (j->>'imovel_id')::uuid;
    IF v_parent IS DISTINCT FROM v_org THEN RAISE EXCEPTION 'aval:cross_org_reference' USING ERRCODE = '42501'; END IF;
  END IF;
  IF j ? 'dado_id' AND (j->>'dado_id') IS NOT NULL THEN
    SELECT organization_id INTO v_parent FROM public.dados_mercado WHERE id = (j->>'dado_id')::uuid;
    IF v_parent IS DISTINCT FROM v_org THEN RAISE EXCEPTION 'aval:cross_org_reference' USING ERRCODE = '42501'; END IF;
  END IF;
  IF TG_TABLE_NAME IN ('fonte_mercado_contatos','dados_mercado_fontes','pesquisa_mercado_fontes') AND (j->>'fonte_id') IS NOT NULL THEN
    SELECT organization_id INTO v_parent FROM public.fontes_mercado WHERE id = (j->>'fonte_id')::uuid;
    IF v_parent IS DISTINCT FROM v_org THEN RAISE EXCEPTION 'aval:cross_org_reference' USING ERRCODE = '42501'; END IF;
  END IF;
  NEW := jsonb_populate_record(NEW, jsonb_build_object('organization_id', v_org));
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.aval_block_mutation() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$ BEGIN RAISE EXCEPTION 'aval:immutable_record' USING ERRCODE = '42501'; END $$;
CREATE OR REPLACE FUNCTION public.aval_guard_avaliacoes() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF public.aval_is_privileged() THEN RETURN NEW; END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.numero IS DISTINCT FROM OLD.numero OR NEW.ano IS DISTINCT FROM OLD.ano OR NEW.codigo IS DISTINCT FROM OLD.codigo
     OR NEW.tipo IS DISTINCT FROM OLD.tipo OR NEW.status IS DISTINCT FROM OLD.status OR NEW.stage IS DISTINCT FROM OLD.stage
     OR NEW.versao_atual IS DISTINCT FROM OLD.versao_atual OR NEW.responsavel_tecnico_id IS DISTINCT FROM OLD.responsavel_tecnico_id
     OR NEW.cancelado_motivo IS DISTINCT FROM OLD.cancelado_motivo OR NEW.cancelado_em IS DISTINCT FROM OLD.cancelado_em
     OR NEW.cancelado_por IS DISTINCT FROM OLD.cancelado_por OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'aval:protected_field' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.aval_guard_conjunto_amostras() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_status text;
BEGIN
  SELECT status INTO v_status FROM public.avaliacao_conjuntos_dados
   WHERE id = CASE WHEN TG_OP = 'DELETE' THEN OLD.conjunto_id ELSE NEW.conjunto_id END;
  IF v_status IS DISTINCT FROM 'RASCUNHO' THEN RAISE EXCEPTION 'aval:dataset_frozen' USING ERRCODE = '42501'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.aval_guard_modelo_variaveis() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_model uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN v_model := OLD.modelo_id; ELSE v_model := NEW.modelo_id; END IF;
  IF EXISTS (SELECT 1 FROM public.avaliacao_modelo_execucoes e WHERE e.modelo_id = v_model) THEN
    RAISE EXCEPTION 'aval:model_immutable' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.aval_guard_modelos() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM public.avaliacao_modelo_execucoes e WHERE e.modelo_id = OLD.id) THEN
      RAISE EXCEPTION 'aval:model_immutable' USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;
  IF EXISTS (SELECT 1 FROM public.avaliacao_modelo_execucoes e WHERE e.modelo_id = OLD.id)
     AND (NEW.conjunto_id IS DISTINCT FROM OLD.conjunto_id OR NEW.dependente_variavel_id IS DISTINCT FROM OLD.dependente_variavel_id
       OR NEW.dependente_transformacao IS DISTINCT FROM OLD.dependente_transformacao OR NEW.dependente_power IS DISTINCT FROM OLD.dependente_power
       OR NEW.nivel_confianca IS DISTINCT FROM OLD.nivel_confianca OR NEW.amostras_excluidas IS DISTINCT FROM OLD.amostras_excluidas
       OR NEW.avaliacao_id IS DISTINCT FROM OLD.avaliacao_id OR NEW.numero IS DISTINCT FROM OLD.numero) THEN
    RAISE EXCEPTION 'aval:model_immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.aval_guard_laudo_secoes() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
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
       OR NEW.aprovada_em IS DISTINCT FROM OLD.aprovada_em OR NEW.stale IS DISTINCT FROM OLD.stale THEN
      RAISE EXCEPTION 'aval:protected_field' USING ERRCODE = '42501';
    END IF;
    IF NEW.conteudo IS DISTINCT FROM OLD.conteudo THEN
      NEW.status := 'RASCUNHO'; NEW.aprovada_por := NULL; NEW.aprovada_em := NULL; NEW.stale := false; NEW.updated_by := auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.aval_laudo_secao_history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.conteudo IS DISTINCT FROM OLD.conteudo THEN
    INSERT INTO public.laudo_texto_versoes(organization_id, avaliacao_id, secao_id, conteudo, created_by)
    VALUES (NEW.organization_id, NEW.avaliacao_id, NEW.id, OLD.conteudo, auth.uid());
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.aval_dados_mercado_history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o jsonb := to_jsonb(OLD) - 'updated_at'; n jsonb := to_jsonb(NEW) - 'updated_at';
BEGIN
  IF o IS DISTINCT FROM n THEN
    INSERT INTO public.dados_mercado_historico(organization_id, dado_id, anterior, novo, alterado_por)
    VALUES (NEW.organization_id, NEW.id, o, n, auth.uid());
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.aval_audit(_av uuid, _entity text, _entity_id uuid, _event text, _details jsonb DEFAULT '{}')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_events(organization_id, avaliacao_id, entity_type, entity_id, event_type, actor_id, details_json)
  VALUES (COALESCE((SELECT organization_id FROM public.avaliacoes WHERE id = _av), public.user_organization_id(auth.uid())),
          _av, _entity, _entity_id, _event, auth.uid(), COALESCE(_details, '{}'));
END $$;
CREATE OR REPLACE FUNCTION public.aval_next_sequence(_org uuid, _scope text, _ano int) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v int;
BEGIN
  INSERT INTO public.organization_sequences(organization_id, scope, ano, last_value) VALUES (_org, _scope, _ano, 1)
  ON CONFLICT (organization_id, scope, ano) DO UPDATE SET last_value = public.organization_sequences.last_value + 1, updated_at = now()
  RETURNING last_value INTO v;
  RETURN v;
END $$;
CREATE OR REPLACE FUNCTION public.aval_bump_stage(_av uuid, _stage text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ord text[] := ARRAY['CADASTRO','IMOVEL','PESQUISA_MERCADO','MODELAGEM','VALIDACAO','RESULTADO_ECONOMICO','LAUDO','EMISSAO'];
BEGIN
  UPDATE public.avaliacoes SET stage = _stage WHERE id = _av AND array_position(ord, stage) < array_position(ord, _stage);
END $$;

CREATE OR REPLACE FUNCTION public.aval_invalidate(p_av uuid, p_nivel text, p_motivo text, p_secoes text[] DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n_mod int := 0; n_val int := 0; n_ac int := 0; n_proj int := 0; n_res int := 0; n_sec int := 0;
BEGIN
  IF p_nivel = 'NO_IMPACT' THEN RETURN jsonb_build_object('nivel', p_nivel); END IF;
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
END $$;
CREATE OR REPLACE FUNCTION public.aval_variable_in_use(_var uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.avaliacao_modelos m WHERE m.dependente_variavel_id = _var AND m.status <> 'RASCUNHO')
      OR EXISTS (SELECT 1 FROM public.avaliacao_modelo_variaveis mv JOIN public.avaliacao_modelos m ON m.id = mv.modelo_id
                 WHERE mv.variavel_id = _var AND m.status <> 'RASCUNHO')
$$;
CREATE OR REPLACE FUNCTION public.aval_trg_inv_valores_adm() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_av uuid;
BEGIN
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
CREATE OR REPLACE FUNCTION public.aval_trg_inv_variaveis() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.relacao_esperada IS DISTINCT FROM OLD.relacao_esperada OR NEW.tipo_variavel IS DISTINCT FROM OLD.tipo_variavel)
     AND public.aval_variable_in_use(NEW.id) THEN
    PERFORM public.aval_invalidate(NEW.avaliacao_id, 'VALIDATION', 'Relação esperada/tipo de variável alterado');
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.aval_trg_inv_fonte_contato() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a uuid;
BEGIN
  IF NEW.telefone IS DISTINCT FROM OLD.telefone OR NEW.email IS DISTINCT FROM OLD.email OR NEW.nome IS DISTINCT FROM OLD.nome THEN
    FOR a IN SELECT DISTINCT am.avaliacao_id FROM public.avaliacao_amostras am JOIN public.dados_mercado_fontes f ON f.dado_id = am.dado_id
              WHERE f.fonte_id = NEW.fonte_id AND am.organization_id = NEW.organization_id LOOP
      PERFORM public.aval_invalidate(a, 'REPORT_ONLY', 'Contato de fonte alterado', ARRAY['PESQUISA_MERCADO']);
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.aval_trg_inv_avaliacao() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.processo_administrativo IS DISTINCT FROM OLD.processo_administrativo OR NEW.numero_contrato IS DISTINCT FROM OLD.numero_contrato
     OR NEW.observacao IS DISTINCT FROM OLD.observacao THEN
    PERFORM public.aval_invalidate(NEW.id, 'REPORT_ONLY', 'Dados administrativos alterados', ARRAY['RESUMO','SOLICITANTE','OBJETO']);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.aval_create(p_tipo text, p_uf text, p_municipio_nome text, p_municipio_ibge text,
  p_tipo_imovel text, p_responsavel_id uuid, p_processo text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_org uuid; v_ano int; v_num int; v_id uuid; v_codigo text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'aval:unauthenticated' USING ERRCODE = '42501'; END IF;
  v_org := public.user_organization_id(v_uid);
  IF NOT public.aval_has_global_perm('evaluation.create') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  IF p_tipo NOT IN ('NOVA_LOCACAO','RENOVACAO','REAJUSTE') THEN RAISE EXCEPTION 'aval:invalid_tipo' USING ERRCODE = '22023'; END IF;
  IF p_uf IS NULL OR length(btrim(p_uf)) <> 2 OR COALESCE(btrim(p_municipio_nome), '') = '' OR COALESCE(btrim(p_tipo_imovel), '') = '' THEN
    RAISE EXCEPTION 'aval:missing_required' USING ERRCODE = '22023';
  END IF;
  IF p_responsavel_id IS NULL OR public.user_organization_id(p_responsavel_id) IS DISTINCT FROM v_org OR NOT public.aval_is_technical(p_responsavel_id) THEN
    RAISE EXCEPTION 'aval:invalid_responsavel' USING ERRCODE = '22023';
  END IF;
  v_ano := extract(year FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::int;
  v_num := public.aval_next_sequence(v_org, 'AVALIACAO', v_ano);
  v_codigo := lpad(v_num::text, 3, '0') || '/' || v_ano;
  INSERT INTO public.avaliacoes(organization_id, numero, ano, codigo, tipo, uf, municipio_nome, municipio_ibge, tipo_imovel,
    processo_administrativo, responsavel_tecnico_id, created_by)
  VALUES (v_org, v_num, v_ano, v_codigo, p_tipo, upper(btrim(p_uf)), btrim(p_municipio_nome), NULLIF(btrim(p_municipio_ibge), ''),
    btrim(p_tipo_imovel), NULLIF(btrim(p_processo), ''), p_responsavel_id, v_uid)
  RETURNING id INTO v_id;
  INSERT INTO public.avaliacao_versoes(organization_id, avaliacao_id, revisao, status, created_by) VALUES (v_org, v_id, 0, 'RASCUNHO', v_uid);
  INSERT INTO public.avaliacao_membros(organization_id, avaliacao_id, user_id, papel, created_by) VALUES (v_org, v_id, p_responsavel_id, 'RESPONSAVEL_TECNICO', v_uid);
  IF v_uid <> p_responsavel_id AND public.aval_is_technical(v_uid) THEN
    INSERT INTO public.avaliacao_membros(organization_id, avaliacao_id, user_id, papel, created_by) VALUES (v_org, v_id, v_uid, 'COLABORADOR', v_uid);
  END IF;
  INSERT INTO public.avaliacao_metodos(organization_id, avaliacao_id, metodo, principal) VALUES (v_org, v_id, 'COMPARATIVO_REGRESSAO', true);
  PERFORM public.aval_audit(v_id, 'avaliacao', v_id, 'EVALUATION_CREATED', jsonb_build_object('codigo', v_codigo, 'tipo', p_tipo, 'responsavel', p_responsavel_id));
  RETURN v_id;
END $$;
CREATE OR REPLACE FUNCTION public.aval_set_member(p_avaliacao uuid, p_user uuid, p_papel text, p_ativo boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid; v_ok boolean;
BEGIN
  SELECT organization_id INTO v_org FROM public.avaliacoes WHERE id = p_avaliacao AND status = 'ATIVA';
  IF v_org IS NULL OR NOT public.aval_is_reader(v_org) THEN RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
  v_ok := public.has_role(auth.uid(), 'admin'::user_role)
       OR EXISTS (SELECT 1 FROM public.avaliacao_membros WHERE avaliacao_id = p_avaliacao AND user_id = auth.uid() AND papel = 'RESPONSAVEL_TECNICO' AND ativo);
  IF NOT v_ok THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  IF p_papel NOT IN ('RESPONSAVEL_TECNICO','COLABORADOR','REVISOR') THEN RAISE EXCEPTION 'aval:invalid_papel' USING ERRCODE = '22023'; END IF;
  IF public.user_organization_id(p_user) IS DISTINCT FROM v_org OR NOT public.aval_is_technical(p_user) THEN
    RAISE EXCEPTION 'aval:invalid_member' USING ERRCODE = '22023';
  END IF;
  IF p_papel = 'RESPONSAVEL_TECNICO' THEN
    IF NOT p_ativo THEN RAISE EXCEPTION 'aval:rt_required' USING ERRCODE = '22023'; END IF;
    UPDATE public.avaliacao_membros SET ativo = false WHERE avaliacao_id = p_avaliacao AND papel = 'RESPONSAVEL_TECNICO' AND ativo AND user_id <> p_user;
    UPDATE public.avaliacoes SET responsavel_tecnico_id = p_user WHERE id = p_avaliacao;
  END IF;
  INSERT INTO public.avaliacao_membros(organization_id, avaliacao_id, user_id, papel, ativo, created_by)
  VALUES (v_org, p_avaliacao, p_user, p_papel, p_ativo, auth.uid())
  ON CONFLICT (avaliacao_id, user_id, papel) DO UPDATE SET ativo = EXCLUDED.ativo;
  PERFORM public.aval_audit(p_avaliacao, 'avaliacao_membro', p_user, 'MEMBER_CHANGED', jsonb_build_object('papel', p_papel, 'ativo', p_ativo));
END $$;
CREATE OR REPLACE FUNCTION public.aval_cancel(p_avaliacao uuid, p_motivo text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.aval_can_edit(p_avaliacao, 'evaluation.cancel') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  IF length(btrim(COALESCE(p_motivo, ''))) < 10 THEN RAISE EXCEPTION 'aval:justification_required' USING ERRCODE = '22023'; END IF;
  UPDATE public.avaliacoes SET status = 'CANCELADA', cancelado_motivo = btrim(p_motivo), cancelado_em = now(), cancelado_por = auth.uid() WHERE id = p_avaliacao;
  PERFORM public.aval_audit(p_avaliacao, 'avaliacao', p_avaliacao, 'EVALUATION_CANCELLED', jsonb_build_object('motivo', btrim(p_motivo)));
END $$;

CREATE OR REPLACE FUNCTION public.aval_dataset_prepare(p_avaliacao uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid; v_id uuid; v_ver int;
BEGIN
  IF NOT public.aval_can_edit(p_avaliacao, 'market.select_samples') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  SELECT organization_id INTO v_org FROM public.avaliacoes WHERE id = p_avaliacao;
  SELECT id INTO v_id FROM public.avaliacao_conjuntos_dados WHERE avaliacao_id = p_avaliacao AND status = 'RASCUNHO' ORDER BY versao DESC LIMIT 1;
  IF v_id IS NULL THEN
    SELECT COALESCE(max(versao), 0) + 1 INTO v_ver FROM public.avaliacao_conjuntos_dados WHERE avaliacao_id = p_avaliacao;
    INSERT INTO public.avaliacao_conjuntos_dados(organization_id, avaliacao_id, versao, status, created_by)
    VALUES (v_org, p_avaliacao, v_ver, 'RASCUNHO', auth.uid()) RETURNING id INTO v_id;
  END IF;
  DELETE FROM public.avaliacao_conjunto_amostras WHERE conjunto_id = v_id;
  INSERT INTO public.avaliacao_conjunto_amostras(organization_id, avaliacao_id, conjunto_id, amostra_id, dado_id, habilitada_modelo)
  SELECT v_org, p_avaliacao, v_id, a.id, a.dado_id, a.habilitada_modelo FROM public.avaliacao_amostras a WHERE a.avaliacao_id = p_avaliacao AND a.selecionada;
  RETURN v_id;
END $$;
CREATE OR REPLACE FUNCTION public.aval_dataset_freeze(p_conjunto uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; v_prev int; v_n int; v_av_imovel uuid; v_dados jsonb;
BEGIN
  SELECT * INTO c FROM public.avaliacao_conjuntos_dados WHERE id = p_conjunto;
  IF c.id IS NULL OR NOT public.aval_can_edit(c.avaliacao_id, 'market.select_samples') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  IF c.status <> 'RASCUNHO' THEN RAISE EXCEPTION 'aval:dataset_frozen' USING ERRCODE = '42501'; END IF;
  SELECT count(*) INTO v_n FROM public.avaliacao_conjunto_amostras WHERE conjunto_id = p_conjunto;
  IF v_n = 0 THEN RAISE EXCEPTION 'aval:dataset_empty' USING ERRCODE = '22023'; END IF;
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
      'variaveis', COALESCE((SELECT jsonb_object_agg(v.codigo, vv.valor) FROM public.avaliacao_variavel_valores vv JOIN public.avaliacao_variaveis v ON v.id = vv.variavel_id
                     WHERE vv.amostra_id = a.id AND vv.scope_type = 'AMOSTRA'), '{}')
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
CREATE OR REPLACE FUNCTION public.aval_keep_snapshot(p_avaliacao uuid, p_amostra uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.aval_has_perm(p_avaliacao, 'market.select_samples') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  PERFORM public.aval_audit(p_avaliacao, 'avaliacao_amostra', p_amostra, 'SNAPSHOT_KEPT', '{}');
END $$;

CREATE OR REPLACE FUNCTION public.aval_model_create(p_avaliacao uuid, p_conjunto uuid, p_nome text, p_dep_var uuid, p_dep_transf text,
  p_dep_power numeric, p_vars jsonb, p_origem_tipo text DEFAULT 'MANUAL', p_modelo_origem uuid DEFAULT NULL,
  p_amostras_excluidas uuid[] DEFAULT '{}', p_espaco uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END $$;
CREATE OR REPLACE FUNCTION public.aval_model_flag(p_modelo uuid, p_favorito boolean, p_candidato boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_av uuid;
BEGIN
  SELECT avaliacao_id INTO v_av FROM public.avaliacao_modelos WHERE id = p_modelo;
  IF v_av IS NULL OR NOT public.aval_can_edit(v_av, 'model.create') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  UPDATE public.avaliacao_modelos SET favorito = COALESCE(p_favorito, favorito), candidato = COALESCE(p_candidato, candidato) WHERE id = p_modelo;
END $$;
CREATE OR REPLACE FUNCTION public.aval_send_to_validation(p_modelo uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m record; e record;
BEGIN
  SELECT * INTO m FROM public.avaliacao_modelos WHERE id = p_modelo;
  IF m.id IS NULL OR NOT public.aval_can_edit(m.avaliacao_id, 'validation.run') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  IF m.stale THEN RAISE EXCEPTION 'aval:model_stale' USING ERRCODE = '22023'; END IF;
  SELECT * INTO e FROM public.avaliacao_modelo_execucoes WHERE modelo_id = p_modelo AND status = 'SUCESSO' ORDER BY created_at DESC LIMIT 1;
  IF e.id IS NULL THEN RAISE EXCEPTION 'aval:model_not_calculated' USING ERRCODE = '22023'; END IF;
  UPDATE public.avaliacao_modelos SET status = 'EM_VALIDACAO', candidato = true WHERE id = p_modelo;
  INSERT INTO public.modelo_snapshots(organization_id, avaliacao_id, modelo_id, execucao_id, dados, hash)
  SELECT m.organization_id, m.avaliacao_id, m.id, e.id, s.d, public.aval_hash(s.d) FROM (SELECT jsonb_build_object(
      'modelo', to_jsonb(m) - 'updated_at' - 'favorito' - 'candidato' - 'status',
      'variaveis', (SELECT jsonb_agg(to_jsonb(mv) ORDER BY mv.ordem) FROM public.avaliacao_modelo_variaveis mv WHERE mv.modelo_id = m.id),
      'execucao_id', e.id, 'input_hash', e.input_hash, 'output_hash', e.output_hash, 'engine_version', e.engine_version) AS d) s;
  PERFORM public.aval_audit(m.avaliacao_id, 'modelo', m.id, 'MODEL_SENT_TO_VALIDATION', jsonb_build_object('execucao', e.id));
  PERFORM public.aval_bump_stage(m.avaliacao_id, 'VALIDACAO');
END $$;

CREATE OR REPLACE FUNCTION public.aval_manual_review(p_modelo uuid, p_codigo text, p_decisao text, p_justificativa text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m record; v_id uuid;
BEGIN
  SELECT * INTO m FROM public.avaliacao_modelos WHERE id = p_modelo;
  IF m.id IS NULL OR NOT public.aval_can_edit(m.avaliacao_id, 'validation.manual_review') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  IF length(btrim(COALESCE(p_justificativa, ''))) < 10 THEN RAISE EXCEPTION 'aval:justification_required' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.validation_manual_reviews(organization_id, avaliacao_id, modelo_id, codigo, decisao, justificativa, created_by)
  VALUES (m.organization_id, m.avaliacao_id, m.id, p_codigo, p_decisao, btrim(p_justificativa), auth.uid()) RETURNING id INTO v_id;
  PERFORM public.aval_audit(m.avaliacao_id, 'modelo', m.id, 'VALIDATION_MANUAL_REVIEW', jsonb_build_object('criterio', p_codigo, 'decisao', p_decisao));
  RETURN v_id;
END $$;
CREATE OR REPLACE FUNCTION public.aval_accept_model(p_validation uuid, p_justificativa text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    'revisoes', COALESCE((SELECT jsonb_agg(to_jsonb(rv) ORDER BY rv.created_at) FROM public.validation_manual_reviews rv WHERE rv.modelo_id = v.modelo_id), '[]'));
  INSERT INTO public.validation_snapshots(organization_id, avaliacao_id, validation_id, acceptance_id, dados, hash)
  VALUES (v.organization_id, v.avaliacao_id, v.id, v_id, v_dados, public.aval_hash(v_dados));
  PERFORM public.aval_invalidate(v.avaliacao_id, 'REPORT_ONLY', 'Novo modelo aceito', NULL);
  PERFORM public.aval_audit(v.avaliacao_id, 'modelo', v.modelo_id, 'MODEL_ACCEPTED', jsonb_build_object('validacao', v.id, 'status', v.overall_status));
  PERFORM public.aval_bump_stage(v.avaliacao_id, 'RESULTADO_ECONOMICO');
  RETURN v_id;
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