-- SECURITY FIX: Restrict access to nuclei contact information
-- Only users with can_view_sensitive_data() permission should see contact details

-- Create a secure view that conditionally masks contact information
CREATE OR REPLACE VIEW public.nuclei_secure 
WITH (security_invoker = true) AS
SELECT
  id,
  name,
  city,
  address,
  -- Mask contact information for unauthorized users
  CASE 
    WHEN can_view_sensitive_data() THEN contact_phone 
    ELSE NULL 
  END as contact_phone,
  CASE 
    WHEN can_view_sensitive_data() THEN contact_email 
    ELSE NULL 
  END as contact_email,
  fire_department_license_document_url,
  fire_department_license_valid_until,
  coordinates_lat,
  coordinates_lng,
  is_agent_mode,
  user_id,
  created_at,
  updated_at
FROM public.nuclei
WHERE can_edit();

-- Add explanatory comment
COMMENT ON VIEW public.nuclei_secure IS 
'Secure view of nuclei table with contact information masked for unauthorized users. Contact fields (phone/email) are only visible to users with can_view_sensitive_data() permission (admin and GM roles). All other users see NULL for these fields.';

-- Grant SELECT permission on the view to authenticated users
GRANT SELECT ON public.nuclei_secure TO authenticated;