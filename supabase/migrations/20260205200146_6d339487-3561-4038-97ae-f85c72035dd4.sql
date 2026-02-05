-- Adicionar coluna valor_unitario na tabela aditivo_items para armazenar o valor específico do aditivo
-- Isso permite que aditivos tenham valores unitários diferentes do orçamento base

ALTER TABLE public.aditivo_items 
ADD COLUMN IF NOT EXISTS valor_unitario numeric DEFAULT 0;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.aditivo_items.valor_unitario IS 'Valor unitário específico do aditivo (pode diferir do orçamento base)';