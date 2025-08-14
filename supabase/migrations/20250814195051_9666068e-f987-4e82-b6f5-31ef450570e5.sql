-- Create properties table
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID DEFAULT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('urban', 'rural')),
    address TEXT NOT NULL,
    lat DECIMAL,
    lon DECIMAL,
    land_area DECIMAL,
    built_area DECIMAL,
    quality TEXT CHECK (quality IN ('Inferior', 'Normal', 'Superior')),
    age INTEGER,
    condition TEXT CHECK (condition IN ('Ruim', 'Regular', 'Bom', 'Ótimo')),
    zoning TEXT,
    constraints TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for properties
CREATE POLICY "Authenticated users can view properties" ON public.properties
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert properties" ON public.properties
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update properties" ON public.properties
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete properties" ON public.properties
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create function to update property
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