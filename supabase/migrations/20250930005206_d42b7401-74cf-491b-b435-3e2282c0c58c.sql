-- Add is_active field to profiles for soft delete
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Update RLS policies to consider is_active status
-- Users can only view active profiles (except admins see all)
DROP POLICY IF EXISTS "Users can view their own profile and admins can view all" ON public.profiles;
CREATE POLICY "Users can view their own profile and admins can view all"
ON public.profiles
FOR SELECT
USING (
  (auth.uid() = user_id AND is_active = true) OR 
  is_admin(auth.uid())
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

COMMENT ON COLUMN public.profiles.is_active IS 'Soft delete flag. False = deactivated user (cannot login but data is preserved)';