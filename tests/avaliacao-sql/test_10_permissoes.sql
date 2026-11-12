-- Decisões técnicas exigem papel explícito na avaliação; admin só gere (criar, cancelar, acessos, políticas).
BEGIN;
\ir _fixture.sql
CREATE TEMP TABLE perms(p text); GRANT SELECT ON perms TO authenticated;
INSERT INTO perms VALUES ('validation.manual_review'),('validation.accept'),('economic.select_center'),('economic.apply_arbitration'),('economic.confirm'),('report.approve'),('report.issue');

SELECT pg_temp.login('a4000000-0000-0000-0000-000000000004');
SELECT pg_temp.ok((SELECT bool_and(NOT public.aval_has_perm((SELECT av FROM fx), p)) FROM perms), 'admin sem papel técnico não toma nenhuma decisão técnica');
SELECT pg_temp.ok(public.aval_has_global_perm('evaluation.create') AND public.aval_has_global_perm('policy.manage') AND public.aval_has_perm((SELECT av FROM fx), 'evaluation.cancel'),
  'admin cria, cancela e gere políticas');
SELECT pg_temp.throws($$SELECT public.aval_accept_model(gen_random_uuid(), 'justificativa suficiente')$$, 'permission_denied|not_found', 'admin não aceita modelo');
SELECT pg_temp.throws($$SELECT public.aval_laudo_issue(gen_random_uuid())$$, 'permission_denied|not_found', 'admin não emite laudo');
SELECT public.aval_set_member((SELECT av FROM fx), 'a2000000-0000-0000-0000-000000000002', 'COLABORADOR', true);
SELECT pg_temp.ok(true, 'admin gere acessos da avaliação');

SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT bool_and(public.aval_has_perm((SELECT av FROM fx), p)) FROM perms), 'responsável técnico tem todas as decisões técnicas');

SELECT pg_temp.login('a3000000-0000-0000-0000-000000000003');
SELECT pg_temp.ok(public.aval_has_perm((SELECT av FROM fx), 'report.approve')
  AND NOT public.aval_has_perm((SELECT av FROM fx), 'validation.accept') AND NOT public.aval_has_perm((SELECT av FROM fx), 'report.issue')
  AND NOT public.aval_has_perm((SELECT av FROM fx), 'economic.confirm'), 'revisor aprova seções, mas não aceita modelo, confirma resultado nem emite');

SELECT pg_temp.login('a2000000-0000-0000-0000-000000000002');
SELECT pg_temp.ok((SELECT bool_and(NOT public.aval_has_perm((SELECT av FROM fx), p)) FROM perms) AND public.aval_has_perm((SELECT av FROM fx), 'model.create'),
  'colaborador modela, mas não decide');

SELECT pg_temp.login('a5000000-0000-0000-0000-000000000005');
SELECT pg_temp.ok((SELECT count(*) FROM public.avaliacoes) = 0 AND NOT public.aval_has_perm((SELECT av FROM fx), 'evaluation.edit'), 'contratada sem acesso');

SELECT pg_temp.login('b2000000-0000-0000-0000-000000000002');
SELECT pg_temp.ok((SELECT count(*) FROM public.avaliacoes) = 0 AND NOT public.aval_has_perm((SELECT av FROM fx), 'evaluation.cancel'), 'admin de outra organização não vê nem cancela');

-- Guarda contra regressão: perfis globais não podem receber permissão técnica.
SELECT pg_temp.login(NULL);
SELECT pg_temp.throws($$INSERT INTO public.avaliacao_papel_permissoes(papel, permissao) VALUES ('GLOBAL_ADMIN', 'validation.accept')$$, 'technical_permission_requires_role', 'GLOBAL_ADMIN não recebe validation.accept');
SELECT pg_temp.throws($$INSERT INTO public.avaliacao_papel_permissoes(papel, permissao) VALUES ('GLOBAL_TECNICO', 'report.issue')$$, 'technical_permission_requires_role', 'GLOBAL_TECNICO não recebe report.issue');
ROLLBACK;
