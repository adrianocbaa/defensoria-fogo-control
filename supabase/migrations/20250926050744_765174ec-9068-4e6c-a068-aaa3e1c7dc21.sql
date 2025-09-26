-- Fix critical security vulnerability in profiles table
-- Replace the overly permissive "true" policy with proper authentication check

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

-- Create a new policy that only allows authenticated users to view profiles
CREATE POLICY "Profiles are viewable by authenticated users only" 
ON public.profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Verify other policies are secure
-- Keep the existing policies for users updating their own profiles and admins updating any profile
-- These are already properly secured