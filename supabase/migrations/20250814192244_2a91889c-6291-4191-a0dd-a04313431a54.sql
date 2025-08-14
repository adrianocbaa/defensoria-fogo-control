-- Fix the reports table schema to ensure published_at has a default value
ALTER TABLE appraisal.reports 
ALTER COLUMN published_at SET DEFAULT now();

-- Update existing records with null published_at
UPDATE appraisal.reports 
SET published_at = now()
WHERE published_at IS NULL;

-- Update the create_report function to explicitly set published_at
CREATE OR REPLACE FUNCTION public.create_report(p_project_id uuid, p_pdf_url text, p_signature_hash text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'appraisal', 'public'
AS $function$
DECLARE
  next_version integer;
  report_id uuid;
BEGIN
  -- Verify user owns the project
  IF NOT EXISTS (
    SELECT 1 FROM appraisal.projects 
    WHERE id = p_project_id AND created_by = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Project not found or access denied';
  END IF;
  
  -- Get next version number
  SELECT COALESCE(MAX(version), 0) + 1 
  INTO next_version
  FROM appraisal.reports 
  WHERE project_id = p_project_id;
  
  -- Insert report with explicit published_at
  INSERT INTO appraisal.reports (project_id, version, pdf_url, signature_hash, published_at)
  VALUES (p_project_id, next_version, p_pdf_url, p_signature_hash, now())
  RETURNING id INTO report_id;
  
  RETURN report_id;
END;
$function$;