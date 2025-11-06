-- Add parent_id column to support subtasks in obra_checklist_items
ALTER TABLE obra_checklist_items
ADD COLUMN parent_id uuid REFERENCES obra_checklist_items(id) ON DELETE CASCADE;

-- Add index for better performance on parent_id queries
CREATE INDEX idx_obra_checklist_items_parent_id ON obra_checklist_items(parent_id);

-- Add a column to track if item has subtasks
ALTER TABLE obra_checklist_items
ADD COLUMN has_subtasks boolean DEFAULT false;

-- Update existing items: find and merge placa tasks into "Comunicação Visual"
-- First, let's update the placa de porta items to be "Comunicação Visual" parent
UPDATE obra_checklist_items
SET descricao_atividade = 'Comunicação Visual',
    has_subtasks = true
WHERE LOWER(descricao_atividade) LIKE '%placa%porta%' OR LOWER(descricao_atividade) LIKE '%placas%porta%';

-- Delete the fachada placa items as we'll recreate them as subtasks
DELETE FROM obra_checklist_items
WHERE LOWER(descricao_atividade) LIKE '%placa%fachada%';