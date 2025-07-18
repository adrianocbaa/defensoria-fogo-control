-- Add new columns to fire_extinguishers table
ALTER TABLE public.fire_extinguishers 
ADD COLUMN support_type TEXT CHECK (support_type IN ('wall', 'tripod')),
ADD COLUMN has_vertical_signage BOOLEAN DEFAULT false;