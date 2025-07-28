-- Add valor_aditivado field to obras table
ALTER TABLE public.obras 
ADD COLUMN valor_aditivado NUMERIC DEFAULT 0;