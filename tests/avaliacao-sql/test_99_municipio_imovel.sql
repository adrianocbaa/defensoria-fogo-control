-- Município pertence ao imóvel: cadastro com município próprio, origem territorial coerente, duplicidade pelo município real,
-- correção auditada sem quebrar vínculos nem fotos congeladas, nenhum outro imóvel alterado e isolamento entre organizações.
BEGIN;
\ir _fixture.sql
CREATE TEMP TABLE ids(k text, v uuid); GRANT SELECT, INSERT ON ids TO authenticated;
CREATE FUNCTION pg_temp.id(k text) RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT v FROM ids WHERE ids.k = $1 $$;
GRANT EXECUTE ON FUNCTION pg_temp.id(text) TO authenticated;
-- Força a conferência adiada do município (normalmente no fim da transação).
CREATE FUNCTION pg_temp.check_now() RETURNS void LANGUAGE plpgsql AS $$ BEGIN SET CONSTRAINTS ALL IMMEDIATE; SET CONSTRAINTS ALL DEFERRED; END $$;
GRANT EXECUTE ON FUNCTION pg_temp.check_now() TO authenticated;

-- Avaliação em Peixoto de Azevedo/MT (5106422); amostras em Terra Nova do Norte/MT (5108055)
SELECT pg_temp.login('a4000000-0000-0000-0000-000000000004');
INSERT INTO ids VALUES ('avP', public.aval_create('NOVA_LOCACAO', 'MT', 'Peixoto de Azevedo', '5106422', 'Sala comercial', 'a1000000-0000-0000-0000-000000000001', NULL));
SELECT pg_temp.login(NULL);
CREATE TEMP TABLE outros0 AS SELECT id, md5(to_jsonb(i)::text) h FROM public.imoveis i;
GRANT SELECT ON outros0 TO authenticated;

-- 1) Novo imóvel de Terra Nova do Norte cadastrado numa avaliação de Peixoto (fluxo da tela, como RT)
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
INSERT INTO public.imoveis(id, tipo_imovel, endereco, numero, bairro, municipio_nome, municipio_ibge, uf, area_construida)
VALUES ('d9000000-0000-0000-0000-000000000001', 'Sala comercial', 'Avenida Brasil', '100', 'Centro', 'Terra Nova do Norte', '5108055', 'MT', 80);
INSERT INTO public.dados_mercado(id, imovel_id, valor_ofertado, valor_utilizado, valor_unitario, data_observacao)
VALUES ('e9000000-0000-0000-0000-000000000001', 'd9000000-0000-0000-0000-000000000001', 2000, 2000, 25, '2026-11-10');
-- tela antiga mandava "Mesmo município" por padrão: o servidor corrige
INSERT INTO public.avaliacao_amostras(id, avaliacao_id, dado_id, origem_territorial)
VALUES ('f9000000-0000-0000-0000-000000000001', pg_temp.id('avP'), 'e9000000-0000-0000-0000-000000000001', 'LOCAL');
SELECT pg_temp.check_now();
SELECT pg_temp.ok((SELECT municipio_nome = 'Terra Nova do Norte' AND municipio_ibge = '5108055' AND uf = 'MT' FROM public.imoveis WHERE id = 'd9000000-0000-0000-0000-000000000001'),
  'imóvel de Terra Nova cadastrado na avaliação de Peixoto grava Terra Nova do Norte/MT e IBGE 5108055');
SELECT pg_temp.ok((SELECT origem_territorial FROM public.avaliacao_amostras WHERE id = 'f9000000-0000-0000-0000-000000000001') = 'MUNICIPIO_COMPARAVEL',
  'origem territorial da amostra de outro município é externa (município comparável), mesmo se a tela enviar "mesmo município"');
SELECT pg_temp.ok((SELECT snapshot_inclusao->'imovel'->>'municipio_ibge' FROM public.avaliacao_amostras WHERE id = 'f9000000-0000-0000-0000-000000000001') = '5108055',
  'foto da inclusão guarda o município real do imóvel');

-- 2) Imóvel local: sem alterar o padrão, herda Peixoto e continua "mesmo município"
INSERT INTO public.imoveis(id, tipo_imovel, endereco, numero, municipio_nome, municipio_ibge, uf)
VALUES ('d9000000-0000-0000-0000-000000000002', 'Sala comercial', 'Rua Peixoto', '5', 'Peixoto de Azevedo', '5106422', 'MT');
INSERT INTO public.dados_mercado(id, imovel_id, valor_utilizado) VALUES ('e9000000-0000-0000-0000-000000000002', 'd9000000-0000-0000-0000-000000000002', 1500);
INSERT INTO public.avaliacao_amostras(avaliacao_id, dado_id, origem_territorial) VALUES (pg_temp.id('avP'), 'e9000000-0000-0000-0000-000000000002', 'LOCAL');
SELECT pg_temp.ok((SELECT origem_territorial FROM public.avaliacao_amostras WHERE dado_id = 'e9000000-0000-0000-0000-000000000002') = 'LOCAL',
  'imóvel local herda Peixoto por padrão e permanece "mesmo município"');
INSERT INTO public.imoveis(id, tipo_imovel, municipio_nome, municipio_ibge, uf) VALUES ('d9000000-0000-0000-0000-000000000003', 'Sala comercial', 'Terra Nova do Norte', '5108055', 'MT');
INSERT INTO public.dados_mercado(id, imovel_id, valor_utilizado) VALUES ('e9000000-0000-0000-0000-000000000003', 'd9000000-0000-0000-0000-000000000003', 1500);
INSERT INTO public.avaliacao_amostras(avaliacao_id, dado_id, origem_territorial) VALUES (pg_temp.id('avP'), 'e9000000-0000-0000-0000-000000000003', 'CONTRATO_PUBLICO_EXTERNO');
SELECT pg_temp.ok((SELECT origem_territorial FROM public.avaliacao_amostras WHERE dado_id = 'e9000000-0000-0000-0000-000000000003') = 'CONTRATO_PUBLICO_EXTERNO',
  'outra origem escolhida pelo avaliador (contrato público externo) é respeitada');

-- 3) Duplicidade usa o município real do imóvel
INSERT INTO public.imoveis(id, tipo_imovel, endereco, numero, municipio_nome, municipio_ibge, uf)
VALUES ('d9000000-0000-0000-0000-000000000004', 'Sala comercial', 'Avenida Brasil', '100', 'Peixoto de Azevedo', '5106422', 'MT');
SELECT pg_temp.check_now();
SELECT pg_temp.ok((SELECT array_agg(imovel_id) FROM public.aval_find_duplicates('Avenida Brasil', '100', NULL, '5108055', NULL, NULL, NULL, NULL, 80, '{}', NULL, NULL, NULL))
  = ARRAY['d9000000-0000-0000-0000-000000000001']::uuid[], 'mesmo endereço em Terra Nova encontra só o imóvel de Terra Nova');
SELECT pg_temp.ok((SELECT array_agg(imovel_id) FROM public.aval_find_duplicates('Avenida Brasil', '100', NULL, '5106422', NULL, NULL, NULL, NULL, 80, '{}', NULL, NULL, NULL))
  = ARRAY['d9000000-0000-0000-0000-000000000004']::uuid[], 'mesmo endereço em Peixoto encontra só o imóvel de Peixoto');

-- 4) Município incoerente é recusado (código de outra UF, código inválido, sem nome)
SELECT pg_temp.throws($$INSERT INTO public.imoveis(tipo_imovel, municipio_nome, municipio_ibge, uf) VALUES ('Sala', 'Cuiabá', '3148004', 'MT'); SELECT pg_temp.check_now()$$,
  'aval:invalid_municipio', 'código IBGE de outra UF é recusado');
SELECT pg_temp.throws($$INSERT INTO public.imoveis(tipo_imovel, municipio_nome, municipio_ibge, uf) VALUES ('Sala', 'X', '51', 'MT'); SELECT pg_temp.check_now()$$,
  'aval:invalid_municipio', 'código IBGE que não tem 7 dígitos é recusado');
SELECT pg_temp.throws($$INSERT INTO public.imoveis(tipo_imovel, municipio_nome, municipio_ibge, uf) VALUES ('Sala', ' ', '5108055', 'MT'); SELECT pg_temp.check_now()$$,
  'aval:invalid_municipio', 'código IBGE sem nome do município é recusado');

-- 5) Cadastro antigo: imóvel de Terra Nova gravado como Peixoto, amostra no conjunto congelado
SELECT pg_temp.login(NULL);
INSERT INTO public.imoveis(id, organization_id, tipo_imovel, endereco, numero, bairro, municipio_nome, municipio_ibge, uf, area_construida, area_terreno)
VALUES ('d9000000-0000-0000-0000-000000000009', '0a000000-0000-0000-0000-00000000000a', 'Sala comercial', 'Rua das Palmeiras', '9', 'Centro', 'Peixoto de Azevedo', '5106422', 'MT', 60, 120);
INSERT INTO public.dados_mercado(id, organization_id, imovel_id, valor_ofertado, valor_utilizado, valor_unitario, data_observacao)
VALUES ('e9000000-0000-0000-0000-000000000009', '0a000000-0000-0000-0000-00000000000a', 'd9000000-0000-0000-0000-000000000009', 1800, 1800, 30, '2026-11-11');
INSERT INTO public.avaliacao_amostras(id, avaliacao_id, dado_id, origem_territorial) VALUES ('f9000000-0000-0000-0000-000000000009', pg_temp.id('avP'), 'e9000000-0000-0000-0000-000000000009', 'LOCAL');
INSERT INTO public.avaliacao_conjuntos_dados(id, avaliacao_id, versao, status) VALUES ('19000000-0000-0000-0000-000000000001', pg_temp.id('avP'), 1, 'RASCUNHO');
INSERT INTO public.avaliacao_conjunto_amostras(organization_id, avaliacao_id, conjunto_id, amostra_id, dado_id)
VALUES ('0a000000-0000-0000-0000-00000000000a', pg_temp.id('avP'), '19000000-0000-0000-0000-000000000001', 'f9000000-0000-0000-0000-000000000009', 'e9000000-0000-0000-0000-000000000009');
INSERT INTO public.avaliacao_amostra_snapshots(avaliacao_id, conjunto_id, amostra_id, dado_id, imovel_id, dados, hash)
VALUES (pg_temp.id('avP'), '19000000-0000-0000-0000-000000000001', 'f9000000-0000-0000-0000-000000000009', 'e9000000-0000-0000-0000-000000000009', 'd9000000-0000-0000-0000-000000000009',
  jsonb_build_object('imovel', jsonb_build_object('municipio_nome', 'Peixoto de Azevedo', 'municipio_ibge', '5106422')), 'h-legado');
UPDATE public.avaliacao_conjuntos_dados SET status = 'CONGELADO' WHERE id = '19000000-0000-0000-0000-000000000001';
CREATE TEMP TABLE antes AS SELECT
  (SELECT md5((to_jsonb(i) - ARRAY['municipio_nome','municipio_ibge','uf','updated_at'])::text) FROM public.imoveis i WHERE id = 'd9000000-0000-0000-0000-000000000009') im,
  (SELECT md5(to_jsonb(d)::text) FROM public.dados_mercado d WHERE id = 'e9000000-0000-0000-0000-000000000009') dm,
  (SELECT md5((snapshot_inclusao)::text) || snapshot_chave FROM public.avaliacao_amostras WHERE id = 'f9000000-0000-0000-0000-000000000009') foto,
  (SELECT md5(dados::text) || hash FROM public.avaliacao_amostra_snapshots WHERE amostra_id = 'f9000000-0000-0000-0000-000000000009') conj;
GRANT SELECT ON antes TO authenticated;
INSERT INTO outros0 SELECT id, md5(to_jsonb(i)::text) FROM public.imoveis i WHERE id NOT IN (SELECT id FROM outros0);

CREATE TEMP TABLE lote AS SELECT jsonb_build_array(
  jsonb_build_object('entity_type','imovel','entity_id','d9000000-0000-0000-0000-000000000009','campo','uf','valor','MT','contexto',jsonb_build_object('dado_id','e9000000-0000-0000-0000-000000000009')),
  jsonb_build_object('entity_type','imovel','entity_id','d9000000-0000-0000-0000-000000000009','campo','municipio_ibge','valor','5108055','contexto',jsonb_build_object('dado_id','e9000000-0000-0000-0000-000000000009')),
  jsonb_build_object('entity_type','imovel','entity_id','d9000000-0000-0000-0000-000000000009','campo','municipio_nome','valor','Terra Nova do Norte','contexto',jsonb_build_object('dado_id','e9000000-0000-0000-0000-000000000009')),
  jsonb_build_object('entity_type','amostra','entity_id','f9000000-0000-0000-0000-000000000009','campo','origem_territorial','valor','MUNICIPIO_COMPARAVEL')) j;
GRANT SELECT ON lote TO authenticated;

-- Outra organização não corrige
SELECT pg_temp.login('b1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$SELECT public.aval_apply_changes(pg_temp.id('avP'), (SELECT j FROM lote), 'teste')$$, 'aval:not_found', 'outra organização não corrige o município');
-- Direto na tabela não passa (imóvel vinculado a avaliação usa o fluxo de correção)
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$UPDATE public.imoveis SET municipio_nome = 'Terra Nova do Norte', municipio_ibge = '5108055' WHERE id = 'd9000000-0000-0000-0000-000000000009'$$,
  'aval:use_change_flow', 'alteração direta do município de imóvel vinculado é bloqueada');
SELECT pg_temp.ok((public.aval_evaluate_changes_impact(pg_temp.id('avP'), (SELECT j FROM lote))->>'nivel') = 'DATASET',
  'corrigir município de amostra do conjunto congelado pede nova versão do conjunto');
CREATE TEMP TABLE res AS SELECT public.aval_apply_changes(pg_temp.id('avP'), (SELECT j FROM lote), 'Imóvel é de Terra Nova do Norte') j;
SELECT pg_temp.check_now();
SELECT pg_temp.ok((SELECT municipio_nome = 'Terra Nova do Norte' AND municipio_ibge = '5108055' AND uf = 'MT' FROM public.imoveis WHERE id = 'd9000000-0000-0000-0000-000000000009'),
  'correção grava Terra Nova do Norte/MT 5108055 no mesmo imóvel');
SELECT pg_temp.ok((SELECT md5((to_jsonb(i) - ARRAY['municipio_nome','municipio_ibge','uf','updated_at'])::text) FROM public.imoveis i WHERE id = 'd9000000-0000-0000-0000-000000000009') = (SELECT im FROM antes)
  AND (SELECT md5(to_jsonb(d)::text) FROM public.dados_mercado d WHERE id = 'e9000000-0000-0000-0000-000000000009') = (SELECT dm FROM antes),
  'demais dados do imóvel e o dado de mercado (valor, área, endereço) ficam idênticos');
SELECT pg_temp.ok((SELECT dado_id = 'e9000000-0000-0000-0000-000000000009' AND origem_territorial = 'MUNICIPIO_COMPARAVEL' FROM public.avaliacao_amostras WHERE id = 'f9000000-0000-0000-0000-000000000009')
  AND (SELECT imovel_id FROM public.dados_mercado WHERE id = 'e9000000-0000-0000-0000-000000000009') = 'd9000000-0000-0000-0000-000000000009',
  'vínculos amostra → dado → imóvel preservados e origem passa a município comparável');
SELECT pg_temp.ok((SELECT md5((snapshot_inclusao)::text) || snapshot_chave FROM public.avaliacao_amostras WHERE id = 'f9000000-0000-0000-0000-000000000009') = (SELECT foto FROM antes)
  AND (SELECT md5(dados::text) || hash FROM public.avaliacao_amostra_snapshots WHERE amostra_id = 'f9000000-0000-0000-0000-000000000009') = (SELECT conj FROM antes),
  'foto da inclusão e foto do conjunto congelado não são reescritas');
SELECT pg_temp.ok((SELECT count(*) FROM public.audit_events WHERE avaliacao_id = pg_temp.id('avP') AND event_type = 'CHANGE_APPLIED'
  AND details_json->>'campo' IN ('municipio_nome','municipio_ibge','uf','origem_territorial')) >= 3
  AND EXISTS (SELECT 1 FROM public.audit_events WHERE avaliacao_id = pg_temp.id('avP') AND event_type = 'CHANGE_APPLIED' AND details_json->>'campo' = 'municipio_nome'
    AND details_json->>'anterior' = '"Peixoto de Azevedo"' AND details_json->>'novo' = '"Terra Nova do Norte"'),
  'histórico registra antes/depois do município');
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.imoveis i JOIN outros0 o ON o.id = i.id
  WHERE i.id <> 'd9000000-0000-0000-0000-000000000009' AND md5(to_jsonb(i)::text) <> o.h), 'nenhum outro imóvel da organização foi alterado');

-- 6) Troca de UF no mesmo lote: código e UF gravados um a um, conferidos juntos no fim
SELECT pg_temp.login(NULL);
INSERT INTO public.imoveis(id, organization_id, tipo_imovel, municipio_nome, municipio_ibge, uf) VALUES ('d9000000-0000-0000-0000-000000000010', '0a000000-0000-0000-0000-00000000000a', 'Sala', 'Peixoto de Azevedo', '5106422', 'MT');
INSERT INTO public.dados_mercado(id, organization_id, imovel_id, valor_utilizado) VALUES ('e9000000-0000-0000-0000-000000000010', '0a000000-0000-0000-0000-00000000000a', 'd9000000-0000-0000-0000-000000000010', 1000);
INSERT INTO public.avaliacao_amostras(id, avaliacao_id, dado_id) VALUES ('f9000000-0000-0000-0000-000000000010', pg_temp.id('avP'), 'e9000000-0000-0000-0000-000000000010');
SELECT pg_temp.check_now();
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT public.aval_apply_changes(pg_temp.id('avP'), jsonb_build_array(
  jsonb_build_object('entity_type','imovel','entity_id','d9000000-0000-0000-0000-000000000010','campo','municipio_ibge','valor','5003702','contexto',jsonb_build_object('dado_id','e9000000-0000-0000-0000-000000000010')),
  jsonb_build_object('entity_type','imovel','entity_id','d9000000-0000-0000-0000-000000000010','campo','municipio_nome','valor','Dourados','contexto',jsonb_build_object('dado_id','e9000000-0000-0000-0000-000000000010')),
  jsonb_build_object('entity_type','imovel','entity_id','d9000000-0000-0000-0000-000000000010','campo','uf','valor','MS','contexto',jsonb_build_object('dado_id','e9000000-0000-0000-0000-000000000010'))), NULL);
SELECT pg_temp.check_now();
SELECT pg_temp.ok((SELECT uf = 'MS' AND municipio_ibge = '5003702' FROM public.imoveis WHERE id = 'd9000000-0000-0000-0000-000000000010'), 'troca de UF e município no mesmo lote é aceita');
ROLLBACK;
