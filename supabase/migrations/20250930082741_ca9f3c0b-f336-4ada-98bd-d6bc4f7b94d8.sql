-- Remove a foreign key antiga que aponta para a tabela 'nuclei'
ALTER TABLE public.nucleo_teletrabalho 
DROP CONSTRAINT IF EXISTS nucleo_teletrabalho_nucleo_id_fkey;

-- Adiciona a foreign key correta apontando para 'nucleos_central'
ALTER TABLE public.nucleo_teletrabalho 
ADD CONSTRAINT nucleo_teletrabalho_nucleo_id_fkey 
FOREIGN KEY (nucleo_id) 
REFERENCES public.nucleos_central(id) 
ON DELETE CASCADE;