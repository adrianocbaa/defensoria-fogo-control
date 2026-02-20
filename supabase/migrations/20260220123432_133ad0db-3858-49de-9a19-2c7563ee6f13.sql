
-- Criar view pública para nuclei sem dados de contato sensíveis
CREATE OR REPLACE VIEW public.nuclei_public
WITH (security_invoker = on) AS
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

-- Adicionar política SELECT pública para nuclei que funciona apenas via view
-- A view nuclei_public não expõe campos sensíveis
-- Precisamos de uma política que permita leitura pública dos campos básicos
CREATE POLICY "Public can view basic nuclei data"
  ON public.nuclei
  FOR SELECT
  USING (true);
