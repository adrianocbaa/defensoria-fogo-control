-- Schema for property appraisal system
CREATE SCHEMA IF NOT EXISTS appraisal;

-- PROPERTIES (imóveis)
CREATE TABLE IF NOT EXISTS appraisal.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  kind TEXT CHECK (kind IN ('urban','rural')) NOT NULL,
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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- IMPROVEMENTS (benfeitorias)
CREATE TABLE IF NOT EXISTS appraisal.improvements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES appraisal.properties(id) ON DELETE CASCADE,
  type TEXT,
  area NUMERIC,
  quality TEXT,
  year INTEGER,
  condition TEXT
);

-- COMPARABLES (amostras de mercado)
CREATE TABLE IF NOT EXISTS appraisal.comparables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  kind TEXT CHECK (kind IN ('urban','rural')) NOT NULL,
  source TEXT,
  date DATE,
  deal_type TEXT CHECK (deal_type IN ('sale','rent','offer')),
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
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- PROJECTS
CREATE TABLE IF NOT EXISTS appraisal.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  property_id UUID REFERENCES appraisal.properties(id) ON DELETE SET NULL,
  purpose TEXT,
  base_date DATE,
  approach TEXT,
  status TEXT DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- SAMPLES (vincula comparáveis ao projeto)
CREATE TABLE IF NOT EXISTS appraisal.samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES appraisal.projects(id) ON DELETE CASCADE,
  criteria_json JSONB,
  comparable_ids UUID[]
);

-- MODEL_RUNS (resultados da regressão)
CREATE TABLE IF NOT EXISTS appraisal.model_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES appraisal.projects(id) ON DELETE CASCADE,
  features_json JSONB,
  method TEXT,
  metrics_json JSONB,
  diagnostics_json JSONB,
  artifacts JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RESULTS (valor estimado)
CREATE TABLE IF NOT EXISTS appraisal.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES appraisal.projects(id) ON DELETE CASCADE,
  value_unit NUMERIC,
  ci_lower NUMERIC,
  ci_upper NUMERIC,
  value_total NUMERIC,
  method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- REPORTS
CREATE TABLE IF NOT EXISTS appraisal.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES appraisal.projects(id) ON DELETE CASCADE,
  version INTEGER DEFAULT 1,
  docx_url TEXT,
  pdf_url TEXT,
  signature_hash TEXT,
  published_at TIMESTAMPTZ
);

-- RURAL SPECS
CREATE TABLE IF NOT EXISTS appraisal.rural_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES appraisal.properties(id) ON DELETE CASCADE,
  soil_class TEXT,
  aptitude TEXT,
  productivity NUMERIC,
  water_availability TEXT,
  slope NUMERIC,
  access TEXT,
  geom_polygon JSONB,
  usable_area NUMERIC
);

-- ATTACHMENTS
CREATE TABLE IF NOT EXISTS appraisal.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type TEXT,
  owner_id UUID,
  url TEXT,
  kind TEXT,
  meta_json JSONB
);

-- Enable RLS
ALTER TABLE appraisal.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE appraisal.improvements ENABLE ROW LEVEL SECURITY;
ALTER TABLE appraisal.comparables ENABLE ROW LEVEL SECURITY;
ALTER TABLE appraisal.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE appraisal.samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE appraisal.model_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE appraisal.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE appraisal.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE appraisal.rural_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE appraisal.attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "projects_by_owner" ON appraisal.projects 
FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "projects_insert_owner" ON appraisal.projects 
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "projects_update_owner" ON appraisal.projects 
FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "properties_viewable" ON appraisal.properties 
FOR SELECT USING (true);

CREATE POLICY "properties_manageable" ON appraisal.properties 
FOR ALL USING (can_edit());

CREATE POLICY "comparables_viewable" ON appraisal.comparables 
FOR SELECT USING (true);

CREATE POLICY "comparables_manageable" ON appraisal.comparables 
FOR ALL USING (can_edit());

-- Allow all operations for authenticated users on other tables
CREATE POLICY "improvements_all" ON appraisal.improvements FOR ALL USING (true);
CREATE POLICY "samples_all" ON appraisal.samples FOR ALL USING (true);
CREATE POLICY "model_runs_all" ON appraisal.model_runs FOR ALL USING (true);
CREATE POLICY "results_all" ON appraisal.results FOR ALL USING (true);
CREATE POLICY "reports_all" ON appraisal.reports FOR ALL USING (true);
CREATE POLICY "rural_specs_all" ON appraisal.rural_specs FOR ALL USING (true);
CREATE POLICY "attachments_all" ON appraisal.attachments FOR ALL USING (true);

-- Storage buckets for reports and artifacts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reports', 'reports', false), ('artifacts', 'artifacts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "reports_authenticated" ON storage.objects 
FOR ALL USING (bucket_id = 'reports' AND auth.role() = 'authenticated');

CREATE POLICY "artifacts_authenticated" ON storage.objects 
FOR ALL USING (bucket_id = 'artifacts' AND auth.role() = 'authenticated');

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_comparables_date ON appraisal.comparables(date);
CREATE INDEX IF NOT EXISTS idx_comparables_kind ON appraisal.comparables(kind);
CREATE INDEX IF NOT EXISTS idx_properties_kind ON appraisal.properties(kind);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON appraisal.projects(created_by);

-- Update triggers
CREATE TRIGGER update_properties_updated_at 
BEFORE UPDATE ON appraisal.properties 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at 
BEFORE UPDATE ON appraisal.projects 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();