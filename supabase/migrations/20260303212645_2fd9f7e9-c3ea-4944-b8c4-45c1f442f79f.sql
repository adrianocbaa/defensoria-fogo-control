
UPDATE public.profiles 
SET sectors = ARRAY['obra']::sector_type[]
WHERE user_id = 'de000099-de00-4000-8000-de0000000099';
