-- Dropar políticas existentes se houver
DROP POLICY IF EXISTS "samples_select_owner" ON appraisal.samples;
DROP POLICY IF EXISTS "samples_insert_owner" ON appraisal.samples;
DROP POLICY IF EXISTS "samples_update_owner" ON appraisal.samples;
DROP POLICY IF EXISTS "samples_delete_owner" ON appraisal.samples;

-- Dropar tabela se existe e recriar
DROP TABLE IF EXISTS appraisal.samples;

-- Criar tabela samples na schema appraisal
CREATE TABLE appraisal.samples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  name TEXT,
  comparable_ids TEXT[] DEFAULT '{}',
  criteria_json JSONB DEFAULT '{}',
  created_by UUID NOT NULL,
  org_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE appraisal.samples ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para samples
CREATE POLICY "samples_select_owner" ON appraisal.samples 
FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "samples_insert_owner" ON appraisal.samples 
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "samples_update_owner" ON appraisal.samples 
FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "samples_delete_owner" ON appraisal.samples 
FOR DELETE USING (auth.uid() = created_by);

-- Criar trigger para updated_at
CREATE TRIGGER update_samples_updated_at
BEFORE UPDATE ON appraisal.samples
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();