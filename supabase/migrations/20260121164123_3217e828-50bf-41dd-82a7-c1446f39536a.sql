-- Corrigir o valor incorreto de aditivo_prazo para a obra de Rondonópolis Criminal
-- O valor foi duplicado por um bug de double-click (30 + 30 = 60)
-- Deveria ser apenas 30 dias

UPDATE public.obras 
SET aditivo_prazo = 30, updated_at = now()
WHERE id = '9e5b55bc-df14-4708-838f-cef1777fc8ee';