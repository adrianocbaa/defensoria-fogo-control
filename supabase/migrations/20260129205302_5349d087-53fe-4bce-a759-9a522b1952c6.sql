-- Adicionar coluna para armazenar o valor total sem desconto (valor original da planilha)
ALTER TABLE public.orcamento_items
ADD COLUMN IF NOT EXISTS valor_total_sem_desconto numeric DEFAULT 0;

-- Comentário explicativo
COMMENT ON COLUMN public.orcamento_items.valor_total_sem_desconto IS 'Valor total antes da aplicação do desconto (coluna I da planilha original)';