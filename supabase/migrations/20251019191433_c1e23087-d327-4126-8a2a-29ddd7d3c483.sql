-- ============================================================================
-- SECURITY FIX: Restrict Public Access to Coordinator Contact Info
-- ============================================================================

-- Remove public access to nucleos_central personal contact information
DROP POLICY IF EXISTS "Public can view nucleos_central" ON public.nucleos_central;

-- Create authenticated-only access policy
CREATE POLICY "Authenticated users can view nucleos_central"
ON public.nucleos_central FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create a public view with only non-sensitive data for truly public access
DROP VIEW IF EXISTS public.nucleos_central_public;
CREATE VIEW public.nucleos_central_public AS
SELECT 
  id,
  nome,
  cidade,
  endereco,
  horario_atendimento,
  lat,
  lng,
  created_at,
  updated_at
FROM public.nucleos_central;