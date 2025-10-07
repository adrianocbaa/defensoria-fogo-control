-- Create enum for RDO status
CREATE TYPE rdo_status AS ENUM ('rascunho', 'preenchendo', 'concluido', 'aprovado', 'reprovado');

-- Create enum for media type
CREATE TYPE rdo_media_type AS ENUM ('foto', 'video');

-- Create rdo_reports table
CREATE TABLE public.rdo_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  numero_seq INTEGER NOT NULL,
  status rdo_status NOT NULL DEFAULT 'rascunho',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(obra_id, data)
);

-- Create index for better query performance
CREATE INDEX idx_rdo_reports_obra_data ON public.rdo_reports(obra_id, data);

-- Enable RLS
ALTER TABLE public.rdo_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rdo_reports
CREATE POLICY "Users with edit permission can view rdo_reports"
  ON public.rdo_reports FOR SELECT
  USING (can_edit());

CREATE POLICY "Users with edit permission can insert rdo_reports"
  ON public.rdo_reports FOR INSERT
  WITH CHECK (can_edit());

CREATE POLICY "Users with edit permission can update rdo_reports"
  ON public.rdo_reports FOR UPDATE
  USING (can_edit());

CREATE POLICY "Users with edit permission can delete rdo_reports"
  ON public.rdo_reports FOR DELETE
  USING (can_edit());

-- Create rdo_activities table
CREATE TABLE public.rdo_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES public.rdo_reports(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  qtd NUMERIC,
  unidade TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rdo_activities_report ON public.rdo_activities(report_id);
CREATE INDEX idx_rdo_activities_obra ON public.rdo_activities(obra_id);

ALTER TABLE public.rdo_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with edit permission can view rdo_activities"
  ON public.rdo_activities FOR SELECT
  USING (can_edit());

CREATE POLICY "Users with edit permission can insert rdo_activities"
  ON public.rdo_activities FOR INSERT
  WITH CHECK (can_edit());

CREATE POLICY "Users with edit permission can update rdo_activities"
  ON public.rdo_activities FOR UPDATE
  USING (can_edit());

CREATE POLICY "Users with edit permission can delete rdo_activities"
  ON public.rdo_activities FOR DELETE
  USING (can_edit());

-- Create rdo_occurrences table
CREATE TABLE public.rdo_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES public.rdo_reports(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  gravidade INTEGER CHECK (gravidade >= 1 AND gravidade <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rdo_occurrences_report ON public.rdo_occurrences(report_id);
CREATE INDEX idx_rdo_occurrences_obra ON public.rdo_occurrences(obra_id);

ALTER TABLE public.rdo_occurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with edit permission can view rdo_occurrences"
  ON public.rdo_occurrences FOR SELECT
  USING (can_edit());

CREATE POLICY "Users with edit permission can insert rdo_occurrences"
  ON public.rdo_occurrences FOR INSERT
  WITH CHECK (can_edit());

CREATE POLICY "Users with edit permission can update rdo_occurrences"
  ON public.rdo_occurrences FOR UPDATE
  USING (can_edit());

CREATE POLICY "Users with edit permission can delete rdo_occurrences"
  ON public.rdo_occurrences FOR DELETE
  USING (can_edit());

-- Create rdo_comments table
CREATE TABLE public.rdo_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES public.rdo_reports(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rdo_comments_report ON public.rdo_comments(report_id);
CREATE INDEX idx_rdo_comments_obra ON public.rdo_comments(obra_id);

ALTER TABLE public.rdo_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with edit permission can view rdo_comments"
  ON public.rdo_comments FOR SELECT
  USING (can_edit());

CREATE POLICY "Users with edit permission can insert rdo_comments"
  ON public.rdo_comments FOR INSERT
  WITH CHECK (can_edit());

CREATE POLICY "Users with edit permission can update rdo_comments"
  ON public.rdo_comments FOR UPDATE
  USING (can_edit());

CREATE POLICY "Users with edit permission can delete rdo_comments"
  ON public.rdo_comments FOR DELETE
  USING (can_edit());

-- Create rdo_media table
CREATE TABLE public.rdo_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES public.rdo_reports(id) ON DELETE CASCADE,
  tipo rdo_media_type NOT NULL,
  file_url TEXT NOT NULL,
  thumb_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rdo_media_obra_created ON public.rdo_media(obra_id, created_at DESC);
CREATE INDEX idx_rdo_media_report ON public.rdo_media(report_id);

ALTER TABLE public.rdo_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with edit permission can view rdo_media"
  ON public.rdo_media FOR SELECT
  USING (can_edit());

CREATE POLICY "Users with edit permission can insert rdo_media"
  ON public.rdo_media FOR INSERT
  WITH CHECK (can_edit());

CREATE POLICY "Users with edit permission can update rdo_media"
  ON public.rdo_media FOR UPDATE
  USING (can_edit());

CREATE POLICY "Users with edit permission can delete rdo_media"
  ON public.rdo_media FOR DELETE
  USING (can_edit());

-- Add triggers for updated_at
CREATE TRIGGER update_rdo_reports_updated_at
  BEFORE UPDATE ON public.rdo_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();