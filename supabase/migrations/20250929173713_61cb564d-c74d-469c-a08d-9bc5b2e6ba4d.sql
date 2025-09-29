-- Drop the security definer view that bypasses RLS policies
DROP VIEW IF EXISTS public.nuclei_basic_info;

-- The application should use the get_safe_nuclei_data() function instead,
-- or query the nuclei table directly (with RLS policies properly filtering sensitive data)