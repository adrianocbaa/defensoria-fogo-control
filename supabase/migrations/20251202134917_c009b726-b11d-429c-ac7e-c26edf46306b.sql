-- Adicionar coluna para armazenar o percentual de desconto da obra
ALTER TABLE public.obras 
ADD COLUMN percentual_desconto numeric DEFAULT 0;