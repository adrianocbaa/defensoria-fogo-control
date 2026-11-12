-- Banco reutilizável de imóveis/dados de mercado: reutilização sem duplicar o cadastro, novo dado do mesmo imóvel,
-- importação de outra avaliação, foto imutável da inclusão, legado acessível, duplicidade e isolamento entre organizações.
BEGIN;
\ir _fixture.sql
CREATE TEMP TABLE r(k text, j jsonb); GRANT SELECT, INSERT ON r TO authenticated;
CREATE TEMP TABLE ids(k text, v uuid); GRANT SELECT, INSERT ON ids TO authenticated;
INSERT INTO ids SELECT 'av1', av FROM fx;
SELECT pg_temp.login('a4000000-0000-0000-0000-000000000004');
INSERT INTO ids VALUES ('av2', public.aval_create('NOVA_LOCACAO', 'MT', 'Cuiabá', '5103403', 'Sala comercial', 'a1000000-0000-0000-0000-000000000001', NULL));
INSERT INTO ids VALUES ('av3', public.aval_create('RENOVACAO', 'MT', 'Cuiabá', '5103403', 'Sala comercial', 'a1000000-0000-0000-0000-000000000001', NULL));
SELECT pg_temp.login('b2000000-0000-0000-0000-000000000002');
INSERT INTO ids VALUES ('avB', public.aval_create('NOVA_LOCACAO', 'MT', 'Cuiabá', '5103403', 'Sala comercial', 'b1000000-0000-0000-0000-000000000001', NULL));
SELECT pg_temp.login(NULL);
CREATE FUNCTION pg_temp.id(k text) RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT v FROM ids WHERE ids.k = $1 $$;
GRANT EXECUTE ON FUNCTION pg_temp.id(text) TO authenticated;

-- Legado: amostras já existentes receberam a foto da inclusão e continuam no banco da organização
SELECT pg_temp.ok((SELECT count(*) FROM public.avaliacao_amostras WHERE avaliacao_id = pg_temp.id('av1') AND snapshot_inclusao IS NOT NULL AND snapshot_chave IS NOT NULL) = 8,
  'amostras existentes têm foto da inclusão');

-- 1) Cadastro de imóvel + dado + amostra dentro da avaliação 1 (fluxo atual da tela, como RT)
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
INSERT INTO public.imoveis(id, tipo_imovel, endereco, numero, bairro, municipio_nome, municipio_ibge, uf, area_construida)
VALUES ('d2000000-0000-0000-0000-000000000020', 'Sala comercial', 'Rua das Flores', '100', 'Centro', 'Cuiabá', '5103403', 'MT', 80);
INSERT INTO public.dados_mercado(id, imovel_id, valor_ofertado, valor_utilizado, valor_unitario, data_observacao)
VALUES ('e2000000-0000-0000-0000-000000000020', 'd2000000-0000-0000-0000-000000000020', 4000, 4000, 50, '2026-03-10');
INSERT INTO public.avaliacao_amostras(avaliacao_id, dado_id) VALUES (pg_temp.id('av1'), 'e2000000-0000-0000-0000-000000000020');
SELECT pg_temp.ok((SELECT origem_inclusao = 'CADASTRO_NOVO' AND snapshot_fonte = 'INCLUSAO' AND (snapshot_inclusao->'dado'->>'valor_utilizado')::numeric = 4000
  FROM public.avaliacao_amostras WHERE avaliacao_id = pg_temp.id('av1') AND dado_id = 'e2000000-0000-0000-0000-000000000020'), 'inclusão grava foto do imóvel e do dado');
INSERT INTO r SELECT 'busca2', public.aval_banco_buscar(pg_temp.id('av2'), '{"municipio_ibge":"5103403","bairro":"centro"}');
SELECT pg_temp.ok((SELECT (j->>'total')::int FROM r WHERE k = 'busca2') = 1
  AND (SELECT j->'rows'->0->>'dado_id' FROM r WHERE k = 'busca2') = 'e2000000-0000-0000-0000-000000000020'
  AND (SELECT (j->'rows'->0->>'ja_na_avaliacao')::boolean FROM r WHERE k = 'busca2') = false
  AND (SELECT (j->'rows'->0->>'avaliacoes_uso')::int FROM r WHERE k = 'busca2') = 1, 'imóvel cadastrado na avaliação 1 aparece na busca da avaliação 2');
SELECT pg_temp.ok((SELECT (public.aval_banco_buscar(pg_temp.id('av2'), '{}')->>'total')::int) = 9, 'busca sem filtros mostra todo o banco da organização (legado incluído)');

-- 2) Mesmo imóvel em duas avaliações, sem duplicar o cadastro
CREATE TEMP TABLE n0 AS SELECT (SELECT count(*) FROM public.imoveis) AS im, (SELECT count(*) FROM public.dados_mercado) AS dm;
GRANT SELECT ON n0 TO authenticated;
INSERT INTO r SELECT 'add', public.aval_amostras_adicionar(pg_temp.id('av2'), ARRAY['e2000000-0000-0000-0000-000000000020']::uuid[]);
SELECT pg_temp.ok((SELECT (j->>'adicionadas')::int FROM r WHERE k = 'add') = 1 AND (SELECT count(*) FROM public.imoveis) = (SELECT im FROM n0)
  AND (SELECT count(*) FROM public.dados_mercado) = (SELECT dm FROM n0)
  AND (SELECT origem_inclusao FROM public.avaliacao_amostras WHERE avaliacao_id = pg_temp.id('av2')) = 'BANCO', 'mesmo imóvel usado em duas avaliações sem novo cadastro');
SELECT pg_temp.ok((public.aval_amostras_adicionar(pg_temp.id('av2'), ARRAY['e2000000-0000-0000-0000-000000000020']::uuid[])->>'ja_existentes')::int = 1,
  'incluir de novo não duplica a amostra');

-- 3) Novo dado de mercado para o mesmo imóvel, com outro valor e data
INSERT INTO public.dados_mercado(id, imovel_id, valor_ofertado, valor_utilizado, valor_unitario, data_observacao)
VALUES ('e2000000-0000-0000-0000-000000000021', 'd2000000-0000-0000-0000-000000000020', 4500, 4500, 56.25, '2026-11-05');
INSERT INTO r SELECT 'rec', public.aval_banco_buscar(pg_temp.id('av3'), '{"bairro":"Centro"}');
SELECT pg_temp.ok((SELECT (j->>'total')::int FROM r WHERE k = 'rec') = 1 AND (SELECT j->'rows'->0->>'dado_id' FROM r WHERE k = 'rec') = 'e2000000-0000-0000-0000-000000000021'
  AND (SELECT (j->'rows'->0->>'dados_do_imovel')::int FROM r WHERE k = 'rec') = 2, 'por padrão a busca mostra o dado mais recente do imóvel (2 dados)');
INSERT INTO r SELECT 'tod', public.aval_banco_buscar(pg_temp.id('av3'), '{"bairro":"Centro","somente_recentes":false}');
SELECT pg_temp.ok((SELECT (j->>'total')::int FROM r WHERE k = 'tod') = 2
  AND (SELECT (x->>'mais_recente')::boolean FROM r, jsonb_array_elements(j->'rows') x WHERE k = 'tod' AND x->>'dado_id' = 'e2000000-0000-0000-0000-000000000020') = false,
  'dado antigo aparece marcado como não sendo o mais recente');
SELECT pg_temp.ok((public.aval_banco_buscar(pg_temp.id('av3'), '{"bairro":"Centro","data_de":"2026-06-01","somente_recentes":false}')->>'total')::int = 1
  AND (public.aval_banco_buscar(pg_temp.id('av3'), '{"area_min":"90"}')->>'total')::int = 0
  AND (public.aval_banco_buscar(pg_temp.id('av3'), '{"q":"flores"}')->>'total')::int = 1, 'filtros de período, área e texto');

-- 4) Importar amostras de outra avaliação (parcial, depois todas), com valores digitados das variáveis manuais
SELECT pg_temp.login(NULL);
INSERT INTO public.avaliacao_variavel_valores(avaliacao_id, variavel_id, scope_type, amostra_id, valor)
VALUES (pg_temp.id('av1'), 'c0000000-0000-0000-0000-000000000003', 'AMOSTRA', 'f0000000-0000-0000-0000-000000000001', 1);
INSERT INTO public.avaliacao_variaveis(id, avaliacao_id, nome, codigo, tipo_variavel, papel, transformacoes_autorizadas)
VALUES ('c3000000-0000-0000-0000-000000000003', pg_temp.id('av3'), 'Padrão', 'padrao', 'DICOTOMICA', 'INDEPENDENTE', ARRAY['DIRECT']);
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
INSERT INTO r SELECT 'lista', public.aval_banco_buscar(pg_temp.id('av3'), jsonb_build_object('avaliacao_origem', pg_temp.id('av1')));
SELECT pg_temp.ok((SELECT (j->>'total')::int FROM r WHERE k = 'lista') = 9, 'lista as 9 amostras da avaliação de origem');
INSERT INTO r SELECT 'imp1', public.aval_amostras_importar(pg_temp.id('av3'), pg_temp.id('av1'), ARRAY['f0000000-0000-0000-0000-000000000001','f0000000-0000-0000-0000-000000000002']::uuid[]);
SELECT pg_temp.ok((SELECT (j->>'importadas')::int FROM r WHERE k = 'imp1') = 2 AND (SELECT (j->>'valores_variaveis')::int FROM r WHERE k = 'imp1') = 1,
  'importação parcial (2) leva o valor digitado da variável manual de mesmo código');
INSERT INTO r SELECT 'imp2', public.aval_amostras_importar(pg_temp.id('av3'), pg_temp.id('av1'), NULL);
SELECT pg_temp.ok((SELECT (j->>'importadas')::int FROM r WHERE k = 'imp2') = 7 AND (SELECT (j->>'ja_existentes')::int FROM r WHERE k = 'imp2') = 2
  AND (SELECT count(*) FROM public.avaliacao_amostras WHERE avaliacao_id = pg_temp.id('av3') AND origem_inclusao = 'IMPORTACAO' AND importada_de_amostra_id IS NOT NULL) = 9
  AND (SELECT count(*) FROM public.imoveis) = (SELECT im FROM n0), '"Selecionar todas" importa o restante sem duplicar cadastro nem amostras');
SELECT pg_temp.ok((SELECT count(*) FROM public.audit_events WHERE avaliacao_id = pg_temp.id('av3') AND event_type = 'SAMPLE_ADDED') = 9, 'cada inclusão fica no histórico');

-- 5) Edição do cadastro mestre não altera a foto do laudo antigo
SELECT pg_temp.login(NULL);
UPDATE public.avaliacoes SET status = 'CONCLUIDA' WHERE id = pg_temp.id('av1');
CREATE TEMP TABLE foto0 AS SELECT id, snapshot_inclusao, snapshot_chave FROM public.avaliacao_amostras WHERE avaliacao_id = pg_temp.id('av1');
CREATE TEMP TABLE conj0 AS SELECT id, dados, hash FROM public.avaliacao_amostra_snapshots;
GRANT SELECT ON foto0, conj0 TO authenticated;
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT public.aval_apply_changes(pg_temp.id('av2'), jsonb_build_array(
  jsonb_build_object('entity_type','dado_mercado','entity_id','e2000000-0000-0000-0000-000000000020','campo','valor_utilizado','valor','4100'),
  jsonb_build_object('entity_type','imovel','entity_id','d2000000-0000-0000-0000-000000000020','campo','area_construida','valor','82',
    'contexto', jsonb_build_object('modo','COMPARTILHADO','dado_id','e2000000-0000-0000-0000-000000000020'))), 'correção do cadastro');
SELECT pg_temp.ok((SELECT valor_utilizado FROM public.dados_mercado WHERE id = 'e2000000-0000-0000-0000-000000000020') = 4100, 'cadastro mestre corrigido');
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.avaliacao_amostras a JOIN foto0 f ON f.id = a.id
  WHERE a.snapshot_inclusao IS DISTINCT FROM f.snapshot_inclusao OR a.snapshot_chave IS DISTINCT FROM f.snapshot_chave)
  AND (SELECT (snapshot_inclusao->'dado'->>'valor_utilizado')::numeric FROM public.avaliacao_amostras
        WHERE avaliacao_id = pg_temp.id('av1') AND dado_id = 'e2000000-0000-0000-0000-000000000020') = 4000
  AND NOT EXISTS (SELECT 1 FROM public.avaliacao_amostra_snapshots s JOIN conj0 c ON c.id = s.id WHERE s.dados IS DISTINCT FROM c.dados),
  'avaliação antiga mantém a foto original (R$ 4.000) e os conjuntos congelados');
SELECT pg_temp.ok((SELECT (x->>'divergente')::boolean FROM jsonb_array_elements(public.aval_banco_buscar(pg_temp.id('av3'),
  jsonb_build_object('avaliacao_origem', pg_temp.id('av1')))->'rows') x WHERE x->>'dado_id' = 'e2000000-0000-0000-0000-000000000020') = true,
  'importação avisa que o cadastro mudou desde aquela avaliação');
SELECT pg_temp.throws($$UPDATE public.avaliacao_amostras SET snapshot_inclusao = '{}'::jsonb WHERE avaliacao_id = pg_temp.id('av2')$$, 'snapshot_immutable', 'foto da inclusão não pode ser alterada');
SELECT pg_temp.throws($$UPDATE public.avaliacao_amostras SET dado_id = 'e2000000-0000-0000-0000-000000000021' WHERE avaliacao_id = pg_temp.id('av2')$$, 'snapshot_immutable', 'amostra não troca de dado de mercado');
SELECT pg_temp.login(NULL);
SELECT pg_temp.throws($$UPDATE public.avaliacao_amostras SET snapshot_chave = 'x' WHERE avaliacao_id = pg_temp.id('av1')$$, 'snapshot_immutable', 'nem o dono do banco altera a foto');
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$SELECT public.aval_amostras_adicionar(pg_temp.id('av1'), ARRAY['e2000000-0000-0000-0000-000000000021']::uuid[])$$, 'evaluation_not_active', 'avaliação concluída não recebe amostras');
UPDATE public.dados_mercado SET status = 'DESATUALIZADO' WHERE id = 'e2000000-0000-0000-0000-000000000020';
SELECT pg_temp.ok((SELECT status FROM public.dados_mercado WHERE id = 'e2000000-0000-0000-0000-000000000020') = 'DESATUALIZADO'
  AND (public.aval_banco_buscar(pg_temp.id('av3'), '{"status":"DESATUALIZADO","somente_recentes":false}')->>'total')::int = 1, 'situação do anúncio muda sem fluxo técnico e filtra a busca');
SELECT pg_temp.throws($$UPDATE public.dados_mercado SET valor_utilizado = 1 WHERE id = 'e2000000-0000-0000-0000-000000000020'$$, 'use_change_flow', 'valor de dado vinculado continua exigindo o fluxo com impacto');

-- Duplicidade: mesmo bairro + tipo + área semelhante gera alerta (não bloqueia)
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.aval_find_duplicates('Avenida Outra', '9', NULL, '5103403', NULL, NULL, NULL, NULL, 81, '{}', NULL, 'Centro', 'Sala Comercial') d
  WHERE d.imovel_id = 'd2000000-0000-0000-0000-000000000020' AND 'Mesmo bairro e tipo, com área semelhante' = ANY(d.motivos)), 'alerta de possível duplicidade por bairro, tipo e área');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.aval_find_duplicates('rua das flores', '100', NULL, '5103403', NULL, NULL, NULL, NULL, NULL) d
  WHERE d.imovel_id = 'd2000000-0000-0000-0000-000000000020'), 'chamada antiga (sem bairro) continua funcionando');

-- 7) Isolamento entre organizações
SELECT pg_temp.login('b1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$SELECT public.aval_banco_buscar(pg_temp.id('av1'), '{}')$$, 'not_found', 'outra organização não pesquisa o banco da avaliação');
SELECT pg_temp.ok((public.aval_banco_buscar(pg_temp.id('avB'), '{"municipio_ibge":""}')->>'total')::int = 0
  AND (SELECT count(*) FROM public.dados_mercado) = 0 AND (SELECT count(*) FROM public.imoveis) = 0 AND (SELECT count(*) FROM public.avaliacao_amostras) = 0,
  'organização B não vê imóveis, dados nem amostras da A');
SELECT pg_temp.throws($$SELECT public.aval_amostras_adicionar(pg_temp.id('avB'), ARRAY['e2000000-0000-0000-0000-000000000021']::uuid[])$$, 'not_found', 'não inclui dado de outra organização');
SELECT pg_temp.throws($$SELECT public.aval_amostras_importar(pg_temp.id('avB'), pg_temp.id('av2'), NULL)$$, 'not_found', 'não importa avaliação de outra organização');
SELECT pg_temp.throws($$INSERT INTO public.avaliacao_amostras(avaliacao_id, dado_id) VALUES (pg_temp.id('avB'), 'e2000000-0000-0000-0000-000000000021')$$, 'cross_org|not_found|row-level', 'inserção direta com dado de outra organização é recusada');
SELECT pg_temp.login('a2000000-0000-0000-0000-000000000002');
SELECT pg_temp.throws($$SELECT public.aval_amostras_importar(pg_temp.id('av2'), pg_temp.id('avB'), NULL)$$, 'not_found', 'organização A não importa da B');
ROLLBACK;
