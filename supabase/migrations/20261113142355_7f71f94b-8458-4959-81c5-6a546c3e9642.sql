-- "Remover da avaliação": desfaz só o vínculo da amostra com a avaliação (nunca apaga imóvel, dado de mercado ou fontes).
-- Amostra que já integra conjunto congelado, foto, modelo ou foi importada por outra avaliação é histórica: nada é apagado
-- e a função devolve aval:amostra_historica com os motivos, para a tela orientar "desmarcar e congelar nova versão".
CREATE OR REPLACE FUNCTION public.aval_amostra_remover(p_avaliacao uuid, p_amostra uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE av record; a record; v_motivos text[] := '{}'; v_vals int := 0; v_rasc int := 0; v_imovel uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'aval:unauthenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO av FROM public.avaliacoes WHERE id = p_avaliacao AND public.aval_is_reader(organization_id);
  IF av.id IS NULL THEN RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
  IF av.status <> 'ATIVA' THEN RAISE EXCEPTION 'aval:evaluation_not_active' USING ERRCODE = '42501'; END IF;
  IF NOT public.aval_can_edit(p_avaliacao, 'market.edit') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  SELECT * INTO a FROM public.avaliacao_amostras WHERE id = p_amostra AND avaliacao_id = p_avaliacao AND organization_id = av.organization_id FOR UPDATE;
  IF a.id IS NULL THEN RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;

  IF EXISTS (SELECT 1 FROM public.avaliacao_amostra_snapshots WHERE amostra_id = a.id)
     OR EXISTS (SELECT 1 FROM public.avaliacao_conjunto_amostras ca JOIN public.avaliacao_conjuntos_dados c ON c.id = ca.conjunto_id
                WHERE ca.amostra_id = a.id AND c.status <> 'RASCUNHO') THEN
    v_motivos := array_append(v_motivos, 'CONJUNTO_CONGELADO');
  END IF;
  IF EXISTS (SELECT 1 FROM public.modelo_residuos WHERE amostra_id = a.id)
     OR EXISTS (SELECT 1 FROM public.avaliacao_modelos WHERE avaliacao_id = p_avaliacao AND a.id = ANY(amostras_excluidas)) THEN
    v_motivos := array_append(v_motivos, 'MODELO');
  END IF;
  IF EXISTS (SELECT 1 FROM public.avaliacao_amostras WHERE importada_de_amostra_id = a.id) THEN
    v_motivos := array_append(v_motivos, 'IMPORTADA_POR_OUTRA_AVALIACAO');
  END IF;
  IF cardinality(v_motivos) > 0 THEN
    RAISE EXCEPTION 'aval:amostra_historica' USING ERRCODE = '42501',
      DETAIL = jsonb_build_object('motivos', to_jsonb(v_motivos), 'selecionada', a.selecionada, 'habilitada_modelo', a.habilitada_modelo)::text;
  END IF;

  SELECT imovel_id INTO v_imovel FROM public.dados_mercado WHERE id = a.dado_id;
  -- Valores só desta amostra nesta avaliação; nunca participaram de conjunto congelado, então não há o que invalidar.
  PERFORM set_config('aval.batch', 'on', true);
  DELETE FROM public.avaliacao_conjunto_amostras WHERE amostra_id = a.id;  -- só restam rascunhos (guarda bloqueia os demais)
  GET DIAGNOSTICS v_rasc = ROW_COUNT;
  DELETE FROM public.avaliacao_variavel_valores WHERE amostra_id = a.id AND avaliacao_id = p_avaliacao;
  GET DIAGNOSTICS v_vals = ROW_COUNT;
  DELETE FROM public.avaliacao_amostras WHERE id = a.id;
  PERFORM set_config('aval.batch', '', true);

  PERFORM public.aval_audit(p_avaliacao, 'avaliacao_amostra', a.id, 'AMOSTRA_REMOVIDA_DA_AVALIACAO', jsonb_build_object(
    'dado_id', a.dado_id, 'imovel_id', v_imovel, 'origem_inclusao', a.origem_inclusao, 'origem_territorial', a.origem_territorial,
    'selecionada', a.selecionada, 'habilitada_modelo', a.habilitada_modelo, 'incluida_em', a.created_at,
    'snapshot_chave', a.snapshot_chave, 'valores_variaveis_removidos', v_vals, 'rascunhos_conjunto_removidos', v_rasc));
  RETURN jsonb_build_object('removida', true, 'dado_id', a.dado_id, 'imovel_id', v_imovel, 'valores_variaveis_removidos', v_vals);
END $$;
REVOKE ALL ON FUNCTION public.aval_amostra_remover(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aval_amostra_remover(uuid, uuid) TO authenticated;