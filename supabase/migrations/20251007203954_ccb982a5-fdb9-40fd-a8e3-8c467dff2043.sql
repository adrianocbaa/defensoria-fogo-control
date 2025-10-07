-- Create RDO UI preferences table
CREATE TABLE IF NOT EXISTS public.rdo_ui_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  last_section TEXT DEFAULT 'resumo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(obra_id)
);

-- Enable RLS
ALTER TABLE public.rdo_ui_prefs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users with edit permission can view rdo_ui_prefs"
  ON public.rdo_ui_prefs
  FOR SELECT
  USING (can_edit());

CREATE POLICY "Users with edit permission can insert rdo_ui_prefs"
  ON public.rdo_ui_prefs
  FOR INSERT
  WITH CHECK (can_edit());

CREATE POLICY "Users with edit permission can update rdo_ui_prefs"
  ON public.rdo_ui_prefs
  FOR UPDATE
  USING (can_edit());

CREATE POLICY "Users with edit permission can delete rdo_ui_prefs"
  ON public.rdo_ui_prefs
  FOR DELETE
  USING (can_edit());

-- Create trigger for updated_at
CREATE TRIGGER update_rdo_ui_prefs_updated_at
  BEFORE UPDATE ON public.rdo_ui_prefs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();