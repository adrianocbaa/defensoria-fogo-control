
-- Atualizar o role do Edvan para admin
UPDATE user_roles 
SET role = 'admin'::user_role
WHERE user_id = '4d6e5567-8675-446c-8ba0-9389e534bb14';

-- Atualizar o role do Adriano Empresa para admin
UPDATE user_roles 
SET role = 'admin'::user_role
WHERE user_id = 'b940350f-dcf8-452d-9af2-5a5d9443d978';

-- Atualizar também na tabela profiles para manter consistência
UPDATE profiles 
SET role = 'admin'
WHERE user_id IN (
  '4d6e5567-8675-446c-8ba0-9389e534bb14',
  'b940350f-dcf8-452d-9af2-5a5d9443d978'
);
