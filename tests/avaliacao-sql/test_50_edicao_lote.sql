-- Edição completa em lote: impacto agregado, derivados, snapshots imutáveis, clone de imóvel compartilhado, permissões e trilha antes/depois.
BEGIN;
\ir _fixture.sql
-- Cenário: amostra 1 (dado e1 / imóvel d1) no conjunto congelado; amostra 2 (e2/d2) com imóvel compartilhado por e9; avaliando d0..10.
UPDATE public.avaliacao_conjuntos_dados SET status = 'RASCUNHO' WHERE id = '10000000-0000-0000-0000-000000000001';
INSERT INTO public.avaliacao_conjunto_amostras(organization_id, avaliacao_id, conjunto_id, amostra_id, dado_id)
SELECT '0a000000-0000-0000-0000-00000000000a', av, '10000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001' FROM fx;
UPDATE public.avaliacao_conjuntos_dados SET status = 'CONGELADO' WHERE id = '10000000-0000-0000-0000-000000000001';
UPDATE public.imoveis SET area_construida = 50, area_terreno = 100 WHERE id IN ('d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002');
UPDATE public.dados_mercado SET valor_utilizado = 1000, valor_unitario = 20 WHERE id IN ('e0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000002');
INSERT INTO public.dados_mercado(id, organization_id, imovel_id) VALUES ('e0000000-0000-0000-0000-000000000009', '0a000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-000000000002');
INSERT INTO public.imoveis(id, organization_id, tipo_imovel, area_construida) VALUES
  ('d0000000-0000-0000-0000-000000000010', '0a000000-0000-0000-0000-00000000000a', 'Sala comercial', 120),
  ('d0000000-0000-0000-0000-000000000011', '0a000000-0000-0000-0000-00000000000a', 'Sala comercial', 80);
INSERT INTO public.avaliacao_imoveis(organization_id, avaliacao_id, imovel_id, papel) SELECT '0a000000-0000-0000-0000-00000000000a', av, 'd0000000-0000-0000-0000-000000000010', 'AVALIANDO' FROM fx;
UPDATE public.avaliacao_variaveis SET campo_origem = 'area_construida' WHERE id = 'c0000000-0000-0000-0000-000000000002';
UPDATE public.avaliacao_variaveis SET campo_origem = 'valor_unitario' WHERE id = 'c0000000-0000-0000-0000-000000000001';
INSERT INTO public.avaliacao_variavel_valores(avaliacao_id, variavel_id, scope_type, amostra_id, valor) SELECT av, 'c0000000-0000-0000-0000-000000000002', 'AMOSTRA', 'f0000000-0000-0000-0000-000000000001', 50 FROM fx;
INSERT INTO public.avaliacao_variavel_valores(avaliacao_id, variavel_id, scope_type, amostra_id, valor) SELECT av, 'c0000000-0000-0000-0000-000000000002', 'AMOSTRA', 'f0000000-0000-0000-0000-000000000002', 77 FROM fx;
CREATE TEMP TABLE snap0 AS SELECT id, dados, hash FROM public.avaliacao_amostra_snapshots;
GRANT SELECT ON snap0 TO authenticated;
CREATE TEMP TABLE cid(k text, v uuid); GRANT SELECT, INSERT ON cid TO authenticated;

-- 1) Valor administrativo: edição completa em um lote, um único diálogo, maior nível
SELECT pg_temp.login('a2000000-0000-0000-0000-000000000002');
INSERT INTO public.avaliacao_valores_administrativos(id, avaliacao_id, tipo, valor, data_referencia, observacao)
SELECT '20000000-0000-0000-0000-000000000001', av, 'CONTRATO_ATUAL', 5000, '2026-01-10', 'inicial' FROM fx;
CREATE TEMP TABLE ev1 AS SELECT public.aval_evaluate_changes_impact((SELECT av FROM fx), jsonb_build_array(
  jsonb_build_object('entity_type','valor_administrativo','entity_id','20000000-0000-0000-0000-000000000001','campo','data_referencia','valor','2026-02-01'),
  jsonb_build_object('entity_type','valor_administrativo','entity_id','20000000-0000-0000-0000-000000000001','campo','observacao','valor','corrigida'))) AS j;
SELECT pg_temp.ok((SELECT j->>'nivel' FROM ev1) = 'REPORT_ONLY', 'lote só com data/observação = REPORT_ONLY');
CREATE TEMP TABLE ev2 AS SELECT public.aval_evaluate_changes_impact((SELECT av FROM fx), jsonb_build_array(
  jsonb_build_object('entity_type','valor_administrativo','entity_id','20000000-0000-0000-0000-000000000001','campo','tipo','valor','SOLICITADO_PROPRIETARIO'),
  jsonb_build_object('entity_type','valor_administrativo','entity_id','20000000-0000-0000-0000-000000000001','campo','valor','valor',6200.5),
  jsonb_build_object('entity_type','valor_administrativo','entity_id','20000000-0000-0000-0000-000000000001','campo','data_referencia','valor','2026-02-01'),
  jsonb_build_object('entity_type','valor_administrativo','entity_id','20000000-0000-0000-0000-000000000001','campo','observacao','valor','corrigida'))) AS j;
SELECT pg_temp.ok((SELECT j->>'nivel' FROM ev2) = 'ECONOMIC_RESULT' AND jsonb_array_length((SELECT j->'campos' FROM ev2)) = 4,
  'impacto em lote escolhe o maior nível (ECONOMIC_RESULT) e lista os 4 campos');
CREATE TEMP TABLE ap1 AS SELECT public.aval_apply_changes((SELECT av FROM fx), jsonb_build_array(
  jsonb_build_object('entity_type','valor_administrativo','entity_id','20000000-0000-0000-0000-000000000001','campo','tipo','valor','SOLICITADO_PROPRIETARIO'),
  jsonb_build_object('entity_type','valor_administrativo','entity_id','20000000-0000-0000-0000-000000000001','campo','valor','valor',6200.5),
  jsonb_build_object('entity_type','valor_administrativo','entity_id','20000000-0000-0000-0000-000000000001','campo','data_referencia','valor','2026-02-01'),
  jsonb_build_object('entity_type','valor_administrativo','entity_id','20000000-0000-0000-0000-000000000001','campo','observacao','valor','corrigida')), 'correção do contrato') AS j;
SELECT pg_temp.ok((SELECT tipo = 'SOLICITADO_PROPRIETARIO' AND valor = 6200.50 AND data_referencia = '2026-02-01' AND observacao = 'corrigida'
  FROM public.avaliacao_valores_administrativos WHERE id = '20000000-0000-0000-0000-000000000001') AND (SELECT (j->>'aplicados')::int FROM ap1) = 4,
  'valor administrativo completo (tipo, valor, data, observação) salvo em uma ação');
SELECT pg_temp.ok((SELECT count(*) FROM public.audit_events WHERE event_type = 'CHANGE_APPLIED' AND details_json->>'lote' = (SELECT j->>'lote' FROM ap1)) = 4
  AND (SELECT details_json->>'anterior' = 'CONTRATO_ATUAL' AND details_json->>'novo' = 'SOLICITADO_PROPRIETARIO' FROM public.audit_events
       WHERE event_type = 'CHANGE_APPLIED' AND details_json->>'campo' = 'tipo' AND details_json->>'lote' = (SELECT j->>'lote' FROM ap1))
  AND (SELECT (details_json->>'anterior')::numeric = 5000 AND (details_json->>'novo')::numeric = 6200.5 FROM public.audit_events
       WHERE event_type = 'CHANGE_APPLIED' AND details_json->>'campo' = 'valor' AND details_json->>'lote' = (SELECT j->>'lote' FROM ap1)),
  'audit_events registra antes/depois por campo');
SELECT pg_temp.ok((SELECT j->>'nivel' FROM ap1) = 'ECONOMIC_RESULT' AND (SELECT count(*) FROM public.audit_events WHERE event_type = 'CHANGES_APPLIED') = 1,
  'lote aplicado registra um resumo único com o maior nível');
SELECT pg_temp.throws($$SELECT public.aval_apply_changes((SELECT av FROM fx), jsonb_build_array(jsonb_build_object('entity_type','valor_administrativo',
  'entity_id','20000000-0000-0000-0000-000000000001','campo','valor','valor',-1)), NULL)$$, 'invalid_value', 'valor administrativo negativo é recusado');
SELECT pg_temp.throws($$SELECT public.aval_apply_changes((SELECT av FROM fx), jsonb_build_array(jsonb_build_object('entity_type','valor_administrativo',
  'entity_id','20000000-0000-0000-0000-000000000001','campo','organization_id','valor','0b000000-0000-0000-0000-00000000000b')), NULL)$$, 'field_not_allowed', 'campo fora da lista permitida é recusado');
SELECT pg_temp.ok((SELECT (j->>'aplicados')::int FROM (SELECT public.aval_apply_changes((SELECT av FROM fx), jsonb_build_array(jsonb_build_object('entity_type','valor_administrativo',
  'entity_id','20000000-0000-0000-0000-000000000001','campo','observacao','valor','corrigida')), NULL) j) x) = 0, 'campo sem diferença não grava nada');

-- 2) Área do avaliando antes e depois de existir modelo calculado
SELECT pg_temp.ok((public.aval_evaluate_changes_impact((SELECT av FROM fx), jsonb_build_array(jsonb_build_object('entity_type','imovel',
  'entity_id','d0000000-0000-0000-0000-000000000010','campo','area_construida','valor',130)))->>'nivel') = 'REPORT_ONLY', 'área do avaliando antes de modelo calculado = REPORT_ONLY');
-- O snapshot sintético da fixture não reflete o cadastro vivo (área/preço trocados acima para campos estruturados), então
-- aval_model_create recusaria o conjunto como desatualizado; este teste cobre só a matriz de impacto e cria o modelo como dono.
SELECT pg_temp.login(NULL);
CREATE TEMP TABLE m AS SELECT id FROM (SELECT gen_random_uuid() AS id) x;
INSERT INTO public.avaliacao_modelos(id, organization_id, avaliacao_id, conjunto_id, numero, nome, origem_tipo, dependente_variavel_id, dependente_transformacao)
SELECT (SELECT id FROM m), '0a000000-0000-0000-0000-00000000000a', av, '10000000-0000-0000-0000-000000000001', 1, 'Manual', 'MANUAL', 'c0000000-0000-0000-0000-000000000001', 'DIRECT' FROM fx;
INSERT INTO public.avaliacao_modelo_variaveis(organization_id, avaliacao_id, modelo_id, variavel_id, transformacao, ordem)
SELECT '0a000000-0000-0000-0000-00000000000a', av, (SELECT id FROM m), 'c0000000-0000-0000-0000-000000000002', 'DIRECT', 1 FROM fx;
UPDATE public.avaliacao_modelos SET status = 'CALCULADO' WHERE id = (SELECT id FROM m);
UPDATE public.avaliacao_variavel_valores SET valor = 120 WHERE scope_type = 'AVALIANDO' AND variavel_id = 'c0000000-0000-0000-0000-000000000002';
UPDATE public.avaliacao_modelos SET stale = false WHERE id = (SELECT id FROM m);
GRANT SELECT ON m TO authenticated;
SELECT pg_temp.login('a2000000-0000-0000-0000-000000000002');
SELECT pg_temp.ok((public.aval_evaluate_changes_impact((SELECT av FROM fx), jsonb_build_array(jsonb_build_object('entity_type','imovel',
  'entity_id','d0000000-0000-0000-0000-000000000010','campo','area_construida','valor',130)))->>'nivel') = 'MODEL', 'área do avaliando com modelo calculado = MODEL');
SELECT pg_temp.ok((public.aval_evaluate_changes_impact((SELECT av FROM fx), jsonb_build_array(jsonb_build_object('entity_type','imovel',
  'entity_id','d0000000-0000-0000-0000-000000000010','campo','endereco','valor','Rua Nova')))->>'nivel') = 'REPORT_ONLY', 'endereço do avaliando sem variável locacional = REPORT_ONLY');
SELECT public.aval_apply_changes((SELECT av FROM fx), jsonb_build_array(jsonb_build_object('entity_type','imovel',
  'entity_id','d0000000-0000-0000-0000-000000000010','campo','area_construida','valor',130)), 'área corrigida');
SELECT pg_temp.ok((SELECT stale FROM public.avaliacao_modelos WHERE id = (SELECT id FROM m))
  AND (SELECT valor FROM public.avaliacao_variavel_valores WHERE scope_type = 'AVALIANDO' AND variavel_id = 'c0000000-0000-0000-0000-000000000002') = 130
  AND (SELECT count(*) FROM public.audit_events WHERE event_type = 'INVALIDATION_APPLIED' AND details_json->>'motivo' LIKE 'Correção de dados%' AND details_json->>'nivel' = 'MODEL') = 1,
  'área do avaliando: modelo desatualizado uma única vez e variável do avaliando sincronizada');

-- 3) Área de amostra antes/depois do conjunto congelado; valor unitário recalculado; mesmo id; snapshot intacto
SELECT pg_temp.ok((public.aval_evaluate_changes_impact((SELECT av FROM fx), jsonb_build_array(jsonb_build_object('entity_type','imovel',
  'entity_id','d0000000-0000-0000-0000-000000000003','campo','area_construida','valor',40)))->>'nivel') = 'REPORT_ONLY', 'área de amostra fora do conjunto congelado = REPORT_ONLY');
SELECT pg_temp.ok((public.aval_evaluate_changes_impact((SELECT av FROM fx), jsonb_build_array(jsonb_build_object('entity_type','imovel',
  'entity_id','d0000000-0000-0000-0000-000000000001','campo','area_construida','valor',40,'contexto',jsonb_build_object('dado_id','e0000000-0000-0000-0000-000000000001'))))->>'nivel') = 'DATASET',
  'área de amostra no conjunto congelado = DATASET');
CREATE TEMP TABLE ap3 AS SELECT public.aval_apply_changes((SELECT av FROM fx), jsonb_build_array(
  jsonb_build_object('entity_type','imovel','entity_id','d0000000-0000-0000-0000-000000000001','campo','area_construida','valor',40,'contexto',jsonb_build_object('dado_id','e0000000-0000-0000-0000-000000000001')),
  jsonb_build_object('entity_type','dado_mercado','entity_id','e0000000-0000-0000-0000-000000000001','campo','data_observacao','valor','2026-03-01'),
  jsonb_build_object('entity_type','fonte_principal','entity_id','e0000000-0000-0000-0000-000000000001','campo','tipo','valor','IMOBILIARIA'),
  jsonb_build_object('entity_type','fonte_principal','entity_id','e0000000-0000-0000-0000-000000000001','campo','nome','valor','Imobiliária Centro')), NULL) AS j;
SELECT pg_temp.ok((SELECT j->>'nivel' FROM ap3) = 'DATASET', 'lote da amostra aplicado com o maior nível (DATASET)');
SELECT pg_temp.ok((SELECT valor_unitario FROM public.dados_mercado WHERE id = 'e0000000-0000-0000-0000-000000000001') = 25, 'valor unitário recalculado ao mudar a área (1000 / 40 = 25)');
SELECT public.aval_apply_changes((SELECT av FROM fx), jsonb_build_array(jsonb_build_object('entity_type','dado_mercado','entity_id','e0000000-0000-0000-0000-000000000001','campo','valor_utilizado','valor',2000)), NULL);
SELECT pg_temp.ok((SELECT valor_unitario FROM public.dados_mercado WHERE id = 'e0000000-0000-0000-0000-000000000001') = 50, 'valor unitário recalculado ao mudar o valor (2000 / 40 = 50)');
SELECT pg_temp.ok((SELECT count(*) FROM public.avaliacao_amostras WHERE id = 'f0000000-0000-0000-0000-000000000001' AND dado_id = 'e0000000-0000-0000-0000-000000000001') = 1
  AND (SELECT imovel_id FROM public.dados_mercado WHERE id = 'e0000000-0000-0000-0000-000000000001') = 'd0000000-0000-0000-0000-000000000001', 'amostra mantém o mesmo id, dado e imóvel após correção');
SELECT pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.avaliacao_amostra_snapshots s JOIN snap0 USING (id) WHERE s.dados IS DISTINCT FROM snap0.dados OR s.hash IS DISTINCT FROM snap0.hash)
  AND (SELECT count(*) FROM public.avaliacao_amostra_snapshots) = (SELECT count(*) FROM snap0)
  AND (SELECT status FROM public.avaliacao_conjuntos_dados WHERE id = '10000000-0000-0000-0000-000000000001') = 'CONGELADO', 'conjunto e snapshots congelados não mudam retroativamente');
SELECT pg_temp.ok((SELECT valor FROM public.avaliacao_variavel_valores WHERE amostra_id = 'f0000000-0000-0000-0000-000000000001' AND variavel_id = 'c0000000-0000-0000-0000-000000000002') = 40,
  'valor vivo da variável de área da amostra acompanha a correção');
SELECT pg_temp.ok((SELECT f.nome FROM public.dados_mercado_fontes df JOIN public.fontes_mercado f ON f.id = df.fonte_id WHERE df.dado_id = 'e0000000-0000-0000-0000-000000000001' AND df.principal) = 'Imobiliária Centro',
  'fonte principal criada e vinculada na mesma ação');
SELECT public.aval_apply_changes((SELECT av FROM fx), jsonb_build_array(jsonb_build_object('entity_type','fonte_principal','entity_id','e0000000-0000-0000-0000-000000000001','campo','nome','valor','Imobiliária Centro Ltda')), NULL);
SELECT pg_temp.ok((SELECT count(*) FROM public.fontes_mercado) = 1 AND (SELECT nome FROM public.fontes_mercado) = 'Imobiliária Centro Ltda', 'fonte exclusiva é atualizada, sem duplicar');

-- 4) Imóvel compartilhado: exige escolha; clone reatribui somente a amostra escolhida
SELECT pg_temp.throws($$SELECT public.aval_apply_changes((SELECT av FROM fx), jsonb_build_array(jsonb_build_object('entity_type','imovel',
  'entity_id','d0000000-0000-0000-0000-000000000002','campo','area_construida','valor',45,'contexto',jsonb_build_object('dado_id','e0000000-0000-0000-0000-000000000002'))), NULL)$$,
  'shared_choice_required', 'imóvel compartilhado exige escolha explícita (sem clone automático)');
SELECT pg_temp.ok((public.aval_imovel_sharing((SELECT av FROM fx), 'd0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002')->>'outros_dados')::int = 1, 'compartilhamento informa outro dado no mesmo imóvel');
INSERT INTO cid SELECT 'r', (public.aval_apply_changes((SELECT av FROM fx), jsonb_build_array(jsonb_build_object('entity_type','imovel',
  'entity_id','d0000000-0000-0000-0000-000000000002','campo','area_construida','valor',45,'contexto',jsonb_build_object('dado_id','e0000000-0000-0000-0000-000000000002','modo','CLONAR'))), NULL)
  ->'imoveis_clonados'->>'d0000000-0000-0000-0000-000000000002:e0000000-0000-0000-0000-000000000002')::uuid;
SELECT pg_temp.ok((SELECT imovel_id FROM public.dados_mercado WHERE id = 'e0000000-0000-0000-0000-000000000002') = (SELECT v FROM cid WHERE k = 'r')
  AND (SELECT v FROM cid WHERE k = 'r') <> 'd0000000-0000-0000-0000-000000000002'
  AND (SELECT imovel_id FROM public.dados_mercado WHERE id = 'e0000000-0000-0000-0000-000000000009') = 'd0000000-0000-0000-0000-000000000002',
  'clone reatribui apenas o dado da amostra escolhida');
SELECT pg_temp.ok((SELECT area_construida FROM public.imoveis WHERE id = (SELECT v FROM cid WHERE k = 'r')) = 45
  AND (SELECT area_construida FROM public.imoveis WHERE id = 'd0000000-0000-0000-0000-000000000002') = 50
  AND (SELECT valor_unitario FROM public.dados_mercado WHERE id = 'e0000000-0000-0000-0000-000000000002') = round(1000 / 45.0, 4),
  'mudança aplicada só no clone; original intacto; valor unitário da amostra recalculado');
SELECT pg_temp.ok((SELECT valor FROM public.avaliacao_variavel_valores WHERE amostra_id = 'f0000000-0000-0000-0000-000000000002') = 77,
  'valor de variável digitado manualmente (diferente do cadastro) não é sobrescrito');
SELECT pg_temp.ok(EXISTS (SELECT 1 FROM public.audit_events WHERE event_type = 'PROPERTY_CLONED'), 'clone registrado no histórico');

-- 5) Permissões, isolamento e guarda contra edição silenciosa
SELECT pg_temp.throws($$UPDATE public.dados_mercado SET valor_utilizado = 1 WHERE id = 'e0000000-0000-0000-0000-000000000001'$$, 'use_change_flow', 'edição direta de dado usado em avaliação é bloqueada');
SELECT pg_temp.throws($$UPDATE public.imoveis SET area_construida = 1 WHERE id = 'd0000000-0000-0000-0000-000000000001'$$, 'use_change_flow', 'edição direta de imóvel vinculado é bloqueada');
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$UPDATE public.avaliacao_amostras SET origem_territorial = 'OUTRA_FONTE' WHERE id = 'f0000000-0000-0000-0000-000000000001'$$, 'use_change_flow', 'origem territorial só muda pelo fluxo com impacto');
UPDATE public.imoveis SET area_construida = 81 WHERE id = 'd0000000-0000-0000-0000-000000000011';
SELECT pg_temp.ok((SELECT area_construida FROM public.imoveis WHERE id = 'd0000000-0000-0000-0000-000000000011') = 81, 'imóvel sem vínculo com avaliação continua editável');
UPDATE public.avaliacao_amostras SET selecionada = NOT selecionada WHERE id = 'f0000000-0000-0000-0000-000000000003';
SELECT pg_temp.ok((SELECT selecionada FROM public.avaliacao_amostras WHERE id = 'f0000000-0000-0000-0000-000000000003') IS DISTINCT FROM (SELECT selecionada FROM public.avaliacao_amostras WHERE id = 'f0000000-0000-0000-0000-000000000004'), 'seleção de amostra continua liberada');
SELECT pg_temp.login('a3000000-0000-0000-0000-000000000003');
SELECT pg_temp.throws($$SELECT public.aval_apply_changes((SELECT av FROM fx), jsonb_build_array(jsonb_build_object('entity_type','dado_mercado',
  'entity_id','e0000000-0000-0000-0000-000000000001','campo','valor_utilizado','valor',10)), NULL)$$, 'permission_denied', 'revisor não edita amostra');
SELECT pg_temp.login('b1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$SELECT public.aval_apply_changes((SELECT av FROM fx), jsonb_build_array(jsonb_build_object('entity_type','dado_mercado',
  'entity_id','e0000000-0000-0000-0000-000000000001','campo','valor_utilizado','valor',10)), NULL)$$, 'not_found', 'outra organização não edita');
SELECT pg_temp.throws($$SELECT public.aval_evaluate_changes_impact((SELECT av FROM fx), '[]')$$, 'not_found|invalid_changes', 'outra organização não avalia impacto');
SELECT pg_temp.login('a2000000-0000-0000-0000-000000000002');
SELECT pg_temp.throws($$SELECT public.aval_apply_changes((SELECT av FROM fx), jsonb_build_array(jsonb_build_object('entity_type','dado_mercado',
  'entity_id','e0000000-0000-0000-0000-000000000009','campo','valor_utilizado','valor',10)), NULL)$$, 'not_found', 'dado fora da avaliação não é editado por ela');
SELECT pg_temp.login(NULL);
ROLLBACK;
