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
    // Aggregate items by item_code (trimmed) to avoid duplicate upserts
    const aggregated = new Map<string, { item_code: string; qtd: number; pct: number; total: number }>();
    for (const it of items) {
      const key = it.item_code.trim();
      const existing = aggregated.get(key);
      if (existing) {
        existing.qtd += it.qtd;
        existing.total += it.total;
        // Keep the latest pct provided (UI recalculates % from total/contrato)
        existing.pct = it.pct;
      } else {
        aggregated.set(key, {
          item_code: it.item_code, // keep original formatting for downstream matching
          qtd: it.qtd,
          pct: it.pct,
          total: it.total,
        });
      }
    }

    const payload = Array.from(aggregated.values()).map((it) => ({
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
