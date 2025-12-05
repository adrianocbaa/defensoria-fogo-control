-- Add regiao column to obras table
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS regiao text;