-- Fixture sintética (nenhum dado real). Incluída por cada teste dentro de BEGIN … ROLLBACK.
SET client_min_messages = notice;
CREATE FUNCTION pg_temp.ok(c boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF c IS NOT TRUE THEN RAISE EXCEPTION 'FALHA: %', msg; END IF; RAISE NOTICE 'OK %', msg; END $$;
CREATE FUNCTION pg_temp.throws(q text, pat text, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE q;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM ~* pat THEN RAISE NOTICE 'OK %', msg; RETURN; END IF;
    RAISE EXCEPTION 'FALHA: % (erro inesperado: %)', msg, SQLERRM;
  END;
  RAISE EXCEPTION 'FALHA: % (não falhou)', msg;
END $$;
-- Troca de usuário simulando o JWT (papel authenticated) ou volta ao dono.
CREATE FUNCTION pg_temp.login(u uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN PERFORM set_config('request.jwt.claim.sub', COALESCE(u::text, ''), true);
  PERFORM set_config('role', CASE WHEN u IS NULL THEN 'none' ELSE 'authenticated' END, true); END $$;
GRANT EXECUTE ON FUNCTION pg_temp.ok(boolean, text), pg_temp.throws(text, text, text), pg_temp.login(uuid) TO authenticated, service_role;

INSERT INTO public.organizations(id, name) VALUES
  ('0a000000-0000-0000-0000-00000000000a', 'Org A (teste)'), ('0b000000-0000-0000-0000-00000000000b', 'Org B (teste)');
-- a1 RT · a2 colaborador · a3 revisor · a4 admin sem papel técnico · a5 contratada · b1 editor org B · b2 admin org B
INSERT INTO public.profiles(user_id, display_name) SELECT u, 'Teste' FROM unnest(ARRAY[
  'a1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000002','a3000000-0000-0000-0000-000000000003',
  'a4000000-0000-0000-0000-000000000004','a5000000-0000-0000-0000-000000000005','b1000000-0000-0000-0000-000000000001',
  'b2000000-0000-0000-0000-000000000002']::uuid[]) u;
INSERT INTO public.organization_members(organization_id, user_id) VALUES
  ('0a000000-0000-0000-0000-00000000000a','a1000000-0000-0000-0000-000000000001'), ('0a000000-0000-0000-0000-00000000000a','a2000000-0000-0000-0000-000000000002'),
  ('0a000000-0000-0000-0000-00000000000a','a3000000-0000-0000-0000-000000000003'), ('0a000000-0000-0000-0000-00000000000a','a4000000-0000-0000-0000-000000000004'),
  ('0a000000-0000-0000-0000-00000000000a','a5000000-0000-0000-0000-000000000005'), ('0b000000-0000-0000-0000-00000000000b','b1000000-0000-0000-0000-000000000001'),
  ('0b000000-0000-0000-0000-00000000000b','b2000000-0000-0000-0000-000000000002');
INSERT INTO public.user_roles(user_id, role) VALUES
  ('a1000000-0000-0000-0000-000000000001','editor'), ('a2000000-0000-0000-0000-000000000002','editor'), ('a3000000-0000-0000-0000-000000000003','editor'),
  ('a4000000-0000-0000-0000-000000000004','admin'), ('a5000000-0000-0000-0000-000000000005','contratada'),
  ('b1000000-0000-0000-0000-000000000001','editor'), ('b2000000-0000-0000-0000-000000000002','admin');

-- Avaliação criada pelo admin (que entra como COLABORADOR), com RT a1.
SELECT pg_temp.login('a4000000-0000-0000-0000-000000000004');
SELECT set_config('aval.test_av', public.aval_create('NOVA_LOCACAO', 'MT', 'Cuiabá', '5103403', 'Sala comercial', 'a1000000-0000-0000-0000-000000000001', NULL)::text, true);
SELECT pg_temp.login(NULL);
CREATE TEMP TABLE fx AS SELECT current_setting('aval.test_av')::uuid AS av;
GRANT SELECT ON fx TO authenticated, service_role;
INSERT INTO public.avaliacao_membros(organization_id, avaliacao_id, user_id, papel) SELECT '0a000000-0000-0000-0000-00000000000a', av, u, p FROM fx,
  (VALUES ('a2000000-0000-0000-0000-000000000002'::uuid, 'COLABORADOR'), ('a3000000-0000-0000-0000-000000000003'::uuid, 'REVISOR')) x(u, p);

-- Variáveis: preco (dependente), area, padrao (dicotômica) e zero_um (contém zero → LN inválida)
INSERT INTO public.avaliacao_variaveis(id, avaliacao_id, nome, codigo, tipo_variavel, papel, transformacoes_autorizadas)
SELECT id::uuid, (SELECT av FROM fx), nome, codigo, tipo, papel, t FROM (VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Preço unitário', 'preco', 'QUANTITATIVA', 'DEPENDENTE', ARRAY['DIRECT','LN','INVERSE']),
  ('c0000000-0000-0000-0000-000000000002', 'Área', 'area', 'QUANTITATIVA', 'INDEPENDENTE', ARRAY['DIRECT','LN','INVERSE','SQRT']),
  ('c0000000-0000-0000-0000-000000000003', 'Padrão', 'padrao', 'DICOTOMICA', 'INDEPENDENTE', ARRAY['DIRECT']),
  ('c0000000-0000-0000-0000-000000000004', 'Indicador', 'zero_um', 'QUANTITATIVA', 'INDEPENDENTE', ARRAY['DIRECT','LN'])) v(id, nome, codigo, tipo, papel, t);
INSERT INTO public.avaliacao_variavel_valores(avaliacao_id, variavel_id, scope_type, valor) SELECT (SELECT av FROM fx), v::uuid, 'AVALIANDO', x FROM (VALUES
  ('c0000000-0000-0000-0000-000000000002', 120), ('c0000000-0000-0000-0000-000000000003', 1), ('c0000000-0000-0000-0000-000000000004', 1)) t(v, x);

INSERT INTO public.imoveis(id, organization_id, tipo_imovel) SELECT ('d0000000-0000-0000-0000-00000000000' || i)::uuid, '0a000000-0000-0000-0000-00000000000a', 'Sala comercial' FROM generate_series(1, 8) i;
INSERT INTO public.dados_mercado(id, organization_id, imovel_id) SELECT ('e0000000-0000-0000-0000-00000000000' || i)::uuid, '0a000000-0000-0000-0000-00000000000a', ('d0000000-0000-0000-0000-00000000000' || i)::uuid FROM generate_series(1, 8) i;
INSERT INTO public.avaliacao_amostras(id, avaliacao_id, dado_id) SELECT ('f0000000-0000-0000-0000-00000000000' || i)::uuid, (SELECT av FROM fx), ('e0000000-0000-0000-0000-00000000000' || i)::uuid FROM generate_series(1, 8) i;
INSERT INTO public.avaliacao_conjuntos_dados(id, avaliacao_id, versao, status) SELECT '10000000-0000-0000-0000-000000000001', av, 1, 'CONGELADO' FROM fx;
INSERT INTO public.avaliacao_amostra_snapshots(avaliacao_id, conjunto_id, amostra_id, dado_id, imovel_id, dados, hash)
SELECT (SELECT av FROM fx), '10000000-0000-0000-0000-000000000001', ('f0000000-0000-0000-0000-00000000000' || i)::uuid, ('e0000000-0000-0000-0000-00000000000' || i)::uuid,
  ('d0000000-0000-0000-0000-00000000000' || i)::uuid,
  jsonb_build_object('habilitada_modelo', true, 'variaveis', jsonb_build_object('preco', 40 + i * 3.5 + (i % 3), 'area', 60 + i * 15, 'padrao', i % 2, 'zero_um', (i % 2))), md5(i::text)
FROM generate_series(1, 8) i;
