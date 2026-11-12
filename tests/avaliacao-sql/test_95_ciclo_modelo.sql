-- Ciclo de vida do modelo: enviar, retirar da validação, revalidar com configuração atual, arquivar, histórico preservado.
BEGIN;
\ir _fixture.sql
\set payload `cat "$AVAL_PAYLOAD"`
CREATE TEMP TABLE k(nome text PRIMARY KEY, id uuid);
GRANT SELECT, INSERT, UPDATE ON k TO authenticated, service_role;
CREATE FUNCTION pg_temp.k(n text) RETURNS uuid LANGUAGE sql AS $$ SELECT id FROM k WHERE nome = n $$;
GRANT EXECUTE ON FUNCTION pg_temp.k(text) TO authenticated, service_role;
-- Validação mínima gravada como o motor faz (somente service_role).
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
SELECT pg_temp.ok((SELECT status FROM public.avaliacao_modelos WHERE id = pg_temp.k('mod')) = 'CALCULADO', 'modelo calculado');

-- 1) CALCULADO → EM_VALIDACAO
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT public.aval_send_to_validation(pg_temp.k('mod'));
SELECT pg_temp.ok((SELECT status FROM public.avaliacao_modelos WHERE id = pg_temp.k('mod')) = 'EM_VALIDACAO'
  AND EXISTS (SELECT 1 FROM public.audit_events WHERE entity_id = pg_temp.k('mod') AND event_type = 'MODEL_SENT_TO_VALIDATION'
              AND details_json->>'status_anterior' = 'CALCULADO' AND details_json->>'status_novo' = 'EM_VALIDACAO'),
  'CALCULADO → EM_VALIDACAO registrado no histórico com status anterior e novo');
SELECT public.aval_send_to_validation(pg_temp.k('mod'));
SELECT pg_temp.ok((SELECT count(*) FROM public.modelo_snapshots WHERE modelo_id = pg_temp.k('mod')) = 1, 'reenviar um modelo já em validação não duplica o snapshot');
SELECT pg_temp.login(NULL);
SET LOCAL ROLE service_role;
INSERT INTO k SELECT 'v1', pg_temp.validar('REQUER_AJUSTES');
RESET ROLE;

-- 4) EM_VALIDACAO não pode ser arquivado (RPC explícita, limpeza em lote e escrita direta)
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$SELECT public.aval_model_archive((SELECT av FROM fx), ARRAY[pg_temp.k('mod')], NULL, true)$$, 'model_in_validation', 'arquivar modelo em validação é recusado pela RPC');
SELECT pg_temp.ok((public.aval_model_archive((SELECT av FROM fx), NULL, NULL, true)->>'em_validacao')::int = 1
  AND NOT (SELECT arquivado FROM public.avaliacao_modelos WHERE id = pg_temp.k('mod')), '"Limpar lista" mantém o modelo em validação visível e informa a quantidade');
SELECT pg_temp.login(NULL);
SELECT pg_temp.throws($$UPDATE public.avaliacao_modelos SET arquivado = true WHERE id = pg_temp.k('mod')$$, 'model_in_validation', 'barreira no banco impede arquivar modelo em validação por qualquer caminho');

-- 6/7) Relação esperada alterada: não recalcula, não cria modelo, validação fica desatualizada
UPDATE public.avaliacao_variaveis SET relacao_esperada = 'POSITIVA' WHERE id = 'c0000000-0000-0000-0000-000000000002';
SELECT pg_temp.ok((SELECT count(*) FROM public.avaliacao_modelos) = 1 AND (SELECT count(*) FROM public.avaliacao_modelo_execucoes) = 1
  AND NOT (SELECT stale FROM public.avaliacao_modelos WHERE id = pg_temp.k('mod'))
  AND (SELECT status FROM public.avaliacao_modelos WHERE id = pg_temp.k('mod')) = 'EM_VALIDACAO'
  AND NOT EXISTS (SELECT 1 FROM public.modelo_coeficientes c FULL JOIN coef0 o ON o.codigo = c.codigo AND c.execucao_id = pg_temp.k('ex')
                  WHERE c.beta IS DISTINCT FROM o.beta),
  'alterar relação esperada preserva modelo, execução e coeficientes (sem recálculo nem novo modelo)');
SELECT pg_temp.ok((SELECT stale FROM public.model_validations WHERE id = pg_temp.k('v1'))
  AND EXISTS (SELECT 1 FROM public.audit_events WHERE entity_id = pg_temp.k('mod') AND event_type = 'VALIDATION_MARKED_STALE'
              AND details_json->>'validacao' = pg_temp.k('v1')::text AND details_json->>'motivo' ~* 'rela'),
  'validação anterior marcada como desatualizada, com evento e motivo no histórico do modelo');
SELECT pg_temp.login('a2000000-0000-0000-0000-000000000002');
SELECT pg_temp.ok((public.aval_model_generate_round((SELECT av FROM fx), '10000000-0000-0000-0000-000000000001', 'ASSISTIDO',
  '[{"dep_transf":"LN","vars":[{"variavel_id":"c0000000-0000-0000-0000-000000000002","transformacao":"INVERSE"}]}]', true, '{}', 1)->>'ignorados_duplicidade')::int = 1
  AND (SELECT count(*) FROM public.avaliacao_modelos) = 1, 'regerar a mesma equação continua sendo duplicidade (relação esperada não entra na assinatura)');

-- 8) Revalidar o mesmo modelo cria novo registro sem apagar o anterior
SELECT pg_temp.login(NULL);
SET LOCAL ROLE service_role;
INSERT INTO k SELECT 'v2', pg_temp.validar('APTO');
RESET ROLE;
SELECT pg_temp.ok((SELECT count(*) FROM public.model_validations WHERE modelo_id = pg_temp.k('mod')) = 2
  AND (SELECT stale FROM public.model_validations WHERE id = pg_temp.k('v1')) AND NOT (SELECT stale FROM public.model_validations WHERE id = pg_temp.k('v2'))
  AND (SELECT execucao_id FROM public.model_validations WHERE id = pg_temp.k('v2')) = pg_temp.k('ex')
  AND EXISTS (SELECT 1 FROM public.audit_events WHERE entity_id = pg_temp.k('mod') AND event_type = 'MODEL_REVALIDATED'
              AND details_json->>'validacao_anterior' = pg_temp.k('v1')::text AND (details_json->>'anterior_desatualizada')::boolean),
  'revalidação usa a mesma execução, cria novo registro e mantém o anterior no histórico');

-- Validado (aceito) + configuração alterada: aceite invalidado e preservado; exige nova validação
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
INSERT INTO k SELECT 'ac1', public.aval_accept_model(pg_temp.k('v2'), NULL);
SELECT pg_temp.login(NULL);
UPDATE public.avaliacao_variaveis SET relacao_esperada = 'NEGATIVA' WHERE id = 'c0000000-0000-0000-0000-000000000002';
SELECT pg_temp.ok((SELECT status FROM public.model_acceptances WHERE id = pg_temp.k('ac1')) = 'INVALIDADO' AND (SELECT stale FROM public.model_validations WHERE id = pg_temp.k('v2'))
  AND (SELECT status FROM public.avaliacao_modelos WHERE id = pg_temp.k('mod')) = 'EM_VALIDACAO',
  'modelo validado: alteração relevante desatualiza validação e aceite sem apagar registros');
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$SELECT public.aval_accept_model(pg_temp.k('v2'), NULL)$$, 'validation_stale', 'aceitar de novo exige nova validação');
SELECT pg_temp.login(NULL);
SET LOCAL ROLE service_role;
INSERT INTO k SELECT 'v3', pg_temp.validar('APTO');
RESET ROLE;
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
INSERT INTO k SELECT 'ac2', public.aval_accept_model(pg_temp.k('v3'), NULL);

-- 2/3) EM_VALIDACAO → CALCULADO via "Retirar da validação"; histórico preservado
SELECT pg_temp.login('b1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$SELECT public.aval_model_withdraw_validation(pg_temp.k('mod'), 'motivo qualquer suficiente')$$, 'permission_denied', 'outra organização não retira da validação');
SELECT pg_temp.login('a5000000-0000-0000-0000-000000000005');
SELECT pg_temp.throws($$SELECT public.aval_model_withdraw_validation(pg_temp.k('mod'), 'motivo qualquer suficiente')$$, 'permission_denied', 'usuário sem papel na avaliação não retira da validação');
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$SELECT public.aval_model_withdraw_validation(pg_temp.k('mod'), NULL)$$, 'justification_required', 'modelo aceito exige justificativa para ser retirado');
CREATE TEMP TABLE antes AS SELECT (SELECT count(*) FROM public.model_validations) nv, (SELECT count(*) FROM public.model_validation_results) nr,
  (SELECT count(*) FROM public.model_acceptances) na, (SELECT count(*) FROM public.modelo_snapshots) ns, (SELECT count(*) FROM public.avaliacao_modelo_execucoes) ne,
  (SELECT count(*) FROM public.modelo_coeficientes) nc, (SELECT count(*) FROM public.validation_snapshots) nvs;
GRANT SELECT ON antes TO authenticated;
SELECT pg_temp.ok((public.aval_model_withdraw_validation(pg_temp.k('mod'), 'Relação esperada precisa ser revista')->>'status') = 'CALCULADO', 'retirada responde CALCULADO');
SELECT pg_temp.ok((SELECT status FROM public.avaliacao_modelos WHERE id = pg_temp.k('mod')) = 'CALCULADO'
  AND NOT (SELECT candidato FROM public.avaliacao_modelos WHERE id = pg_temp.k('mod')), 'EM_VALIDACAO → CALCULADO');
SELECT pg_temp.ok((SELECT nv = (SELECT count(*) FROM public.model_validations) AND nr = (SELECT count(*) FROM public.model_validation_results)
    AND na = (SELECT count(*) FROM public.model_acceptances) AND ns = (SELECT count(*) FROM public.modelo_snapshots)
    AND ne = (SELECT count(*) FROM public.avaliacao_modelo_execucoes) AND nc = (SELECT count(*) FROM public.modelo_coeficientes)
    AND nvs = (SELECT count(*) FROM public.validation_snapshots) FROM antes),
  'retirada preserva validações, resultados, aceites, snapshots, execução e coeficientes');
SELECT pg_temp.ok((SELECT status FROM public.model_acceptances WHERE id = pg_temp.k('ac2')) = 'REVOGADO'
  AND (SELECT invalidado_motivo FROM public.model_acceptances WHERE id = pg_temp.k('ac2')) ~ 'retirado da validação', 'aceite vigente revogado com motivo, sem exclusão');
SELECT pg_temp.ok((SELECT details_json->>'status_anterior' = 'EM_VALIDACAO' AND details_json->>'status_novo' = 'CALCULADO' AND details_json->>'acao' = 'Retirado da validação'
    AND actor_id = 'a1000000-0000-0000-0000-000000000001' AND created_at IS NOT NULL AND (details_json->>'validacoes_preservadas')::int = 3
  FROM public.audit_events WHERE entity_id = pg_temp.k('mod') AND event_type = 'MODEL_WITHDRAWN_FROM_VALIDATION'),
  'evento registra usuário, data, status anterior/novo e ação');
SELECT pg_temp.throws($$SELECT public.aval_model_withdraw_validation(pg_temp.k('mod'), NULL)$$, 'model_not_in_validation', 'só retira modelo que está em validação');
SELECT pg_temp.throws($$SELECT public.aval_accept_model(pg_temp.k('v3'), NULL)$$, 'model_not_in_validation', 'modelo retirado não pode ser aceito sem reenvio');

-- 5) CALCULADO pode ser arquivado; reenvio o traz de volta e fica registrado
SELECT pg_temp.login(NULL); DO $$ BEGIN RAISE NOTICE 'DBG % % % % %', (SELECT row(status,candidato,favorito,arquivado) FROM public.avaliacao_modelos WHERE id = pg_temp.k('mod')), public.aval_model_protegido(pg_temp.k('mod')), (SELECT json_agg(status) FROM public.model_acceptances), (SELECT count(*) FROM public.avaliacao_projecoes), (SELECT count(*) FROM public.avaliacao_modelos WHERE modelo_origem_id = pg_temp.k('mod')); END $$; SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((public.aval_model_archive((SELECT av FROM fx), ARRAY[pg_temp.k('mod')], NULL, true)->>'alterados')::int = 1
  AND (SELECT arquivado FROM public.avaliacao_modelos WHERE id = pg_temp.k('mod')), 'CALCULADO pode ser arquivado');
SELECT public.aval_send_to_validation(pg_temp.k('mod'));
SELECT pg_temp.ok((SELECT status = 'EM_VALIDACAO' AND NOT arquivado FROM public.avaliacao_modelos WHERE id = pg_temp.k('mod'))
  AND EXISTS (SELECT 1 FROM public.audit_events WHERE entity_id = pg_temp.k('mod') AND event_type = 'MODEL_RESENT_TO_VALIDATION' AND (details_json->>'validacoes_anteriores')::int = 3),
  'reenvio para validação volta a exibir o modelo e é registrado como reenvio');
SELECT pg_temp.ok((SELECT count(*) FROM public.audit_events WHERE entity_id = pg_temp.k('mod')
  AND event_type IN ('MODEL_SENT_TO_VALIDATION','VALIDATION_EXECUTED','VALIDATION_MARKED_STALE','MODEL_REVALIDATED','MODEL_ACCEPTED','MODEL_WITHDRAWN_FROM_VALIDATION','MODEL_RESENT_TO_VALIDATION')) >= 9,
  'histórico cronológico do modelo completo');
ROLLBACK;
