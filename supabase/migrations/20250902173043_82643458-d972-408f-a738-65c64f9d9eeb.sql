-- Fix security issue: Remove public access to sensitive government contract data
-- and implement proper access control for the 'obras' table

-- Drop the existing public read policy that exposes sensitive data
DROP POLICY IF EXISTS "Public can view obras" ON public.obras;

-- Create proper RLS policies with restricted access
-- Only authenticated users with edit permissions can view obras
CREATE POLICY "Authenticated users with edit permission can view obras" 
ON public.obras 
FOR SELECT 
USING (can_edit());

-- Keep existing policies for data modification (they already use proper access control)
-- The following policies already exist and are secure:
-- - "Users with edit permission can delete obras" 
-- - "Users with edit permission can insert obras" 
-- - "Users with edit permission can update obras"