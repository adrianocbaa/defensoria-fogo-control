-- Create user_obra_access table for granular obra access control
CREATE TABLE IF NOT EXISTS public.user_obra_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, obra_id)
);

-- Enable RLS
ALTER TABLE public.user_obra_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_obra_access
CREATE POLICY "Admins can view all obra access"
  ON public.user_obra_access FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert obra access"
  ON public.user_obra_access FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete obra access"
  ON public.user_obra_access FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Create function to check if user has access to a specific obra
CREATE OR REPLACE FUNCTION public.user_has_obra_access(user_uuid uuid, obra_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Admins, GMs e Editors têm acesso a tudo
  SELECT 
    public.is_admin(user_uuid) 
    OR public.has_role(user_uuid, 'gm'::user_role)
    OR public.has_role(user_uuid, 'editor'::user_role)
    OR EXISTS (
      SELECT 1 FROM public.user_obra_access 
      WHERE user_id = user_uuid AND obra_id = obra_uuid
    );
$$;

-- Update RLS policies for obras to allow contratada users to view assigned obras
CREATE POLICY "Contratada users can view assigned obras"
  ON public.obras FOR SELECT
  USING (
    public.has_role(auth.uid(), 'contratada'::user_role) 
    AND public.user_has_obra_access(auth.uid(), id)
  );

-- Update RLS policies for medicoes to allow contratada users to view assigned obras
CREATE POLICY "Contratada users can view medicoes of assigned obras"
  ON public.medicoes FOR SELECT
  USING (
    public.has_role(auth.uid(), 'contratada'::user_role) 
    AND public.user_has_obra_access(auth.uid(), obra_id)
  );

-- Update RLS policies for medicao_sessions to allow contratada users to view assigned obras
CREATE POLICY "Contratada users can view medicao_sessions of assigned obras"
  ON public.medicao_sessions FOR SELECT
  USING (
    public.has_role(auth.uid(), 'contratada'::user_role) 
    AND public.user_has_obra_access(auth.uid(), obra_id)
  );

-- Update RLS policies for medicao_items
CREATE POLICY "Contratada users can view medicao_items of assigned obras"
  ON public.medicao_items FOR SELECT
  USING (
    public.has_role(auth.uid(), 'contratada'::user_role) 
    AND EXISTS (
      SELECT 1 FROM medicao_sessions ms
      JOIN obras o ON o.id = ms.obra_id
      WHERE ms.id = medicao_items.medicao_id 
      AND public.user_has_obra_access(auth.uid(), o.id)
    )
  );

-- Update RLS policies for orcamento_items to allow contratada users to view assigned obras
CREATE POLICY "Contratada users can view orcamento_items of assigned obras"
  ON public.orcamento_items FOR SELECT
  USING (
    public.has_role(auth.uid(), 'contratada'::user_role) 
    AND public.user_has_obra_access(auth.uid(), obra_id)
  );

-- Update RLS policies for rdo_reports to allow contratada users full access to assigned obras
CREATE POLICY "Contratada users can view rdo_reports of assigned obras"
  ON public.rdo_reports FOR SELECT
  USING (
    public.has_role(auth.uid(), 'contratada'::user_role) 
    AND public.user_has_obra_access(auth.uid(), obra_id)
  );

CREATE POLICY "Contratada users can insert rdo_reports for assigned obras"
  ON public.rdo_reports FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'contratada'::user_role) 
    AND public.user_has_obra_access(auth.uid(), obra_id)
  );

CREATE POLICY "Contratada users can update rdo_reports of assigned obras"
  ON public.rdo_reports FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'contratada'::user_role) 
    AND public.user_has_obra_access(auth.uid(), obra_id)
  );

-- Update RLS policies for rdo_activities
CREATE POLICY "Contratada users can manage rdo_activities of assigned obras"
  ON public.rdo_activities FOR ALL
  USING (
    public.has_role(auth.uid(), 'contratada'::user_role) 
    AND public.user_has_obra_access(auth.uid(), obra_id)
  );

-- Update RLS policies for rdo_equipment
CREATE POLICY "Contratada users can manage rdo_equipment of assigned obras"
  ON public.rdo_equipment FOR ALL
  USING (
    public.has_role(auth.uid(), 'contratada'::user_role) 
    AND public.user_has_obra_access(auth.uid(), obra_id)
  );

-- Update RLS policies for rdo_visits
CREATE POLICY "Contratada users can manage rdo_visits of assigned obras"
  ON public.rdo_visits FOR ALL
  USING (
    public.has_role(auth.uid(), 'contratada'::user_role) 
    AND public.user_has_obra_access(auth.uid(), obra_id)
  );

-- Update RLS policies for rdo_occurrences
CREATE POLICY "Contratada users can manage rdo_occurrences of assigned obras"
  ON public.rdo_occurrences FOR ALL
  USING (
    public.has_role(auth.uid(), 'contratada'::user_role) 
    AND public.user_has_obra_access(auth.uid(), obra_id)
  );

-- Update RLS policies for rdo_comments
CREATE POLICY "Contratada users can manage rdo_comments of assigned obras"
  ON public.rdo_comments FOR ALL
  USING (
    public.has_role(auth.uid(), 'contratada'::user_role) 
    AND public.user_has_obra_access(auth.uid(), obra_id)
  );

-- Update RLS policies for rdo_media
CREATE POLICY "Contratada users can manage rdo_media of assigned obras"
  ON public.rdo_media FOR ALL
  USING (
    public.has_role(auth.uid(), 'contratada'::user_role) 
    AND public.user_has_obra_access(auth.uid(), obra_id)
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_obra_access_user_id ON public.user_obra_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_obra_access_obra_id ON public.user_obra_access(obra_id);