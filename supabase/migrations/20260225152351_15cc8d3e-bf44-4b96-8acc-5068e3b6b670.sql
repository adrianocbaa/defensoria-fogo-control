
-- Corrige get_rdo_progress_by_obra e get_rdo_progress_batch para excluir 
-- rdo_activities de itens extracontratuais (que já foram excluídos do denominador)

CREATE OR REPLACE FUNCTION public.get_rdo_progress_by_obra(p_obra_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
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
  orcamento AS (
    SELECT h.id, h.item, h.quantidade,
      GREATEST(0, h.quantidade + COALESCE(a.ajuste, 0)) as quantidade_ajustada
    FROM orcamento_items_hierarquia h
    LEFT JOIN aditivo_ajustes a ON TRIM(a.item_code) = h.item
    WHERE h.obra_id = p_obra_id
      AND h.eh_administracao_local = false
      AND (h.is_macro IS NULL OR h.is_macro = false)
      AND h.origem != 'extracontratual'
  ),
  executado AS (
    SELECT r.orcamento_item_id, SUM(r.executado_dia) as total_executado
    FROM rdo_activities r
    -- Excluir itens extracontratuais do numerador também
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

CREATE OR REPLACE FUNCTION public.get_rdo_progress_batch(p_obra_ids uuid[])
RETURNS TABLE(obra_id uuid, progress numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH aditivo_ajustes AS (
    SELECT s.obra_id, ai.item_code, SUM(ai.qtd) as ajuste
    FROM aditivo_items ai
    JOIN aditivo_sessions s ON s.id = ai.aditivo_id
    WHERE s.obra_id = ANY(p_obra_ids) AND s.status = 'bloqueada'
    GROUP BY s.obra_id, ai.item_code
  ),
  orcamento AS (
    SELECT h.obra_id, h.id, h.item, h.quantidade,
      GREATEST(0, h.quantidade + COALESCE(a.ajuste, 0)) as quantidade_ajustada
    FROM orcamento_items_hierarquia h
    LEFT JOIN aditivo_ajustes a ON a.obra_id = h.obra_id AND TRIM(a.item_code) = h.item
    WHERE h.obra_id = ANY(p_obra_ids)
      AND h.eh_administracao_local = false
      AND (h.is_macro IS NULL OR h.is_macro = false)
      AND h.origem != 'extracontratual'
  ),
  executado AS (
    SELECT r.obra_id, r.orcamento_item_id, SUM(r.executado_dia) as total_executado
    FROM rdo_activities r
    -- Excluir itens extracontratuais do numerador também
    JOIN orcamento_items oi ON oi.id = r.orcamento_item_id
    WHERE r.obra_id = ANY(p_obra_ids) 
      AND r.orcamento_item_id IS NOT NULL
      AND oi.origem != 'extracontratual'
    GROUP BY r.obra_id, r.orcamento_item_id
  ),
  item_calc AS (
    SELECT o.obra_id,
      o.quantidade_ajustada,
      CASE WHEN o.quantidade_ajustada > 0
        THEN (LEAST(COALESCE(e.total_executado, 0), o.quantidade_ajustada) / o.quantidade_ajustada) * 100
        ELSE 0 END as percentual
    FROM orcamento o
    LEFT JOIN executado e ON e.orcamento_item_id = o.id AND e.obra_id = o.obra_id
    WHERE o.quantidade_ajustada > 0
  )
  SELECT ic.obra_id,
    COALESCE(
      SUM(ic.percentual * ic.quantidade_ajustada) / NULLIF(SUM(ic.quantidade_ajustada), 0),
      0
    ) as progress
  FROM item_calc ic
  GROUP BY ic.obra_id;
END;
$$;
