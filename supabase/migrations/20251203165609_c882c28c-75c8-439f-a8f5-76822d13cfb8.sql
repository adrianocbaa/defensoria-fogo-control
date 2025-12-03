-- Tabela para armazenar dias sem expediente (finais de semana)
CREATE TABLE public.rdo_dias_sem_expediente (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
    data date NOT NULL,
    marcado_por uuid REFERENCES auth.users(id),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(obra_id, data)
);

-- Habilitar RLS
ALTER TABLE public.rdo_dias_sem_expediente ENABLE ROW LEVEL SECURITY;

-- Políticas RLS

-- Todos com permissão podem visualizar
CREATE POLICY "Users with edit permission can view dias_sem_expediente"
ON public.rdo_dias_sem_expediente
FOR SELECT
USING (can_edit() OR (has_role(auth.uid(), 'contratada') AND user_has_obra_access(auth.uid(), obra_id)));

-- Contratada pode inserir para obras que tem acesso
CREATE POLICY "Contratada can insert dias_sem_expediente"
ON public.rdo_dias_sem_expediente
FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'contratada') 
    AND user_has_obra_access(auth.uid(), obra_id)
    AND EXTRACT(DOW FROM data) IN (0, 6) -- Apenas sábado (6) e domingo (0)
);

-- Contratada pode deletar seus próprios registros
CREATE POLICY "Contratada can delete own dias_sem_expediente"
ON public.rdo_dias_sem_expediente
FOR DELETE
USING (
    has_role(auth.uid(), 'contratada') 
    AND user_has_obra_access(auth.uid(), obra_id)
);

-- Fiscal/Admin também pode gerenciar
CREATE POLICY "Editors can manage dias_sem_expediente"
ON public.rdo_dias_sem_expediente
FOR ALL
USING (can_edit())
WITH CHECK (can_edit());

-- Índice para performance
CREATE INDEX idx_rdo_dias_sem_expediente_obra_data ON public.rdo_dias_sem_expediente(obra_id, data);