// Triagem prévia explicável dos modelos calculados — NÃO substitui a Validação Técnica e não escolhe modelo.
// Usa apenas resultados já gravados pelo motor (modelo_resultado_resumo + coeficientes) e os limites da política vigente.
// Não há pontuação única: os critérios são aplicados em ordem fixa e cada sugestão mostra os motivos.

export type Grau = 'III' | 'II' | 'I';
export type Faixa = { grau: Grau; max: number };
export type Rotulo = 'Forte candidato' | 'Candidato' | 'Requer atenção';

export interface TriagemPolitica { codigo?: string; versao?: number; sig_regressores: Faixa[] | null; sig_modelo: Faixa[] | null }
export interface TriagemVariavel {
  variavel_id: string; codigo: string; nome: string; transformacao: string; power?: number | null;
  relacao_esperada: 'POSITIVA' | 'NEGATIVA' | 'INDEFINIDA'; beta: number | null; sig: number | null;
}
export interface TriagemModelo {
  id: string; numero: number; nome: string; status?: string; stale?: boolean; arquivado?: boolean; dependente_variavel_id?: string;
  dependente_transformacao: string; dependente_power?: number | null;
  resumo: { n: number; k: number; r2: number | null; r2_ajustado: number | null; f: number | null; sig_f: number | null;
    pior_sig_regressor: number | null; amplitude_pct: number | null; grau_precisao: string | null; extrapola: boolean | null } | null;
  variaveis: TriagemVariavel[];
}
export interface SinalItem { codigo: string; nome: string; esperado: string; efeito: 'POSITIVA' | 'NEGATIVA' | 'NULA'; ok: boolean | null }
export interface Analise {
  modelo: TriagemModelo;
  elegivel: boolean;
  exclusoes: string[];
  grauF: Grau | null; grauRegressores: Grau | null; enquadramento: Grau | null; grauPrecisao: Grau | null;
  extrapola: boolean | null; nVariaveis: number;
  sinais: SinalItem[];
  rotulo: Rotulo | null;
  motivos: string[];
  alertas: string[];
}

export const TRIAGEM_AVISO = 'Triagem prévia — não substitui a Validação Técnica';
export const TRIAGEM_TEXTO = 'O SiDIF faz uma triagem explicável; a escolha do modelo que seguirá para validação continua sendo do avaliador.';
export const CRITERIOS_ORDEM = [
  'Melhor enquadramento prévio de significância (Sig. F e pior regressor, pela política)',
  'Sem extrapolação',
  'Melhor grau de precisão',
  'Menor pior significância de regressor',
  'Menor Sig. F',
  'Maior R² ajustado (apenas como desempate posterior)',
  'Menos variáveis (parcimônia)',
] as const;

const RANK: Record<string, number> = { III: 3, II: 2, I: 1 };
const rank = (g: string | null | undefined) => (g ? RANK[g] ?? 0 : 0);

/** Mesma regra do validador: menor faixa cujo máximo comporta o valor. */
export function grauPorLimite(valor: number | null | undefined, faixas: Faixa[] | null | undefined): Grau | null {
  if (valor === null || valor === undefined || !Number.isFinite(valor) || !faixas?.length) return null;
  const ord = [...faixas].sort((a, b) => a.max - b.max);
  for (const f of ord) if (valor <= f.max) return f.grau;
  return null;
}

/** Sinal da derivada da transformação (idêntico ao transformMonotonicSign do motor). */
export function sinalTransformacao(code: string, power?: number | null): 1 | -1 {
  switch (code) {
    case 'INVERSE': case 'INV_SQUARE': case 'INV_SQRT': return -1;
    case 'POWER': return (power ?? 1) < 0 ? -1 : 1;
    default: return 1;
  }
}

export function sinais(m: TriagemModelo): SinalItem[] {
  const ySign = sinalTransformacao(m.dependente_transformacao, m.dependente_power);
  return m.variaveis.map((v) => {
    const efeito = Math.sign(v.beta ?? 0) * sinalTransformacao(v.transformacao, v.power) * ySign;
    const esperado = v.relacao_esperada === 'POSITIVA' ? 1 : v.relacao_esperada === 'NEGATIVA' ? -1 : 0;
    return { codigo: v.codigo, nome: v.nome, esperado: v.relacao_esperada, efeito: efeito > 0 ? 'POSITIVA' : efeito < 0 ? 'NEGATIVA' : 'NULA', ok: esperado === 0 ? null : efeito === esperado };
  });
}

const pct = (v: number | null | undefined, casas = 2) => (v === null || v === undefined ? '—' : `${(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`);
const num = (v: number | null | undefined, casas = 4) => (v === null || v === undefined ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }));

export function analisar(m: TriagemModelo, pol: TriagemPolitica): Analise {
  const r = m.resumo;
  const exclusoes: string[] = [];
  const alertas: string[] = [];
  if (m.status && m.status !== 'CALCULADO') exclusoes.push(m.status === 'EM_VALIDACAO' ? 'Já enviado à validação' : 'Não calculado');
  if (m.stale) exclusoes.push('Desatualizado');
  if (m.arquivado) exclusoes.push('Arquivado');
  if (!r) exclusoes.push('Sem resultado de cálculo');
  const grauF = grauPorLimite(r?.sig_f, pol.sig_modelo);
  const grauReg = grauPorLimite(r?.pior_sig_regressor, pol.sig_regressores);
  const grauPrecisao = (['III', 'II', 'I'].includes(r?.grau_precisao ?? '') ? r!.grau_precisao : null) as Grau | null;
  const ss = sinais(m);
  if (r && !grauF) exclusoes.push(`Sig. F ${pct(r.sig_f)} acima do limite da política`);
  if (r && !grauReg) exclusoes.push(`Regressor com significância ${pct(r.pior_sig_regressor)} acima do limite da política`);
  const contrarios = ss.filter((s) => s.ok === false);
  if (contrarios.length) exclusoes.push(`Sinal contrário ao esperado: ${contrarios.map((s) => s.nome).join(', ')}`);
  if (r && !grauPrecisao) exclusoes.push(`Precisão estimada fora dos graus da política (amplitude ${r.amplitude_pct != null ? num(r.amplitude_pct, 2) + '%' : '—'})`);
  const enquadramento = grauF && grauReg ? (rank(grauF) <= rank(grauReg) ? grauF : grauReg) : null;
  const extrapola = r?.extrapola ?? null;
  const indefinidas = ss.filter((s) => s.ok === null);
  if (extrapola === true) alertas.push('Com extrapolação — exige análise na validação');
  if (extrapola === null && r) alertas.push('Extrapolação não informada');
  if (indefinidas.length) alertas.push(`Relação esperada não definida: ${indefinidas.map((s) => s.nome).join(', ')}`);
  const elegivel = exclusoes.length === 0;
  const motivos: string[] = [];
  if (r) {
    motivos.push(extrapola === false ? 'Sem extrapolação' : extrapola ? 'Com extrapolação' : 'Extrapolação não informada');
    motivos.push(`Sig. F: ${pct(r.sig_f)}${grauF ? ` — Grau ${grauF}` : ' — fora do limite'}`);
    motivos.push(`Pior regressor: ${pct(r.pior_sig_regressor)}${grauReg ? ` — Grau ${grauReg}` : ' — fora do limite'}`);
    motivos.push(`Precisão estimada: ${grauPrecisao ? `Grau ${grauPrecisao}` : 'não enquadrada'}`);
    motivos.push(`R² ajustado: ${num(r.r2_ajustado)}`);
    motivos.push(`${m.variaveis.length} variáve${m.variaveis.length === 1 ? 'l independente' : 'is independentes'}`);
    if (ss.length && !contrarios.length && !indefinidas.length) motivos.push('Sinais coerentes com a relação esperada');
  }
  let rotulo: Rotulo | null = null;
  if (elegivel) {
    if (alertas.length) rotulo = 'Requer atenção';
    else if (enquadramento === 'III' && rank(grauPrecisao) >= 2) rotulo = 'Forte candidato';
    else rotulo = 'Candidato';
  }
  return { modelo: m, elegivel, exclusoes, grauF, grauRegressores: grauReg, enquadramento, grauPrecisao, extrapola, nVariaveis: m.variaveis.length, sinais: ss, rotulo, motivos, alertas };
}

const cmpNum = (a: number | null | undefined, b: number | null | undefined, menorMelhor: boolean) => {
  const na = a === null || a === undefined || !Number.isFinite(a); const nb = b === null || b === undefined || !Number.isFinite(b);
  if (na && nb) return 0; if (na) return 1; if (nb) return -1;
  return menorMelhor ? (a as number) - (b as number) : (b as number) - (a as number);
};
/** Ordem transparente (sem score): cada critério só desempata o anterior. */
export function compararAnalises(a: Analise, b: Analise): number {
  const ra = a.modelo.resumo, rb = b.modelo.resumo;
  return (rank(b.enquadramento) - rank(a.enquadramento))
    || ((a.extrapola === false ? 0 : 1) - (b.extrapola === false ? 0 : 1))
    || (rank(b.grauPrecisao) - rank(a.grauPrecisao))
    || cmpNum(ra?.pior_sig_regressor, rb?.pior_sig_regressor, true)
    || cmpNum(ra?.sig_f, rb?.sig_f, true)
    || cmpNum(ra?.r2_ajustado, rb?.r2_ajustado, false)
    || (a.nVariaveis - b.nVariaveis)
    || (a.modelo.numero - b.modelo.numero);
}

export interface ResultadoTriagem { sugestoes: Analise[]; elegiveis: number; analisados: number; exclusoes: { motivo: string; quantidade: number }[] }

export function triar(modelos: TriagemModelo[], pol: TriagemPolitica, limite = 5): ResultadoTriagem {
  const an = modelos.map((m) => analisar(m, pol));
  const eleg = an.filter((x) => x.elegivel).sort(compararAnalises);
  const cont = new Map<string, number>();
  for (const x of an) if (!x.elegivel) for (const e of x.exclusoes) {
    const chave = e.replace(/\s[\d.,]+%.*$/, '').replace(/:.*$/, '');
    cont.set(chave, (cont.get(chave) ?? 0) + 1);
  }
  return { sugestoes: eleg.slice(0, limite), elegiveis: eleg.length, analisados: an.length,
    exclusoes: [...cont.entries()].map(([motivo, quantidade]) => ({ motivo, quantidade })).sort((a, b) => b.quantidade - a.quantidade) };
}

/** Linhas do comparador lado a lado: valores formatados e marca de diferença (sem indicar vencedor). */
export function linhasComparacao(an: Analise[]): { rotulo: string; valores: string[]; difere: boolean }[] {
  const L = (rotulo: string, f: (a: Analise) => string) => { const valores = an.map(f); return { rotulo, valores, difere: new Set(valores).size > 1 }; };
  return [
    L('n', (a) => String(a.modelo.resumo?.n ?? '—')),
    L('Variáveis independentes', (a) => String(a.nVariaveis)),
    L('R²', (a) => num(a.modelo.resumo?.r2)),
    L('R² ajustado', (a) => num(a.modelo.resumo?.r2_ajustado)),
    L('F', (a) => num(a.modelo.resumo?.f, 2)),
    L('Sig. F', (a) => `${pct(a.modelo.resumo?.sig_f)}${a.grauF ? ` (Grau ${a.grauF})` : ''}`),
    L('Pior significância de regressor', (a) => `${pct(a.modelo.resumo?.pior_sig_regressor)}${a.grauRegressores ? ` (Grau ${a.grauRegressores})` : ''}`),
    L('Amplitude IC', (a) => (a.modelo.resumo?.amplitude_pct != null ? `${num(a.modelo.resumo.amplitude_pct, 2)}%` : '—')),
    L('Precisão estimada', (a) => (a.grauPrecisao ? `Grau ${a.grauPrecisao}` : 'Não enquadrada')),
    L('Extrapolação', (a) => (a.extrapola === false ? 'Não' : a.extrapola ? 'Sim' : '—')),
    L('Relação esperada', (a) => { const c = a.sinais.filter((s) => s.ok === false); const i = a.sinais.filter((s) => s.ok === null);
      return c.length ? `Contrária: ${c.map((s) => s.nome).join(', ')}` : i.length ? `Não definida: ${i.map((s) => s.nome).join(', ')}` : 'Coerente'; }),
  ];
}
