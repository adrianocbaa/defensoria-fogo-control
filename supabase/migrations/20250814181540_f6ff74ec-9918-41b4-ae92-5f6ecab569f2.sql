-- Create model_runs table for storing statistical model execution results
CREATE TABLE appraisal.model_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  method TEXT NOT NULL DEFAULT 'OLS-client',
  features_json JSONB NOT NULL,
  target_column TEXT NOT NULL,
  transform_config JSONB DEFAULT '{}',
  metrics_json JSONB NOT NULL, -- R2, R2_adj, RMSE, MAE
  diagnostics_json JSONB NOT NULL, -- VIF, normality tests
  artifacts JSONB DEFAULT '[]'::jsonb, -- URLs of generated charts
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create results table for storing final appraisal values
CREATE TABLE appraisal.results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  model_run_id UUID REFERENCES appraisal.model_runs(id) ON DELETE CASCADE,
  estimated_value NUMERIC NOT NULL,
  confidence_interval_lower NUMERIC NOT NULL,
  confidence_interval_upper NUMERIC NOT NULL,
  elasticities_json JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE appraisal.model_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE appraisal.results ENABLE ROW LEVEL SECURITY;

-- RLS policies for model_runs
CREATE POLICY "Users can view their own model runs" ON appraisal.model_runs 
FOR SELECT USING (true);

CREATE POLICY "Users can create model runs" ON appraisal.model_runs 
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update model runs" ON appraisal.model_runs 
FOR UPDATE USING (true);

CREATE POLICY "Users can delete model runs" ON appraisal.model_runs 
FOR DELETE USING (true);

-- RLS policies for results
CREATE POLICY "Users can view results" ON appraisal.results 
FOR SELECT USING (true);

CREATE POLICY "Users can create results" ON appraisal.results 
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update results" ON appraisal.results 
FOR UPDATE USING (true);

CREATE POLICY "Users can delete results" ON appraisal.results 
FOR DELETE USING (true);

-- Add update trigger
CREATE TRIGGER update_model_runs_updated_at
BEFORE UPDATE ON appraisal.model_runs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Functions for model runs
CREATE OR REPLACE FUNCTION public.get_model_runs(p_project_id UUID)
RETURNS TABLE(
  id UUID, project_id UUID, method TEXT, features_json JSONB,
  target_column TEXT, transform_config JSONB, metrics_json JSONB,
  diagnostics_json JSONB, artifacts JSONB, created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = appraisal, public
AS $function$
  SELECT 
    mr.id, mr.project_id, mr.method, mr.features_json,
    mr.target_column, mr.transform_config, mr.metrics_json,
    mr.diagnostics_json, mr.artifacts, mr.created_at
  FROM appraisal.model_runs mr
  WHERE mr.project_id = p_project_id
  ORDER BY mr.created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.create_model_run(
  p_project_id UUID,
  p_method TEXT,
  p_features_json JSONB,
  p_target_column TEXT,
  p_transform_config JSONB,
  p_metrics_json JSONB,
  p_diagnostics_json JSONB,
  p_artifacts JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = appraisal, public
AS $function$
  INSERT INTO appraisal.model_runs (
    project_id, method, features_json, target_column,
    transform_config, metrics_json, diagnostics_json, artifacts
  )
  VALUES (
    p_project_id, p_method, p_features_json, p_target_column,
    p_transform_config, p_metrics_json, p_diagnostics_json, p_artifacts
  )
  RETURNING id;
$function$;

CREATE OR REPLACE FUNCTION public.create_result(
  p_project_id UUID,
  p_model_run_id UUID,
  p_estimated_value NUMERIC,
  p_confidence_interval_lower NUMERIC,
  p_confidence_interval_upper NUMERIC,
  p_elasticities_json JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = appraisal, public
AS $function$
  INSERT INTO appraisal.results (
    project_id, model_run_id, estimated_value,
    confidence_interval_lower, confidence_interval_upper, elasticities_json
  )
  VALUES (
    p_project_id, p_model_run_id, p_estimated_value,
    p_confidence_interval_lower, p_confidence_interval_upper, p_elasticities_json
  )
  RETURNING id;
$function$;