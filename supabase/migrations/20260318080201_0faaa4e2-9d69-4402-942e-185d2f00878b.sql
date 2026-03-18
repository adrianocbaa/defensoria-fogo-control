
-- Adicionar campos de gravidade, prazo de correção e responsável aos serviços do checklist
ALTER TABLE public.checklist_servicos
  ADD COLUMN IF NOT EXISTS gravidade TEXT DEFAULT 'medio' CHECK (gravidade IN ('critico', 'medio', 'estetico')),
  ADD COLUMN IF NOT EXISTS prazo_correcao INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS responsavel_correcao TEXT DEFAULT NULL;
