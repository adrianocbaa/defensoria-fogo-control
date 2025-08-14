-- Update the function to work with the correct table
CREATE OR REPLACE FUNCTION update_property(
  property_id UUID,
  p_kind TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_lat DECIMAL DEFAULT NULL,
  p_lon DECIMAL DEFAULT NULL,
  p_land_area DECIMAL DEFAULT NULL,
  p_built_area DECIMAL DEFAULT NULL,
  p_quality TEXT DEFAULT NULL,
  p_age INTEGER DEFAULT NULL,
  p_condition TEXT DEFAULT NULL,
  p_zoning TEXT DEFAULT NULL,
  p_constraints TEXT DEFAULT NULL
)
RETURNS TABLE(
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
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'appraisal', 'public'
AS $$
BEGIN
  -- Update the property with provided values, keeping existing values if NULL
  UPDATE appraisal.properties 
  SET 
    kind = COALESCE(p_kind, appraisal.properties.kind),
    address = COALESCE(p_address, appraisal.properties.address),
    lat = COALESCE(p_lat, appraisal.properties.lat),
    lon = COALESCE(p_lon, appraisal.properties.lon),
    land_area = COALESCE(p_land_area, appraisal.properties.land_area),
    built_area = COALESCE(p_built_area, appraisal.properties.built_area),
    quality = COALESCE(p_quality, appraisal.properties.quality),
    age = COALESCE(p_age, appraisal.properties.age),
    condition = COALESCE(p_condition, appraisal.properties.condition),
    zoning = COALESCE(p_zoning, appraisal.properties.zoning),
    constraints = COALESCE(p_constraints, appraisal.properties.constraints),
    updated_at = NOW()
  WHERE appraisal.properties.id = property_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property with id % not found', property_id;
  END IF;
  
  -- Return the updated property
  RETURN QUERY 
  SELECT 
    p.id, p.org_id, p.kind, p.address, p.lat, p.lon,
    p.land_area, p.built_area, p.quality, p.age, p.condition,
    p.zoning, p.constraints, p.created_at, p.updated_at
  FROM appraisal.properties p
  WHERE p.id = property_id;
END;
$$;