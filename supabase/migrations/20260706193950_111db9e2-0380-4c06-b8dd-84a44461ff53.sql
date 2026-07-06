
CREATE TABLE public.maintenance_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  icone TEXT NOT NULL DEFAULT 'Wrench',
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_types TO authenticated;
GRANT ALL ON public.maintenance_types TO service_role;

ALTER TABLE public.maintenance_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view maintenance types"
  ON public.maintenance_types FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert maintenance types"
  ON public.maintenance_types FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update maintenance types"
  ON public.maintenance_types FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete maintenance types"
  ON public.maintenance_types FOR DELETE
  TO authenticated USING (true);

CREATE TRIGGER trg_maintenance_types_updated_at
  BEFORE UPDATE ON public.maintenance_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.maintenance_types (nome, icone, ordem) VALUES
  ('Hidráulica', 'Droplets', 1),
  ('Elétrica', 'Zap', 2),
  ('Climatização', 'Wind', 3),
  ('Segurança', 'Shield', 4),
  ('Pintura', 'PaintRoller', 5),
  ('Geral', 'Wrench', 6);
