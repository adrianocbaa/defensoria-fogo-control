
UPDATE auth.users 
SET encrypted_password = crypt('demo1234', gen_salt('bf'))
WHERE id = 'de000099-de00-4000-8000-de0000000099';
