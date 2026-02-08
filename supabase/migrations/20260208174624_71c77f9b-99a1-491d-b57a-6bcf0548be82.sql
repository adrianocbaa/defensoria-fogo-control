-- Adicionar campo para data real de término da obra
ALTER TABLE public.obras 
ADD COLUMN IF NOT EXISTS data_termino_real DATE NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.obras.data_termino_real IS 'Data real de término/conclusão da obra, preenchida pelo fiscal ao concluir a obra';