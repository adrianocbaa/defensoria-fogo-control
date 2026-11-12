-- Limites configuráveis por organização, confirmação, limite rígido, domínio e origem dos candidatos.
BEGIN;
\ir _fixture.sql
CREATE TEMP TABLE c3 AS SELECT '[{"dep_transf":"DIRECT","vars":[{"variavel_id":"c0000000-0000-0000-0000-000000000002","transformacao":"DIRECT"}]},
 {"dep_transf":"DIRECT","vars":[{"variavel_id":"c0000000-0000-0000-0000-000000000002","transformacao":"LN"}]},
 {"dep_transf":"LN","vars":[{"variavel_id":"c0000000-0000-0000-0000-000000000002","transformacao":"DIRECT"}]}]'::jsonb AS j;
GRANT SELECT ON c3 TO authenticated;
CREATE TEMP TABLE out_ids(ids uuid[]); GRANT SELECT, INSERT ON out_ids TO authenticated;

-- Configuração
SELECT pg_temp.login('a4000000-0000-0000-0000-000000000004');
INSERT INTO public.avaliacao_modeling_settings(organization_id, assisted_candidate_soft_limit, exploration_candidate_soft_limit, hard_limit, require_confirmation_over)
VALUES ('0a000000-0000-0000-0000-00000000000a', 2, 4, 5, NULL);
SELECT pg_temp.ok(true, 'admin configura limites da própria organização');
SELECT pg_temp.throws($$INSERT INTO public.avaliacao_modeling_settings(organization_id) VALUES ('0b000000-0000-0000-0000-00000000000b')$$, 'row-level security', 'admin não configura outra organização');
UPDATE public.avaliacao_modeling_settings SET hard_limit = 1 WHERE organization_id IS NULL;
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
UPDATE public.avaliacao_modeling_settings SET hard_limit = 50 WHERE organization_id = '0a000000-0000-0000-0000-00000000000a';
SELECT pg_temp.login('b2000000-0000-0000-0000-000000000002');
UPDATE public.avaliacao_modeling_settings SET hard_limit = 50 WHERE organization_id = '0a000000-0000-0000-0000-00000000000a';
SELECT pg_temp.ok((SELECT count(*) FROM public.avaliacao_modeling_settings) = 1, 'outra organização vê só o padrão institucional');
SELECT pg_temp.login(NULL);
SELECT pg_temp.ok((SELECT hard_limit FROM public.avaliacao_modeling_settings WHERE organization_id IS NULL) = 2000
  AND (SELECT hard_limit FROM public.avaliacao_modeling_settings WHERE organization_id = '0a000000-0000-0000-0000-00000000000a') = 5,
  'padrão institucional e configuração da org só mudam por quem gere políticas da própria org');

-- Geração em lote validada no servidor
SELECT pg_temp.login('a2000000-0000-0000-0000-000000000002');
SELECT pg_temp.throws($$SELECT public.aval_model_generate_batch((SELECT av FROM fx), '10000000-0000-0000-0000-000000000001', 'ASSISTIDO', (SELECT j FROM c3), false)$$,
  'candidate_confirmation_required', 'acima do limite assistido (2) exige confirmação');
INSERT INTO out_ids SELECT public.aval_model_generate_batch((SELECT av FROM fx), '10000000-0000-0000-0000-000000000001', 'ASSISTIDO', (SELECT j FROM c3), true);
SELECT pg_temp.ok((SELECT cardinality(ids) FROM out_ids) = 3 AND (SELECT bool_and(origem_tipo = 'GERADO_ASSISTIDO') FROM public.avaliacao_modelos), 'confirmado: 3 candidatos assistidos criados');
SELECT pg_temp.ok((SELECT count(*) FROM public.avaliacao_modelos WHERE status = 'RASCUNHO' AND NOT favorito AND NOT candidato) = 3, 'nenhum candidato é escolhido automaticamente');
SELECT public.aval_model_generate_batch((SELECT av FROM fx), '10000000-0000-0000-0000-000000000001', 'AMPLA', (SELECT j FROM c3), false);
SELECT pg_temp.ok((SELECT count(*) FROM public.avaliacao_modelos) = 3 AND (SELECT count(*) FROM public.avaliacao_model_generation_runs) = 2,
  'exploração ampla dentro do limite (4) sem confirmação; candidatos idênticos não são recriados (nova rodada os referencia)');
SELECT public.aval_model_generate_batch((SELECT av FROM fx), '10000000-0000-0000-0000-000000000001', 'AMPLA',
  '[{"dep_transf":"INVERSE","vars":[{"variavel_id":"c0000000-0000-0000-0000-000000000002","transformacao":"DIRECT"}]}]', false);
SELECT pg_temp.ok((SELECT count(*) FROM public.avaliacao_modelos WHERE origem_tipo = 'GERADO_AMPLA') = 1, 'candidato novo da exploração ampla tem origem GERADO_AMPLA');
SELECT pg_temp.throws($$SELECT public.aval_model_generate_batch((SELECT av FROM fx), '10000000-0000-0000-0000-000000000001', 'AMPLA', (SELECT j || j FROM c3), true)$$,
  'candidate_hard_limit', 'limite rígido (5) bloqueia mesmo com confirmação');
SELECT pg_temp.throws($$SELECT public.aval_model_generate_batch((SELECT av FROM fx), '10000000-0000-0000-0000-000000000001', 'AMPLA',
  '[{"dep_transf":"DIRECT","vars":[{"variavel_id":"c0000000-0000-0000-0000-000000000004","transformacao":"LN"}]}]', false)$$,
  'invalid_domain', 'transformação fora do domínio (LN de zero) é recusada');
SELECT pg_temp.throws($$SELECT public.aval_model_generate_batch((SELECT av FROM fx), '10000000-0000-0000-0000-000000000001', 'AMPLA',
  '[{"dep_transf":"DIRECT","vars":[{"variavel_id":"c0000000-0000-0000-0000-000000000003","transformacao":"LN"}]}]', false)$$,
  'transform_not_authorized|invalid_domain', 'transformação não autorizada é recusada');
SELECT pg_temp.throws($$SELECT public.aval_model_create((SELECT av FROM fx), '10000000-0000-0000-0000-000000000001', NULL, 'c0000000-0000-0000-0000-000000000001', 'DIRECT', NULL,
  '[{"variavel_id":"c0000000-0000-0000-0000-000000000002","transformacao":"DIRECT"}]', 'GERADO_AMPLA')$$, 'use_candidate_batch', 'origem gerada não entra fora do lote');
SELECT pg_temp.throws($$SELECT public.aval_model_create_core((SELECT av FROM fx), '10000000-0000-0000-0000-000000000001', NULL, 'c0000000-0000-0000-0000-000000000001', 'DIRECT', NULL,
  '[{"variavel_id":"c0000000-0000-0000-0000-000000000002","transformacao":"DIRECT"}]', 'GERADO_AMPLA')$$, 'permission denied', 'núcleo de criação não é chamável pelo cliente');
SELECT pg_temp.ok(public.aval_model_create((SELECT av FROM fx), '10000000-0000-0000-0000-000000000001', 'Manual', 'c0000000-0000-0000-0000-000000000001', 'DIRECT', NULL,
  '[{"variavel_id":"c0000000-0000-0000-0000-000000000002","transformacao":"DIRECT"}]') IS NOT NULL, 'modo manual continua funcionando');

SELECT pg_temp.login('b1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$SELECT public.aval_model_generate_batch((SELECT av FROM fx), '10000000-0000-0000-0000-000000000001', 'ASSISTIDO', (SELECT j FROM c3), true)$$,
  'permission_denied', 'usuário de outra organização não gera candidatos');
ROLLBACK;
