import type { Obra } from '@/data/mockObras';
import { parseDateBR } from '@/lib/planoExpansao';

export interface ObraIndicador {
  obra: Obra;
  valorContratado: number;
  valorAditivado: number;
  valorExecutado: number;
  execucaoFisica: number;
  prazoConsumido: number;
  desvio: number;
  diasRestantes: number | null;
  risco: 'normal' | 'atencao' | 'critico';
  motivo: string | null;
}

const MS_DIA = 1000 * 60 * 60 * 24;

function diffDias(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / MS_DIA);
}

export function calcularIndicadorObra(obra: Obra, hoje = new Date()): ObraIndicador {
  const valorContratado = Number(obra.valor || 0);
  const valorAditivado = Number(obra.valor_aditivado || 0);
  const valorExecutado = Number(obra.valorExecutado || 0);
  const execucaoFisica = Number(obra.porcentagemExecucao || 0);

  const inicio = parseDateBR(obra.dataInicio);
  const fim = parseDateBR(obra.previsaoTermino);

  let prazoConsumido = 0;
  let diasRestantes: number | null = null;
  if (inicio && fim && fim.getTime() > inicio.getTime()) {
    const total = diffDias(fim, inicio);
    const decorrido = diffDias(hoje, inicio);
    prazoConsumido = Math.max(0, Math.min(100, Math.round((decorrido / total) * 100)));
    diasRestantes = diffDias(fim, hoje);
  }

  const desvio = Math.round(execucaoFisica - prazoConsumido);

  let risco: ObraIndicador['risco'] = 'normal';
  let motivo: string | null = null;

  const emCurso = obra.status === 'em_andamento' || obra.status === 'paralisada';

  if (emCurso) {
    if (obra.status === 'paralisada') {
      risco = 'critico';
      motivo = 'Obra paralisada';
    } else if (diasRestantes !== null && diasRestantes < 0 && execucaoFisica < 100) {
      risco = 'critico';
      motivo = `Prazo expirado há ${Math.abs(diasRestantes)} dias`;
    } else if (desvio <= -20) {
      risco = 'critico';
      motivo = 'Execução muito abaixo do prazo consumido';
    } else if (desvio <= -10) {
      risco = 'atencao';
      motivo = 'Execução abaixo do prazo consumido';
    } else if (diasRestantes !== null && diasRestantes <= 30) {
      risco = 'atencao';
      motivo = `Contrato encerra em ${diasRestantes} dias`;
    }
  }

  return {
    obra,
    valorContratado,
    valorAditivado,
    valorExecutado,
    execucaoFisica,
    prazoConsumido,
    desvio,
    diasRestantes,
    risco,
    motivo,
  };
}

export interface ResumoCarteira {
  indicadores: ObraIndicador[];
  totalObras: number;
  ativas: number;
  aguardandoInicio: number;
  paralisadas: number;
  concluidasNoAno: number;
  emAtencao: number;
  criticas: number;
  valorInicial: number;
  acrescimos: number;
  supressoes: number;
  valorAtualizado: number;
  valorExecutado: number;
  saldo: number;
  percentualExecutado: number;
  variacaoAditivos: number;
  valorConcluidoNoAno: number;
  avancoFisicoPonderado: number;
}

export function resumirCarteira(obras: Obra[], hoje = new Date()): ResumoCarteira {
  const indicadores = obras.map((o) => calcularIndicadorObra(o, hoje));
  const anoAtual = hoje.getFullYear();

  const valorInicial = indicadores.reduce((s, i) => s + i.valorContratado, 0);
  const acrescimos = indicadores.reduce((s, i) => s + Math.max(0, i.valorAditivado), 0);
  const supressoes = indicadores.reduce((s, i) => s + Math.min(0, i.valorAditivado), 0);
  const valorAtualizado = valorInicial + acrescimos + supressoes;
  const valorExecutado = indicadores.reduce((s, i) => s + i.valorExecutado, 0);

  const concluidas = indicadores.filter((i) => i.obra.status === 'concluida');
  const concluidasNoAno = concluidas.filter((i) => {
    const d = parseDateBR(i.obra.data_termino_real || i.obra.previsaoTermino);
    return d?.getFullYear() === anoAtual;
  });

  const avancoFisicoPonderado =
    valorAtualizado > 0
      ? indicadores.reduce(
          (s, i) => s + i.execucaoFisica * (i.valorContratado + i.valorAditivado),
          0
        ) / valorAtualizado
      : 0;

  return {
    indicadores,
    totalObras: obras.length,
    ativas: indicadores.filter((i) => i.obra.status === 'em_andamento').length,
    aguardandoInicio: indicadores.filter((i) => i.obra.status === 'planejada').length,
    paralisadas: indicadores.filter((i) => i.obra.status === 'paralisada').length,
    concluidasNoAno: concluidasNoAno.length,
    emAtencao: indicadores.filter((i) => i.risco === 'atencao').length,
    criticas: indicadores.filter((i) => i.risco === 'critico').length,
    valorInicial,
    acrescimos,
    supressoes: Math.abs(supressoes),
    valorAtualizado,
    valorExecutado,
    saldo: valorAtualizado - valorExecutado,
    percentualExecutado: valorAtualizado > 0 ? (valorExecutado / valorAtualizado) * 100 : 0,
    variacaoAditivos:
      valorInicial > 0 ? ((acrescimos + supressoes) / valorInicial) * 100 : 0,
    valorConcluidoNoAno: concluidasNoAno.reduce(
      (s, i) => s + i.valorContratado + i.valorAditivado,
      0
    ),
    avancoFisicoPonderado,
  };
}

export interface MunicipioResumo {
  municipio: string;
  obras: number;
  contratado: number;
  executado: number;
}

export function resumirPorMunicipio(indicadores: ObraIndicador[]): MunicipioResumo[] {
  const mapa = new Map<string, MunicipioResumo>();
  indicadores.forEach((i) => {
    const key = i.obra.municipio || 'Não informado';
    const atual = mapa.get(key) || { municipio: key, obras: 0, contratado: 0, executado: 0 };
    atual.obras += 1;
    atual.contratado += i.valorContratado + i.valorAditivado;
    atual.executado += i.valorExecutado;
    mapa.set(key, atual);
  });
  return [...mapa.values()].sort((a, b) => b.contratado - a.contratado);
}

export interface Marco {
  data: Date;
  titulo: string;
  tipo: 'inicio' | 'prazo' | 'previsao';
  obraId: string;
}

export function proximosMarcos(obras: Obra[], hoje = new Date(), limite = 6): Marco[] {
  const marcos: Marco[] = [];
  obras.forEach((o) => {
    const inicio = parseDateBR(o.dataInicio);
    const fim = parseDateBR(o.previsaoTermino);
    if (inicio && inicio > hoje) {
      marcos.push({ data: inicio, titulo: `Início — ${o.nome}`, tipo: 'inicio', obraId: o.id });
    }
    if (fim && fim > hoje && o.status !== 'concluida') {
      marcos.push({
        data: fim,
        titulo: `Término contratual — ${o.nome}`,
        tipo: 'prazo',
        obraId: o.id,
      });
    }
  });
  return marcos.sort((a, b) => a.data.getTime() - b.data.getTime()).slice(0, limite);
}

export interface IndicadoresHistoricos {
  taxaConclusao: number;
  concluidasNoPrazo: number;
  concluidasNoValor: number;
  acrescimoMedio: number;
  prazoMedioDias: number;
  totalInvestido: number;
}

export function indicadoresHistoricos(obras: Obra[]): IndicadoresHistoricos {
  const concluidas = obras.filter((o) => o.status === 'concluida');
  const noPrazo = concluidas.filter((o) => {
    const real = parseDateBR(o.data_termino_real);
    const prev = parseDateBR(o.previsaoTermino);
    return real && prev ? real.getTime() <= prev.getTime() : false;
  });
  const noValor = concluidas.filter((o) => Number(o.valor_aditivado || 0) <= 0);
  const comAditivo = obras.filter((o) => Number(o.valor || 0) > 0);
  const acrescimoMedio =
    comAditivo.length > 0
      ? comAditivo.reduce(
          (s, o) => s + (Number(o.valor_aditivado || 0) / Number(o.valor || 1)) * 100,
          0
        ) / comAditivo.length
      : 0;

  const duracoes = concluidas
    .map((o) => {
      const ini = parseDateBR(o.dataInicio);
      const fim = parseDateBR(o.data_termino_real || o.previsaoTermino);
      return ini && fim ? Math.round((fim.getTime() - ini.getTime()) / MS_DIA) : null;
    })
    .filter((d): d is number => d !== null && d > 0);

  return {
    taxaConclusao: obras.length > 0 ? (concluidas.length / obras.length) * 100 : 0,
    concluidasNoPrazo: concluidas.length > 0 ? (noPrazo.length / concluidas.length) * 100 : 0,
    concluidasNoValor: concluidas.length > 0 ? (noValor.length / concluidas.length) * 100 : 0,
    acrescimoMedio,
    prazoMedioDias:
      duracoes.length > 0 ? Math.round(duracoes.reduce((a, b) => a + b, 0) / duracoes.length) : 0,
    totalInvestido: obras.reduce((s, o) => s + Number(o.valorExecutado || 0), 0),
  };
}

/** Abreviação monetária usada nos cards executivos (R$ 8,74 mi) */
export function formatCompactBRL(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `R$ ${(value / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mi`;
  if (abs >= 1_000) return `R$ ${(value / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
  return `R$ ${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}
