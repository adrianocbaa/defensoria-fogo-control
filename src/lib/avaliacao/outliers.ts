// Critério 12 (Outliers): textos e resumos da tela, a partir do resultado gravado pela validação (puro, sem acesso a dados).
// A classificação em si é feita no servidor (validator.ts) com os limites da política versionada.

export type NivelOutlier = 'SEM_INDICIO' | 'MODERADO' | 'FORTE';
export type DecisaoOutlier = 'MANTER' | 'EXCLUIR';

export interface AmostraOutlier {
  amostra_id: string; ordem: number; residuo_dp: number; studentizado_externo: number | null; p_valor: number | null;
  cook: number; leverage: number; nivel: NivelOutlier; motivos: string[];
}
export interface DadosOutliers {
  nivel: NivelOutlier; metrica: 'STUDENTIZADO_EXTERNO' | 'RESIDUO_DP'; metrica_politica?: string; aviso_metrica?: string | null;
  n: number; maior: { valor: number; ordem: number; amostra_id: string }; acima_limite: number; bonferroni_limite: number | null;
  amostras: AmostraOutlier[]; suspeitas: AmostraOutlier[];
  politica: { limite_moderado: number; limite_forte: number; alpha: number; bonferroni: boolean; p_moderado: boolean; justificativa_manter: 'SEMPRE' | 'FORTE' | 'OPCIONAL'; origem?: string | null };
  decisoes?: { amostra_id: string; ordem: number; nivel: NivelOutlier; decisao: DecisaoOutlier | null }[];
}

export const NIVEL_OUTLIER_LABEL: Record<NivelOutlier, string> = { SEM_INDICIO: 'Atende', MODERADO: 'Requer análise', FORTE: 'Forte indício' };
export const NIVEL_OUTLIER_TEXTO: Record<NivelOutlier, string> = {
  SEM_INDICIO: 'Nenhum indício de outlier identificado.',
  MODERADO: 'Possível outlier identificado.',
  FORTE: 'Forte indício de outlier — análise obrigatória antes de concluir a validação.',
};
export const NIVEL_AMOSTRA_LABEL: Record<NivelOutlier, string> = { SEM_INDICIO: 'Sem indício', MODERADO: 'Indício moderado de dado atípico', FORTE: 'Forte indício de outlier' };
export const DECISAO_OUTLIER_LABEL: Record<DecisaoOutlier, string> = { MANTER: 'Amostra mantida', EXCLUIR: 'Excluir do modelo' };
export const METRICA_LABEL: Record<string, string> = { RESIDUO_DP: '|Resíduo/DP|', STUDENTIZADO_EXTERNO: '|resíduo studentizado externo|' };

const n2 = (v: number) => v.toFixed(2).replace('.', ',');
export const fmtIndicador = (v: number | null | undefined, casas = 2) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(casas).replace('.', ','));
export const fmtPValor = (v: number | null | undefined) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : v < 0.0001 ? '< 0,0001' : v.toFixed(4).replace('.', ','));
export const rotuloAmostra = (ordem: number) => `Amostra ${String(ordem).padStart(2, '0')}`;

/** Resultado no formato novo (política com limites). Validações antigas retornam null e seguem a análise manual genérica. */
export function dadosOutliers(dados: unknown): DadosOutliers | null {
  const d = dados as DadosOutliers | null | undefined;
  return d && d.nivel && Array.isArray(d.amostras) && d.politica ? d : null;
}

export function resumoOutliers(d: DadosOutliers): string[] {
  const lim = n2(d.politica.limite_moderado);
  return [
    `${d.n} amostras analisadas`,
    `Maior ${METRICA_LABEL[d.metrica] ?? d.metrica}: ${n2(d.maior.valor)}`,
    `Limite indicativo: ${lim}`,
    `Amostras acima de ${lim}: ${d.acima_limite} de ${d.n}`,
  ];
}

/** Linha de indicadores de uma amostra sinalizada. */
export function indicadoresAmostra(a: AmostraOutlier): string {
  return [
    `Resíduo/DP: ${fmtIndicador(a.residuo_dp)}`,
    `Resíduo studentizado: ${fmtIndicador(a.studentizado_externo)}`,
    `p-valor: ${fmtPValor(a.p_valor)}`,
    `Cook: ${fmtIndicador(a.cook)}`,
    `Leverage: ${fmtIndicador(a.leverage, 3)}`,
  ].join(' · ');
}

/** Mesma regra do servidor: excluir sempre exige justificativa; manter conforme a política (padrão: só no forte indício). */
export function justificativaObrigatoria(decisao: DecisaoOutlier, nivel: NivelOutlier, regra: 'SEMPRE' | 'FORTE' | 'OPCIONAL' = 'FORTE'): boolean {
  if (decisao === 'EXCLUIR') return true;
  return regra === 'SEMPRE' || (regra === 'FORTE' && nivel === 'FORTE');
}

export interface EventoDecisao { id: string; event_type: string; details_json: any; created_at: string; actor_id: string | null }

/** Última decisão por amostra para a execução validada (as anteriores continuam no histórico). */
export function ultimasDecisoes(eventos: EventoDecisao[], execucaoId: string | null | undefined): Record<string, EventoDecisao> {
  const out: Record<string, EventoDecisao> = {};
  const ord = [...eventos].filter((e) => e.event_type === 'OUTLIER_DECISION' && (!execucaoId || e.details_json?.execucao === execucaoId))
    .sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
  for (const e of ord) if (e.details_json?.amostra_id) out[e.details_json.amostra_id] = e;
  return out;
}

/** Texto do histórico para uma decisão registrada. */
export function detalheDecisaoOutlier(d: any): string {
  const x = d ?? {};
  const partes = [`${rotuloAmostra(Number(x.ordem ?? 0))}: ${DECISAO_OUTLIER_LABEL[x.decisao as DecisaoOutlier] ?? x.decisao ?? '—'}`];
  if (x.nivel) partes.push(NIVEL_AMOSTRA_LABEL[x.nivel as NivelOutlier] ?? x.nivel);
  if (x.indicadores) partes.push(indicadoresAmostra({ ...x.indicadores, amostra_id: x.amostra_id }));
  const ref = [x.modelo_nome, x.validacao_numero ? `validação ${x.validacao_numero}` : null, x.engine_version ? `motor ${x.engine_version}` : null].filter(Boolean).join(' · ');
  if (ref) partes.push(ref);
  if (x.modelo_derivado_nome) partes.push(`novo modelo: ${x.modelo_derivado_nome}`);
  const base = partes.join(' · ');
  return x.justificativa ? `${base} — ${x.justificativa}` : base;
}
