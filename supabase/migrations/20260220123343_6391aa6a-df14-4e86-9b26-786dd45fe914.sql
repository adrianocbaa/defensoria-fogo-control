
-- Remover política pública que expõe dados de contato
DROP POLICY IF EXISTS "Public can view nuclei" ON public.nuclei;
