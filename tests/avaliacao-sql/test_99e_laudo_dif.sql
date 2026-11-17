-- Laudo institucional DIF: estrutura 1–13, migração de rascunho, capa, mídias, visibilidade, desatualização por dado e snapshot único.
BEGIN;
\ir _fixture.sql
SELECT pg_temp.login(NULL);
UPDATE public.laudo_templates SET organization_id = '0a000000-0000-0000-0000-00000000000a', ativo = false WHERE codigo = 'TEMPLATE_DIF_AVALIACAO';
SELECT pg_temp.ok((SELECT count(*) FROM public.laudo_template_sections s JOIN public.laudo_template_versions v ON v.id = s.template_version_id
  WHERE v.codigo = 'TEMPLATE_DIF_AVALIACAO_V1') = 34 AND (SELECT layout FROM public.laudo_template_versions WHERE codigo = 'TEMPLATE_DIF_AVALIACAO_V1') = 'DIF_V1',
  'modelo DIF versionado com 34 tópicos (capa + capítulos 1–13 e subitens)');

-- Rascunho antigo (modelo genérico) com texto editado pelo RT
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT public.aval_laudo_init((SELECT av FROM fx));
CREATE TEMP TABLE lv AS SELECT v.id FROM public.laudo_versoes v WHERE v.avaliacao_id = (SELECT av FROM fx);
SELECT pg_temp.login(NULL);
GRANT SELECT ON lv TO authenticated;
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT count(*) FROM public.laudo_secoes WHERE laudo_versao_id = (SELECT id FROM lv)) = 14, 'sem modelo DIF ativo, o laudo usa o modelo genérico');
UPDATE public.laudo_secoes SET conteudo = 'Texto próprio do avaliador sobre o objeto.' WHERE laudo_versao_id = (SELECT id FROM lv) AND codigo = 'OBJETO';

-- Atualizar para o modelo DIF preserva o texto editado e o histórico
SELECT pg_temp.login(NULL);
UPDATE public.laudo_templates SET ativo = true WHERE codigo = 'TEMPLATE_DIF_AVALIACAO';
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
CREATE TEMP TABLE mg AS SELECT public.aval_laudo_migrar_modelo((SELECT id FROM lv)) AS r;
SELECT pg_temp.ok((SELECT (r->>'atualizadas')::int = 14 AND (r->>'novas')::int = 20 FROM mg), 'migração atualiza os 14 tópicos existentes e cria os 20 novos');
SELECT pg_temp.ok((SELECT conteudo FROM public.laudo_secoes WHERE laudo_versao_id = (SELECT id FROM lv) AND codigo = 'OBJETO') = 'Texto próprio do avaliador sobre o objeto.',
  'texto editado pelo avaliador é mantido');
SELECT pg_temp.ok((SELECT conteudo LIKE 'A metodologia avaliatória adotada%' AND texto_base = conteudo AND nivel = 1 AND classe = 'FIXO'
  FROM public.laudo_secoes WHERE laudo_versao_id = (SELECT id FROM lv) AND codigo = 'METODOLOGIA'), 'texto-base genérico não editado é trocado pelo institucional');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.laudo_texto_versoes t JOIN public.laudo_secoes s ON s.id = t.secao_id WHERE s.laudo_versao_id = (SELECT id FROM lv) AND s.codigo = 'METODOLOGIA'),
  'texto anterior fica no histórico da seção');
SELECT pg_temp.ok((SELECT string_agg(numero || ':' || titulo, '|' ORDER BY numero) FROM public.laudo_anexos WHERE laudo_versao_id = (SELECT id FROM lv) AND incluido)
  = 'I:Documentos do Imóvel Avaliando|II:Imóveis de Amostra|III:Tratamento de Inferência Estatística', 'anexos I a III do modelo DIF');
SELECT pg_temp.ok((SELECT v.layout FROM public.laudo_versoes l JOIN public.laudo_template_versions v ON v.id = l.template_version_id WHERE l.id = (SELECT id FROM lv)) = 'DIF_V1',
  'versão do laudo registra o modelo usado');
SELECT pg_temp.ok((SELECT string_agg(codigo, ',' ORDER BY ordem) FROM public.laudo_secoes WHERE laudo_versao_id = (SELECT id FROM lv) AND nivel = 1)
  = 'SOLICITANTE,OBJETO,OBJETIVO,FINALIDADE,CARACTERIZACAO,DIAGNOSTICO_MERCADO,METODOLOGIA,PESQUISA_MERCADO,INFERENCIA,ESPECIFICACAO,COMPATIBILIDADE,CONCLUSAO,ENCERRAMENTO',
  'capítulos 1 a 13 na ordem institucional');

-- Novo laudo de nova locação nasce no modelo DIF com o texto da finalidade
SELECT pg_temp.ok((SELECT variantes->>'NOVA_LOCACAO' LIKE '%art. 51 da Lei nº 14.133/2021%' FROM public.laudo_template_sections s JOIN public.laudo_template_versions v ON v.id = s.template_version_id
  WHERE v.codigo = 'TEMPLATE_DIF_AVALIACAO_V1' AND s.codigo = 'FINALIDADE'), 'texto-base por finalidade (nova locação)');

-- Visibilidade: só tópicos opcionais
SELECT pg_temp.throws($$SELECT public.aval_laudo_section_visibility((SELECT id FROM public.laudo_secoes WHERE laudo_versao_id = (SELECT id FROM lv) AND codigo = 'ANOVA'), false)$$,
  'field_not_allowed', 'tópico obrigatório não pode ser ocultado');
SELECT public.aval_laudo_section_visibility((SELECT id FROM public.laudo_secoes WHERE laudo_versao_id = (SELECT id FROM lv) AND codigo = 'INTERVALO_PREDICAO'), false);
SELECT pg_temp.ok(NOT (SELECT visivel FROM public.laudo_secoes WHERE laudo_versao_id = (SELECT id FROM lv) AND codigo = 'INTERVALO_PREDICAO'), 'tópico opcional ocultado');

-- Respostas às perguntas: gravadas por quem edita; estrutura e perguntas são protegidas
UPDATE public.laudo_secoes SET respostas = '{"ocupacao":"Predominantemente comercial"}' WHERE laudo_versao_id = (SELECT id FROM lv) AND codigo = 'LOCALIZACAO';
SELECT pg_temp.ok((SELECT respostas->>'ocupacao' FROM public.laudo_secoes WHERE laudo_versao_id = (SELECT id FROM lv) AND codigo = 'LOCALIZACAO') = 'Predominantemente comercial',
  'respostas guiadas gravadas');
SELECT pg_temp.throws($$UPDATE public.laudo_secoes SET perguntas = '[]' WHERE laudo_versao_id = (SELECT id FROM lv) AND codigo = 'LOCALIZACAO'$$, 'protected_field', 'perguntas do modelo são protegidas');
SELECT pg_temp.throws($$UPDATE public.laudo_secoes SET texto_base = 'x' WHERE laudo_versao_id = (SELECT id FROM lv) AND codigo = 'LOCALIZACAO'$$, 'protected_field', 'texto-base é protegido');

-- Capa e assinatura
SELECT pg_temp.throws($$SELECT public.aval_laudo_capa_salvar((SELECT id FROM lv), '{"objeto":"Valor de R$ 5.000,00"}')$$, 'typed_money', 'capa não aceita valor monetário digitado');
SELECT pg_temp.throws($$SELECT public.aval_laudo_capa_salvar((SELECT id FROM lv), '{"especificacao":"Grau II"}')$$, 'field_not_allowed', 'capa não aceita campo fora da lista');
SELECT pg_temp.throws($$SELECT public.aval_laudo_capa_salvar((SELECT id FROM lv), '{"data_vistoria":"2026-02-30"}')$$, 'invalid_value', 'data de vistoria inválida recusada');
SELECT public.aval_laudo_capa_salvar((SELECT id FROM lv), '{"data_vistoria":"2026-03-10","responsavel_cargo":"Analista","responsavel_crea":"MT 000000"}');
SELECT pg_temp.ok((SELECT public.aval_laudo_capa_efetiva(id)->>'responsavel_titulo' = 'Engenheiro Civil' AND public.aval_laudo_capa_efetiva(id)->>'responsavel_nome' = 'Teste'
  AND public.aval_laudo_capa_efetiva(id)->>'local' = 'Cuiabá – MT' FROM lv), 'capa efetiva: perfil do RT + identidade do modelo');
SELECT pg_temp.ok(public.aval_tokens((SELECT av FROM fx))->>'DATA_VISTORIA' = '10/03/2026' AND public.aval_tokens((SELECT av FROM fx))->>'N_DADOS_COLETADOS' = '8',
  'marcadores do modelo DIF vêm dos dados');

-- Mídias: caminho da própria organização/avaliação; outra organização não grava
SELECT pg_temp.throws($$INSERT INTO public.laudo_midias(avaliacao_id, categoria, storage_path, mime_type, largura, altura, sha256, legenda, fonte)
  SELECT av, 'FACHADA', 'outra-org/x.jpg', 'image/jpeg', 800, 600, repeat('a', 64), 'Fachada', 'Autor' FROM fx$$, 'invalid_value', 'arquivo fora da pasta da avaliação é recusado');
INSERT INTO public.laudo_midias(avaliacao_id, categoria, storage_path, mime_type, largura, altura, sha256, legenda, fonte, ordem)
SELECT av, 'FACHADA', '0a000000-0000-0000-0000-00000000000a/avaliacao/' || av || '/laudo-midias/u/f.jpg', 'image/jpeg', 800, 600, repeat('a', 64), 'Fachada principal', 'Autor (2026)', 1 FROM fx;
SELECT pg_temp.throws($$UPDATE public.laudo_midias SET sha256 = repeat('b', 64)$$, 'protected_field', 'arquivo e código de integridade da mídia são imutáveis');
SELECT pg_temp.throws($$INSERT INTO public.laudo_midias(avaliacao_id, categoria, storage_path, mime_type, largura, altura, sha256)
  SELECT av, 'AMOSTRA_MERCADO', '0a000000-0000-0000-0000-00000000000a/avaliacao/' || av || '/laudo-midias/u/a.jpg', 'image/jpeg', 800, 600, repeat('c', 64) FROM fx$$,
  'missing_required', 'foto de amostra exige a amostra');
SELECT pg_temp.login('b1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$INSERT INTO public.laudo_midias(avaliacao_id, categoria, storage_path, mime_type, largura, altura, sha256)
  SELECT av, 'FACHADA', '0b000000-0000-0000-0000-00000000000b/avaliacao/' || av || '/x.jpg', 'image/jpeg', 800, 600, repeat('d', 64) FROM fx$$,
  'row-level security|permission_denied|not_found|invalid_value', 'outra organização não grava mídia');
SELECT pg_temp.throws($$SELECT public.aval_laudo_snapshot((SELECT id FROM lv))$$, 'permission_denied|not_found', 'outra organização não lê o snapshot');

-- Snapshot único (rascunho = emissão)
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
CREATE TEMP TABLE sn AS SELECT public.aval_laudo_snapshot((SELECT id FROM lv)) AS j;
SELECT pg_temp.ok((SELECT j->>'layout' = 'DIF_V1' AND j#>>'{template,codigo}' = 'TEMPLATE_DIF_AVALIACAO_V1' AND jsonb_array_length(j->'secoes') = 34
  AND jsonb_array_length(j->'midias') = 1 AND (j->>'rascunho')::boolean AND jsonb_array_length(j->'amostras_meta') = 8
  AND j#>>'{capa,data_vistoria}' = '2026-03-10' FROM sn), 'snapshot traz modelo, capa, mídias e amostras (inclusive as fora do modelo)');
SELECT pg_temp.ok((SELECT bool_and(s ? 'nivel' AND s ? 'visivel' AND s ? 'classe') FROM sn, jsonb_array_elements(j->'secoes') s), 'seções do snapshot com hierarquia, classe e visibilidade');

-- Desatualização seletiva: mudança no resultado só marca os tópicos que usam o resultado, com o motivo
SELECT pg_temp.login(NULL);
UPDATE public.laudo_secoes SET status = 'APROVADA' WHERE laudo_versao_id = (SELECT id FROM lv);
SELECT public.aval_invalidate((SELECT av FROM fx), 'ECONOMIC_RESULT', 'Valor administrativo do contrato alterado');
SELECT pg_temp.ok((SELECT stale AND stale_motivo = 'Valor administrativo do contrato alterado' FROM public.laudo_secoes WHERE laudo_versao_id = (SELECT id FROM lv) AND codigo = 'COMPATIBILIDADE')
  AND (SELECT stale FROM public.laudo_secoes WHERE laudo_versao_id = (SELECT id FROM lv) AND codigo = 'CONCLUSAO')
  AND NOT (SELECT stale FROM public.laudo_secoes WHERE laudo_versao_id = (SELECT id FROM lv) AND codigo = 'METODOLOGIA')
  AND NOT (SELECT stale FROM public.laudo_secoes WHERE laudo_versao_id = (SELECT id FROM lv) AND codigo = 'CARACTERIZACAO_IMOVEL'),
  'só os tópicos que usam o dado alterado ficam desatualizados, com o motivo');
SELECT public.aval_invalidate((SELECT av FROM fx), 'REPORT_ONLY', 'Endereço do imóvel corrigido', ARRAY['CARACTERIZACAO']);
SELECT pg_temp.ok((SELECT stale FROM public.laudo_secoes WHERE laudo_versao_id = (SELECT id FROM lv) AND codigo = 'CARACTERIZACAO_IMOVEL')
  AND NOT (SELECT stale FROM public.laudo_secoes WHERE laudo_versao_id = (SELECT id FROM lv) AND codigo = 'ANOVA'), 'alteração no capítulo 5 alcança os subitens do capítulo');
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT public.aval_laudo_section_refresh((SELECT id FROM public.laudo_secoes WHERE laudo_versao_id = (SELECT id FROM lv) AND codigo = 'COMPATIBILIDADE'));
SELECT pg_temp.ok((SELECT NOT stale AND stale_motivo IS NULL AND status = 'RASCUNHO' FROM public.laudo_secoes WHERE laudo_versao_id = (SELECT id FROM lv) AND codigo = 'COMPATIBILIDADE'),
  'revisar após mudança limpa o motivo e exige nova aprovação');

-- Verificação de emissão do modelo DIF
SELECT public.aval_laudo_preflight((SELECT id FROM lv));
SELECT pg_temp.ok((SELECT string_agg(r.codigo || '=' || r.status, ',' ORDER BY r.codigo) FROM public.laudo_preflight_results r
  JOIN public.laudo_preflight_runs p ON p.id = r.run_id WHERE p.laudo_versao_id = (SELECT id FROM lv) AND r.codigo IN ('FIGURAS_LEGENDA','FOTO_PRINCIPAL','RESPONSAVEL_ASSINATURA'))
  = 'FIGURAS_LEGENDA=OK,FOTO_PRINCIPAL=OK,RESPONSAVEL_ASSINATURA=OK', 'verificação DIF: responsável, foto principal e legendas');
ROLLBACK;
