-- Coerência de permissões do Mercado: incluir amostra (cadastro novo, banco de imóveis ou importação) é parte de
-- "Editar pesquisa de mercado" (market.edit). Continuam exclusivos de market.select_samples (DECIDIR):
-- marcar Usar/No modelo, remover o vínculo, congelar o conjunto e decidir municípios comparáveis.
-- Nenhum papel ganha ou perde permissão na matriz; só a ação de vincular passa a seguir a permissão de edição.
DROP POLICY IF EXISTS aval_insert ON public.avaliacao_amostras;
CREATE POLICY aval_insert ON public.avaliacao_amostras FOR INSERT TO authenticated
  WITH CHECK (public.aval_is_reader(organization_id) AND public.aval_can_edit(avaliacao_id, 'market.edit'));

CREATE OR REPLACE FUNCTION public.aval_amostras_adicionar(p_avaliacao uuid, p_dados uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE av record; d record; v_ids uuid[] := '{}'; v_id uuid; v_dup int := 0; v_n int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'aval:unauthenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO av FROM public.avaliacoes WHERE id = p_avaliacao AND public.aval_is_reader(organization_id);
  IF av.id IS NULL THEN RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
  IF av.status <> 'ATIVA' THEN RAISE EXCEPTION 'aval:evaluation_not_active' USING ERRCODE = '42501'; END IF;
  IF NOT public.aval_can_edit(p_avaliacao, 'market.edit') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  v_n := COALESCE(cardinality(ARRAY(SELECT DISTINCT unnest(p_dados))), 0);
  IF v_n = 0 OR v_n > 200 THEN RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023'; END IF;
  IF (SELECT count(*) FROM public.dados_mercado WHERE id = ANY(p_dados) AND organization_id = av.organization_id) <> v_n THEN
    RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501';
  END IF;
  FOR d IN SELECT dm.id, i.municipio_ibge FROM (SELECT DISTINCT ON (u.id) u.id, u.o FROM unnest(p_dados) WITH ORDINALITY u(id, o) ORDER BY u.id, u.o) u
             JOIN public.dados_mercado dm ON dm.id = u.id JOIN public.imoveis i ON i.id = dm.imovel_id ORDER BY u.o LOOP
    IF EXISTS (SELECT 1 FROM public.avaliacao_amostras WHERE avaliacao_id = p_avaliacao AND dado_id = d.id) THEN v_dup := v_dup + 1; CONTINUE; END IF;
    INSERT INTO public.avaliacao_amostras(avaliacao_id, dado_id, origem_territorial, origem_inclusao, motivo_inclusao)
    VALUES (p_avaliacao, d.id, public.aval_origem_territorial_padrao(av.municipio_ibge, d.municipio_ibge), 'BANCO', 'Incluída a partir do banco de imóveis')
    RETURNING id INTO v_id;
    v_ids := v_ids || v_id;
  END LOOP;
  RETURN jsonb_build_object('adicionadas', cardinality(v_ids), 'ja_existentes', v_dup, 'amostras', to_jsonb(v_ids));
END $function$;

CREATE OR REPLACE FUNCTION public.aval_amostras_importar(p_avaliacao uuid, p_origem uuid, p_amostras uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE av record; src record; s record; v_id uuid; v_ids uuid[] := '{}'; v_dup int := 0; v_vars int := 0; v_n int; v_pode_var boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'aval:unauthenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO av FROM public.avaliacoes WHERE id = p_avaliacao AND public.aval_is_reader(organization_id);
  IF av.id IS NULL THEN RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
  IF av.status <> 'ATIVA' THEN RAISE EXCEPTION 'aval:evaluation_not_active' USING ERRCODE = '42501'; END IF;
  IF NOT public.aval_can_edit(p_avaliacao, 'market.edit') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  SELECT * INTO src FROM public.avaliacoes WHERE id = p_origem AND organization_id = av.organization_id AND id <> av.id;
  IF src.id IS NULL THEN RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
  IF p_amostras IS NOT NULL THEN
    v_n := cardinality(ARRAY(SELECT DISTINCT unnest(p_amostras)));
    IF v_n = 0 OR v_n > 500 THEN RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023'; END IF;
    IF (SELECT count(*) FROM public.avaliacao_amostras WHERE id = ANY(p_amostras) AND avaliacao_id = src.id) <> v_n THEN
      RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501';
    END IF;
  END IF;
  v_pode_var := public.aval_can_edit(p_avaliacao, 'model.create');
  FOR s IN SELECT a.id, a.dado_id, a.selecionada, a.habilitada_modelo, i.municipio_ibge
             FROM public.avaliacao_amostras a JOIN public.dados_mercado dm ON dm.id = a.dado_id JOIN public.imoveis i ON i.id = dm.imovel_id
            WHERE a.avaliacao_id = src.id AND (p_amostras IS NULL OR a.id = ANY(p_amostras)) ORDER BY a.created_at, a.id LOOP
    IF EXISTS (SELECT 1 FROM public.avaliacao_amostras WHERE avaliacao_id = p_avaliacao AND dado_id = s.dado_id) THEN v_dup := v_dup + 1; CONTINUE; END IF;
    INSERT INTO public.avaliacao_amostras(avaliacao_id, dado_id, origem_territorial, selecionada, habilitada_modelo, origem_inclusao,
      importada_de_amostra_id, motivo_inclusao)
    VALUES (p_avaliacao, s.dado_id, public.aval_origem_territorial_padrao(av.municipio_ibge, s.municipio_ibge), s.selecionada, s.habilitada_modelo,
      'IMPORTACAO', s.id, left('Importada da avaliação ' || src.codigo, 500))
    RETURNING id INTO v_id;
    v_ids := v_ids || v_id;
    -- Valores digitados (variáveis manuais) seguem pelo código da variável, quando esta avaliação tem a mesma variável manual.
    IF v_pode_var THEN
      WITH ins AS (
        INSERT INTO public.avaliacao_variavel_valores(avaliacao_id, variavel_id, scope_type, amostra_id, valor, valor_texto, origem)
        SELECT p_avaliacao, tv.id, 'AMOSTRA', v_id, sv.valor, sv.valor_texto, 'IMPORTADO'
          FROM public.avaliacao_variavel_valores sv
          JOIN public.avaliacao_variaveis sva ON sva.id = sv.variavel_id
          JOIN public.avaliacao_variaveis tv ON tv.avaliacao_id = p_avaliacao AND tv.codigo = sva.codigo
         WHERE sv.amostra_id = s.id AND sv.scope_type = 'AMOSTRA'
           AND public.aval_var_fonte(sva.campo_origem, sva.atributo_id) = 'MANUAL' AND public.aval_var_fonte(tv.campo_origem, tv.atributo_id) = 'MANUAL'
        ON CONFLICT DO NOTHING RETURNING 1)
      SELECT v_vars + count(*) INTO v_vars FROM ins;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('importadas', cardinality(v_ids), 'ja_existentes', v_dup, 'valores_variaveis', v_vars,
    'variaveis_sem_permissao', NOT v_pode_var, 'amostras', to_jsonb(v_ids));
END $function$;

UPDATE public.avaliacao_permissoes SET descricao = 'Editar pesquisa de mercado e incluir amostras' WHERE codigo = 'market.edit';
UPDATE public.avaliacao_permissoes SET descricao = 'Selecionar amostras para o modelo e congelar conjunto' WHERE codigo = 'market.select_samples';