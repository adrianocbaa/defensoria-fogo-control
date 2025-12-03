-- Tabela para rastrear períodos de RDO já importados nas medições
CREATE TABLE public.medicao_rdo_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL,
  medicao_id UUID NOT NULL REFERENCES public.medicao_sessions(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id)
);

-- Índice para busca por obra
CREATE INDEX idx_medicao_rdo_imports_obra ON public.medicao_rdo_imports(obra_id);

-- RLS
ALTER TABLE public.medicao_rdo_imports ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can view medicao_rdo_imports" 
ON public.medicao_rdo_imports 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert medicao_rdo_imports" 
ON public.medicao_rdo_imports 
FOR INSERT 
WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY "Users can delete medicao_rdo_imports" 
ON public.medicao_rdo_imports 
FOR DELETE 
USING (public.can_edit(auth.uid()));