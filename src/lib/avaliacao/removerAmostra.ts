// "Remover da avaliação": regras puras da tela. Remover desfaz só o vínculo da amostra; imóvel e dado de mercado ficam no banco.

export type MotivoHistorico = 'CONJUNTO_CONGELADO' | 'MODELO' | 'IMPORTADA_POR_OUTRA_AVALIACAO';
export interface AmostraHistorica { motivos: MotivoHistorico[]; selecionada: boolean; habilitada_modelo: boolean }

export const TITULO_REMOVER = 'Remover amostra da avaliação?';
export const TEXTO_REMOVER = 'O imóvel e o dado de mercado continuarão disponíveis no Banco de Imóveis. Esta ação remove apenas o vínculo com esta avaliação.';
export const TEXTO_HISTORICA = "Esta amostra já integra uma versão congelada do conjunto de dados. Para deixar de utilizá-la nas próximas análises, desmarque 'Usar' ou 'No modelo' e congele uma nova versão. O histórico anterior será preservado.";

const MOTIVOS: MotivoHistorico[] = ['CONJUNTO_CONGELADO', 'MODELO', 'IMPORTADA_POR_OUTRA_AVALIACAO'];
const COMPLEMENTO: Record<MotivoHistorico, string> = {
  CONJUNTO_CONGELADO: '',
  MODELO: 'Ela também aparece em modelos já calculados.',
  IMPORTADA_POR_OUTRA_AVALIACAO: 'Outra avaliação importou esta amostra e guarda a referência a ela.',
};

/** Lê o detalhe do erro aval:amostra_historica (texto JSON do servidor). Retorna null se não houver motivo conhecido. */
export function lerAmostraHistorica(details: unknown): AmostraHistorica | null {
  try {
    const o = typeof details === 'string' ? JSON.parse(details) : details;
    if (!o || typeof o !== 'object') return null;
    const raw = (o as { motivos?: unknown }).motivos;
    const motivos = (Array.isArray(raw) ? raw : []).filter((m): m is MotivoHistorico => MOTIVOS.includes(m as MotivoHistorico));
    if (!motivos.length) return null;
    return { motivos: [...new Set(motivos)], selecionada: (o as { selecionada?: unknown }).selecionada === true,
      habilitada_modelo: (o as { habilitada_modelo?: unknown }).habilitada_modelo === true };
  } catch { return null; }
}

/** Frases adicionais conforme os motivos (o texto principal é TEXTO_HISTORICA). */
export function complementosHistorica(h: AmostraHistorica): string[] {
  return h.motivos.map((m) => COMPLEMENTO[m]).filter(Boolean);
}

/** "Desmarcar e preparar nova versão" só aparece para quem decide a seleção e quando ainda há algo marcado. */
export function podeDesmarcar(h: AmostraHistorica, podeDecidir: boolean): boolean {
  return podeDecidir && (h.selecionada || h.habilitada_modelo);
}
