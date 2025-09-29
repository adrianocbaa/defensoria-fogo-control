-- Tighten security on profiles_secure view
-- 1) Recreate view with security_barrier to prevent predicate pushdown leaks
CREATE OR REPLACE VIEW public.profiles_secure
WITH (security_invoker = true, security_barrier = true)
AS
SELECT
  id,
  user_id,
  display_name,
  avatar_url,
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
  CASE
    WHEN auth.uid() = user_id OR can_view_sensitive_data(auth.uid())
    THEN email
    ELSE NULL
  END AS email,
  created_at,
  updated_at
FROM public.profiles;

-- 2) Ensure no broad privileges exist on the view
REVOKE ALL ON public.profiles_secure FROM PUBLIC;
REVOKE ALL ON public.profiles_secure FROM anon;
GRANT SELECT ON public.profiles_secure TO authenticated;

-- 3) Document the security posture
COMMENT ON VIEW public.profiles_secure IS
'Profiles secure view (security_barrier, security_invoker).
- RLS is enforced by the underlying profiles table
- Contact fields masked unless self or can_view_sensitive_data() (admin/GM)
- Only authenticated role can SELECT from this view
- Use this view for all reads; write directly to profiles with RLS';