-- SECURITY FIX: Prevent direct access to nuclei table to protect contact information
-- Force all queries through nuclei_secure view which masks sensitive fields

-- Revoke direct SELECT access to nuclei table from authenticated users
REVOKE SELECT ON public.nuclei FROM authenticated;

-- Grant SELECT only on the secure view
GRANT SELECT ON public.nuclei_secure TO authenticated;

-- Keep INSERT, UPDATE, DELETE permissions on base table for authorized users
-- These are controlled by existing RLS policies

-- Add explicit documentation
COMMENT ON TABLE public.nuclei IS
'Nucleus locations with contact information.

⚠️ SECURITY CRITICAL:
- Direct SELECT access REVOKED for all users
- All queries MUST use nuclei_secure view
- Contact fields (phone/email) only visible to can_view_sensitive_data() users through the view
- INSERT/UPDATE/DELETE operations work directly on this table (controlled by RLS policies)

RLS POLICIES:
- INSERT: requires can_edit()
- UPDATE: requires can_edit()  
- DELETE: requires can_edit()
- SELECT: NOT PERMITTED (use nuclei_secure view instead)';

COMMENT ON VIEW public.nuclei_secure IS
'MANDATORY access point for reading nucleus data.

SECURITY FEATURES:
- Automatically masks contact_phone and contact_email for unauthorized users
- Only admin/GM roles (can_view_sensitive_data()) see full contact information
- Inherits RLS policies from nuclei table via security_invoker
- All authenticated users can query this view

USAGE:
- Use this view for ALL SELECT queries
- Never query nuclei table directly
- INSERT/UPDATE/DELETE should target nuclei table directly';