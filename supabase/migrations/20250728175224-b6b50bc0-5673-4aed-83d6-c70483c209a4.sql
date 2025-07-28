-- Add contract number field to obras table
ALTER TABLE public.obras 
ADD COLUMN n_contrato TEXT;

-- Add unique constraint for contract number
ALTER TABLE public.obras 
ADD CONSTRAINT obras_n_contrato_unique UNIQUE (n_contrato);