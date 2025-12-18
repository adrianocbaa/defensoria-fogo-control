-- Adicionar coluna fiscal_id na tabela obras para vincular o fiscal do contrato
ALTER TABLE public.obras 
ADD COLUMN fiscal_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Criar índice para melhorar performance de busca
CREATE INDEX idx_obras_fiscal_id ON public.obras(fiscal_id);

-- Criar tabela para registrar notificações enviadas (evitar duplicação)
CREATE TABLE public.rdo_notificacoes_enviadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  data_referencia date NOT NULL,
  enviado_em timestamptz NOT NULL DEFAULT now(),
  destinatarios text[] NOT NULL,
  UNIQUE(obra_id, data_referencia)
);

-- Habilitar RLS
ALTER TABLE public.rdo_notificacoes_enviadas ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Admins podem ver notificações" 
ON public.rdo_notificacoes_enviadas 
FOR SELECT 
TO authenticated 
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'gm'::user_role));

CREATE POLICY "Sistema pode inserir notificações" 
ON public.rdo_notificacoes_enviadas 
FOR INSERT 
TO authenticated 
WITH CHECK (true);