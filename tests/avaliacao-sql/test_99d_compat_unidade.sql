-- Compatibilidade dimensional do resultado econômico com valores administrativos (nunca comparar unidades diferentes).
BEGIN;
\ir _fixture.sql
-- Classificações usadas nos cenários puros
CREATE TEMP TABLE u AS SELECT
  public.aval_unidade_classificar('R$/m²', 'valor_unitario', 'LOCACAO') AS unit_loc,
  public.aval_unidade_classificar('R$/mês', 'valor_utilizado', 'LOCACAO') AS tot_loc,
  public.aval_unidade_classificar('R$', 'valor_utilizado', 'VENDA') AS tot_venda,
  public.aval_unidade_classificar('R$/m²', 'valor_unitario', 'VENDA') AS unit_venda,
  public.aval_unidade_administrativa('LOCACAO') AS adm_loc, public.aval_unidade_administrativa('VENDA') AS adm_venda;
GRANT SELECT ON u TO authenticated;

-- Identificação da unidade por metadados
SELECT pg_temp.ok((SELECT unit_loc->>'categoria' = 'UNITARIO' AND unit_loc->>'area_campo' = 'area_construida' AND tot_loc->>'categoria' = 'TOTAL'
  AND tot_venda->>'unidade' = 'R$' AND unit_venda->>'periodicidade' = 'UNICA' FROM u), 'unidade identificada por unidade + campo de origem + finalidade');
SELECT pg_temp.ok(public.aval_unidade_classificar('R$/mês', 'valor_unitario', 'LOCACAO')->>'categoria' = 'INDETERMINADA'
  AND public.aval_unidade_classificar(NULL, NULL, 'LOCACAO')->>'categoria' = 'INDETERMINADA'
  AND public.aval_unidade_classificar('R$/mês', 'valor_utilizado', 'VENDA')->>'categoria' = 'INDETERMINADA',
  'unidade divergente do campo, ausente ou com periodicidade errada não é adivinhada');
SELECT pg_temp.ok(public.aval_unidade_classificar(NULL, 'valor_unitario', 'LOCACAO')->>'categoria' = 'UNITARIO'
  AND public.aval_unidade_classificar('r$ / m2', NULL, 'LOCACAO')->>'categoria' = 'UNITARIO', 'unidade sem campo ou campo sem unidade ainda identificados');

-- 1) 38,28 R$/m² × 6.500 R$/mês com área conhecida → converte pela área
CREATE TEMP TABLE c1 AS SELECT public.aval_compat_calcular(unit_loc, 38.284, 33.0, 43.5, 32.54, 44.03, 6500, adm_loc, 140.98, 'PROJECAO') AS j FROM u;
GRANT SELECT ON c1 TO authenticated;
SELECT pg_temp.ok((SELECT j->>'status' = 'COMPARAVEL' AND abs((j->>'valor_comparado')::numeric - 6500 / 140.98) < 1e-9
  AND round((j->>'diferenca_percentual')::numeric, 2) = -20.43 AND j->>'unidade_comparacao' = 'R$/m²' AND (j->>'area')::numeric = 140.98
  AND j->>'area_campo' = 'area_construida' AND j->>'direcao' = 'ACIMA_REFERENCIA' AND j->>'formula' LIKE 'R$ 6.500,00 /mês ÷ 140,98 m²%= R$ 46,11 /m²' FROM c1),
  'R$/m² × R$/mês: 6.500 ÷ 140,98 = 46,11 R$/m², diferença −20,43% (nunca −16.878%)');
-- 8) valor original preservado ao lado do convertido
SELECT pg_temp.ok((SELECT (j->>'valor_original')::numeric = 6500 AND j->>'unidade_original' = 'R$/mês' FROM c1), 'valor administrativo original e unidade preservados');
-- 7) posição no IC e no campo usa o valor convertido (6.500 cru estaria acima de tudo)
SELECT pg_temp.ok((SELECT j->>'posicao_ic' = 'ACIMA_IC' AND j->>'posicao_campo' = 'ACIMA_CAMPO' FROM c1)
  AND (SELECT j->>'posicao_ic' = 'DENTRO_IC' AND j->>'posicao_campo' = 'DENTRO_CAMPO'
       FROM (SELECT public.aval_compat_calcular(unit_loc, 38.284, 33.0, 43.5, 32.54, 44.03, 5500, adm_loc, 140.98, 'PROJECAO') AS j FROM u) x),
  'posição no intervalo e no campo de arbítrio calculada na mesma unidade (5.500/140,98 = 39,01 fica dentro)');
-- 2) R$/mês × R$/mês → direta
SELECT pg_temp.ok((SELECT j->>'status' = 'COMPARAVEL' AND (j->>'valor_comparado')::numeric = 3611.22 AND j->>'area' IS NULL
  AND abs((j->>'diferenca_percentual')::numeric - (4219.533 - 3611.22) / 4219.533 * 100) < 1e-9 AND j->>'formula' LIKE 'Comparação direta%'
  FROM (SELECT public.aval_compat_calcular(tot_loc, 4219.533, 3700, 4700, 3586, 4852, 3611.22, adm_loc, 127.82, 'PROJECAO') AS j FROM u) x),
  'R$/mês × R$/mês: comparação direta, área ignorada');
-- 3) R$/m² × R$/m² → direta
SELECT pg_temp.ok((SELECT j->>'status' = 'COMPARAVEL' AND (j->>'valor_comparado')::numeric = 40 AND j->>'area' IS NULL
  FROM (SELECT public.aval_compat_calcular(unit_loc, 38.28, 33, 43.5, 32, 44, 40, unit_loc, NULL, NULL) AS j FROM u) x), 'R$/m² × R$/m²: comparação direta');
-- 4) R$ venda × R$ venda → direta
SELECT pg_temp.ok((SELECT j->>'status' = 'COMPARAVEL' AND (j->>'valor_comparado')::numeric = 480000 AND j->>'unidade_comparacao' = 'R$'
  FROM (SELECT public.aval_compat_calcular(tot_venda, 500000, 450000, 550000, 425000, 575000, 480000, adm_venda, NULL, NULL) AS j FROM u) x), 'venda total × venda total: direta');
-- 5) R$/m² venda × total venda → converte pela área
SELECT pg_temp.ok((SELECT j->>'status' = 'COMPARAVEL' AND (j->>'valor_comparado')::numeric = 4000 AND j->>'unidade_original' = 'R$'
  FROM (SELECT public.aval_compat_calcular(unit_venda, 4200, 3800, 4600, 3570, 4830, 480000, adm_venda, 120, 'IMOVEL_AVALIANDO') AS j FROM u) x), 'venda R$/m² × venda total: 480.000 ÷ 120 = 4.000');
-- 6) sem área → não compara, sem percentual
SELECT pg_temp.ok((SELECT j->>'status' = 'NAO_COMPARAVEL_FALTA_AREA' AND j->>'valor_comparado' IS NULL AND j->>'diferenca_percentual' IS NULL
  AND j->>'direcao' IS NULL AND j->>'posicao_ic' = 'NAO_APLICAVEL' AND j->>'motivo' LIKE 'Falta a área%' AND (j->>'valor_original')::numeric = 6500
  FROM (SELECT public.aval_compat_calcular(unit_loc, 38.28, 33, 43.5, 32, 44, 6500, adm_loc, NULL, NULL) AS j FROM u) x), 'sem área: não comparável e sem percentual');
SELECT pg_temp.ok((SELECT j->>'status' = 'NAO_COMPARAVEL_UNIDADE' AND j->>'diferenca_percentual' IS NULL
  FROM (SELECT public.aval_compat_calcular(unit_loc, 38.28, 33, 43.5, 32, 44, 480000, adm_venda, 100, 'PROJECAO') AS j FROM u) x), 'periodicidades diferentes nunca são comparadas');

-- Cenário integrado: aceite → projeção (avaliando com 140,98 m²) → confirmação pelo RT
SELECT pg_temp.login(NULL);
INSERT INTO public.imoveis(id, organization_id, tipo_imovel, area_construida) VALUES ('d0000000-0000-0000-0000-000000000010', '0a000000-0000-0000-0000-00000000000a', 'Sala comercial', 999);
INSERT INTO public.avaliacao_imoveis(organization_id, avaliacao_id, imovel_id, papel) SELECT '0a000000-0000-0000-0000-00000000000a', av, 'd0000000-0000-0000-0000-000000000010', 'AVALIANDO' FROM fx;
INSERT INTO public.avaliacao_valores_administrativos(id, organization_id, avaliacao_id, tipo, valor) SELECT '20000000-0000-0000-0000-0000000000a1', '0a000000-0000-0000-0000-00000000000a', av, 'SOLICITADO_PROPRIETARIO', 6500 FROM fx;
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
CREATE TEMP TABLE m AS SELECT public.aval_model_create((SELECT av FROM fx), '10000000-0000-0000-0000-000000000001', 'Manual', 'c0000000-0000-0000-0000-000000000001', 'DIRECT', NULL,
  '[{"variavel_id":"c0000000-0000-0000-0000-000000000002","transformacao":"DIRECT"}]') AS id;
SELECT pg_temp.login(NULL);
GRANT SELECT ON m TO authenticated, service_role;
-- Metadados da variável dependente (R$/m², valor unitário) e da área (área construída)
UPDATE public.avaliacao_variaveis SET unidade = 'R$/m²', campo_origem = 'valor_unitario', origem_tipo = 'CAMPO_DADO_MERCADO' WHERE id = 'c0000000-0000-0000-0000-000000000001';
UPDATE public.avaliacao_variaveis SET unidade = 'm²', campo_origem = 'area_construida', origem_tipo = 'CAMPO_DADO_MERCADO' WHERE id = 'c0000000-0000-0000-0000-000000000002';
INSERT INTO public.avaliacao_modelo_execucoes(id, avaliacao_id, modelo_id, engine_name, engine_version, status, input_snapshot_json, input_hash, output_json, output_hash, iniciado_em, concluido_em)
SELECT '20000000-0000-0000-0000-000000000001', (SELECT av FROM fx), id, 'sidif', '1.1.1', 'SUCESSO', '{}', repeat('a', 64), '{}', repeat('b', 64), now(), now() FROM m;
SET LOCAL ROLE service_role;
CREATE TEMP TABLE val AS SELECT public.aval_engine_persist_validation(jsonb_build_object('politica', 'SIDIF_V1 v2',
  'validacao', jsonb_build_object('organization_id', '0a000000-0000-0000-0000-00000000000a', 'avaliacao_id', (SELECT av FROM fx), 'modelo_id', (SELECT id FROM m),
     'execucao_id', '20000000-0000-0000-0000-000000000001', 'created_by', 'a1000000-0000-0000-0000-000000000001',
     'policy_id', (SELECT id FROM public.validation_policies WHERE codigo = 'SIDIF_V1' AND versao = 2), 'overall_status', 'APTO',
     'fundamentacao_grau', 'II', 'precisao_grau', 'III', 'amplitude_pct', 20, 'resumo_json', '{}'::jsonb), 'resultados', '[]'::jsonb)) AS id;
RESET ROLE;
GRANT SELECT ON val TO authenticated;
UPDATE public.avaliacao_modelos SET status = 'EM_VALIDACAO' WHERE id = (SELECT id FROM m);
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
CREATE TEMP TABLE ac AS SELECT public.aval_accept_model((SELECT id FROM val), NULL) AS id;
SELECT pg_temp.login(NULL);
GRANT SELECT ON ac TO authenticated;
INSERT INTO public.avaliacao_projecoes(id, organization_id, avaliacao_id, modelo_id, acceptance_id, execucao_id, nivel_confianca, z0, se_media, t_critico, log_response,
  avaliando_json, extrapolacao, intervalo_predicao_status, engine_version)
SELECT '40000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-00000000000a', av, (SELECT id FROM m), (SELECT id FROM ac), '20000000-0000-0000-0000-000000000001',
  0.8, 38.284, 1, 1.3, false, '{"area": 140.98}', '[]', 'NOT_VALIDATED', '1.1.1' FROM fx;
INSERT INTO public.avaliacao_projecao_centros(organization_id, avaliacao_id, projecao_id, centro, valor, limite_inferior, limite_superior, amplitude_pct, grau_precisao)
SELECT '0a000000-0000-0000-0000-00000000000a', av, '40000000-0000-0000-0000-000000000001', 'DIRECT', 38.284, 33.0, 43.5, 27.4, 'III' FROM fx;
SELECT pg_temp.ok((public.aval_unidade_resultado('40000000-0000-0000-0000-000000000001')->>'area')::numeric = 140.98
  AND public.aval_unidade_resultado('40000000-0000-0000-0000-000000000001')->>'area_origem' = 'PROJECAO', 'área vem do avaliando usado na projeção (não do cadastro atual)');

SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
CREATE TEMP TABLE r1 AS SELECT public.aval_confirm_economic('40000000-0000-0000-0000-000000000001', 'DIRECT', false, NULL, NULL, '{}', 'FAVORAVEL_ADMINISTRACAO', NULL) AS id;
SELECT pg_temp.ok((SELECT c.status_comparacao = 'COMPARAVEL' AND c.valor_administrativo_original = 6500 AND c.unidade_original = 'R$/mês'
   AND c.unidade_comparacao = 'R$/m²' AND round(c.valor_comparado, 4) = 46.1058 AND c.area_conversao = 140.98 AND c.area_campo = 'area_construida'
   AND c.area_origem = 'PROJECAO' AND round(c.diferenca_percentual, 2) = -20.43 AND c.posicao_ic = 'ACIMA_IC' AND c.regra_versao = 1 AND c.conversao_formula IS NOT NULL
   FROM public.avaliacao_compatibilidades c WHERE c.resultado_id = (SELECT id FROM r1)), 'confirmação grava original, convertido, área, fórmula e percentual corretos');
SELECT pg_temp.ok((SELECT valor FROM public.avaliacao_valores_administrativos WHERE id = '20000000-0000-0000-0000-0000000000a1') = 6500, 'valor administrativo cadastrado não é sobrescrito');
SELECT pg_temp.ok((SELECT a.unidade = 'R$/m²' FROM public.avaliacao_valores_adotados a JOIN public.avaliacao_resultado_economico r ON r.valor_adotado_id = a.id WHERE r.id = (SELECT id FROM r1))
  AND (SELECT dados->'unidade_resultado'->>'unidade' = 'R$/m²' AND dados->'compatibilidades'->0->>'unidade_original' = 'R$/mês' FROM public.avaliacao_resultado_snapshots WHERE resultado_id = (SELECT id FROM r1)),
  'valor adotado e snapshot do resultado registram a unidade R$/m²');
SELECT pg_temp.ok(public.aval_tokens((SELECT av FROM fx))->>'VALOR_ADMINISTRATIVO_REFERENCIA' = 'R$ 6.500,00/mês (equivalente a R$ 46,11/m², área de 140,98 m²)'
  AND public.aval_tokens((SELECT av FROM fx))->>'DIFERENCA_PERCENTUAL' = '-20,43%' AND public.aval_tokens((SELECT av FROM fx))->>'VALOR_FINAL' = 'R$ 38,28/m²',
  'laudo cita valor original, equivalente e percentual corrigido');
SELECT pg_temp.throws($$UPDATE public.avaliacao_compatibilidades SET valor_comparado = 1$$, 'imut|immutable|not allowed|bloque|permission', 'compatibilidade gravada é imutável');

-- 9) Registro antigo comparado em unidades diferentes: preservado e resultado exige nova confirmação
SELECT pg_temp.login(NULL);
UPDATE public.avaliacao_resultado_economico SET status = 'SUPERADO' WHERE id = (SELECT id FROM r1);
INSERT INTO public.avaliacao_resultado_economico(id, organization_id, avaliacao_id, projecao_id, valor_adotado_id, centro, conclusao, confirmado_por)
SELECT '50000000-0000-0000-0000-000000000001', organization_id, avaliacao_id, projecao_id, valor_adotado_id, centro, 'COMPATIVEL', 'a1000000-0000-0000-0000-000000000001'
  FROM public.avaliacao_resultado_economico WHERE id = (SELECT id FROM r1);
INSERT INTO public.avaliacao_compatibilidades(organization_id, avaliacao_id, resultado_id, valor_administrativo_id, tipo_valor, valor_referencia, valor_comparado,
  diferenca_absoluta, diferenca_percentual, direcao, posicao_ic, posicao_campo)
SELECT '0a000000-0000-0000-0000-00000000000a', av, '50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000000a1', 'SOLICITADO_PROPRIETARIO', 38.284, 6500,
  38.284 - 6500, (38.284 - 6500) / 38.284 * 100, 'ACIMA_REFERENCIA', 'ACIMA_IC', 'ACIMA_CAMPO' FROM fx;
SELECT pg_temp.throws($$INSERT INTO public.avaliacao_compatibilidades(organization_id, avaliacao_id, resultado_id, valor_administrativo_id, tipo_valor, valor_referencia,
  posicao_ic, posicao_campo, regra_versao, status_comparacao) SELECT '0a000000-0000-0000-0000-00000000000a', av, '50000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-0000000000a1', 'SOLICITADO_PROPRIETARIO', 38.284, 'DENTRO_IC', 'DENTRO_CAMPO', 1, 'NAO_COMPARAVEL_FALTA_AREA' FROM fx$$, 'check', 'não comparável exige motivo, original e posições não aplicáveis');
SELECT pg_temp.ok(public.aval_compat_revisar_legado() = 1, 'revisão encontra o resultado vigente comparado em unidades diferentes');
SELECT pg_temp.ok((SELECT status = 'DESATUALIZADO' AND stale FROM public.avaliacao_resultado_economico WHERE id = '50000000-0000-0000-0000-000000000001')
  AND (SELECT valor_comparado = 6500 AND regra_versao IS NULL FROM public.avaliacao_compatibilidades WHERE resultado_id = '50000000-0000-0000-0000-000000000001')
  AND EXISTS (SELECT 1 FROM public.audit_events WHERE entity_id = '50000000-0000-0000-0000-000000000001' AND event_type = 'ECONOMIC_RESULT_UNIT_MISMATCH'
    AND details_json->'comparacoes_anteriores'->0->>'valor_comparado' = '6500'),
  'resultado antigo vira desatualizado, comparação antiga preservada e registrada no histórico');
SELECT pg_temp.ok(public.aval_compat_revisar_legado() = 0, 'revisão é idempotente');
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
SELECT pg_temp.throws($$SELECT public.aval_compat_revisar_legado()$$, 'permission denied', 'cliente não executa a revisão em massa');
SELECT pg_temp.throws($$SELECT public.aval_unidade_resultado('40000000-0000-0000-0000-000000000001')$$, 'permission denied', 'cliente não consulta a unidade/área por fora do fluxo');

-- 6 integrado) Sem área no avaliando nem na projeção → não comparável
SELECT pg_temp.login(NULL);
UPDATE public.avaliacao_projecoes SET avaliando_json = '{}' WHERE id = '40000000-0000-0000-0000-000000000001';
SELECT pg_temp.ok((public.aval_unidade_resultado('40000000-0000-0000-0000-000000000001')->>'area')::numeric = 999
  AND public.aval_unidade_resultado('40000000-0000-0000-0000-000000000001')->>'area_origem' = 'IMOVEL_AVALIANDO', 'sem área na projeção usa a área construída do avaliando');
UPDATE public.imoveis SET area_construida = NULL WHERE id = 'd0000000-0000-0000-0000-000000000010';
SELECT pg_temp.login('a1000000-0000-0000-0000-000000000001');
CREATE TEMP TABLE r2 AS SELECT public.aval_confirm_economic('40000000-0000-0000-0000-000000000001', 'DIRECT', false, NULL, NULL, '{}', 'REQUER_ANALISE', NULL) AS id;
SELECT pg_temp.ok((SELECT c.status_comparacao = 'NAO_COMPARAVEL_FALTA_AREA' AND c.diferenca_percentual IS NULL AND c.valor_comparado IS NULL
   AND c.valor_administrativo_original = 6500 AND c.posicao_ic = 'NAO_APLICAVEL' FROM public.avaliacao_compatibilidades c WHERE c.resultado_id = (SELECT id FROM r2))
  AND public.aval_tokens((SELECT av FROM fx))->>'DIFERENCA_PERCENTUAL' = 'não comparável', 'sem área: confirmação grava "não comparável" sem percentual');
ROLLBACK;
