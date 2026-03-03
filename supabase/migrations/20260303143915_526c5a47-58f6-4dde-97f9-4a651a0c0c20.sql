
-- Migração 1: Apenas adicionar o enum e a coluna (sem usar o novo enum ainda)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'demo';

ALTER TABLE public.obras 
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_obras_is_demo ON public.obras(is_demo);
