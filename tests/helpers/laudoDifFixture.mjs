// Snapshot sintético de laudo DIF (mesma forma de aval_laudo_snapshot_build), com o caso real de Guarantã do Norte
// processado pelo motor estatístico. Usado pelos testes de composição/renderização do laudo institucional.
import { readFileSync } from 'node:fs';

export function makeJpeg(w, h) {
  // JPEG mínimo não é necessário: os testes usam PNG gerado pelo próprio codificador.
  return { w, h };
}

export function difSnapshot({ fit, input, midias = [] }) {
  const fx = JSON.parse(readFileSync(new URL('../fixtures/guaranta-do-norte-real.json', import.meta.url), 'utf8'));
  const ids = fx.input.sampleIds;
  const amostras = ids.map((id, i) => ({
    amostra_id: `am-${id}`, hash: 'h', dados: {
      habilitada_modelo: true,
      imovel: { tipo_imovel: 'Sala comercial', endereco: `Rua ${id}`, numero: String(100 + i), bairro: 'Centro', municipio_nome: 'Guarantã do Norte', uf: 'MT', area_construida: input.independents[1].values[i] },
      dado: { valor_utilizado: input.dependent.values[i], valor_unitario: Math.round((input.dependent.values[i] / input.independents[1].values[i]) * 100) / 100, periodicidade: 'MENSAL', natureza_dado: 'OFERTA' },
      fontes: [{ nome: `Imobiliária ${id}`, tipo: 'IMOBILIARIA' }],
      variaveis: { banheiro: input.independents[0].values[i], area: input.independents[1].values[i] },
    },
  }));
  amostras.push({ amostra_id: 'am-6', hash: 'h', dados: { habilitada_modelo: false, imovel: { tipo_imovel: 'Sala comercial', endereco: 'Rua 6', area_construida: 90 }, dado: { valor_utilizado: 9000, valor_unitario: 100 }, fontes: [], variaveis: { banheiro: 1, area: 90 } } });
  const meta = [...ids.map((id) => ({ amostra_id: `am-${id}`, no_conjunto: true })), { amostra_id: 'am-6', no_conjunto: true, motivo_desabilitacao: 'valor discrepante' },
    { amostra_id: 'am-x', no_conjunto: false, snapshot_inclusao: { imovel: { tipo_imovel: 'Loja', endereco: 'Av. Brasil', area_construida: 300 }, dado: { valor_utilizado: 7000 }, fontes: [], variaveis: {} } }];
  const T = { DIRECT: 'DIRECT' };
  const sec = (ordem, codigo, titulo, nivel, classe, texto, blocos = []) => ({ codigo, titulo, ordem, numerada: nivel > 0, nivel, classe, visivel: true, texto, blocos_sistema: blocos });
  const secoes = [
    sec(0, 'RESUMO', 'Resumo', 0, 'ESTRUTURADO', '', ['QUADRO_RESUMO']),
    sec(1, 'SOLICITANTE', 'Solicitante', 1, 'FIXO', 'Defensoria Pública do Estado de Mato Grosso.'),
    sec(2, 'OBJETO', 'Objeto da Avaliação', 1, 'ASSISTIDO', 'Imóvel comercial localizado na Rua A, Centro, Guarantã do Norte – MT.'),
    sec(3, 'CARACTERIZACAO', 'Caracterização do Bem Avaliando', 1, 'FIXO', ''),
    sec(4, 'VISTORIA', 'Vistoria', 2, 'ASSISTIDO', 'A vistoria foi realizada pelo avaliador.'),
    sec(5, 'IDENTIFICACAO', 'Identificação do Imóvel Avaliando', 2, 'FIXO', '', ['FIGURAS_MAPA']),
    sec(6, 'CARACTERIZACAO_IMOVEL', 'Caracterização do Imóvel', 3, 'ASSISTIDO', 'Trata-se de um imóvel comercial de padrão construtivo normal, com **recepção** e salas.', ['FIGURAS_IMOVEL']),
    sec(7, 'TRATAMENTO', 'Tratamento de Dados', 1, 'FIXO', 'Os dados foram tratados por inferência estatística.', ['TABELA_VARIAVEIS', 'TABELA_COMPOSICAO_AMOSTRAS']),
    sec(8, 'INFERENCIAS', 'Inferências', 1, 'FIXO', 'O modelo adotado é:', ['EQUACAO', 'TABELA_ESTATISTICAS_MODELO']),
    sec(9, 'SIGNIFICANCIA', 'Significância dos regressores', 2, 'FIXO', 'Texto.', ['TABELA_SIGNIFICANCIA', 'TABELA_ANOVA', 'TABELA_NORMALIDADE']),
    sec(10, 'CALCULO_VALOR', 'Cálculo do valor de mercado', 2, 'ESTRUTURADO', '', ['TABELA_AVALIANDO_VARIAVEIS', 'TABELA_CALCULO_VALOR', 'TABELA_CAMPO_ARBITRIO']),
    sec(11, 'CLASSIFICACAO', 'Classificação da Avaliação', 1, 'FIXO', '', ['TABELA_FUNDAMENTACAO', 'TABELA_PRECISAO']),
    sec(12, 'COMPATIBILIDADE', 'Análise de compatibilidade', 1, 'ASSISTIDO', 'Texto de compatibilidade.', ['TABELA_COMPATIBILIDADE']),
    sec(13, 'CONCLUSAO', 'Conclusão', 1, 'ASSISTIDO', 'Conclui-se pelo valor de {{VALOR_FINAL}}.', ['TABELA_CONCLUSAO']),
    sec(14, 'ENCERRAMENTO', 'Encerramento', 1, 'FIXO', 'Nada mais havendo a relatar, encerra-se o presente laudo.', ['ASSINATURA']),
  ];
  return {
    codigo: '006/2026', revisao: 0, layout: 'DIF_V1', rascunho: true,
    avaliacao: { codigo: '006/2026', tipo: 'REAJUSTE', municipio_nome: 'Guarantã do Norte', uf: 'MT' },
    tokens: { VALOR_FINAL: 'R$ 3.300,00', GRAU_FUNDAMENTACAO: 'II', GRAU_PRECISAO: 'III', VALOR_MERCADO: 'R$ 3.312,40', CENTRO_ADOTADO: 'Moda',
      LIMITE_INFERIOR: 'R$ 2.900,00', LIMITE_SUPERIOR: 'R$ 3.700,00', CAMPO_INFERIOR: 'R$ 2.815,54', CAMPO_SUPERIOR: 'R$ 3.809,26', NIVEL_CONFIANCA: '80%',
      AMPLITUDE_IC: '24,15%', TIPO_AVALIACAO: 'Reajuste contratual', VALOR_CONTRATO_ATUAL: 'R$ 3.000,00', MUNICIPIO: 'Guarantã do Norte', UF: 'MT', DATA_EMISSAO: '17/11/2026',
      RESPONSAVEL_TECNICO: 'Responsável Técnico' },
    secoes,
    anexos: [{ numero: 'I', titulo: 'Documentos do Imóvel Avaliando', tipo: 'DOCUMENTOS_IMOVEL' }, { numero: 'II', titulo: 'Imóveis de Amostra', tipo: 'PESQUISA_MERCADO' }, { numero: 'III', titulo: 'Tratamento de Inferência Estatística', tipo: 'RELATORIO_ESTATISTICO' }],
    valores_administrativos: [{ tipo: 'CONTRATO_ATUAL', valor: 3000, data_referencia: '2025-01-10' }, { tipo: 'REAJUSTADO', valor: 3150.5, data_referencia: '2026-01-10' }],
    resultado_snapshot: {
      centros: [{ centro: 'MODE', valor: 3312.4, limite_inferior: 2900, limite_superior: 3700, amplitude_pct: 24.15, grau_precisao: 'III' }],
      compatibilidades: [{ tipo_valor: 'REAJUSTADO', valor_referencia: 3312.4, valor_comparado: 3150.5, diferenca_percentual: 4.89 }],
    },
    execucao: { engine_version: '1.1.1', output_hash: 'abcdef0123456789abcdef', output: { fit }, input: { regression_input: input } },
    modelo: { numero: 1, nome: 'Modelo 1', dependente_transformacao: input.dependent.transform, amostras_excluidas: [] },
    modelo_variaveis: [{ codigo: 'banheiro', nome: 'Banheiros', unidade: 'un', transformacao: 'LN', tipo_variavel: 'QUANTITATIVA', relacao_esperada: 'POSITIVA' },
      { codigo: 'area', nome: 'Área', unidade: 'm²', transformacao: 'INVERSE', tipo_variavel: 'QUANTITATIVA', relacao_esperada: 'POSITIVA' }],
    dependente: { codigo: 'valor', nome: 'Valor total', unidade: 'R$' },
    amostras, amostras_meta: meta,
    fundamentacao: { resumo: { grade_calculated: 'II', total_points: 14 }, itens: [{ item_number: 1, titulo: 'Caracterização do imóvel avaliando', grade_achieved: 'III', points: 3 }, { item_number: 2, titulo: 'Quantidade mínima de dados', grade_achieved: 'II', points: 2 }] },
    projecao: { avaliando: { banheiro: 2, area: 127.82 } },
    arbitrio: { aplicar: false },
    capa: { solicitante: 'Defensoria Pública do Estado de Mato Grosso', local: 'Cuiabá – MT', responsavel_nome: 'Fulano de Tal', responsavel_titulo: 'Engenheiro Civil', responsavel_crea: 'MT 000000', responsavel_cargo: 'Analista', data_vistoria: '2026-10-05' },
    template: { codigo: 'TEMPLATE_DIF_AVALIACAO_V1', versao: 1, identidade: { diretoria: 'DIRETORIA DE INFRAESTRUTURA FÍSICA' } },
    imovel_avaliando: { tipo_imovel: 'Comercial', endereco: 'Rua A', numero: '10', bairro: 'Centro', municipio_nome: 'Guarantã do Norte', uf: 'MT', area_construida: 127.82 },
    midias,
  };
}
