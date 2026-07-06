
CREATE TABLE public.maintenance_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_managers TO authenticated;
GRANT ALL ON public.maintenance_managers TO service_role;

ALTER TABLE public.maintenance_managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view maintenance managers"
  ON public.maintenance_managers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert maintenance managers"
  ON public.maintenance_managers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update maintenance managers"
  ON public.maintenance_managers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete maintenance managers"
  ON public.maintenance_managers FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_maintenance_managers_updated_at
  BEFORE UPDATE ON public.maintenance_managers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.maintenance_tickets
  ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES public.maintenance_managers(id) ON DELETE SET NULL;
