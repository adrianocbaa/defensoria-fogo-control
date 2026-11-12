-- Rodadas de geração, deduplicação por assinatura, arquivamento sem exclusão, listagem paginada e seleção humana para validação.
BEGIN;
\ir _fixture.sql
\set payload `cat "$AVAL_PAYLOAD"`
CREATE TEMP TABLE c3 AS SELECT '[{"dep_transf":"DIRECT","vars":[{"variavel_id":"c0000000-0000-0000-0000-000000000002","transformacao":"DIRECT"}]},
 {"dep_transf":"DIRECT","vars":[{"variavel_id":"c0000000-0000-0000-0000-000000000002","transformacao":"LN"}]},
 {"dep_transf":"LN","vars":[{"variavel_id":"c0000000-0000-0000-0000-000000000002","transformacao":"DIRECT"}]}]'::jsonb AS j;
CREATE TEMP TABLE r(k text, j jsonb); CREATE TEMP TABLE pl(mod uuid, j jsonb);
GRANT SELECT ON c3 TO authenticated; GRANT SELECT, INSERT ON r TO authenticated, service_role; GRANT SELECT ON pl TO authenticated, service_role;
-- Segundo conjunto congelado (mesmas amostras): a mesma equação nele é outro modelo.
INSERT INTO public.avaliacao_conjuntos_dados(id, avaliacao_id, versao, status) SELECT '10000000-0000-0000-0000-000000000002', av, 2, 'CONGELADO' FROM fx;
INSERT INTO public.avaliacao_amostra_snapshots(avaliacao_id, conjunto_id, amostra_id, dado_id, imovel_id, dados, hash)
SELECT avaliacao_id, '10000000-0000-0000-0000-000000000002', amostra_id, dado_id, imovel_id, dados, hash FROM public.avaliacao_amostra_snapshots
 WHERE conjunto_id = '10000000-0000-0000-0000-000000000001';

SELECT pg_temp.login('a2000000-0000-0000-0000-000000000002');
INSERT INTO r SELECT 'g1', public.aval_model_generate_round((SELECT av FROM fx), '10000000-0000-0000-0000-000000000001', 'ASSISTIDO', (SELECT j FROM c3), true,
  '{"dep_transformacoes":["DIRECT","LN"]}', 3);
SELECT pg_temp.ok((SELECT (j->>'numero')::int FROM r WHERE k = 'g1') = 1 AND (SELECT jsonb_array_length(j->'criados') FROM r WHERE k = 'g1') = 3
  AND (SELECT jsonb_array_length(j->'a_calcular') FROM r WHERE k = 'g1') = 3, 'nova geração cria a rodada 1 com 3 modelos a calcular');
SELECT pg_temp.ok((SELECT modo || '/' || qtd_estimada || '/' || qtd_criada || '/' || (parametros->'dep_transformacoes'->>1) FROM public.avaliacao_model_generation_runs WHERE numero = 1) = 'ASSISTIDO/3/3/LN',
  'rodada registra modo, quantidade estimada, criada e parâmetros usados');
SELECT pg_temp.ok((SELECT count(*) FROM public.avaliacao_modelos WHERE status = 'EM_VALIDACAO' OR candidato) = 0
  AND (SELECT bool_and(status = 'RASCUNHO') FROM public.avaliacao_modelos), 'geração não envia nada à validação nem marca candidatos');

INSERT INTO r SELECT 'g2', public.aval_model_generate_round((SELECT av FROM fx), '10000000-0000-0000-0000-000000000001', 'AMPLA', (SELECT j || jsonb_build_array(j->0) FROM c3), true, '{}', 4);
SELECT pg_temp.ok((SELECT (j->>'numero')::int FROM r WHERE k = 'g2') = 2 AND (SELECT jsonb_array_length(j->'criados') FROM r WHERE k = 'g2') = 0
  AND (SELECT (j->>'ignorados_duplicidade')::int FROM r WHERE k = 'g2') = 4 AND (SELECT (j->>'repetidos_na_lista')::int FROM r WHERE k = 'g2') = 1
  AND (SELECT count(*) FROM public.avaliacao_modelos) = 3, 'mesma assinatura no mesmo conjunto não duplica: nova rodada referencia os 3 existentes e conta 4 ignorados');
SELECT pg_temp.ok((SELECT count(*) FROM public.avaliacao_model_run_modelos rm JOIN public.avaliacao_model_generation_runs g ON g.id = rm.run_id WHERE g.numero = 2 AND rm.situacao = 'JA_EXISTENTE') = 3
  AND (SELECT qtd_existente FROM public.avaliacao_model_generation_runs WHERE numero = 2) = 4, 'modelos já existentes aparecem na rodada 2 como "já existente"');

INSERT INTO r SELECT 'g3', public.aval_model_generate_round((SELECT av FROM fx), '10000000-0000-0000-0000-000000000002', 'ASSISTIDO', (SELECT j FROM c3), true, '{}', 3);
SELECT pg_temp.ok((SELECT jsonb_array_length(j->'criados') FROM r WHERE k = 'g3') = 3 AND (SELECT count(*) FROM public.avaliacao_modelos) = 6,
  'mesma equação em outro conjunto é permitida (dataset diferente)');
SELECT pg_temp.ok((SELECT count(DISTINCT assinatura) FROM public.avaliacao_modelos) = 6 AND (SELECT count(*) FROM public.avaliacao_modelos WHERE assinatura IS NULL) = 0,
  'assinatura canônica inclui o conjunto');

SELECT pg_temp.ok(public.aval_model_create((SELECT av FROM fx), '10000000-0000-0000-0000-000000000002', 'Manual', 'c0000000-0000-0000-0000-000000000001', 'DIRECT', NULL,
  '[{"variavel_id":"c0000000-0000-0000-0000-000000000002","transformacao":"DIRECT"}]') = (SELECT (j->'criados'->>0)::uuid FROM r WHERE k = 'g3')
  AND (SELECT count(*) FROM public.avaliacao_modelos) = 6, 'modelo manual idêntico devolve o existente (sem duplicar)');
INSERT INTO r SELECT 'm2', to_jsonb(public.aval_model_create((SELECT av FROM fx), '10000000-0000-0000-0000-000000000002', 'Manual 2', 'c0000000-0000-0000-0000-000000000001', 'INVERSE', NULL,
  '[{"variavel_id":"c0000000-0000-0000-0000-000000000002","transformacao":"SQRT"}]'));
SELECT pg_temp.ok((SELECT j FROM r WHERE k = 'm2') IS NOT NULL
  AND (SELECT count(*) FROM public.avaliacao_model_run_modelos rm JOIN public.avaliacao_model_generation_runs g ON g.id = rm.run_id WHERE g.numero = 3) = 4,
  'modelo manual novo entra na rodada vigente do mesmo conjunto');

-- Cálculo (gravado pelo motor) atualiza os contadores das rodadas
SELECT pg_temp.login(NULL);
INSERT INTO pl SELECT x.id, replace(replace(replace(replace(replace(:'payload', '__ORG__', '0a000000-0000-0000-0000-00000000000a'), '__AV__', (SELECT av FROM fx)::text),
  '__MOD__', x.id::text), '__USER__', 'a1000000-0000-0000-0000-000000000001'),
  '__POLICY__', (SELECT id::text FROM public.validation_policies WHERE codigo = 'SIDIF_V1' AND versao = 2))::jsonb
  FROM (SELECT (j->'criados'->>0)::uuid AS id FROM r WHERE k = 'g1' UNION ALL SELECT (j->'criados'->>1)::uuid FROM r WHERE k = 'g1') x;
SET LOCAL ROLE service_role;
SELECT public.aval_engine_persist_run(j) FROM pl;
UPDATE public.avaliacao_modelos SET status = 'ERRO' WHERE id = (SELECT (j->'criados'->>2)::uuid FROM r WHERE k = 'g1');
RESET ROLE;
SELECT pg_temp.ok((SELECT qtd_calculada || '/' || qtd_erro FROM public.avaliacao_model_generation_runs WHERE numero = 1) = '2/1'
  AND (SELECT qtd_calculada || '/' || qtd_erro FROM public.avaliacao_model_generation_runs WHERE numero = 2) = '2/1', 'contadores calculados/erro acompanham o motor nas duas rodadas');

-- Seleção humana: somente o escolhido vai à validação
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT public.aval_send_to_validation((SELECT (j->'criados'->>0)::uuid FROM r WHERE k = 'g1'));
SELECT pg_temp.ok((SELECT status FROM public.avaliacao_modelos WHERE id = (SELECT (j->'criados'->>0)::uuid FROM r WHERE k = 'g1')) = 'EM_VALIDACAO'
  AND (SELECT status FROM public.avaliacao_modelos WHERE id = (SELECT (j->'criados'->>1)::uuid FROM r WHERE k = 'g1')) = 'CALCULADO'
  AND (SELECT count(*) FROM public.avaliacao_modelos WHERE status = 'EM_VALIDACAO') = 1, 'seleção humana envia somente o modelo escolhido');

-- Listagem paginada e dados da triagem
INSERT INTO r SELECT 'l1', public.aval_model_list((SELECT av FROM fx), (SELECT id FROM public.avaliacao_model_generation_runs WHERE numero = 1), '{"status":"CALCULADO"}', 'r2_ajustado', true, 1, 0);
SELECT pg_temp.ok((SELECT (j->>'total')::int FROM r WHERE k = 'l1') = 2 AND (SELECT jsonb_array_length(j->'rows') FROM r WHERE k = 'l1') = 1
  AND (SELECT j->'rows'->0->'resumo'->>'n' FROM r WHERE k = 'l1') IS NOT NULL, 'lista paginada (limite 1 de 2) com resumo da última execução');
INSERT INTO r SELECT 'l2', public.aval_model_list((SELECT av FROM fx), NULL, '{"status":"ERRO"}', 'x; drop table', false, 999, 0);
SELECT pg_temp.ok((SELECT (j->>'total')::int FROM r WHERE k = 'l2') = 1 AND (SELECT (j->>'limit')::int FROM r WHERE k = 'l2') = 200, 'ordenação fora da lista e limite exagerado são normalizados');
INSERT INTO r SELECT 't1', public.aval_model_triagem_dados((SELECT av FROM fx), NULL, NULL);
SELECT pg_temp.ok((SELECT jsonb_array_length(j->'modelos') FROM r WHERE k = 't1') = 1
  AND (SELECT j->'politica'->'sig_modelo'->0->>'max' FROM r WHERE k = 't1') = '0.01'
  AND (SELECT jsonb_array_length(j->'modelos'->0->'variaveis') FROM r WHERE k = 't1') = 1
  AND (SELECT j->'modelos'->0->'variaveis'->0->>'beta' FROM r WHERE k = 't1') IS NOT NULL,
  'triagem considera só calculados não enviados/arquivados, com limites da política e coeficientes');

-- Arquivamento: nunca exclui; protege modelo enviado à validação; preserva modelos de outra rodada ativa
INSERT INTO r SELECT 'a1', public.aval_model_run_archive((SELECT id FROM public.avaliacao_model_generation_runs WHERE numero = 1), true);
SELECT pg_temp.ok((SELECT (j->>'alterados')::int FROM r WHERE k = 'a1') = 0 AND (SELECT (j->>'mantidos_outras_rodadas')::int FROM r WHERE k = 'a1') = 3
  AND (SELECT arquivada FROM public.avaliacao_model_generation_runs WHERE numero = 1), 'rodada 1 arquivada; modelos também presentes na rodada 2 ativa ficam visíveis');
INSERT INTO r SELECT 'a2', public.aval_model_run_archive((SELECT id FROM public.avaliacao_model_generation_runs WHERE numero = 2), true);
SELECT pg_temp.ok((SELECT (j->>'alterados')::int FROM r WHERE k = 'a2') = 2 AND (SELECT (j->>'protegidos')::int FROM r WHERE k = 'a2') = 1
  AND (SELECT count(*) FROM public.avaliacao_modelos) = 7 AND NOT (SELECT arquivado FROM public.avaliacao_modelos WHERE status = 'EM_VALIDACAO')
  AND (SELECT count(*) FROM public.modelo_snapshots) = 1 AND (SELECT count(*) FROM public.avaliacao_modelo_execucoes) = 2,
  'arquivar rodada não apaga modelos, execuções nem snapshots; o modelo em validação é protegido');
SELECT pg_temp.ok((SELECT count(*) FROM public.audit_events WHERE event_type IN ('MODEL_ROUND_ARCHIVED','MODELS_ARCHIVED')) >= 2, 'arquivamento registrado no histórico');
INSERT INTO r SELECT 'l3', public.aval_model_list((SELECT av FROM fx), NULL, '{}', 'numero', true, 50, 0);
INSERT INTO r SELECT 'l4', public.aval_model_list((SELECT av FROM fx), NULL, '{"arquivados":"SOMENTE"}', 'numero', true, 50, 0);
SELECT pg_temp.ok((SELECT (j->>'total')::int FROM r WHERE k = 'l3') = 5 AND (SELECT (j->>'total')::int FROM r WHERE k = 'l4') = 2, 'arquivados ocultos por padrão e visíveis no filtro "somente arquivados"');
SELECT pg_temp.ok((SELECT j->>'alterados' FROM (SELECT public.aval_model_archive((SELECT av FROM fx), NULL, NULL, true) AS j) x) = '4'
  AND (SELECT count(*) FROM public.avaliacao_modelos WHERE NOT arquivado) = 1, '"Limpar lista" arquiva todos os não protegidos, sem excluir');

SELECT pg_temp.login(NULL);
SELECT pg_temp.throws($$DELETE FROM public.avaliacao_modelos WHERE status = 'EM_VALIDACAO'$$, 'model_immutable', 'modelo validado/calculado não pode ser excluído');
SELECT pg_temp.login('a2000000-0000-0000-0000-000000000002');
INSERT INTO r SELECT 'g4', public.aval_model_generate_round((SELECT av FROM fx), '10000000-0000-0000-0000-000000000001', 'ASSISTIDO', (SELECT j FROM c3), true, '{}', 3);
SELECT pg_temp.ok((SELECT (j->>'numero')::int FROM r WHERE k = 'g4') = 4 AND (SELECT count(*) FROM public.avaliacao_modelos WHERE conjunto_id = '10000000-0000-0000-0000-000000000001' AND NOT arquivado) = 3,
  'nova rodada com candidatos já existentes os traz de volta à lista');

SELECT pg_temp.login('b1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$SELECT public.aval_model_archive((SELECT av FROM fx), NULL, NULL, true)$$, 'permission_denied', 'outra organização não arquiva');
SELECT pg_temp.throws($$SELECT public.aval_model_run_archive((SELECT id FROM public.avaliacao_model_generation_runs LIMIT 1), true)$$, 'permission_denied', 'outra organização não arquiva rodada');
SELECT pg_temp.ok((SELECT count(*) FROM public.avaliacao_model_generation_runs) = 0 AND (SELECT count(*) FROM public.avaliacao_model_run_modelos) = 0
  AND (SELECT jsonb_array_length(public.aval_model_runs((SELECT av FROM fx)))) = 0, 'rodadas de outra organização não são visíveis');
SELECT pg_temp.login('a3000000-0000-0000-0000-000000000003');
SELECT pg_temp.ok((SELECT jsonb_array_length(public.aval_model_runs((SELECT av FROM fx)))) = 4, 'leitor da organização vê as 4 rodadas');
ROLLBACK;
