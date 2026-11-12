-- Execução gravada atomicamente; tabelas derivadas = output_json; imutáveis; isoladas por organização.
BEGIN;
\ir _fixture.sql
\set payload `cat "$AVAL_PAYLOAD"`
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
CREATE TEMP TABLE m AS SELECT public.aval_model_create((SELECT av FROM fx), '10000000-0000-0000-0000-000000000001', 'Manual', 'c0000000-0000-0000-0000-000000000001', 'DIRECT', NULL,
  '[{"variavel_id":"c0000000-0000-0000-0000-000000000002","transformacao":"DIRECT"}]') AS id;
SELECT pg_temp.login(NULL);
GRANT SELECT ON m TO authenticated, service_role;
CREATE TEMP TABLE pl AS SELECT replace(replace(replace(replace(replace(:'payload', '__ORG__', '0a000000-0000-0000-0000-00000000000a'), '__AV__', (SELECT av FROM fx)::text),
  '__MOD__', (SELECT id FROM m)::text), '__USER__', 'a1000000-0000-0000-0000-000000000001'),
  '__POLICY__', (SELECT id::text FROM public.validation_policies WHERE codigo = 'SIDIF_V1' AND versao = 2))::jsonb AS j;
GRANT SELECT ON pl TO authenticated, service_role;

SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$SELECT public.aval_engine_persist_run((SELECT j FROM pl))$$, 'permission denied', 'cliente não grava execução diretamente');

SET LOCAL ROLE service_role;
CREATE TEMP TABLE ex AS SELECT public.aval_engine_persist_run((SELECT j FROM pl)) AS id;
RESET ROLE;
CREATE TEMP TABLE o AS SELECT output_json AS j FROM public.avaliacao_modelo_execucoes WHERE id = (SELECT id FROM ex);

SELECT pg_temp.ok((SELECT count(*) FROM public.modelo_residuos WHERE execucao_id = (SELECT id FROM ex)) = jsonb_array_length((SELECT j->'fit'->'sampleIds' FROM o))
  AND NOT EXISTS (SELECT 1 FROM public.modelo_residuos r, o WHERE r.execucao_id = (SELECT id FROM ex) AND (
      r.cook <> (o.j->'fit'->'cook'->>(r.ordem - 1))::numeric OR r.leverage <> (o.j->'fit'->'leverage'->>(r.ordem - 1))::numeric
   OR r.residuo <> (o.j->'fit'->'residuals'->>(r.ordem - 1))::numeric OR r.residuo_dp <> (o.j->'fit'->'residualsStd'->>(r.ordem - 1))::numeric
   OR r.estimado_original <> (o.j->'fit'->'estimatedOriginal'->>(r.ordem - 1))::numeric OR r.observado_original <> (o.j->'fit'->'yOriginal'->>(r.ordem - 1))::numeric
   OR r.estimado_transformado <> (o.j->'fit'->'yhat'->>(r.ordem - 1))::numeric OR r.amostra_id::text <> o.j->'fit'->'sampleIds'->>(r.ordem - 1))),
  'modelo_residuos = output_json (observado, estimado, resíduo, Resíduo/DP, leverage, Cook)');
SELECT pg_temp.ok((SELECT count(*) FROM public.modelo_anova WHERE execucao_id = (SELECT id FROM ex)) = 3
  AND NOT EXISTS (SELECT 1 FROM public.modelo_anova a, o WHERE a.execucao_id = (SELECT id FROM ex) AND (
    a.sq <> (o.j->'fit'->'anova'->(a.ordem - 1)->>'ss')::numeric OR a.gl <> (o.j->'fit'->'anova'->(a.ordem - 1)->>'df')::int
    OR a.mq <> (o.j->'fit'->'anova'->(a.ordem - 1)->>'ms')::numeric OR a.fonte <> o.j->'fit'->'anova'->(a.ordem - 1)->>'source'))
  AND (SELECT f FROM public.modelo_anova WHERE execucao_id = (SELECT id FROM ex) AND fonte = 'REGRESSAO') = (SELECT (j->'fit'->>'f')::numeric FROM o),
  'modelo_anova = output_json (SQ, gl, MQ, F)');
SELECT pg_temp.ok((SELECT count(*) FROM public.modelo_normalidade n, o WHERE n.execucao_id = (SELECT id FROM ex)
    AND n.observado = (SELECT (b->>'observed')::numeric FROM jsonb_array_elements(o.j->'fit'->'normality') b WHERE (b->>'z')::numeric = n.z)) = 3
  AND (SELECT count(*) FROM public.modelo_normalidade WHERE execucao_id = (SELECT id FROM ex) AND referencia IN (0.68, 0.9, 0.95)) = 3,
  'modelo_normalidade: 3 faixas (68/90/95) com observado = output_json');
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.modelo_estatisticas_variaveis s, o, LATERAL (SELECT v FROM jsonb_array_elements(o.j->'fit'->'variableStats') v WHERE v->>'code' = s.variavel) x
    WHERE s.execucao_id = (SELECT id FROM ex) AND (s.media <> (x.v->>'mean')::numeric OR s.desvio_padrao <> (x.v->>'stdDev')::numeric OR s.minimo <> (x.v->>'min')::numeric OR s.n <> (x.v->>'n')::int))
  AND (SELECT count(*) FROM public.modelo_estatisticas_variaveis WHERE execucao_id = (SELECT id FROM ex)) = jsonb_array_length((SELECT j->'fit'->'variableStats' FROM o)),
  'modelo_estatisticas_variaveis = output_json');
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.modelo_correlacoes c, o WHERE c.execucao_id = (SELECT id FROM ex) AND c.correlacao <>
    (o.j->'fit'->'correlation'->'matrix'->(SELECT i - 1 FROM jsonb_array_elements_text(o.j->'fit'->'correlation'->'codes') WITH ORDINALITY t(code, i) WHERE code = c.variavel_a)
       ->>(SELECT (i - 1)::int FROM jsonb_array_elements_text(o.j->'fit'->'correlation'->'codes') WITH ORDINALITY t(code, i) WHERE code = c.variavel_b))::numeric)
  AND (SELECT count(*) FROM public.modelo_correlacoes WHERE execucao_id = (SELECT id FROM ex)) = 6, 'modelo_correlacoes = matriz do output_json');
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.modelo_extrapolacoes e, o, LATERAL (SELECT v FROM jsonb_array_elements(o.j->'preliminary_projection'->'extrapolation') v WHERE v->>'code' = e.variavel) x
    WHERE e.execucao_id = (SELECT id FROM ex) AND (e.valor_avaliando <> (x.v->>'value')::numeric OR e.min_amostra <> (x.v->>'min')::numeric OR e.max_amostra <> (x.v->>'max')::numeric OR e.inside <> (x.v->>'inside')::boolean))
  AND (SELECT count(*) FROM public.modelo_extrapolacoes WHERE execucao_id = (SELECT id FROM ex)) = 3, 'modelo_extrapolacoes = output_json');
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.modelo_coeficientes c, o WHERE c.execucao_id = (SELECT id FROM ex) AND c.beta <> (o.j->'fit'->'coefficients'->c.ordem->>'beta')::numeric)
  AND (SELECT r2 FROM public.modelo_resultado_resumo WHERE execucao_id = (SELECT id FROM ex)) = (SELECT (j->'fit'->>'r2')::numeric FROM o)
  AND (SELECT status FROM public.avaliacao_modelos WHERE id = (SELECT id FROM m)) = 'CALCULADO', 'coeficientes, resumo e status do modelo gravados na mesma transação');

SELECT pg_temp.throws($$UPDATE public.modelo_residuos SET cook = 0 WHERE execucao_id = (SELECT id FROM ex)$$, 'imut|immutable|not allowed|bloque', 'resíduos imutáveis (UPDATE)');
SELECT pg_temp.throws($$DELETE FROM public.modelo_anova WHERE execucao_id = (SELECT id FROM ex)$$, 'imut|immutable|not allowed|bloque', 'ANOVA imutável (DELETE)');
SET LOCAL ROLE service_role;
SELECT pg_temp.throws($$UPDATE public.modelo_normalidade SET status = 'ATENDE'$$, 'imut|immutable|not allowed|bloque', 'imutável mesmo para service_role');
RESET ROLE;

SELECT pg_temp.login('a3000000-0000-0000-0000-000000000003');
SELECT pg_temp.ok((SELECT count(*) FROM public.modelo_residuos) = 24 AND (SELECT count(*) FROM public.modelo_anova) = 3, 'leitor da organização vê as tabelas derivadas');
SELECT pg_temp.throws($$INSERT INTO public.modelo_anova(avaliacao_id, execucao_id, modelo_id, ordem, fonte, sq, gl, mq) SELECT (SELECT av FROM fx), (SELECT id FROM ex), (SELECT id FROM m), 9, 'TOTAL', 1, 1, 1$$,
  'permission denied', 'cliente não grava tabelas derivadas');
SELECT pg_temp.login('b1000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT count(*) FROM public.modelo_residuos) + (SELECT count(*) FROM public.modelo_anova) + (SELECT count(*) FROM public.modelo_normalidade)
  + (SELECT count(*) FROM public.modelo_correlacoes) + (SELECT count(*) FROM public.modelo_estatisticas_variaveis) + (SELECT count(*) FROM public.modelo_extrapolacoes) = 0,
  'outra organização não vê nenhuma tabela derivada');
SELECT pg_temp.login('a5000000-0000-0000-0000-000000000005');
SELECT pg_temp.ok((SELECT count(*) FROM public.modelo_residuos) = 0, 'contratada não vê tabelas derivadas');
ROLLBACK;
