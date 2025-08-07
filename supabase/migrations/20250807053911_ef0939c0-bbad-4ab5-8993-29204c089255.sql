-- Criar tabela para armazenar itens da planilha orçamentária
CREATE TABLE public.orcamento_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL,
  item TEXT NOT NULL,
  codigo TEXT NOT NULL,
  banco TEXT NOT NULL,
  descricao TEXT NOT NULL,
  unidade TEXT NOT NULL,
  quantidade NUMERIC NOT NULL DEFAULT 0,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  total_contrato NUMERIC NOT NULL DEFAULT 0,
  nivel INTEGER NOT NULL DEFAULT 1,
  eh_administracao_local BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.orcamento_items ENABLE ROW LEVEL SECURITY;

-- Create policies for orcamento_items
CREATE POLICY "Public can view orcamento items" 
ON public.orcamento_items 
FOR SELECT 
USING (true);

CREATE POLICY "Users with edit permission can insert orcamento items" 
ON public.orcamento_items 
FOR INSERT 
WITH CHECK (can_edit());

CREATE POLICY "Users with edit permission can update orcamento items" 
ON public.orcamento_items 
FOR UPDATE 
USING (can_edit());

CREATE POLICY "Users with edit permission can delete orcamento items" 
ON public.orcamento_items 
FOR DELETE 
USING (can_edit());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_orcamento_items_updated_at
BEFORE UPDATE ON public.orcamento_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();