
-- Adiciona coluna foto_correcao_pin em checklist_servicos
ALTER TABLE public.checklist_servicos
  ADD COLUMN IF NOT EXISTS foto_correcao_pin JSONB NULL;

-- Adiciona coluna foto_correcao_pin em checklist_ocorrencias
ALTER TABLE public.checklist_ocorrencias
  ADD COLUMN IF NOT EXISTS foto_correcao_pin JSONB NULL;
