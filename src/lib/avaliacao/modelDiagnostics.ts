// Diagnóstico amigável da modelagem: compatibilidade do conjunto congelado, motivo do erro de cálculo e ajuda das transformações.
// Módulo puro (sem React/Supabase) para ser testado diretamente.

export const DATASET_OUTDATED_MSG =
  'O conjunto vigente foi congelado antes das últimas alterações em variáveis/amostras. Congele uma nova versão do conjunto antes de gerar modelos.';

export interface CompatVar {
  id: string; codigo: string; nome: string; papel: string; fonte?: string | null;
  presentes: number; ausentes: number; divergentes: number;
  ausentes_amostras?: number[]; divergentes_amostras?: number[];
}
export interface ConjuntoCompat {
  conjunto_id: string; versao: number; amostras: number; compativel: boolean;
  motivo: 'VARIAVEL_AUSENTE' | 'VALOR_ALTERADO' | null; variaveis: CompatVar[];
}

const listaAmostras = (xs: number[] | undefined, total: number) => {
  const a = (xs ?? []).filter((x) => x != null);
  if (a.length === 0) return '';
  if (total > 0 && a.length === total) return 'em todas as amostras';
  const mostra = a.slice(0, 8).join(', ');
  return `${a.length === 1 ? 'na amostra' : 'nas amostras'} ${mostra}${a.length > 8 ? ` e mais ${a.length - 8}` : ''}`;
};

/** Resumo legível da compatibilidade (o servidor decide; aqui só explicamos). */
export function compatSummary(c: ConjuntoCompat | null | undefined): { compativel: boolean; mensagem: string | null; detalhes: string[] } {
  if (!c) return { compativel: true, mensagem: null, detalhes: [] };
  if (c.compativel) return { compativel: true, mensagem: null, detalhes: [] };
  const detalhes: string[] = [];
  for (const v of c.variaveis ?? []) {
    const total = (v.presentes ?? 0) + (v.ausentes ?? 0);
    if (v.ausentes > 0) {
      detalhes.push(v.presentes === 0
        ? `${v.nome}: não existe no conjunto versão ${c.versao} (ausente ${listaAmostras(v.ausentes_amostras, total)}).`
        : `${v.nome}: sem valor congelado ${listaAmostras(v.ausentes_amostras, total)}.`);
    }
    if (v.divergentes > 0) detalhes.push(`${v.nome}: valor do cadastro alterado depois do congelamento ${listaAmostras(v.divergentes_amostras, total)}.`);
  }
  return { compativel: false, mensagem: DATASET_OUTDATED_MSG, detalhes };
}

/** Completude congelada por variável (para não confundir com a completude viva da pesquisa). */
export function frozenCompleteness(c: ConjuntoCompat | null | undefined, variavelId: string): { presentes: number; total: number } | null {
  const v = c?.variaveis?.find((x) => x.id === variavelId);
  if (!v) return null;
  return { presentes: v.presentes, total: v.presentes + v.ausentes };
}

export type ErrorAction = 'MERCADO' | 'VARIAVEIS' | 'IMOVEL' | 'TRANSFORMACOES' | 'MODELO' | null;
export interface ModelErrorExplanation {
  titulo: string; mensagem: string; contexto: string | null; acao: ErrorAction; acaoTexto: string | null; codigo: string;
}

const T_NOME: Record<string, string> = {
  DIRECT: 'sem transformação', INVERSE: '1/x', LN: 'ln(x)', SQUARE: 'x²', SQRT: '√x', INV_SQUARE: '1/x²', INV_SQRT: '1/√x',
};

export interface ExplainCtx {
  variaveis?: { codigo: string; nome: string }[];
  amostraIndice?: (amostraId: string) => number | null;
  compat?: ConjuntoCompat | null;
}

/** Converte o código técnico do motor (allowlist) em explicação e ação sugerida. Nunca repassa texto bruto do servidor. */
export function explainModelError(codigo: string | null | undefined, detalhe: Record<string, unknown> | null | undefined, ctx: ExplainCtx = {}): ModelErrorExplanation {
  const code = String(codigo ?? 'UNKNOWN').toUpperCase();
  const d = (detalhe ?? {}) as Record<string, unknown>;
  const nomeVar = (c: unknown) => {
    if (typeof c !== 'string' || !c) return null;
    return ctx.variaveis?.find((v) => v.codigo === c)?.nome ?? c;
  };
  const amostra = typeof d.sample === 'string' ? ctx.amostraIndice?.(d.sample) ?? null : null;
  const partes: string[] = [];
  const vn = nomeVar(d.variable);
  if (vn) partes.push(`Variável: ${vn}`);
  if (d.scope === 'AVALIANDO') partes.push('No imóvel avaliando');
  else if (amostra != null) partes.push(`Amostra ${amostra}`);
  if (typeof d.transform === 'string') partes.push(`Transformação: ${T_NOME[d.transform] ?? d.transform}`);
  if (typeof d.value === 'number') partes.push(`Valor: ${d.value}`);
  const contexto = partes.length ? partes.join(' · ') : null;
  const titulo = 'Por que este modelo não foi calculado?';
  const compat = ctx.compat ? compatSummary(ctx.compat) : null;
  const base = (mensagem: string, acao: ErrorAction, acaoTexto: string | null): ModelErrorExplanation =>
    ({ titulo, mensagem, contexto, acao, acaoTexto, codigo: code });

  if (code === 'DATASET_OUTDATED' || ((code === 'MISSING_VALUES' || code === 'NON_FINITE') && d.scope !== 'AVALIANDO' && compat && !compat.compativel)) {
    return base(DATASET_OUTDATED_MSG, 'MERCADO', 'Ir para Mercado / Congelar nova versão');
  }
  switch (code) {
    case 'INVALID_DOMAIN':
      return base('Há valor incompatível com a transformação escolhida (ex.: ln(x) exige valor > 0; 1/x exige valor diferente de zero).',
        d.scope === 'AVALIANDO' ? 'IMOVEL' : 'TRANSFORMACOES',
        d.scope === 'AVALIANDO' ? 'Corrigir o imóvel avaliando' : 'Remova essa transformação do modelo ou corrija o valor da amostra');
    case 'MISSING_VALUES':
    case 'NON_FINITE':
      if (d.scope === 'AVALIANDO') return base('O imóvel avaliando não tem valor válido para uma das variáveis do modelo.', 'IMOVEL', 'Corrigir o imóvel avaliando');
      return base('Há amostra sem valor válido para uma das variáveis do modelo.', 'MERCADO', 'Corrigir a amostra e congelar nova versão do conjunto');
    case 'N_LE_P':
      return base(`Há poucos dados para a quantidade de parâmetros do modelo${typeof d.n === 'number' && typeof d.p === 'number' ? ` (${d.n} amostras para ${d.p} parâmetros)` : ''}.`,
        'MODELO', 'Retire variáveis do modelo ou inclua mais amostras');
    case 'RANK_DEFICIENT':
      return base('As variáveis escolhidas não permitem estimar coeficientes independentes (colinearidade/perda de posto).', 'MODELO', 'Retire uma das variáveis redundantes');
    case 'ZERO_VARIANCE':
      return base('Uma variável não varia entre as amostras.', 'MODELO', 'Retire essa variável do modelo');
    case 'ZERO_RESIDUAL_VARIANCE':
      return base('O modelo ajusta perfeitamente os dados (sem variância residual); não é possível estimar a precisão.', 'MODELO', 'Revise as variáveis escolhidas');
    case 'INVALID_INPUT':
      return base('Os dados de entrada do modelo estão incompletos.', 'VARIAVEIS', 'Revise as variáveis da pesquisa');
    default:
      return base('O cálculo não pôde ser concluído.', null, null);
  }
}

/** Ajuda de cada transformação, com y para a dependente e x para as independentes. */
const HELP: Record<string, (s: string) => string> = {
  DIRECT: (s) => `${s} — valor sem transformação`,
  INVERSE: (s) => `1/${s} — inverso do valor; não admite zero`,
  LN: (s) => `ln(${s}) — logaritmo natural; exige valor maior que zero`,
  SQUARE: (s) => `${s}² — valor ao quadrado`,
  SQRT: (s) => `√${s} — raiz quadrada; não admite valor negativo`,
  INV_SQUARE: (s) => `1/${s}² — inverso do quadrado; não admite zero`,
  INV_SQRT: (s) => `1/√${s} — inverso da raiz; exige valor maior que zero`,
};
export const transformHelp = (t: string, dependente = false) => (HELP[t] ? HELP[t](dependente ? 'y' : 'x') : t);

export const TRANSFORM_MODAL_INTRO =
  'Marque uma ou mais formas matemáticas que o SiDIF poderá testar. Cada modelo usa apenas uma transformação desta variável por vez; marcar várias opções apenas autoriza alternativas.';
export const transformRoleNote = (dependente: boolean) => dependente
  ? 'Aqui y representa a variável que queremos estimar.'
  : 'Aqui x representa a característica usada para explicar o valor.';

export const MODE_HELP = {
  MANUAL: 'Você escolhe uma transformação para cada variável e calcula um modelo específico.',
  ASSISTIDO: 'O SiDIF combina apenas as alternativas autorizadas; cada candidato usa uma transformação por variável.',
  AMPLA: 'Testa todas as combinações válidas dentro do espaço autorizado; não escolhe automaticamente o melhor modelo.',
} as const;
