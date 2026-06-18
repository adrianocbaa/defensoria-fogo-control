
CREATE TABLE public.dimensionamento_calhas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  observacoes TEXT,
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  resultados JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dimensionamento_calhas TO authenticated;
GRANT ALL ON public.dimensionamento_calhas TO service_role;

ALTER TABLE public.dimensionamento_calhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own calhas"
  ON public.dimensionamento_calhas FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users insert own calhas"
  ON public.dimensionamento_calhas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own calhas"
  ON public.dimensionamento_calhas FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users delete own calhas"
  ON public.dimensionamento_calhas FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE TRIGGER update_dimensionamento_calhas_updated_at
  BEFORE UPDATE ON public.dimensionamento_calhas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

UPDATE public.profiles
SET sectors = array_append(sectors, 'dimensionamento'::sector_type)
WHERE role = 'admin'
  AND NOT ('dimensionamento'::sector_type = ANY(sectors));
