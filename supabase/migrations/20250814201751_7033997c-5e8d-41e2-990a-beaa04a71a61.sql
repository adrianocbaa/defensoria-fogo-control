-- Acrescentar metadados e habilitar RLS em samples
ALTER TABLE appraisal.samples ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE appraisal.samples ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE appraisal.samples ADD COLUMN IF NOT EXISTS org_id UUID;

-- Atualizar dados existentes com metadados dos projetos relacionados
UPDATE appraisal.samples s
SET created_by = COALESCE(created_by, (SELECT created_by FROM appraisal.projects p WHERE p.id = s.project_id)),
    org_id = COALESCE(org_id, (SELECT org_id FROM appraisal.projects p WHERE p.id = s.project_id));

-- Habilitar RLS na tabela samples
ALTER TABLE appraisal.samples ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para samples
CREATE POLICY IF NOT EXISTS "samples_select_owner" ON appraisal.samples 
FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY IF NOT EXISTS "samples_insert_owner" ON appraisal.samples 
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY IF NOT EXISTS "samples_update_owner" ON appraisal.samples 
FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY IF NOT EXISTS "samples_delete_owner" ON appraisal.samples 
FOR DELETE USING (auth.uid() = created_by);