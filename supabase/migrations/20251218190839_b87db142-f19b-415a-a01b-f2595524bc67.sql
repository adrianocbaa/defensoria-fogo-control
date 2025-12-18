-- Adicionar campo para controlar se RDO é obrigatório para a obra
ALTER TABLE public.obras 
ADD COLUMN rdo_habilitado boolean NOT NULL DEFAULT true;

-- Comentário explicativo
COMMENT ON COLUMN public.obras.rdo_habilitado IS 'Indica se a obra exige preenchimento de RDO. Se false, não contabiliza dias de atraso.';