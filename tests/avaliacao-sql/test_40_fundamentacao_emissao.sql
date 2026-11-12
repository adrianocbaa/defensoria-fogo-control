-- Fundamentação estruturada, graus profissionais, tokens do laudo e arquivos oficiais congelados (com revisões).
BEGIN;
\ir _fixture.sql
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
CREATE TEMP TABLE m AS SELECT public.aval_model_create((SELECT av FROM fx), '10000000-0000-0000-0000-000000000001', 'Manual', 'c0000000-0000-0000-0000-000000000001', 'DIRECT', NULL,
  '[{"variavel_id":"c0000000-0000-0000-0000-000000000002","transformacao":"DIRECT"}]') AS id;
SELECT pg_temp.login(NULL);
GRANT SELECT ON m TO authenticated, service_role;
INSERT INTO public.avaliacao_modelo_execucoes(id, avaliacao_id, modelo_id, engine_name, engine_version, status, input_snapshot_json, input_hash, output_json, output_hash, iniciado_em, concluido_em)
SELECT '20000000-0000-0000-0000-000000000001', (SELECT av FROM fx), id, 'sidif', '1.1.0', 'SUCESSO', '{}', repeat('a', 64), '{}', repeat('b', 64), now(), now() FROM m;

SET LOCAL ROLE service_role;
CREATE TEMP TABLE val AS SELECT public.aval_engine_persist_validation(jsonb_build_object('politica', 'SIDIF_V1 v2',
  'validacao', jsonb_build_object('organization_id', '0a000000-0000-0000-0000-00000000000a', 'avaliacao_id', (SELECT av FROM fx), 'modelo_id', (SELECT id FROM m),
     'execucao_id', '20000000-0000-0000-0000-000000000001', 'created_by', 'a1000000-0000-0000-0000-000000000001',
     'policy_id', (SELECT id FROM public.validation_policies WHERE codigo = 'SIDIF_V1' AND versao = 2), 'overall_status', 'APTO',
     'fundamentacao_grau', 'II', 'precisao_grau', 'III', 'amplitude_pct', 20, 'resumo_json', '{}'::jsonb),
  'resultados', '[]'::jsonb,
  'fundamentacao', jsonb_build_object('policy_version', 2,
     'summary', jsonb_build_object('policy_reference', 'teste', 'total_points', 14, 'grade_calculated', 'II', 'requirements_met', true, 'mandatory_requirements_json', '[]'::jsonb, 'pendencias', '[]'::jsonb),
     'items', jsonb_build_array(jsonb_build_object('item_number', 1, 'codigo', 'CARACTERIZACAO_AVALIANDO', 'titulo', 'Caracterização', 'source_type', 'MANUAL', 'criterio_codigo', null,
        'grade_achieved', 'II', 'points', 2, 'mandatory_for_grade', false, 'status', 'ATENDE', 'details_json', '{}'::jsonb))))) AS id;
RESET ROLE;
GRANT SELECT ON val TO authenticated;
SELECT pg_temp.ok((SELECT grade_calculated FROM public.validation_foundation_summary WHERE validation_id = (SELECT id FROM val)) = 'II'
  AND (SELECT count(*) FROM public.validation_foundation_items WHERE validation_id = (SELECT id FROM val)) = 1, 'resumo e itens de fundamentação gravados com a validação');
SELECT pg_temp.throws($$UPDATE public.validation_foundation_summary SET grade_calculated = 'III'$$, 'imut|immutable|not allowed|bloque', 'resumo de fundamentação imutável');

-- Graus profissionais para itens sem regra automática
SELECT pg_temp.login('a2000000-0000-0000-0000-000000000002');
SELECT pg_temp.throws($$INSERT INTO public.validation_foundation_manual_grades(modelo_id, codigo, grau, justificativa) SELECT id, 'CARACTERIZACAO_AVALIANDO', 'III', 'Vistoria completa com fotos' FROM m$$,
  'row-level security|permission_denied', 'colaborador não atribui grau de fundamentação');
SELECT pg_temp.login('b1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$INSERT INTO public.validation_foundation_manual_grades(modelo_id, codigo, grau, justificativa) SELECT id, 'CARACTERIZACAO_AVALIANDO', 'III', 'Vistoria completa com fotos' FROM m$$,
  'row-level security|permission_denied|not_found', 'outra organização não atribui grau');
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$INSERT INTO public.validation_foundation_manual_grades(modelo_id, codigo, grau, justificativa) SELECT id, 'CARACTERIZACAO_AVALIANDO', 'III', 'curta' FROM m$$,
  'check', 'grau exige justificativa');

-- O aceite exige o modelo em validação (ciclo de vida)
SELECT pg_temp.login(NULL);
UPDATE public.avaliacao_modelos SET status = 'EM_VALIDACAO' WHERE id = (SELECT id FROM m);
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
-- Aceite usa a validação; tokens trazem o grau só do resumo estruturado
CREATE TEMP TABLE ac AS SELECT public.aval_accept_model((SELECT id FROM val), NULL) AS id;
SELECT pg_temp.ok((public.aval_tokens((SELECT av FROM fx))->>'GRAU_FUNDAMENTACAO') = 'II' AND (public.aval_tokens((SELECT av FROM fx))->>'PONTOS_FUNDAMENTACAO') = '14',
  'laudo usa grau e pontos da fundamentação estruturada');
SELECT pg_temp.ok((SELECT dados ? 'fundamentacao' FROM public.validation_snapshots WHERE acceptance_id = (SELECT id FROM ac)), 'snapshot do aceite inclui a fundamentação');
INSERT INTO public.validation_foundation_manual_grades(modelo_id, codigo, grau, justificativa) SELECT id, 'CARACTERIZACAO_AVALIANDO', 'III', 'Vistoria completa com fotos e plantas' FROM m;
SELECT pg_temp.ok((SELECT avaliacao_id = (SELECT av FROM fx) AND created_by = 'a1000000-0000-0000-0000-000000000001' FROM public.validation_foundation_manual_grades),
  'RT atribui grau; avaliação e autor preenchidos pelo servidor');
SELECT pg_temp.login(NULL);
INSERT INTO public.validation_foundation_manual_grades(modelo_id, codigo, grau, justificativa, created_by, created_at)
SELECT id, 'IDENTIFICACAO_DADOS', 'II', 'Dados identificados com fonte e data', 'a1000000-0000-0000-0000-000000000001', now() + interval '1 second' FROM m;
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$SELECT public.aval_accept_model((SELECT id FROM val), NULL)$$, 'validation_outdated_reviews', 'grau atribuído após a validação exige nova validação antes do aceite');
SELECT pg_temp.ok('Grau III' ~* '\mgraus?(\s+de\s+[^\s{]+)?\s*:?\s+(iii|ii|i)\M' AND 'grau de fundamentação: II' ~* '\mgraus?(\s+de\s+[^\s{]+)?\s*:?\s+(iii|ii|i)\M'
  AND NOT ('grau de fundamentação {{GRAU_FUNDAMENTACAO}}' ~* '\mgraus?(\s+de\s+[^\s{]+)?\s*:?\s+(iii|ii|i)\M'), 'pré-checagem detecta grau digitado e aceita o marcador');

-- Arquivos oficiais congelados
SELECT pg_temp.login(NULL);
INSERT INTO storage.buckets(id, name) VALUES ('avaliacao-emitidos', 'avaliacao-emitidos');
INSERT INTO public.laudos(id, avaliacao_id, template_version_id) SELECT '30000000-0000-0000-0000-000000000001', av, (SELECT id FROM public.laudo_template_versions LIMIT 1) FROM fx;
INSERT INTO public.laudo_versoes(id, avaliacao_id, laudo_id, avaliacao_versao_id, revisao, status)
SELECT ('3100000' || r || '-0000-0000-0000-000000000001')::uuid, av, '30000000-0000-0000-0000-000000000001', (SELECT id FROM public.avaliacao_versoes WHERE avaliacao_id = av AND revisao = 0), r, 'EMITIDO' FROM fx, generate_series(0, 1) r;
INSERT INTO public.laudo_preflight_runs(id, avaliacao_id, laudo_versao_id, resultado)
SELECT ('3200000' || r || '-0000-0000-0000-000000000001')::uuid, av, ('3100000' || r || '-0000-0000-0000-000000000001')::uuid, 'PASS' FROM fx, generate_series(0, 1) r;
INSERT INTO public.laudo_emissoes(id, avaliacao_id, laudo_versao_id, revisao, codigo, preflight_run_id, hash, emitido_por)
SELECT ('3300000' || r || '-0000-0000-0000-000000000001')::uuid, av, ('3100000' || r || '-0000-0000-0000-000000000001')::uuid, r, '001/2026-R' || r,
  ('3200000' || r || '-0000-0000-0000-000000000001')::uuid, repeat('c', 64), 'a1000000-0000-0000-0000-000000000001' FROM fx, generate_series(0, 1) r;

SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$INSERT INTO public.laudo_arquivos_emitidos(avaliacao_id, emissao_id, formato, storage_ref, hash, storage_bucket, storage_path, display_filename, mime_type, file_size, sha256)
  SELECT av, '33000000-0000-0000-0000-000000000001', 'PDF', 'x', repeat('d', 64), 'avaliacao-emitidos', 'x.pdf', 'x.pdf', 'application/pdf', 10, repeat('d', 64) FROM fx$$,
  'permission denied|row-level security', 'cliente não registra arquivo oficial');
SELECT pg_temp.throws($$INSERT INTO storage.objects(bucket_id, name) VALUES ('avaliacao-emitidos', 'forjado.pdf')$$, 'row-level security', 'cliente não grava no bucket de emitidos');

SET LOCAL ROLE service_role;
INSERT INTO storage.objects(bucket_id, name) SELECT 'avaliacao-emitidos', '0a000000-0000-0000-0000-00000000000a/avaliacoes/' || av || '/R' || r || '/laudo.' || f FROM fx, generate_series(0, 1) r, unnest(ARRAY['pdf','docx']) f;
INSERT INTO public.laudo_arquivos_emitidos(avaliacao_id, emissao_id, formato, storage_ref, hash, storage_bucket, storage_path, display_filename, mime_type, file_size, sha256, created_by)
SELECT av, ('3300000' || r || '-0000-0000-0000-000000000001')::uuid, upper(f), 'avaliacao-emitidos/' || p, md5(p) || md5(p), 'avaliacao-emitidos', p, 'Laudo R' || r || '.' || f,
  CASE f WHEN 'pdf' THEN 'application/pdf' ELSE 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' END, 1000 + r, md5(p) || md5(p), 'a1000000-0000-0000-0000-000000000001'
FROM fx, generate_series(0, 1) r, unnest(ARRAY['pdf','docx']) f, LATERAL (SELECT '0a000000-0000-0000-0000-00000000000a/avaliacoes/' || av || '/R' || r || '/laudo.' || f AS p) pp;
SELECT pg_temp.throws($$INSERT INTO public.laudo_arquivos_emitidos(avaliacao_id, emissao_id, formato, storage_ref, hash, storage_bucket, storage_path, display_filename, mime_type, file_size, sha256)
  SELECT av, '33000000-0000-0000-0000-000000000001', 'PDF', 'y', repeat('e', 64), 'avaliacao-emitidos', 'y.pdf', 'y.pdf', 'application/pdf', 10, repeat('e', 64) FROM fx$$,
  'duplicate key', 'uma emissão tem um único PDF oficial');
SELECT pg_temp.throws($$INSERT INTO public.laudo_arquivos_emitidos(avaliacao_id, emissao_id, formato, storage_ref, hash, storage_bucket, storage_path, display_filename, mime_type, file_size, sha256)
  SELECT av, '33000000-0000-0000-0000-000000000001', 'PDF', 'z', 'x', 'avaliacao-emitidos', 'z.pdf', 'z.pdf', 'application/pdf', 10, 'naohash' FROM fx$$,
  'check', 'arquivo oficial exige SHA-256 válido');
SELECT pg_temp.throws($$UPDATE public.laudo_arquivos_emitidos SET sha256 = repeat('0', 64)$$, 'imut|immutable|not allowed|bloque', 'arquivo emitido imutável mesmo para o servidor');
SELECT pg_temp.throws($$DELETE FROM public.laudo_arquivos_emitidos$$, 'imut|immutable|not allowed|bloque', 'arquivo emitido não pode ser apagado');
RESET ROLE;

SELECT pg_temp.login('a3000000-0000-0000-0000-000000000003');
SELECT pg_temp.ok((SELECT count(*) FROM public.laudo_arquivos_emitidos) = 4 AND (SELECT count(DISTINCT emissao_id) FROM public.laudo_arquivos_emitidos) = 2,
  'revisão 01 tem novos arquivos e os da revisão 00 continuam disponíveis');
SELECT pg_temp.ok((SELECT count(*) FROM storage.objects WHERE bucket_id = 'avaliacao-emitidos') = 4, 'leitor da organização baixa os arquivos congelados');
DELETE FROM storage.objects WHERE bucket_id = 'avaliacao-emitidos';
UPDATE storage.objects SET name = 'x' WHERE bucket_id = 'avaliacao-emitidos';
SELECT pg_temp.login('b1000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT count(*) FROM storage.objects WHERE bucket_id = 'avaliacao-emitidos') = 0 AND (SELECT count(*) FROM public.laudo_arquivos_emitidos) = 0,
  'outra organização não vê arquivos nem metadados');
SELECT pg_temp.login(NULL);
SELECT pg_temp.ok((SELECT count(*) FROM storage.objects WHERE bucket_id = 'avaliacao-emitidos' AND name LIKE '%/laudo.%') = 4, 'cliente não apaga nem renomeia arquivos congelados');
ROLLBACK;
