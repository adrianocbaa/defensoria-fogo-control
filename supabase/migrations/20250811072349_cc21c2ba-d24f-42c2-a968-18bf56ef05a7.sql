-- Add origem and aditivo_num to orcamento_items to track extracontratuais linked to a specific aditivo number
ALTER TABLE public.orcamento_items
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'contratual',
  ADD COLUMN IF NOT EXISTS aditivo_num integer;

-- Helpful index for queries by obra/aditivo
CREATE INDEX IF NOT EXISTS idx_orcamento_items_obra_origem_aditivo 
  ON public.orcamento_items (obra_id, origem, aditivo_num);
