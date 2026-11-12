-- Critério 1: análise visual dos gráficos de relacionamento (registro no histórico, permissões, política automática x assistida).
BEGIN;
\ir _fixture.sql
\set payload `cat "$AVAL_PAYLOAD"`
CREATE TEMP TABLE k(nome text PRIMARY KEY, id uuid);
GRANT SELECT, INSERT, UPDATE ON k TO authenticated, service_role;
CREATE FUNCTION pg_temp.k(n text) RETURNS uuid LANGUAGE sql AS $$ SELECT id FROM k WHERE nome = n $$;
GRANT EXECUTE ON FUNCTION pg_temp.k(text) TO authenticated, service_role;
CREATE FUNCTION pg_temp.validar(status text) RETURNS uuid LANGUAGE sql AS $$
  SELECT public.aval_engine_persist_validation(jsonb_build_object('politica', 'SIDIF_V1 v2',
    'validacao', jsonb_build_object('organization_id', '0a000000-0000-0000-0000-00000000000a', 'avaliacao_id', (SELECT av FROM fx), 'modelo_id', pg_temp.k('mod'),
      'execucao_id', pg_temp.k('ex'), 'created_by', 'a1000000-0000-0000-0000-000000000001',
      'policy_id', (SELECT id FROM public.validation_policies WHERE codigo = 'SIDIF_V1' AND versao = 2), 'overall_status', status,
      'fundamentacao_grau', 'II', 'precisao_grau', 'III', 'amplitude_pct', 20, 'resumo_json', '{}'::jsonb),
    'resultados', '[]'::jsonb)) $$;
GRANT EXECUTE ON FUNCTION pg_temp.validar(text) TO service_role;

SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
INSERT INTO k SELECT 'mod', public.aval_model_create((SELECT av FROM fx), '10000000-0000-0000-0000-000000000001', 'Modelo 1', 'c0000000-0000-0000-0000-000000000001', 'LN', NULL,
  '[{"variavel_id":"c0000000-0000-0000-0000-000000000002","transformacao":"INVERSE"}]');
SELECT pg_temp.login(NULL);
SET LOCAL ROLE service_role;
INSERT INTO k SELECT 'ex', public.aval_engine_persist_run(replace(replace(replace(replace(replace(:'payload', '__ORG__', '0a000000-0000-0000-0000-00000000000a'),
  '__AV__', (SELECT av FROM fx)::text), '__MOD__', pg_temp.k('mod')::text), '__USER__', 'a1000000-0000-0000-0000-000000000001'),
  '__POLICY__', (SELECT id::text FROM public.validation_policies WHERE codigo = 'SIDIF_V1' AND versao = 2))::jsonb);
RESET ROLE;
CREATE TEMP TABLE coef0 AS SELECT codigo, beta FROM public.modelo_coeficientes WHERE execucao_id = pg_temp.k('ex');
GRANT SELECT ON coef0 TO authenticated;
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT public.aval_send_to_validation(pg_temp.k('mod'));
SELECT pg_temp.login(NULL);
SET LOCAL ROLE service_role;
INSERT INTO k SELECT 'v1', pg_temp.validar('APTO');
RESET ROLE;

-- Permissões e entradas
SELECT pg_temp.login('b1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$SELECT public.aval_relationship_visual_review(pg_temp.k('v1'), 'COERENTE', NULL)$$, 'permission_denied', 'outra organização não registra análise visual');
SELECT pg_temp.login('a5000000-0000-0000-0000-000000000005');
SELECT pg_temp.throws($$SELECT public.aval_relationship_visual_review(pg_temp.k('v1'), 'COERENTE', NULL)$$, 'permission_denied', 'usuário sem papel técnico não registra análise visual');
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$SELECT public.aval_relationship_visual_review(pg_temp.k('v1'), 'TALVEZ', NULL)$$, 'invalid_conclusion', 'conclusão fora da lista é recusada');

-- Política automática: fica como evidência técnica no histórico, sem gerar análise manual nem exigir revalidação
SELECT pg_temp.ok((public.aval_relationship_visual_review(pg_temp.k('v1'), 'COERENTE', '  Curvas crescentes para área e banheiros  ')->>'incorpora_validacao')::boolean = false,
  'política automática: análise visual não altera o critério');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.audit_events WHERE entity_id = pg_temp.k('mod') AND event_type = 'RELATIONSHIP_VISUAL_ANALYSIS'
    AND actor_id = 'a1000000-0000-0000-0000-000000000001' AND details_json->>'conclusao' = 'COERENTE'
    AND details_json->>'observacao' = 'Curvas crescentes para área e banheiros' AND details_json->>'validacao' = pg_temp.k('v1')::text
    AND details_json->>'execucao' = pg_temp.k('ex')::text AND (details_json->>'validacao_numero')::int = 1
    AND details_json->>'modelo_nome' = 'Modelo 1' AND details_json ? 'engine_version' AND details_json->>'modo_politica' = 'AUTOMATICO'),
  'histórico registra usuário, data, conclusão, observação, modelo, validação e versão do motor');
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.validation_manual_reviews WHERE modelo_id = pg_temp.k('mod')), 'nenhuma análise manual criada em política automática');
SELECT public.aval_relationship_visual_review(pg_temp.k('v1'), 'REVISAR', NULL);
SELECT pg_temp.ok((SELECT count(*) FROM public.audit_events WHERE entity_id = pg_temp.k('mod') AND event_type = 'RELATIONSHIP_VISUAL_ANALYSIS') = 2
  AND EXISTS (SELECT 1 FROM public.audit_events WHERE entity_id = pg_temp.k('mod') AND event_type = 'RELATIONSHIP_VISUAL_ANALYSIS'
              AND details_json->>'conclusao' = 'REVISAR' AND details_json->'observacao' = 'null'::jsonb),
  'nova análise (marcar para revisão, sem observação) entra no histórico sem apagar a anterior');
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.modelo_coeficientes c FULL JOIN coef0 o ON o.codigo = c.codigo AND c.execucao_id = pg_temp.k('ex') WHERE c.beta IS DISTINCT FROM o.beta)
  AND (SELECT count(*) FROM public.avaliacao_modelo_execucoes) = 1, 'análise visual não recalcula nem altera coeficientes');

-- Somente a validação mais recente
SELECT pg_temp.login(NULL);
SET LOCAL ROLE service_role;
INSERT INTO k SELECT 'v2', pg_temp.validar('APTO');
RESET ROLE;
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$SELECT public.aval_relationship_visual_review(pg_temp.k('v1'), 'COERENTE', NULL)$$, 'validation_not_latest', 'validação antiga não recebe nova análise');

-- Política que trata o critério como assistido: a confirmação vira análise do profissional para a próxima validação
SELECT pg_temp.login(NULL);
UPDATE public.validation_policy_rules SET modo = 'ASSISTIDO' WHERE codigo = 'RELACIONAMENTO' AND policy_id = (SELECT id FROM public.validation_policies WHERE codigo = 'SIDIF_V1' AND versao = 2);
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((public.aval_relationship_visual_review(pg_temp.k('v2'), 'COERENTE', NULL)->>'incorpora_validacao')::boolean, 'política assistida: registro entra na validação');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.validation_manual_reviews WHERE modelo_id = pg_temp.k('mod') AND codigo = 'RELACIONAMENTO' AND decisao = 'ATENDE'
  AND length(justificativa) >= 10), 'confirmar coerência gera análise do profissional "atende" com justificativa padrão');
SELECT pg_temp.throws($$SELECT public.aval_accept_model(pg_temp.k('v2'), NULL)$$, 'validation_outdated_reviews', 'aceite exige validar novamente para incorporar a análise');

-- Fora da validação não registra
SELECT public.aval_model_withdraw_validation(pg_temp.k('mod'), NULL);
SELECT pg_temp.throws($$SELECT public.aval_relationship_visual_review(pg_temp.k('v2'), 'COERENTE', NULL)$$, 'model_not_in_validation', 'modelo retirado da validação não recebe análise');
ROLLBACK;
