-- Fix critical security vulnerability in properties table
-- Remove the overly permissive "properties_viewable" policy that allows public access

-- Drop the problematic policy that allows unrestricted public access
DROP POLICY IF EXISTS "properties_viewable" ON public.properties;

-- The table already has proper authentication-based policies:
-- - "Authenticated users can view properties" with auth.role() = 'authenticated' 
-- - "properties_manageable" with can_edit() for management operations
-- These existing policies provide the correct security model

-- Verify the remaining policies are appropriate:
-- 1. Authenticated users can view/insert/update/delete (basic CRUD for authenticated users)
-- 2. properties_manageable allows users with edit permissions to manage properties
-- This ensures only authenticated users can access property data while maintaining functionality