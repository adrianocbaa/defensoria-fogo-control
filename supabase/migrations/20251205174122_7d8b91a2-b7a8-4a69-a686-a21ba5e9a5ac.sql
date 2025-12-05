-- Create empresas (companies) table
CREATE TABLE public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj text UNIQUE NOT NULL,
  razao_social text NOT NULL,
  nome_fantasia text,
  email text,
  telefone text,
  endereco text,
  cidade text,
  uf text,
  cep text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Add empresa_id to profiles table FIRST (before RLS policy that references it)
ALTER TABLE public.profiles ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);

-- Add empresa_id to obras table
ALTER TABLE public.obras ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);

-- Enable RLS
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- RLS policies for empresas
CREATE POLICY "Users with edit permission can view empresas"
ON public.empresas FOR SELECT
USING (public.can_edit());

CREATE POLICY "Users with edit permission can insert empresas"
ON public.empresas FOR INSERT
WITH CHECK (public.can_edit());

CREATE POLICY "Users with edit permission can update empresas"
ON public.empresas FOR UPDATE
USING (public.can_edit());

CREATE POLICY "Admins can delete empresas"
ON public.empresas FOR DELETE
USING (public.is_admin());

-- Contratada users can view their own empresa
CREATE POLICY "Contratada users can view their empresa"
ON public.empresas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.empresa_id = empresas.id
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_empresas_updated_at
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_profiles_empresa_id ON public.profiles(empresa_id);
CREATE INDEX idx_obras_empresa_id ON public.obras(empresa_id);