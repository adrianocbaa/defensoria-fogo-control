-- Create obras table for public works management
CREATE TABLE public.obras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  municipio TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planejamento', 'em_andamento', 'concluida', 'paralisada')),
  tipo TEXT NOT NULL,
  valor_total DECIMAL(15,2) NOT NULL,
  valor_executado DECIMAL(15,2) DEFAULT 0,
  porcentagem_execucao INTEGER DEFAULT 0 CHECK (porcentagem_execucao >= 0 AND porcentagem_execucao <= 100),
  data_inicio DATE,
  previsao_termino DATE,
  empresa_responsavel TEXT,
  secretaria_responsavel TEXT,
  coordinates_lat DECIMAL(10,8),
  coordinates_lng DECIMAL(11,8),
  fotos JSONB DEFAULT '[]'::jsonb,
  documentos JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;

-- Create policies for obras access
CREATE POLICY "Public can view obras" 
ON public.obras 
FOR SELECT 
USING (true);

CREATE POLICY "Users with edit permission can insert obras" 
ON public.obras 
FOR INSERT 
WITH CHECK (can_edit());

CREATE POLICY "Users with edit permission can update obras" 
ON public.obras 
FOR UPDATE 
USING (can_edit());

CREATE POLICY "Users with edit permission can delete obras" 
ON public.obras 
FOR DELETE 
USING (can_edit());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_obras_updated_at
BEFORE UPDATE ON public.obras
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create audit trigger for change tracking
CREATE TRIGGER audit_obras_changes
AFTER INSERT OR UPDATE OR DELETE ON public.obras
FOR EACH ROW
EXECUTE FUNCTION public.log_changes();