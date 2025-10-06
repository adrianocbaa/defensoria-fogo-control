-- Step 1: Create user_roles table with proper security (using existing user_role enum)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 2: Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Step 3: Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, created_by)
SELECT user_id, role, user_id
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 4: Update existing security definer functions to use new role system
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(user_uuid, 'admin'::user_role);
$$;

CREATE OR REPLACE FUNCTION public.can_edit(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(user_uuid, 'admin'::user_role) 
      OR public.has_role(user_uuid, 'editor'::user_role)
      OR public.has_role(user_uuid, 'gm'::user_role);
$$;

-- Step 5: Add RLS policies to user_roles table
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::user_role));

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::user_role));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::user_role));

-- Step 6: Fix nuclei RLS policy - remove the dangerous OR true
DROP POLICY IF EXISTS "Users can view nucleus data with contact restrictions" ON public.nuclei;

CREATE POLICY "Users with edit permission can view nuclei"
ON public.nuclei
FOR SELECT
TO authenticated
USING (can_edit());

-- Step 7: Recreate profiles_secure view with proper security
DROP VIEW IF EXISTS public.profiles_secure CASCADE;
CREATE VIEW public.profiles_secure 
WITH (security_invoker = true) AS
SELECT 
  id, user_id, display_name, avatar_url, phone, 
  position, department, language, theme, email,
  created_at, updated_at
FROM public.profiles
WHERE auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::user_role);

-- Step 8: Recreate nuclei_secure view with proper security
DROP VIEW IF EXISTS public.nuclei_secure CASCADE;
CREATE VIEW public.nuclei_secure 
WITH (security_invoker = true) AS
SELECT 
  id, name, address, city, coordinates_lat, coordinates_lng,
  created_at, updated_at, user_id, is_agent_mode,
  CASE 
    WHEN can_view_sensitive_data() THEN contact_phone
    ELSE NULL
  END as contact_phone,
  CASE 
    WHEN can_view_sensitive_data() THEN contact_email
    ELSE NULL
  END as contact_email,
  CASE 
    WHEN can_view_sensitive_data() THEN telefone
    ELSE NULL
  END as telefone,
  CASE 
    WHEN can_view_sensitive_data() THEN email
    ELSE NULL
  END as email,
  fire_department_license_valid_until,
  fire_department_license_document_url,
  horario_atendimento, membro_coordenador, coordenador_substituto,
  auxiliar_coordenador, uf
FROM public.nuclei
WHERE can_edit();

-- Step 9: Remove the old triggers and function that checks role modifications
DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation ON public.profiles;
DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
DROP TRIGGER IF EXISTS prevent_profile_priv_escalation ON public.profiles;
DROP FUNCTION IF EXISTS public.prevent_profile_privilege_escalation() CASCADE;

-- Step 10: Update audit logging to track role changes
DROP TRIGGER IF EXISTS audit_user_roles_changes ON public.user_roles;
CREATE TRIGGER audit_user_roles_changes
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_changes();

-- Step 11: Update get_user_role function to use new table
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.user_roles 
  WHERE user_id = user_uuid 
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'gm' THEN 2
      WHEN 'editor' THEN 3
      WHEN 'manutencao' THEN 4
      WHEN 'viewer' THEN 5
    END
  LIMIT 1;
$$;