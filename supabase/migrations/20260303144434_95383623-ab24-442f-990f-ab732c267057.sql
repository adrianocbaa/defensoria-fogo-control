
-- ============================================================
-- ETAPA 2A: Criar empresa demo e obra modelo
-- UUIDs fixos para facilitar o reset automático (Etapa 3)
-- ============================================================

-- Empresa demo
INSERT INTO public.empresas (
  id, razao_social, nome_fantasia, cnpj, is_active, created_at, updated_at
) VALUES (
  'de000001-de00-4000-8000-de0000000001',
  'Construtora Demonstração LTDA',
  'Demo Construções',
  '00.000.000/0001-00',
  true,
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Obra demo
INSERT INTO public.obras (
  id,
  nome,
  municipio,
  tipo,
  status,
  valor_total,
  empresa_id,
  empresa_responsavel,
  n_contrato,
  data_inicio,
  previsao_termino,
  porcentagem_execucao,
  rdo_habilitado,
  is_public,
  is_demo,
  regiao,
  secretaria_responsavel,
  coordinates_lat,
  coordinates_lng,
  created_at,
  updated_at
) VALUES (
  'de000002-de00-4000-8000-de0000000002',
  'Reforma e Ampliação da Unidade de Saúde Central (DEMONSTRAÇÃO)',
  'Cuiabá',
  'Reforma',
  'em_andamento',
  1250000.00,
  'de000001-de00-4000-8000-de0000000001',
  'Construtora Demonstração LTDA',
  'CONTRATO-DEMO-001/2024',
  '2024-08-01',
  '2025-08-01',
  42.5,
  true,
  false,
  true,
  'Centro-Sul',
  'Secretaria de Saúde',
  -15.6014,
  -56.0979,
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;
