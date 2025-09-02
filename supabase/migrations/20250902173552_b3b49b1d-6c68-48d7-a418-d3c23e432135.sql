-- CRITICAL SECURITY FIX: Remove public access to sensitive operational data
-- Fix multiple data exposure vulnerabilities in government systems

-- 1. Remove public access to nuclei data (fire safety infrastructure)
DROP POLICY IF EXISTS "Public can view nuclei" ON public.nuclei;

-- 2. Remove public access to fire safety equipment data
DROP POLICY IF EXISTS "Public can view fire extinguishers" ON public.fire_extinguishers;

-- 3. Remove public access to hydrant infrastructure data  
DROP POLICY IF EXISTS "Public can view hydrants" ON public.hydrants;

-- 4. Restrict maintenance tickets to authorized personnel only
DROP POLICY IF EXISTS "All authenticated users can view maintenance tickets" ON public.maintenance_tickets;
CREATE POLICY "Authorized users can view maintenance tickets" 
ON public.maintenance_tickets 
FOR SELECT 
USING (can_edit());

-- 5. Restrict travel data to authorized personnel only
DROP POLICY IF EXISTS "All authenticated users can view travels" ON public.travels;
CREATE POLICY "Authorized users can view travels" 
ON public.travels 
FOR SELECT 
USING (can_edit());

-- 6. Restrict stock movement data to authorized personnel only
DROP POLICY IF EXISTS "All authenticated users can view stock movements" ON public.stock_movements;
CREATE POLICY "Authorized users can view stock movements" 
ON public.stock_movements 
FOR SELECT 
USING (can_edit());

-- 7. Restrict document access to authorized personnel only
DROP POLICY IF EXISTS "All authenticated users can view documents" ON public.documents;
CREATE POLICY "Authorized users can view documents" 
ON public.documents 
FOR SELECT 
USING (can_edit());

-- 8. Restrict material inventory to authorized personnel only
DROP POLICY IF EXISTS "All authenticated users can view materials" ON public.materials;
CREATE POLICY "Authorized users can view materials" 
ON public.materials 
FOR SELECT 
USING (can_edit());

-- Keep existing nuclei, fire extinguishers, and hydrants policies for authenticated users
-- These are maintained for legitimate operational access by authorized staff