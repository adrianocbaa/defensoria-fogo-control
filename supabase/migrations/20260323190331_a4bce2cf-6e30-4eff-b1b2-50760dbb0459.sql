
-- 1. Zerar o item 4.7 na 1ª medição de Nova Monte Verde
UPDATE public.medicao_items
SET qtd = 0, pct = 0, total = 0, updated_at = now()
WHERE id = 'c4978109-b4dc-46ae-aba4-b486f68a8804';

-- 2. Bloquear a 1ª sessão de medição de Nova Monte Verde
-- (bypassa validação de 100% pois é correção histórica autorizada)
UPDATE public.medicao_sessions
SET status = 'bloqueada', updated_at = now()
WHERE id = '8566fd55-1944-4bec-b644-b94dc8a239f0';
