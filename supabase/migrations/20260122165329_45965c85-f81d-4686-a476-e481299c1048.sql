-- Criar tabela para registrar ações de alto nível nas obras
CREATE TABLE public.obra_action_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para consultas eficientes
CREATE INDEX idx_obra_action_logs_obra_id ON public.obra_action_logs(obra_id);
CREATE INDEX idx_obra_action_logs_created_at ON public.obra_action_logs(created_at DESC);
CREATE INDEX idx_obra_action_logs_action_type ON public.obra_action_logs(action_type);

-- Habilitar RLS
ALTER TABLE public.obra_action_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários autenticados podem visualizar logs de obras que têm acesso"
ON public.obra_action_logs
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    public.is_admin(auth.uid())
    OR public.can_edit_obra(obra_id, auth.uid())
    OR public.is_fiscal_of_obra(obra_id, auth.uid())
  )
);

CREATE POLICY "Usuários autenticados podem inserir logs"
ON public.obra_action_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Comentários
COMMENT ON TABLE public.obra_action_logs IS 'Registro de ações de alto nível realizadas nas obras';
COMMENT ON COLUMN public.obra_action_logs.action_type IS 'Tipo da ação: medicao_salva, medicao_reaberta, aditivo_criado, cronograma_atualizado, planilha_importada, relatorio_exportado';
COMMENT ON COLUMN public.obra_action_logs.metadata IS 'Dados adicionais como número da medição, quantidade de itens, etc.';