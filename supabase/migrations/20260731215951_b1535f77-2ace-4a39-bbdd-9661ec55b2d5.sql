ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS data_inicio_prevista date;

UPDATE public.obras SET data_inicio_prevista = data_inicio WHERE data_inicio_prevista IS NULL;

CREATE TABLE public.obra_inicio_alteracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  data_anterior date,
  data_nova date NOT NULL,
  motivo text NOT NULL,
  documento_url text,
  changed_by uuid,
  changed_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.obra_inicio_alteracoes TO authenticated;
GRANT ALL ON public.obra_inicio_alteracoes TO service_role;

ALTER TABLE public.obra_inicio_alteracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver alteracoes de inicio da obra"
ON public.obra_inicio_alteracoes FOR SELECT TO authenticated
USING (public.user_has_obra_access(auth.uid(), obra_id) OR public.is_admin(auth.uid()));

CREATE POLICY "Registrar alteracoes de inicio da obra"
ON public.obra_inicio_alteracoes FOR INSERT TO authenticated
WITH CHECK (public.can_edit_obra(obra_id, auth.uid()) AND changed_by = auth.uid());

CREATE INDEX idx_obra_inicio_alteracoes_obra ON public.obra_inicio_alteracoes(obra_id, created_at DESC);