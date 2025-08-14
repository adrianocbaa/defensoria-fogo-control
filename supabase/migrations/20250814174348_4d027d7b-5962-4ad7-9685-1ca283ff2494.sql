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
LANGUAGE SQL
SECURITY DEFINER
SET search_path = 'appraisal', 'public'
AS $$
  DELETE FROM appraisal.projects 
  WHERE id = project_id AND created_by = auth.uid();
  SELECT FOUND;
$$;

-- Properties functions
CREATE OR REPLACE FUNCTION public.get_properties()
RETURNS TABLE (
  id UUID,
  org_id UUID,
  kind TEXT,
  address TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  land_area NUMERIC,
  built_area NUMERIC,
  quality TEXT,
  age NUMERIC,
  condition TEXT,
  zoning TEXT,
  constraints TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = 'appraisal', 'public'
AS $$
  SELECT 
    p.id, p.org_id, p.kind, p.address, p.lat, p.lon,
    p.land_area, p.built_area, p.quality, p.age, p.condition,
    p.zoning, p.constraints, p.created_at, p.updated_at
  FROM appraisal.properties p
  ORDER BY p.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.create_property(
  p_kind TEXT,
  p_address TEXT,
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lon DOUBLE PRECISION DEFAULT NULL,
  p_land_area NUMERIC DEFAULT NULL,
  p_built_area NUMERIC DEFAULT NULL,
  p_quality TEXT DEFAULT NULL,
  p_age NUMERIC DEFAULT NULL,
  p_condition TEXT DEFAULT NULL,
  p_zoning TEXT DEFAULT NULL,
  p_constraints TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = 'appraisal', 'public'
AS $$
  INSERT INTO appraisal.properties (
    kind, address, lat, lon, land_area, built_area, 
    quality, age, condition, zoning, constraints
  )
  VALUES (
    p_kind, p_address, p_lat, p_lon, p_land_area, p_built_area,
    p_quality, p_age, p_condition, p_zoning, p_constraints
  )
  RETURNING id;
$$;

-- Comparables functions
CREATE OR REPLACE FUNCTION public.get_comparables()
RETURNS TABLE (
  id UUID,
  org_id UUID,
  kind TEXT,
  source TEXT,
  date DATE,
  deal_type TEXT,
  price_total NUMERIC,
  price_unit NUMERIC,
  land_area NUMERIC,
  built_area NUMERIC,
  quality TEXT,
  age NUMERIC,
  condition TEXT,
  payment_terms TEXT,
  exposure_time INTEGER,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  notes TEXT,
  attachments JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = 'appraisal', 'public'
AS $$
  SELECT 
    c.id, c.org_id, c.kind, c.source, c.date, c.deal_type,
    c.price_total, c.price_unit, c.land_area, c.built_area,
    c.quality, c.age, c.condition, c.payment_terms, c.exposure_time,
    c.lat, c.lon, c.notes, c.attachments, c.created_at
  FROM appraisal.comparables c
  ORDER BY c.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.create_comparable(
  p_kind TEXT,
  p_source TEXT,
  p_date DATE,
  p_deal_type TEXT,
  p_price_total NUMERIC,
  p_price_unit NUMERIC DEFAULT NULL,
  p_land_area NUMERIC DEFAULT NULL,
  p_built_area NUMERIC DEFAULT NULL,
  p_quality TEXT DEFAULT NULL,
  p_age NUMERIC DEFAULT NULL,
  p_condition TEXT DEFAULT NULL,
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lon DOUBLE PRECISION DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = 'appraisal', 'public'
AS $$
  INSERT INTO appraisal.comparables (
    kind, source, date, deal_type, price_total, price_unit,
    land_area, built_area, quality, age, condition, lat, lon, notes
  )
  VALUES (
    p_kind, p_source, p_date, p_deal_type, p_price_total, p_price_unit,
    p_land_area, p_built_area, p_quality, p_age, p_condition, p_lat, p_lon, p_notes
  )
  RETURNING id;
$$;

CREATE OR REPLACE FUNCTION public.create_attachment(
  p_owner_type TEXT,
  p_owner_id UUID,
  p_url TEXT,
  p_kind TEXT,
  p_meta_json JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = 'appraisal', 'public'
AS $$
  INSERT INTO appraisal.attachments (owner_type, owner_id, url, kind, meta_json)
  VALUES (p_owner_type, p_owner_id, p_url, p_kind, p_meta_json)
  RETURNING id;
$$;