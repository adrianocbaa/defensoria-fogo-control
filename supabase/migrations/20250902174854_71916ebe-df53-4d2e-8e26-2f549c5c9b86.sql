-- Fix security issue: Remove unrestricted public access to properties table
-- The 'properties_viewable' policy allows anyone to access sensitive property data
-- including addresses, coordinates, and valuations which should be protected

-- Drop the problematic policy that allows unrestricted SELECT access
DROP POLICY IF EXISTS "properties_viewable" ON public.properties;

-- The existing "Authenticated users can view properties" policy and 
-- "properties_manageable" policy already provide appropriate access control:
-- - Authenticated users can view properties (requires authentication)
-- - Users with edit permissions have full access via can_edit() function

-- This ensures property data including addresses, coordinates, and valuations
-- is only accessible to authenticated users with proper authorization