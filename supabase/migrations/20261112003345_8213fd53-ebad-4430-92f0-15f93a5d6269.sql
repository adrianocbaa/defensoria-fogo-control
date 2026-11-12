ALTER TYPE public.sector_type ADD VALUE IF NOT EXISTS 'avaliacao';

CREATE TABLE public.avaliacao_permissoes (
  codigo text PRIMARY KEY, descricao text NOT NULL,
  categoria text NOT NULL CHECK (categoria IN ('EDITAR','DECIDIR','APROVAR','EMITIR','GERIR'))
);
CREATE TABLE public.avaliacao_papel_permissoes (
  papel text NOT NULL CHECK (papel IN ('RESPONSAVEL_TECNICO','COLABORADOR','REVISOR','GLOBAL_ADMIN','GLOBAL_TECNICO')),
  permissao text NOT NULL REFERENCES public.avaliacao_permissoes(codigo),
  PRIMARY KEY (papel, permissao)
);
CREATE TABLE public.stat_transformations (
  codigo text PRIMARY KEY, nome text NOT NULL, engine_code int NOT NULL UNIQUE, dominio text NOT NULL, ordem int NOT NULL
);
CREATE TABLE public.document_tokens (codigo text PRIMARY KEY, descricao text NOT NULL, critico boolean NOT NULL DEFAULT true);
CREATE TABLE public.aval_impact_rules (
  entity_type text NOT NULL, campo text NOT NULL,
  nivel text NOT NULL CHECK (nivel IN ('NO_IMPACT','REPORT_ONLY','ECONOMIC_RESULT','PROJECTION','VALIDATION','MODEL','DATASET')),
  descricao text NOT NULL, PRIMARY KEY (entity_type, campo)
);

CREATE TABLE public.organization_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  scope text NOT NULL, ano int NOT NULL, last_value int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, scope, ano)
);

CREATE TABLE public.avaliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  numero int NOT NULL, ano int NOT NULL, codigo text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('NOVA_LOCACAO','RENOVACAO','REAJUSTE')),
  status text NOT NULL DEFAULT 'ATIVA' CHECK (status IN ('ATIVA','CONCLUIDA','CANCELADA')),
  stage text NOT NULL DEFAULT 'CADASTRO' CHECK (stage IN ('CADASTRO','IMOVEL','PESQUISA_MERCADO','MODELAGEM','VALIDACAO','RESULTADO_ECONOMICO','LAUDO','EMISSAO')),
  uf text NOT NULL, municipio_nome text NOT NULL, municipio_ibge text, tipo_imovel text NOT NULL,
  processo_administrativo text, numero_contrato text, data_proposta date, indice_reajuste text, percentual_reajuste numeric(9,4),
  observacao text, responsavel_tecnico_id uuid, versao_atual int NOT NULL DEFAULT 0,
  cancelado_motivo text, cancelado_em timestamptz, cancelado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid, updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, ano, numero)
);
CREATE INDEX avaliacoes_org_idx ON public.avaliacoes(organization_id, status);

CREATE TABLE public.avaliacao_versoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), revisao int NOT NULL,
  status text NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO','EMITIDA','SUPERADA')),
  motivo text, emitida_em timestamptz, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  UNIQUE (avaliacao_id, revisao)
);
CREATE TABLE public.avaliacao_membros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), user_id uuid NOT NULL,
  papel text NOT NULL CHECK (papel IN ('RESPONSAVEL_TECNICO','COLABORADOR','REVISOR')),
  ativo boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  UNIQUE (avaliacao_id, user_id, papel)
);
CREATE UNIQUE INDEX avaliacao_membros_um_rt ON public.avaliacao_membros(avaliacao_id) WHERE papel = 'RESPONSAVEL_TECNICO' AND ativo;
CREATE INDEX avaliacao_membros_user_idx ON public.avaliacao_membros(user_id) WHERE ativo;
CREATE TABLE public.avaliacao_metodos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id),
  metodo text NOT NULL DEFAULT 'COMPARATIVO_REGRESSAO' CHECK (metodo IN ('COMPARATIVO_REGRESSAO','EVOLUTIVO','CAPITALIZACAO_RENDA','INVOLUTIVO','CUSTO_DEPRECIACAO')),
  principal boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','INATIVO')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.avaliacao_valores_administrativos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id),
  tipo text NOT NULL CHECK (tipo IN ('CONTRATO_ATUAL','SOLICITADO_PROPRIETARIO','PROPOSTO_RENOVACAO','REAJUSTADO','OUTRO')),
  valor numeric(14,2) NOT NULL, data_referencia date, observacao text, documento_origem_id uuid,
  ativo boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.avaliacao_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id),
  categoria text NOT NULL DEFAULT 'OUTRO' CHECK (categoria IN ('IMOVEL','MERCADO','PROCESSO','LAUDO','OUTRO')),
  titulo text NOT NULL, storage_ref text NOT NULL, nome_arquivo text, tamanho_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid DEFAULT auth.uid()
);

CREATE TABLE public.imoveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  tipo_imovel text NOT NULL, descricao text, endereco text, numero text, complemento text, bairro text,
  municipio_nome text, municipio_ibge text, uf text, cep text, endereco_normalizado text,
  area_construida numeric(14,2), area_terreno numeric(14,2), padrao text, anuncio_url text, anuncio_id text,
  foto_hashes text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid DEFAULT auth.uid(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX imoveis_org_mun_idx ON public.imoveis(organization_id, municipio_ibge);
CREATE TABLE public.imovel_localizacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  imovel_id uuid NOT NULL UNIQUE REFERENCES public.imoveis(id),
  precisao text NOT NULL DEFAULT 'DESCONHECIDA' CHECK (precisao IN ('EXATA','APROXIMADA','BAIRRO','MUNICIPIO','DESCONHECIDA')),
  latitude numeric(10,7), longitude numeric(10,7), fonte text, observacao text, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.atributos_imobiliarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid,
  codigo text NOT NULL, nome text NOT NULL, categoria text NOT NULL,
  data_type text NOT NULL CHECK (data_type IN ('NUMERIC','TEXT','BOOL','CATEGORY','STATUS')),
  unidade text, modelable boolean NOT NULL DEFAULT false, opcoes jsonb, ativo boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX atributos_imobiliarios_codigo_uq ON public.atributos_imobiliarios(COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), codigo);
CREATE TABLE public.imovel_atributos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  imovel_id uuid NOT NULL REFERENCES public.imoveis(id), atributo_id uuid NOT NULL REFERENCES public.atributos_imobiliarios(id),
  valor_numeric numeric, valor_text text, valor_bool boolean, valor_category text,
  valor_status text CHECK (valor_status IN ('POSSUI','NAO_POSSUI','NAO_VERIFICADO')),
  fonte text, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (imovel_id, atributo_id)
);
CREATE TABLE public.imovel_ambientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  imovel_id uuid NOT NULL REFERENCES public.imoveis(id),
  tipo text NOT NULL CHECK (tipo IN ('QUARTO','SUITE','BANHEIRO','LAVABO','SALA','COZINHA','AREA_SERVICO','ESCRITORIO','VAGA_GARAGEM','DEPOSITO','RECEPCAO','AUDITORIO','OUTRO')),
  nome text, quantidade int NOT NULL DEFAULT 1 CHECK (quantidade >= 0), area numeric(14,2), observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.imovel_componentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  imovel_id uuid NOT NULL REFERENCES public.imoveis(id), componente text NOT NULL, estado text, observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.imovel_infraestrutura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  imovel_id uuid NOT NULL REFERENCES public.imoveis(id), item text NOT NULL,
  status text NOT NULL DEFAULT 'NAO_VERIFICADO' CHECK (status IN ('POSSUI','NAO_POSSUI','NAO_VERIFICADO')),
  observacao text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.imovel_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  imovel_id uuid NOT NULL REFERENCES public.imoveis(id), tipo text NOT NULL DEFAULT 'OUTRO', descricao text,
  storage_ref text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid DEFAULT auth.uid()
);
CREATE TABLE public.imovel_midias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  imovel_id uuid NOT NULL REFERENCES public.imoveis(id), tipo text NOT NULL DEFAULT 'FOTO', storage_ref text NOT NULL,
  legenda text, hash text, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid DEFAULT auth.uid()
);
CREATE TABLE public.avaliacao_imoveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), imovel_id uuid NOT NULL REFERENCES public.imoveis(id),
  papel text NOT NULL DEFAULT 'AVALIANDO' CHECK (papel IN ('AVALIANDO')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX avaliacao_imoveis_um_avaliando ON public.avaliacao_imoveis(avaliacao_id) WHERE papel = 'AVALIANDO';
CREATE TABLE public.imovel_vistorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), imovel_id uuid NOT NULL REFERENCES public.imoveis(id),
  data_vistoria date NOT NULL, responsavel_id uuid DEFAULT auth.uid(), estado_conservacao text, observacao text,
  status text NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO','CONCLUIDA')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.imovel_vistoria_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), vistoria_id uuid NOT NULL REFERENCES public.imovel_vistorias(id),
  item text NOT NULL, situacao text, observacao text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.imovel_vistoria_midias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), vistoria_id uuid NOT NULL REFERENCES public.imovel_vistorias(id),
  storage_ref text NOT NULL, legenda text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.avaliacao_caracteristicas_relevantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), descricao text NOT NULL,
  efeito text NOT NULL DEFAULT 'NEUTRO' CHECK (efeito IN ('VALORIZA','DESVALORIZA','NEUTRO')),
  modelada boolean NOT NULL DEFAULT false, observacao text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.imovel_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  imovel_id uuid NOT NULL REFERENCES public.imoveis(id), avaliacao_id uuid REFERENCES public.avaliacoes(id),
  motivo text NOT NULL, dados jsonb NOT NULL, hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid
);

CREATE TABLE public.fontes_mercado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('IMOBILIARIA','CORRETOR','PROPRIETARIO','PORTAL','ORGAO_PUBLICO','REDE_SOCIAL','PLACA','OUTRO')),
  nome text NOT NULL, observacao text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.fonte_mercado_contatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  fonte_id uuid NOT NULL REFERENCES public.fontes_mercado(id), nome text, telefone text, email text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.dados_mercado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  imovel_id uuid NOT NULL REFERENCES public.imoveis(id),
  tipo_negocio text NOT NULL DEFAULT 'LOCACAO' CHECK (tipo_negocio IN ('LOCACAO','VENDA')),
  natureza_dado text NOT NULL DEFAULT 'OFERTA' CHECK (natureza_dado IN ('OFERTA','NEGOCIACAO','CONTRATO_PRIVADO','CONTRATO_PUBLICO','OUTRO')),
  status text NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','INATIVO','DESCARTADO')),
  valor_ofertado numeric(14,2), valor_negociado numeric(14,2), valor_utilizado numeric(14,2), valor_unitario numeric(14,4),
  periodicidade text NOT NULL DEFAULT 'MENSAL' CHECK (periodicidade IN ('MENSAL','ANUAL','UNICO')),
  data_observacao date, data_confirmacao date, url_anuncio text, anuncio_id text, descricao text, contrato_publico jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid DEFAULT auth.uid(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dados_mercado_imovel_idx ON public.dados_mercado(imovel_id);
CREATE TABLE public.dados_mercado_fontes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  dado_id uuid NOT NULL REFERENCES public.dados_mercado(id), fonte_id uuid NOT NULL REFERENCES public.fontes_mercado(id),
  contato_id uuid REFERENCES public.fonte_mercado_contatos(id), principal boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.dados_mercado_evidencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  dado_id uuid NOT NULL REFERENCES public.dados_mercado(id),
  tipo text NOT NULL DEFAULT 'URL' CHECK (tipo IN ('PRINT','URL','DOCUMENTO','FOTO')),
  storage_ref text, url text, descricao text, capturado_em timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.dados_mercado_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  dado_id uuid NOT NULL REFERENCES public.dados_mercado(id), anterior jsonb NOT NULL, novo jsonb NOT NULL,
  alterado_por uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.dados_mercado_confirmacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  dado_id uuid NOT NULL REFERENCES public.dados_mercado(id), data_confirmacao date NOT NULL, meio text, resultado text,
  observacao text, created_by uuid DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.pesquisas_mercado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), titulo text NOT NULL,
  periodo_inicio date, periodo_fim date, abrangencia text,
  status text NOT NULL DEFAULT 'EM_ANDAMENTO' CHECK (status IN ('EM_ANDAMENTO','CONCLUIDA')),
  observacao text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.pesquisa_mercado_fontes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), pesquisa_id uuid NOT NULL REFERENCES public.pesquisas_mercado(id),
  fonte_id uuid NOT NULL REFERENCES public.fontes_mercado(id), observacao text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.avaliacao_amostras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), dado_id uuid NOT NULL REFERENCES public.dados_mercado(id),
  selecionada boolean NOT NULL DEFAULT true, habilitada_modelo boolean NOT NULL DEFAULT true,
  origem_territorial text NOT NULL DEFAULT 'LOCAL' CHECK (origem_territorial IN ('LOCAL','MUNICIPIO_COMPARAVEL','CONTRATO_PUBLICO_LOCAL','CONTRATO_PUBLICO_EXTERNO','OUTRA_FONTE')),
  motivo_inclusao text, motivo_desabilitacao text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (avaliacao_id, dado_id)
);
CREATE TABLE public.avaliacao_conjuntos_dados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), versao int NOT NULL,
  status text NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO','EM_USO','CONGELADO','SUPERADO')),
  congelado_em timestamptz, congelado_por uuid, observacao text, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  UNIQUE (avaliacao_id, versao)
);
CREATE TABLE public.avaliacao_conjunto_amostras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), conjunto_id uuid NOT NULL REFERENCES public.avaliacao_conjuntos_dados(id),
  amostra_id uuid NOT NULL REFERENCES public.avaliacao_amostras(id), dado_id uuid NOT NULL REFERENCES public.dados_mercado(id),
  habilitada_modelo boolean NOT NULL DEFAULT true, UNIQUE (conjunto_id, amostra_id)
);
CREATE TABLE public.avaliacao_amostra_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), conjunto_id uuid NOT NULL REFERENCES public.avaliacao_conjuntos_dados(id),
  amostra_id uuid NOT NULL REFERENCES public.avaliacao_amostras(id), dado_id uuid NOT NULL REFERENCES public.dados_mercado(id),
  imovel_id uuid NOT NULL REFERENCES public.imoveis(id), dados jsonb NOT NULL, hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (conjunto_id, amostra_id)
);
CREATE TABLE public.avaliacao_municipios_comparaveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), uf text NOT NULL, municipio_nome text NOT NULL, municipio_ibge text,
  status text NOT NULL DEFAULT 'SUGERIDO' CHECK (status IN ('SUGERIDO','APROVADO','REJEITADO')),
  justificativa text, decidido_por uuid, decidido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.avaliacao_variaveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), nome text NOT NULL,
  codigo text NOT NULL CHECK (codigo ~ '^[a-z][a-z0-9_]{0,39}$'),
  tipo_variavel text NOT NULL DEFAULT 'QUANTITATIVA' CHECK (tipo_variavel IN ('QUANTITATIVA','DICOTOMICA','PROXY','CODIGO_ALOCADO','OUTRA')),
  papel text NOT NULL DEFAULT 'DISPONIVEL' CHECK (papel IN ('DEPENDENTE','INDEPENDENTE','DISPONIVEL')),
  origem_tipo text NOT NULL DEFAULT 'MANUAL' CHECK (origem_tipo IN ('ATRIBUTO_IMOBILIARIO','CAMPO_DADO_MERCADO','MANUAL','DERIVADA')),
  atributo_id uuid REFERENCES public.atributos_imobiliarios(id), campo_origem text, unidade text,
  relacao_esperada text NOT NULL DEFAULT 'INDEFINIDA' CHECK (relacao_esperada IN ('POSITIVA','NEGATIVA','INDEFINIDA')),
  obrigatoria boolean NOT NULL DEFAULT false, transformacoes_autorizadas text[] NOT NULL DEFAULT ARRAY['DIRECT'],
  ativo boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (avaliacao_id, codigo)
);
CREATE TABLE public.avaliacao_variavel_valores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), variavel_id uuid NOT NULL REFERENCES public.avaliacao_variaveis(id),
  scope_type text NOT NULL CHECK (scope_type IN ('AVALIANDO','AMOSTRA')), amostra_id uuid REFERENCES public.avaliacao_amostras(id),
  valor numeric, valor_texto text, origem text, updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((scope_type = 'AMOSTRA') = (amostra_id IS NOT NULL))
);
CREATE UNIQUE INDEX avaliacao_variavel_valores_amostra_uq ON public.avaliacao_variavel_valores(variavel_id, amostra_id) WHERE scope_type = 'AMOSTRA';
CREATE UNIQUE INDEX avaliacao_variavel_valores_avaliando_uq ON public.avaliacao_variavel_valores(variavel_id) WHERE scope_type = 'AVALIANDO';
CREATE TABLE public.avaliacao_espacos_modelagem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), conjunto_id uuid NOT NULL REFERENCES public.avaliacao_conjuntos_dados(id),
  modo text NOT NULL DEFAULT 'ASSISTIDO' CHECK (modo IN ('MANUAL','ASSISTIDO','AMPLA')),
  dependente_variavel_id uuid NOT NULL REFERENCES public.avaliacao_variaveis(id),
  transformacoes_dependente text[] NOT NULL DEFAULT ARRAY['LN'], candidatos_estimados int,
  status text NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO','GERADO')),
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid DEFAULT auth.uid()
);
CREATE TABLE public.avaliacao_espaco_variaveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), espaco_id uuid NOT NULL REFERENCES public.avaliacao_espacos_modelagem(id),
  variavel_id uuid NOT NULL REFERENCES public.avaliacao_variaveis(id), obrigatoria boolean NOT NULL DEFAULT true,
  relacao_esperada text NOT NULL DEFAULT 'INDEFINIDA' CHECK (relacao_esperada IN ('POSITIVA','NEGATIVA','INDEFINIDA')),
  UNIQUE (espaco_id, variavel_id)
);
CREATE TABLE public.avaliacao_espaco_transformacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), espaco_id uuid NOT NULL REFERENCES public.avaliacao_espacos_modelagem(id),
  variavel_id uuid NOT NULL REFERENCES public.avaliacao_variaveis(id), transformacao text NOT NULL REFERENCES public.stat_transformations(codigo),
  power numeric, UNIQUE (espaco_id, variavel_id, transformacao)
);
CREATE TABLE public.avaliacao_modelos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), conjunto_id uuid NOT NULL REFERENCES public.avaliacao_conjuntos_dados(id),
  espaco_id uuid REFERENCES public.avaliacao_espacos_modelagem(id), numero int NOT NULL, nome text NOT NULL,
  modelo_origem_id uuid REFERENCES public.avaliacao_modelos(id),
  origem_tipo text NOT NULL DEFAULT 'MANUAL' CHECK (origem_tipo IN ('MANUAL','GERADO_ASSISTIDO','GERADO_AMPLA','DUPLICADO','SIMULACAO_VARIAVEL','SIMULACAO_AMOSTRA','OUTRO')),
  dependente_variavel_id uuid NOT NULL REFERENCES public.avaliacao_variaveis(id),
  dependente_transformacao text NOT NULL REFERENCES public.stat_transformations(codigo), dependente_power numeric,
  nivel_confianca numeric NOT NULL DEFAULT 0.80 CHECK (nivel_confianca > 0 AND nivel_confianca < 1),
  amostras_excluidas uuid[] NOT NULL DEFAULT '{}', favorito boolean NOT NULL DEFAULT false, candidato boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO','CALCULADO','ERRO','EM_VALIDACAO')),
  stale boolean NOT NULL DEFAULT false, stale_motivo text, stale_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid DEFAULT auth.uid(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (avaliacao_id, numero)
);
CREATE TABLE public.avaliacao_modelo_variaveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), modelo_id uuid NOT NULL REFERENCES public.avaliacao_modelos(id),
  variavel_id uuid NOT NULL REFERENCES public.avaliacao_variaveis(id), transformacao text NOT NULL REFERENCES public.stat_transformations(codigo),
  power numeric, ordem int NOT NULL DEFAULT 0, UNIQUE (modelo_id, variavel_id)
);
CREATE TABLE public.avaliacao_modelo_execucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), modelo_id uuid NOT NULL REFERENCES public.avaliacao_modelos(id),
  engine_name text NOT NULL, engine_version text NOT NULL, status text NOT NULL CHECK (status IN ('SUCESSO','ERRO')),
  input_snapshot_json jsonb NOT NULL, input_hash text NOT NULL, output_json jsonb, output_hash text, erro_codigo text,
  iniciado_em timestamptz NOT NULL, concluido_em timestamptz NOT NULL, executado_por uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX avaliacao_modelo_execucoes_modelo_idx ON public.avaliacao_modelo_execucoes(modelo_id, created_at DESC);
CREATE TABLE public.modelo_resultado_resumo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), execucao_id uuid NOT NULL UNIQUE REFERENCES public.avaliacao_modelo_execucoes(id),
  modelo_id uuid NOT NULL REFERENCES public.avaliacao_modelos(id), n int NOT NULL, k int NOT NULL,
  r2 numeric, r2_ajustado numeric, f numeric, sig_f numeric, pior_sig_regressor numeric, amplitude_pct numeric, grau_precisao text,
  extrapola boolean, centro_preliminar numeric, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.modelo_coeficientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), execucao_id uuid NOT NULL REFERENCES public.avaliacao_modelo_execucoes(id),
  codigo text NOT NULL, transformacao text, beta numeric NOT NULL, erro_padrao numeric NOT NULL, t numeric NOT NULL, sig numeric NOT NULL,
  ordem int NOT NULL
);
CREATE TABLE public.modelo_execucao_erros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), execucao_id uuid NOT NULL REFERENCES public.avaliacao_modelo_execucoes(id),
  codigo text NOT NULL, detalhe jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.modelo_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), modelo_id uuid NOT NULL REFERENCES public.avaliacao_modelos(id),
  execucao_id uuid NOT NULL REFERENCES public.avaliacao_modelo_execucoes(id), dados jsonb NOT NULL, hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.validation_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, codigo text NOT NULL, nome text NOT NULL, versao int NOT NULL,
  status text NOT NULL DEFAULT 'VIGENTE' CHECK (status IN ('RASCUNHO','VIGENTE','SUPERADA')),
  parametros jsonb NOT NULL DEFAULT '{}', vigente_desde date NOT NULL DEFAULT CURRENT_DATE, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX validation_policies_uq ON public.validation_policies(COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), codigo, versao);
CREATE TABLE public.validation_policy_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), policy_id uuid NOT NULL REFERENCES public.validation_policies(id),
  codigo text NOT NULL, numero int NOT NULL, nome text NOT NULL,
  origem text NOT NULL CHECK (origem IN ('NORMA_TECNICA','PROCEDIMENTO_INTERNO','MOTOR_ESTATISTICO','DOCUMENTACAO_TECNICA','OUTRA')),
  modo text NOT NULL CHECK (modo IN ('AUTOMATICO','ASSISTIDO','DERIVADO','MANUAL')),
  bloqueante boolean NOT NULL DEFAULT false, entra_fundamentacao boolean NOT NULL DEFAULT false,
  thresholds jsonb NOT NULL DEFAULT '{}', ativo boolean NOT NULL DEFAULT true, UNIQUE (policy_id, codigo)
);
CREATE TABLE public.organization_validation_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id),
  policy_id uuid NOT NULL REFERENCES public.validation_policies(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.model_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), modelo_id uuid NOT NULL REFERENCES public.avaliacao_modelos(id),
  execucao_id uuid NOT NULL REFERENCES public.avaliacao_modelo_execucoes(id), policy_id uuid NOT NULL REFERENCES public.validation_policies(id),
  overall_status text NOT NULL CHECK (overall_status IN ('APTO','APTO_COM_RESSALVAS','REQUER_AJUSTES','BLOQUEADO')),
  fundamentacao_grau text, precisao_grau text, amplitude_pct numeric, resumo_json jsonb NOT NULL,
  stale boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid
);
CREATE INDEX model_validations_modelo_idx ON public.model_validations(modelo_id, created_at DESC);
CREATE TABLE public.model_validation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), validation_id uuid NOT NULL REFERENCES public.model_validations(id),
  codigo text NOT NULL, numero int NOT NULL, nome text NOT NULL, origem text NOT NULL, modo text NOT NULL,
  status text NOT NULL CHECK (status IN ('ATENDE','NAO_ATENDE','REQUER_ANALISE','NAO_APLICAVEL','NAO_VERIFICADO')),
  grau text, valor numeric, detalhe text, dados jsonb, revisado boolean NOT NULL DEFAULT false, bloqueante boolean NOT NULL DEFAULT false
);
CREATE TABLE public.validation_manual_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), modelo_id uuid NOT NULL REFERENCES public.avaliacao_modelos(id),
  codigo text NOT NULL, decisao text NOT NULL CHECK (decisao IN ('ATENDE','NAO_ATENDE','INCONCLUSIVO')),
  justificativa text NOT NULL CHECK (length(btrim(justificativa)) >= 10), created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.model_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), modelo_id uuid NOT NULL REFERENCES public.avaliacao_modelos(id),
  validation_id uuid NOT NULL REFERENCES public.model_validations(id), execucao_id uuid NOT NULL REFERENCES public.avaliacao_modelo_execucoes(id),
  status text NOT NULL DEFAULT 'VIGENTE' CHECK (status IN ('VIGENTE','INVALIDADO','REVOGADO')),
  justificativa text, accepted_by uuid NOT NULL, accepted_at timestamptz NOT NULL DEFAULT now(), invalidado_em timestamptz, invalidado_motivo text
);
CREATE UNIQUE INDEX model_acceptances_um_vigente ON public.model_acceptances(avaliacao_id) WHERE status = 'VIGENTE';
CREATE TABLE public.validation_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), validation_id uuid NOT NULL REFERENCES public.model_validations(id),
  acceptance_id uuid REFERENCES public.model_acceptances(id), dados jsonb NOT NULL, hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.arbitration_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, codigo text NOT NULL, versao int NOT NULL,
  percentual_inferior numeric(6,2) NOT NULL, percentual_superior numeric(6,2) NOT NULL, origem text NOT NULL DEFAULT 'PROCEDIMENTO_INTERNO',
  status text NOT NULL DEFAULT 'VIGENTE' CHECK (status IN ('RASCUNHO','VIGENTE','SUPERADA')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.rounding_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, codigo text NOT NULL, versao int NOT NULL,
  casas_decimais int NOT NULL DEFAULT 2, status text NOT NULL DEFAULT 'VIGENTE' CHECK (status IN ('RASCUNHO','VIGENTE','SUPERADA')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.avaliacao_projecoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), modelo_id uuid NOT NULL REFERENCES public.avaliacao_modelos(id),
  acceptance_id uuid NOT NULL REFERENCES public.model_acceptances(id), execucao_id uuid NOT NULL REFERENCES public.avaliacao_modelo_execucoes(id),
  nivel_confianca numeric NOT NULL, z0 numeric NOT NULL, se_media numeric NOT NULL, t_critico numeric NOT NULL, log_response boolean NOT NULL,
  avaliando_json jsonb NOT NULL, extrapolacao jsonb NOT NULL,
  intervalo_predicao_status text NOT NULL DEFAULT 'NOT_VALIDATED' CHECK (intervalo_predicao_status IN ('AVAILABLE','NOT_AVAILABLE','NOT_VALIDATED','NOT_APPLICABLE')),
  engine_version text NOT NULL, stale boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid
);
CREATE TABLE public.avaliacao_projecao_centros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), projecao_id uuid NOT NULL REFERENCES public.avaliacao_projecoes(id),
  centro text NOT NULL CHECK (centro IN ('DIRECT','MODE','MEDIAN','MEAN')), valor numeric NOT NULL,
  limite_inferior numeric NOT NULL, limite_superior numeric NOT NULL, amplitude_pct numeric NOT NULL, grau_precisao text,
  UNIQUE (projecao_id, centro)
);
CREATE TABLE public.avaliacao_arbitrios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), projecao_id uuid NOT NULL REFERENCES public.avaliacao_projecoes(id),
  centro text NOT NULL, aplicar boolean NOT NULL DEFAULT false, policy_id uuid NOT NULL REFERENCES public.arbitration_policies(id),
  campo_inferior numeric NOT NULL, campo_superior numeric NOT NULL, valor_arbitrado numeric, justificativa text,
  created_at timestamptz NOT NULL DEFAULT now(), created_by uuid
);
CREATE TABLE public.avaliacao_arbitrio_caracteristicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), arbitrio_id uuid NOT NULL REFERENCES public.avaliacao_arbitrios(id),
  caracteristica_id uuid NOT NULL REFERENCES public.avaliacao_caracteristicas_relevantes(id)
);
CREATE TABLE public.avaliacao_valores_adotados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), projecao_id uuid NOT NULL REFERENCES public.avaliacao_projecoes(id),
  centro_id uuid NOT NULL REFERENCES public.avaliacao_projecao_centros(id), arbitrio_id uuid REFERENCES public.avaliacao_arbitrios(id),
  origem text NOT NULL CHECK (origem IN ('TENDENCIA_CENTRAL','ARBITRAMENTO')),
  valor_adotado_bruto numeric NOT NULL, valor_final_apresentacao numeric NOT NULL, unidade text NOT NULL DEFAULT 'R$/mês',
  rounding_policy_id uuid REFERENCES public.rounding_policies(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.avaliacao_resultado_economico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), projecao_id uuid NOT NULL REFERENCES public.avaliacao_projecoes(id),
  valor_adotado_id uuid NOT NULL REFERENCES public.avaliacao_valores_adotados(id), centro text NOT NULL,
  conclusao text NOT NULL CHECK (conclusao IN ('COMPATIVEL','FAVORAVEL_ADMINISTRACAO','ABAIXO_REFERENCIA','ACIMA_REFERENCIA','REQUER_ANALISE','OUTRA')),
  conclusao_texto text, status text NOT NULL DEFAULT 'VIGENTE' CHECK (status IN ('VIGENTE','DESATUALIZADO','SUPERADO')),
  stale boolean NOT NULL DEFAULT false, confirmado_por uuid NOT NULL, confirmado_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX avaliacao_resultado_um_vigente ON public.avaliacao_resultado_economico(avaliacao_id) WHERE status = 'VIGENTE';
CREATE TABLE public.avaliacao_compatibilidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), resultado_id uuid NOT NULL REFERENCES public.avaliacao_resultado_economico(id),
  valor_administrativo_id uuid NOT NULL REFERENCES public.avaliacao_valores_administrativos(id), tipo_valor text NOT NULL,
  valor_referencia numeric NOT NULL, valor_comparado numeric NOT NULL, diferenca_absoluta numeric NOT NULL, diferenca_percentual numeric NOT NULL,
  direcao text NOT NULL CHECK (direcao IN ('ABAIXO_REFERENCIA','IGUAL_REFERENCIA','ACIMA_REFERENCIA')),
  posicao_ic text NOT NULL CHECK (posicao_ic IN ('ABAIXO_IC','DENTRO_IC','ACIMA_IC','NAO_APLICAVEL')),
  posicao_campo text NOT NULL CHECK (posicao_campo IN ('ABAIXO_CAMPO','DENTRO_CAMPO','ACIMA_CAMPO','NAO_APLICAVEL')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.avaliacao_resultado_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), resultado_id uuid NOT NULL REFERENCES public.avaliacao_resultado_economico(id),
  dados jsonb NOT NULL, hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.laudo_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid, codigo text NOT NULL, nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.laudo_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), template_id uuid NOT NULL REFERENCES public.laudo_templates(id), versao int NOT NULL,
  status text NOT NULL DEFAULT 'VIGENTE' CHECK (status IN ('RASCUNHO','VIGENTE','SUPERADA')), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, versao)
);
CREATE TABLE public.laudo_template_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), template_version_id uuid NOT NULL REFERENCES public.laudo_template_versions(id),
  codigo text NOT NULL, titulo text NOT NULL, ordem int NOT NULL, numerada boolean NOT NULL DEFAULT true, obrigatoria boolean NOT NULL DEFAULT true,
  conteudo_padrao text NOT NULL DEFAULT '', blocos_sistema text[] NOT NULL DEFAULT '{}', UNIQUE (template_version_id, codigo)
);
CREATE TABLE public.laudo_template_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), section_id uuid NOT NULL REFERENCES public.laudo_template_sections(id),
  tipo text NOT NULL CHECK (tipo IN ('TEXT','TABLE','CHART','IMAGE','GALLERY','CALLOUT','PAGE_BREAK','REFERENCE')),
  ordem int NOT NULL, config jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE public.laudos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL UNIQUE REFERENCES public.avaliacoes(id), template_version_id uuid NOT NULL REFERENCES public.laudo_template_versions(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.laudo_versoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), laudo_id uuid NOT NULL REFERENCES public.laudos(id),
  avaliacao_versao_id uuid NOT NULL REFERENCES public.avaliacao_versoes(id), revisao int NOT NULL,
  status text NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO','EM_REVISAO','EMITIDO','SUPERADO')),
  motivo_revisao text, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid, UNIQUE (laudo_id, revisao)
);
CREATE TABLE public.laudo_secoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), laudo_versao_id uuid NOT NULL REFERENCES public.laudo_versoes(id),
  codigo text NOT NULL, titulo text NOT NULL, ordem int NOT NULL, numerada boolean NOT NULL DEFAULT true, obrigatoria boolean NOT NULL DEFAULT true,
  blocos_sistema text[] NOT NULL DEFAULT '{}', conteudo text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO','APROVADA')), stale boolean NOT NULL DEFAULT false,
  aprovada_por uuid, aprovada_em timestamptz, updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid,
  UNIQUE (laudo_versao_id, codigo)
);
CREATE TABLE public.laudo_blocos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), secao_id uuid NOT NULL REFERENCES public.laudo_secoes(id),
  tipo text NOT NULL CHECK (tipo IN ('TEXT','TABLE','CHART','IMAGE','GALLERY','CALLOUT','PAGE_BREAK','REFERENCE')),
  ordem int NOT NULL DEFAULT 0, config jsonb NOT NULL DEFAULT '{}', conteudo text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.laudo_texto_versoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), secao_id uuid NOT NULL REFERENCES public.laudo_secoes(id),
  conteudo text NOT NULL, created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.laudo_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), laudo_versao_id uuid NOT NULL REFERENCES public.laudo_versoes(id),
  numero text NOT NULL, titulo text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('DOCUMENTOS_IMOVEL','PESQUISA_MERCADO','RELATORIO_ESTATISTICO','RELATORIO_ESCASSEZ')),
  opcional boolean NOT NULL DEFAULT false, incluido boolean NOT NULL DEFAULT true, UNIQUE (laudo_versao_id, tipo)
);
CREATE TABLE public.laudo_preflight_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), laudo_versao_id uuid NOT NULL REFERENCES public.laudo_versoes(id),
  resultado text NOT NULL CHECK (resultado IN ('PASS','FAIL')), executado_por uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.laudo_preflight_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), run_id uuid NOT NULL REFERENCES public.laudo_preflight_runs(id),
  codigo text NOT NULL, status text NOT NULL CHECK (status IN ('OK','FALHA','ALERTA')), mensagem text NOT NULL
);
CREATE TABLE public.laudo_emissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), laudo_versao_id uuid NOT NULL UNIQUE REFERENCES public.laudo_versoes(id),
  revisao int NOT NULL, codigo text NOT NULL, preflight_run_id uuid NOT NULL REFERENCES public.laudo_preflight_runs(id),
  hash text NOT NULL, emitido_por uuid NOT NULL, emitido_em timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.laudo_emissao_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), emissao_id uuid NOT NULL UNIQUE REFERENCES public.laudo_emissoes(id),
  dados jsonb NOT NULL, hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.laudo_arquivos_emitidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), emissao_id uuid NOT NULL REFERENCES public.laudo_emissoes(id),
  formato text NOT NULL CHECK (formato IN ('PDF','DOCX')), storage_ref text NOT NULL, hash text, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.avaliacao_ai_conteudos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id),
  context_type text NOT NULL CHECK (context_type IN ('PROPERTY_DESCRIPTION','MARKET_DIAGNOSIS','VALIDATION_EXPLANATION','VALIDATION_ACTION','COMPATIBILITY','CONCLUSION','REPORT_SECTION')),
  context_id uuid, purpose text NOT NULL, prompt_version text NOT NULL, model text NOT NULL, context_json jsonb NOT NULL,
  generated_text text NOT NULL, approved_text text,
  status text NOT NULL DEFAULT 'PROPOSTO' CHECK (status IN ('PROPOSTO','APROVADO','DESCARTADO')),
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), approved_by uuid, approved_at timestamptz
);
CREATE TABLE public.avaliacao_fontes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), titulo text NOT NULL, url text, documento_ref text,
  data_consulta date NOT NULL DEFAULT CURRENT_DATE, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid DEFAULT auth.uid()
);
CREATE TABLE public.avaliacao_fonte_fatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), fonte_id uuid NOT NULL REFERENCES public.avaliacao_fontes(id),
  fato text NOT NULL, aprovado boolean NOT NULL DEFAULT false, aprovado_por uuid, aprovado_em timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.avaliacao_fonte_usos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id), fato_id uuid NOT NULL REFERENCES public.avaliacao_fonte_fatos(id),
  laudo_secao_id uuid NOT NULL REFERENCES public.laudo_secoes(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  avaliacao_id uuid REFERENCES public.avaliacoes(id), entity_type text NOT NULL, entity_id uuid, event_type text NOT NULL,
  actor_id uuid, details_json jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_avaliacao_idx ON public.audit_events(avaliacao_id, created_at DESC);

INSERT INTO public.avaliacao_permissoes(codigo, descricao, categoria) VALUES
 ('evaluation.create','Criar avaliação','EDITAR'), ('evaluation.edit','Editar dados da avaliação','EDITAR'),
 ('evaluation.cancel','Cancelar avaliação','DECIDIR'), ('property.edit','Editar imóvel avaliando','EDITAR'),
 ('inspection.edit','Editar vistoria','EDITAR'), ('market.edit','Editar pesquisa de mercado','EDITAR'),
 ('market.select_samples','Selecionar amostras e congelar conjunto','DECIDIR'), ('model.create','Criar modelo e variáveis','EDITAR'),
 ('model.run','Executar modelo','EDITAR'), ('model.simulate','Simular modelo','EDITAR'), ('validation.run','Executar validação','EDITAR'),
 ('validation.manual_review','Registrar análise manual','DECIDIR'), ('validation.accept','Aceitar modelo','DECIDIR'),
 ('economic.select_center','Selecionar tendência central','DECIDIR'), ('economic.apply_arbitration','Aplicar arbitramento','DECIDIR'),
 ('economic.confirm','Confirmar resultado econômico','DECIDIR'), ('report.edit','Editar laudo','EDITAR'),
 ('report.approve','Aprovar seções do laudo','APROVAR'), ('report.render_draft','Gerar rascunho do laudo','EDITAR'),
 ('report.issue','Emitir laudo','EMITIR'), ('report.create_revision','Criar revisão do laudo','EMITIR'),
 ('template.manage','Gerir modelos de laudo','GERIR'), ('policy.manage','Gerir políticas técnicas','GERIR');

INSERT INTO public.avaliacao_papel_permissoes(papel, permissao)
SELECT 'RESPONSAVEL_TECNICO', codigo FROM public.avaliacao_permissoes WHERE codigo NOT IN ('evaluation.create','template.manage','policy.manage')
UNION ALL SELECT 'COLABORADOR', unnest(ARRAY['evaluation.edit','property.edit','inspection.edit','market.edit','model.create','model.run','model.simulate','validation.run','report.edit','report.render_draft'])
UNION ALL SELECT 'REVISOR', unnest(ARRAY['report.approve','report.render_draft'])
UNION ALL SELECT 'GLOBAL_ADMIN', unnest(ARRAY['evaluation.create','evaluation.cancel','template.manage','policy.manage'])
UNION ALL SELECT 'GLOBAL_TECNICO', unnest(ARRAY['evaluation.create']);

INSERT INTO public.stat_transformations(codigo, nome, engine_code, dominio, ordem) VALUES
 ('DIRECT','x',1,'todos os reais',1), ('INVERSE','1/x',2,'x ≠ 0',2), ('LN','ln(x)',3,'x > 0',3), ('SQUARE','x²',4,'todos os reais',4),
 ('SQRT','√x',5,'x ≥ 0',5), ('INV_SQUARE','1/x²',6,'x ≠ 0',6), ('INV_SQRT','1/√x',7,'x > 0',7), ('POWER','x^k',0,'depende de k (k ≠ 0)',8);

INSERT INTO public.atributos_imobiliarios(organization_id, codigo, nome, categoria, data_type, unidade, modelable, ordem, opcoes) VALUES
 (NULL,'AREA_CONSTRUIDA','Área construída','Dimensões','NUMERIC','m²',true,1,NULL),
 (NULL,'AREA_TERRENO','Área do terreno','Dimensões','NUMERIC','m²',true,2,NULL),
 (NULL,'FRENTE','Testada/frente','Dimensões','NUMERIC','m',true,3,NULL),
 (NULL,'QUARTOS','Quartos','Ambientes','NUMERIC','un',true,10,NULL),
 (NULL,'SUITES','Suítes','Ambientes','NUMERIC','un',true,11,NULL),
 (NULL,'BANHEIROS','Banheiros','Ambientes','NUMERIC','un',true,12,NULL),
 (NULL,'VAGAS','Vagas de garagem','Ambientes','NUMERIC','un',true,13,NULL),
 (NULL,'PADRAO','Padrão construtivo','Qualidade','CATEGORY',NULL,true,20,'["BAIXO","NORMAL","ALTO"]'),
 (NULL,'ESTADO_CONSERVACAO','Estado de conservação','Qualidade','CATEGORY',NULL,true,21,'["RUIM","REGULAR","BOM","OTIMO"]'),
 (NULL,'IDADE_APARENTE','Idade aparente','Qualidade','NUMERIC','anos',true,22,NULL),
 (NULL,'DISTANCIA_CENTRO','Distância ao centro','Localização','NUMERIC','km',true,30,NULL),
 (NULL,'ESQUINA','Imóvel de esquina','Localização','BOOL',NULL,true,31,NULL),
 (NULL,'AR_CONDICIONADO','Ar-condicionado','Infraestrutura','STATUS',NULL,true,40,NULL),
 (NULL,'ACESSIBILIDADE','Acessibilidade','Infraestrutura','STATUS',NULL,true,41,NULL),
 (NULL,'GERADOR','Gerador','Infraestrutura','STATUS',NULL,false,42,NULL);

INSERT INTO public.document_tokens(codigo, descricao) VALUES
 ('NUMERO_AVALIACAO','Número da avaliação/laudo'),('TIPO_AVALIACAO','Tipo da avaliação'),('MUNICIPIO','Município'),('UF','UF'),
 ('TIPO_IMOVEL','Tipo de imóvel'),('PROCESSO_ADMINISTRATIVO','Processo administrativo'),('NUMERO_CONTRATO','Número do contrato'),
 ('RESPONSAVEL_TECNICO','Responsável técnico'),('ENDERECO_AVALIANDO','Endereço do avaliando'),('AREA_AVALIANDO','Área construída do avaliando'),
 ('N_AMOSTRAS','Quantidade de dados do modelo aceito'),('MODELO_ACEITO','Modelo aceito'),('R2','Coeficiente de determinação'),('R2_AJUSTADO','R² ajustado'),
 ('NIVEL_CONFIANCA','Nível de confiança do intervalo'),('CENTRO_ADOTADO','Tendência central adotada'),('VALOR_MERCADO','Valor de mercado (tendência central)'),
 ('LIMITE_INFERIOR','Limite inferior do IC'),('LIMITE_SUPERIOR','Limite superior do IC'),('AMPLITUDE_IC','Amplitude do IC'),
 ('CAMPO_INFERIOR','Limite inferior do campo de arbítrio'),('CAMPO_SUPERIOR','Limite superior do campo de arbítrio'),
 ('VALOR_FINAL','Valor final adotado'),('ORIGEM_VALOR','Origem do valor adotado'),('GRAU_FUNDAMENTACAO','Grau de fundamentação'),('GRAU_PRECISAO','Grau de precisão'),
 ('VALOR_ADMINISTRATIVO_REFERENCIA','Valor administrativo comparado'),('DIFERENCA_PERCENTUAL','Diferença percentual da compatibilidade'),
 ('CONCLUSAO','Conclusão estruturada'),('DATA_EMISSAO','Data de emissão'),('ENGINE_VERSION','Versão do motor estatístico');

INSERT INTO public.aval_impact_rules(entity_type, campo, nivel, descricao) VALUES
 ('valor_administrativo','valor','ECONOMIC_RESULT','Valor administrativo altera a compatibilidade e a conclusão'),
 ('valor_administrativo','data_referencia','REPORT_ONLY','Data de referência aparece apenas no laudo'),
 ('valor_administrativo','observacao','REPORT_ONLY','Observação aparece apenas no laudo'),
 ('variavel_valor_avaliando','valor','MODEL','Valor do avaliando usado no modelo'),
 ('variavel_valor_amostra','valor','DATASET','Valor de amostra usada no conjunto oficial'),
 ('variavel','relacao_esperada','VALIDATION','Relação esperada altera o critério de relacionamento'),
 ('variavel','tipo_variavel','VALIDATION','Tipo da variável altera a micronumerosidade'),
 ('resultado','centro','PROJECTION','Troca de tendência central altera o resultado e o laudo'),
 ('fonte_contato','telefone','REPORT_ONLY','Contato da fonte aparece apenas no laudo'),
 ('fonte_contato','email','REPORT_ONLY','Contato da fonte aparece apenas no laudo'),
 ('avaliacao','processo_administrativo','REPORT_ONLY','Processo aparece apenas no laudo'),
 ('avaliacao','numero_contrato','REPORT_ONLY','Contrato aparece apenas no laudo'),
 ('avaliacao','observacao','REPORT_ONLY','Observação aparece apenas no laudo');

WITH p AS (
  INSERT INTO public.validation_policies(organization_id, codigo, nome, versao, status, parametros)
  VALUES (NULL, 'SIDIF_V1', 'Política técnica SiDIF V1 — Inferência estatística', 1, 'VIGENTE',
    '{"nivel_confianca":0.80,"precisao_graus":[{"grau":"III","max":30},{"grau":"II","max":40},{"grau":"I","max":50}]}'::jsonb)
  RETURNING id
)
INSERT INTO public.validation_policy_rules(policy_id, codigo, numero, nome, origem, modo, bloqueante, entra_fundamentacao, thresholds)
SELECT p.id, r.codigo, r.numero, r.nome, r.origem, r.modo, r.bloqueante, r.fund, r.th::jsonb FROM p, (VALUES
 ('RELACIONAMENTO',1,'Relacionamento das variáveis','NORMA_TECNICA','AUTOMATICO',false,false,'{}'),
 ('SIGNIF_REGRESSORES',2,'Significância dos regressores','NORMA_TECNICA','AUTOMATICO',true,true,'{"graus":[{"grau":"III","max":0.10},{"grau":"II","max":0.20},{"grau":"I","max":0.30}]}'),
 ('SIGNIF_MODELO',3,'Significância do modelo (F)','NORMA_TECNICA','AUTOMATICO',true,true,'{"graus":[{"grau":"III","max":0.01},{"grau":"II","max":0.02},{"grau":"I","max":0.05}]}'),
 ('NORMALIDADE',4,'Normalidade dos resíduos','NORMA_TECNICA','AUTOMATICO',false,false,'{"faixas":[{"z":1,"referencia":0.68,"tolerancia":0.02,"tolerancia_origem":"PROCEDIMENTO_INTERNO"},{"z":1.64,"referencia":0.90,"tolerancia":null},{"z":1.96,"referencia":0.95,"tolerancia":null}],"status_fora":"REQUER_ANALISE"}'),
 ('PRECISAO',5,'Grau de precisão (amplitude do IC)','NORMA_TECNICA','AUTOMATICO',false,false,'{"graus":[{"grau":"III","max":30},{"grau":"II","max":40},{"grau":"I","max":50}]}'),
 ('EXTRAPOLACAO',6,'Extrapolação','NORMA_TECNICA','ASSISTIDO',false,true,'{"grau_maximo_com_extrapolacao":"II","status_fora":"REQUER_ANALISE"}'),
 ('NUMERO_DADOS',7,'Número de dados','NORMA_TECNICA','AUTOMATICO',true,true,'{"graus":[{"grau":"III","multiplicador":6},{"grau":"II","multiplicador":4},{"grau":"I","multiplicador":3}]}'),
 ('T_DERIVADO',8,'Teste t (derivado)','MOTOR_ESTATISTICO','DERIVADO',false,false,'{}'),
 ('MULTICOLINEARIDADE',9,'Multicolinearidade','PROCEDIMENTO_INTERNO','AUTOMATICO',false,false,'{"r_max":0.80}'),
 ('HOMOCEDASTICIDADE',10,'Homocedasticidade','NORMA_TECNICA','MANUAL',false,false,'{}'),
 ('PONTOS_INFLUENTES',11,'Pontos influentes (Cook)','PROCEDIMENTO_INTERNO','ASSISTIDO',false,false,'{"cook_limite":null}'),
 ('OUTLIERS',12,'Outliers','NORMA_TECNICA','ASSISTIDO',false,false,'{}'),
 ('MICRONUMEROSIDADE',13,'Micronumerosidade','NORMA_TECNICA','AUTOMATICO',false,false,'{"faixas":[{"n_max":30,"minimo_abs":3},{"n_max":100,"minimo_pct":10},{"n_max":null,"minimo_abs":10}]}')
) AS r(codigo, numero, nome, origem, modo, bloqueante, fund, th);

INSERT INTO public.arbitration_policies(organization_id, codigo, versao, percentual_inferior, percentual_superior, origem, status)
VALUES (NULL, 'SIDIF_ARBITRIO', 1, 15, 15, 'PROCEDIMENTO_INTERNO', 'VIGENTE');
INSERT INTO public.rounding_policies(organization_id, codigo, versao, casas_decimais, status) VALUES (NULL, 'SIDIF_ARREDONDAMENTO', 1, 2, 'VIGENTE');

WITH t AS (
  INSERT INTO public.laudo_templates(organization_id, codigo, nome) VALUES (NULL, 'LAUDO_LOCACAO', 'Laudo de avaliação — locação') RETURNING id
), v AS (
  INSERT INTO public.laudo_template_versions(template_id, versao, status) SELECT id, 1, 'VIGENTE' FROM t RETURNING id
)
INSERT INTO public.laudo_template_sections(template_version_id, codigo, titulo, ordem, numerada, obrigatoria, conteudo_padrao, blocos_sistema)
SELECT v.id, s.codigo, s.titulo, s.ordem, s.numerada, s.obrig, s.txt, s.blocos FROM v, (VALUES
 ('RESUMO','Resumo',0,false,true,'Laudo {{NUMERO_AVALIACAO}} — {{TIPO_AVALIACAO}} de {{TIPO_IMOVEL}} em {{MUNICIPIO}}/{{UF}}. Valor final adotado: {{VALOR_FINAL}} ({{ORIGEM_VALOR}}). Fundamentação: grau {{GRAU_FUNDAMENTACAO}}. Precisão: grau {{GRAU_PRECISAO}}.', ARRAY['TABELA_RESUMO']),
 ('SOLICITANTE','Solicitante',1,true,true,'Avaliação solicitada no processo administrativo {{PROCESSO_ADMINISTRATIVO}}.', '{}'::text[]),
 ('OBJETO','Objeto',2,true,true,'Imóvel situado em {{ENDERECO_AVALIANDO}}, {{MUNICIPIO}}/{{UF}}, com área construída de {{AREA_AVALIANDO}}.', '{}'::text[]),
 ('OBJETIVO','Objetivo',3,true,true,'Determinar o valor de mercado de locação mensal do imóvel avaliando.', '{}'::text[]),
 ('FINALIDADE','Finalidade',4,true,true,'Subsidiar a decisão administrativa referente a {{TIPO_AVALIACAO}}.', '{}'::text[]),
 ('CARACTERIZACAO','Caracterização do Bem Avaliando',5,true,true,'', ARRAY['TABELA_AVALIANDO']),
 ('DIAGNOSTICO_MERCADO','Diagnóstico do Mercado',6,true,true,'', '{}'::text[]),
 ('METODOLOGIA','Metodologia',7,true,true,'Adotou-se o Método Comparativo Direto de Dados de Mercado, com tratamento por inferência estatística (regressão linear múltipla), conforme a ABNT NBR 14653.', '{}'::text[]),
 ('PESQUISA_MERCADO','Pesquisa de Mercado e Tratamento',8,true,true,'Foram utilizados {{N_AMOSTRAS}} dados de mercado no modelo aceito.', ARRAY['TABELA_AMOSTRAS']),
 ('INFERENCIA','Inferência Estatística',9,true,true,'Modelo aceito: {{MODELO_ACEITO}}. Coeficiente de determinação R² = {{R2}} (R² ajustado = {{R2_AJUSTADO}}).', ARRAY['TABELA_MODELO','TABELA_COEFICIENTES','TABELA_VALIDACAO']),
 ('ESPECIFICACAO','Especificação da Avaliação',10,true,true,'Grau de fundamentação {{GRAU_FUNDAMENTACAO}} e grau de precisão {{GRAU_PRECISAO}} (amplitude do intervalo de confiança de {{AMPLITUDE_IC}} a {{NIVEL_CONFIANCA}}).', ARRAY['TABELA_CENTROS']),
 ('COMPATIBILIDADE','Análise de Compatibilidade',11,true,true,'Valor administrativo comparado: {{VALOR_ADMINISTRATIVO_REFERENCIA}}. Diferença em relação ao valor de referência: {{DIFERENCA_PERCENTUAL}}.', ARRAY['TABELA_COMPATIBILIDADE']),
 ('CONCLUSAO','Conclusão',12,true,true,'Valor de mercado ({{CENTRO_ADOTADO}}): {{VALOR_MERCADO}}, com intervalo de confiança entre {{LIMITE_INFERIOR}} e {{LIMITE_SUPERIOR}}. Valor final adotado: {{VALOR_FINAL}}. Conclusão: {{CONCLUSAO}}.', '{}'::text[]),
 ('ENCERRAMENTO','Encerramento',13,true,true,'{{MUNICIPIO}}/{{UF}}, {{DATA_EMISSAO}}. Responsável técnico: {{RESPONSAVEL_TECNICO}}.', '{}'::text[])
) AS s(codigo, titulo, ordem, numerada, obrig, txt, blocos);

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT unnest(ARRAY['avaliacao_permissoes','avaliacao_papel_permissoes','stat_transformations','document_tokens','aval_impact_rules',
    'organization_sequences','avaliacoes','avaliacao_versoes','avaliacao_membros','avaliacao_metodos','avaliacao_valores_administrativos',
    'avaliacao_documentos','imoveis','imovel_localizacao','atributos_imobiliarios','imovel_atributos','imovel_ambientes','imovel_componentes',
    'imovel_infraestrutura','imovel_documentos','imovel_midias','avaliacao_imoveis','imovel_vistorias','imovel_vistoria_itens',
    'imovel_vistoria_midias','avaliacao_caracteristicas_relevantes','imovel_snapshots','fontes_mercado','fonte_mercado_contatos',
    'dados_mercado','dados_mercado_fontes','dados_mercado_evidencias','dados_mercado_historico','dados_mercado_confirmacoes',
    'pesquisas_mercado','pesquisa_mercado_fontes','avaliacao_amostras','avaliacao_conjuntos_dados','avaliacao_conjunto_amostras',
    'avaliacao_amostra_snapshots','avaliacao_municipios_comparaveis','avaliacao_variaveis','avaliacao_variavel_valores',
    'avaliacao_espacos_modelagem','avaliacao_espaco_variaveis','avaliacao_espaco_transformacoes','avaliacao_modelos',
    'avaliacao_modelo_variaveis','avaliacao_modelo_execucoes','modelo_resultado_resumo','modelo_coeficientes','modelo_execucao_erros',
    'modelo_snapshots','validation_policies','validation_policy_rules','organization_validation_policy','model_validations',
    'model_validation_results','validation_manual_reviews','model_acceptances','validation_snapshots','arbitration_policies',
    'rounding_policies','avaliacao_projecoes','avaliacao_projecao_centros','avaliacao_arbitrios','avaliacao_arbitrio_caracteristicas',
    'avaliacao_valores_adotados','avaliacao_resultado_economico','avaliacao_compatibilidades','avaliacao_resultado_snapshots',
    'laudo_templates','laudo_template_versions','laudo_template_sections','laudo_template_blocks','laudos','laudo_versoes',
    'laudo_secoes','laudo_blocos','laudo_texto_versoes','laudo_anexos','laudo_preflight_runs','laudo_preflight_results',
    'laudo_emissoes','laudo_emissao_snapshots','laudo_arquivos_emitidos','avaliacao_ai_conteudos','avaliacao_fontes',
    'avaliacao_fonte_fatos','avaliacao_fonte_usos','audit_events']) AS tbl LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tbl);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', r.tbl);
  END LOOP;
END $$;