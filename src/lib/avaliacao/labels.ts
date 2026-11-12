// Rótulos e mapeamentos de exibição do módulo Avaliações.
import { TRANSFORM_LABEL as TRANSFORM_LABEL_LOCAL } from '../../../supabase/functions/_shared/avaliacao/docLabels.ts';
export { CENTRO_LABEL, CRITERIO_STATUS_LABEL, TRANSFORM_LABEL, VALOR_ADM_LABEL } from '../../../supabase/functions/_shared/avaliacao/docLabels.ts';
export const TIPO_LABEL: Record<string, string> = {
  NOVA_LOCACAO: 'Nova locação',
  RENOVACAO: 'Renovação',
  REAJUSTE: 'Reajuste',
};
export const STATUS_LABEL: Record<string, string> = { ATIVA: 'Ativa', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada' };
export const STAGE_ORDER = ['CADASTRO', 'IMOVEL', 'PESQUISA_MERCADO', 'MODELAGEM', 'VALIDACAO', 'RESULTADO_ECONOMICO', 'LAUDO', 'EMISSAO'] as const;
export const STAGE_LABEL: Record<string, string> = {
  CADASTRO: 'Cadastro', IMOVEL: 'Imóvel', PESQUISA_MERCADO: 'Pesquisa de mercado', MODELAGEM: 'Modelagem',
  VALIDACAO: 'Validação', RESULTADO_ECONOMICO: 'Resultado econômico', LAUDO: 'Laudo', EMISSAO: 'Emitido',
};
export const PAPEL_LABEL: Record<string, string> = { RESPONSAVEL_TECNICO: 'Responsável técnico', COLABORADOR: 'Colaborador', REVISOR: 'Revisor' };
export const TRANSFORMS = ['DIRECT', 'INVERSE', 'LN', 'SQUARE', 'SQRT', 'INV_SQUARE', 'INV_SQRT'] as const;
export const CONCLUSAO_LABEL: Record<string, string> = {
  COMPATIVEL: 'Compatível com o mercado',
  FAVORAVEL_ADMINISTRACAO: 'Favorável à Administração',
  ABAIXO_REFERENCIA: 'Abaixo do valor de referência',
  ACIMA_REFERENCIA: 'Acima do valor de referência',
  REQUER_ANALISE: 'Requer análise',
  OUTRA: 'Outra (descrever)',
};
export const OVERALL_LABEL: Record<string, string> = {
  APTO: 'Apto', APTO_COM_RESSALVAS: 'Apto com ressalvas', REQUER_AJUSTES: 'Requer ajustes', BLOQUEADO: 'Bloqueado',
};
export const BLOCO_LABEL: Record<string, string> = {
  DADOS: 'Dados', VARIAVEIS: 'Variáveis', IMOVEL: 'Imóvel', MERCADO: 'Mercado', MODELAGEM: 'Modelagem', VALIDACAO: 'Validação', RESULTADO: 'Resultado', LAUDO: 'Laudo',
};
export const BLOCO_ROUTE: Record<string, string> = {
  DADOS: 'dados', VARIAVEIS: 'variaveis', IMOVEL: 'imovel', MERCADO: 'mercado', MODELAGEM: 'modelagem', VALIDACAO: 'validacao', RESULTADO: 'resultado', LAUDO: 'laudo',
};
/** Rótulo da transformação; para a variável dependente usa y (ln(y), 1/y…). */
export const transformLabel = (t: string, dependente = false) => {
  const l = TRANSFORM_LABEL_LOCAL[t] ?? t;
  return dependente ? l.replace(/x/g, 'y') : l;
};
export const ESTADO_LABEL: Record<string, string> = {
  PRONTA: 'Concluído', EM_ANDAMENTO: 'Em andamento', PENDENTE: 'Pendente', BLOQUEADA: 'Aguardando etapa anterior', DESATUALIZADA: 'Desatualizado',
};
export const NIVEL_IMPACTO_LABEL: Record<string, string> = {
  NO_IMPACT: 'Sem impacto técnico',
  REPORT_ONLY: 'Afeta apenas o texto do laudo',
  ECONOMIC_RESULT: 'Desatualiza o resultado econômico',
  PROJECTION: 'Desatualiza a projeção e o resultado',
  VALIDATION: 'Invalida a validação e o aceite do modelo',
  MODEL: 'Desatualiza os modelos, a validação e o aceite',
  DATASET: 'Exige nova versão do conjunto de dados',
};
export const AUDIT_EVENT_LABEL: Record<string, string> = {
  EVALUATION_CREATED: 'Avaliação criada', EVALUATION_CANCELLED: 'Avaliação cancelada', MEMBER_CHANGED: 'Equipe alterada',
  DATASET_FROZEN: 'Conjunto de dados congelado', SNAPSHOT_KEPT: 'Fotografia de amostra mantida', MODEL_CREATED: 'Modelo criado',
  MODEL_EXECUTED: 'Modelo calculado', MODEL_SENT_TO_VALIDATION: 'Modelo enviado à validação', VALIDATION_EXECUTED: 'Validação executada',
  VALIDATION_MANUAL_REVIEW: 'Análise manual registrada', MODEL_ACCEPTED: 'Modelo aceito', PROJECTION_CALCULATED: 'Projeção oficial calculada',
  ARBITRATION_CONFIRMED: 'Arbítrio confirmado', ECONOMIC_RESULT_CONFIRMED: 'Resultado econômico confirmado', REPORT_CREATED: 'Laudo iniciado',
  REPORT_SECTION_APPROVED: 'Seção do laudo aprovada', REPORT_SECTION_REOPENED: 'Seção do laudo reaberta',
  REPORT_SECTION_REVIEWED_AFTER_CHANGE: 'Seção revisada após alteração', REPORT_ISSUED: 'Laudo emitido', REPORT_REVISION_CREATED: 'Revisão do laudo criada',
  AI_TEXT_APPROVED: 'Texto sugerido aprovado', AI_TEXT_DISCARDED: 'Texto sugerido descartado', CHANGE_APPLIED: 'Campo corrigido', CHANGES_APPLIED: 'Correção de dados salva', PROPERTY_CLONED: 'Imóvel separado criado para a amostra',
  VARIABLE_VALUE_SYNCED: 'Valor de variável atualizado pelo cadastro', SHARED_RECORD_CHANGED: 'Cadastro compartilhado corrigido em outra avaliação',
  INVALIDATION_APPLIED: 'Itens dependentes marcados como desatualizados',
  MODEL_RESENT_TO_VALIDATION: 'Modelo reenviado à validação', MODEL_WITHDRAWN_FROM_VALIDATION: 'Modelo retirado da validação',
  MODEL_REVALIDATED: 'Modelo revalidado com as configurações atuais', VALIDATION_MARKED_STALE: 'Validação do modelo marcada como desatualizada',
  MODELS_ARCHIVED: 'Modelos arquivados', MODELS_UNARCHIVED: 'Modelos restaurados', MODEL_ROUND_CREATED: 'Rodada de modelos gerada',
  MODEL_ROUND_ARCHIVED: 'Rodada de modelos arquivada', MODEL_ROUND_UNARCHIVED: 'Rodada de modelos restaurada',
};

export const fmtMoney = (v: number | null | undefined) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? '—'
    : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtNum = (v: number | null | undefined, casas = 2) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? '—'
    : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
export const fmtDateTime = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};
/** Datas YYYY-MM-DD são convertidas por partes para evitar deslocamento de fuso. */
export const fmtDate = (ymd: string | null | undefined) => {
  if (!ymd) return '—';
  const [y, m, d] = ymd.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : '—';
};
