-- Add hydrostatic_test column to fire_extinguishers table
ALTER TABLE public.fire_extinguishers 
ADD COLUMN hydrostatic_test date;