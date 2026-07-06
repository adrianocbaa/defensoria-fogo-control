
-- Nova tabela: serviços de uma tarefa (procedimento) de manutenção.
CREATE TABLE public.maintenance_ticket_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.maintenance_tickets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'Em Análise',
  -- Overrides opcionais (herdam do ticket quando NULL)
  custom_assignment BOOLEAN NOT NULL DEFAULT false,
  nucleo_id UUID REFERENCES public.nuclei(id) ON DELETE SET NULL,
  location TEXT,
  manager_id UUID REFERENCES public.maintenance_managers(id) ON DELETE SET NULL,
  scheduled_date DATE,
  materials JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mts_ticket_id ON public.maintenance_ticket_services(ticket_id);
CREATE INDEX idx_mts_manager_id ON public.maintenance_ticket_services(manager_id);
CREATE INDEX idx_mts_nucleo_id ON public.maintenance_ticket_services(nucleo_id);
CREATE INDEX idx_mts_scheduled_date ON public.maintenance_ticket_services(scheduled_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_ticket_services TO authenticated;
GRANT ALL ON public.maintenance_ticket_services TO service_role;

ALTER TABLE public.maintenance_ticket_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view ticket services"
  ON public.maintenance_ticket_services FOR SELECT
  USING (public.can_edit());

CREATE POLICY "Users with edit permission can insert ticket services"
  ON public.maintenance_ticket_services FOR INSERT
  WITH CHECK (public.can_edit());

CREATE POLICY "Users with edit permission can update ticket services"
  ON public.maintenance_ticket_services FOR UPDATE
  USING (public.can_edit());

CREATE POLICY "Users with edit permission can delete ticket services"
  ON public.maintenance_ticket_services FOR DELETE
  USING (public.can_edit());

CREATE TRIGGER update_maintenance_ticket_services_updated_at
  BEFORE UPDATE ON public.maintenance_ticket_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
