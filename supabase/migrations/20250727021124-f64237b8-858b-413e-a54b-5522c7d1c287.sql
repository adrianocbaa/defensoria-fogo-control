-- Atualizar registros existentes de 'manutencao' para 'gm'
UPDATE public.profiles 
SET role = 'gm' 
WHERE role = 'manutencao';