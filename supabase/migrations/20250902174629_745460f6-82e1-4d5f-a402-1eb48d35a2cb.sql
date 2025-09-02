-- Fix security issue: Restrict access to sensitive contact information in nuclei table
-- Replace the overly permissive "All authenticated users can view nuclei" policy 
-- with a more restrictive policy that requires edit permissions

-- Drop the existing public policy that allows all authenticated users to view nuclei
DROP POLICY IF EXISTS "All authenticated users can view nuclei" ON public.nuclei;

-- Create a new policy that requires edit permissions to view nuclei (including sensitive contact info)
CREATE POLICY "Users with edit permission can view nuclei"
ON public.nuclei
FOR SELECT
USING (can_edit());

-- This ensures that only users with proper authorization (admin, editor, gm roles) 
-- can access sensitive contact information like phone numbers and email addresses