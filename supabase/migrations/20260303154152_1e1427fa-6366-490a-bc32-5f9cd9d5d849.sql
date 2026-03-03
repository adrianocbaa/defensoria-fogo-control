
UPDATE auth.users 
SET confirmation_token = ''
WHERE id = 'de000099-de00-4000-8000-de0000000099' 
  AND confirmation_token IS NULL;
