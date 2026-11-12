BEGIN;
\ir _fixture.sql
SELECT pg_temp.ok((SELECT count(*) = 8 FROM public.avaliacao_amostra_snapshots), 'fixture carregada (8 amostras congeladas)');
SELECT pg_temp.ok((SELECT count(*) = 4 FROM public.avaliacao_membros WHERE avaliacao_id = (SELECT av FROM fx)), 'membros: RT, admin colaborador, colaborador e revisor');
ROLLBACK;
