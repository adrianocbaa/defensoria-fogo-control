-- Adicionar campo prazo_dias na tabela aditivo_sessions
ALTER TABLE public.aditivo_sessions 
ADD COLUMN IF NOT EXISTS prazo_dias integer DEFAULT 0;

-- Comentário para documentação
COMMENT ON COLUMN public.aditivo_sessions.prazo_dias IS 'Dias de prazo adicionados por este aditivo';