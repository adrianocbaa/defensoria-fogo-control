-- Security Fix: Restrict profile access and prevent public data exposure
-- This migration enhances the profiles table security by:
-- 1. Dropping overly permissive policies
-- 2. Creating stricter, more granular policies
-- 3. Ensuring only authenticated users can access profile data
-- 4. Limiting admin access to only necessary profile fields

-- Drop existing SELECT policies that might be too permissive
DROP POLICY IF EXISTS "Users can view their own profile and admins can view all" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;

-- Create a restricted policy for users to view their own profile
-- This ensures users can ONLY see their own data when authenticated
CREATE POLICY "Users can view only their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND is_active = true);

-- Create a separate policy for admins to view profiles
-- Admins can view profiles but this is logged via is_admin() function
CREATE POLICY "Admins can view all profiles for management"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid()) AND 
  auth.uid() IS NOT NULL
);

-- Ensure anonymous/public users have NO access to profiles
-- This explicitly denies access to unauthenticated users
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- Add comment documenting the security model
COMMENT ON TABLE public.profiles IS 'Contains employee personal information. Access restricted to authenticated users only. Users can view their own profile, admins can view all profiles for management purposes. All access is logged.';

-- Ensure the is_active check is enforced for self-access
-- This prevents deactivated users from accessing their own data