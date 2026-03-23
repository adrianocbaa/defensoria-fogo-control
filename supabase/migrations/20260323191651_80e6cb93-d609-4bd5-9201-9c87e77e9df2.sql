
-- Corrigir divergências de R$0,01 na 1ª Medição de Nova Monte Verde
-- Sessão: 8566fd55-1944-4bec-b644-b94dc8a239f0
-- Valores ajustados para refletir o PDF impresso em 18/11/2025

UPDATE public.medicao_items SET total = 2716.08, updated_at = now()
WHERE medicao_id = '8566fd55-1944-4bec-b644-b94dc8a239f0' AND item_code = '3.1';

UPDATE public.medicao_items SET total = 290.19, updated_at = now()
WHERE medicao_id = '8566fd55-1944-4bec-b644-b94dc8a239f0' AND item_code = '4.4';

UPDATE public.medicao_items SET total = 1257.40, updated_at = now()
WHERE medicao_id = '8566fd55-1944-4bec-b644-b94dc8a239f0' AND item_code = '4.8';

UPDATE public.medicao_items SET total = 921.04, updated_at = now()
WHERE medicao_id = '8566fd55-1944-4bec-b644-b94dc8a239f0' AND item_code = '4.9';

UPDATE public.medicao_items SET total = 4469.63, updated_at = now()
WHERE medicao_id = '8566fd55-1944-4bec-b644-b94dc8a239f0' AND item_code = '4.10';

UPDATE public.medicao_items SET total = 1912.72, updated_at = now()
WHERE medicao_id = '8566fd55-1944-4bec-b644-b94dc8a239f0' AND item_code = '6.5';
