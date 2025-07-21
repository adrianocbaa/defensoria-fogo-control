-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('admin', 'editor', 'viewer');

-- Update existing role column to use the new enum type
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE public.user_role 
USING (CASE 
  WHEN role = 'admin' THEN 'admin'::public.user_role
  WHEN role = 'user' THEN 'viewer'::public.user_role
  ELSE 'viewer'::public.user_role
END);

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE user_id = user_uuid;
$$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = user_uuid AND role = 'admin'
  );
$$;

-- Create function to check if user can edit
CREATE OR REPLACE FUNCTION public.can_edit(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = user_uuid AND role IN ('admin', 'editor')
  );
$$;

-- Update RLS policies for nuclei to include role-based permissions
DROP POLICY IF EXISTS "All authenticated users can insert nuclei" ON public.nuclei;
DROP POLICY IF EXISTS "All authenticated users can update nuclei" ON public.nuclei;
DROP POLICY IF EXISTS "All authenticated users can delete nuclei" ON public.nuclei;

CREATE POLICY "Users with edit permission can insert nuclei" ON public.nuclei
FOR INSERT TO authenticated
WITH CHECK (public.can_edit());

CREATE POLICY "Users with edit permission can update nuclei" ON public.nuclei
FOR UPDATE TO authenticated
USING (public.can_edit());

CREATE POLICY "Users with edit permission can delete nuclei" ON public.nuclei
FOR DELETE TO authenticated
USING (public.can_edit());

-- Update RLS policies for fire_extinguishers
DROP POLICY IF EXISTS "All authenticated users can insert fire extinguishers" ON public.fire_extinguishers;
DROP POLICY IF EXISTS "All authenticated users can update fire extinguishers" ON public.fire_extinguishers;
DROP POLICY IF EXISTS "All authenticated users can delete fire extinguishers" ON public.fire_extinguishers;

CREATE POLICY "Users with edit permission can insert fire extinguishers" ON public.fire_extinguishers
FOR INSERT TO authenticated
WITH CHECK (public.can_edit());

CREATE POLICY "Users with edit permission can update fire extinguishers" ON public.fire_extinguishers
FOR UPDATE TO authenticated
USING (public.can_edit());

CREATE POLICY "Users with edit permission can delete fire extinguishers" ON public.fire_extinguishers
FOR DELETE TO authenticated
USING (public.can_edit());

-- Update RLS policies for hydrants
DROP POLICY IF EXISTS "All authenticated users can insert hydrants" ON public.hydrants;
DROP POLICY IF EXISTS "All authenticated users can update hydrants" ON public.hydrants;
DROP POLICY IF EXISTS "All authenticated users can delete hydrants" ON public.hydrants;

CREATE POLICY "Users with edit permission can insert hydrants" ON public.hydrants
FOR INSERT TO authenticated
WITH CHECK (public.can_edit());

CREATE POLICY "Users with edit permission can update hydrants" ON public.hydrants
FOR UPDATE TO authenticated
USING (public.can_edit());

CREATE POLICY "Users with edit permission can delete hydrants" ON public.hydrants
FOR DELETE TO authenticated
USING (public.can_edit());

-- Update RLS policies for documents
DROP POLICY IF EXISTS "All authenticated users can insert documents" ON public.documents;
DROP POLICY IF EXISTS "All authenticated users can update documents" ON public.documents;
DROP POLICY IF EXISTS "All authenticated users can delete documents" ON public.documents;

CREATE POLICY "Users with edit permission can insert documents" ON public.documents
FOR INSERT TO authenticated
WITH CHECK (public.can_edit());

CREATE POLICY "Users with edit permission can update documents" ON public.documents
FOR UPDATE TO authenticated
USING (public.can_edit());

CREATE POLICY "Users with edit permission can delete documents" ON public.documents
FOR DELETE TO authenticated
USING (public.can_edit());

-- Give the first user admin role (you can change this later)
UPDATE public.profiles SET role = 'admin' WHERE id = (SELECT id FROM public.profiles ORDER BY created_at ASC LIMIT 1);