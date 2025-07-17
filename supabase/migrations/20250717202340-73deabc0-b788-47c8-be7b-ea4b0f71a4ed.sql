-- Remove RLS restrictions to allow shared access
DROP POLICY IF EXISTS "Users can view their own nuclei" ON nuclei;
DROP POLICY IF EXISTS "Users can insert their own nuclei" ON nuclei;
DROP POLICY IF EXISTS "Users can update their own nuclei" ON nuclei;
DROP POLICY IF EXISTS "Users can delete their own nuclei" ON nuclei;

DROP POLICY IF EXISTS "Users can view fire extinguishers of their nuclei" ON fire_extinguishers;
DROP POLICY IF EXISTS "Users can insert fire extinguishers to their nuclei" ON fire_extinguishers;
DROP POLICY IF EXISTS "Users can update fire extinguishers of their nuclei" ON fire_extinguishers;
DROP POLICY IF EXISTS "Users can delete fire extinguishers of their nuclei" ON fire_extinguishers;

DROP POLICY IF EXISTS "Users can view hydrants of their nuclei" ON hydrants;
DROP POLICY IF EXISTS "Users can insert hydrants to their nuclei" ON hydrants;
DROP POLICY IF EXISTS "Users can update hydrants of their nuclei" ON hydrants;
DROP POLICY IF EXISTS "Users can delete hydrants of their nuclei" ON hydrants;

DROP POLICY IF EXISTS "Users can view documents of their nuclei" ON documents;
DROP POLICY IF EXISTS "Users can insert documents to their nuclei" ON documents;
DROP POLICY IF EXISTS "Users can update documents of their nuclei" ON documents;
DROP POLICY IF EXISTS "Users can delete documents of their nuclei" ON documents;

-- Create new shared access policies
CREATE POLICY "All authenticated users can view nuclei" 
ON nuclei FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "All authenticated users can insert nuclei" 
ON nuclei FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "All authenticated users can update nuclei" 
ON nuclei FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "All authenticated users can delete nuclei" 
ON nuclei FOR DELETE 
TO authenticated 
USING (true);

CREATE POLICY "All authenticated users can view fire extinguishers" 
ON fire_extinguishers FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "All authenticated users can insert fire extinguishers" 
ON fire_extinguishers FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "All authenticated users can update fire extinguishers" 
ON fire_extinguishers FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "All authenticated users can delete fire extinguishers" 
ON fire_extinguishers FOR DELETE 
TO authenticated 
USING (true);

CREATE POLICY "All authenticated users can view hydrants" 
ON hydrants FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "All authenticated users can insert hydrants" 
ON hydrants FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "All authenticated users can update hydrants" 
ON hydrants FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "All authenticated users can delete hydrants" 
ON hydrants FOR DELETE 
TO authenticated 
USING (true);

CREATE POLICY "All authenticated users can view documents" 
ON documents FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "All authenticated users can insert documents" 
ON documents FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "All authenticated users can update documents" 
ON documents FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "All authenticated users can delete documents" 
ON documents FOR DELETE 
TO authenticated 
USING (true);

-- Create audit log table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  user_id UUID NOT NULL,
  user_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view audit logs
CREATE POLICY "All authenticated users can view audit logs" 
ON audit_logs FOR SELECT 
TO authenticated 
USING (true);

-- Allow all authenticated users to insert audit logs
CREATE POLICY "All authenticated users can insert audit logs" 
ON audit_logs FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Create function to log changes
CREATE OR REPLACE FUNCTION public.log_changes()
RETURNS TRIGGER AS $$
DECLARE
  old_row JSONB;
  new_row JSONB;
  changed_fields TEXT[] := '{}';
  field_name TEXT;
  user_email TEXT;
BEGIN
  -- Get user email from profiles
  SELECT display_name INTO user_email 
  FROM profiles 
  WHERE user_id = auth.uid();

  IF TG_OP = 'DELETE' THEN
    old_row := to_jsonb(OLD);
    INSERT INTO audit_logs (table_name, record_id, operation, old_values, user_id, user_email)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', old_row, auth.uid(), user_email);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    old_row := to_jsonb(OLD);
    new_row := to_jsonb(NEW);
    
    -- Find changed fields
    FOR field_name IN SELECT * FROM jsonb_object_keys(new_row) LOOP
      IF old_row->field_name IS DISTINCT FROM new_row->field_name THEN
        changed_fields := array_append(changed_fields, field_name);
      END IF;
    END LOOP;
    
    IF array_length(changed_fields, 1) > 0 THEN
      INSERT INTO audit_logs (table_name, record_id, operation, old_values, new_values, changed_fields, user_id, user_email)
      VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', old_row, new_row, changed_fields, auth.uid(), user_email);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    new_row := to_jsonb(NEW);
    INSERT INTO audit_logs (table_name, record_id, operation, new_values, user_id, user_email)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', new_row, auth.uid(), user_email);
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for audit logging
CREATE TRIGGER nuclei_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON nuclei
  FOR EACH ROW EXECUTE FUNCTION log_changes();

CREATE TRIGGER fire_extinguishers_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON fire_extinguishers
  FOR EACH ROW EXECUTE FUNCTION log_changes();

CREATE TRIGGER hydrants_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON hydrants
  FOR EACH ROW EXECUTE FUNCTION log_changes();

CREATE TRIGGER documents_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION log_changes();