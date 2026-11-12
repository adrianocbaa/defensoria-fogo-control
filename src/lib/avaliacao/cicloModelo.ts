// Ciclo de vida do modelo (puro, sem acesso a dados). O banco aplica as mesmas regras; aqui só orientamos a tela.
// CALCULADO → (enviar) → EM_VALIDACAO → (aceitar) → validado | EM_VALIDACAO → (retirar) → CALCULADO → (arquivar) → arquivado.

export const MSG_ARQUIVAR_EM_VALIDACAO = 'Retire o modelo da validação antes de arquivá-lo.';
export const MSG_CONFIG_ALTERADA =
  'A configuração de validação deste modelo foi alterada. Os coeficientes da regressão permanecem válidos, mas a validação anterior precisa ser atualizada.';
export const MSG_MODELO_DESATUALIZADO =
  'Os dados ou variáveis usados no cálculo deste modelo mudaram. Ele não pode ser revalidado: retire-o da validação e gere um novo modelo a partir do conjunto atual.';
export const RETIRADA = {
  titulo: 'Retirar modelo da validação?',
  texto: 'O modelo retornará para a etapa de Modelagem. Os cálculos e o histórico das validações realizadas serão preservados.',
  aceito: 'Este modelo está aceito. O aceite será revogado (continua no histórico) e o resultado econômico precisará ser confirmado de novo. Informe o motivo.',
  minMotivoAceito: 10,
} as const;

export type SituacaoValidacao = 'SEM_VALIDACAO' | 'ATUAL' | 'CONFIG_ALTERADA' | 'MODELO_DESATUALIZADO';

/** Arquivar só oculta; modelo em validação precisa ser retirado antes. */
export function podeArquivar(m: { status: string }): { ok: boolean; motivo?: string } {
  return m.status === 'EM_VALIDACAO' ? { ok: false, motivo: MSG_ARQUIVAR_EM_VALIDACAO } : { ok: true };
}

export function separarArquivaveis<T extends { status: string }>(modelos: T[]): { arquivaveis: T[]; emValidacao: T[] } {
  return { arquivaveis: modelos.filter((m) => podeArquivar(m).ok), emValidacao: modelos.filter((m) => !podeArquivar(m).ok) };
}

export interface RelacaoAlterada { codigo: string; nome: string; antes: string; agora: string }

/** Compara a relação esperada usada na última validação (critério RELACIONAMENTO) com a configuração atual das variáveis. */
export function relacoesAlteradas(
  itensValidados: { code: string; esperado: string }[] | null | undefined,
  atuais: { codigo: string; nome?: string | null; relacao_esperada: string }[],
): RelacaoAlterada[] {
  if (!itensValidados?.length) return [];
  const out: RelacaoAlterada[] = [];
  for (const it of itensValidados) {
    const v = atuais.find((a) => a.codigo === it.code);
    if (v && v.relacao_esperada !== it.esperado) out.push({ codigo: v.codigo, nome: v.nome ?? v.codigo, antes: it.esperado, agora: v.relacao_esperada });
  }
  return out;
}

export function situacaoValidacao(p: { modeloStale: boolean; validacao: { stale: boolean } | null | undefined; alteradas?: RelacaoAlterada[] }): SituacaoValidacao {
  if (p.modeloStale) return 'MODELO_DESATUALIZADO';
  if (!p.validacao) return 'SEM_VALIDACAO';
  if (p.validacao.stale || (p.alteradas?.length ?? 0) > 0) return 'CONFIG_ALTERADA';
  return 'ATUAL';
}

/** Revalidar usa o MESMO modelo e a MESMA execução; só não é possível com o modelo desatualizado. */
export function podeRevalidar(s: SituacaoValidacao): boolean {
  return s === 'CONFIG_ALTERADA' || s === 'ATUAL' || s === 'SEM_VALIDACAO';
}

export interface EventoAuditoria { id: string; event_type: string; entity_type: string; entity_id: string | null; details_json: any; created_at: string; actor_id: string | null }

const CAMPOS_VALIDACAO = ['relacao_esperada', 'tipo_variavel', 'categorica'];

/** Eventos que contam a história de um modelo, em ordem cronológica. */
export function eventosDoModelo(eventos: EventoAuditoria[], modeloId: string, variavelIds: string[]): EventoAuditoria[] {
  const vars = new Set(variavelIds);
  return eventos.filter((e) => {
    if (e.entity_type === 'modelo') return e.entity_id === modeloId;
    if (e.event_type === 'CHANGE_APPLIED' && e.entity_type === 'variavel') return !!e.entity_id && vars.has(e.entity_id) && CAMPOS_VALIDACAO.includes(e.details_json?.campo);
    if (e.event_type === 'MODELS_ARCHIVED' || e.event_type === 'MODELS_UNARCHIVED') return (e.details_json?.modelos ?? []).includes(modeloId);
    return false;
  }).sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
}

export const EVENTO_MODELO_LABEL: Record<string, string> = {
  MODEL_CREATED: 'Modelo criado', MODEL_EXECUTED: 'Modelo calculado',
  MODEL_SENT_TO_VALIDATION: 'Enviado para validação', MODEL_RESENT_TO_VALIDATION: 'Reenviado para validação',
  VALIDATION_EXECUTED: 'Validação executada', MODEL_REVALIDATED: 'Revalidado com as configurações atuais',
  VALIDATION_MARKED_STALE: 'Validação marcada como desatualizada', MODEL_ACCEPTED: 'Validado (modelo aceito)',
  MODEL_WITHDRAWN_FROM_VALIDATION: 'Retirado da validação', MODELS_ARCHIVED: 'Arquivado', MODELS_UNARCHIVED: 'Desarquivado',
  VALIDATION_MANUAL_REVIEW: 'Análise manual registrada',
  RELATIONSHIP_VISUAL_ANALYSIS: 'Análise visual do relacionamento',
  OUTLIER_DECISION: 'Decisão sobre possível outlier',
};
const CAMPO_LABEL: Record<string, string> = { relacao_esperada: 'Relação esperada alterada', tipo_variavel: 'Tipo da variável alterado', categorica: 'Classificação categórica alterada' };

export function rotuloEventoModelo(e: Pick<EventoAuditoria, 'event_type' | 'details_json'>): string {
  if (e.event_type === 'CHANGE_APPLIED') return CAMPO_LABEL[e.details_json?.campo] ?? 'Configuração alterada';
  return EVENTO_MODELO_LABEL[e.event_type] ?? e.event_type;
}

/** Conclusões da análise visual do critério 1 (gráficos de relacionamento). */
export const ANALISE_VISUAL_LABEL: Record<string, string> = { COERENTE: 'Coerência confirmada', REVISAR: 'Marcado para revisão' };

/** Resumo legível de um registro de análise visual (histórico). */
export function detalheAnaliseVisual(d: { conclusao?: string; observacao?: string | null; modelo_nome?: string | null; engine_version?: string | null; validacao_numero?: number | null } | null | undefined): string {
  const x = d ?? {};
  const partes = [ANALISE_VISUAL_LABEL[x.conclusao ?? ''] ?? 'Análise registrada'];
  const ref = [x.modelo_nome, x.validacao_numero ? `validação ${x.validacao_numero}` : null, x.engine_version ? `motor ${x.engine_version}` : null].filter(Boolean).join(' · ');
  if (ref) partes.push(ref);
  const base = partes.join(' · ');
  return x.observacao ? `${base} — ${x.observacao}` : base;
}
