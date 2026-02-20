
-- Remover a política pública que acabamos de criar (erro)
DROP POLICY IF EXISTS "Public can view basic nuclei data" ON public.nuclei;

-- Recriar a view SEM security_invoker (executa como owner, bypassa RLS)
-- Isso é seguro porque a view SÓ expõe campos não-sensíveis
CREATE OR REPLACE VIEW public.nuclei_public AS
SELECT 
  id,
  name,
  address,
  city,
  coordinates_lat,
  coordinates_lng,
  is_agent_mode,
  fire_department_license_valid_until,
  fire_department_license_document_url,
  horario_atendimento,
  uf,
  created_at,
  updated_at
FROM public.nuclei;
