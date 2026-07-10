/**
 * Centraliza fórmulas e classificações usadas na página de Estatísticas de Obras.
 *
 * Regras (aprovadas pelo usuário):
 * - Semáforo aplica-se apenas a status reais `em_andamento` e `paralisada`.
 * - `concluida` → "Concluída" (fora do cálculo).
 * - `planejada` com início futuro → "Não iniciada" (fora do cálculo).
 * - `em_andamento` sem `data_inicio` → "Dados insuficientes".
 * - Sem `previsao_termino` → participa do semáforo, com alerta "Prazo não informado".
 * - Regras prioritárias: `paralisada` → sempre Alto; atraso > 15 dias → Alto; 1 a 15 dias → mínimo Médio.
 *
 * Todas as fórmulas ficam aqui para não divergirem entre KPIs, gráficos, tabela, alertas e CSV.
 */

export type ObraStatusReal = 'em_andamento' | 'paralisada' | 'concluida' | 'planejada' | 'planejamento';

export interface ObraParaRisco {
  id: string;
  nome: string;
  status: string;
  data_inicio?: string | null;
  previsao_termino?: string | null;
  data_termino_real?: string | null;
}

export interface EntradaRisco {
  obra: ObraParaRisco;
  /** % avanço físico (0-100) — RDO */
  avancoFisico?: number | null;
  /** % avanço financeiro (0-100) — Medições (useMedicoesFinanceiro) */
  avancoFinanceiro?: number | null;
  /** Data ISO do último RDO enviado (yyyy-mm-dd). */
  ultimoRdo?: string | null;
  /** true quando a obra tem `rdo_habilitado = false` (não contabiliza ausência de RDO). */
  rdoDesabilitado?: boolean;
  /** true quando a obra possui ao menos uma medição bloqueada. */
  temMedicaoBloqueada?: boolean;
}

export type ClassificacaoRisco = 'baixo' | 'medio' | 'alto' | 'concluida' | 'nao_iniciada' | 'insuficiente';

export interface ComponentesRisco {
  prazo: number;
  paralisacao: number;
  divergencia: number;
}

export interface ResultadoRisco {
  classificacao: ClassificacaoRisco;
  score: number;
  componentes: ComponentesRisco;
  diasAtraso: number | null;
  observacoes: string[];
}

const PESO_PRAZO = 0.40;
const PESO_PARALISACAO = 0.35;
const PESO_DIVERGENCIA = 0.25;

const HOJE = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const parseDate = (iso?: string | null): Date | null => {
  if (!iso) return null;
  const parts = iso.split('T')[0].split('-').map(Number);
  if (parts.length !== 3 || parts.some((v) => Number.isNaN(v))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

const diffDias = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 86400000);

/** Normaliza status vindos do banco. */
export function normalizarStatus(status: string): ObraStatusReal {
  const s = (status || '').toLowerCase();
  if (s === 'planejamento') return 'planejada';
  if (['em_andamento', 'paralisada', 'concluida', 'planejada'].includes(s)) return s as ObraStatusReal;
  return 'em_andamento';
}

/** Componente A — Prazo (0-100). */
function calcularComponentePrazo(
  diasAtraso: number | null,
  avancoTemporal: number | null,
  avancoFisico: number | null,
): number {
  if (diasAtraso == null) {
    // Sem previsão de término: usa apenas comparação temporal quando disponível.
    if (avancoTemporal != null && avancoFisico != null && avancoTemporal > avancoFisico) {
      const gap = avancoTemporal - avancoFisico;
      if (gap >= 30) return 60;
      if (gap >= 15) return 40;
      return 20;
    }
    return 0;
  }
  if (diasAtraso <= 0) {
    if (avancoTemporal != null && avancoFisico != null && avancoTemporal > avancoFisico) {
      const gap = avancoTemporal - avancoFisico;
      if (gap >= 30) return 50;
      if (gap >= 15) return 25;
      return 0;
    }
    return 0;
  }
  if (diasAtraso <= 15) {
    // 1..15 dias → interpolação 40..70
    return Math.round(40 + ((diasAtraso - 1) / 14) * 30);
  }
  if (diasAtraso <= 60) {
    // 16..60 → 80..100
    return Math.round(80 + ((diasAtraso - 16) / 44) * 20);
  }
  return 100;
}

/** Componente B — Paralisação / ausência de RDO. */
function calcularComponenteParalisacao(entrada: EntradaRisco, statusReal: ObraStatusReal): {
  valor: number;
  obs: string[];
} {
  const obs: string[] = [];
  if (statusReal === 'paralisada') return { valor: 100, obs };
  if (entrada.rdoDesabilitado) return { valor: 0, obs };

  const inicio = parseDate(entrada.obra.data_inicio);
  const ultRdo = parseDate(entrada.ultimoRdo);

  if (!ultRdo) {
    if (inicio && diffDias(HOJE(), inicio) < 15) {
      obs.push('Obra recém-iniciada, sem RDO ainda');
      return { valor: 0, obs };
    }
    obs.push('Sem RDO');
    return { valor: 60, obs };
  }
  const dias = diffDias(HOJE(), ultRdo);
  if (dias <= 15) return { valor: 0, obs };
  if (dias <= 30) return { valor: 30, obs: [`Último RDO há ${dias} dias`] };
  return { valor: 60, obs: [`Último RDO há ${dias} dias`] };
}

/** Componente C — Divergência físico × financeiro (com direção). */
function calcularComponenteDivergencia(fisico: number | null, financeiro: number | null): number {
  if (fisico == null || financeiro == null) return 0;
  const diff = financeiro - fisico; // positivo: financeiro à frente do físico
  if (diff >= 0) {
    if (diff < 8) return 0;
    if (diff < 15) return 30;
    if (diff < 25) return 60;
    return 100;
  }
  const gap = -diff; // físico à frente do financeiro
  if (gap < 15) return 0;
  if (gap < 25) return 20;
  return 40;
}

/** Calcula o risco de uma obra (score + classificação + observações). */
export function calcularRiscoObra(entrada: EntradaRisco): ResultadoRisco {
  const statusReal = normalizarStatus(entrada.obra.status);
  const obs: string[] = [];

  const inicio = parseDate(entrada.obra.data_inicio);
  const fim = parseDate(entrada.obra.previsao_termino);
  const hoje = HOJE();

  // Fora do cálculo
  if (statusReal === 'concluida') {
    return { classificacao: 'concluida', score: 0, componentes: { prazo: 0, paralisacao: 0, divergencia: 0 }, diasAtraso: null, observacoes: [] };
  }
  if (statusReal === 'planejada') {
    if (inicio && inicio.getTime() > hoje.getTime()) {
      return { classificacao: 'nao_iniciada', score: 0, componentes: { prazo: 0, paralisacao: 0, divergencia: 0 }, diasAtraso: null, observacoes: [] };
    }
    // planejada sem início definido → não iniciada
    if (!inicio) {
      return { classificacao: 'nao_iniciada', score: 0, componentes: { prazo: 0, paralisacao: 0, divergencia: 0 }, diasAtraso: null, observacoes: [] };
    }
  }
  if (statusReal === 'em_andamento' && !inicio) {
    return {
      classificacao: 'insuficiente',
      score: 0,
      componentes: { prazo: 0, paralisacao: 0, divergencia: 0 },
      diasAtraso: null,
      observacoes: ['Sem data de início'],
    };
  }

  if (!fim) obs.push('Prazo não informado');
  if (entrada.avancoFisico == null && !entrada.rdoDesabilitado) obs.push('Sem RDO');
  if (entrada.avancoFinanceiro == null || entrada.avancoFinanceiro === 0) {
    if (!entrada.temMedicaoBloqueada) obs.push('Sem medições');
  }

  // Dias de atraso e avanço temporal
  let diasAtraso: number | null = null;
  let avancoTemporal: number | null = null;
  if (inicio && fim) {
    const total = diffDias(fim, inicio);
    const decorrido = diffDias(hoje, inicio);
    avancoTemporal = total > 0 ? Math.max(0, Math.min(100, (decorrido / total) * 100)) : null;
    diasAtraso = diffDias(hoje, fim); // >0 significa atraso
  }

  const fisico = entrada.avancoFisico ?? null;
  const financeiro = entrada.avancoFinanceiro ?? null;

  const compPrazo = calcularComponentePrazo(diasAtraso, avancoTemporal, fisico);
  const { valor: compParal, obs: obsParal } = calcularComponenteParalisacao(entrada, statusReal);
  const compDiv = calcularComponenteDivergencia(fisico, financeiro);
  obs.push(...obsParal);

  const score = Math.round(compPrazo * PESO_PRAZO + compParal * PESO_PARALISACAO + compDiv * PESO_DIVERGENCIA);

  // Classificação por faixa
  let classificacao: ClassificacaoRisco = score >= 55 ? 'alto' : score >= 25 ? 'medio' : 'baixo';

  // Regras prioritárias
  if (statusReal === 'paralisada') classificacao = 'alto';
  if (diasAtraso != null && diasAtraso > 15) classificacao = 'alto';
  else if (diasAtraso != null && diasAtraso >= 1 && diasAtraso <= 15 && classificacao === 'baixo') classificacao = 'medio';

  return {
    classificacao,
    score,
    componentes: { prazo: compPrazo, paralisacao: compParal, divergencia: compDiv },
    diasAtraso,
    observacoes: obs,
  };
}

export const rotuloClassificacao: Record<ClassificacaoRisco, string> = {
  baixo: 'Baixo',
  medio: 'Médio',
  alto: 'Alto',
  concluida: 'Concluída',
  nao_iniciada: 'Não iniciada',
  insuficiente: 'Dados insuficientes',
};

export const corClassificacao: Record<ClassificacaoRisco, string> = {
  baixo: 'bg-green-100 text-green-800 border-green-200',
  medio: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  alto: 'bg-red-100 text-red-800 border-red-200',
  concluida: 'bg-slate-100 text-slate-700 border-slate-200',
  nao_iniciada: 'bg-slate-100 text-slate-600 border-slate-200',
  insuficiente: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const corDotClassificacao: Record<ClassificacaoRisco, string> = {
  baixo: 'bg-green-500',
  medio: 'bg-yellow-500',
  alto: 'bg-red-500',
  concluida: 'bg-slate-400',
  nao_iniciada: 'bg-slate-400',
  insuficiente: 'bg-slate-400',
};
