-- Critério 12 (Outliers): política v3, decisão do avaliador por amostra (histórico), exclusão via novo modelo, aceite exige revalidar.
BEGIN;
\ir _fixture.sql
\set payload `cat "$AVAL_PAYLOAD"`
CREATE TEMP TABLE k(nome text PRIMARY KEY, id uuid);
GRANT SELECT, INSERT, UPDATE ON k TO authenticated, service_role;
CREATE FUNCTION pg_temp.k(n text) RETURNS uuid LANGUAGE sql AS $$ SELECT id FROM k WHERE nome = n $$;
GRANT EXECUTE ON FUNCTION pg_temp.k(text) TO authenticated, service_role;
CREATE FUNCTION pg_temp.validar(status text, crit jsonb) RETURNS uuid LANGUAGE sql AS $$
  SELECT public.aval_engine_persist_validation(jsonb_build_object('politica', 'SIDIF_V1 v3',
    'validacao', jsonb_build_object('organization_id', '0a000000-0000-0000-0000-00000000000a', 'avaliacao_id', (SELECT av FROM fx), 'modelo_id', pg_temp.k('mod'),
      'execucao_id', pg_temp.k('ex'), 'created_by', 'a1000000-0000-0000-0000-000000000001',
      'policy_id', (SELECT id FROM public.validation_policies WHERE codigo = 'SIDIF_V1' AND versao = 3), 'overall_status', status,
      'fundamentacao_grau', 'II', 'precisao_grau', 'III', 'amplitude_pct', 20, 'resumo_json', '{}'::jsonb),
    'resultados', jsonb_build_array(crit))) $$;
GRANT EXECUTE ON FUNCTION pg_temp.validar(text, jsonb) TO service_role;
-- Resultado do critério como gravado pelo motor: amostra 01 forte indício, amostra 02 indício moderado.
CREATE TEMP TABLE crit AS SELECT jsonb_build_object('codigo', 'OUTLIERS', 'numero', 12, 'nome', 'Outliers', 'origem', 'NORMA_TECNICA', 'modo', 'ASSISTIDO',
  'status', 'REQUER_ANALISE', 'grau', NULL, 'valor', 3.27, 'detalhe', 'Forte indício de outlier', 'revisado', false, 'bloqueante', false,
  'dados', jsonb_build_object('nivel', 'FORTE', 'metrica', 'RESIDUO_DP', 'n', 8,
    'politica', jsonb_build_object('limite_moderado', 2, 'limite_forte', 3, 'justificativa_manter', 'FORTE'),
    'suspeitas', jsonb_build_array(
      jsonb_build_object('amostra_id', 'f0000000-0000-0000-0000-000000000001', 'ordem', 1, 'nivel', 'FORTE', 'residuo_dp', 3.27, 'studentizado_externo', 4.1, 'p_valor', 0.001, 'cook', 0.4, 'leverage', 0.2),
      jsonb_build_object('amostra_id', 'f0000000-0000-0000-0000-000000000002', 'ordem', 2, 'nivel', 'MODERADO', 'residuo_dp', 2.41, 'studentizado_externo', 2.9, 'p_valor', 0.03, 'cook', 0.12, 'leverage', 0.1)))) AS c;
GRANT SELECT ON crit TO service_role, authenticated;

-- Política versionada
SELECT pg_temp.ok((SELECT status FROM public.validation_policies WHERE codigo = 'SIDIF_V1' AND versao = 3 AND organization_id IS NULL) = 'VIGENTE'
  AND (SELECT status FROM public.validation_policies WHERE codigo = 'SIDIF_V1' AND versao = 2 AND organization_id IS NULL) = 'SUPERADA', 'SIDIF_V1 v3 vigente; v2 preservada como superada');
SELECT pg_temp.ok((SELECT thresholds @> '{"metrica":"RESIDUO_DP","limite_moderado":2,"limite_forte":3,"alpha":0.05,"p_moderado":false,"bonferroni":true,"justificativa_manter":"FORTE","origem":"PROCEDIMENTO_INTERNO"}'::jsonb
    AND modo = 'ASSISTIDO' AND NOT bloqueante
  FROM public.validation_policy_rules WHERE codigo = 'OUTLIERS' AND policy_id = (SELECT id FROM public.validation_policies WHERE codigo = 'SIDIF_V1' AND versao = 3)),
  'v3: limites de outliers 2/3, Bonferroni, justificativa no forte indício, não bloqueante');
SELECT pg_temp.ok((SELECT count(*) FROM public.validation_policy_rules WHERE policy_id = (SELECT id FROM public.validation_policies WHERE codigo = 'SIDIF_V1' AND versao = 3))
  = (SELECT count(*) FROM public.validation_policy_rules WHERE policy_id = (SELECT id FROM public.validation_policies WHERE codigo = 'SIDIF_V1' AND versao = 2)), 'v3 copia todos os critérios da v2');
SELECT pg_temp.ok((SELECT thresholds FROM public.validation_policy_rules WHERE codigo = 'OUTLIERS' AND policy_id = (SELECT id FROM public.validation_policies WHERE codigo = 'SIDIF_V1' AND versao = 2)) = '{}'::jsonb,
  'v2 não é alterada');

SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
INSERT INTO k SELECT 'mod', public.aval_model_create((SELECT av FROM fx), '10000000-0000-0000-0000-000000000001', 'Modelo 1', 'c0000000-0000-0000-0000-000000000001', 'LN', NULL,
  '[{"variavel_id":"c0000000-0000-0000-0000-000000000002","transformacao":"INVERSE"}]');
SELECT pg_temp.login(NULL);
SET LOCAL ROLE service_role;
INSERT INTO k SELECT 'ex', public.aval_engine_persist_run(replace(replace(replace(replace(replace(:'payload', '__ORG__', '0a000000-0000-0000-0000-00000000000a'),
  '__AV__', (SELECT av FROM fx)::text), '__MOD__', pg_temp.k('mod')::text), '__USER__', 'a1000000-0000-0000-0000-000000000001'),
  '__POLICY__', (SELECT id::text FROM public.validation_policies WHERE codigo = 'SIDIF_V1' AND versao = 3))::jsonb);
RESET ROLE;
CREATE TEMP TABLE coef0 AS SELECT codigo, beta FROM public.modelo_coeficientes WHERE execucao_id = pg_temp.k('ex');
GRANT SELECT ON coef0 TO authenticated;
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT public.aval_send_to_validation(pg_temp.k('mod'));
SELECT pg_temp.login(NULL);
SET LOCAL ROLE service_role;
INSERT INTO k SELECT 'v1', pg_temp.validar('APTO_COM_RESSALVAS', (SELECT c FROM crit));
RESET ROLE;

-- Permissões e entradas
SELECT pg_temp.login('b1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$SELECT public.aval_outlier_decision(pg_temp.k('v1'), 'f0000000-0000-0000-0000-000000000002', 'MANTER', NULL)$$, 'permission_denied', 'outra organização não registra decisão');
SELECT pg_temp.login('a5000000-0000-0000-0000-000000000005');
SELECT pg_temp.throws($$SELECT public.aval_outlier_decision(pg_temp.k('v1'), 'f0000000-0000-0000-0000-000000000002', 'MANTER', NULL)$$, 'permission_denied', 'usuário sem papel técnico não registra decisão');
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$SELECT public.aval_outlier_decision(pg_temp.k('v1'), 'f0000000-0000-0000-0000-000000000002', 'APAGAR', NULL)$$, 'invalid_decision', 'decisão fora da lista é recusada');
SELECT pg_temp.throws($$SELECT public.aval_outlier_decision(pg_temp.k('v1'), 'f0000000-0000-0000-0000-000000000003', 'MANTER', NULL)$$, 'outlier_not_flagged', 'amostra não sinalizada não recebe decisão');
SELECT pg_temp.throws($$SELECT public.aval_outlier_decision(pg_temp.k('v1'), 'f0000000-0000-0000-0000-000000000001', 'MANTER', ' curto ')$$, 'justification_required', 'manter amostra com forte indício exige justificativa');
SELECT pg_temp.throws($$SELECT public.aval_outlier_decision(pg_temp.k('v1'), 'f0000000-0000-0000-0000-000000000002', 'EXCLUIR', NULL)$$, 'justification_required', 'excluir sempre exige justificativa');

-- Manter (indício moderado: justificativa opcional)
SELECT pg_temp.ok((public.aval_outlier_decision(pg_temp.k('v1'), 'f0000000-0000-0000-0000-000000000002', 'MANTER', NULL)->>'modelo_novo') IS NULL, 'manter não cria modelo');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.audit_events WHERE entity_type = 'modelo' AND entity_id = pg_temp.k('mod') AND event_type = 'OUTLIER_DECISION'
    AND actor_id = 'a1000000-0000-0000-0000-000000000001' AND details_json->>'decisao' = 'MANTER' AND details_json->>'amostra_id' = 'f0000000-0000-0000-0000-000000000002'
    AND (details_json->>'ordem')::int = 2 AND details_json->>'nivel' = 'MODERADO' AND (details_json->'indicadores'->>'residuo_dp')::numeric = 2.41
    AND (details_json->'indicadores'->>'cook')::numeric = 0.12 AND details_json->>'validacao' = pg_temp.k('v1')::text AND details_json->>'execucao' = pg_temp.k('ex')::text
    AND (details_json->>'validacao_numero')::int = 1 AND details_json->>'modelo_nome' = 'Modelo 1' AND details_json ? 'engine_version' AND details_json->>'politica' = 'SIDIF_V1 v3'),
  'histórico registra usuário, data, amostra, indicadores, decisão, modelo, validação, política e versão do motor');

-- Excluir: novo modelo derivado sem a amostra; o modelo validado não muda
CREATE TEMP TABLE r_exc AS SELECT public.aval_outlier_decision(pg_temp.k('v1'), 'f0000000-0000-0000-0000-000000000001', 'EXCLUIR', 'Área informada no anúncio diverge da matrícula') AS r;
GRANT SELECT ON r_exc TO authenticated;
SELECT pg_temp.ok((SELECT r->>'modelo_novo' FROM r_exc) IS NOT NULL AND (SELECT r->>'erro_modelo' FROM r_exc) IS NULL, 'excluir cria novo modelo');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.avaliacao_modelos WHERE id = (SELECT (r->>'modelo_novo')::uuid FROM r_exc) AND modelo_origem_id = pg_temp.k('mod')
    AND amostras_excluidas = ARRAY['f0000000-0000-0000-0000-000000000001'::uuid] AND conjunto_id = '10000000-0000-0000-0000-000000000001'
    AND nome = 'Modelo 1 sem amostra 01'), 'novo modelo: mesmo conjunto e variáveis, amostra excluída, origem rastreada');
SELECT pg_temp.ok((SELECT count(*) FROM public.avaliacao_modelo_variaveis WHERE modelo_id = (SELECT (r->>'modelo_novo')::uuid FROM r_exc) AND transformacao = 'INVERSE') = 1, 'novo modelo copia as variáveis e transformações');
SELECT pg_temp.ok((SELECT status = 'EM_VALIDACAO' AND amostras_excluidas = '{}'::uuid[] FROM public.avaliacao_modelos WHERE id = pg_temp.k('mod'))
  AND NOT EXISTS (SELECT 1 FROM public.modelo_coeficientes c FULL JOIN coef0 o ON o.codigo = c.codigo AND c.execucao_id = pg_temp.k('ex') WHERE c.beta IS DISTINCT FROM o.beta)
  AND (SELECT count(*) FROM public.avaliacao_modelo_execucoes WHERE modelo_id = pg_temp.k('mod')) = 1, 'modelo validado, execução e coeficientes ficam intactos');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.audit_events WHERE entity_id = pg_temp.k('mod') AND event_type = 'OUTLIER_DECISION' AND details_json->>'decisao' = 'EXCLUIR'
  AND details_json->>'justificativa' = 'Área informada no anúncio diverge da matrícula' AND details_json->>'modelo_derivado' = (SELECT r->>'modelo_novo' FROM r_exc)), 'exclusão registrada com justificativa e novo modelo');
-- Repetir a exclusão reaproveita o modelo idêntico (sem duplicar)
SELECT pg_temp.ok((public.aval_outlier_decision(pg_temp.k('v1'), 'f0000000-0000-0000-0000-000000000001', 'EXCLUIR', 'Reconfirmada a divergência de área')->>'modelo_novo')
  = (SELECT r->>'modelo_novo' FROM r_exc), 'nova exclusão da mesma amostra reutiliza o modelo existente');
-- Mudança de decisão entra no histórico sem apagar a anterior
SELECT public.aval_outlier_decision(pg_temp.k('v1'), 'f0000000-0000-0000-0000-000000000001', 'MANTER', 'Após vistoria, área confirmada; imóvel representativo');
SELECT pg_temp.ok((SELECT count(*) FROM public.audit_events WHERE entity_id = pg_temp.k('mod') AND event_type = 'OUTLIER_DECISION') = 4, 'todas as decisões permanecem no histórico');

-- Aceite exige validar novamente após decisões
SELECT pg_temp.throws($$SELECT public.aval_accept_model(pg_temp.k('v1'), 'Justificativa do aceite técnico')$$, 'validation_outdated_reviews', 'decisão posterior à validação exige nova validação');
SELECT pg_temp.login(NULL);
UPDATE public.model_validations SET created_at = created_at - interval '1 minute' WHERE id = pg_temp.k('v1');
UPDATE public.audit_events SET created_at = created_at - interval '30 seconds' WHERE entity_id = pg_temp.k('mod') AND event_type = 'OUTLIER_DECISION';
SET LOCAL ROLE service_role;
INSERT INTO k SELECT 'v2', pg_temp.validar('APTO_COM_RESSALVAS', (SELECT c || jsonb_build_object('status', 'ATENDE', 'revisado', true) FROM crit));
RESET ROLE;
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$SELECT public.aval_outlier_decision(pg_temp.k('v1'), 'f0000000-0000-0000-0000-000000000002', 'MANTER', NULL)$$, 'validation_not_latest', 'validação antiga não recebe decisão');
SELECT public.aval_accept_model(pg_temp.k('v2'), 'Amostras sinalizadas analisadas e mantidas');
SELECT pg_temp.ok((SELECT jsonb_array_length(dados->'decisoes_outliers') FROM public.validation_snapshots WHERE validation_id = pg_temp.k('v2')) = 4,
  'snapshot do aceite guarda as decisões sobre outliers');
ROLLBACK;
