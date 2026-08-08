/**
 * Entrega Institucional — etapa posterior e independente do Recebimento Definitivo.
 * Pergunta central: "A edificação está visualmente adequada, funcional e pronta
 * para ser utilizada pela Administração?"
 */

export type EntregaStatus = 'preparacao' | 'em_andamento' | 'entregue' | 'cancelada';

export type VerificacaoStatus = 'nao_vistoriado' | 'conforme' | 'pendencia' | 'nao_aplica';

export type Responsabilidade = 'contratada' | 'dif_engenharia' | 'administracao' | 'terceiro';

export type Impacto = 'impeditiva' | 'nao_impeditiva';

export type PendenciaSituacao =
  | 'pendente'
  | 'correcao_registrada'
  | 'reprovada'
  | 'sanada'
  | 'cancelada';

export type Resultado = 'apto' | 'apto_com_ressalvas' | 'nao_apto' | 'incompleta';

export const STATUS_LABEL: Record<VerificacaoStatus, string> = {
  nao_vistoriado: 'Não vistoriado',
  conforme: 'Conforme',
  pendencia: 'Pendência',
  nao_aplica: 'Não se aplica',
};

export const STATUS_CURTO: Record<VerificacaoStatus, string> = {
  nao_vistoriado: '—',
  conforme: 'OK',
  pendencia: 'Pendência',
  nao_aplica: 'N/A',
};

export const RESPONSABILIDADE_LABEL: Record<Responsabilidade, string> = {
  contratada: 'Contratada da Obra',
  dif_engenharia: 'DIF / Engenharia',
  administracao: 'Administração',
  terceiro: 'Terceiro / Outro Contrato',
};

export const RESPONSABILIDADE_CURTA: Record<Responsabilidade, string> = {
  contratada: 'Contratada',
  dif_engenharia: 'DIF / Engenharia',
  administracao: 'Administração',
  terceiro: 'Terceiro',
};

export const IMPACTO_LABEL: Record<Impacto, string> = {
  impeditiva: 'Impeditiva',
  nao_impeditiva: 'Não impeditiva',
};

export const SITUACAO_LABEL: Record<PendenciaSituacao, string> = {
  pendente: 'Pendente',
  correcao_registrada: 'Correção registrada',
  reprovada: 'Reprovada na reinspeção',
  sanada: 'Sanada',
  cancelada: 'Cancelada',
};

export const PAPEL_LABEL: Record<string, string> = {
  fiscal: 'Fiscal da Obra',
  gestor: 'Gestor(a) do Contrato',
  diretoria: 'Representante da Diretoria Geral',
  outro: 'Outro participante',
};

export const EVENTO_LABEL: Record<string, string> = {
  criada: 'Pendência registrada',
  correcao_registrada: 'Correção registrada',
  reinspecionada: 'Reinspecionada',
  reprovada: 'Correção reprovada na reinspeção',
  sanada: 'Pendência sanada',
  cancelada: 'Pendência cancelada',
  reaberta: 'Pendência reaberta',
};

/** Situações consideradas "em aberto" para efeito de resultado. */
export const ABERTAS: PendenciaSituacao[] = ['pendente', 'correcao_registrada', 'reprovada'];

export const RESULTADO_LABEL: Record<Resultado, string> = {
  apto: 'APTO PARA ENTREGA',
  apto_com_ressalvas: 'APTO PARA ENTREGA COM RESSALVAS',
  nao_apto: 'NÃO APTO PARA ENTREGA',
  incompleta: 'VISTORIA INCOMPLETA',
};

export const RESULTADO_CURTO: Record<Resultado, string> = {
  apto: 'Apto',
  apto_com_ressalvas: 'Apto com Ressalvas',
  nao_apto: 'Não Apto',
  incompleta: 'Vistoria incompleta',
};

export const TEXTO_CIENCIA =
  'Ao registrar a ciência, a Administração declara ter tomado conhecimento das condições ' +
  'da edificação e das ressalvas eventualmente constantes da vistoria de Entrega Institucional, ' +
  'recebendo as instalações para utilização. A Entrega Institucional não substitui nem reabre o ' +
  'Recebimento Definitivo, constituindo etapa de transferência das instalações para utilização ' +
  'pela Administração.';

export function formatarData(iso?: string | null) {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function formatarDataHora(iso?: string | null) {
  if (!iso) return '—';
  const data = formatarData(iso);
  const hora = iso.slice(11, 16);
  return hora ? `${data} às ${hora}` : data;
}
