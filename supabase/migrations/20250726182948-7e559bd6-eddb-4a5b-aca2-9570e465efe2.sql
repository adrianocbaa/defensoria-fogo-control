-- Modificar a constraint de foreign key para permitir CASCADE DELETE
-- Primeiro, remover a constraint existente
ALTER TABLE travels DROP CONSTRAINT IF EXISTS travels_ticket_id_fkey;

-- Adicionar nova constraint com CASCADE DELETE
ALTER TABLE travels 
ADD CONSTRAINT travels_ticket_id_fkey 
FOREIGN KEY (ticket_id) 
REFERENCES maintenance_tickets(id) 
ON DELETE CASCADE;