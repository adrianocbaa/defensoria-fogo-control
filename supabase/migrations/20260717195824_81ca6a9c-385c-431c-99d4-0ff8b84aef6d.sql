ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS nucleo_nome text,
  ADD COLUMN IF NOT EXISTS sistemas_servicos_ids uuid[] NOT NULL DEFAULT '{}';