-- Tabela para rastrear quais notificações o usuário já leu
CREATE TABLE public.user_read_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  notification_id TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_id)
);

-- Habilitar RLS
ALTER TABLE public.user_read_notifications ENABLE ROW LEVEL SECURITY;

-- Política: usuários só podem ver suas próprias notificações lidas
CREATE POLICY "Users can view their own read notifications"
ON public.user_read_notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Política: usuários podem marcar suas próprias notificações como lidas
CREATE POLICY "Users can insert their own read notifications"
ON public.user_read_notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Política: usuários podem deletar suas próprias notificações lidas
CREATE POLICY "Users can delete their own read notifications"
ON public.user_read_notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX idx_user_read_notifications_user_id ON public.user_read_notifications(user_id);
CREATE INDEX idx_user_read_notifications_notification_id ON public.user_read_notifications(notification_id);

-- Limpar notificações antigas (mais de 7 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_read_notifications()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  DELETE FROM public.user_read_notifications 
  WHERE read_at < now() - interval '7 days';
$$;