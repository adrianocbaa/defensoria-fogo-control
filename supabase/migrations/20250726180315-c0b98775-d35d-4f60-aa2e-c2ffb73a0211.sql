-- Atualizar a constraint de status para incluir "Impedido"
ALTER TABLE maintenance_tickets 
DROP CONSTRAINT IF EXISTS maintenance_tickets_status_check;

-- Adicionar nova constraint com o status "Impedido"
ALTER TABLE maintenance_tickets 
ADD CONSTRAINT maintenance_tickets_status_check 
CHECK (status = ANY (ARRAY['Pendente'::text, 'Em andamento'::text, 'Impedido'::text, 'Concluído'::text]));