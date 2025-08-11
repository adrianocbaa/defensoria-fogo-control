import { supabase } from "@/integrations/supabase/client";

export interface MedicaoItemUpsertInput {
  item_code: string;
  qtd: number;
  pct: number;
  total: number;
}

export function useMedicaoItems() {
  const upsertItems = async (
    sessionId: string,
    items: MedicaoItemUpsertInput[],
    userId?: string | null
  ): Promise<void> => {
    const payload = items.map((it) => ({
      medicao_id: sessionId,
      item_code: it.item_code,
      qtd: it.qtd,
      pct: it.pct,
      total: it.total,
      user_id: userId ?? null,
    }));

    const { error } = await supabase
      .from('medicao_items')
      .upsert(payload, { onConflict: 'medicao_id,item_code' });
    if (error) throw error;
  };

  return { upsertItems };
}
