CREATE OR REPLACE FUNCTION public.get_public_rdo_progress_by_obra(p_obra_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  WITH obra_publica AS (
    SELECT id FROM public.obras WHERE id = p_obra_id AND is_public IS TRUE AND is_demo IS NOT TRUE
  ),
  aditivo_ajustes AS (
    SELECT ai.item_code, SUM(ai.qtd) AS ajuste
    FROM public.aditivo_items ai
    JOIN public.aditivo_sessions s ON s.id = ai.aditivo_id
    JOIN obra_publica op ON op.id = s.obra_id
    WHERE s.status = 'bloqueada'
    GROUP BY ai.item_code
  ),
  orcamento AS (
    SELECT h.id,
      CASE WHEN h.origem = 'extracontratual' THEN GREATEST(0, h.quantidade)
           ELSE GREATEST(0, h.quantidade + COALESCE(a.ajuste, 0)) END AS quantidade_ajustada
    FROM public.orcamento_items h
    JOIN obra_publica op ON op.id = h.obra_id
    LEFT JOIN aditivo_ajustes a ON TRIM(a.item_code) = h.item
    WHERE h.eh_administracao_local = false
      AND NOT EXISTS (
        SELECT 1 FROM public.orcamento_items child
        WHERE child.obra_id = h.obra_id AND child.item LIKE h.item || '.%'
      )
  ),
  executado AS (
    SELECT r.orcamento_item_id, SUM(r.executado_dia) AS total_executado
    FROM public.rdo_activities r
    JOIN obra_publica op ON op.id = r.obra_id
    WHERE r.orcamento_item_id IS NOT NULL AND r.tipo = 'planilha'
    GROUP BY r.orcamento_item_id
  )
  SELECT CASE WHEN EXISTS (SELECT 1 FROM obra_publica) THEN
    COALESCE((SELECT SUM(LEAST(COALESCE(e.total_executado, 0), o.quantidade_ajustada))
      / NULLIF(SUM(o.quantidade_ajustada), 0) * 100
      FROM orcamento o LEFT JOIN executado e ON e.orcamento_item_id = o.id
      WHERE o.quantidade_ajustada > 0), 0)
  ELSE NULL END;
$$;
REVOKE ALL ON FUNCTION public.get_public_rdo_progress_by_obra(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_rdo_progress_by_obra(uuid) TO anon, authenticated, service_role;