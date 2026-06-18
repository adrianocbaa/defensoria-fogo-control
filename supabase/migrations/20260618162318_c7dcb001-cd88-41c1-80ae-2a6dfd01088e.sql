
CREATE TABLE public.dimensionamento_intensidades_pluviometricas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cidade TEXT NOT NULL,
  uf TEXT NOT NULL CHECK (length(uf) = 2),
  intensidade_mm_h NUMERIC(10,2) NOT NULL CHECK (intensidade_mm_h > 0),
  tempo_retorno_anos INTEGER NOT NULL CHECK (tempo_retorno_anos > 0),
  duracao_min INTEGER NOT NULL CHECK (duracao_min > 0),
  fonte TEXT NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cidade, uf, tempo_retorno_anos, duracao_min)
);

CREATE INDEX idx_dim_intens_cidade_uf
  ON public.dimensionamento_intensidades_pluviometricas (cidade, uf);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.dimensionamento_intensidades_pluviometricas TO authenticated;
GRANT ALL ON public.dimensionamento_intensidades_pluviometricas TO service_role;

ALTER TABLE public.dimensionamento_intensidades_pluviometricas
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read intensidades"
  ON public.dimensionamento_intensidades_pluviometricas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated insert intensidades"
  ON public.dimensionamento_intensidades_pluviometricas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner or admin update intensidades"
  ON public.dimensionamento_intensidades_pluviometricas FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Owner or admin delete intensidades"
  ON public.dimensionamento_intensidades_pluviometricas FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE TRIGGER update_dim_intens_updated_at
  BEFORE UPDATE ON public.dimensionamento_intensidades_pluviometricas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
