ALTER TABLE checklist_ambientes ADD COLUMN IF NOT EXISTS shape_type text NOT NULL DEFAULT 'rect';
ALTER TABLE checklist_ambientes ADD COLUMN IF NOT EXISTS shape_data jsonb;
ALTER TABLE checklist_servicos ADD COLUMN IF NOT EXISTS location_pin jsonb;