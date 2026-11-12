// Rótulos usados nos documentos do laudo (compartilhados entre navegador e servidor).
export const VALOR_ADM_LABEL: Record<string, string> = {
  CONTRATO_ATUAL: 'Valor do contrato atual',
  SOLICITADO_PROPRIETARIO: 'Valor solicitado pelo proprietário',
  PROPOSTO_RENOVACAO: 'Valor proposto para renovação',
  REAJUSTADO: 'Valor reajustado',
  OUTRO: 'Outro valor',
};
export const TRANSFORM_LABEL: Record<string, string> = {
  DIRECT: 'x', INVERSE: '1/x', LN: 'ln(x)', SQUARE: 'x²', SQRT: '√x', INV_SQUARE: '1/x²', INV_SQRT: '1/√x', POWER: 'x^k',
};
export const CENTRO_LABEL: Record<string, string> = { DIRECT: 'Estimativa central', MODE: 'Moda', MEDIAN: 'Mediana', MEAN: 'Média' };
export const CRITERIO_STATUS_LABEL: Record<string, string> = {
  ATENDE: 'Atende', NAO_ATENDE: 'Não atende', REQUER_ANALISE: 'Requer análise', NAO_APLICAVEL: 'Não aplicável', NAO_VERIFICADO: 'Não verificado',
};
