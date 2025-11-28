
-- Limpar possíveis registros órfãos antes de adicionar as constraints
-- Deletar períodos que não têm item correspondente
DELETE FROM cronograma_periodos
WHERE item_id NOT IN (SELECT id FROM cronograma_items);

-- Deletar items que não têm cronograma correspondente  
DELETE FROM cronograma_items
WHERE cronograma_id NOT IN (SELECT id FROM cronograma_financeiro);

-- Verificar e remover constraints existentes se houver
DO $$ 
BEGIN
    -- Remover constraint antiga de cronograma_items se existir
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'cronograma_items_cronograma_id_fkey' 
        AND table_name = 'cronograma_items'
    ) THEN
        ALTER TABLE cronograma_items 
        DROP CONSTRAINT cronograma_items_cronograma_id_fkey;
    END IF;
    
    -- Remover constraint antiga de cronograma_periodos se existir
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'cronograma_periodos_item_id_fkey' 
        AND table_name = 'cronograma_periodos'
    ) THEN
        ALTER TABLE cronograma_periodos 
        DROP CONSTRAINT cronograma_periodos_item_id_fkey;
    END IF;
END $$;

-- Adicionar foreign key com CASCADE DELETE em cronograma_items
ALTER TABLE cronograma_items
ADD CONSTRAINT cronograma_items_cronograma_id_fkey 
FOREIGN KEY (cronograma_id) 
REFERENCES cronograma_financeiro(id) 
ON DELETE CASCADE;

-- Adicionar foreign key com CASCADE DELETE em cronograma_periodos
ALTER TABLE cronograma_periodos
ADD CONSTRAINT cronograma_periodos_item_id_fkey 
FOREIGN KEY (item_id) 
REFERENCES cronograma_items(id) 
ON DELETE CASCADE;

-- Comentário explicativo
COMMENT ON CONSTRAINT cronograma_items_cronograma_id_fkey ON cronograma_items IS 
'Deleta automaticamente items quando o cronograma é deletado';

COMMENT ON CONSTRAINT cronograma_periodos_item_id_fkey ON cronograma_periodos IS 
'Deleta automaticamente períodos quando o item é deletado';
