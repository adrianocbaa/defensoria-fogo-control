-- Create functions to access appraisal schema from public schema
CREATE OR REPLACE FUNCTION public.get_projects()
RETURNS TABLE (
  id UUID,
  org_id UUID,
  property_id UUID,
  purpose TEXT,
  base_date DATE,
  approach TEXT,
  status TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = 'appraisal', 'public'
AS $$
  SELECT 
    p.id, p.org_id, p.property_id, p.purpose, p.base_date, 
    p.approach, p.status, p.created_by, p.created_at, p.updated_at
  FROM appraisal.projects p
  WHERE p.created_by = auth.uid()
  ORDER BY p.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_project_by_id(project_id UUID)
RETURNS TABLE (
  id UUID,
  org_id UUID,
  property_id UUID,
  purpose TEXT,
  base_date DATE,
  approach TEXT,
  status TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = 'appraisal', 'public'
AS $$
  SELECT 
    p.id, p.org_id, p.property_id, p.purpose, p.base_date, 
    p.approach, p.status, p.created_by, p.created_at, p.updated_at
  FROM appraisal.projects p
  WHERE p.id = project_id AND p.created_by = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.create_project(
  p_purpose TEXT,
  p_base_date DATE,
  p_approach TEXT,
  p_property_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = 'appraisal', 'public'
AS $$
  INSERT INTO appraisal.projects (purpose, base_date, approach, property_id, created_by)
  VALUES (p_purpose, p_base_date, p_approach, p_property_id, auth.uid())
  RETURNING id;
$$;

CREATE OR REPLACE FUNCTION public.update_project(
  project_id UUID,
  p_purpose TEXT DEFAULT NULL,
  p_base_date DATE DEFAULT NULL,
  p_approach TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = 'appraisal', 'public'
AS $$
BEGIN
  UPDATE appraisal.projects 
  SET 
    purpose = COALESCE(p_purpose, purpose),
    base_date = COALESCE(p_base_date, base_date),
    approach = COALESCE(p_approach, approach),
    status = COALESCE(p_status, status),
    updated_at = now()
  WHERE id = project_id AND created_by = auth.uid();
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_project(project_id UUID)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = 'appraisal', 'public'
AS $$
BEGIN
  DELETE FROM appraisal.projects 
  WHERE id = project_id AND created_by = auth.uid();
  RETURN FOUND;
END;
$$;