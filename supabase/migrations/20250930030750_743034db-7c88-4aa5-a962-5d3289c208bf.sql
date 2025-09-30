-- Add new columns to existing nuclei table for DPE-MT module
ALTER TABLE public.nuclei ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE public.nuclei ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.nuclei ADD COLUMN IF NOT EXISTS horario_atendimento text;
ALTER TABLE public.nuclei ADD COLUMN IF NOT EXISTS membro_coordenador text;
ALTER TABLE public.nuclei ADD COLUMN IF NOT EXISTS coordenador_substituto text;
ALTER TABLE public.nuclei ADD COLUMN IF NOT EXISTS auxiliar_coordenador text;
ALTER TABLE public.nuclei ADD COLUMN IF NOT EXISTS uf text;

-- Create table for teletrabalho records
CREATE TABLE IF NOT EXISTS public.nucleo_teletrabalho (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nucleo_id uuid NOT NULL REFERENCES public.nuclei(id) ON DELETE CASCADE,
  procedimento text NOT NULL,
  data_inicio date NOT NULL,
  data_fim date,
  portaria text,
  portaria_file text,
  motivo text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on nucleo_teletrabalho
ALTER TABLE public.nucleo_teletrabalho ENABLE ROW LEVEL SECURITY;

-- RLS Policies for nucleo_teletrabalho (mirror from Preventivos module)
CREATE POLICY "Users with edit permission can view teletrabalho" 
ON public.nucleo_teletrabalho 
FOR SELECT 
USING (can_edit());

CREATE POLICY "Users with edit permission can insert teletrabalho" 
ON public.nucleo_teletrabalho 
FOR INSERT 
WITH CHECK (can_edit());

CREATE POLICY "Users with edit permission can update teletrabalho" 
ON public.nucleo_teletrabalho 
FOR UPDATE 
USING (can_edit());

CREATE POLICY "Users with edit permission can delete teletrabalho" 
ON public.nucleo_teletrabalho 
FOR DELETE 
USING (can_edit());

-- Create trigger for updated_at on nucleo_teletrabalho
CREATE TRIGGER update_nucleo_teletrabalho_updated_at
BEFORE UPDATE ON public.nucleo_teletrabalho
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for teletrabalho portarias
INSERT INTO storage.buckets (id, name, public) 
VALUES ('teletrabalho-portarias', 'teletrabalho-portarias', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for teletrabalho-portarias bucket
CREATE POLICY "Public can view teletrabalho portarias" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'teletrabalho-portarias');

CREATE POLICY "Users with edit permission can upload teletrabalho portarias" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'teletrabalho-portarias' AND can_edit());

CREATE POLICY "Users with edit permission can update teletrabalho portarias" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'teletrabalho-portarias' AND can_edit());

CREATE POLICY "Users with edit permission can delete teletrabalho portarias" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'teletrabalho-portarias' AND can_edit());