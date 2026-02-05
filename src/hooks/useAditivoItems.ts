import { supabase } from "@/integrations/supabase/client";

export interface AditivoItemUpsertInput {
  item_code: string;
  qtd: number;
  pct: number;
  total: number;
  valor_unitario?: number; // Valor unitário específico do aditivo
}

export function useAditivoItems() {
  const upsertItems = async (
    aditivoId: string,
    items: AditivoItemUpsertInput[],
    userId?: string | null
  ): Promise<void> => {
    const aggregated = new Map<string, { item_code: string; qtd: number; pct: number; total: number; valor_unitario?: number }>();
    for (const it of items) {
      const key = it.item_code.trim();
      const existing = aggregated.get(key);
      if (existing) {
        existing.qtd += it.qtd;
        existing.total += it.total;
        existing.pct = it.pct;
        // Manter valor_unitario se já existir
        if (it.valor_unitario && it.valor_unitario > 0) {
          existing.valor_unitario = it.valor_unitario;
        }
      } else {
        aggregated.set(key, { 
          item_code: it.item_code, 
          qtd: it.qtd, 
          pct: it.pct, 
          total: it.total,
          valor_unitario: it.valor_unitario || 0
        });
      }
    }

    const payload = Array.from(aggregated.values()).map((it) => ({
      aditivo_id: aditivoId,
      item_code: it.item_code.trim(),
      qtd: it.qtd,
      pct: it.pct,
      total: it.total,
      valor_unitario: it.valor_unitario || 0,
      user_id: userId ?? null,
    }));

    const { error } = await supabase
      .from('aditivo_items')
      .upsert(payload, { onConflict: 'aditivo_id,item_code' });
    if (error) throw error;
  };

  return { upsertItems };
}
