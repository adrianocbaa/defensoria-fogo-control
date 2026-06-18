/**
 * Cálculo hidráulico de calhas — NBR 10844:1989
 *
 * - Vazão de projeto: Q = (I × A) / 60   [Q em L/min; I em mm/h; A em m²]
 * - Capacidade da calha (Manning, conduto livre, seção plena):
 *     Q = (1/n) · A_m · R_h^(2/3) · i^(1/2)   [m³/s]
 *   onde A_m é a área molhada e R_h = A_m / P_m (raio hidráulico).
 */

import type { Calha } from '@/components/dimensionamento/calhas/calhaSchema';
import type { Pano } from '@/components/dimensionamento/calhas/panoSchema';
import { calcularAreaContribuicao } from '@/components/dimensionamento/calhas/panoSchema';

export const M3S_PARA_LMIN = 60_000;

/** Q de projeto em L/min a partir de I (mm/h) e A (m²) */
export function vazaoProjetoLmin(intensidade_mm_h: number, area_m2: number) {
  return (intensidade_mm_h * area_m2) / 60;
}

/** Geometria a seção plena (área molhada e perímetro molhado) */
export function geometriaSecaoPlena(c: Calha): { A: number; P: number } | null {
  switch (c.tipo) {
    case 'semicircular': {
      if (!c.diametro_m) return null;
      const r = c.diametro_m / 2;
      // seção plena = meio círculo
      const A = (Math.PI * r * r) / 2;
      const P = Math.PI * r; // perímetro molhado do semicírculo (sem a corda superior)
      return { A, P };
    }
    case 'retangular': {
      if (!c.largura_m || !c.altura_m) return null;
      const A = c.largura_m * c.altura_m;
      const P = c.largura_m + 2 * c.altura_m; // duas paredes + fundo
      return { A, P };
    }
    case 'trapezoidal': {
      if (!c.base_menor_m || !c.base_maior_m || !c.altura_m) return null;
      const b = c.base_menor_m; // fundo
      const B = c.base_maior_m; // topo
      const h = c.altura_m;
      const A = ((b + B) / 2) * h;
      const talude = Math.sqrt(h * h + ((B - b) / 2) ** 2);
      const P = b + 2 * talude;
      return { A, P };
    }
    default:
      return null;
  }
}

/** Vazão a seção plena pela equação de Manning, em m³/s */
export function vazaoManningM3s(c: Calha): number | null {
  const geo = geometriaSecaoPlena(c);
  if (!geo) return null;
  const i = c.declividade_pct / 100; // m/m
  if (i <= 0 || c.manning_n <= 0) return null;
  const Rh = geo.A / geo.P;
  return (1 / c.manning_n) * geo.A * Math.pow(Rh, 2 / 3) * Math.sqrt(i);
}

export interface ResultadoCalha {
  calha: Calha;
  panosAssociados: Pano[];
  areaContribuicao_m2: number;
  vazaoProjeto_Lmin: number;
  vazaoProjeto_m3s: number;
  capacidade_m3s: number | null;
  capacidade_Lmin: number | null;
  areaMolhada_m2: number | null;
  perimetroMolhado_m: number | null;
  raioHidraulico_m: number | null;
  declividade_mm: number;
  fatorSeguranca: number | null;
  atende: boolean | null;
  mensagem: string;
}

export function calcularCalhas(
  calhas: Calha[],
  panos: Pano[],
  intensidade_mm_h: number,
): ResultadoCalha[] {
  return calhas.map<ResultadoCalha>((calha) => {
    const associados = panos.filter((p) => (p.calha_associada || '') === calha.nome);
    const area = associados.reduce(
      (s, p) => s + calcularAreaContribuicao(p).areaContribuicao,
      0,
    );
    const Qproj_Lmin = vazaoProjetoLmin(intensidade_mm_h, area);
    const Qproj_m3s = Qproj_Lmin / M3S_PARA_LMIN;
    const geo = geometriaSecaoPlena(calha);
    const Qcap_m3s = vazaoManningM3s(calha);
    const Qcap_Lmin = Qcap_m3s != null ? Qcap_m3s * M3S_PARA_LMIN : null;
    const Rh = geo ? geo.A / geo.P : null;
    const fator = Qcap_Lmin && Qproj_Lmin > 0 ? Qcap_Lmin / Qproj_Lmin : null;
    let atende: boolean | null = null;
    let mensagem = '';
    if (Qcap_Lmin == null) {
      mensagem = 'Geometria insuficiente para calcular a capacidade.';
    } else if (Qproj_Lmin === 0) {
      mensagem = 'Nenhum pano associado — vazão de projeto nula.';
      atende = true;
    } else {
      atende = Qcap_Lmin >= Qproj_Lmin;
      mensagem = atende
        ? 'A calha ATENDE à vazão de projeto.'
        : 'A calha NÃO atende — redimensionar seção, declividade ou material.';
    }
    return {
      calha,
      panosAssociados: associados,
      areaContribuicao_m2: +area.toFixed(2),
      vazaoProjeto_Lmin: +Qproj_Lmin.toFixed(2),
      vazaoProjeto_m3s: +Qproj_m3s.toFixed(6),
      capacidade_m3s: Qcap_m3s != null ? +Qcap_m3s.toFixed(6) : null,
      capacidade_Lmin: Qcap_Lmin != null ? +Qcap_Lmin.toFixed(2) : null,
      areaMolhada_m2: geo ? +geo.A.toFixed(4) : null,
      perimetroMolhado_m: geo ? +geo.P.toFixed(4) : null,
      raioHidraulico_m: Rh != null ? +Rh.toFixed(4) : null,
      declividade_mm: calha.declividade_pct / 100,
      fatorSeguranca: fator != null ? +fator.toFixed(2) : null,
      atende,
      mensagem,
    };
  });
}
