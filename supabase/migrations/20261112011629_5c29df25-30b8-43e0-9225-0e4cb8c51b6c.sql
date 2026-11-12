DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('avaliacao_valores_administrativos','evaluation.edit'), ('avaliacao_documentos','evaluation.edit'), ('avaliacao_metodos','evaluation.edit'),
    ('avaliacao_imoveis','property.edit'), ('avaliacao_caracteristicas_relevantes','property.edit'),
    ('imovel_vistorias','inspection.edit'), ('imovel_vistoria_itens','inspection.edit'), ('imovel_vistoria_midias','inspection.edit'),
    ('pesquisas_mercado','market.edit'), ('pesquisa_mercado_fontes','market.edit'), ('avaliacao_municipios_comparaveis','market.edit'),
    ('avaliacao_amostras','market.select_samples'),
    ('avaliacao_variaveis','model.create'), ('avaliacao_variavel_valores','model.create'),
    ('avaliacao_espacos_modelagem','model.create'), ('avaliacao_espaco_variaveis','model.create'), ('avaliacao_espaco_transformacoes','model.create'),
    ('laudo_blocos','report.edit'), ('laudo_anexos','report.edit'),
    ('avaliacao_fontes','report.edit'), ('avaliacao_fonte_fatos','report.edit'), ('avaliacao_fonte_usos','report.edit')
  ) AS t(tbl, perm) LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', r.tbl);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', r.tbl);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tbl);
    EXECUTE format('CREATE POLICY aval_select ON public.%I FOR SELECT TO authenticated USING (public.aval_is_reader(organization_id))', r.tbl);
    EXECUTE format('CREATE POLICY aval_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.aval_is_reader(organization_id) AND public.aval_can_edit(avaliacao_id, %L))', r.tbl, r.perm);
    EXECUTE format('CREATE POLICY aval_update ON public.%I FOR UPDATE TO authenticated USING (public.aval_is_reader(organization_id) AND public.aval_can_edit(avaliacao_id, %L)) WITH CHECK (public.aval_is_reader(organization_id) AND public.aval_can_edit(avaliacao_id, %L))', r.tbl, r.perm, r.perm);
    EXECUTE format('CREATE POLICY aval_delete ON public.%I FOR DELETE TO authenticated USING (public.aval_is_reader(organization_id) AND public.aval_can_edit(avaliacao_id, %L))', r.tbl, r.perm);
    EXECUTE format('CREATE TRIGGER aval_set_org BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.aval_set_org()', r.tbl);
  END LOOP;

  FOR r IN SELECT * FROM (VALUES ('imoveis'),('imovel_localizacao'),('imovel_atributos'),('imovel_ambientes'),('imovel_componentes'),
    ('imovel_infraestrutura'),('imovel_documentos'),('imovel_midias'),('fontes_mercado'),('fonte_mercado_contatos'),('dados_mercado'),
    ('dados_mercado_fontes'),('dados_mercado_evidencias'),('dados_mercado_confirmacoes')) AS t(tbl) LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', r.tbl);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', r.tbl);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tbl);
    EXECUTE format('CREATE POLICY aval_select ON public.%I FOR SELECT TO authenticated USING (public.aval_is_reader(organization_id))', r.tbl);
    EXECUTE format('CREATE POLICY aval_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.aval_is_reader(organization_id) AND public.aval_is_technical(auth.uid()))', r.tbl);
    EXECUTE format('CREATE POLICY aval_update ON public.%I FOR UPDATE TO authenticated USING (public.aval_is_reader(organization_id) AND public.aval_is_technical(auth.uid())) WITH CHECK (public.aval_is_reader(organization_id) AND public.aval_is_technical(auth.uid()))', r.tbl);
    EXECUTE format('CREATE POLICY aval_delete ON public.%I FOR DELETE TO authenticated USING (public.aval_is_reader(organization_id) AND public.aval_is_technical(auth.uid()))', r.tbl);
    EXECUTE format('CREATE TRIGGER aval_set_org BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.aval_set_org()', r.tbl);
  END LOOP;

  FOR r IN SELECT * FROM (VALUES ('organization_sequences'),('avaliacao_versoes'),('avaliacao_membros'),('avaliacao_conjuntos_dados'),
    ('avaliacao_conjunto_amostras'),('avaliacao_amostra_snapshots'),('imovel_snapshots'),('avaliacao_modelos'),('avaliacao_modelo_variaveis'),
    ('avaliacao_modelo_execucoes'),('modelo_resultado_resumo'),('modelo_coeficientes'),('modelo_execucao_erros'),('modelo_snapshots'),
    ('model_validations'),('model_validation_results'),('validation_manual_reviews'),('model_acceptances'),('validation_snapshots'),
    ('avaliacao_projecoes'),('avaliacao_projecao_centros'),('avaliacao_arbitrios'),('avaliacao_arbitrio_caracteristicas'),
    ('avaliacao_valores_adotados'),('avaliacao_resultado_economico'),('avaliacao_compatibilidades'),('avaliacao_resultado_snapshots'),
    ('laudos'),('laudo_versoes'),('laudo_texto_versoes'),('laudo_preflight_runs'),('laudo_preflight_results'),('laudo_emissoes'),
    ('laudo_emissao_snapshots'),('laudo_arquivos_emitidos'),('avaliacao_ai_conteudos'),('audit_events'),('dados_mercado_historico'),
    ('organization_validation_policy')) AS t(tbl) LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', r.tbl);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', r.tbl);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tbl);
    EXECUTE format('CREATE POLICY aval_select ON public.%I FOR SELECT TO authenticated USING (public.aval_is_reader(organization_id))', r.tbl);
    IF r.tbl NOT IN ('organization_sequences','organization_validation_policy','dados_mercado_historico','audit_events') THEN
      EXECUTE format('CREATE TRIGGER aval_set_org BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.aval_set_org()', r.tbl);
    END IF;
  END LOOP;

  FOR r IN SELECT * FROM (VALUES ('avaliacao_permissoes'),('avaliacao_papel_permissoes'),('stat_transformations'),('document_tokens'),
    ('aval_impact_rules'),('validation_policy_rules'),('laudo_template_versions'),('laudo_template_sections'),('laudo_template_blocks')) AS t(tbl) LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', r.tbl);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', r.tbl);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tbl);
    EXECUTE format('CREATE POLICY aval_select ON public.%I FOR SELECT TO authenticated USING (true)', r.tbl);
  END LOOP;
  FOR r IN SELECT * FROM (VALUES ('validation_policies'),('arbitration_policies'),('rounding_policies'),('laudo_templates')) AS t(tbl) LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', r.tbl);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', r.tbl);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tbl);
    EXECUTE format('CREATE POLICY aval_select ON public.%I FOR SELECT TO authenticated USING (organization_id IS NULL OR public.aval_is_reader(organization_id))', r.tbl);
  END LOOP;

  FOR r IN SELECT * FROM (VALUES ('avaliacao_amostra_snapshots'),('imovel_snapshots'),('avaliacao_modelo_execucoes'),('modelo_resultado_resumo'),
    ('modelo_coeficientes'),('modelo_execucao_erros'),('modelo_snapshots'),('model_validation_results'),('validation_manual_reviews'),
    ('validation_snapshots'),('avaliacao_projecao_centros'),('avaliacao_valores_adotados'),('avaliacao_compatibilidades'),
    ('avaliacao_resultado_snapshots'),('avaliacao_arbitrios'),('avaliacao_arbitrio_caracteristicas'),('laudo_texto_versoes'),
    ('laudo_preflight_runs'),('laudo_preflight_results'),('laudo_emissoes'),('laudo_emissao_snapshots'),('laudo_arquivos_emitidos'),
    ('audit_events'),('dados_mercado_historico')) AS t(tbl) LOOP
    EXECUTE format('CREATE TRIGGER aval_immutable BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.aval_block_mutation()', r.tbl);
  END LOOP;

  FOR r IN SELECT c.table_name AS tbl FROM information_schema.columns c
     WHERE c.table_schema = 'public' AND c.column_name = 'updated_at'
       AND c.table_name IN ('organization_sequences','avaliacoes','avaliacao_valores_administrativos','imoveis','imovel_localizacao','imovel_atributos',
         'imovel_vistorias','fontes_mercado','fonte_mercado_contatos','dados_mercado','pesquisas_mercado','avaliacao_amostras',
         'avaliacao_municipios_comparaveis','avaliacao_variaveis','avaliacao_variavel_valores','avaliacao_modelos','laudo_secoes') LOOP
    EXECUTE format('CREATE TRIGGER aval_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', r.tbl);
  END LOOP;
END $$;

GRANT SELECT, UPDATE ON public.avaliacoes TO authenticated;
GRANT ALL ON public.avaliacoes TO service_role;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY aval_select ON public.avaliacoes FOR SELECT TO authenticated USING (public.aval_is_reader(organization_id));
CREATE POLICY aval_update ON public.avaliacoes FOR UPDATE TO authenticated
  USING (public.aval_is_reader(organization_id) AND public.aval_can_edit(id, 'evaluation.edit'))
  WITH CHECK (public.aval_is_reader(organization_id) AND public.aval_can_edit(id, 'evaluation.edit'));
CREATE TRIGGER aval_guard BEFORE UPDATE ON public.avaliacoes FOR EACH ROW EXECUTE FUNCTION public.aval_guard_avaliacoes();
CREATE TRIGGER aval_inv_report AFTER UPDATE ON public.avaliacoes FOR EACH ROW EXECUTE FUNCTION public.aval_trg_inv_avaliacao();

GRANT SELECT, UPDATE ON public.laudo_secoes TO authenticated;
GRANT ALL ON public.laudo_secoes TO service_role;
ALTER TABLE public.laudo_secoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY aval_select ON public.laudo_secoes FOR SELECT TO authenticated USING (public.aval_is_reader(organization_id));
CREATE POLICY aval_update ON public.laudo_secoes FOR UPDATE TO authenticated
  USING (public.aval_is_reader(organization_id) AND public.aval_can_edit(avaliacao_id, 'report.edit'))
  WITH CHECK (public.aval_is_reader(organization_id) AND public.aval_can_edit(avaliacao_id, 'report.edit'));
CREATE TRIGGER aval_set_org BEFORE INSERT OR UPDATE ON public.laudo_secoes FOR EACH ROW EXECUTE FUNCTION public.aval_set_org();
CREATE TRIGGER aval_guard BEFORE INSERT OR UPDATE OR DELETE ON public.laudo_secoes FOR EACH ROW EXECUTE FUNCTION public.aval_guard_laudo_secoes();
CREATE TRIGGER aval_history AFTER UPDATE ON public.laudo_secoes FOR EACH ROW EXECUTE FUNCTION public.aval_laudo_secao_history();

GRANT SELECT, INSERT, UPDATE ON public.atributos_imobiliarios TO authenticated;
GRANT ALL ON public.atributos_imobiliarios TO service_role;
ALTER TABLE public.atributos_imobiliarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY aval_select ON public.atributos_imobiliarios FOR SELECT TO authenticated USING (organization_id IS NULL OR public.aval_is_reader(organization_id));
CREATE POLICY aval_insert ON public.atributos_imobiliarios FOR INSERT TO authenticated
  WITH CHECK (organization_id IS NOT NULL AND public.aval_is_reader(organization_id) AND public.aval_is_technical(auth.uid()));
CREATE POLICY aval_update ON public.atributos_imobiliarios FOR UPDATE TO authenticated
  USING (organization_id IS NOT NULL AND public.aval_is_reader(organization_id) AND public.aval_is_technical(auth.uid()))
  WITH CHECK (organization_id IS NOT NULL AND public.aval_is_reader(organization_id) AND public.aval_is_technical(auth.uid()));
CREATE TRIGGER aval_set_org BEFORE INSERT OR UPDATE ON public.atributos_imobiliarios FOR EACH ROW EXECUTE FUNCTION public.aval_set_org();

CREATE TRIGGER aval_guard BEFORE INSERT OR UPDATE OR DELETE ON public.avaliacao_conjunto_amostras FOR EACH ROW EXECUTE FUNCTION public.aval_guard_conjunto_amostras();
CREATE TRIGGER aval_guard BEFORE UPDATE OR DELETE ON public.avaliacao_modelos FOR EACH ROW EXECUTE FUNCTION public.aval_guard_modelos();
CREATE TRIGGER aval_guard BEFORE INSERT OR UPDATE OR DELETE ON public.avaliacao_modelo_variaveis FOR EACH ROW EXECUTE FUNCTION public.aval_guard_modelo_variaveis();
CREATE TRIGGER aval_history AFTER UPDATE ON public.dados_mercado FOR EACH ROW EXECUTE FUNCTION public.aval_dados_mercado_history();
CREATE TRIGGER aval_normalizado BEFORE INSERT OR UPDATE ON public.imoveis FOR EACH ROW EXECUTE FUNCTION public.aval_imovel_set_normalizado();
CREATE TRIGGER aval_inv AFTER INSERT OR UPDATE OR DELETE ON public.avaliacao_valores_administrativos FOR EACH ROW EXECUTE FUNCTION public.aval_trg_inv_valores_adm();
CREATE TRIGGER aval_inv AFTER INSERT OR UPDATE OR DELETE ON public.avaliacao_variavel_valores FOR EACH ROW EXECUTE FUNCTION public.aval_trg_inv_variavel_valores();
CREATE TRIGGER aval_inv AFTER UPDATE ON public.avaliacao_variaveis FOR EACH ROW EXECUTE FUNCTION public.aval_trg_inv_variaveis();
CREATE TRIGGER aval_inv AFTER UPDATE ON public.fonte_mercado_contatos FOR EACH ROW EXECUTE FUNCTION public.aval_trg_inv_fonte_contato();

DO $$
DECLARE f record;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS sig, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname LIKE 'aval\_%' LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f.sig);
    IF f.proname IN ('aval_is_reader','aval_is_technical','aval_has_global_perm','aval_has_perm','aval_can_edit','aval_my_perms','aval_list_tecnicos',
        'aval_is_privileged','aval_hash','aval_fmt_num','aval_fmt_money','aval_normalize_text',
        'aval_create','aval_set_member','aval_cancel','aval_dataset_prepare','aval_dataset_freeze','aval_keep_snapshot',
        'aval_model_create','aval_model_flag','aval_send_to_validation','aval_manual_review','aval_accept_model','aval_confirm_economic',
        'aval_tokens','aval_laudo_init','aval_laudo_section_approve','aval_laudo_section_refresh','aval_laudo_preflight','aval_laudo_issue',
        'aval_laudo_create_revision','aval_ai_decide','aval_evaluate_change_impact','aval_apply_change','aval_pendencias','aval_find_duplicates',
        'aval_variable_in_use') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f.sig);
    ELSE
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f.sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
    END IF;
  END LOOP;
END $$;