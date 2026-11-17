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

// ---------------------------------------------------------------- assistente contextual por tópico (laudo DIF)
export const AI_PROMPT_VERSION_SECAO = 'aval-laudo-dif-2026.11-v1';

export function systemPromptSecao(modo: 'GERAR' | 'MELHORAR'): string {
  return [
    'Você é o redator técnico da Diretoria de Infraestrutura Física (DIF) da Defensoria Pública do Estado de Mato Grosso e redige um tópico de laudo de avaliação de imóvel.',
    'Escreva em português formal, impessoal e técnico, no mesmo padrão, nível de formalidade e estrutura argumentativa do TEXTO_BASE_INSTITUCIONAL do tópico. Não use linguagem genérica nem marketing.',
    'Fontes permitidas, em ordem de prioridade: FATOS_DO_SISTEMA, RESPOSTAS_DO_AVALIADOR, CONVERSA (somente o que o avaliador afirmou) e, para o tópico de conclusão, CONCLUSAO_ESTRUTURADA.',
    'Nunca invente fatos locais, normas, fontes, datas, nomes, materiais ou características. Nunca declare conformidade normativa sem que o fato esteja nas fontes.',
    'Não faça cálculos e não digite valores monetários, percentuais de resultado, graus ou áreas do resultado: use exatamente os marcadores {{CODIGO}} listados em MARCADORES. Nunca escreva "R$" seguido de número nem "grau I/II/III".',
    'Não decida nem recomende amostras, variáveis, modelo, arbitramento, valor final ou conclusão: descreva apenas o que já está decidido.',
    'Se faltar informação indispensável para redigir o tópico, NÃO suponha: devolva perguntas objetivas ao avaliador.',
    modo === 'MELHORAR' ? 'Tarefa: melhore a redação do TEXTO_ATUAL sem mudar o sentido técnico, mantendo todos os marcadores {{...}} exatamente como estão.' : 'Tarefa: redija o texto completo do tópico.',
    'Responda SOMENTE com JSON válido, sem markdown, em um dos formatos:',
    '{"tipo":"TEXTO","texto":"<texto final do tópico, parágrafos separados por \\n>"}',
    '{"tipo":"PERGUNTAS","perguntas":["<pergunta 1>","<pergunta 2>"]}',
  ].join('\n');
}

export type RespostaAssistente = { tipo: 'TEXTO'; texto: string } | { tipo: 'PERGUNTAS'; perguntas: string[] };
/** Interpreta a resposta do modelo; texto livre (fora do JSON) é tratado como proposta de texto. */
export function parseAssistente(raw: string): RespostaAssistente | null {
  const t = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  if (!t) return null;
  try {
    const j = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
    if (j?.tipo === 'PERGUNTAS' && Array.isArray(j.perguntas)) {
      const p = j.perguntas.map((x: unknown) => String(x ?? '').trim()).filter(Boolean).slice(0, 8);
      if (p.length) return { tipo: 'PERGUNTAS', perguntas: p };
    }
    if (j?.tipo === 'TEXTO' && typeof j.texto === 'string' && j.texto.trim()) return { tipo: 'TEXTO', texto: j.texto.trim() };
  } catch { /* texto livre */ }
  return t.startsWith('{') ? null : { tipo: 'TEXTO', texto: t };
}

/** Bloqueio duro: valor monetário ou grau digitado (fora dos marcadores) torna a proposta inválida. */
export function dadoProtegidoDigitado(texto: string): 'MONEY' | 'GRADE' | null {
  const semTok = texto.replace(TOKEN_RE, ' ');
  if (/R\$\s*\d/.test(semTok)) return 'MONEY';
  if (/\bgraus?(\s+de\s+[^\s{]+)?\s*:?\s+(iii|ii|i)\b/i.test(semTok)) return 'GRADE';
  return null;
}
