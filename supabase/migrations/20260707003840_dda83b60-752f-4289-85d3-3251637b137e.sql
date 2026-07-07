
ALTER TABLE public.maintenance_ticket_services
  ADD COLUMN IF NOT EXISTS envolve_viagem boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS travel_cidade text,
  ADD COLUMN IF NOT EXISTS travel_data_ida date,
  ADD COLUMN IF NOT EXISTS travel_data_volta date,
  ADD COLUMN IF NOT EXISTS travel_sem_previsao boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS travel_id uuid REFERENCES public.travels(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_maintenance_ticket_services_travel_id
  ON public.maintenance_ticket_services(travel_id);
