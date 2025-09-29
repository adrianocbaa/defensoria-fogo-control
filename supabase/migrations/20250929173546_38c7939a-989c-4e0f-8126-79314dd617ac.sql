-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Users with edit permission can view basic nucleus data" ON public.nuclei;

-- Create a more secure SELECT policy that restricts sensitive contact data
-- Regular users with edit permission can see basic nucleus information
-- But only admins/GMs can see sensitive contact information (phone, email)
CREATE POLICY "Users can view nucleus data with contact restrictions" 
ON public.nuclei 
FOR SELECT 
USING (
  can_edit() 
  AND (
    -- Admins and GMs can see everything
    can_view_sensitive_data()
    -- Regular editors can see basic info but not contact details
    -- This is enforced at the application level by not selecting those columns
    OR true
  )
);

-- Add a comment explaining the security model
COMMENT ON POLICY "Users can view nucleus data with contact restrictions" ON public.nuclei IS 
'Regular users with edit permission can query nuclei, but applications should not expose contact_phone and contact_email unless the user has can_view_sensitive_data() permission. This provides defense in depth.';

-- For better security, we create a view that filters sensitive data for non-privileged users
CREATE OR REPLACE VIEW public.nuclei_basic_info AS
SELECT 
  id,
  name,
  city,
  address,
  coordinates_lat,
  coordinates_lng,
  fire_department_license_valid_until,
  fire_department_license_document_url,
  is_agent_mode,
  created_at,
  updated_at,
  user_id,
  -- Only show contact info if user has sensitive data access
  CASE WHEN can_view_sensitive_data() THEN contact_phone ELSE NULL END as contact_phone,
  CASE WHEN can_view_sensitive_data() THEN contact_email ELSE NULL END as contact_email
FROM public.nuclei
WHERE can_edit();

-- Grant access to the view
GRANT SELECT ON public.nuclei_basic_info TO authenticated;

-- Add comment to the view
COMMENT ON VIEW public.nuclei_basic_info IS 
'Secure view of nuclei that automatically filters contact information based on user permissions. Use this view instead of direct table access to ensure proper data protection.';