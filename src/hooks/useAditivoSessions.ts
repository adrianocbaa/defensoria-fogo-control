import { supabase } from "@/integrations/supabase/client";

export interface AditivoSessionRow {
  id: string;
  sequencia: number;
  status: string;
  created_at: string;
}

export function useAditivoSessions() {
  const createSession = async (obraId: string, sequencia: number): Promise<AditivoSessionRow> => {
    const { data, error } = await supabase
      .from('aditivo_sessions')
      .insert([{ obra_id: obraId, sequencia, status: 'aberta' }])
      .select('id, sequencia, status, created_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Falha ao criar sessão do aditivo');
    return data as AditivoSessionRow;
  };

  const blockSession = async (sessionId: string): Promise<void> => {
    const { error } = await supabase
      .from('aditivo_sessions')
      .update({ status: 'bloqueada' })
      .eq('id', sessionId);
    if (error) throw error;
  };

  const reopenSession = async (sessionId: string): Promise<void> => {
    const { error } = await supabase
      .from('aditivo_sessions')
      .update({ status: 'aberta' })
      .eq('id', sessionId);
    if (error) throw error;
  };

  const deleteSession = async (sessionId: string): Promise<void> => {
    const { error: itemsError } = await supabase
      .from('aditivo_items')
      .delete()
      .eq('aditivo_id', sessionId);
    if (itemsError) throw itemsError;

    const { error: sessionError } = await supabase
      .from('aditivo_sessions')
      .delete()
      .eq('id', sessionId);
    if (sessionError) throw sessionError;
  };

  const fetchSessionsWithItems = async (obraId: string) => {
    const { data, error } = await supabase
      .from('aditivo_sessions')
      .select('id, sequencia, status, created_at, aditivo_items ( item_code, qtd, pct, total )')
      .eq('obra_id', obraId)
      .order('sequencia', { ascending: true });
    if (error) throw error;
    return data;
  };

  return { createSession, blockSession, reopenSession, deleteSession, fetchSessionsWithItems };
}
