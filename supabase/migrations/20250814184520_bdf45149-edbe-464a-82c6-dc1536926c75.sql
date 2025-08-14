-- Create reports table for PDF storage and versioning
CREATE TABLE IF NOT EXISTS appraisal.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  pdf_url TEXT NOT NULL,
  signature_hash TEXT NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, version)
);

-- Enable RLS
ALTER TABLE appraisal.reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for reports
CREATE POLICY "Users can view their own reports" 
ON appraisal.reports 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM appraisal.projects p 
    WHERE p.id = project_id AND p.created_by = auth.uid()
  )
);

CREATE POLICY "Users can create reports for their projects" 
ON appraisal.reports 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM appraisal.projects p 
    WHERE p.id = project_id AND p.created_by = auth.uid()
  )
);

-- Function to get reports by project
CREATE OR REPLACE FUNCTION public.get_project_reports(project_id uuid)
RETURNS TABLE(
  id uuid, 
  version integer, 
  pdf_url text, 
  signature_hash text, 
  published_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'appraisal', 'public'
AS $$
  SELECT r.id, r.version, r.pdf_url, r.signature_hash, r.published_at
  FROM appraisal.reports r
  JOIN appraisal.projects p ON p.id = r.project_id
  WHERE r.project_id = get_project_reports.project_id 
    AND p.created_by = auth.uid()
  ORDER BY r.version DESC;
$$;

-- Function to create report
CREATE OR REPLACE FUNCTION public.create_report(
  p_project_id uuid,
  p_pdf_url text,
  p_signature_hash text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'appraisal', 'public'
AS $$
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
  
  -- Insert report
  INSERT INTO appraisal.reports (project_id, version, pdf_url, signature_hash)
  VALUES (p_project_id, next_version, p_pdf_url, p_signature_hash)
  RETURNING id INTO report_id;
  
  RETURN report_id;
END;
$$;