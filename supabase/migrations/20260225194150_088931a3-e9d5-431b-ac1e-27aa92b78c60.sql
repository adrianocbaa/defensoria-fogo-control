
CREATE OR REPLACE FUNCTION public.get_rdo_progress_by_obra(p_obra_id uuid)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  v_progress numeric;
BEGIN
  WITH aditivo_ajustes AS (
    SELECT ai.item_code, SUM(ai.qtd) as ajuste
    FROM aditivo_items ai
    JOIN aditivo_sessions s ON s.id = ai.aditivo_id
    WHERE s.obra_id = p_obra_id AND s.status = 'bloqueada'
    GROUP BY ai.item_code
  ),
  -- Apenas itens FOLHA (sem filhos na hierarquia)
  orcamento AS (
    SELECT h.id, h.item, h.quantidade,
      GREATEST(0, h.quantidade + COALESCE(a.ajuste, 0)) as quantidade_ajustada
    FROM orcamento_items h
    LEFT JOIN aditivo_ajustes a ON TRIM(a.item_code) = h.item
    WHERE h.obra_id = p_obra_id
      AND h.eh_administracao_local = false
      AND h.origem != 'extracontratual'
      -- Apenas itens folha: não existe outro item com prefixo item + '.'
      AND NOT EXISTS (
        SELECT 1 FROM orcamento_items child
        WHERE child.obra_id = p_obra_id
          AND child.item LIKE h.item || '.%'
      )
  ),
  executado AS (
    SELECT r.orcamento_item_id, SUM(r.executado_dia) as total_executado
    FROM rdo_activities r
    JOIN orcamento_items oi ON oi.id = r.orcamento_item_id
    WHERE r.obra_id = p_obra_id 
      AND r.orcamento_item_id IS NOT NULL
      AND oi.origem != 'extracontratual'
    GROUP BY r.orcamento_item_id
  ),
  item_calc AS (
    SELECT o.id,
      o.quantidade_ajustada,
      CASE WHEN o.quantidade_ajustada > 0
        THEN (LEAST(COALESCE(e.total_executado, 0), o.quantidade_ajustada) / o.quantidade_ajustada) * 100
        ELSE 0 END as percentual
    FROM orcamento o
    LEFT JOIN executado e ON e.orcamento_item_id = o.id
    WHERE o.quantidade_ajustada > 0
  )
  SELECT COALESCE(
    SUM(percentual * quantidade_ajustada) / NULLIF(SUM(quantidade_ajustada), 0),
    0
  ) INTO v_progress
  FROM item_calc;

  RETURN v_progress;
END;
$$;
