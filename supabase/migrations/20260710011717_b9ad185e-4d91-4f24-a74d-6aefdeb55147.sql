CREATE OR REPLACE FUNCTION public.get_sidif_public_stats()
RETURNS TABLE(obras_ativas bigint, medicoes_mes bigint, nucleos bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.obras
      WHERE (is_demo IS NOT TRUE)
        AND status IN ('em_andamento','planejamento'))::bigint AS obras_ativas,
    (SELECT count(*) FROM public.medicoes m
      JOIN public.obras o ON o.id = m.obra_id
      WHERE (o.is_demo IS NOT TRUE)
        AND m.created_at >= date_trunc('month', now()))::bigint AS medicoes_mes,
    (SELECT count(*) FROM public.nuclei)::bigint AS nucleos;
$$;

GRANT EXECUTE ON FUNCTION public.get_sidif_public_stats() TO anon, authenticated;