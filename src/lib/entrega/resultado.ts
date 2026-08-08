import { ABERTAS, type Resultado } from './constants';
import type { EntregaAmbiente, EntregaPendencia } from '@/hooks/useEntregaInstitucional';

export interface ResumoEntrega {
  resultado: Resultado;
  ambientes: number;
  verificacoes: number;
  conformes: number;
  naoAplica: number;
  naoVistoriados: number;
  pendenciasTotal: number;
  pendenciasAbertas: number;
  impeditivasAbertas: number;
  naoImpeditivasAbertas: number;
  sanadas: number;
  porResponsabilidade: Record<string, number>;
  progresso: number;
}

/**
 * Resultado é sempre calculado, nunca escolhido manualmente.
 * Não vistoriados > 0 → VISTORIA INCOMPLETA (bloqueia a formalização).
 */
export function calcularResumo(
  ambientes: EntregaAmbiente[],
  pendencias: EntregaPendencia[],
): ResumoEntrega {
  const todas = ambientes.flatMap((a) => a.grupos.flatMap((g) => g.verificacoes));
  const naoVistoriados = todas.filter((v) => v.status === 'nao_vistoriado').length;
  const conformes = todas.filter((v) => v.status === 'conforme').length;
  const naoAplica = todas.filter((v) => v.status === 'nao_aplica').length;

  const validas = pendencias.filter((p) => p.situacao !== 'cancelada');
  const abertas = validas.filter((p) => ABERTAS.includes(p.situacao));
  const impeditivas = abertas.filter((p) => p.impacto === 'impeditiva');

  const porResponsabilidade: Record<string, number> = {
    contratada: 0,
    dif_engenharia: 0,
    administracao: 0,
    terceiro: 0,
  };
  for (const p of abertas) porResponsabilidade[p.responsabilidade] += 1;

  let resultado: Resultado;
  if (todas.length === 0 || naoVistoriados > 0) resultado = 'incompleta';
  else if (impeditivas.length > 0) resultado = 'nao_apto';
  else if (abertas.length > 0) resultado = 'apto_com_ressalvas';
  else resultado = 'apto';

  return {
    resultado,
    ambientes: ambientes.length,
    verificacoes: todas.length,
    conformes,
    naoAplica,
    naoVistoriados,
    pendenciasTotal: validas.length,
    pendenciasAbertas: abertas.length,
    impeditivasAbertas: impeditivas.length,
    naoImpeditivasAbertas: abertas.length - impeditivas.length,
    sanadas: validas.filter((p) => p.situacao === 'sanada').length,
    porResponsabilidade,
    progresso: todas.length ? ((todas.length - naoVistoriados) / todas.length) * 100 : 0,
  };
}

/** Progresso de um ambiente: respondidas / total (N/A conta como respondida). */
export function progressoAmbiente(amb: EntregaAmbiente) {
  const todas = amb.grupos.flatMap((g) => g.verificacoes);
  const feitas = todas.filter((v) => v.status !== 'nao_vistoriado').length;
  return { feitas, total: todas.length, pct: todas.length ? (feitas / todas.length) * 100 : 0 };
}
