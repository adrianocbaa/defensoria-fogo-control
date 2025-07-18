-- Add is_agent_mode column to nuclei table
ALTER TABLE public.nuclei 
ADD COLUMN is_agent_mode BOOLEAN NOT NULL DEFAULT FALSE;