-- Conjunto congelado x variáveis atuais: ausência (congelado antes da etapa Variáveis) e valor alterado depois do congelamento.
BEGIN;
\ir _fixture.sql
CREATE TEMP TABLE r(k text, j jsonb); GRANT SELECT, INSERT ON r TO authenticated;
CREATE TEMP TABLE snap0 AS SELECT id, dados, hash FROM public.avaliacao_amostra_snapshots; GRANT SELECT ON snap0 TO authenticated;

SELECT pg_temp.login('a2000000-0000-0000-0000-000000000002');
INSERT INTO r SELECT 'c0', public.aval_conjunto_compat('10000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok((SELECT (j->>'compativel')::boolean FROM r WHERE k = 'c0') AND (SELECT jsonb_array_length(j->'variaveis') FROM r WHERE k = 'c0') = 4
  AND (SELECT j->>'motivo' FROM r WHERE k = 'c0') IS NULL, 'conjunto com as 4 variáveis do espaço é compatível');

-- 1) Variável definida depois do congelamento (caso HOMOLOG: conjunto V1 congelado antes da etapa Variáveis)
INSERT INTO public.avaliacao_variaveis(id, avaliacao_id, nome, codigo, tipo_variavel, papel, origem_tipo, atributo_id, unidade, relacao_esperada, obrigatoria)
SELECT 'c7000000-0000-0000-0000-000000000001', (SELECT av FROM fx), 'Banheiros', 'banheiros', 'QUANTITATIVA', 'INDEPENDENTE', 'ATRIBUTO_IMOBILIARIO',
       (SELECT id FROM public.atributos_imobiliarios WHERE organization_id IS NULL AND codigo = 'BANHEIROS'), 'un', 'POSITIVA', true;
INSERT INTO r SELECT 'c1', public.aval_conjunto_compat('10000000-0000-0000-0000-000000000001');
SELECT pg_temp.ok(NOT (SELECT (j->>'compativel')::boolean FROM r WHERE k = 'c1') AND (SELECT j->>'motivo' FROM r WHERE k = 'c1') = 'VARIAVEL_AUSENTE',
  'variável ausente no conjunto congelado torna o conjunto incompatível');
SELECT pg_temp.ok((SELECT x->>'ausentes' FROM r, jsonb_array_elements(j->'variaveis') x WHERE k = 'c1' AND x->>'codigo' = 'banheiros') = '8'
  AND (SELECT x->'ausentes_amostras' FROM r, jsonb_array_elements(j->'variaveis') x WHERE k = 'c1' AND x->>'codigo' = 'banheiros') = '[1,2,3,4,5,6,7,8]'::jsonb
  AND (SELECT x->>'presentes' FROM r, jsonb_array_elements(j->'variaveis') x WHERE k = 'c1' AND x->>'codigo' = 'preco') = '8',
  'aponta Banheiros ausente nas amostras 1 a 8 e mantém as demais presentes');
SELECT pg_temp.throws($q$SELECT public.aval_model_create((SELECT av FROM fx), '10000000-0000-0000-0000-000000000001', 'Manual', 'c0000000-0000-0000-0000-000000000001', 'DIRECT', NULL,
  '[{"variavel_id":"c0000000-0000-0000-0000-000000000002","transformacao":"DIRECT"}]'::jsonb)$q$, 'aval:dataset_outdated', 'modelo manual recusado sobre conjunto desatualizado');
SELECT pg_temp.throws($q$SELECT public.aval_model_generate_batch((SELECT av FROM fx), '10000000-0000-0000-0000-000000000001', 'ASSISTIDO',
  '[{"dep_transf":"LN","vars":[{"variavel_id":"c0000000-0000-0000-0000-000000000002","transformacao":"INVERSE"}]}]'::jsonb, true)$q$,
  'aval:dataset_outdated', 'candidatos recusados sobre conjunto desatualizado (sem passar pela checagem de domínio)');
SELECT pg_temp.ok((SELECT count(*) FROM public.avaliacao_modelos WHERE avaliacao_id = (SELECT av FROM fx)) = 0, 'nenhum modelo criado');
INSERT INTO r SELECT 'p1', public.aval_pendencias((SELECT av FROM fx));
SELECT pg_temp.ok((SELECT b->>'estado' FROM r, jsonb_array_elements(j) b WHERE k = 'p1' AND b->>'bloco' = 'MODELAGEM') = 'DESATUALIZADA'
  AND (SELECT b->>'proxima_acao' FROM r, jsonb_array_elements(j) b WHERE k = 'p1' AND b->>'bloco' = 'MODELAGEM') = 'Congelar nova versão do conjunto'
  AND (SELECT b->>'pendencias' FROM r, jsonb_array_elements(j) b WHERE k = 'p1' AND b->>'bloco' = 'MERCADO') LIKE '%congelado antes das últimas alterações%',
  'pendências indicam conjunto desatualizado e próximo passo congelar nova versão');

-- 2) Tirar a variável do espaço de modelagem volta a permitir modelar no conjunto vigente
SELECT pg_temp.login(NULL);
UPDATE public.avaliacao_variaveis SET papel = 'DISPONIVEL' WHERE id = 'c7000000-0000-0000-0000-000000000001';
SELECT pg_temp.login('a2000000-0000-0000-0000-000000000002');
SELECT pg_temp.ok((public.aval_conjunto_compat('10000000-0000-0000-0000-000000000001')->>'compativel')::boolean, 'variável fora do espaço não exige valor no conjunto');
SELECT pg_temp.ok(public.aval_model_create((SELECT av FROM fx), '10000000-0000-0000-0000-000000000001', 'Manual', 'c0000000-0000-0000-0000-000000000001', 'DIRECT', NULL,
  '[{"variavel_id":"c0000000-0000-0000-0000-000000000002","transformacao":"DIRECT"}]'::jsonb) IS NOT NULL, 'modelo criado com conjunto compatível');

-- 3) Variáveis estruturadas: valor do cadastro alterado depois do congelamento
SELECT pg_temp.login(NULL);
UPDATE public.avaliacao_variaveis SET ativo = false WHERE avaliacao_id = (SELECT av FROM fx);
UPDATE public.dados_mercado SET valor_ofertado = 1000 + right(id::text, 1)::int, valor_utilizado = 1000 + right(id::text, 1)::int;
UPDATE public.imoveis SET area_construida = 50 + right(id::text, 1)::int * 10 WHERE id::text LIKE 'd0000000-0000-0000-0000-00000000000_';
INSERT INTO public.avaliacao_variaveis(id, avaliacao_id, nome, codigo, tipo_variavel, papel, origem_tipo, campo_origem, unidade, relacao_esperada, obrigatoria)
SELECT x.id::uuid, (SELECT av FROM fx), x.nome, x.codigo, 'QUANTITATIVA', x.papel, 'CAMPO_DADO_MERCADO', x.campo, x.un, x.rel, true
  FROM (VALUES ('c7000000-0000-0000-0000-000000000011', 'Valor mensal', 'valor_mensal', 'DEPENDENTE', 'valor_utilizado', 'R$/mês', 'INDEFINIDA'),
               ('c7000000-0000-0000-0000-000000000012', 'Área construída', 'area_construida', 'INDEPENDENTE', 'area_construida', 'm²', 'POSITIVA')) x(id, nome, codigo, papel, campo, un, rel);
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
INSERT INTO r SELECT 'cj', to_jsonb(public.aval_dataset_prepare((SELECT av FROM fx)));
SELECT public.aval_dataset_freeze((SELECT (j #>> '{}')::uuid FROM r WHERE k = 'cj'));
SELECT pg_temp.ok((public.aval_conjunto_compat((SELECT (j #>> '{}')::uuid FROM r WHERE k = 'cj'))->>'compativel')::boolean, 'nova versão congelada com as variáveis atuais é compatível');
SELECT pg_temp.login(NULL);
CREATE TEMP TABLE snap1 AS SELECT id, dados, hash FROM public.avaliacao_amostra_snapshots WHERE conjunto_id = (SELECT (j #>> '{}')::uuid FROM r WHERE k = 'cj');
UPDATE public.imoveis SET area_construida = 999 WHERE id = 'd0000000-0000-0000-0000-000000000003';
SELECT pg_temp.login('a2000000-0000-0000-0000-000000000002');
INSERT INTO r SELECT 'c3', public.aval_conjunto_compat((SELECT (j #>> '{}')::uuid FROM r WHERE k = 'cj'));
SELECT pg_temp.ok(NOT (SELECT (j->>'compativel')::boolean FROM r WHERE k = 'c3') AND (SELECT j->>'motivo' FROM r WHERE k = 'c3') = 'VALOR_ALTERADO'
  AND (SELECT x->'divergentes_amostras' FROM r, jsonb_array_elements(j->'variaveis') x WHERE k = 'c3' AND x->>'codigo' = 'area_construida') = '[3]'::jsonb,
  'valor do cadastro alterado após o congelamento é detectado na amostra 3');
SELECT pg_temp.login(NULL);
SELECT pg_temp.ok((SELECT count(*) FROM public.avaliacao_amostra_snapshots s JOIN snap1 o ON o.id = s.id WHERE s.dados = o.dados AND s.hash = o.hash) = 8
  AND (SELECT count(*) FROM public.avaliacao_amostra_snapshots s JOIN snap0 o ON o.id = s.id WHERE s.dados = o.dados AND s.hash = o.hash) = (SELECT count(*) FROM snap0),
  'snapshots congelados permanecem idênticos (só leitura)');

-- 4) Outra organização não enxerga o conjunto
SELECT pg_temp.login('b1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($q$SELECT public.aval_conjunto_compat('10000000-0000-0000-0000-000000000001')$q$, 'aval:not_found', 'outra organização não consulta a compatibilidade');
ROLLBACK;
