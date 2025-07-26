-- Create sector enum
CREATE TYPE public.sector_type AS ENUM ('manutencao', 'obra', 'preventivos', 'ar_condicionado', 'projetos');

-- Add sector field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN sectors sector_type[] DEFAULT ARRAY['preventivos'::sector_type];

-- Update existing profiles to have preventivos sector by default
UPDATE public.profiles 
SET sectors = ARRAY['preventivos'::sector_type] 
WHERE sectors IS NULL;