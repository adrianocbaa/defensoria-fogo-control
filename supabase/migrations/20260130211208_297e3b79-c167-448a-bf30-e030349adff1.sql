-- Correção retroativa: sincronizar aditivo_prazo com a soma real de prazo_dias dos aditivos
-- Para obras sem aditivos, resetar aditivo_prazo para 0 e recalcular previsao_termino

-- 1. Resetar aditivo_prazo para obras que não têm aditivos registrados
UPDATE public.obras o
SET 
  aditivo_prazo = 0,
  previsao_termino = CASE 
    WHEN data_inicio IS NOT NULL AND tempo_obra IS NOT NULL AND tempo_obra > 0 
    THEN (data_inicio::date + tempo_obra * INTERVAL '1 day')::date
    ELSE previsao_termino
  END
WHERE o.aditivo_prazo > 0
  AND NOT EXISTS (SELECT 1 FROM public.aditivo_sessions a WHERE a.obra_id = o.id);

-- 2. Para obras COM aditivos, recalcular aditivo_prazo baseado na soma dos prazo_dias registrados
UPDATE public.obras o
SET 
  aditivo_prazo = COALESCE(
    (SELECT SUM(COALESCE(a.prazo_dias, 0)) FROM public.aditivo_sessions a WHERE a.obra_id = o.id),
    0
  ),
  previsao_termino = CASE 
    WHEN data_inicio IS NOT NULL AND tempo_obra IS NOT NULL AND tempo_obra > 0 
    THEN (
      data_inicio::date + 
      (tempo_obra + COALESCE(
        (SELECT SUM(COALESCE(a.prazo_dias, 0)) FROM public.aditivo_sessions a WHERE a.obra_id = o.id),
        0
      )) * INTERVAL '1 day'
    )::date
    ELSE previsao_termino
  END
WHERE EXISTS (SELECT 1 FROM public.aditivo_sessions a WHERE a.obra_id = o.id);