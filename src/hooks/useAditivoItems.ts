import { supabase } from "@/integrations/supabase/client";

export interface AditivoItemUpsertInput {
  item_code: string;
  qtd: number;
  pct: number;
  total: number;
}

export function useAditivoItems() {
  const upsertItems = async (
    aditivoId: string,
    items: AditivoItemUpsertInput[],
    userId?: string | null
  ): Promise<void> => {
    const aggregated = new Map<string, { item_code: string; qtd: number; pct: number; total: number }>();
    for (const it of items) {
      const key = it.item_code.trim();
      const existing = aggregated.get(key);
      if (existing) {
        existing.qtd += it.qtd;
        existing.total += it.total;
        existing.pct = it.pct;
      } else {
        aggregated.set(key, { item_code: it.item_code, qtd: it.qtd, pct: it.pct, total: it.total });
      }
    }

    const payload = Array.from(aggregated.values()).map((it) => ({
      aditivo_id: aditivoId,
      item_code: it.item_code,
      qtd: it.qtd,
      pct: it.pct,
      total: it.total,
      user_id: userId ?? null,
    }));

    const { error } = await supabase
      .from('aditivo_items')
      .upsert(payload, { onConflict: 'aditivo_id,item_code' });
    if (error) throw error;
  };

  return { upsertItems };
}
