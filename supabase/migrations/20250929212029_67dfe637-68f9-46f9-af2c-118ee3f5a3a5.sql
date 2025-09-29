-- SECURITY FIX: Remove overly permissive RLS policies on password_resets table
-- The password_resets table should ONLY be accessible by edge functions using service role
-- This prevents attackers from reading reset codes and hijacking accounts

-- Drop existing permissive policies
DROP POLICY IF EXISTS "System can select reset records" ON public.password_resets;
DROP POLICY IF EXISTS "System can update reset records" ON public.password_resets;
DROP POLICY IF EXISTS "Users can insert their own reset requests" ON public.password_resets;

-- Create restrictive policies that block ALL client access
-- Edge functions using service role will bypass RLS and can still access the table

CREATE POLICY "Block all client SELECT access to password_resets"
ON public.password_resets
FOR SELECT
USING (false);

CREATE POLICY "Block all client INSERT access to password_resets"
ON public.password_resets
FOR INSERT
WITH CHECK (false);

CREATE POLICY "Block all client UPDATE access to password_resets"
ON public.password_resets
FOR UPDATE
USING (false);

CREATE POLICY "Block all client DELETE access to password_resets"
ON public.password_resets
FOR DELETE
USING (false);

-- Add comment explaining the security model
COMMENT ON TABLE public.password_resets IS 
'Password reset codes table. Access is BLOCKED for all client requests. Only edge functions using service role can access this table to prevent reset code theft.';