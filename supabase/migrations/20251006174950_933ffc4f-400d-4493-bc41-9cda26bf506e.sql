-- Fix Security Definer View issue
-- Recreate vw_nucleos_public with explicit SECURITY INVOKER option

DROP VIEW IF EXISTS public.vw_nucleos_public;

CREATE VIEW public.vw_nucleos_public
WITH (security_invoker = true)
AS
SELECT 
  id,
  nome,
  cidade,
  endereco,
  telefones,
  email,
  lat,
  lng,
  created_at,
  updated_at
FROM nucleos_central nc;