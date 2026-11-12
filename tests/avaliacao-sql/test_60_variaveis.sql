-- Variáveis da pesquisa antes da coleta: fonte configurada, campos dinâmicos, completude, congelamento e edição.
BEGIN;
\ir _fixture.sql
-- Cenário Guarantã simplificado: avaliando d10, amostras 1..8 (dados e1..e8 / imóveis d1..d8).
UPDATE public.avaliacao_variaveis SET ativo = false WHERE avaliacao_id = (SELECT av FROM fx);
INSERT INTO public.imoveis(id, organization_id, tipo_imovel, area_construida) VALUES
  ('d0000000-0000-0000-0000-000000000010', '0a000000-0000-0000-0000-00000000000a', 'Sala comercial', 120);
INSERT INTO public.avaliacao_imoveis(organization_id, avaliacao_id, imovel_id, papel) SELECT '0a000000-0000-0000-0000-00000000000a', av, 'd0000000-0000-0000-0000-000000000010', 'AVALIANDO' FROM fx;
UPDATE public.dados_mercado SET valor_ofertado = 1000 + right(id::text, 1)::int, valor_utilizado = 1000 + right(id::text, 1)::int;
CREATE TEMP TABLE snap0 AS SELECT id, dados, hash FROM public.avaliacao_amostra_snapshots;
GRANT SELECT ON snap0 TO authenticated;
CREATE TEMP TABLE r(k text, j jsonb); GRANT SELECT, INSERT ON r TO authenticated;

SELECT pg_temp.ok((SELECT count(*) FROM public.atributos_imobiliarios WHERE organization_id IS NULL AND codigo IN ('AREA_PRIVATIVA','BANHEIROS','VAGAS','PADRAO','ESTADO_CONSERVACAO')) = 5,
  'catálogo tem Área privativa, Banheiros, Vagas, Padrão e Estado de conservação');

-- 1) Colaborador define as variáveis a partir do catálogo (como a tela faz)
SELECT pg_temp.login('a2000000-0000-0000-0000-000000000002');
INSERT INTO public.avaliacao_variaveis(id, avaliacao_id, nome, codigo, tipo_variavel, papel, origem_tipo, campo_origem, atributo_id, unidade, relacao_esperada, obrigatoria)
SELECT x.id::uuid, (SELECT av FROM fx), x.nome, x.codigo, 'QUANTITATIVA', x.papel, x.origem, x.campo,
       (SELECT id FROM public.atributos_imobiliarios WHERE organization_id IS NULL AND codigo = x.attr), x.unidade, COALESCE(x.rel, 'INDEFINIDA'), true
  FROM (VALUES ('c1000000-0000-0000-0000-000000000001', 'Valor mensal', 'valor_mensal', 'DEPENDENTE', 'CAMPO_DADO_MERCADO', 'valor_utilizado', NULL, 'R$/mês', NULL),
               ('c1000000-0000-0000-0000-000000000002', 'Área privativa', 'area_privativa', 'INDEPENDENTE', 'ATRIBUTO_IMOBILIARIO', NULL, 'AREA_PRIVATIVA', 'm²', 'POSITIVA'),
               ('c1000000-0000-0000-0000-000000000003', 'Banheiros', 'banheiros', 'INDEPENDENTE', 'ATRIBUTO_IMOBILIARIO', NULL, 'BANHEIROS', 'un', 'POSITIVA')
       ) x(id, nome, codigo, papel, origem, campo, attr, unidade, rel);
INSERT INTO r SELECT 's0', public.aval_variaveis_status((SELECT av FROM fx));
SELECT pg_temp.ok((SELECT x->>'fonte' FROM r, jsonb_array_elements(j->'variaveis') x WHERE k = 's0' AND x->>'codigo' = 'valor_mensal') = 'MERCADO'
  AND (SELECT (x->>'precisa_avaliando')::boolean FROM r, jsonb_array_elements(j->'variaveis') x WHERE k = 's0' AND x->>'codigo' = 'valor_mensal') = false,
  'Valor mensal vem do valor utilizado do mercado e não é pedido no avaliando');
SELECT pg_temp.ok((SELECT count(*) FROM r, jsonb_array_elements(j->'variaveis') x WHERE k = 's0' AND (x->>'precisa_avaliando')::boolean) = 2
  AND (SELECT jsonb_array_length(j->'avaliando'->'faltando') FROM r WHERE k = 's0') = 2,
  'avaliando pede só Área privativa e Banheiros (ambas faltando)');
SELECT pg_temp.ok((SELECT x->>'fonte' FROM r, jsonb_array_elements(j->'variaveis') x WHERE k = 's0' AND x->>'codigo' = 'banheiros') = 'ATRIBUTO',
  'Banheiros aponta para a característica do imóvel');
SELECT pg_temp.ok((SELECT j FROM r WHERE k = 's0') -> 'variaveis' -> 0 ->> 'amostras_completas' = '8', 'Valor mensal completo em 8/8 sem redigitar');

-- 2) Dados do avaliando gravados na fonte (imovel_atributos) e alinhados ao registro lido pelo motor
SELECT public.aval_apply_changes((SELECT av FROM fx), jsonb_build_array(
  jsonb_build_object('entity_type','imovel_atributo','entity_id','d0000000-0000-0000-0000-000000000010','campo','AREA_PRIVATIVA','valor','127.82'),
  jsonb_build_object('entity_type','imovel_atributo','entity_id','d0000000-0000-0000-0000-000000000010','campo','BANHEIROS','valor','2')), NULL);
SELECT pg_temp.login(NULL);
SELECT pg_temp.ok((SELECT valor_numeric FROM public.imovel_atributos ia JOIN public.atributos_imobiliarios a ON a.id = ia.atributo_id
  WHERE ia.imovel_id = 'd0000000-0000-0000-0000-000000000010' AND a.codigo = 'BANHEIROS') = 2, 'Banheiros do avaliando gravado em imovel_atributos');
SELECT pg_temp.ok((SELECT valor FROM public.avaliacao_variavel_valores WHERE variavel_id = 'c1000000-0000-0000-0000-000000000002' AND scope_type = 'AVALIANDO') = 127.82,
  'valor do avaliando materializado automaticamente para a modelagem (sem botão Preencher)');
SELECT pg_temp.login('a2000000-0000-0000-0000-000000000002');
SELECT pg_temp.ok(jsonb_array_length(public.aval_variaveis_status((SELECT av FROM fx))->'avaliando'->'faltando') = 0, 'avaliando completo');

-- 3) Gravação direta em característica de imóvel em uso é recusada
SELECT pg_temp.throws($q$INSERT INTO public.imovel_atributos(imovel_id, atributo_id, valor_numeric)
  SELECT 'd0000000-0000-0000-0000-000000000001', id, 3 FROM public.atributos_imobiliarios WHERE organization_id IS NULL AND codigo = 'BANHEIROS'$q$,
  'aval:use_change_flow', 'característica de imóvel vinculado não muda fora do fluxo de impacto');

-- 4) Amostras: 1..8 com banheiros; área privativa em 1..7 (amostra 8 fica incompleta, mas salva)
SELECT public.aval_apply_changes((SELECT av FROM fx), (SELECT jsonb_agg(c) FROM (
  SELECT jsonb_build_object('entity_type','imovel_atributo','entity_id',('d0000000-0000-0000-0000-00000000000' || i)::uuid,'campo','BANHEIROS','valor', (1 + i % 3)::text) c FROM generate_series(1, 8) i
  UNION ALL
  SELECT jsonb_build_object('entity_type','imovel_atributo','entity_id',('d0000000-0000-0000-0000-00000000000' || i)::uuid,'campo','AREA_PRIVATIVA','valor', (40 + i * 10)::text) FROM generate_series(1, 7) i) t), NULL);
INSERT INTO r SELECT 's1', public.aval_variaveis_status((SELECT av FROM fx));
SELECT pg_temp.ok((SELECT x->>'amostras_completas' FROM r, jsonb_array_elements(j->'variaveis') x WHERE k = 's1' AND x->>'codigo' = 'area_privativa') = '7'
  AND (SELECT x->>'amostras_total' FROM r, jsonb_array_elements(j->'variaveis') x WHERE k = 's1' AND x->>'codigo' = 'area_privativa') = '8',
  'completude 7/8 em Área privativa');
SELECT pg_temp.ok((SELECT string_agg(a->>'indice', ',') FROM r, jsonb_array_elements(j->'amostras') a WHERE k = 's1' AND NOT (a->>'completa')::boolean) = '8'
  AND (SELECT a->'faltando' FROM r, jsonb_array_elements(j->'amostras') a WHERE k = 's1' AND a->>'indice' = '8') = '["c1000000-0000-0000-0000-000000000002"]'::jsonb,
  'detecta exatamente a amostra 8 sem Área privativa');
SELECT pg_temp.ok((SELECT b->>'pendencias' FROM jsonb_array_elements(public.aval_pendencias((SELECT av FROM fx))) b WHERE b->>'bloco' = 'MERCADO') LIKE '%sem variável obrigatória%',
  'pendência de Mercado aponta amostra incompleta');
SELECT pg_temp.ok((SELECT b->>'estado' FROM jsonb_array_elements(public.aval_pendencias((SELECT av FROM fx))) b WHERE b->>'bloco' = 'VARIAVEIS') = 'PRONTA',
  'etapa Variáveis pronta com dependente e independentes');

-- 5) Congelamento bloqueado com mensagem concreta
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
INSERT INTO r SELECT 'cj', to_jsonb(public.aval_dataset_prepare((SELECT av FROM fx)));
DO $$ DECLARE d text; BEGIN
  PERFORM public.aval_dataset_freeze((SELECT (j #>> '{}')::uuid FROM r WHERE k = 'cj'));
  RAISE EXCEPTION 'FALHA: congelou com amostra incompleta';
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS d = PG_EXCEPTION_DETAIL;
  IF SQLERRM <> 'aval:dataset_incomplete' OR d::jsonb <> '[{"amostra": 8, "faltando": ["Área privativa"]}]'::jsonb THEN RAISE EXCEPTION 'FALHA: % / %', SQLERRM, d; END IF;
  RAISE NOTICE 'OK congelamento bloqueado: amostra 8 sem Área privativa';
END $$;

-- 6) Corrige a amostra 8 e congela: valores lidos das fontes; conjunto antigo intacto
SELECT pg_temp.login('a2000000-0000-0000-0000-000000000002');
SELECT public.aval_apply_changes((SELECT av FROM fx), jsonb_build_array(
  jsonb_build_object('entity_type','imovel_atributo','entity_id','d0000000-0000-0000-0000-000000000008','campo','AREA_PRIVATIVA','valor','95')), NULL);
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT public.aval_dataset_freeze((SELECT (j #>> '{}')::uuid FROM r WHERE k = 'cj'));
SELECT pg_temp.login(NULL);
CREATE TEMP TABLE snap1 AS SELECT s.id, s.amostra_id, s.dados, s.hash FROM public.avaliacao_amostra_snapshots s WHERE s.conjunto_id = (SELECT (j #>> '{}')::uuid FROM r WHERE k = 'cj');
GRANT SELECT ON snap1 TO authenticated;
SELECT pg_temp.ok((SELECT count(*) FROM snap1) = 8, 'conjunto congelado com as 8 amostras');
SELECT pg_temp.ok((SELECT dados->'variaveis' FROM snap1 WHERE amostra_id = 'f0000000-0000-0000-0000-000000000001') = '{"valor_mensal": 1001, "area_privativa": 50, "banheiros": 2}'::jsonb,
  'snapshot traz Valor mensal, Área privativa e Banheiros lidos das fontes');
SELECT pg_temp.ok((SELECT dados->'variaveis_origem'->>'banheiros' FROM snap1 WHERE amostra_id = 'f0000000-0000-0000-0000-000000000001') = 'imovel_atributos.BANHEIROS',
  'snapshot registra a origem de cada variável');
SELECT pg_temp.ok((SELECT count(*) FROM public.avaliacao_amostra_snapshots s JOIN snap0 o ON o.id = s.id WHERE s.dados = o.dados AND s.hash = o.hash) = (SELECT count(*) FROM snap0),
  'snapshots do conjunto anterior permanecem idênticos');

-- 7) Correção depois do congelamento: impacto DATASET, mesma amostra, fotografia intacta, trilha antes/depois
SELECT pg_temp.login('a2000000-0000-0000-0000-000000000002');
SELECT pg_temp.ok(public.aval_evaluate_changes_impact((SELECT av FROM fx), jsonb_build_array(
  jsonb_build_object('entity_type','imovel_atributo','entity_id','d0000000-0000-0000-0000-000000000001','campo','BANHEIROS','valor','3')))->>'nivel' = 'DATASET',
  'Banheiros de amostra congelada = DATASET');
SELECT pg_temp.ok(public.aval_evaluate_changes_impact((SELECT av FROM fx), jsonb_build_array(
  jsonb_build_object('entity_type','imovel_atributo','entity_id','d0000000-0000-0000-0000-000000000010','campo','BANHEIROS','valor','3')))->>'nivel' = 'REPORT_ONLY',
  'Banheiros do avaliando antes de modelo calculado = REPORT_ONLY');
SELECT public.aval_apply_changes((SELECT av FROM fx), jsonb_build_array(
  jsonb_build_object('entity_type','imovel_atributo','entity_id','d0000000-0000-0000-0000-000000000001','campo','BANHEIROS','valor','3')), 'conferido');
SELECT pg_temp.login(NULL);
SELECT pg_temp.ok((SELECT count(*) FROM public.avaliacao_amostra_snapshots s JOIN snap1 o ON o.id = s.id WHERE s.dados = o.dados AND s.hash = o.hash) = 8,
  'conjunto recém-congelado não muda retroativamente');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.avaliacao_amostras WHERE id = 'f0000000-0000-0000-0000-000000000001'), 'amostra mantém o mesmo id');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.audit_events WHERE event_type = 'FIELD_CHANGED' AND details->>'campo' = 'BANHEIROS'
  AND details->>'anterior' = '2' AND details->>'novo' = '3'), 'histórico registra Banheiros 2 → 3');

-- 8) Definição da variável e variável personalizada
SELECT pg_temp.login('a2000000-0000-0000-0000-000000000002');
SELECT pg_temp.throws($q$SELECT public.aval_apply_changes((SELECT av FROM fx), jsonb_build_array(
  jsonb_build_object('entity_type','variavel','entity_id','c1000000-0000-0000-0000-000000000003','campo','papel','valor','DEPENDENTE')), NULL)$q$,
  'aval:dependent_exists', 'não permite segunda variável dependente');
SELECT pg_temp.ok(public.aval_evaluate_changes_impact((SELECT av FROM fx), jsonb_build_array(
  jsonb_build_object('entity_type','variavel','entity_id','c1000000-0000-0000-0000-000000000003','campo','fonte','valor','manual')))->>'nivel' = 'DATASET',
  'trocar a origem de variável congelada = DATASET');
INSERT INTO public.avaliacao_variaveis(id, avaliacao_id, nome, codigo, tipo_variavel, papel, origem_tipo, unidade, obrigatoria)
VALUES ('c1000000-0000-0000-0000-000000000009', (SELECT av FROM fx), 'Idade aparente estimada', 'idade_aparente_estimada', 'QUANTITATIVA', 'DISPONIVEL', 'MANUAL', 'anos', false);
SELECT public.aval_apply_changes((SELECT av FROM fx), jsonb_build_array(
  jsonb_build_object('entity_type','variavel_valor','entity_id','c1000000-0000-0000-0000-000000000009','campo','valor','valor','12'),
  jsonb_build_object('entity_type','variavel_valor','entity_id','c1000000-0000-0000-0000-000000000009','campo','valor','valor','7',
    'contexto', jsonb_build_object('amostra_id','f0000000-0000-0000-0000-000000000003'))), NULL);
INSERT INTO r SELECT 's2', public.aval_variaveis_status((SELECT av FROM fx));
SELECT pg_temp.ok((SELECT x->>'valor_avaliando' FROM r, jsonb_array_elements(j->'variaveis') x WHERE k = 's2' AND x->>'codigo' = 'idade_aparente_estimada') = '12'
  AND (SELECT a->'valores'->>'c1000000-0000-0000-0000-000000000009' FROM r, jsonb_array_elements(j->'amostras') a WHERE k = 's2' AND a->>'indice' = '3') = '7',
  'variável personalizada manual continua funcionando (avaliando e amostra)');

-- 9) Isolamento por organização
SELECT pg_temp.login('b1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($q$SELECT public.aval_variaveis_status((SELECT av FROM fx))$q$, 'aval:not_found', 'outra organização não lê a completude');
SELECT pg_temp.throws($q$SELECT public.aval_apply_changes((SELECT av FROM fx), jsonb_build_array(
  jsonb_build_object('entity_type','imovel_atributo','entity_id','d0000000-0000-0000-0000-000000000001','campo','BANHEIROS','valor','9')), NULL)$q$,
  'aval:', 'outra organização não altera características');
SELECT pg_temp.login('a5000000-0000-0000-0000-000000000005');
SELECT pg_temp.throws($q$SELECT public.aval_apply_changes((SELECT av FROM fx), jsonb_build_array(
  jsonb_build_object('entity_type','imovel_atributo','entity_id','d0000000-0000-0000-0000-000000000001','campo','BANHEIROS','valor','9')), NULL)$q$,
  'aval:', 'usuário sem papel na avaliação não altera características');
ROLLBACK;
