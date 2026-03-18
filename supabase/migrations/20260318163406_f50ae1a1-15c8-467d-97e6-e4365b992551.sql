
-- Move prazo_correcao para nível do relatório (checklist_pdfs)
-- e remove prazo_correcao e responsavel_correcao por item

ALTER TABLE public.checklist_pdfs
  ADD COLUMN IF NOT EXISTS prazo_correcao INTEGER DEFAULT NULL;

ALTER TABLE public.checklist_servicos
  DROP COLUMN IF EXISTS prazo_correcao,
  DROP COLUMN IF EXISTS responsavel_correcao;
