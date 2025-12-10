-- Adicionar coluna aditivo_prazo na tabela obras (dias adicionais do aditivo de prazo)
ALTER TABLE public.obras 
ADD COLUMN IF NOT EXISTS aditivo_prazo integer DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.obras.aditivo_prazo IS 'Dias adicionais do aditivo de prazo';