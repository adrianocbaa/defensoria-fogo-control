-- "Remover da avaliação": desfaz só o vínculo da amostra (imóvel, dado de mercado e banco ficam intactos), permite readicionar,
-- recusa amostra histórica (conjunto congelado/foto) sem apagar nada e respeita permissão e organização.
BEGIN;
\ir _fixture.sql
CREATE TEMP TABLE r(k text, j jsonb); GRANT SELECT, INSERT ON r TO authenticated;
CREATE TEMP TABLE ids(k text, v uuid); GRANT SELECT, INSERT ON ids TO authenticated;
CREATE TEMP TABLE n0(im bigint, dm bigint, snap bigint); GRANT SELECT, INSERT ON n0 TO authenticated;
CREATE FUNCTION pg_temp.id(k text) RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT v FROM ids WHERE ids.k = $1 $$;
GRANT EXECUTE ON FUNCTION pg_temp.id(text) TO authenticated;
-- Avaliação em Peixoto de Azevedo criada pelo admin (entra como COLABORADOR) com RT a1.
SELECT pg_temp.login('a4000000-0000-0000-0000-000000000004');
INSERT INTO ids VALUES ('px', public.aval_create('NOVA_LOCACAO', 'MT', 'Peixoto de Azevedo', '5106422', 'Sala comercial', 'a1000000-0000-0000-0000-000000000001', NULL));
SELECT pg_temp.login(NULL);
INSERT INTO public.imoveis(id, organization_id, tipo_imovel, endereco, bairro, municipio_nome, municipio_ibge, uf, area_construida)
VALUES ('d8000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-00000000000a', 'Sala comercial', 'Av Brasil', 'Centro', 'Terra Nova do Norte', '5108055', 'MT', 100);
INSERT INTO public.dados_mercado(id, organization_id, imovel_id, valor_utilizado, valor_unitario)
VALUES ('e8000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-00000000000a', 'd8000000-0000-0000-0000-000000000001', 12000, 120);
INSERT INTO public.avaliacao_variaveis(id, avaliacao_id, nome, codigo, tipo_variavel, papel, transformacoes_autorizadas)
VALUES ('c8000000-0000-0000-0000-000000000001', pg_temp.id('px'), 'Padrão', 'padrao', 'DICOTOMICA', 'INDEPENDENTE', ARRAY['DIRECT']);

-- 1) Adicionar do banco e remover antes de congelar (colaborador)
SELECT pg_temp.login('a4000000-0000-0000-0000-000000000004');
INSERT INTO r SELECT 'add', public.aval_amostras_adicionar(pg_temp.id('px'), ARRAY['e8000000-0000-0000-0000-000000000001']::uuid[]);
INSERT INTO ids SELECT 'am1', (j->'amostras'->>0)::uuid FROM r WHERE k = 'add';
SELECT pg_temp.login(NULL);
INSERT INTO public.avaliacao_variavel_valores(avaliacao_id, variavel_id, scope_type, amostra_id, valor)
VALUES (pg_temp.id('px'), 'c8000000-0000-0000-0000-000000000001', 'AMOSTRA', pg_temp.id('am1'), 1);
INSERT INTO n0 SELECT (SELECT count(*) FROM public.imoveis), (SELECT count(*) FROM public.dados_mercado), (SELECT count(*) FROM public.avaliacao_amostra_snapshots);
SELECT pg_temp.login('a4000000-0000-0000-0000-000000000004');
DELETE FROM public.avaliacao_amostras WHERE id = pg_temp.id('am1');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.avaliacao_amostras WHERE id = pg_temp.id('am1')), 'exclusão direta pelo app continua bloqueada (só pela ação de remover)');
INSERT INTO r SELECT 'rem', public.aval_amostra_remover(pg_temp.id('px'), pg_temp.id('am1'));
SELECT pg_temp.ok((SELECT (j->>'removida')::boolean AND (j->>'valores_variaveis_removidos')::int = 1 FROM r WHERE k = 'rem')
  AND NOT EXISTS (SELECT 1 FROM public.avaliacao_amostras WHERE id = pg_temp.id('am1'))
  AND NOT EXISTS (SELECT 1 FROM public.avaliacao_variavel_valores WHERE amostra_id = pg_temp.id('am1')), 'vínculo e valores só desta amostra removidos');
-- 2) e 3) imóvel e dado continuam; 5) município do imóvel intacto
SELECT pg_temp.ok((SELECT count(*) FROM public.imoveis) = (SELECT im FROM n0) AND (SELECT count(*) FROM public.dados_mercado) = (SELECT dm FROM n0),
  'nenhum imóvel ou dado de mercado foi apagado');
SELECT pg_temp.ok((SELECT municipio_nome = 'Terra Nova do Norte' AND municipio_ibge = '5108055' AND uf = 'MT' FROM public.imoveis WHERE id = 'd8000000-0000-0000-0000-000000000001'),
  'imóvel de Terra Nova continua em Terra Nova do Norte/MT');
INSERT INTO r SELECT 'busca', public.aval_banco_buscar(pg_temp.id('px'), '{"uf":"MT"}');
SELECT pg_temp.ok((SELECT (x->>'ja_na_avaliacao')::boolean = false FROM r, jsonb_array_elements(j->'rows') x WHERE k = 'busca' AND x->>'dado_id' = 'e8000000-0000-0000-0000-000000000001'),
  'imóvel continua em "Buscar imóveis existentes", como não incluído');
SELECT pg_temp.ok((SELECT count(*) FROM public.audit_events WHERE avaliacao_id = pg_temp.id('px') AND event_type = 'AMOSTRA_REMOVIDA_DA_AVALIACAO'
  AND entity_id = pg_temp.id('am1') AND actor_id = 'a4000000-0000-0000-0000-000000000004'
  AND details_json->>'dado_id' = 'e8000000-0000-0000-0000-000000000001' AND details_json->>'imovel_id' = 'd8000000-0000-0000-0000-000000000001') = 1,
  'remoção registrada no histórico com amostra, dado, imóvel e autor');
-- 4) readicionar
INSERT INTO r SELECT 'add2', public.aval_amostras_adicionar(pg_temp.id('px'), ARRAY['e8000000-0000-0000-0000-000000000001']::uuid[]);
SELECT pg_temp.ok((SELECT (j->>'adicionadas')::int FROM r WHERE k = 'add2') = 1
  AND (SELECT origem_territorial = 'MUNICIPIO_COMPARAVEL' AND snapshot_inclusao IS NOT NULL AND id <> pg_temp.id('am1')
       FROM public.avaliacao_amostras WHERE avaliacao_id = pg_temp.id('px') AND dado_id = 'e8000000-0000-0000-0000-000000000001'),
  'readicionar cria novo vínculo com nova foto da inclusão');

-- 6) e 7) amostra de conjunto congelado: nada é apagado e não há registro de remoção
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$SELECT public.aval_amostra_remover((SELECT av FROM fx), 'f0000000-0000-0000-0000-000000000001')$$, 'amostra_historica', 'amostra de conjunto congelado não é removida');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.avaliacao_amostras WHERE id = 'f0000000-0000-0000-0000-000000000001')
  AND (SELECT count(*) FROM public.avaliacao_amostra_snapshots) = (SELECT snap FROM n0)
  AND NOT EXISTS (SELECT 1 FROM public.audit_events WHERE avaliacao_id = (SELECT av FROM fx) AND event_type = 'AMOSTRA_REMOVIDA_DA_AVALIACAO'),
  'vínculo, fotos do conjunto e histórico ficam intactos; nenhuma remoção registrada');
DO $$ DECLARE v_det text; BEGIN
  PERFORM public.aval_amostra_remover((SELECT av FROM fx), 'f0000000-0000-0000-0000-000000000001');
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_det = PG_EXCEPTION_DETAIL;
  IF NOT ((SQLERRM ~ 'amostra_historica') AND (v_det::jsonb->'motivos') ? 'CONJUNTO_CONGELADO') THEN RAISE EXCEPTION 'FALHA: detalhe sem motivo'; END IF;
  RAISE NOTICE 'OK erro traz o motivo CONJUNTO_CONGELADO para a tela orientar';
END $$;
-- Amostra nova (sem congelar) na avaliação fx, para testar permissões
INSERT INTO r SELECT 'addfx', public.aval_amostras_adicionar((SELECT av FROM fx), ARRAY['e8000000-0000-0000-0000-000000000001']::uuid[]);
INSERT INTO ids SELECT 'amfx', (j->'amostras'->>0)::uuid FROM r WHERE k = 'addfx';

-- 8) e 9) permissões e organização
SELECT pg_temp.login('a3000000-0000-0000-0000-000000000003');
SELECT pg_temp.throws($$SELECT public.aval_amostra_remover((SELECT av FROM fx), pg_temp.id('amfx'))$$, 'permission_denied', 'revisor não remove amostra');
SELECT pg_temp.login('a5000000-0000-0000-0000-000000000005');
SELECT pg_temp.throws($$SELECT public.aval_amostra_remover((SELECT av FROM fx), pg_temp.id('amfx'))$$, 'not_found|permission_denied', 'contratada não remove amostra');
SELECT pg_temp.login('b2000000-0000-0000-0000-000000000002');
SELECT pg_temp.throws($$SELECT public.aval_amostra_remover((SELECT av FROM fx), pg_temp.id('amfx'))$$, 'not_found', 'admin de outra organização não remove');
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$SELECT public.aval_amostra_remover(pg_temp.id('px'), pg_temp.id('amfx'))$$, 'not_found', 'amostra de outra avaliação não é removida por esta');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.avaliacao_amostras WHERE id = pg_temp.id('amfx')), 'tentativas recusadas não removem nada');
SELECT pg_temp.ok((public.aval_amostra_remover((SELECT av FROM fx), pg_temp.id('amfx'))->>'removida')::boolean, 'responsável técnico remove amostra não congelada');
ROLLBACK;
