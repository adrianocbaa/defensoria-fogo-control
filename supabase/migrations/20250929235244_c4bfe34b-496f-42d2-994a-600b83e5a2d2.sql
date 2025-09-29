-- SECURITY FIX: Protect employee contact information in profiles table
-- Create secure view that masks sensitive contact data

-- Create profiles_secure view that masks email and phone for unauthorized access
CREATE OR REPLACE VIEW public.profiles_secure
WITH (security_invoker = true)
AS
SELECT
  id,
  user_id,
  display_name,
  avatar_url,
  -- Mask phone: show only to self or users with sensitive data access
  CASE
    WHEN auth.uid() = user_id OR can_view_sensitive_data(auth.uid())
    THEN phone
    ELSE NULL
  END AS phone,
  position,
  department,
  language,
  theme,
  role,
  sectors,
  -- Mask email: show only to self or users with sensitive data access
  CASE
    WHEN auth.uid() = user_id OR can_view_sensitive_data(auth.uid())
    THEN email
    ELSE NULL
  END AS email,
  created_at,
  updated_at
FROM public.profiles;

-- Revoke direct SELECT access to profiles table
REVOKE SELECT ON public.profiles FROM authenticated;

-- Grant SELECT only on the secure view
GRANT SELECT ON public.profiles_secure TO authenticated;

-- Add security documentation
COMMENT ON TABLE public.profiles IS
'User profiles with contact information.

⚠️ SECURITY CRITICAL:
- Direct SELECT access REVOKED for all users
- All queries MUST use profiles_secure view
- Contact fields (phone/email) only visible to:
  1. The user themselves
  2. Users with can_view_sensitive_data() permission (admin/GM roles)
- INSERT/UPDATE/DELETE operations work directly on this table (controlled by RLS policies)

RLS POLICIES:
- SELECT: NOT PERMITTED (use profiles_secure view instead)
- INSERT: users can insert their own profile
- UPDATE: users can update their own profile OR admins can update any
- DELETE: NOT PERMITTED';

COMMENT ON VIEW public.profiles_secure IS
'MANDATORY access point for reading user profile data.

SECURITY FEATURES:
- Automatically masks phone and email for unauthorized viewers
- Users always see their own full contact information
- Only admin/GM roles (can_view_sensitive_data()) see others'' contact information
- Other admins see profiles but with masked contact fields
- Inherits RLS policies from profiles table via security_invoker

USAGE:
- Use this view for ALL SELECT queries
- Never query profiles table directly
- INSERT/UPDATE/DELETE should target profiles table directly';