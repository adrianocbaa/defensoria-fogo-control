import { supabase } from "@/integrations/supabase/client";

export interface MedicaoSessionRow {
  id: string;
  sequencia: number;
  status: string;
  created_at: string;
}

export function useMedicaoSessions() {
  const createSession = async (obraId: string, sequencia: number): Promise<MedicaoSessionRow> => {
    const { data, error } = await supabase
      .from('medicao_sessions')
      .insert([{ obra_id: obraId, sequencia, status: 'aberta' }])
      .select('id, sequencia, status, created_at')
      .single();
    if (error) throw error;
    return data as MedicaoSessionRow;
  };

  const blockSession = async (sessionId: string): Promise<void> => {
    const { error } = await supabase
      .from('medicao_sessions')
      .update({ status: 'bloqueada' })
      .eq('id', sessionId);
    if (error) throw error;
  };

  const reopenSession = async (sessionId: string): Promise<void> => {
    const { error } = await supabase
      .from('medicao_sessions')
      .update({ status: 'aberta' })
      .eq('id', sessionId);
    if (error) throw error;
  };

  const deleteSession = async (sessionId: string): Promise<void> => {
    // Delete items first (no FK cascade declared in schema summary)
    const { error: itemsError } = await supabase
      .from('medicao_items')
      .delete()
      .eq('medicao_id', sessionId);
    if (itemsError) throw itemsError;

    const { error: sessionError } = await supabase
      .from('medicao_sessions')
      .delete()
      .eq('id', sessionId);
    if (sessionError) throw sessionError;
  };

  const fetchSessionsWithItems = async (obraId: string) => {
    const { data, error } = await supabase
      .from('medicao_sessions')
      .select('id, sequencia, status, created_at, medicao_items ( item_code, qtd, pct, total )')
      .eq('obra_id', obraId)
      .order('sequencia', { ascending: true });
    if (error) throw error;
    return data;
  };

  return { createSession, blockSession, reopenSession, deleteSession, fetchSessionsWithItems };
}
