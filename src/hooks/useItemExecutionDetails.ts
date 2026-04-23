import { supabase } from '@/integrations/supabase/client';

export interface ItemExecutionDetail {
  report_id: string;
  numero_seq: number | null;
  data: string;
  status: string;
  executado_dia: number;
}

/**
 * Busca todos os lançamentos (de qualquer status) que consumiram saldo
 * de um item de orçamento numa obra. Útil para explicar ao usuário
 * por que um item aparece como "100% já executado".
 */
export async function fetchItemExecutionDetails(
  obraId: string,
  orcamentoItemId: string
): Promise<ItemExecutionDetail[]> {
  const { data, error } = await supabase
    .from('rdo_activities')
    .select(`
      executado_dia,
      report_id,
      rdo_reports!inner(numero_seq, data, status, obra_id)
    `)
    .eq('obra_id', obraId)
    .eq('orcamento_item_id', orcamentoItemId)
    .eq('tipo', 'planilha')
    .gt('executado_dia', 0);

  if (error) throw error;

  return (data || []).map((row: any) => ({
    report_id: row.report_id,
    numero_seq: row.rdo_reports?.numero_seq ?? null,
    data: row.rdo_reports?.data,
    status: row.rdo_reports?.status,
    executado_dia: Number(row.executado_dia || 0),
  })).sort((a, b) => (a.data > b.data ? 1 : -1));
}
