import type { Ambiente, AmbienteServico, Verificacao } from '@/hooks/useRecebimentoChecklist';
import type { AccentTone } from './ui';

export interface ProgressoBasico {
  total: number;
  feitas: number;
  conformes: number;
  naoConformes: number;
  naoExecutados: number;
  pct: number;
}

export function progressoDeVerificacoes(vs: Verificacao[]): ProgressoBasico {
  const total = vs.length;
  const feitas = vs.filter((v) => v.status !== 'nao_vistoriado').length;
  return {
    total,
    feitas,
    conformes: vs.filter((v) => v.status === 'conforme').length,
    naoConformes: vs.filter((v) => v.status === 'nao_conforme').length,
    naoExecutados: vs.filter((v) => v.status === 'nao_executado').length,
    pct: total ? (feitas / total) * 100 : 0,
  };
}

export function verificacoesDoAmbiente(a: Ambiente): Verificacao[] {
  return a.servicos.flatMap((s) => s.verificacoes);
}

export function progressoServico(s: AmbienteServico) {
  return progressoDeVerificacoes(s.verificacoes);
}

export function progressoAmbiente(a: Ambiente) {
  return progressoDeVerificacoes(verificacoesDoAmbiente(a));
}

/** Rótulo curto e tom de cor do card do ambiente, conforme o Figma. */
export function resumoAmbiente(a: Ambiente, pendenciasAbertas = 0) {
  const p = progressoAmbiente(a);
  let tom: AccentTone = 'neutro';
  let rotulo = 'Não iniciado';

  if (pendenciasAbertas > 0) {
    tom = 'pendencia';
    rotulo = `${pendenciasAbertas} pendência${pendenciasAbertas > 1 ? 's' : ''}`;
  } else if (p.total > 0 && p.feitas === p.total) {
    tom = 'conforme';
    rotulo = 'Concluído';
  } else if (p.feitas > 0) {
    tom = 'andamento';
    rotulo = 'Em andamento';
  }

  return { ...p, tom, rotulo };
}
