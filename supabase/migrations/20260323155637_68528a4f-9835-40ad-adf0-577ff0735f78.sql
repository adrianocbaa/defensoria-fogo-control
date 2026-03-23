ALTER TABLE checklist_servicos ADD COLUMN IF NOT EXISTS foto_reprovacao_pin jsonb NULL;
ALTER TABLE checklist_ocorrencias ADD COLUMN IF NOT EXISTS foto_reprovacao_pin jsonb NULL;