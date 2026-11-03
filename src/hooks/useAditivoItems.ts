import { supabase } from "@/integrations/supabase/client";

export interface AditivoItemUpsertInput {
  item_code: string;
  qtd: number;
  pct: number;
  total: number;
  valor_unitario?: number; // Valor unitário líquido (com desconto) do aditivo
  valor_unitario_bruto?: number; // Valor unitário bruto (sem desconto) — base única de precisão
}

export function useAditivoItems() {
  const upsertItems = async (
    aditivoId: string,
    items: AditivoItemUpsertInput[],
    userId?: string | null,
    zeroCodes?: string[]
  ): Promise<void> => {
    const aggregated = new Map<string, AditivoItemUpsertInput>();
    for (const it of items) {
      const key = it.item_code.trim();
      const existing = aggregated.get(key);
      if (existing) {
        existing.qtd += it.qtd;
        existing.total += it.total;
        existing.pct = it.pct;
        // Manter valores unitários se já existirem
        if (it.valor_unitario && it.valor_unitario !== 0) {
          existing.valor_unitario = it.valor_unitario;
        }
        if (it.valor_unitario_bruto && it.valor_unitario_bruto !== 0) {
          existing.valor_unitario_bruto = it.valor_unitario_bruto;
        }
      } else {
        aggregated.set(key, {
          item_code: it.item_code,
          qtd: it.qtd,
          pct: it.pct,
          total: it.total,
          valor_unitario: it.valor_unitario || 0,
          valor_unitario_bruto: it.valor_unitario_bruto || 0,
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
      valor_unitario_bruto: it.valor_unitario_bruto || 0,
      user_id: userId ?? null,
    }));

    if (payload.length > 0) {
      const { error } = await supabase
        .from('aditivo_items')
        .upsert(payload as any, { onConflict: 'aditivo_id,item_code' });
      if (error) throw error;
    }

    // Itens zerados pelo usuário: remover o registro salvo anteriormente,
    // senão o valor antigo reaparece ao recarregar.
    const keep = new Set(payload.map((p) => p.item_code));
    const toDelete = Array.from(new Set((zeroCodes || []).map((c) => c.trim()))).filter((c) => c && !keep.has(c));
    if (toDelete.length > 0) {
      const { error: delErr } = await supabase
        .from('aditivo_items')
        .delete()
        .eq('aditivo_id', aditivoId)
        .in('item_code', toDelete);
      if (delErr) throw delErr;
    }
  };

  return { upsertItems };
}

