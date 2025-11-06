-- Adicionar coluna tempo_obra na tabela obras
ALTER TABLE public.obras 
ADD COLUMN tempo_obra integer;

COMMENT ON COLUMN public.obras.tempo_obra IS 'Tempo de obra em dias, usado para calcular a previsão de término';