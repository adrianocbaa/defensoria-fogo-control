-- ============================================================================
-- MÓDULO NÚCLEO - CADASTRO CENTRAL
-- ============================================================================

-- 1) Tabela central de núcleos
CREATE TABLE IF NOT EXISTS public.nucleos_central (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cidade TEXT NOT NULL,
  endereco TEXT NOT NULL,
  telefones TEXT,
  email TEXT,
  lat NUMERIC(10,6),
  lng NUMERIC(10,6),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index para busca
CREATE INDEX idx_nucleos_central_nome ON public.nucleos_central(nome);
CREATE INDEX idx_nucleos_central_cidade ON public.nucleos_central(cidade);

-- Trigger para updated_at
CREATE TRIGGER update_nucleos_central_updated_at
  BEFORE UPDATE ON public.nucleos_central
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Tabela de módulos disponíveis
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  has_map BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir módulos iniciais
INSERT INTO public.modules (key, name, has_map) VALUES
  ('preventivos', 'Preventivos de Incêndio', true),
  ('teletrabalho', 'Teletrabalho', true),
  ('obras', 'Obras', true)
ON CONFLICT (key) DO NOTHING;

-- 3) Tabela de visibilidade (quais núcleos aparecem em quais módulos)
CREATE TABLE IF NOT EXISTS public.nucleo_module_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nucleo_id UUID NOT NULL REFERENCES public.nucleos_central(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL REFERENCES public.modules(key) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(nucleo_id, module_key)
);

CREATE INDEX idx_nucleo_module_visibility_nucleo ON public.nucleo_module_visibility(nucleo_id);
CREATE INDEX idx_nucleo_module_visibility_module ON public.nucleo_module_visibility(module_key);

-- 4) View pública para consumo externo
CREATE OR REPLACE VIEW public.vw_nucleos_public AS
SELECT 
  nc.id,
  nc.nome,
  nc.cidade,
  nc.endereco,
  nc.telefones,
  nc.email,
  nc.lat,
  nc.lng,
  nc.created_at,
  nc.updated_at
FROM public.nucleos_central nc;

-- 5) Migração de dados do módulo Preventivos
-- Copiar núcleos existentes para o cadastro central
INSERT INTO public.nucleos_central (
  nome, 
  cidade, 
  endereco, 
  telefones, 
  email, 
  lat, 
  lng,
  user_id,
  created_at,
  updated_at
)
SELECT 
  n.name,
  n.city,
  n.address,
  n.telefone,
  n.email,
  n.coordinates_lat,
  n.coordinates_lng,
  n.user_id,
  n.created_at,
  n.updated_at
FROM public.nuclei n
ON CONFLICT DO NOTHING;

-- Criar vínculos para o módulo Preventivos (manter visibilidade atual)
INSERT INTO public.nucleo_module_visibility (nucleo_id, module_key)
SELECT 
  nc.id,
  'preventivos'
FROM public.nucleos_central nc
WHERE nc.id IN (
  SELECT id FROM public.nuclei
)
ON CONFLICT (nucleo_id, module_key) DO NOTHING;

-- 6) RLS Policies

-- nucleos_central
ALTER TABLE public.nucleos_central ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with edit permission can view nucleos_central"
  ON public.nucleos_central FOR SELECT
  USING (can_edit());

CREATE POLICY "Users with edit permission can insert nucleos_central"
  ON public.nucleos_central FOR INSERT
  WITH CHECK (can_edit());

CREATE POLICY "Users with edit permission can update nucleos_central"
  ON public.nucleos_central FOR UPDATE
  USING (can_edit());

CREATE POLICY "Users with edit permission can delete nucleos_central"
  ON public.nucleos_central FOR DELETE
  USING (can_edit());

-- modules (somente leitura para usuários)
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view modules"
  ON public.modules FOR SELECT
  USING (true);

-- nucleo_module_visibility
ALTER TABLE public.nucleo_module_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with edit permission can view nucleo_module_visibility"
  ON public.nucleo_module_visibility FOR SELECT
  USING (can_edit());

CREATE POLICY "Admins can insert nucleo_module_visibility"
  ON public.nucleo_module_visibility FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete nucleo_module_visibility"
  ON public.nucleo_module_visibility FOR DELETE
  USING (is_admin());

-- 7) Trigger para audit logs
CREATE TRIGGER log_nucleos_central_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.nucleos_central
  FOR EACH ROW EXECUTE FUNCTION public.log_changes();

-- 8) Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.nucleos_central;
ALTER PUBLICATION supabase_realtime ADD TABLE public.nucleo_module_visibility;