// Acesso a dados e ações oficiais do módulo Avaliações.
import { supabase } from '@/integrations/supabase/client';
import { avalMessageFromCode } from './errors';

// O cliente tipado ainda não conhece as RPCs/tabelas novas em todos os pontos; usamos um alias sem tipos estritos.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;

export async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw error;
  return data as T;
}

export class EngineCallError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

/** Chama a função do servidor que executa o motor oficial. Erros são traduzidos por allowlist. */
export async function engine(body: { action: 'run_model' | 'run_validation'; modelo_id: string } | { action: 'project'; acceptance_id: string }) {
  const { data, error } = await supabase.functions.invoke('avaliacao-engine', { body });
  if (error) {
    let code: string | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === 'function') {
        const payload = await ctx.json();
        code = typeof payload?.error === 'string' ? payload.error : null;
      }
    } catch { code = null; }
    throw new EngineCallError(code ?? 'internal_error', avalMessageFromCode(code, 'O cálculo não pôde ser concluído.'));
  }
  return data;
}

export interface Pendencia {
  bloco: string;
  estado: 'PRONTA' | 'EM_ANDAMENTO' | 'PENDENTE' | 'BLOQUEADA' | 'DESATUALIZADA';
  pendencias: string[];
  proxima_acao: string | null;
  [k: string]: unknown;
}
