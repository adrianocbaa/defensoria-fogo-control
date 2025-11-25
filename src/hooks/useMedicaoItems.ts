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
    // Use Map to keep only the last value for each item_code (no summing)
    // IMPORTANTE: item_code deve sempre ser o código hierárquico (item), nunca o código de banco
    const deduped = new Map<string, MedicaoItemUpsertInput>();
    for (const it of items) {
      const key = it.item_code.trim();
      // Replace with latest value, don't sum
      deduped.set(key, it);
    }

    const payload = Array.from(deduped.values()).map((it) => ({
      medicao_id: sessionId,
      item_code: it.item_code.trim(), // Sempre código hierárquico
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
