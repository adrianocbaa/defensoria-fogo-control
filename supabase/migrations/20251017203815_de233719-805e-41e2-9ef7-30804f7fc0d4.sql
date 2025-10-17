-- Create rdo_config table to store obra-level RDO configuration
CREATE TABLE IF NOT EXISTS public.rdo_config (
  obra_id uuid PRIMARY KEY REFERENCES public.obras(id) ON DELETE CASCADE,
  modo_atividades text NOT NULL CHECK (modo_atividades IN ('manual', 'planilha', 'template')),
  locked_at timestamp with time zone NOT NULL DEFAULT now(),
  chosen_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rdo_config ENABLE ROW LEVEL SECURITY;

-- RLS policies: same as obras (edit permission required)
CREATE POLICY "Users with edit permission can select rdo_config"
  ON public.rdo_config FOR SELECT
  USING (can_edit());

CREATE POLICY "Users with edit permission can insert rdo_config"
  ON public.rdo_config FOR INSERT
  WITH CHECK (can_edit());

CREATE POLICY "Users with edit permission can update rdo_config"
  ON public.rdo_config FOR UPDATE
  USING (can_edit());

CREATE POLICY "Users with edit permission can delete rdo_config"
  ON public.rdo_config FOR DELETE
  USING (can_edit());

-- Public can view rdo_config of public obras
CREATE POLICY "Public can view rdo_config of public obras"
  ON public.rdo_config FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.obras
    WHERE obras.id = rdo_config.obra_id
      AND obras.is_public = true
  ));

-- Trigger to update updated_at
CREATE TRIGGER update_rdo_config_updated_at
  BEFORE UPDATE ON public.rdo_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_rdo_config_obra_id ON public.rdo_config(obra_id);