-- SECURITY FIX: Add comprehensive RLS policies to nuclei table
-- The nuclei_secure view provides contact masking, but we need base policies too

-- Clean up from previous failed attempts
DROP FUNCTION IF EXISTS public.get_filtered_nuclei_row();

-- Ensure RLS is enabled
ALTER TABLE public.nuclei ENABLE ROW LEVEL SECURITY;

-- Add INSERT policy if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'nuclei' 
    AND policyname = 'Users with edit permission can insert nuclei'
  ) THEN
    CREATE POLICY "Users with edit permission can insert nuclei"
    ON public.nuclei
    FOR INSERT
    WITH CHECK (can_edit());
  END IF;
END $$;

-- Add DELETE policy if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'nuclei' 
    AND policyname = 'Users with edit permission can delete nuclei'
  ) THEN
    CREATE POLICY "Users with edit permission can delete nuclei"
    ON public.nuclei
    FOR DELETE
    USING (can_edit());
  END IF;
END $$;

-- Add UPDATE policy if it doesn't exist  
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'nuclei' 
    AND policyname = 'Users with edit permission can update nuclei'
  ) THEN
    CREATE POLICY "Users with edit permission can update nuclei"
    ON public.nuclei
    FOR UPDATE
    USING (can_edit());
  END IF;
END $$;

-- Update table and view comments with security guidance
COMMENT ON TABLE public.nuclei IS
'Nucleus locations with contact information.

SECURITY MODEL:
- RLS enabled with policies for can_edit() users
- READ ACCESS: Use nuclei_secure view to automatically mask contact info for unauthorized users
- WRITE ACCESS: All users with can_edit() can modify all fields
- Contact fields (phone/email) are only visible through nuclei_secure view to users with can_view_sensitive_data()

IMPORTANT: Application code should query nuclei_secure view, not this table directly.';

COMMENT ON VIEW public.nuclei_secure IS
'SECURE access point for nucleus data. Automatically masks contact_phone and contact_email for users without can_view_sensitive_data() permission (admin/GM only). All application queries should use this view instead of the nuclei table directly to ensure contact information is properly protected.';