import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AditivoItemRdo {
  item_code: string;
  qtd: number;
}

interface AditivoParaRdo {
  sessionId: string;
  sequencia: number;
  bloqueada: boolean;
  items: AditivoItemRdo[];
}

/**
 * Hook para buscar aditivos bloqueados de uma obra e calcular ajustes de quantidade.
 * Usado no RDO para refletir supressões/acréscimos nos quantitativos disponíveis.
 */
export function useAditivosParaRdo(obraId: string) {
  return useQuery({
    queryKey: ['aditivos-para-rdo', obraId],
    queryFn: async (): Promise<AditivoParaRdo[]> => {
      const { data, error } = await supabase
        .from('aditivo_sessions')
        .select('id, sequencia, status, aditivo_items ( item_code, qtd )')
        .eq('obra_id', obraId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((session: any) => ({
        sessionId: session.id,
        sequencia: session.sequencia ?? 0,
        bloqueada: session.status === 'bloqueada',
        items: (session.aditivo_items || []).map((it: any) => ({
          item_code: (it.item_code || '').trim(),
          qtd: Number(it.qtd) || 0,
        })),
      }));
    },
    enabled: !!obraId,
  });
}

/**
 * Calcula o ajuste de quantidade de um item considerando os aditivos bloqueados.
 * Retorna o valor a ser somado à quantidade original (pode ser negativo para supressões).
 */
export function calcularAjusteAditivos(
  itemCode: string,
  aditivos: AditivoParaRdo[],
  codigoToItemCode?: Map<string, string> // Mapa de código de banco para item code
): number {
  let ajuste = 0;

  aditivos
    .filter(a => a.bloqueada) // Apenas aditivos bloqueados contam
    .forEach(aditivo => {
      aditivo.items.forEach(item => {
        // Verificar correspondência direta
        if (item.item_code === itemCode) {
          ajuste += item.qtd;
        } else if (codigoToItemCode) {
          // Verificar correspondência via mapa
          const mappedCode = codigoToItemCode.get(item.item_code);
          if (mappedCode === itemCode) {
            ajuste += item.qtd;
          }
        }
      });
    });

  return ajuste;
}
