-- Fix critical security vulnerability in appraisal.properties table
-- Remove the overly permissive "properties_viewable" policy that allows public access

-- Drop the problematic policy on the appraisal schema properties table
DROP POLICY IF EXISTS "properties_viewable" ON appraisal.properties;

-- Create a proper authentication-based policy for the appraisal.properties table
CREATE POLICY "Authenticated users can view appraisal properties" 
ON appraisal.properties 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- The appraisal.properties table should also have proper policies for other operations
-- Add authentication requirement for all operations on appraisal.properties
CREATE POLICY "Authenticated users can insert appraisal properties" 
ON appraisal.properties 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update appraisal properties" 
ON appraisal.properties 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete appraisal properties" 
ON appraisal.properties 
FOR DELETE 
USING (auth.role() = 'authenticated');