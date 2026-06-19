/**
 * Motor de dimensionamento automático — NBR 10844:1989
 * Recebe vazão de projeto total + parâmetros do projeto e uma biblioteca
 * de calhas comerciais. Calcula capacidade de cada calha (Manning), classifica
 * e seleciona a menor seção que atende com margem de segurança.
 */

import type { CalhaBiblioteca } from '@/components/dimensionamento/calhas/bibliotecaCalhaSchema';
import type { Calha } from '@/components/dimensionamento/calhas/calhaSchema';
import { geometriaSecaoPlena, vazaoManningM3s, M3S_PARA_LMIN } from '@/lib/calhaCalculo';
import {
  FAIXAS_CONDUTOR_PADRAO,
  diametroMinimo,
  diametroComercial,
  capacidadePorDiametro,
} from '@/lib/condutorVertical';

export type Classificacao = 'nao_atende' | 'atende_limite' | 'atende' | 'atende_com_folga';

export const CLASSIFICACAO_LABEL: Record<Classificacao, string> = {
  nao_atende: 'Não atende',
  atende_limite: 'Atende no limite',
  atende: 'Atende',
  atende_com_folga: 'Atende com folga',
};

export function classificar(fs: number): Classificacao {
  if (fs < 1) return 'nao_atende';
  if (fs < 1.2) return 'atende_limite';
  if (fs < 1.5) return 'atende';
  return 'atende_com_folga';
}

export interface ParametrosAutomatico {
  declividade_pct: number;
  /** Filtro opcional por material — se vazio, considera todos. */
  material?: string;
  /** Filtro opcional por n (sobrepõe o n da biblioteca) — opcional. */
  manning_n_override?: number;
  /** Número de pontos de descida (>=1). */
  num_descidas: number;
  /** Margem de segurança mínima (default 1.2). */
  fs_alvo?: number;
}

export interface AlternativaCalha {
  item: CalhaBiblioteca;
  dimensaoLabel: string;
  capacidade_Lmin: number | null;
  fs: number | null;
  classificacao: Classificacao;
  area_m2: number | null;
}

export interface ResultadoAutomatico {
  /** Vazão de projeto total (L/min). */
  Qtotal_Lmin: number;
  /** Vazão por descida (L/min) = Qtotal / num_descidas. */
  Qpd_Lmin: number;
  /** Dimensão mínima absoluta — menor seção que atinge FS ≥ 1. */
  dimensaoMinima: AlternativaCalha | null;
  /** Solução recomendada — menor seção com FS ≥ fs_alvo. */
  recomendada: AlternativaCalha | null;
  /** Lista completa ordenada por área crescente. */
  alternativas: AlternativaCalha[];
  /** Condutor vertical (diâmetro mínimo / adotado). */
  condutor: {
    Q_Lmin: number;
    diametro_min_mm: number | null;
    diametro_adotado_mm: number | null;
    capacidade_Lmin: number | null;
    fs: number | null;
  };
  /** Sugestão alternativa: aumentar descidas (n+1). */
  sugestaoAumentarDescidas: {
    num_descidas: number;
    Qpd_Lmin: number;
    recomendada: AlternativaCalha | null;
  };
}

function dimensaoLabel(c: CalhaBiblioteca): string {
  if (c.tipo === 'semicircular' && c.diametro_m) return `Ø ${(c.diametro_m * 1000).toFixed(0)} mm`;
  if (c.tipo === 'retangular' && c.largura_m && c.altura_m)
    return `${(c.largura_m * 1000).toFixed(0)} × ${(c.altura_m * 1000).toFixed(0)} mm`;
  if (c.tipo === 'trapezoidal' && c.base_menor_m && c.base_maior_m && c.altura_m)
    return `${(c.base_menor_m * 1000).toFixed(0)}/${(c.base_maior_m * 1000).toFixed(0)} × ${(c.altura_m * 1000).toFixed(0)} mm`;
  return '—';
}

/** Converte item da biblioteca em Calha "virtual" para reutilizar geometria. */
function comoCalha(item: CalhaBiblioteca, declividade_pct: number, n_override?: number): Calha {
  return {
    id: item.id,
    nome: item.nome,
    comprimento_m: 1,
    tipo: item.tipo,
    declividade_pct,
    material: item.material,
    manning_n: n_override ?? item.manning_n,
    largura_m: item.largura_m,
    altura_m: item.altura_m,
    diametro_m: item.diametro_m,
    base_menor_m: item.base_menor_m,
    base_maior_m: item.base_maior_m,
    geometria_personalizada: '',
    pontos_descida: [{ id: 'x', rotulo: 'PD', posicao_m: 0 }],
  } as Calha;
}

function calcularAlternativa(
  item: CalhaBiblioteca,
  params: ParametrosAutomatico,
  Qpd_Lmin: number,
): AlternativaCalha {
  const fake = comoCalha(item, params.declividade_pct, params.manning_n_override);
  const geo = geometriaSecaoPlena(fake);
  const Q_m3s = vazaoManningM3s(fake);
  const cap_Lmin = Q_m3s != null ? Q_m3s * M3S_PARA_LMIN : null;
  const fs = cap_Lmin != null && Qpd_Lmin > 0 ? cap_Lmin / Qpd_Lmin : null;
  return {
    item,
    dimensaoLabel: dimensaoLabel(item),
    capacidade_Lmin: cap_Lmin != null ? +cap_Lmin.toFixed(1) : null,
    fs: fs != null ? +fs.toFixed(2) : null,
    classificacao: fs != null ? classificar(fs) : 'nao_atende',
    area_m2: geo ? +geo.A.toFixed(4) : null,
  };
}

export function dimensionarAutomatico(
  biblioteca: CalhaBiblioteca[],
  Qtotal_Lmin: number,
  params: ParametrosAutomatico,
): ResultadoAutomatico {
  const fsAlvo = params.fs_alvo ?? 1.2;
  const n = Math.max(1, params.num_descidas);
  const Qpd = Qtotal_Lmin / n;

  const filtrada = params.material
    ? biblioteca.filter((b) => b.material === params.material)
    : biblioteca;

  const alternativas = filtrada
    .map((it) => calcularAlternativa(it, params, Qpd))
    .sort((a, b) => (a.area_m2 ?? Infinity) - (b.area_m2 ?? Infinity));

  const atendem = alternativas.filter((a) => a.fs != null && a.fs >= 1);
  const dimensaoMinima = atendem[0] ?? null;
  const recomendada = atendem.find((a) => (a.fs ?? 0) >= fsAlvo) ?? null;

  // Condutor vertical pela vazão por descida
  const dMin = diametroMinimo(FAIXAS_CONDUTOR_PADRAO, Qpd);
  const dCom = dMin != null ? diametroComercial(FAIXAS_CONDUTOR_PADRAO, dMin) : null;
  const capCond = dCom ? capacidadePorDiametro(FAIXAS_CONDUTOR_PADRAO, dCom.diametro_mm) : null;

  // Sugestão: aumentar descidas
  const n2 = n + 1;
  const Qpd2 = Qtotal_Lmin / n2;
  const altsN2 = filtrada
    .map((it) => calcularAlternativa(it, params, Qpd2))
    .sort((a, b) => (a.area_m2 ?? Infinity) - (b.area_m2 ?? Infinity));
  const recomendadaN2 =
    altsN2.filter((a) => a.fs != null && a.fs >= fsAlvo)[0] ?? null;

  return {
    Qtotal_Lmin: +Qtotal_Lmin.toFixed(1),
    Qpd_Lmin: +Qpd.toFixed(1),
    dimensaoMinima,
    recomendada,
    alternativas,
    condutor: {
      Q_Lmin: +Qpd.toFixed(1),
      diametro_min_mm: dMin != null ? +dMin.toFixed(1) : null,
      diametro_adotado_mm: dCom?.diametro_mm ?? null,
      capacidade_Lmin: capCond != null ? +capCond.toFixed(1) : null,
      fs: capCond != null && Qpd > 0 ? +(capCond / Qpd).toFixed(2) : null,
    },
    sugestaoAumentarDescidas: {
      num_descidas: n2,
      Qpd_Lmin: +Qpd2.toFixed(1),
      recomendada: recomendadaN2,
    },
  };
}
