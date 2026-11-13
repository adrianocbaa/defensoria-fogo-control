-- Caso real 003/2026: quem criou a avaliação indicando outro RT entra como COLABORADOR (market.edit, sem market.select_samples).
-- Incluir amostra (cadastro novo, banco de imóveis, importação) segue market.edit; marcar Usar/No modelo, remover e congelar
-- continuam exclusivos do responsável técnico. Imóvel de outro município é vinculado sem cópia, como município comparável.
BEGIN;
\ir _fixture.sql
CREATE TEMP TABLE r(k text, j jsonb); GRANT SELECT, INSERT ON r TO authenticated;
CREATE TEMP TABLE n0(im bigint, dm bigint); GRANT SELECT, INSERT ON n0 TO authenticated;
SELECT pg_temp.login('a4000000-0000-0000-0000-000000000004');
CREATE TEMP TABLE ids(k text, v uuid); GRANT SELECT, INSERT ON ids TO authenticated;
INSERT INTO ids VALUES ('src', public.aval_create('RENOVACAO', 'MT', 'Cuiabá', '5103403', 'Sala comercial', 'a1000000-0000-0000-0000-000000000001', NULL));
SELECT pg_temp.login(NULL);
-- Imóvel de outro município (Terra Nova do Norte/MT) já existente no banco da organização, com um dado de mercado.
INSERT INTO public.imoveis(id, organization_id, tipo_imovel, endereco, bairro, municipio_nome, municipio_ibge, uf, area_construida)
VALUES ('d7000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-00000000000a', 'Sala comercial', 'Av Brasil', 'Centro', 'Terra Nova do Norte', '5108055', 'MT', 100);
INSERT INTO public.dados_mercado(id, organization_id, imovel_id, valor_utilizado, valor_unitario)
VALUES ('e7000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-00000000000a', 'd7000000-0000-0000-0000-000000000001', 12000, 120);
INSERT INTO public.avaliacao_amostras(id, avaliacao_id, dado_id) SELECT 'f7000000-0000-0000-0000-000000000009', v, 'e0000000-0000-0000-0000-000000000001' FROM ids WHERE k = 'src';

SELECT pg_temp.login('a2000000-0000-0000-0000-000000000002');
SELECT pg_temp.ok(public.aval_has_perm((SELECT av FROM fx), 'market.edit') AND NOT public.aval_has_perm((SELECT av FROM fx), 'market.select_samples'),
  'matriz preservada: colaborador tem market.edit e não tem market.select_samples');
INSERT INTO n0 SELECT (SELECT count(*) FROM public.imoveis), (SELECT count(*) FROM public.dados_mercado);
INSERT INTO r SELECT 'busca', public.aval_banco_buscar((SELECT av FROM fx), '{"uf":"MT"}');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM r, jsonb_array_elements(j->'rows') x WHERE k = 'busca' AND x->>'dado_id' = 'e7000000-0000-0000-0000-000000000001'),
  'colaborador localiza o imóvel de Terra Nova buscando em todo o estado');
INSERT INTO r SELECT 'add', public.aval_amostras_adicionar((SELECT av FROM fx), ARRAY['e7000000-0000-0000-0000-000000000001']::uuid[]);
SELECT pg_temp.ok((SELECT (j->>'adicionadas')::int FROM r WHERE k = 'add') = 1, 'colaborador adiciona o imóvel existente à avaliação');
SELECT pg_temp.ok((SELECT count(*) FROM public.imoveis) = (SELECT im FROM n0) AND (SELECT count(*) FROM public.dados_mercado) = (SELECT dm FROM n0),
  'nenhum imóvel ou dado de mercado novo foi criado');
SELECT pg_temp.ok((SELECT a.origem_territorial = 'MUNICIPIO_COMPARAVEL' AND a.origem_inclusao = 'BANCO' AND a.snapshot_inclusao IS NOT NULL
    AND a.snapshot_inclusao->'imovel'->>'municipio_ibge' = '5108055'
  FROM public.avaliacao_amostras a WHERE a.avaliacao_id = (SELECT av FROM fx) AND a.dado_id = 'e7000000-0000-0000-0000-000000000001'),
  'vínculo é município comparável, vindo do banco, com foto da inclusão');
SELECT pg_temp.ok((SELECT municipio_nome = 'Terra Nova do Norte' AND uf = 'MT' AND municipio_ibge = '5108055' FROM public.imoveis WHERE id = 'd7000000-0000-0000-0000-000000000001'),
  'o imóvel continua em Terra Nova do Norte/MT');
SELECT pg_temp.ok((SELECT count(*) FROM public.audit_events WHERE avaliacao_id = (SELECT av FROM fx) AND event_type = 'SAMPLE_ADDED' AND actor_id = 'a2000000-0000-0000-0000-000000000002') = 1,
  'inclusão do colaborador fica no histórico com o autor');

-- Cadastro novo (fluxo da tela): imóvel + dado + vínculo direto
INSERT INTO public.imoveis(id, tipo_imovel, endereco, municipio_nome, municipio_ibge, uf) VALUES ('d7000000-0000-0000-0000-000000000002', 'Sala comercial', 'Rua Nova', 'Cuiabá', '5103403', 'MT');
INSERT INTO public.dados_mercado(id, imovel_id, valor_utilizado) VALUES ('e7000000-0000-0000-0000-000000000002', 'd7000000-0000-0000-0000-000000000002', 5000);
INSERT INTO public.avaliacao_amostras(avaliacao_id, dado_id) VALUES ((SELECT av FROM fx), 'e7000000-0000-0000-0000-000000000002');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.avaliacao_amostras WHERE avaliacao_id = (SELECT av FROM fx) AND dado_id = 'e7000000-0000-0000-0000-000000000002' AND origem_territorial = 'LOCAL'),
  '"Cadastrar novo imóvel" do colaborador conclui o vínculo (antes era recusado)');

-- Importação de outra avaliação da organização
INSERT INTO r SELECT 'imp', public.aval_amostras_importar((SELECT av FROM fx), (SELECT v FROM ids WHERE k = 'src'), NULL);
SELECT pg_temp.ok((SELECT (j->>'importadas')::int + (j->>'ja_existentes')::int FROM r WHERE k = 'imp') = 1, 'colaborador importa amostras de outra avaliação');

-- Decisões continuam com o RT
UPDATE public.avaliacao_amostras SET selecionada = false WHERE avaliacao_id = (SELECT av FROM fx) AND dado_id = 'e7000000-0000-0000-0000-000000000001';
SELECT pg_temp.ok((SELECT selecionada FROM public.avaliacao_amostras WHERE avaliacao_id = (SELECT av FROM fx) AND dado_id = 'e7000000-0000-0000-0000-000000000001'),
  'colaborador não muda "Usar"/"No modelo"');
DELETE FROM public.avaliacao_amostras WHERE avaliacao_id = (SELECT av FROM fx) AND dado_id = 'e7000000-0000-0000-0000-000000000001';
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.avaliacao_amostras WHERE avaliacao_id = (SELECT av FROM fx) AND dado_id = 'e7000000-0000-0000-0000-000000000001'),
  'colaborador não remove o vínculo');
SELECT pg_temp.throws($$SELECT public.aval_dataset_prepare((SELECT av FROM fx))$$, 'permission_denied', 'colaborador não congela o conjunto');

-- Outros perfis continuam sem incluir
SELECT pg_temp.login('a3000000-0000-0000-0000-000000000003');
SELECT pg_temp.throws($$SELECT public.aval_amostras_adicionar((SELECT av FROM fx), ARRAY['e0000000-0000-0000-0000-000000000002']::uuid[])$$, 'permission_denied', 'revisor não inclui amostras');
SELECT pg_temp.login('a4000000-0000-0000-0000-000000000004');
SELECT pg_temp.throws($$SELECT public.aval_amostras_adicionar((SELECT av FROM fx), ARRAY['e0000000-0000-0000-0000-000000000002']::uuid[])$$, 'permission_denied', 'admin sem papel na avaliação não inclui amostras');
SELECT pg_temp.login('b1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$SELECT public.aval_amostras_adicionar((SELECT av FROM fx), ARRAY['e7000000-0000-0000-0000-000000000001']::uuid[])$$, 'not_found|permission_denied', 'outra organização não inclui');

-- RT mantém todas as ações
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
UPDATE public.avaliacao_amostras SET selecionada = false WHERE avaliacao_id = (SELECT av FROM fx) AND dado_id = 'e7000000-0000-0000-0000-000000000001';
SELECT pg_temp.ok(NOT (SELECT selecionada FROM public.avaliacao_amostras WHERE avaliacao_id = (SELECT av FROM fx) AND dado_id = 'e7000000-0000-0000-0000-000000000001'),
  'responsável técnico continua decidindo "Usar"');
ROLLBACK;
