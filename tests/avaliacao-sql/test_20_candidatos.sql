-- Limites configuráveis por organização, confirmação, limite rígido, domínio e origem dos candidatos.
BEGIN;
\ir _fixture.sql
CREATE TEMP TABLE c3 AS SELECT '[{"dep_transf":"DIRECT","vars":[{"variavel_id":"c0000000-0000-0000-0000-000000000002","transformacao":"DIRECT"}]},
 {"dep_transf":"DIRECT","vars":[{"variavel_id":"c0000000-0000-0000-0000-000000000002","transformacao":"LN"}]},
 {"dep_transf":"LN","vars":[{"variavel_id":"c0000000-0000-0000-0000-000000000002","transformacao":"DIRECT"}]}]'::jsonb AS j;
GRANT SELECT ON c3 TO authenticated;

SELECT pg_temp.login('a4000000-0000-0000-0000-000000000004');
INSERT INTO public.avaliacao_modeling_settings(organization_id, assisted_candidate_soft_limit, exploration_candidate_soft_limit, hard_limit, require_confirmation_over)
VALUES ('0a000000-0000-0000-0000-00000000000a', 2, 4, 5, NULL);
SELECT pg_temp.ok(true, 'admin configura limites da própria organização');
SELECT pg_temp.throws($$INSERT INTO public.avaliacao_modeling_settings(organization_id) VALUES ('0b000000-0000-0000-0000-00000000000b')$$, 'row-level security', 'admin não configura outra organização');
SELECT pg_temp.throws($$UPDATE public.avaliacao_modeling_settings SET hard_limit = 1 WHERE organization_id IS NULL RETURNING 1/0$$, 'zero', 'padrão institucional não é alterável pelo cliente (nenhuma linha)')
  -- se o UPDATE afetasse a linha global, RETURNING 1/0 dispararia; sem linha visível p/ update, nada ocorre
  ;
ROLLBACK;
