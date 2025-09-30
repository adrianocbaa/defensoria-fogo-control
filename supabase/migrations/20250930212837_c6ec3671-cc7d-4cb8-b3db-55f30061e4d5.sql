-- Update default sector for new users from 'preventivos' to 'nucleos'
ALTER TABLE public.profiles 
ALTER COLUMN sectors SET DEFAULT ARRAY['nucleos'::sector_type];

-- Ensure role default remains 'viewer' (this is already the default, but making it explicit)
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'viewer'::user_role;