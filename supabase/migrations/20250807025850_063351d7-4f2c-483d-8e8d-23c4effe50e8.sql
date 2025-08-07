-- Criar tabela para medições
CREATE TABLE public.medicoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL,
  servico_codigo TEXT NOT NULL,
  servico_descricao TEXT NOT NULL,
  unidade TEXT NOT NULL,
  quantidade_projeto NUMERIC NOT NULL DEFAULT 0,
  preco_unitario NUMERIC NOT NULL DEFAULT 0,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  quantidade_executada NUMERIC NOT NULL DEFAULT 0,
  valor_executado NUMERIC NOT NULL DEFAULT 0,
  mes_execucao INTEGER NOT NULL,
  ano_execucao INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID,
  FOREIGN KEY (obra_id) REFERENCES public.obras(id) ON DELETE CASCADE
);

-- Criar tabela para aditivos
CREATE TABLE public.aditivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL,
  servico_codigo TEXT NOT NULL,
  servico_descricao TEXT NOT NULL,
  unidade TEXT NOT NULL,
  quantidade NUMERIC NOT NULL DEFAULT 0,
  preco_unitario NUMERIC NOT NULL DEFAULT 0,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL DEFAULT 'aditivo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID,
  FOREIGN KEY (obra_id) REFERENCES public.obras(id) ON DELETE CASCADE
);

-- Habilitar RLS
ALTER TABLE public.medicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aditivos ENABLE ROW LEVEL SECURITY;

-- Políticas para medições
CREATE POLICY "Public can view medicoes" 
ON public.medicoes 
FOR SELECT 
USING (true);

CREATE POLICY "Users with edit permission can insert medicoes" 
ON public.medicoes 
FOR INSERT 
WITH CHECK (can_edit());

CREATE POLICY "Users with edit permission can update medicoes" 
ON public.medicoes 
FOR UPDATE 
USING (can_edit());

CREATE POLICY "Users with edit permission can delete medicoes" 
ON public.medicoes 
FOR DELETE 
USING (can_edit());

-- Políticas para aditivos
CREATE POLICY "Public can view aditivos" 
ON public.aditivos 
FOR SELECT 
USING (true);

CREATE POLICY "Users with edit permission can insert aditivos" 
ON public.aditivos 
FOR INSERT 
WITH CHECK (can_edit());

CREATE POLICY "Users with edit permission can update aditivos" 
ON public.aditivos 
FOR UPDATE 
USING (can_edit());

CREATE POLICY "Users with edit permission can delete aditivos" 
ON public.aditivos 
FOR DELETE 
USING (can_edit());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_medicoes_updated_at
  BEFORE UPDATE ON public.medicoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_aditivos_updated_at
  BEFORE UPDATE ON public.aditivos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para melhor performance
CREATE INDEX idx_medicoes_obra_id ON public.medicoes(obra_id);
CREATE INDEX idx_medicoes_mes_ano ON public.medicoes(mes_execucao, ano_execucao);
CREATE INDEX idx_aditivos_obra_id ON public.aditivos(obra_id);