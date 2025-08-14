-- Fix the update_property function with proper search path
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
RETURNS properties
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_property properties;
BEGIN
  -- Update the property with provided values, keeping existing values if NULL
  UPDATE properties 
  SET 
    kind = COALESCE(p_kind, kind),
    address = COALESCE(p_address, address),
    lat = COALESCE(p_lat, lat),
    lon = COALESCE(p_lon, lon),
    land_area = COALESCE(p_land_area, land_area),
    built_area = COALESCE(p_built_area, built_area),
    quality = COALESCE(p_quality, quality),
    age = COALESCE(p_age, age),
    condition = COALESCE(p_condition, condition),
    zoning = COALESCE(p_zoning, zoning),
    constraints = COALESCE(p_constraints, constraints),
    updated_at = NOW()
  WHERE id = property_id
  RETURNING * INTO updated_property;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property with id % not found', property_id;
  END IF;
  
  RETURN updated_property;
END;
$$;