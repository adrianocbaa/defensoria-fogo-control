// Regras puras do texto proposto pela IA no laudo: a IA redige, nunca decide nem calcula.
export const AI_PROMPT_VERSION = 'aval-laudo-2026.11-v1';
export const AI_CONTEXTS = ['PROPERTY_DESCRIPTION', 'MARKET_DIAGNOSIS', 'VALIDATION_EXPLANATION', 'COMPATIBILITY', 'CONCLUSION', 'REPORT_SECTION'] as const;
export type AiContext = typeof AI_CONTEXTS[number];

export const AI_PURPOSE: Record<AiContext, string> = {
  PROPERTY_DESCRIPTION: 'Descrever o imóvel avaliando a partir dos dados cadastrados e da vistoria.',
  MARKET_DIAGNOSIS: 'Redigir o diagnóstico de mercado a partir da pesquisa registrada.',
  VALIDATION_EXPLANATION: 'Explicar, em linguagem técnica clara, o resultado dos critérios de validação já calculados.',
  COMPATIBILITY: 'Descrever a comparação entre o valor de mercado e os valores administrativos já calculada pelo sistema.',
  CONCLUSION: 'Redigir a conclusão usando apenas a conclusão estruturada confirmada pelo profissional.',
  REPORT_SECTION: 'Redigir o texto da seção do laudo usando apenas os fatos fornecidos.',
};

export function systemPrompt(modo: 'GERAR' | 'MELHORAR'): string {
  return [
    'Você é um redator técnico de laudos de avaliação imobiliária no Brasil (português formal).',
    'Use somente os fatos do CONTEXTO. Nunca invente fatos, fontes, datas, nomes ou características.',
    'Não faça cálculos e não escreva números que não estejam no CONTEXTO. Para valores, graus, áreas e resultados use exatamente os marcadores {{CODIGO}} listados em "marcadores".',
    'Nunca escreva graus de fundamentação ou de precisão por extenso: use {{GRAU_FUNDAMENTACAO}} e {{GRAU_PRECISAO}}.',
    'Não decida nem recomende amostras, variáveis, modelos, aceite, arbitramento, valor final ou conclusão: apenas descreva o que já foi decidido.',
    'Se faltar informação, escreva [INFORMAÇÃO A COMPLEMENTAR] em vez de supor.',
    modo === 'MELHORAR'
      ? 'Tarefa: melhore a clareza e a correção do TEXTO_BASE sem mudar o sentido técnico, mantendo todos os marcadores {{...}} exatamente como estão.'
      : 'Tarefa: redija o texto da seção indicada.',
    'Responda apenas com o texto final, sem título, sem comentários e sem markdown.',
  ].join('\n');
}

const TOKEN_RE = /\{\{([A-Z0-9_]+)\}\}/g;
export const tokensIn = (t: string) => new Set([...t.matchAll(TOKEN_RE)].map((m) => m[1]));

/** Números presentes no texto (ignora os marcadores). */
function numbersIn(t: string): string[] {
  return [...t.replace(TOKEN_RE, ' ').matchAll(/\d+(?:[.,]\d+)*/g)].map((m) => m[0].replace(/[.,]/g, ''));
}

export interface AiCheck { ok: boolean; erro?: 'TOKEN_REMOVIDO' | 'TOKEN_DESCONHECIDO' | 'VAZIO'; tokens?: string[]; alertas: string[] }

/**
 * Bloqueia remoção ou invenção de marcadores protegidos; sinaliza (sem bloquear) números que não estão
 * no contexto e graus digitados, para revisão do profissional antes da aprovação.
 */
export function checkAiText(generated: string, baseText: string, allowedTokens: string[], contextText: string): AiCheck {
  const out = generated.trim();
  if (!out) return { ok: false, erro: 'VAZIO', alertas: [] };
  const got = tokensIn(out);
  const missing = [...tokensIn(baseText)].filter((t) => !got.has(t));
  if (missing.length) return { ok: false, erro: 'TOKEN_REMOVIDO', tokens: missing, alertas: [] };
  const allowed = new Set(allowedTokens);
  const unknown = [...got].filter((t) => !allowed.has(t));
  if (unknown.length) return { ok: false, erro: 'TOKEN_DESCONHECIDO', tokens: unknown, alertas: [] };
  const known = new Set([...numbersIn(contextText), ...numbersIn(baseText)]);
  const novos = [...new Set(numbersIn(out).filter((n) => !known.has(n)))];
  const alertas: string[] = [];
  if (novos.length) alertas.push(`Números que não constam do contexto: ${novos.slice(0, 10).join(', ')}. Confira antes de aprovar.`);
  if (/\bgraus?\s+(de\s+\S+\s+)?(iii|ii|i)\b/i.test(out.replace(TOKEN_RE, ''))) alertas.push('Há grau escrito por extenso; use os marcadores de grau.');
  if (out.includes('[INFORMAÇÃO A COMPLEMENTAR]')) alertas.push('A IA indicou informações a complementar.');
  return { ok: true, alertas };
}
